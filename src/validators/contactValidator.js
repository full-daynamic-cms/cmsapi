const { CONTACT_STATUSES } = require("../config/cms");
const { Joi, validateBody, validateQuery, pagination } = require("./helpers");

const createSchema = Joi.object({
  name: Joi.string().trim().min(2).max(120).required(),
  email: Joi.string().trim().lowercase().email().max(200).required(),
  phone: Joi.string().trim().allow("").max(40).default(""),
  subject: Joi.string().trim().allow("").max(200).default(""),
  message: Joi.string().trim().min(5).max(5000).required(),
  company: Joi.string().allow("").max(200),
}).unknown(false);

const updateSchema = Joi.object({
  status: Joi.string()
    .valid(...CONTACT_STATUSES)
    .required(),
}).unknown(false);

const listQuery = Joi.object({
  ...pagination,
  status: Joi.string().valid(...CONTACT_STATUSES),
  search: Joi.string().trim().max(160).allow(""),
}).unknown(false);

module.exports = {
  validateCreateContact: (body) => validateBody(createSchema, body),
  validateUpdateContact: (body) => validateBody(updateSchema, body),
  validateListContacts: (query) => validateQuery(listQuery, query),
};
