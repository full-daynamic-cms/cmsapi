const WebsiteSettings = require("../models/WebsiteSettings");
const ApiError = require("../utils/ApiError");
const { describeLanguage } = require("../config/cms");
const translationService = require("./translationService");
const { pickSeo } = require("./seoService");

const SINGLETON = "default";

const getSettingsDocument = async () => {
  const existing = await WebsiteSettings.findOne({ singleton: SINGLETON }).lean();

  if (existing) {
    return existing;
  }

  try {
    const created = await WebsiteSettings.create({ singleton: SINGLETON });
    return created.toObject();
  } catch (error) {
    if (error.code === 11000) {
      return WebsiteSettings.findOne({ singleton: SINGLETON }).lean();
    }

    throw error;
  }
};

const presentAdmin = (doc) => {
  if (!doc) {
    return doc;
  }

  return {
    websiteName: doc.websiteName || "",
    logo: doc.logo || "",
    favicon: doc.favicon || "",
    defaultLanguage: doc.defaultLanguage || "en",
    supportedLanguages: doc.supportedLanguages || ["en", "ar"],
    socialLinks: doc.socialLinks || [],
    contact: {
      email: doc.contact?.email || "",
      phone: doc.contact?.phone || "",
      address: doc.contact?.address || "",
    },
    footer: doc.footer || {},
    header: doc.header || {},
    defaultSeo: doc.defaultSeo || {},
    maintenanceMode: Boolean(doc.maintenanceMode),
    maintenanceMessage: doc.maintenanceMessage || "",
    custom: doc.custom || {},
    updatedAt: doc.updatedAt,
    createdAt: doc.createdAt,
  };
};

const resolveRequestedLanguage = async (requested) => {
  const settings = await getSettingsDocument();
  const supported = settings.supportedLanguages?.length ? settings.supportedLanguages : ["en", "ar"];
  const code = (requested || settings.defaultLanguage || "en").trim().toLowerCase();
  const described = describeLanguage(code);

  if (!described || !supported.includes(code)) {
    throw new ApiError(400, "Unsupported language");
  }

  return { settings, language: described, supported };
};

const assertPublicAvailable = async () => {
  const settings = await getSettingsDocument();

  if (settings.maintenanceMode) {
    throw new ApiError(503, "Website is under maintenance");
  }
};

const updateSettings = async (payload, userId) => {
  const update = { ...payload, updatedBy: userId || null };

  if (payload.contact) {
    const current = await getSettingsDocument();
    update.contact = {
      email: current.contact?.email || "",
      phone: current.contact?.phone || "",
      address: current.contact?.address || "",
      ...payload.contact,
    };
  }

  const doc = await WebsiteSettings.findOneAndUpdate(
    { singleton: SINGLETON },
    {
      $set: update,
      $setOnInsert: { singleton: SINGLETON, createdBy: userId || null },
    },
    { new: true, upsert: true, runValidators: true }
  ).lean();

  return presentAdmin(doc);
};

const getPublicSettings = async (requestedLanguage) => {
  const { settings, language, supported } = await resolveRequestedLanguage(requestedLanguage);
  const seo = pickSeo(settings.defaultSeo, language.code);
  const resolved = await translationService.resolveContent(
    {
      websiteName: settings.websiteName || "",
      contact: {
        email: settings.contact?.email || "",
        phone: settings.contact?.phone || "",
        address: settings.contact?.address || "",
      },
      footer: settings.footer || {},
      header: settings.header || {},
      seo,
      maintenanceMessage: settings.maintenanceMessage || "",
    },
    language.code
  );

  return {
    websiteName: resolved.websiteName,
    logo: settings.logo || "",
    favicon: settings.favicon || "",
    defaultLanguage: settings.defaultLanguage || "en",
    language: language.code,
    direction: language.direction,
    supportedLanguages: supported.map((code) => describeLanguage(code)).filter(Boolean),
    socialLinks: settings.socialLinks || [],
    contact: resolved.contact,
    footer: resolved.footer,
    header: resolved.header,
    seo: resolved.seo,
    maintenanceMode: Boolean(settings.maintenanceMode),
    maintenanceMessage: resolved.maintenanceMessage,
  };
};

module.exports = {
  getSettingsDocument,
  presentAdmin,
  resolveRequestedLanguage,
  assertPublicAvailable,
  updateSettings,
  getPublicSettings,
};
