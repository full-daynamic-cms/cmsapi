const Joi = require("joi");
const ApiError = require("../utils/ApiError");
const { LANGUAGE_PATTERN, SLUG_PATTERN, TRANSLATION_KEY_PATTERN, OBJECT_ID_PATTERN } = require("../config/cms");

const validateOptions = {
  abortEarly: false,
  stripUnknown: false,
  convert: true,
};

const throwValidationError = (error) => {
  throw new ApiError(
    400,
    "Validation failed",
    error.details.map((detail) => ({
      field: detail.path.join("."),
      message: detail.message.replace(/"/g, ""),
    }))
  );
};

const assertObject = (body) => {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    throw new ApiError(400, "Request body must be a JSON object");
  }
};

const validateBody = (schema, body, extra = {}) => {
  assertObject(body);
  const { error, value } = schema.validate(body, { ...validateOptions, ...extra });

  if (error) {
    throwValidationError(error);
  }

  return value;
};

const validateQuery = (schema, query) => {
  const { error, value } = schema.validate(query || {}, {
    abortEarly: false,
    stripUnknown: true,
    convert: true,
  });

  if (error) {
    throwValidationError(error);
  }

  return value;
};

const objectId = Joi.string().pattern(OBJECT_ID_PATTERN);
const slug = Joi.string().trim().lowercase().pattern(SLUG_PATTERN).max(120);
const translationKey = Joi.string().trim().lowercase().pattern(TRANSLATION_KEY_PATTERN).max(160);
const languageCode = Joi.string().trim().lowercase().pattern(LANGUAGE_PATTERN);

const translatable = (max = 5000) =>
  Joi.alternatives().try(
    Joi.string().allow("").max(max),
    Joi.object({ $t: translationKey.required() }).unknown(false)
  );

const pagination = {
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(10),
};

const localizedMap = (max = 5000) => Joi.object().pattern(LANGUAGE_PATTERN, Joi.string().allow("").max(max));

const seoFields = {
  metaTitle: translatable(300),
  metaDescription: translatable(500),
  keywords: Joi.array().items(translatable(80)).max(40),
  canonicalUrl: Joi.string().trim().allow("").max(2000),
  ogTitle: translatable(300),
  ogDescription: translatable(500),
  ogImage: Joi.string().trim().allow("").max(4000),
  robots: Joi.string().trim().allow("").max(120),
  schemaMarkup: Joi.alternatives().try(Joi.object().unknown(true), Joi.array(), Joi.valid(null)),
};

const seoSchema = Joi.object(seoFields).unknown(false);
const localizedSeo = Joi.object().pattern(LANGUAGE_PATTERN, seoSchema);

const forceQuery = Joi.object({
  force: Joi.boolean().default(false),
}).unknown(false);

const validateForce = (query) => validateQuery(forceQuery, query);

module.exports = {
  Joi,
  validateBody,
  validateQuery,
  objectId,
  slug,
  translationKey,
  languageCode,
  translatable,
  pagination,
  localizedMap,
  seoSchema,
  localizedSeo,
  validateForce,
};
