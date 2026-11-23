const { BLOG_STATUSES, CATEGORY_STATUSES } = require("../config/cms");
const {
  Joi,
  validateBody,
  validateQuery,
  objectId,
  slug,
  translatable,
  pagination,
  localizedMap,
  seoSchema,
  languageCode,
  validateForce,
} = require("./helpers");

const localeSchema = Joi.object({
  title: translatable(300),
  excerpt: translatable(1000),
  content: Joi.alternatives().try(
    Joi.string().allow("").max(200000),
    Joi.object().unknown(true),
    Joi.array().max(500)
  ),
  seo: seoSchema,
}).unknown(false);

const localesSchema = Joi.object()
  .pattern(/^[a-z]{2,8}$/, localeSchema)
  .custom((value, helpers) => {
    const title = value.en && value.en.title;

    if (title == null || title === "") {
      return helpers.message("locales.en.title is required");
    }

    return value;
  }, "english title");

const blogFields = {
  slug,
  locales: localesSchema.required(),
  featuredImage: Joi.string().trim().allow("").max(4000).default(""),
  gallery: Joi.array().items(Joi.string().trim().max(4000)).max(30).default([]),
  category: Joi.alternatives().try(objectId, slug, Joi.valid(null, "")).default(null),
  tags: Joi.array().items(Joi.string().trim().lowercase().max(40)).max(20).default([]),
  author: objectId,
  status: Joi.string()
    .valid(...BLOG_STATUSES)
    .default("draft"),
  featured: Joi.boolean().default(false),
};

const createSchema = Joi.object(blogFields).unknown(false);

const updateSchema = Joi.object({
  slug,
  locales: Joi.object().pattern(/^[a-z]{2,8}$/, localeSchema),
  featuredImage: Joi.string().trim().allow("").max(4000),
  gallery: Joi.array().items(Joi.string().trim().max(4000)).max(30),
  category: Joi.alternatives().try(objectId, slug, Joi.valid(null, "")),
  tags: Joi.array().items(Joi.string().trim().lowercase().max(40)).max(20),
  author: objectId,
  status: Joi.string().valid(...BLOG_STATUSES),
  featured: Joi.boolean(),
})
  .min(1)
  .unknown(false);

const categorySchema = Joi.object({
  name: localizedMap(120).min(1).required(),
  slug,
  description: localizedMap(1000),
  status: Joi.string()
    .valid(...CATEGORY_STATUSES)
    .default("active"),
})
  .custom((value, helpers) => {
    if (!value.name.en || !String(value.name.en).trim()) {
      return helpers.message("name.en is required");
    }

    return value;
  }, "english category name")
  .unknown(false);

const categoryUpdateSchema = Joi.object({
  name: localizedMap(120).min(1),
  slug,
  description: localizedMap(1000),
  status: Joi.string().valid(...CATEGORY_STATUSES),
})
  .min(1)
  .unknown(false);

const listQuery = Joi.object({
  ...pagination,
  search: Joi.string().trim().max(160).allow(""),
  status: Joi.string().valid(...BLOG_STATUSES),
  category: Joi.alternatives().try(objectId, slug),
  tag: Joi.string().trim().lowercase().max(40),
  featured: Joi.boolean(),
}).unknown(false);

const publicListQuery = listQuery.keys({
  lang: languageCode,
  status: Joi.any().strip(),
});

const categoryListQuery = Joi.object({
  ...pagination,
  search: Joi.string().trim().max(120).allow(""),
  status: Joi.string().valid(...CATEGORY_STATUSES),
}).unknown(false);

module.exports = {
  validateCreateBlog: (body) => validateBody(createSchema, body),
  validateUpdateBlog: (body) => validateBody(updateSchema, body),
  validateListBlogs: (query) => validateQuery(listQuery, query),
  validatePublicBlogs: (query) => validateQuery(publicListQuery, query),
  validateCreateCategory: (body) => validateBody(categorySchema, body),
  validateUpdateCategory: (body) => validateBody(categoryUpdateSchema, body),
  validateListCategories: (query) => validateQuery(categoryListQuery, query),
  validateForce,
};
