const crypto = require("crypto");
const Translation = require("../models/Translation");
const Section = require("../models/Section");
const Page = require("../models/Page");
const Blog = require("../models/Blog");
const BlogCategory = require("../models/BlogCategory");
const WebsiteSettings = require("../models/WebsiteSettings");
const ApiError = require("../utils/ApiError");
const { paginateQuery } = require("../utils/pagination");
const { containsRegex } = require("../utils/regex");
const { collectTranslationKeys, mapTranslationRefs } = require("../utils/translationRef");
const { describeLanguage } = require("../config/cms");

const CACHE_TTL_MS = 30 * 1000;
let cache = null;
let cachedAt = 0;

const invalidateTranslationCache = () => {
  cache = null;
  cachedAt = 0;
};

const loadActiveTranslations = async () => {
  if (cache && Date.now() - cachedAt < CACHE_TTL_MS) {
    return cache;
  }

  const docs = await Translation.find({ status: "active" }).select("key translations").lean();
  const map = new Map(docs.map((doc) => [doc.key, doc.translations || {}]));
  cache = map;
  cachedAt = Date.now();
  return map;
};

const lookupTranslation = (entry, language) => {
  if (!entry) {
    return "";
  }

  const selected = entry[language];

  if (typeof selected === "string" && selected.trim()) {
    return selected;
  }

  if (language !== "en" && typeof entry.en === "string") {
    return entry.en;
  }

  return typeof selected === "string" ? selected : "";
};

const resolveContent = async (value, language) => {
  const dictionary = await loadActiveTranslations();

  return mapTranslationRefs(value, (ref) => lookupTranslation(dictionary.get(ref.$t), language));
};

const present = (doc) => {
  if (!doc) {
    return doc;
  }

  return {
    _id: doc._id,
    key: doc.key,
    translations: doc.translations || {},
    category: doc.category || "",
    description: doc.description || "",
    status: doc.status,
    createdBy: doc.createdBy || null,
    updatedBy: doc.updatedBy || null,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
};

const assertUniqueKeys = async (keys) => {
  if (keys.length === 0) {
    return;
  }

  const existing = await Translation.find({ key: { $in: keys } }).select("key").lean();

  if (existing.length > 0) {
    throw new ApiError(
      409,
      "Translation key already exists",
      existing.map((item) => ({ field: "key", message: `${item.key} already exists` }))
    );
  }
};

const createTranslation = async (payload, userId) => {
  await assertUniqueKeys([payload.key]);
  const doc = await Translation.create({
    ...payload,
    createdBy: userId || null,
    updatedBy: userId || null,
  });
  invalidateTranslationCache();
  return present(doc.toObject());
};

const bulkCreate = async (items, userId) => {
  const keys = items.map((item) => item.key);
  const unique = new Set(keys);

  if (unique.size !== keys.length) {
    throw new ApiError(400, "Validation failed", [{ field: "items", message: "items contains a duplicate key" }]);
  }

  await assertUniqueKeys(keys);
  const docs = await Translation.insertMany(
    items.map((item) => ({
      ...item,
      createdBy: userId || null,
      updatedBy: userId || null,
    }))
  );
  invalidateTranslationCache();
  return docs.map((doc) => present(doc.toObject()));
};

const updateTranslation = async (id, payload, userId) => {
  const existing = await Translation.findById(id).lean();

  if (!existing) {
    throw new ApiError(404, "Translation not found");
  }

  if (payload.key && payload.key !== existing.key) {
    const clash = await Translation.findOne({ key: payload.key, _id: { $ne: id } }).select("_id").lean();

    if (clash) {
      throw new ApiError(409, "Translation key already exists");
    }
  }

  const update = { ...payload, updatedBy: userId || null };

  if (payload.translations) {
    update.translations = { ...(existing.translations || {}), ...payload.translations };
  }

  const doc = await Translation.findByIdAndUpdate(id, { $set: update }, { new: true, runValidators: true }).lean();
  invalidateTranslationCache();
  return present(doc);
};

const bulkUpdate = async (items, userId) => {
  const keys = items.map((item) => item.key).filter(Boolean);
  const ids = items.map((item) => item.id).filter(Boolean);
  const existing = await Translation.find({
    $or: [...(ids.length ? [{ _id: { $in: ids } }] : []), ...(keys.length ? [{ key: { $in: keys } }] : [])],
  })
    .select("_id key translations category description status")
    .lean();
  const byId = new Map(existing.map((item) => [String(item._id), item]));
  const byKey = new Map(existing.map((item) => [item.key, item]));
  const operations = [];
  const missing = [];
  const now = new Date();

  for (const item of items) {
    const match = (item.id && byId.get(String(item.id))) || (item.key && byKey.get(item.key));

    if (!match) {
      missing.push(item.id || item.key);
      continue;
    }

    const { id, translations, ...changes } = item;
    const next = { ...changes, updatedBy: userId || null, updatedAt: now };

    if (translations) {
      next.translations = { ...(match.translations || {}), ...translations };
    }

    operations.push({
      updateOne: {
        filter: { _id: match._id },
        update: { $set: next },
      },
    });
  }

  if (missing.length > 0) {
    throw new ApiError(404, `Translation not found: ${missing.join(", ")}`);
  }

  if (operations.length > 0) {
    await Translation.bulkWrite(operations);
  }

  invalidateTranslationCache();
  const updated = await Translation.find({ _id: { $in: existing.map((item) => item._id) } }).lean();
  return updated.map(present);
};

const deleteTranslation = async (id) => {
  const doc = await Translation.findByIdAndDelete(id).lean();

  if (!doc) {
    throw new ApiError(404, "Translation not found");
  }

  invalidateTranslationCache();
  return present(doc);
};

const getTranslationById = async (id) => {
  const doc = await Translation.findById(id).lean();

  if (!doc) {
    throw new ApiError(404, "Translation not found");
  }

  return present(doc);
};

const getTranslationByKey = async (key, { activeOnly = false } = {}) => {
  const filter = { key };

  if (activeOnly) {
    filter.status = "active";
  }

  const doc = await Translation.findOne(filter).lean();

  if (!doc) {
    throw new ApiError(404, "Translation not found");
  }

  return present(doc);
};

const listTranslations = async ({ page, limit, search, category, status, lang }) => {
  const filter = {};

  if (category) {
    filter.category = category;
  }

  if (status) {
    filter.status = status;
  }

  if (search) {
    const regex = containsRegex(search);
    const clauses = [
      { key: regex },
      { category: regex },
      { description: regex },
      { "translations.en": regex },
      { "translations.ar": regex },
    ];

    if (lang && lang !== "en" && lang !== "ar") {
      clauses.push({ [`translations.${lang}`]: regex });
    }

    filter.$or = clauses;
  }

  const result = await paginateQuery(Translation.find(filter), {
    page,
    limit,
    sort: { updatedAt: -1, key: 1 },
  });

  return {
    items: result.items.map(present),
    pagination: result.pagination,
  };
};

const dictionaryForLanguage = async (language) => {
  const docs = await Translation.find({ status: "active" }).select("key translations").sort({ key: 1 }).lean();
  const translations = {};

  for (const doc of docs) {
    translations[doc.key] = lookupTranslation(doc.translations || {}, language);
  }

  const described = describeLanguage(language);

  return {
    language,
    direction: described ? described.direction : "ltr",
    fallbackLanguage: language === "en" ? null : "en",
    translations,
  };
};

const missingTranslations = async (language) => {
  const docs = await Translation.find({ status: "active" }).select("key translations category").sort({ key: 1 }).lean();
  const items = docs
    .filter((doc) => {
      const value = doc.translations ? doc.translations[language] : "";
      return typeof value !== "string" || !value.trim();
    })
    .map((doc) => ({
      key: doc.key,
      category: doc.category || "",
      language,
      fallback: language === "en" ? "" : doc.translations?.en || "",
    }));

  return { language, count: items.length, items };
};

const collectUsedKeys = async () => {
  const used = new Set();
  const absorb = (value) => {
    collectTranslationKeys(value, used);
  };
  const [sections, pages, blogs, categories, settings] = await Promise.all([
    Section.find().select("content settings").lean(),
    Page.find().select("title seo publishedSnapshot").lean(),
    Blog.find().select("locales").lean(),
    BlogCategory.find().select("name description").lean(),
    WebsiteSettings.find().select("websiteName contact footer header defaultSeo maintenanceMessage custom").lean(),
  ]);

  sections.forEach((section) => {
    absorb(section.content);
    absorb(section.settings);
  });
  pages.forEach((page) => {
    absorb(page.title);
    absorb(page.seo);
    absorb(page.publishedSnapshot);
  });
  blogs.forEach((blog) => absorb(blog.locales));
  categories.forEach((category) => {
    absorb(category.name);
    absorb(category.description);
  });
  settings.forEach((entry) => absorb(entry));

  return used;
};

const unusedTranslations = async () => {
  const [docs, used] = await Promise.all([
    Translation.find().select("key category status").sort({ key: 1 }).lean(),
    collectUsedKeys(),
  ]);
  const items = docs
    .filter((doc) => !used.has(doc.key))
    .map((doc) => ({ key: doc.key, category: doc.category || "", status: doc.status }));

  return { count: items.length, items };
};

const importTranslations = async (items, mode, userId) => {
  if (mode === "create") {
    const created = await bulkCreate(items, userId);
    return { created: created.length, updated: 0 };
  }

  const keys = items.map((item) => item.key);
  const existing = await Translation.find({ key: { $in: keys } }).select("key translations").lean();
  const existingKeys = new Map(existing.map((item) => [item.key, item]));
  const toCreate = [];
  const toUpdate = [];

  for (const item of items) {
    const current = existingKeys.get(item.key);

    if (!current) {
      toCreate.push(item);
      continue;
    }

    toUpdate.push({
      key: item.key,
      translations: { ...(current.translations || {}), ...(item.translations || {}) },
      category: item.category === undefined ? current.category : item.category,
      description: item.description === undefined ? current.description : item.description,
      status: item.status || current.status,
    });
  }

  const created = toCreate.length ? await bulkCreate(toCreate, userId) : [];
  const updated = toUpdate.length ? await bulkUpdate(toUpdate, userId) : [];
  return { created: created.length, updated: updated.length };
};

const exportTranslations = async () => {
  const docs = await Translation.find().sort({ key: 1 }).lean();
  return docs.map((doc) => ({
    key: doc.key,
    translations: doc.translations || {},
    category: doc.category || "",
    description: doc.description || "",
    status: doc.status,
  }));
};

const duplicateTranslationTree = async (value, userId) => {
  const keys = [...collectTranslationKeys(value)];

  if (keys.length === 0) {
    return value;
  }

  const existing = await Translation.find({ key: { $in: keys } }).lean();
  const byKey = new Map(existing.map((item) => [item.key, item]));
  const replacements = new Map();
  const docs = [];

  for (const key of keys) {
    const source = byKey.get(key);

    if (!source) {
      continue;
    }

    const nextKey = `${key.slice(0, 140)}.copy.${crypto.randomBytes(3).toString("hex")}`;
    replacements.set(key, nextKey);
    docs.push({
      key: nextKey,
      translations: source.translations || {},
      category: source.category || "",
      description: `Duplicated from ${key}`,
      status: source.status,
      createdBy: userId || null,
      updatedBy: userId || null,
    });
  }

  if (docs.length > 0) {
    await Translation.insertMany(docs);
    invalidateTranslationCache();
  }

  return mapTranslationRefs(value, (ref) => {
    const nextKey = replacements.get(ref.$t);
    return nextKey ? { $t: nextKey } : ref;
  });
};

module.exports = {
  invalidateTranslationCache,
  resolveContent,
  createTranslation,
  bulkCreate,
  updateTranslation,
  bulkUpdate,
  deleteTranslation,
  getTranslationById,
  getTranslationByKey,
  listTranslations,
  dictionaryForLanguage,
  missingTranslations,
  unusedTranslations,
  importTranslations,
  exportTranslations,
  duplicateTranslationTree,
  present,
};
