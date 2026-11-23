const { PAGE_TYPES, PAGE_STATUSES } = require("../config/cms");
const {
  Joi,
  validateBody,
  validateQuery,
  objectId,
  slug,
  translatable,
  pagination,
  localizedSeo,
} = require("./helpers");

const sectionRef = Joi.alternatives().try(
  objectId,
  Joi.object({
    section: objectId.required(),
    order: Joi.number().integer().min(0),
  }).unknown(false)
);

const pageTitle = translatable(300).custom((value, helpers) => {
  if (typeof value === "string" && !value.trim()) {
    return helpers.error("string.empty");
  }

  return value;
}, "page title");

const createSchema = Joi.object({
  title: pageTitle.required(),
  slug: slug,
  pageType: Joi.string()
    .valid(...PAGE_TYPES)
    .default("custom"),
  status: Joi.string()
    .valid(...PAGE_STATUSES)
    .default("draft"),
  sections: Joi.array().items(sectionRef).max(100).default([]),
  seo: localizedSeo.default({}),
}).unknown(false);

const updateSchema = Joi.object({
  title: pageTitle,
  slug,
  pageType: Joi.string().valid(...PAGE_TYPES),
  status: Joi.string().valid(...PAGE_STATUSES),
  sections: Joi.array().items(sectionRef).max(100),
  seo: localizedSeo,
})
  .min(1)
  .unknown(false);

const sectionsSchema = Joi.object({
  sections: Joi.array().items(sectionRef).max(100).required(),
}).unknown(false);

const listQuery = Joi.object({
  ...pagination,
  search: Joi.string().trim().max(120).allow(""),
  status: Joi.string().valid(...PAGE_STATUSES),
  pageType: Joi.string().valid(...PAGE_TYPES),
}).unknown(false);

const publicListQuery = Joi.object({
  ...pagination,
  lang: Joi.string().trim().lowercase().max(8),
}).unknown(false);

const langQuery = Joi.object({
  lang: Joi.string().trim().lowercase().max(8),
}).unknown(false);

module.exports = {
  validateCreatePage: (body) => validateBody(createSchema, body),
  validateUpdatePage: (body) => validateBody(updateSchema, body),
  validatePageSections: (body) => validateBody(sectionsSchema, body),
  validateListPages: (query) => validateQuery(listQuery, query),
  validatePublicPages: (query) => validateQuery(publicListQuery, query),
  validateLanguage: (query) => validateQuery(langQuery, query),
};
