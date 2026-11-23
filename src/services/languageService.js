const Language = require("../models/Language");
const WebsiteSettings = require("../models/WebsiteSettings");
const ApiError = require("../utils/ApiError");
const translationCache = require("../utils/translationCache");
const { LANGUAGE_PATTERN, defaultDirection } = require("../config/cms");

const SINGLETON = "default";
let defaultsPromise = null;

const normalizeCode = (code) => {
  const value = typeof code === "string" ? code.trim().toLowerCase() : "";
  return LANGUAGE_PATTERN.test(value) ? value : "";
};

const invalidate = () => {
  translationCache.invalidate("languages:");
};

const present = (doc) => {
  if (!doc) {
    return doc;
  }

  return {
    _id: doc._id,
    name: doc.name,
    code: doc.code,
    nativeName: doc.nativeName || doc.name,
    direction: doc.direction,
    isDefault: Boolean(doc.isDefault),
    isActive: Boolean(doc.isActive),
    isDeleted: Boolean(doc.isDeleted),
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
};

const displayName = (code) => {
  if (code === "en") {
    return { name: "English", nativeName: "English" };
  }

  if (code === "ar") {
    return { name: "Arabic", nativeName: "العربية" };
  }

  return { name: code.toUpperCase(), nativeName: code.toUpperCase() };
};

const syncStoredSettings = async () => {
  const active = await Language.find({ isDeleted: false, isActive: true }).select("code isDefault").lean();

  if (active.length === 0) {
    return;
  }

  const codes = active.map((item) => item.code);
  const defaultLanguage = active.find((item) => item.isDefault)?.code || codes[0];
  await WebsiteSettings.updateOne({ singleton: SINGLETON }, { $set: { supportedLanguages: codes, defaultLanguage } });
};

const ensureDefaults = async () => {
  if (!defaultsPromise) {
    defaultsPromise = (async () => {
      const count = await Language.countDocuments();

      if (count === 0) {
        try {
          await Language.create([
            {
              name: "English",
              code: "en",
              nativeName: "English",
              direction: "ltr",
              isDefault: true,
              isActive: true,
            },
            {
              name: "Arabic",
              code: "ar",
              nativeName: "العربية",
              direction: "rtl",
              isDefault: false,
              isActive: true,
            },
          ]);
        } catch (error) {
          if (error.code !== 11000 && error.errorResponse?.code !== 11000) {
            throw error;
          }
        }
      }

      const defaultLanguage = await Language.findOne({ isDefault: true, isDeleted: false }).select("_id").lean();

      if (!defaultLanguage) {
        const english = await Language.findOne({ code: "en", isDeleted: false }).select("_id").lean();
        const fallback = english || (await Language.findOne({ isDeleted: false }).select("_id").lean());

        if (fallback) {
          await Language.updateMany({ isDefault: true }, { $set: { isDefault: false } });
          await Language.updateOne({ _id: fallback._id }, { $set: { isDefault: true, isActive: true, isDeleted: false } });
        }
      }

      await syncStoredSettings();
      invalidate();
    })().catch((error) => {
      defaultsPromise = null;
      throw error;
    });
  }

  return defaultsPromise;
};

const listLanguages = async ({ includeDeleted = false, activeOnly = false } = {}) => {
  await ensureDefaults();
  const cacheKey = `languages:${includeDeleted ? "all" : "visible"}:${activeOnly ? "active" : "any"}`;
  const cached = translationCache.get(cacheKey);

  if (cached) {
    return cached;
  }

  const filter = {};

  if (!includeDeleted) {
    filter.isDeleted = false;
  }

  if (activeOnly) {
    filter.isActive = true;
    filter.isDeleted = false;
  }

  const docs = await Language.find(filter).sort({ isDefault: -1, name: 1 }).lean();
  const items = docs.map(present);
  translationCache.set(cacheKey, items);
  return items;
};

const listActive = async () => listLanguages({ activeOnly: true });

const getDefault = async () => {
  const active = await listActive();
  return active.find((item) => item.isDefault) || active[0] || null;
};

const defaultCode = async () => (await getDefault())?.code || "en";

const findByCode = async (code) => {
  await ensureDefaults();
  const normalized = normalizeCode(code);

  if (!normalized) {
    return null;
  }

  const doc = await Language.findOne({ code: normalized, isDeleted: false }).lean();
  return present(doc);
};

const requireExisting = async (code) => {
  const language = await findByCode(code);

  if (!language) {
    throw new ApiError(400, "Unsupported language");
  }

  return language;
};

const requireActive = async (code) => {
  const active = await listActive();
  const normalized = normalizeCode(code);
  const match = active.find((item) => item.code === normalized);

  if (!match) {
    throw new ApiError(400, "Unsupported language");
  }

  const fallback = active.find((item) => item.isDefault) || active[0];
  return { ...match, fallbackCode: fallback?.code || match.code };
};

const describeRequested = async (code) => {
  const normalized = normalizeCode(code) || (await defaultCode());
  return requireActive(normalized);
};

const assertCanBeDefault = (language) => {
  if (language.isDeleted) {
    throw new ApiError(400, "A deleted language cannot be the default language");
  }

  if (language.isActive === false) {
    throw new ApiError(400, "The default language must stay active");
  }
};

const clearOtherDefaults = async (id) => {
  await Language.updateMany({ _id: { $ne: id }, isDefault: true }, { $set: { isDefault: false } });
};

const createLanguage = async (payload) => {
  await ensureDefaults();
  const code = normalizeCode(payload.code);

  if (!code) {
    throw new ApiError(400, "Validation failed", [{ field: "code", message: "code is invalid" }]);
  }

  const existing = await Language.findOne({ code }).lean();

  if (existing) {
    throw new ApiError(409, existing.isDeleted ? "Language code already exists and is archived" : "Language code already exists");
  }

  const names = displayName(code);
  const isActive = payload.isActive !== false;
  let isDefault = Boolean(payload.isDefault);

  if (isDefault) {
    assertCanBeDefault({ isDeleted: false, isActive });
  }

  const currentDefault = await Language.findOne({ isDefault: true, isDeleted: false }).select("_id").lean();

  if (!currentDefault) {
    isDefault = true;
  }

  if (isDefault) {
    await Language.updateMany({ isDefault: true }, { $set: { isDefault: false } });
  }

  const doc = await Language.create({
    name: payload.name,
    code,
    nativeName: payload.nativeName || names.nativeName || payload.name,
    direction: payload.direction || defaultDirection(code),
    isDefault,
    isActive,
    isDeleted: false,
  });

  await syncStoredSettings();
  invalidate();
  return present(doc.toObject());
};

const getById = async (id, { includeInactive = false } = {}) => {
  await ensureDefaults();
  const doc = await Language.findById(id).lean();

  if (!doc || doc.isDeleted) {
    throw new ApiError(404, "Language not found");
  }

  if (!includeInactive && !doc.isActive) {
    throw new ApiError(404, "Language not found");
  }

  return present(doc);
};

const getByCode = async (code, { includeInactive = false } = {}) => {
  const language = await findByCode(code);

  if (!language || (!includeInactive && !language.isActive)) {
    throw new ApiError(404, "Language not found");
  }

  return language;
};

const updateLanguage = async (id, payload) => {
  await ensureDefaults();
  const existing = await Language.findById(id).lean();

  if (!existing || (existing.isDeleted && payload.isDeleted !== false)) {
    throw new ApiError(404, "Language not found");
  }

  if (payload.code && normalizeCode(payload.code) !== existing.code) {
    throw new ApiError(400, "Validation failed", [{ field: "code", message: "language code cannot be changed" }]);
  }

  const next = {
    name: payload.name === undefined ? existing.name : payload.name,
    nativeName: payload.nativeName === undefined ? existing.nativeName : payload.nativeName,
    direction: payload.direction === undefined ? existing.direction : payload.direction,
    isActive: payload.isActive === undefined ? existing.isActive : payload.isActive,
    isDeleted: payload.isDeleted === undefined ? existing.isDeleted : payload.isDeleted,
    isDefault: payload.isDefault === undefined ? existing.isDefault : payload.isDefault,
  };

  if (existing.isDefault && (next.isDeleted || next.isActive === false || next.isDefault === false)) {
    const replacement = await Language.findOne({
      _id: { $ne: existing._id },
      isDeleted: false,
      isActive: true,
      isDefault: true,
    })
      .select("_id")
      .lean();

    if (!replacement && next.isDefault === false) {
      throw new ApiError(400, "Choose another default language before changing this one");
    }

    if (existing.isDefault && (next.isDeleted || next.isActive === false)) {
      throw new ApiError(400, "The default language cannot be disabled or deleted");
    }
  }

  if (next.isDefault) {
    assertCanBeDefault(next);
    await clearOtherDefaults(existing._id);
  }

  const doc = await Language.findByIdAndUpdate(id, { $set: next }, { new: true, runValidators: true }).lean();
  await syncStoredSettings();
  invalidate();
  return present(doc);
};

const deleteLanguage = async (id) => {
  await ensureDefaults();
  const existing = await Language.findById(id).lean();

  if (!existing || existing.isDeleted) {
    throw new ApiError(404, "Language not found");
  }

  if (existing.isDefault) {
    throw new ApiError(400, "The default language cannot be deleted");
  }

  const doc = await Language.findByIdAndUpdate(
    id,
    { $set: { isDeleted: true, isActive: false, isDefault: false } },
    { new: true }
  ).lean();
  await syncStoredSettings();
  invalidate();
  return present(doc);
};

const applySettingsLanguages = async ({ codes, defaultLanguage } = {}) => {
  await ensureDefaults();
  const current = await Language.find({ isDeleted: false }).select("code isActive isDefault").lean();
  const activeCodes = Array.isArray(codes) && codes.length
    ? codes.map((code) => normalizeCode(code)).filter(Boolean)
    : current.filter((item) => item.isActive).map((item) => item.code);
  const uniqueCodes = [...new Set(activeCodes)];
  const fallback = current.find((item) => item.isDefault)?.code || "en";
  const nextDefault = normalizeCode(defaultLanguage) || fallback;

  if (!uniqueCodes.includes(nextDefault)) {
    throw new ApiError(400, "defaultLanguage must be one of supportedLanguages");
  }

  for (const code of uniqueCodes) {
    const names = displayName(code);
    await Language.updateOne(
      { code },
      {
        $set: { isActive: true, isDeleted: false, isDefault: false },
        $setOnInsert: {
          name: names.name,
          nativeName: names.nativeName,
          direction: defaultDirection(code),
        },
      },
      { upsert: true }
    );
  }

  await Language.updateMany(
    { code: { $nin: uniqueCodes }, isDeleted: false },
    { $set: { isActive: false, isDefault: false } }
  );
  await Language.updateOne({ code: nextDefault }, { $set: { isDefault: true, isActive: true, isDeleted: false } });
  await syncStoredSettings();
  invalidate();
  return { codes: uniqueCodes, defaultLanguage: nextDefault };
};

module.exports = {
  present,
  ensureDefaults,
  listLanguages,
  listActive,
  getDefault,
  defaultCode,
  findByCode,
  requireExisting,
  requireActive,
  describeRequested,
  createLanguage,
  getById,
  getByCode,
  updateLanguage,
  deleteLanguage,
  applySettingsLanguages,
};
