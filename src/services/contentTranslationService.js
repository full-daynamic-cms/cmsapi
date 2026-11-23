const mongoose = require("mongoose");
const Translation = require("../models/Translation");
const ApiError = require("../utils/ApiError");
const translationCache = require("../utils/translationCache");
const languageService = require("./languageService");
const { paginateQuery, buildPagination } = require("../utils/pagination");
const { containsRegex } = require("../utils/regex");
const { OBJECT_ID_PATTERN } = require("../config/cms");
const { canonicalEntityType, fieldsFor, knownEntityTypes } = require("../config/translatableFields");
const { isTranslationRef } = require("../utils/translationRef");
const {
  isBlockedField,
  matchesAnyPattern,
  readPath,
  expandPattern,
  detach,
  applyTranslations,
} = require("../utils/translationPaths");

const MAX_SCAN = 1000;

const modelFor = (entityType) => {
  const models = {
    Page: () => require("../models/Page"),
    Section: () => require("../models/Section"),
    Blog: () => require("../models/Blog"),
    BlogCategory: () => require("../models/BlogCategory"),
    LandingPage: () => require("../models/LandingPage"),
    WebsiteSettings: () => require("../models/WebsiteSettings"),
  };

  return models[entityType] ? models[entityType]() : null;
};

const entityLabel = (entityType, doc) => {
  if (!doc) {
    return "";
  }

  if (entityType === "Page") {
    return doc.slug || "";
  }

  if (entityType === "Section") {
    return doc.name || "";
  }

  if (entityType === "Blog") {
    return doc.locales?.en?.title || doc.slug || "";
  }

  if (entityType === "BlogCategory") {
    return (typeof doc.name === "string" ? doc.name : doc.name?.en) || doc.slug || "";
  }

  if (entityType === "LandingPage") {
    return doc.sectionName || doc.sectionKey || "";
  }

  if (entityType === "WebsiteSettings") {
    return "Website settings";
  }

  return "";
};

const projectSource = (entityType, doc, defaultCode) => {
  if (!doc) {
    return {};
  }

  if (entityType === "Blog") {
    const locale = doc.locales?.[defaultCode] || doc.locales?.en || {};
    return {
      _id: doc._id,
      title: typeof locale.title === "string" ? locale.title : "",
      excerpt: typeof locale.excerpt === "string" ? locale.excerpt : "",
      content: typeof locale.content === "string" ? locale.content : "",
    };
  }

  if (entityType === "BlogCategory") {
    const read = (value) => {
      if (typeof value === "string") {
        return value;
      }

      if (value && typeof value === "object") {
        return value[defaultCode] || value.en || "";
      }

      return "";
    };

    return { _id: doc._id, name: read(doc.name), description: read(doc.description) };
  }

  return doc;
};

const describeSource = (doc, field) => {
  const value = readPath(doc, field);

  if (typeof value === "string") {
    return { source: value, sourceKey: null };
  }

  if (isTranslationRef(value)) {
    return { source: "", sourceKey: value.$t };
  }

  return { source: "", sourceKey: null };
};

const presentStatic = (doc) => ({
  _id: doc._id,
  type: "static",
  languageCode: doc.languageCode,
  key: doc.key,
  value: typeof doc.value === "string" ? doc.value : "",
  category: doc.category || "",
  description: doc.description || "",
  status: doc.status,
  createdBy: doc.createdBy || null,
  updatedBy: doc.updatedBy || null,
  createdAt: doc.createdAt,
  updatedAt: doc.updatedAt,
});

const presentDynamic = (doc) => ({
  _id: doc._id,
  type: "dynamic",
  languageCode: doc.languageCode,
  entityType: doc.entityType,
  entityId: doc.entityId,
  field: doc.field,
  value: typeof doc.value === "string" ? doc.value : "",
  status: doc.status,
  createdBy: doc.createdBy || null,
  updatedBy: doc.updatedBy || null,
  createdAt: doc.createdAt,
  updatedAt: doc.updatedAt,
});

const invalidateDictionary = () => translationCache.invalidate("dictionary");
const invalidateDynamic = () => translationCache.invalidate("dynamic:");

const loadDictionary = async () => {
  const cached = translationCache.get("dictionary");

  if (cached) {
    return cached;
  }

  const docs = await Translation.find({
    status: "active",
    $or: [
      { type: "dictionary" },
      { type: "static" },
      { type: { $exists: false }, key: { $type: "string" } },
    ],
  })
    .select("type key translations languageCode value")
    .lean();

  const map = new Map();
  const staticRows = [];

  for (const doc of docs) {
    if (!doc.key) {
      continue;
    }

    if (doc.type === "static") {
      staticRows.push(doc);
      continue;
    }

    const entry = map.get(doc.key) || {};
    Object.assign(entry, doc.translations || {});
    map.set(doc.key, entry);
  }

  for (const doc of staticRows) {
    const entry = map.get(doc.key) || {};
    entry[doc.languageCode] = doc.value;
    map.set(doc.key, entry);
  }

  translationCache.set("dictionary", map);
  return map;
};

const loadDynamic = async (languageCode) => {
  const cacheKey = `dynamic:${languageCode}`;
  const cached = translationCache.get(cacheKey);

  if (cached) {
    return cached;
  }

  const docs = await Translation.find({ type: "dynamic", status: "active", languageCode })
    .select("entityType entityId field value")
    .lean();
  const map = new Map();

  for (const doc of docs) {
    const id = `${doc.entityType}:${String(doc.entityId)}`;

    if (!map.has(id)) {
      map.set(id, new Map());
    }

    if (typeof doc.value === "string") {
      map.get(id).set(doc.field, doc.value);
    }
  }

  translationCache.set(cacheKey, map);
  return map;
};

const resolveMany = async ({ entityType, documents = [], languageCode, translatableFields }) => {
  const canonical = canonicalEntityType(entityType);
  const patterns = translatableFields || fieldsFor(canonical) || [];
  const clones = documents.map((document) => detach(document));

  if (!languageCode || clones.length === 0) {
    return clones;
  }

  const language = await languageService.requireActive(languageCode);

  if (language.isDefault) {
    return clones;
  }

  const grouped = await loadDynamic(language.code);

  return clones.map((document) => {
    const fields = grouped.get(`${canonical}:${String(document._id)}`);

    if (!fields) {
      return document;
    }

    applyTranslations(document, fields, patterns);
    return document;
  });
};

const resolve = async ({ entityType, entityId, document, languageCode, translatableFields }) => {
  const source = detach(document) || {};

  if (entityId) {
    source._id = entityId;
  }

  const [resolved] = await resolveMany({
    entityType,
    documents: [source],
    languageCode,
    translatableFields,
  });

  return resolved;
};

const assertObjectId = (entityId) => {
  if (!OBJECT_ID_PATTERN.test(String(entityId || ""))) {
    throw new ApiError(400, "Validation failed", [{ field: "entityId", message: "entityId must be a valid id" }]);
  }
};

const assertField = (entityType, field) => {
  if (!field || isBlockedField(field)) {
    throw new ApiError(400, "Field is not translatable", [{ field: "field", message: `${field || "field"} cannot be translated` }]);
  }

  const patterns = fieldsFor(entityType);

  if (patterns && !matchesAnyPattern(field, patterns)) {
    throw new ApiError(400, "Field is not translatable", [{ field: "field", message: `${field} cannot be translated` }]);
  }
};

const assertEntityExists = async (entityType, entityId) => {
  const Model = modelFor(entityType);

  if (!Model) {
    return;
  }

  const exists = await Model.exists({ _id: entityId });

  if (!exists) {
    throw new ApiError(404, `${entityType} not found`);
  }
};

const assertTranslatableLanguage = async (languageCode) => {
  const language = await languageService.requireExisting(languageCode);

  if (language.isDefault) {
    throw new ApiError(400, "Default language content is stored on the content record");
  }

  return language;
};

const createStatic = async (payload, userId) => {
  const language = await languageService.requireExisting(payload.languageCode);
  const existing = await Translation.findOne({ type: "static", languageCode: language.code, key: payload.key }).select("_id").lean();

  if (existing) {
    throw new ApiError(409, "Static translation already exists");
  }

  const doc = await Translation.create({
    type: "static",
    languageCode: language.code,
    key: payload.key,
    value: payload.value,
    category: payload.category || "",
    description: payload.description || "",
    status: payload.status || "active",
    createdBy: userId || null,
    updatedBy: userId || null,
  });
  invalidateDictionary();
  return presentStatic(doc.toObject());
};

const bulkStatic = async (items, mode, userId) => {
  const identities = new Set();

  for (const item of items) {
    const identity = `${item.languageCode}:${item.key}`;

    if (identities.has(identity)) {
      throw new ApiError(400, "Validation failed", [{ field: "items", message: "items contains a duplicate translation" }]);
    }

    identities.add(identity);
    await languageService.requireExisting(item.languageCode);
  }

  if (mode === "create") {
    const keys = items.map((item) => ({ type: "static", languageCode: item.languageCode, key: item.key }));
    const existing = await Translation.find({ $or: keys }).select("languageCode key").lean();

    if (existing.length > 0) {
      throw new ApiError(409, "Static translation already exists");
    }

    const docs = await Translation.insertMany(
      items.map((item) => ({
        type: "static",
        languageCode: item.languageCode,
        key: item.key,
        value: item.value,
        category: item.category || "",
        description: item.description || "",
        status: item.status || "active",
        createdBy: userId || null,
        updatedBy: userId || null,
      }))
    );
    invalidateDictionary();
    return { created: docs.length, updated: 0, items: docs.map((doc) => presentStatic(doc.toObject())) };
  }

  const now = new Date();
  const result = await Translation.bulkWrite(
    items.map((item) => {
      const changes = {
        value: item.value,
        status: item.status || "active",
        updatedBy: userId || null,
        updatedAt: now,
      };

      if (item.category !== undefined) {
        changes.category = item.category;
      }

      if (item.description !== undefined) {
        changes.description = item.description;
      }

      return {
        updateOne: {
          filter: { type: "static", languageCode: item.languageCode, key: item.key },
          update: {
            $set: changes,
            $setOnInsert: {
              type: "static",
              languageCode: item.languageCode,
              key: item.key,
              createdBy: userId || null,
            },
          },
          upsert: true,
        },
      };
    })
  );
  invalidateDictionary();
  const saved = await Translation.find({
    type: "static",
    $or: items.map((item) => ({ languageCode: item.languageCode, key: item.key })),
  }).lean();
  return {
    created: result.upsertedCount || 0,
    updated: result.matchedCount || 0,
    items: saved.map(presentStatic),
  };
};

const updateStatic = async (id, payload, userId) => {
  const existing = await Translation.findOne({ _id: id, type: "static" }).lean();

  if (!existing) {
    throw new ApiError(404, "Translation not found");
  }

  const languageCode = payload.languageCode || existing.languageCode;
  const key = payload.key || existing.key;

  if (payload.languageCode) {
    await languageService.requireExisting(payload.languageCode);
  }

  if (languageCode !== existing.languageCode || key !== existing.key) {
    const clash = await Translation.findOne({ type: "static", languageCode, key, _id: { $ne: id } }).select("_id").lean();

    if (clash) {
      throw new ApiError(409, "Static translation already exists");
    }
  }

  const doc = await Translation.findByIdAndUpdate(
    id,
    {
      $set: {
        ...payload,
        languageCode,
        key,
        updatedBy: userId || null,
      },
    },
    { new: true, runValidators: true }
  ).lean();
  invalidateDictionary();
  return presentStatic(doc);
};

const deleteStatic = async (id) => {
  const doc = await Translation.findOneAndDelete({ _id: id, type: "static" }).lean();

  if (!doc) {
    throw new ApiError(404, "Translation not found");
  }

  invalidateDictionary();
  return presentStatic(doc);
};

const listStatic = async ({ languageCode, page, limit, search, missing }) => {
  const language = await languageService.requireActive(languageCode);
  const defaultLanguage = await languageService.defaultCode();
  const docs = await Translation.find({
    $or: [{ type: "dictionary" }, { type: "static" }, { type: { $exists: false }, key: { $type: "string" } }],
  })
    .select("type key translations languageCode value category description status")
    .lean();
  const rows = new Map();

  for (const doc of docs) {
    if (!doc.key || doc.type === "static") {
      continue;
    }

    rows.set(doc.key, {
      key: doc.key,
      category: doc.category || "",
      description: doc.description || "",
      status: doc.status,
      values: { ...(doc.translations || {}) },
      ids: {},
    });
  }

  for (const doc of docs) {
    if (doc.type !== "static" || !doc.key) {
      continue;
    }

    const row = rows.get(doc.key) || {
      key: doc.key,
      category: doc.category || "",
      description: doc.description || "",
      status: doc.status,
      values: {},
      ids: {},
    };
    row.values[doc.languageCode] = doc.value;
    row.ids[doc.languageCode] = doc._id;

    if (doc.languageCode === language.code) {
      row.category = doc.category || row.category;
      row.description = doc.description || row.description;
      row.status = doc.status;
    }

    rows.set(doc.key, row);
  }

  let items = [...rows.values()].map((row) => {
    const value = typeof row.values[language.code] === "string" ? row.values[language.code] : "";
    const source = typeof row.values[defaultLanguage] === "string" ? row.values[defaultLanguage] : "";
    return {
      _id: row.ids[language.code] || null,
      key: row.key,
      value,
      source,
      missing: !value.trim(),
      category: row.category,
      description: row.description,
      status: row.status,
    };
  });

  if (search) {
    const regex = containsRegex(search);
    items = items.filter((item) => regex.test(item.key) || regex.test(item.value) || regex.test(item.source));
  }

  if (missing) {
    items = items.filter((item) => item.missing);
  }

  items.sort((left, right) => left.key.localeCompare(right.key));
  const start = (page - 1) * limit;
  return {
    language: language.code,
    direction: language.direction,
    defaultLanguage,
    items: items.slice(start, start + limit),
    pagination: buildPagination(items.length, page, limit),
  };
};

const createDynamic = async (payload, userId) => {
  const language = await assertTranslatableLanguage(payload.languageCode);
  const entityType = canonicalEntityType(payload.entityType);
  assertObjectId(payload.entityId);
  assertField(entityType, payload.field);
  await assertEntityExists(entityType, payload.entityId);
  const existing = await Translation.findOne({
    type: "dynamic",
    languageCode: language.code,
    entityType,
    entityId: payload.entityId,
    field: payload.field,
  })
    .select("_id")
    .lean();

  if (existing) {
    throw new ApiError(409, "Dynamic translation already exists");
  }

  const doc = await Translation.create({
    type: "dynamic",
    languageCode: language.code,
    entityType,
    entityId: payload.entityId,
    field: payload.field,
    value: payload.value,
    status: payload.status || "active",
    createdBy: userId || null,
    updatedBy: userId || null,
  });
  invalidateDynamic();
  return presentDynamic(doc.toObject());
};

const bulkDynamic = async (items, mode, userId) => {
  const identities = new Set();
  const prepared = [];

  for (const item of items) {
    const language = await assertTranslatableLanguage(item.languageCode);
    const entityType = canonicalEntityType(item.entityType);
    assertObjectId(item.entityId);
    assertField(entityType, item.field);
    const identity = `${language.code}:${entityType}:${item.entityId}:${item.field}`;

    if (identities.has(identity)) {
      throw new ApiError(400, "Validation failed", [{ field: "items", message: "items contains a duplicate translation" }]);
    }

    identities.add(identity);
    prepared.push({ ...item, languageCode: language.code, entityType });
  }

  const entityChecks = new Map();

  for (const item of prepared) {
    entityChecks.set(`${item.entityType}:${item.entityId}`, item);
  }

  for (const item of entityChecks.values()) {
    await assertEntityExists(item.entityType, item.entityId);
  }

  if (mode === "create") {
    const existing = await Translation.find({
      type: "dynamic",
      $or: prepared.map((item) => ({
        languageCode: item.languageCode,
        entityType: item.entityType,
        entityId: item.entityId,
        field: item.field,
      })),
    })
      .select("_id")
      .lean();

    if (existing.length > 0) {
      throw new ApiError(409, "Dynamic translation already exists");
    }

    const docs = await Translation.insertMany(
      prepared.map((item) => ({
        type: "dynamic",
        languageCode: item.languageCode,
        entityType: item.entityType,
        entityId: item.entityId,
        field: item.field,
        value: item.value,
        status: item.status || "active",
        createdBy: userId || null,
        updatedBy: userId || null,
      }))
    );
    invalidateDynamic();
    return { created: docs.length, updated: 0, items: docs.map((doc) => presentDynamic(doc.toObject())) };
  }

  const now = new Date();
  const result = await Translation.bulkWrite(
    prepared.map((item) => ({
      updateOne: {
        filter: {
          type: "dynamic",
          languageCode: item.languageCode,
          entityType: item.entityType,
          entityId: new mongoose.Types.ObjectId(item.entityId),
          field: item.field,
        },
        update: {
          $set: {
            value: item.value,
            status: item.status || "active",
            updatedBy: userId || null,
            updatedAt: now,
          },
          $setOnInsert: {
            type: "dynamic",
            languageCode: item.languageCode,
            entityType: item.entityType,
            entityId: new mongoose.Types.ObjectId(item.entityId),
            field: item.field,
            createdBy: userId || null,
          },
        },
        upsert: true,
      },
    }))
  );
  invalidateDynamic();
  return {
    created: result.upsertedCount || 0,
    updated: result.matchedCount || 0,
    items: prepared.map((item) => ({
      languageCode: item.languageCode,
      entityType: item.entityType,
      entityId: item.entityId,
      field: item.field,
      value: item.value,
    })),
  };
};

const updateDynamic = async (id, payload, userId) => {
  const existing = await Translation.findOne({ _id: id, type: "dynamic" }).lean();

  if (!existing) {
    throw new ApiError(404, "Translation not found");
  }

  const languageCode = payload.languageCode || existing.languageCode;
  const entityType = canonicalEntityType(payload.entityType || existing.entityType);
  const entityId = payload.entityId || existing.entityId;
  const field = payload.field || existing.field;
  await assertTranslatableLanguage(languageCode);
  assertObjectId(entityId);
  assertField(entityType, field);
  await assertEntityExists(entityType, entityId);
  const clash = await Translation.findOne({
    type: "dynamic",
    languageCode,
    entityType,
    entityId,
    field,
    _id: { $ne: id },
  })
    .select("_id")
    .lean();

  if (clash) {
    throw new ApiError(409, "Dynamic translation already exists");
  }

  const doc = await Translation.findByIdAndUpdate(
    id,
    {
      $set: {
        languageCode,
        entityType,
        entityId,
        field,
        value: payload.value === undefined ? existing.value : payload.value,
        status: payload.status || existing.status,
        updatedBy: userId || null,
      },
    },
    { new: true, runValidators: true }
  ).lean();
  invalidateDynamic();
  return presentDynamic(doc);
};

const deleteDynamic = async (id) => {
  const doc = await Translation.findOneAndDelete({ _id: id, type: "dynamic" }).lean();

  if (!doc) {
    throw new ApiError(404, "Translation not found");
  }

  invalidateDynamic();
  return presentDynamic(doc);
};

const fieldState = (sourceDoc, patterns, rows, languages) => {
  const paths = new Set();

  for (const pattern of patterns) {
    for (const path of expandPattern(sourceDoc, pattern)) {
      paths.add(path);
    }
  }

  for (const row of rows) {
    if (!isBlockedField(row.field)) {
      paths.add(row.field);
    }
  }

  return [...paths].sort().map((field) => {
    const described = describeSource(sourceDoc, field);
    const values = {};

    for (const row of rows) {
      if (row.field === field) {
        values[row.languageCode] = typeof row.value === "string" ? row.value : "";
      }
    }

    const missing = languages
      .filter((language) => !language.isDefault)
      .filter((language) => described.source.trim() && !(values[language.code] || "").trim())
      .map((language) => language.code);

    return { field, source: described.source, sourceKey: described.sourceKey, values, missing };
  });
};

const getEntityTranslations = async (entityType, entityId) => {
  const canonical = canonicalEntityType(entityType);
  assertObjectId(entityId);
  const Model = modelFor(canonical);
  const entity = Model ? await Model.findById(entityId).lean() : null;
  const rows = await Translation.find({ type: "dynamic", entityType: canonical, entityId }).sort({ field: 1, languageCode: 1 }).lean();
  const languages = await languageService.listLanguages();
  const defaultLanguage = await languageService.defaultCode();
  const patterns = fieldsFor(canonical) || [];
  const sourceDoc = projectSource(canonical, entity, defaultLanguage);

  return {
    entityType: canonical,
    entityId,
    exists: Boolean(entity),
    label: entityLabel(canonical, entity),
    defaultLanguage,
    translatableFields: patterns,
    fields: entity ? fieldState(sourceDoc, patterns, rows, languages) : [],
    records: rows.map(presentDynamic),
  };
};

const searchFilter = (entityType, search) => {
  if (!search) {
    return {};
  }

  const regex = containsRegex(search);

  if (entityType === "Page") {
    return { $or: [{ slug: regex }, { title: regex }] };
  }

  if (entityType === "Section") {
    return { name: regex };
  }

  if (entityType === "Blog") {
    return { $or: [{ slug: regex }, { "locales.en.title": regex }] };
  }

  if (entityType === "BlogCategory") {
    return { $or: [{ slug: regex }, { "name.en": regex }] };
  }

  if (entityType === "LandingPage") {
    return { $or: [{ sectionKey: regex }, { sectionName: regex }, { title: regex }] };
  }

  return {};
};

const summarizeEntity = (entityType, doc, language, rows, defaultLanguage) => {
  const patterns = fieldsFor(entityType) || [];
  const sourceDoc = projectSource(entityType, doc, defaultLanguage);
  const fields = fieldState(sourceDoc, patterns, rows, [
    { code: language.code, isDefault: language.isDefault },
    { code: defaultLanguage, isDefault: true },
  ]);
  const visible = fields.filter((field) => field.source.trim() || field.sourceKey || (field.values[language.code] || "").trim());
  const missingCount = visible.filter((field) => field.missing.includes(language.code)).length;

  return {
    entityId: doc._id,
    label: entityLabel(entityType, doc),
    missingCount,
    fields: visible.map((field) => ({
      field: field.field,
      source: field.source,
      sourceKey: field.sourceKey,
      value: field.values[language.code] || "",
      missing: field.missing.includes(language.code),
    })),
  };
};

const listDynamicEntities = async ({ entityType, languageCode, page, limit, search, missing }) => {
  const canonical = canonicalEntityType(entityType);

  if (!knownEntityTypes().includes(canonical)) {
    throw new ApiError(400, "Unknown entity type");
  }

  const language = await languageService.requireActive(languageCode);
  const defaultLanguage = await languageService.defaultCode();
  const Model = modelFor(canonical);
  const filter = searchFilter(canonical, search);
  const attach = async (docs) => {
    const ids = docs.map((doc) => doc._id);
    const rows = ids.length
      ? await Translation.find({ type: "dynamic", entityType: canonical, entityId: { $in: ids } }).lean()
      : [];
    const grouped = new Map();

    for (const row of rows) {
      const id = String(row.entityId);

      if (!grouped.has(id)) {
        grouped.set(id, []);
      }

      grouped.get(id).push(row);
    }

    return docs.map((doc) => summarizeEntity(canonical, doc, language, grouped.get(String(doc._id)) || [], defaultLanguage));
  };

  if (missing) {
    const docs = await Model.find(filter).sort({ updatedAt: -1 }).limit(MAX_SCAN).lean();
    const summarized = (await attach(docs)).filter((item) => item.missingCount > 0);
    const start = (page - 1) * limit;
    return {
      language: language.code,
      direction: language.direction,
      entityType: canonical,
      items: summarized.slice(start, start + limit),
      pagination: buildPagination(summarized.length, page, limit),
      truncated: docs.length === MAX_SCAN,
    };
  }

  const result = await paginateQuery(Model.find(filter), { page, limit, sort: { updatedAt: -1 } });
  return {
    language: language.code,
    direction: language.direction,
    entityType: canonical,
    items: await attach(result.items),
    pagination: result.pagination,
    truncated: false,
  };
};

const removeForEntity = async (entityType, entityId) => {
  const canonical = canonicalEntityType(entityType);
  await Translation.deleteMany({ type: "dynamic", entityType: canonical, entityId });
  invalidateDynamic();
};

const copyForEntity = async (entityType, fromId, toId, userId) => {
  const canonical = canonicalEntityType(entityType);
  const rows = await Translation.find({ type: "dynamic", entityType: canonical, entityId: fromId }).lean();

  if (rows.length === 0) {
    return;
  }

  await Translation.insertMany(
    rows.map((row) => ({
      type: "dynamic",
      languageCode: row.languageCode,
      entityType: canonical,
      entityId: toId,
      field: row.field,
      value: row.value,
      status: row.status,
      category: row.category || "",
      description: row.description || "",
      createdBy: userId || null,
      updatedBy: userId || null,
    }))
  );
  invalidateDynamic();
};

module.exports = {
  loadDictionary,
  loadDynamic,
  resolve,
  resolveMany,
  createStatic,
  bulkStatic,
  updateStatic,
  deleteStatic,
  listStatic,
  createDynamic,
  bulkDynamic,
  updateDynamic,
  deleteDynamic,
  getEntityTranslations,
  listDynamicEntities,
  removeForEntity,
  copyForEntity,
  invalidateDictionary,
  invalidateDynamic,
  presentStatic,
  presentDynamic,
};
