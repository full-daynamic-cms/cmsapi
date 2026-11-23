const {
  Joi,
  validateBody,
  validateQuery,
  objectId,
  translatable,
  pagination,
  validateForce,
} = require("./helpers");
const { SECTION_TYPES, SECTION_STATUSES } = require("../config/cms");

const button = Joi.object({
  text: translatable(200),
  link: Joi.string().trim().allow("").max(2000),
}).unknown(false);

const imageFields = {
  image: Joi.string().trim().allow("").max(4000),
  imagePublicId: Joi.string().trim().allow("").max(500),
};

const item = (shape) => Joi.object({ ...shape }).unknown(false);

const titled = (extra = {}) =>
  Joi.object({
    title: translatable(300),
    subtitle: translatable(500),
    description: translatable(20000),
    ...imageFields,
    button,
    ...extra,
  }).unknown(false);

const listSection = (itemSchema, itemName = "items") =>
  Joi.object({
    title: translatable(300),
    subtitle: translatable(500),
    description: translatable(20000),
    [itemName]: Joi.array().items(itemSchema).max(100),
  }).unknown(false);

const CONTENT_SCHEMAS = {
  header: Joi.object({
    button,
    items: Joi.array()
      .items(item({ label: translatable(120).required(), link: Joi.string().trim().min(1).max(2000).required() }))
      .max(50),
  }).unknown(false),
  hero: titled(),
  about: titled({
    items: Joi.array()
      .items(item({ title: translatable(120).required(), value: translatable(60), description: translatable(1000) }))
      .max(40),
  }),
  services: listSection(
    item({ number: translatable(20), title: translatable(200).required(), description: translatable(5000), ...imageFields })
  ),
  features: listSection(
    item({ icon: Joi.string().trim().allow("").max(120), title: translatable(200).required(), description: translatable(5000) })
  ),
  statistics: listSection(item({ label: translatable(120).required(), value: translatable(60).required() })),
  testimonials: listSection(
    item({
      name: translatable(120).required(),
      position: translatable(120),
      company: translatable(160),
      message: translatable(5000).required(),
      ...imageFields,
    })
  ),
  team: listSection(
    item({
      name: translatable(120).required(),
      role: translatable(120),
      bio: translatable(2000),
      ...imageFields,
    })
  ),
  gallery: Joi.object({
    title: translatable(300),
    description: translatable(5000),
    images: Joi.array()
      .items(item({ ...imageFields, alt: translatable(300), caption: translatable(500) }))
      .max(100),
  }).unknown(false),
  pricing: Joi.object({
    title: translatable(300),
    description: translatable(5000),
    plans: Joi.array()
      .items(
        item({
          name: translatable(120).required(),
          price: translatable(40),
          period: translatable(40),
          description: translatable(1000),
          features: Joi.array().items(translatable(200)).max(30),
          button,
        })
      )
      .max(20),
  }).unknown(false),
  faq: listSection(item({ question: translatable(300).required(), answer: translatable(5000).required() })),
  contact: Joi.object({
    title: translatable(300),
    description: translatable(5000),
    items: Joi.array()
      .items(
        item({
          label: translatable(120).required(),
          value: translatable(500).required(),
          type: Joi.string().trim().allow("").max(50),
        })
      )
      .max(30),
  }).unknown(false),
  cta: titled(),
  partners: listSection(
    item({
      name: translatable(120).required(),
      logo: Joi.string().trim().allow("").max(4000),
      logoPublicId: Joi.string().trim().allow("").max(500),
      link: Joi.string().trim().allow("").max(2000),
    })
  ),
  footer: Joi.object({
    description: translatable(5000),
    items: Joi.array()
      .items(
        item({
          group: translatable(80),
          label: translatable(120).required(),
          link: Joi.string().trim().min(1).max(2000).required(),
        })
      )
      .max(80),
  }).unknown(false),
  projects: listSection(
    item({
      title: translatable(200).required(),
      category: translatable(120),
      description: translatable(5000),
      link: Joi.string().trim().allow("").max(2000),
      ...imageFields,
    })
  ),
  process: listSection(
    item({ number: translatable(20), title: translatable(200).required(), description: translatable(5000) })
  ),
  "why-us": listSection(
    item({ icon: Joi.string().trim().allow("").max(120), title: translatable(200).required(), description: translatable(5000) })
  ),
  custom: Joi.object().unknown(true),
};

const TITLE_TYPES = new Set([
  "hero",
  "about",
  "services",
  "features",
  "statistics",
  "testimonials",
  "team",
  "gallery",
  "pricing",
  "faq",
  "contact",
  "cta",
  "partners",
  "projects",
  "process",
  "why-us",
]);

const settingsSchema = Joi.object().unknown(true).max(80);

const assertContent = (type, content = {}) => {
  const schema = CONTENT_SCHEMAS[type] || CONTENT_SCHEMAS.custom;
  const { error, value } = schema.validate(content, {
    abortEarly: false,
    stripUnknown: false,
    convert: true,
  });

  if (error) {
    throw new (require("../utils/ApiError"))(
      400,
      "Validation failed",
      error.details.map((detail) => ({
        field: ["content", ...detail.path].join("."),
        message: detail.message.replace(/"/g, ""),
      }))
    );
  }

  const serialized = JSON.stringify(value);

  if (serialized.length > 100000) {
    throw new (require("../utils/ApiError"))(400, "Validation failed", [
      { field: "content", message: "content is too large" },
    ]);
  }

  if (TITLE_TYPES.has(type)) {
    const title = value.title;
    const missing = title == null || title === "" || (typeof title === "string" && !title.trim());

    if (missing) {
      throw new (require("../utils/ApiError"))(400, "Validation failed", [
        { field: "content.title", message: "content.title is required" },
      ]);
    }
  }

  return value;
};

const assertSettings = (settings = {}) => {
  const { error, value } = settingsSchema.validate(settings, {
    abortEarly: false,
    allowUnknown: true,
    convert: true,
  });

  if (error) {
    throw new (require("../utils/ApiError"))(
      400,
      "Validation failed",
      error.details.map((detail) => ({
        field: ["settings", ...detail.path].join("."),
        message: detail.message.replace(/"/g, ""),
      }))
    );
  }

  if (JSON.stringify(value).length > 50000) {
    throw new (require("../utils/ApiError"))(400, "Validation failed", [
      { field: "settings", message: "settings is too large" },
    ]);
  }

  return value;
};

const createSchema = Joi.object({
  name: Joi.string().trim().min(1).max(120).required(),
  type: Joi.string()
    .valid(...SECTION_TYPES)
    .required(),
  content: Joi.object().unknown(true).default({}),
  settings: Joi.object().unknown(true).default({}),
  status: Joi.string()
    .valid(...SECTION_STATUSES)
    .default("active"),
  order: Joi.number().integer().min(0).default(0),
}).unknown(false);

const updateSchema = Joi.object({
  name: Joi.string().trim().min(1).max(120),
  type: Joi.string().valid(...SECTION_TYPES),
  content: Joi.object().unknown(true),
  settings: Joi.object().unknown(true),
  status: Joi.string().valid(...SECTION_STATUSES),
  order: Joi.number().integer().min(0),
})
  .min(1)
  .unknown(false);

const validateCreateSection = (body) => {
  const value = validateBody(createSchema, body);
  value.content = assertContent(value.type, value.content || {});
  value.settings = assertSettings(value.settings || {});
  return value;
};

const validateUpdateSection = (body) => validateBody(updateSchema, body);

const listQuery = Joi.object({
  ...pagination,
  search: Joi.string().trim().max(120).allow(""),
  type: Joi.string().valid(...SECTION_TYPES),
  status: Joi.string().valid(...SECTION_STATUSES),
  pageId: objectId,
}).unknown(false);

const reorderSchema = Joi.object({
  sections: Joi.array()
    .items(
      Joi.object({
        id: objectId.required(),
        order: Joi.number().integer().min(0).required(),
      }).unknown(false)
    )
    .min(1)
    .required()
    .custom((sections, helpers) => {
      const ids = new Set();
      const orders = new Set();

      for (const section of sections) {
        if (ids.has(section.id) || orders.has(section.order)) {
          return helpers.message("sections contains a duplicate id or order");
        }

        ids.add(section.id);
        orders.add(section.order);
      }

      return sections;
    }, "unique sections"),
}).unknown(false);

const statusSchema = Joi.object({
  status: Joi.string().valid(...SECTION_STATUSES),
}).unknown(false);

const duplicateSchema = Joi.object({
  name: Joi.string().trim().min(1).max(120),
  assignToPage: objectId,
}).unknown(false);

module.exports = {
  assertContent,
  assertSettings,
  validateCreateSection,
  validateUpdateSection,
  validateListSections: (query) => validateQuery(listQuery, query),
  validateReorderSections: (body) => validateBody(reorderSchema, body),
  validateSectionStatus: (body) => validateBody(statusSchema, body || {}),
  validateDuplicateSection: (body) => validateBody(duplicateSchema, body || {}),
  validateForce,
};
