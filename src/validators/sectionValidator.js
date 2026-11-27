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

const looseText = (max) =>
  Joi.alternatives().try(
    translatable(max),
    Joi.number().custom((value) => String(value))
  );

const button = Joi.object({
  text: translatable(200),
  link: Joi.string().trim().allow("").max(2000),
}).unknown(false);

const imageFields = {
  image: Joi.string().trim().allow("").max(4000),
  imagePublicId: Joi.string().trim().allow("").max(500),
};

const item = (shape) => Joi.object({ ...shape }).unknown(true);

const flexibleItems = Joi.array().items(item({})).max(100);

const titled = (extra = {}) =>
  Joi.object({
    title: translatable(300),
    subtitle: translatable(500),
    description: translatable(20000),
    ...imageFields,
    button,
    items: flexibleItems,
    ...extra,
  }).unknown(false);

const listSection = (itemSchema, itemName = "items") =>
  Joi.object({
    title: translatable(300),
    subtitle: translatable(500),
    description: translatable(20000),
    ...imageFields,
    button,
    [itemName]: Joi.array().items(itemSchema).max(100),
  }).unknown(true);

const CONTENT_SCHEMAS = {
  header: Joi.object({
    button,
    items: Joi.array()
      .items(item({ label: translatable(120), link: Joi.string().trim().allow("").max(2000) }))
      .max(50),
  }).unknown(false),
  hero: titled(),
  about: titled({
    items: Joi.array()
      .items(item({ title: translatable(120), value: translatable(60), description: translatable(1000) }))
      .max(40),
  }),
  services: listSection(
    item({
      number: looseText(20),
      icon: Joi.string().trim().allow("").max(120),
      title: translatable(200),
      description: translatable(5000),
      ...imageFields,
    })
  ),
  features: listSection(
    item({
      icon: Joi.string().trim().allow("").max(120),
      number: looseText(20),
      title: translatable(200),
      description: translatable(5000),
    })
  ),
  statistics: listSection(item({ label: translatable(120), value: translatable(60) })),
  testimonials: listSection(
    item({
      name: translatable(120),
      position: translatable(120),
      company: translatable(160),
      message: translatable(5000),
      ...imageFields,
    })
  ),
  team: listSection(
    item({
      name: translatable(120),
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
          name: translatable(120),
          price: translatable(40),
          period: translatable(40),
          description: translatable(1000),
          features: Joi.array().items(translatable(200)).max(30),
          button,
        })
      )
      .max(20),
  }).unknown(false),
  faq: listSection(item({ question: translatable(300), answer: translatable(5000) })),
  contact: Joi.object({
    title: translatable(300),
    description: translatable(5000),
    items: Joi.array()
      .items(
        item({
          label: translatable(120),
          value: translatable(500),
          type: Joi.string().trim().allow("").max(50),
        })
      )
      .max(30),
  }).unknown(false),
  cta: titled(),
  partners: listSection(
    item({
      name: translatable(120),
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
          label: translatable(120),
          link: Joi.string().trim().allow("").max(2000),
        })
      )
      .max(80),
  }).unknown(false),
  projects: listSection(
    item({
      title: translatable(200),
      category: translatable(120),
      description: translatable(5000),
      link: Joi.string().trim().allow("").max(2000),
      ...imageFields,
    })
  ),
  process: listSection(
    item({ number: translatable(20), title: translatable(200), description: translatable(5000) })
  ),
  "why-us": listSection(
    item({ icon: Joi.string().trim().allow("").max(120), title: translatable(200), description: translatable(5000) })
  ),
  custom: Joi.object().unknown(true),
};

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

const CONTENT_KEYS = ["title", "subtitle", "description", "image", "imagePublicId", "button", "items", "images", "plans"];

const nestSectionContent = (body) => {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return body;
  }

  const content = { ...(body.content && typeof body.content === "object" && !Array.isArray(body.content) ? body.content : {}) };
  const next = { ...body };
  let moved = false;

  for (const key of CONTENT_KEYS) {
    if (next[key] === undefined) {
      continue;
    }

    if (content[key] === undefined) {
      content[key] = next[key];
    }

    delete next[key];
    moved = true;
  }

  if (!moved) {
    return body;
  }

  next.content = content;
  return next;
};

const parseJsonField = (value) => {
  if (typeof value !== "string") {
    return value;
  }

  const trimmed = value.trim();

  if (!trimmed || (trimmed[0] !== "{" && trimmed[0] !== "[")) {
    return value;
  }

  try {
    return JSON.parse(trimmed);
  } catch {
    return value;
  }
};

const assignPath = (target, path, value) => {
  const parts = path.split(".").filter(Boolean);
  let cursor = target;

  for (let index = 0; index < parts.length - 1; index += 1) {
    const key = parts[index];
    const next = parts[index + 1];

    if (!cursor[key] || typeof cursor[key] !== "object") {
      cursor[key] = /^\d+$/.test(next) ? [] : {};
    }

    cursor = cursor[key];
  }

  cursor[parts[parts.length - 1]] = value;
};

const prepareSectionForm = (body) => {
  const output = {};

  for (const [rawKey, rawValue] of Object.entries(body || {})) {
    const key = rawKey.replace(/\[(\w+)\]/g, ".$1").replace(/^\./, "");
    assignPath(output, key, parseJsonField(rawValue));
  }

  return output;
};

const sectionImagePath = (fieldname) => {
  let name = String(fieldname || "")
    .replace(/\[(\w+)\]/g, ".$1")
    .replace(/^\./, "");

  if (!name || name === "file") {
    name = "image";
  }

  if (name === "image") {
    return "content.image";
  }

  if (name === "logo") {
    return "settings.logo";
  }

  if (!name.startsWith("content.") && !name.startsWith("settings.")) {
    name = `content.${name}`;
  }

  if (/\.\d+$/.test(name)) {
    return `${name}.image`;
  }

  return name;
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
  const value = validateBody(createSchema, nestSectionContent(body));
  value.content = assertContent(value.type, value.content || {});
  value.settings = assertSettings(value.settings || {});
  return value;
};

const validateUpdateSection = (body) => {
  const nested = nestSectionContent(body);
  const value = validateBody(updateSchema, nested);

  if (value.content && value.type) {
    value.content = assertContent(value.type, value.content);
  }

  if (value.settings) {
    value.settings = assertSettings(value.settings);
  }

  return value;
};

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
  prepareSectionForm,
  sectionImagePath,
  validateCreateSection,
  validateUpdateSection,
  validateListSections: (query) => validateQuery(listQuery, query),
  validateReorderSections: (body) => validateBody(reorderSchema, body),
  validateSectionStatus: (body) => validateBody(statusSchema, body || {}),
  validateDuplicateSection: (body) => validateBody(duplicateSchema, body || {}),
  validateForce,
};
