const { LANGUAGE_PATTERN } = require("../config/cms");
const { Joi, validateBody, validateQuery, translatable, localizedSeo, languageCode } = require("./helpers");

const flexible = Joi.object().unknown(true);

const schema = Joi.object({
  websiteName: translatable(160),
  logo: Joi.string().trim().allow("").max(4000),
  favicon: Joi.string().trim().allow("").max(4000),
  defaultLanguage: languageCode,
  supportedLanguages: Joi.array()
    .items(languageCode)
    .min(1)
    .max(20)
    .unique()
    .custom((value, helpers) => {
      if (!value.includes("en")) {
        return helpers.message("supportedLanguages must include en");
      }

      return value;
    }, "english support"),
  socialLinks: Joi.array()
    .items(
      Joi.object({
        platform: Joi.string().trim().min(1).max(40).required(),
        url: Joi.string().trim().min(1).max(2000).required(),
      }).unknown(false)
    )
    .max(20),
  contact: Joi.object({
    email: Joi.string().trim().allow("").max(200),
    phone: Joi.string().trim().allow("").max(40),
    address: translatable(500),
  }).unknown(false),
  footer: flexible,
  header: flexible,
  defaultSeo: localizedSeo,
  maintenanceMode: Joi.boolean(),
  maintenanceMessage: translatable(500),
  custom: flexible,
})
  .min(1)
  .unknown(false)
  .custom((value, helpers) => {
    if (value.defaultLanguage && value.supportedLanguages && !value.supportedLanguages.includes(value.defaultLanguage)) {
      return helpers.message("defaultLanguage must be one of supportedLanguages");
    }

    if (value.footer && JSON.stringify(value.footer).length > 50000) {
      return helpers.message("footer is too large");
    }

    if (value.header && JSON.stringify(value.header).length > 50000) {
      return helpers.message("header is too large");
    }

    if (value.custom && JSON.stringify(value.custom).length > 50000) {
      return helpers.message("custom is too large");
    }

    return value;
  }, "settings limits");

const publicQuery = Joi.object({
  lang: Joi.string().trim().lowercase().pattern(LANGUAGE_PATTERN),
}).unknown(false);

module.exports = {
  validateUpdateSettings: (body) => validateBody(schema, body),
  validatePublicSettings: (query) => validateQuery(publicQuery, query),
};
