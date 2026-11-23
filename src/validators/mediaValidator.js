const { Joi, validateBody, validateQuery, pagination, validateForce } = require("./helpers");

const FOLDER = /^[a-z0-9][a-z0-9/_-]{0,79}$/;

const listQuery = Joi.object({
  ...pagination,
  search: Joi.string().trim().max(160).allow(""),
  folder: Joi.string().trim().lowercase().pattern(FOLDER),
  mimeType: Joi.string().trim().max(120),
}).unknown(false);

const updateSchema = Joi.object({
  altText: Joi.string().trim().allow("").max(300),
  folder: Joi.string().trim().lowercase().pattern(FOLDER),
})
  .min(1)
  .unknown(false);

const uploadFields = Joi.object({
  folder: Joi.string().trim().lowercase().pattern(FOLDER).default("general"),
  altText: Joi.string().trim().allow("").max(300).default(""),
}).unknown(true);

module.exports = {
  validateListMedia: (query) => validateQuery(listQuery, query),
  validateUpdateMedia: (body) => validateBody(updateSchema, body),
  validateUploadFields: (body) => validateBody(uploadFields, body || {}),
  validateForce,
};
