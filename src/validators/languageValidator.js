const { Joi, validateBody, validateQuery, objectId, languageCode, pagination } = require("./helpers");

const direction = Joi.string().valid("ltr", "rtl");

const createSchema = Joi.object({
  name: Joi.string().trim().min(1).max(80).required(),
  code: languageCode.required(),
  nativeName: Joi.string().trim().min(1).max(80),
  direction,
  isDefault: Joi.boolean().default(false),
  isActive: Joi.boolean().default(true),
}).unknown(false);

const updateSchema = Joi.object({
  name: Joi.string().trim().min(1).max(80),
  code: languageCode,
  nativeName: Joi.string().trim().min(1).max(80),
  direction,
  isDefault: Joi.boolean(),
  isActive: Joi.boolean(),
  isDeleted: Joi.boolean(),
})
  .min(1)
  .unknown(false);

const listQuery = Joi.object({
  ...pagination,
  includeDeleted: Joi.boolean().default(false),
  activeOnly: Joi.boolean().default(false),
}).unknown(false);

module.exports = {
  validateCreateLanguage: (body) => validateBody(createSchema, body),
  validateUpdateLanguage: (body) => validateBody(updateSchema, body),
  validateListLanguages: (query) => validateQuery(listQuery, query),
  validateLanguageId: objectId,
};
