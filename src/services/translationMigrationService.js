const Translation = require("../models/Translation");
const languageService = require("./languageService");
const { isBlockedField } = require("../utils/translationPaths");
const { isTranslationRef } = require("../utils/translationRef");

const preview = (value) => String(value).replace(/\s+/g, " ").slice(0, 120);

const collectArabicFields = (value, prefix, found) => {
  if (Array.isArray(value)) {
    value.forEach((item, index) => collectArabicFields(item, prefix ? `${prefix}.${index}` : String(index), found));
    return;
  }

  if (!value || typeof value !== "object" || value instanceof Date || value._bsontype || isTranslationRef(value)) {
    return;
  }

  for (const [key, nested] of Object.entries(value)) {
    if (key === "locales" || key.startsWith("$") || key === "_id") {
      continue;
    }

    if (key.endsWith("_ar") && typeof nested === "string" && nested.trim()) {
      const field = prefix ? `${prefix}.${key.slice(0, -3)}` : key.slice(0, -3);

      if (!isBlockedField(field)) {
        found.push({ field, value: nested.trim() });
      }

      continue;
    }

    if (nested && typeof nested === "object") {
      collectArabicFields(nested, prefix ? `${prefix}.${key}` : key, found);
    }
  }
};

const localizedEntries = (value) => {
  if (!value || typeof value !== "object" || Array.isArray(value) || isTranslationRef(value)) {
    return [];
  }

  return Object.entries(value).filter(([, text]) => typeof text === "string" && text.trim());
};

const migrateLegacyTranslations = async ({ dryRun = true, splitStatic = false } = {}) => {
  const Page = require("../models/Page");
  const Section = require("../models/Section");
  const Blog = require("../models/Blog");
  const BlogCategory = require("../models/BlogCategory");
  const WebsiteSettings = require("../models/WebsiteSettings");
  const defaultLanguage = await languageService.defaultCode();
  const planned = [];
  const skipped = [];
  const groups = {};

  const stage = (entry) => {
    if (!entry.languageCode || entry.languageCode === defaultLanguage || !entry.value || !String(entry.value).trim()) {
      return;
    }

    if (entry.field && isBlockedField(entry.field)) {
      skipped.push({ ...entry, reason: "field is not translatable" });
      return;
    }

    planned.push(entry);
    groups[entry.entityType || entry.type] = (groups[entry.entityType || entry.type] || 0) + 1;
  };

  const [pages, sections, blogs, categories, settings, dictionaries] = await Promise.all([
    Page.find().lean(),
    Section.find().lean(),
    Blog.find().lean(),
    BlogCategory.find().lean(),
    WebsiteSettings.find().lean(),
    Translation.find({ $or: [{ type: "dictionary" }, { type: { $exists: false } }] }).select("key translations").lean(),
  ]);

  const scanArabicFields = (docs, entityType) => {
    for (const doc of docs) {
      const found = [];
      collectArabicFields(doc, "", found);

      for (const item of found) {
        stage({
          type: "dynamic",
          languageCode: "ar",
          entityType,
          entityId: doc._id,
          field: item.field,
          value: item.value,
        });
      }
    }
  };

  scanArabicFields(pages, "Page");
  scanArabicFields(sections, "Section");
  scanArabicFields(settings, "WebsiteSettings");

  for (const blog of blogs) {
    for (const [languageCode, locale] of Object.entries(blog.locales || {})) {
      if (!locale || typeof locale !== "object") {
        continue;
      }

      for (const field of ["title", "excerpt", "content"]) {
        if (typeof locale[field] === "string") {
          stage({ type: "dynamic", languageCode, entityType: "Blog", entityId: blog._id, field, value: locale[field] });
        }
      }
    }
  }

  for (const category of categories) {
    for (const field of ["name", "description"]) {
      for (const [languageCode, value] of localizedEntries(category[field])) {
        stage({ type: "dynamic", languageCode, entityType: "BlogCategory", entityId: category._id, field, value });
      }
    }
  }

  for (const doc of settings) {
    for (const field of ["websiteName", "maintenanceMessage"]) {
      for (const [languageCode, value] of localizedEntries(doc[field])) {
        stage({ type: "dynamic", languageCode, entityType: "WebsiteSettings", entityId: doc._id, field, value });
      }
    }

    for (const [languageCode, value] of localizedEntries(doc.contact?.address)) {
      stage({
        type: "dynamic",
        languageCode,
        entityType: "WebsiteSettings",
        entityId: doc._id,
        field: "contact.address",
        value,
      });
    }
  }

  if (splitStatic) {
    for (const doc of dictionaries) {
      for (const [languageCode, value] of Object.entries(doc.translations || {})) {
        if (typeof value === "string" && value.trim()) {
          stage({ type: "static", languageCode, key: doc.key, value });
        }
      }
    }
  }

  const created = [];

  for (const entry of planned) {
    const filter = entry.type === "static"
      ? { type: "static", languageCode: entry.languageCode, key: entry.key }
      : {
          type: "dynamic",
          languageCode: entry.languageCode,
          entityType: entry.entityType,
          entityId: entry.entityId,
          field: entry.field,
        };
    const existing = await Translation.findOne(filter).select("_id").lean();

    if (existing) {
      skipped.push({ ...entry, value: preview(entry.value), reason: "already migrated" });
      continue;
    }

    if (!dryRun) {
      try {
        await Translation.create({ ...entry, status: "active" });
      } catch (error) {
        if (error.code === 11000 || error.errorResponse?.code === 11000) {
          skipped.push({ ...entry, value: preview(entry.value), reason: "already migrated" });
          continue;
        }

        throw error;
      }
    }

    created.push({
      type: entry.type,
      languageCode: entry.languageCode,
      entityType: entry.entityType || null,
      entityId: entry.entityId || null,
      key: entry.key || null,
      field: entry.field || null,
      value: preview(entry.value),
    });
  }

  return {
    dryRun,
    defaultLanguage,
    created: created.length,
    skipped: skipped.length,
    dictionaryKeys: dictionaries.length,
    groups,
    items: created.slice(0, 200),
    skippedItems: skipped.slice(0, 50).map((item) => ({
      type: item.type,
      languageCode: item.languageCode,
      entityType: item.entityType || null,
      field: item.field || item.key || null,
      reason: item.reason,
    })),
    note: "Source fields were not changed or removed. Review this report before deleting any legacy values.",
  };
};

module.exports = { migrateLegacyTranslations };
