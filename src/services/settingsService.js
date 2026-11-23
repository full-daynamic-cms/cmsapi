const WebsiteSettings = require("../models/WebsiteSettings");
const ApiError = require("../utils/ApiError");
const translationService = require("./translationService");
const languageService = require("./languageService");
const { fieldsFor } = require("../config/translatableFields");
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
  const languages = await languageService.listActive();
  const supported = languages.map((item) => item.code);
  const defaultLanguage = languages.find((item) => item.isDefault) || languages[0];
  const code = (requested || defaultLanguage?.code || settings.defaultLanguage || "en").trim().toLowerCase();
  const described = languages.find((item) => item.code === code);

  if (!described) {
    throw new ApiError(400, "Unsupported language");
  }

  return {
    settings,
    supported,
    defaultLanguage: defaultLanguage?.code || described.code,
    language: {
      code: described.code,
      name: described.name,
      nativeName: described.nativeName,
      direction: described.direction,
      isDefault: Boolean(described.isDefault),
      fallbackCode: defaultLanguage?.code || described.code,
    },
  };
};

const assertPublicAvailable = async () => {
  const settings = await getSettingsDocument();

  if (settings.maintenanceMode) {
    throw new ApiError(503, "Website is under maintenance");
  }
};

const getAdminSettings = async () => {
  const view = presentAdmin(await getSettingsDocument());
  const languages = await languageService.listActive();

  if (languages.length > 0) {
    view.supportedLanguages = languages.map((item) => item.code);
    view.defaultLanguage = languages.find((item) => item.isDefault)?.code || view.defaultLanguage;
  }

  return view;
};

const updateSettings = async (payload, userId) => {
  const update = { ...payload, updatedBy: userId || null };

  if (payload.supportedLanguages || payload.defaultLanguage) {
    const synced = await languageService.applySettingsLanguages({
      codes: payload.supportedLanguages,
      defaultLanguage: payload.defaultLanguage,
    });
    update.supportedLanguages = synced.codes;
    update.defaultLanguage = synced.defaultLanguage;
  }

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
  const languages = await languageService.listActive();
  const seo = pickSeo(settings.defaultSeo, language.code);
  const overlaid = await translationService.resolve({
    entityType: "WebsiteSettings",
    entityId: settings._id,
    document: {
      websiteName: settings.websiteName || "",
      contact: {
        email: settings.contact?.email || "",
        phone: settings.contact?.phone || "",
        address: settings.contact?.address || "",
      },
      footer: settings.footer || {},
      header: settings.header || {},
      maintenanceMessage: settings.maintenanceMessage || "",
    },
    languageCode: language.code,
    translatableFields: fieldsFor("WebsiteSettings"),
  });
  const resolved = await translationService.resolveContent(
    {
      websiteName: overlaid.websiteName,
      contact: overlaid.contact,
      footer: overlaid.footer,
      header: overlaid.header,
      seo,
      maintenanceMessage: overlaid.maintenanceMessage,
    },
    language.code
  );

  return {
    websiteName: resolved.websiteName,
    logo: settings.logo || "",
    favicon: settings.favicon || "",
    defaultLanguage: language.fallbackCode || settings.defaultLanguage || "en",
    language: language.code,
    direction: language.direction,
    supportedLanguages: languages
      .filter((item) => supported.includes(item.code))
      .map((item) => ({
        code: item.code,
        name: item.name,
        nativeName: item.nativeName,
        direction: item.direction,
        isDefault: item.isDefault,
      })),
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
  getAdminSettings,
  resolveRequestedLanguage,
  assertPublicAvailable,
  updateSettings,
  getPublicSettings,
};
