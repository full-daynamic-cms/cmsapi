const { TRANSLATION_STATUSES } = require("../config/cms");
const { Joi, validateBody, validateQuery, objectId, translationKey, pagination, languageCode } = require("./helpers");

const translationMap = Joi.object()
  .pattern(/^[a-z]{2,8}$/, Joi.string().allow("").max(20000))
  .min(1)
  .required();

const fields = {
  key: translationKey.required(),
  translations: translationMap,
  category: Joi.string().trim().allow("").max(80).default(""),
  description: Joi.string().trim().allow("").max(500).default(""),
  status: Joi.string()
    .valid(...TRANSLATION_STATUSES)
    .default("active"),
};

const createSchema = Joi.object(fields).unknown(false);

const updateSchema = Joi.object({
  key: translationKey,
  translations: Joi.object().pattern(/^[a-z]{2,8}$/, Joi.string().allow("").max(20000)).min(1),
  category: Joi.string().trim().allow("").max(80),
  description: Joi.string().trim().allow("").max(500),
  status: Joi.string().valid(...TRANSLATION_STATUSES),
})
  .min(1)
  .unknown(false);

const bulkCreateSchema = Joi.object({
  items: Joi.array().items(createSchema).min(1).max(200).required(),
}).unknown(false);

const bulkUpdateItem = updateSchema.keys({
  id: objectId,
  key: translationKey,
}).or("id", "key");

const bulkUpdateSchema = Joi.object({
  items: Joi.array().items(bulkUpdateItem).min(1).max(200).required(),
}).unknown(false);

const importItemSchema = Joi.object({
  key: translationKey.required(),
  translations: Joi.object().pattern(/^[a-z]{2,8}$/, Joi.string().allow("").max(20000)).min(1).required(),
  category: Joi.string().trim().allow("").max(80),
  description: Joi.string().trim().allow("").max(500),
  status: Joi.string().valid(...TRANSLATION_STATUSES),
}).unknown(false);

const importSchema = Joi.object({
  mode: Joi.string().valid("create", "upsert").default("upsert"),
  items: Joi.array().items(importItemSchema).min(1).max(200).required(),
}).unknown(false);

const listQuery = Joi.object({
  ...pagination,
  search: Joi.string().trim().max(160).allow(""),
  category: Joi.string().trim().max(80).allow(""),
  status: Joi.string().valid(...TRANSLATION_STATUSES),
  lang: languageCode,
}).unknown(false);

const languageQuery = Joi.object({
  lang: languageCode,
}).unknown(false);

const staticFields = {
  languageCode: languageCode.required(),
  key: translationKey.required(),
  value: Joi.string().allow("").max(100000).required(),
  category: Joi.string().trim().allow("").max(80).default(""),
  description: Joi.string().trim().allow("").max(500).default(""),
  status: Joi.string()
    .valid(...TRANSLATION_STATUSES)
    .default("active"),
};

const staticCreateSchema = Joi.object(staticFields).unknown(false);

const staticUpdateSchema = Joi.object({
  languageCode,
  key: translationKey,
  value: Joi.string().allow("").max(100000),
  category: Joi.string().trim().allow("").max(80),
  description: Joi.string().trim().allow("").max(500),
  status: Joi.string().valid(...TRANSLATION_STATUSES),
})
  .min(1)
  .unknown(false);

const staticBulkItem = Joi.object({
  languageCode,
  key: translationKey.required(),
  value: Joi.string().allow("").max(100000).required(),
  category: Joi.string().trim().allow("").max(80),
  description: Joi.string().trim().allow("").max(500),
  status: Joi.string().valid(...TRANSLATION_STATUSES),
}).unknown(false);

const staticBulkSchema = Joi.object({
  mode: Joi.string().valid("create", "upsert").default("upsert"),
  languageCode,
  items: Joi.array().items(staticBulkItem).min(1).max(200).required(),
})
  .custom((value, helpers) => {
    value.items = value.items.map((item) => ({
      ...item,
      languageCode: item.languageCode || value.languageCode,
    }));

    if (value.items.some((item) => !item.languageCode)) {
      return helpers.message("languageCode is required");
    }

    return value;
  }, "static bulk language")
  .unknown(false);

const dynamicFields = {
  languageCode: languageCode.required(),
  entityType: Joi.string()
    .trim()
    .pattern(/^[A-Za-z][A-Za-z0-9]{0,40}$/)
    .required(),
  entityId: objectId.required(),
  field: Joi.string()
    .trim()
    .pattern(/^[A-Za-z_][A-Za-z0-9_]*(?:\.[A-Za-z0-9_]+)*$/)
    .max(180)
    .required(),
  value: Joi.string().allow("").max(100000).required(),
  status: Joi.string()
    .valid(...TRANSLATION_STATUSES)
    .default("active"),
};

const dynamicCreateSchema = Joi.object(dynamicFields).unknown(false);

const dynamicUpdateSchema = Joi.object({
  languageCode,
  entityType: Joi.string().trim().pattern(/^[A-Za-z][A-Za-z0-9]{0,40}$/),
  entityId: objectId,
  field: Joi.string()
    .trim()
    .pattern(/^[A-Za-z_][A-Za-z0-9_]*(?:\.[A-Za-z0-9_]+)*$/)
    .max(180),
  value: Joi.string().allow("").max(100000),
  status: Joi.string().valid(...TRANSLATION_STATUSES),
})
  .min(1)
  .unknown(false);

const dynamicBulkSchema = Joi.object({
  mode: Joi.string().valid("create", "upsert").default("upsert"),
  languageCode,
  items: Joi.array()
    .items(
      Joi.object({
        languageCode,
        entityType: dynamicFields.entityType,
        entityId: objectId.required(),
        field: dynamicFields.field,
        value: Joi.string().allow("").max(100000).required(),
        status: Joi.string().valid(...TRANSLATION_STATUSES),
      }).unknown(false)
    )
    .min(1)
    .max(200)
    .required(),
})
  .custom((value, helpers) => {
    value.items = value.items.map((item) => ({
      ...item,
      languageCode: item.languageCode || value.languageCode,
    }));

    if (value.items.some((item) => !item.languageCode)) {
      return helpers.message("languageCode is required");
    }

    return value;
  }, "dynamic bulk language")
  .unknown(false);

const staticListQuery = Joi.object({
  ...pagination,
  languageCode,
  lang: languageCode,
  search: Joi.string().trim().max(160).allow(""),
  missing: Joi.boolean().default(false),
})
  .or("languageCode", "lang")
  .unknown(false);

const dynamicListQuery = Joi.object({
  ...pagination,
  entityType: Joi.string()
    .trim()
    .pattern(/^[A-Za-z][A-Za-z0-9]{0,40}$/)
    .required(),
  languageCode,
  lang: languageCode,
  search: Joi.string().trim().max(160).allow(""),
  missing: Joi.boolean().default(false),
})
  .or("languageCode", "lang")
  .unknown(false);

const dynamicEntityQuery = Joi.object({
  languageCode,
  lang: languageCode,
}).unknown(false);

module.exports = {
  validateCreateTranslation: (body) => validateBody(createSchema, body),
  validateUpdateTranslation: (body) => validateBody(updateSchema, body),
  validateBulkCreateTranslations: (body) => validateBody(bulkCreateSchema, body),
  validateBulkUpdateTranslations: (body) => validateBody(bulkUpdateSchema, body),
  validateImportTranslations: (body) => validateBody(importSchema, body),
  validateListTranslations: (query) => validateQuery(listQuery, query),
  validateLanguageQuery: (query) => validateQuery(languageQuery, query),
  validateCreateStaticTranslation: (body) => validateBody(staticCreateSchema, body),
  validateUpdateStaticTranslation: (body) => validateBody(staticUpdateSchema, body),
  validateBulkStaticTranslations: (body) => validateBody(staticBulkSchema, body),
  validateListStaticTranslations: (query) => {
    const value = validateQuery(staticListQuery, query);
    value.languageCode = value.languageCode || value.lang;
    return value;
  },
  validateCreateDynamicTranslation: (body) => validateBody(dynamicCreateSchema, body),
  validateUpdateDynamicTranslation: (body) => validateBody(dynamicUpdateSchema, body),
  validateBulkDynamicTranslations: (body) => validateBody(dynamicBulkSchema, body),
  validateListDynamicTranslations: (query) => {
    const value = validateQuery(dynamicListQuery, query);
    value.languageCode = value.languageCode || value.lang;
    return value;
  },
  validateDynamicEntityQuery: (query) => validateQuery(dynamicEntityQuery, query),
};
