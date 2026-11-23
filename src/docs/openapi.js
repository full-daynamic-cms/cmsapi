const id = {
  type: "string",
  pattern: "^[a-fA-F0-9]{24}$",
  example: "665f0a2b9c0e4a0012ab34cd",
};

const slug = {
  type: "string",
  pattern: "^[a-z0-9]+(?:-[a-z0-9]+)*$",
  example: "home",
};

const translatable = {
  description: "Plain text, or a translation reference object `{ \"$t\": \"key\" }`.",
  oneOf: [
    { type: "string" },
    {
      type: "object",
      additionalProperties: false,
      required: ["$t"],
      properties: {
        $t: { type: "string", example: "home.hero.title" },
      },
    },
  ],
};

const seo = {
  type: "object",
  additionalProperties: false,
  properties: {
    metaTitle: translatable,
    metaDescription: translatable,
    keywords: { type: "array", items: translatable },
    canonicalUrl: { type: "string" },
    ogTitle: translatable,
    ogDescription: translatable,
    ogImage: { type: "string" },
    robots: { type: "string", example: "index,follow" },
    schemaMarkup: { nullable: true },
  },
};

const localizedSeo = {
  type: "object",
  description: "SEO metadata keyed by language code.",
  additionalProperties: seo,
  example: {
    en: { metaTitle: "Home", metaDescription: "Welcome to our website" },
    ar: { metaTitle: "الرئيسية", metaDescription: "مرحباً بكم" },
  },
};

const pagination = {
  type: "object",
  required: ["total", "page", "limit", "totalPages"],
  properties: {
    total: { type: "integer", example: 24 },
    page: { type: "integer", example: 1 },
    limit: { type: "integer", example: 10 },
    totalPages: { type: "integer", example: 3 },
  },
};

const envelope = (data) => ({
  type: "object",
  required: ["status", "message", "data"],
  properties: {
    status: { type: "boolean", example: true },
    message: { type: "string" },
    data,
  },
});

const pageQuery = [
  { $ref: "#/components/parameters/Page" },
  { $ref: "#/components/parameters/Limit" },
];

const langQuery = [{ $ref: "#/components/parameters/Lang" }];

const jsonBody = (schema, example) => ({
  required: true,
  content: {
    "application/json": {
      schema,
      ...(example ? { example } : {}),
    },
  },
});

const success = (description, data, example) => ({
  description,
  content: {
    "application/json": {
      schema: envelope(data),
      ...(example ? { example } : {}),
    },
  },
});

const ref = (name) => ({ $ref: `#/components/responses/${name}` });

const operation = ({
  tag,
  summary,
  description,
  auth = false,
  parameters = [],
  body,
  responses,
}) => ({
  tags: [tag],
  summary,
  description,
  security: auth ? [{ bearerAuth: [] }] : [],
  parameters,
  ...(body ? { requestBody: body } : {}),
  responses,
});

const section = {
  type: "object",
  properties: {
    _id: id,
    name: { type: "string", example: "Home hero" },
    type: { $ref: "#/components/schemas/SectionType" },
    content: { type: "object", additionalProperties: true },
    settings: { type: "object", additionalProperties: true },
    status: { type: "string", enum: ["active", "inactive"] },
    order: { type: "integer" },
    createdBy: { nullable: true },
    updatedBy: { nullable: true },
    createdAt: { type: "string", format: "date-time" },
    updatedAt: { type: "string", format: "date-time" },
  },
};

const adminPage = {
  type: "object",
  properties: {
    _id: id,
    title: translatable,
    slug,
    pageType: { $ref: "#/components/schemas/PageType" },
    status: { $ref: "#/components/schemas/PublishStatus" },
    sections: {
      type: "array",
      items: {
        type: "object",
        properties: {
          order: { type: "integer" },
          section,
        },
      },
    },
    seo: localizedSeo,
    publishedAt: { type: "string", format: "date-time", nullable: true },
    hasUnpublishedChanges: { type: "boolean" },
    version: { type: "integer" },
    createdAt: { type: "string", format: "date-time" },
    updatedAt: { type: "string", format: "date-time" },
  },
};

const publicPage = {
  type: "object",
  properties: {
    title: { type: "string", example: "Home" },
    slug,
    pageType: { $ref: "#/components/schemas/PageType" },
    language: { type: "string", example: "en" },
    direction: { type: "string", enum: ["ltr", "rtl"] },
    fallbackLanguage: { type: "string", nullable: true, example: null },
    sections: {
      type: "array",
      items: {
        type: "object",
        properties: {
          type: { $ref: "#/components/schemas/SectionType" },
          order: { type: "integer" },
          content: { type: "object", additionalProperties: true },
          settings: { type: "object", additionalProperties: true },
        },
      },
    },
    seo,
  },
};

const translation = {
  type: "object",
  properties: {
    _id: id,
    key: { type: "string", example: "home.hero.title" },
    translations: {
      type: "object",
      additionalProperties: { type: "string" },
      example: { en: "Welcome to Our Company", ar: "مرحباً بكم في شركتنا" },
    },
    category: { type: "string", example: "home" },
    description: { type: "string" },
    status: { type: "string", enum: ["active", "inactive"] },
    createdAt: { type: "string", format: "date-time" },
    updatedAt: { type: "string", format: "date-time" },
  },
};

const blogLocale = {
  type: "object",
  properties: {
    title: translatable,
    excerpt: translatable,
    content: { description: "HTML or rich-text JSON." },
    seo,
  },
};

const blog = {
  type: "object",
  properties: {
    _id: id,
    slug,
    locales: { type: "object", additionalProperties: blogLocale },
    featuredImage: { type: "string" },
    gallery: { type: "array", items: { type: "string" } },
    category: { nullable: true },
    tags: { type: "array", items: { type: "string" } },
    author: { nullable: true },
    status: { $ref: "#/components/schemas/PublishStatus" },
    featured: { type: "boolean" },
    publishedAt: { type: "string", format: "date-time", nullable: true },
    createdAt: { type: "string", format: "date-time" },
    updatedAt: { type: "string", format: "date-time" },
  },
};

const publicBlog = {
  type: "object",
  properties: {
    title: { type: "string" },
    slug,
    excerpt: { type: "string" },
    content: {},
    featuredImage: { type: "string" },
    gallery: { type: "array", items: { type: "string" } },
    category: {
      nullable: true,
      type: "object",
      properties: { slug: { type: "string" }, name: { type: "string" } },
    },
    tags: { type: "array", items: { type: "string" } },
    author: {
      nullable: true,
      type: "object",
      properties: { name: { type: "string" } },
    },
    featured: { type: "boolean" },
    publishedAt: { type: "string", format: "date-time", nullable: true },
    language: { type: "string" },
    direction: { type: "string", enum: ["ltr", "rtl"] },
    fallbackLanguage: { type: "string", nullable: true },
    seo,
  },
};

const category = {
  type: "object",
  properties: {
    _id: id,
    name: { type: "object", additionalProperties: { type: "string" }, example: { en: "Projects", ar: "المشاريع" } },
    slug,
    description: { type: "object", additionalProperties: { type: "string" } },
    status: { type: "string", enum: ["active", "inactive"] },
    createdAt: { type: "string", format: "date-time" },
    updatedAt: { type: "string", format: "date-time" },
  },
};

const media = {
  type: "object",
  properties: {
    _id: id,
    filename: { type: "string" },
    originalName: { type: "string" },
    mimeType: { type: "string" },
    size: { type: "integer" },
    url: { type: "string" },
    publicId: { type: "string" },
    resourceType: { type: "string" },
    altText: { type: "string" },
    folder: { type: "string", example: "general" },
    createdAt: { type: "string", format: "date-time" },
    updatedAt: { type: "string", format: "date-time" },
  },
};

const contact = {
  type: "object",
  properties: {
    _id: id,
    name: { type: "string" },
    email: { type: "string", format: "email" },
    phone: { type: "string" },
    subject: { type: "string" },
    message: { type: "string" },
    status: { type: "string", enum: ["new", "read", "replied", "archived"] },
    createdAt: { type: "string", format: "date-time" },
    updatedAt: { type: "string", format: "date-time" },
  },
};

const settings = {
  type: "object",
  properties: {
    websiteName: translatable,
    logo: { type: "string" },
    favicon: { type: "string" },
    defaultLanguage: { type: "string", example: "en" },
    supportedLanguages: { type: "array", items: { type: "string" }, example: ["en", "ar"] },
    socialLinks: {
      type: "array",
      items: {
        type: "object",
        required: ["platform", "url"],
        properties: { platform: { type: "string" }, url: { type: "string" } },
      },
    },
    contact: {
      type: "object",
      properties: { email: { type: "string" }, phone: { type: "string" }, address: translatable },
    },
    footer: { type: "object", additionalProperties: true },
    header: { type: "object", additionalProperties: true },
    defaultSeo: localizedSeo,
    maintenanceMode: { type: "boolean" },
    maintenanceMessage: translatable,
    custom: { type: "object", additionalProperties: true },
  },
};

const translationInput = {
  type: "object",
  required: ["key", "translations"],
  properties: {
    key: { type: "string", example: "home.hero.title" },
    translations: { type: "object", additionalProperties: { type: "string" }, example: { en: "Welcome", ar: "مرحباً" } },
    category: { type: "string", example: "home" },
    description: { type: "string" },
    status: { type: "string", enum: ["active", "inactive"], default: "active" },
  },
};

const pageInput = {
  type: "object",
  required: ["title"],
  properties: {
    title: translatable,
    slug,
    pageType: { $ref: "#/components/schemas/PageType" },
    status: { $ref: "#/components/schemas/PublishStatus" },
    sections: {
      type: "array",
      items: {
        oneOf: [
          id,
          {
            type: "object",
            required: ["section"],
            properties: { section: id, order: { type: "integer", minimum: 0 } },
          },
        ],
      },
    },
    seo: localizedSeo,
  },
};

const sectionInput = {
  type: "object",
  required: ["name", "type"],
  properties: {
    name: { type: "string", example: "Home hero" },
    type: { $ref: "#/components/schemas/SectionType" },
    content: { type: "object", additionalProperties: true },
    settings: { type: "object", additionalProperties: true },
    status: { type: "string", enum: ["active", "inactive"] },
    order: { type: "integer", minimum: 0 },
  },
};

const blogInput = {
  type: "object",
  required: ["locales"],
  properties: {
    slug,
    locales: {
      type: "object",
      required: ["en"],
      properties: { en: blogLocale, ar: blogLocale },
      additionalProperties: blogLocale,
    },
    featuredImage: { type: "string" },
    gallery: { type: "array", items: { type: "string" } },
    category: { description: "Category id or slug. Send null to clear it.", nullable: true },
    tags: { type: "array", items: { type: "string" } },
    author: id,
    status: { $ref: "#/components/schemas/PublishStatus" },
    featured: { type: "boolean" },
  },
};

const paths = {
  "/api/health": {
    get: operation({
      tag: "Health",
      summary: "Health check",
      description: "Reports whether the process can reach MongoDB.",
      responses: {
        200: success("Server is running", { type: "object", properties: { database: { type: "string", example: "connected" } } }),
        503: ref("Unavailable"),
      },
    }),
  },
  "/api/auth/register": {
    post: operation({
      tag: "Auth",
      summary: "Register",
      body: jsonBody({
        type: "object",
        required: ["name", "email", "password"],
        additionalProperties: false,
        properties: {
          name: { type: "string", minLength: 2, maxLength: 80 },
          email: { type: "string", format: "email" },
          password: { type: "string", minLength: 8, maxLength: 72 },
        },
      }),
      responses: {
        201: success("Registered successfully", { type: "object", properties: { user: { type: "object" }, token: { type: "string" } } }),
        400: ref("BadRequest"),
        409: ref("Conflict"),
      },
    }),
  },
  "/api/auth/login": {
    post: operation({
      tag: "Auth",
      summary: "Log in",
      body: jsonBody({
        type: "object",
        required: ["email", "password"],
        additionalProperties: false,
        properties: {
          email: { type: "string", format: "email" },
          password: { type: "string" },
        },
      }),
      responses: {
        200: success("Logged in successfully", { type: "object", properties: { user: { type: "object" }, token: { type: "string" } } }),
        400: ref("BadRequest"),
        401: ref("Unauthorized"),
      },
    }),
  },
  "/api/auth/me": {
    get: operation({
      tag: "Auth",
      summary: "Current user",
      auth: true,
      responses: {
        200: success("Profile fetched successfully", { type: "object", properties: { name: { type: "string" }, email: { type: "string" } } }),
        401: ref("Unauthorized"),
      },
    }),
  },
  "/api/uploads": {
    post: operation({
      tag: "Uploads",
      summary: "Upload an image",
      description: "JPEG, PNG, WEBP, GIF, or AVIF up to 5MB. Stored in Cloudinary. Optional `sectionKey` chooses a folder such as `hero`.",
      auth: true,
      body: {
        required: true,
        content: {
          "multipart/form-data": {
            schema: {
              type: "object",
              required: ["image"],
              properties: {
                image: { type: "string", format: "binary" },
                sectionKey: { type: "string" },
              },
            },
          },
        },
      },
      responses: {
        201: success("Image uploaded successfully", {
          type: "object",
          properties: { url: { type: "string" }, publicId: { type: "string" }, width: { type: "integer" }, height: { type: "integer" }, format: { type: "string" }, bytes: { type: "integer" } },
        }),
        400: ref("BadRequest"),
        401: ref("Unauthorized"),
        500: ref("ServerError"),
        502: ref("BadGateway"),
      },
    }),
    delete: operation({
      tag: "Uploads",
      summary: "Delete a landing image",
      auth: true,
      body: jsonBody({
        type: "object",
        properties: { publicId: { type: "string" }, url: { type: "string" } },
      }),
      responses: {
        200: success("Image deleted successfully", { type: "object", properties: { publicId: { type: "string" } } }),
        400: ref("BadRequest"),
        401: ref("Unauthorized"),
      },
    }),
  },
};

const pageParameters = [{ $ref: "#/components/parameters/Page" }, { $ref: "#/components/parameters/Limit" }];

paths["/api/public/pages"] = {
  get: operation({
    tag: "Pages",
    summary: "List published pages",
    parameters: [...pageParameters, ...langQuery],
    responses: {
      200: success("Records retrieved successfully", { type: "object", properties: { items: { type: "array", items: publicPage }, pagination } }),
      400: ref("BadRequest"),
      503: ref("Unavailable"),
    },
  }),
};

paths["/api/public/pages/{slug}"] = {
  get: operation({
    tag: "Pages",
    summary: "Get a published page",
    description: "Resolves translation references for the requested language. Drafts are not returned.",
    parameters: [{ $ref: "#/components/parameters/Slug" }, ...langQuery],
    responses: {
      200: success("Page retrieved successfully", publicPage, {
        status: true,
        message: "Page retrieved successfully",
        data: {
          title: "Home",
          slug: "home",
          pageType: "home",
          language: "en",
          direction: "ltr",
          fallbackLanguage: null,
          sections: [{ type: "hero", order: 1, content: { title: "Welcome to Our Company", subtitle: "Building Better Solutions", button: { text: "Contact Us", link: "/contact" } } }],
          seo: { metaTitle: "Home", metaDescription: "Welcome to our website" },
        },
      }),
      400: ref("BadRequest"),
      404: ref("NotFound"),
      503: ref("Unavailable"),
    },
  }),
};

paths["/api/admin/pages"] = {
  get: operation({
    tag: "Pages",
    summary: "List pages",
    auth: true,
    parameters: [
      ...pageParameters,
      { name: "search", in: "query", schema: { type: "string" } },
      { name: "status", in: "query", schema: { $ref: "#/components/schemas/PublishStatus" } },
      { name: "pageType", in: "query", schema: { $ref: "#/components/schemas/PageType" } },
    ],
    responses: {
      200: success("Records retrieved successfully", { type: "object", properties: { items: { type: "array", items: adminPage }, pagination } }),
      401: ref("Unauthorized"),
    },
  }),
  post: operation({
    tag: "Pages",
    summary: "Create a page",
    description: "A published status copies the working content into the public snapshot immediately.",
    auth: true,
    body: jsonBody(pageInput),
    responses: {
      201: success("Page created successfully", adminPage),
      400: ref("BadRequest"),
      401: ref("Unauthorized"),
      404: ref("NotFound"),
      409: ref("Conflict"),
    },
  }),
};

paths["/api/admin/pages/slug/{slug}"] = {
  get: operation({
    tag: "Pages",
    summary: "Get a page by slug",
    auth: true,
    parameters: [{ $ref: "#/components/parameters/Slug" }],
    responses: { 200: success("Page retrieved successfully", adminPage), 401: ref("Unauthorized"), 404: ref("NotFound") },
  }),
};

paths["/api/admin/pages/{id}"] = {
  get: operation({
    tag: "Pages",
    summary: "Get a page",
    auth: true,
    parameters: [{ $ref: "#/components/parameters/Id" }],
    responses: { 200: success("Page retrieved successfully", adminPage), 400: ref("BadRequest"), 401: ref("Unauthorized"), 404: ref("NotFound") },
  }),
  put: operation({
    tag: "Pages",
    summary: "Update a page",
    description: "Content edits stay unpublished until publish, unless `status` is `published` in this request.",
    auth: true,
    parameters: [{ $ref: "#/components/parameters/Id" }],
    body: jsonBody(pageInput),
    responses: { 200: success("Page updated successfully", adminPage), 400: ref("BadRequest"), 401: ref("Unauthorized"), 404: ref("NotFound"), 409: ref("Conflict") },
  }),
  delete: operation({
    tag: "Pages",
    summary: "Delete a page",
    description: "Does not delete the reusable sections assigned to the page.",
    auth: true,
    parameters: [{ $ref: "#/components/parameters/Id" }],
    responses: { 200: success("Page deleted successfully", { type: "object" }), 401: ref("Unauthorized"), 404: ref("NotFound") },
  }),
};

paths["/api/admin/pages/{id}/sections"] = {
  put: operation({
    tag: "Pages",
    summary: "Replace page sections",
    auth: true,
    parameters: [{ $ref: "#/components/parameters/Id" }],
    body: jsonBody({ type: "object", required: ["sections"], properties: { sections: pageInput.properties.sections } }),
    responses: { 200: success("Page sections updated successfully", adminPage), 400: ref("BadRequest"), 401: ref("Unauthorized"), 404: ref("NotFound") },
  }),
};

paths["/api/admin/pages/{id}/publish"] = {
  post: operation({
    tag: "Pages",
    summary: "Publish a page",
    auth: true,
    parameters: [{ $ref: "#/components/parameters/Id" }],
    responses: { 200: success("Page published successfully", adminPage), 401: ref("Unauthorized"), 404: ref("NotFound") },
  }),
};

paths["/api/admin/pages/{id}/unpublish"] = {
  post: operation({
    tag: "Pages",
    summary: "Unpublish a page",
    auth: true,
    parameters: [{ $ref: "#/components/parameters/Id" }],
    responses: { 200: success("Page unpublished successfully", adminPage), 401: ref("Unauthorized"), 404: ref("NotFound") },
  }),
};

paths["/api/admin/pages/{id}/preview"] = {
  get: operation({
    tag: "Pages",
    summary: "Preview a page",
    description: "Resolves the working copy, including inactive sections and drafts.",
    auth: true,
    parameters: [{ $ref: "#/components/parameters/Id" }, ...langQuery],
    responses: { 200: success("Page retrieved successfully", publicPage), 401: ref("Unauthorized"), 404: ref("NotFound") },
  }),
};

paths["/api/admin/sections"] = {
  get: operation({
    tag: "Sections",
    summary: "List sections",
    description: "`pageId` returns the sections assigned to that page, in the page order.",
    auth: true,
    parameters: [
      ...pageParameters,
      { name: "search", in: "query", schema: { type: "string" } },
      { name: "type", in: "query", schema: { $ref: "#/components/schemas/SectionType" } },
      { name: "status", in: "query", schema: { type: "string", enum: ["active", "inactive"] } },
      { name: "pageId", in: "query", schema: id },
    ],
    responses: {
      200: success("Records retrieved successfully", { type: "object", properties: { items: { type: "array", items: section }, pagination } }),
      401: ref("Unauthorized"),
    },
  }),
  post: operation({
    tag: "Sections",
    summary: "Create a section",
    description: "Content is validated for `type`. The same type may be created more than once.",
    auth: true,
    body: jsonBody(sectionInput, {
      name: "Home hero",
      type: "hero",
      order: 1,
      content: { title: { $t: "home.hero.title" }, subtitle: { $t: "home.hero.subtitle" }, button: { text: "Contact Us", link: "/contact" } },
    }),
    responses: { 201: success("Section created successfully", section), 400: ref("BadRequest"), 401: ref("Unauthorized") },
  }),
};

paths["/api/admin/sections/reorder"] = {
  patch: operation({
    tag: "Sections",
    summary: "Reorder sections",
    description: "Updates each section's own order. Page display order is stored on the page.",
    auth: true,
    body: jsonBody({
      type: "object",
      required: ["sections"],
      properties: {
        sections: { type: "array", items: { type: "object", required: ["id", "order"], properties: { id, order: { type: "integer", minimum: 0 } } } },
      },
    }),
    responses: { 200: success("Sections reordered successfully", { type: "array", items: section }), 400: ref("BadRequest"), 401: ref("Unauthorized"), 404: ref("NotFound") },
  }),
};

paths["/api/admin/sections/{id}"] = {
  get: operation({
    tag: "Sections",
    summary: "Get a section",
    auth: true,
    parameters: [{ $ref: "#/components/parameters/Id" }],
    responses: { 200: success("Section retrieved successfully", section), 401: ref("Unauthorized"), 404: ref("NotFound") },
  }),
  put: operation({
    tag: "Sections",
    summary: "Update a section",
    description: "Shared section content changes every page that references it. Include `type` when sending `content`.",
    auth: true,
    parameters: [{ $ref: "#/components/parameters/Id" }],
    body: jsonBody(sectionInput),
    responses: { 200: success("Section updated successfully", section), 400: ref("BadRequest"), 401: ref("Unauthorized"), 404: ref("NotFound") },
  }),
  delete: operation({
    tag: "Sections",
    summary: "Delete a section",
    auth: true,
    parameters: [{ $ref: "#/components/parameters/Id" }, { $ref: "#/components/parameters/Force" }],
    responses: { 200: success("Section deleted successfully", section), 401: ref("Unauthorized"), 404: ref("NotFound"), 409: ref("Conflict") },
  }),
};

paths["/api/admin/sections/{id}/status"] = {
  patch: operation({
    tag: "Sections",
    summary: "Enable or disable a section",
    description: "An empty body toggles the status. Inactive sections are omitted from public pages immediately.",
    auth: true,
    parameters: [{ $ref: "#/components/parameters/Id" }],
    body: jsonBody({ type: "object", properties: { status: { type: "string", enum: ["active", "inactive"] } } }),
    responses: { 200: success("Section status updated successfully", section), 401: ref("Unauthorized"), 404: ref("NotFound") },
  }),
};

paths["/api/admin/sections/{id}/duplicate"] = {
  post: operation({
    tag: "Sections",
    summary: "Duplicate a section",
    description: "Copies the section and its translation keys so later edits do not change the original.",
    auth: true,
    parameters: [{ $ref: "#/components/parameters/Id" }],
    body: jsonBody({ type: "object", properties: { name: { type: "string" }, assignToPage: id } }),
    responses: { 201: success("Section duplicated successfully", section), 401: ref("Unauthorized"), 404: ref("NotFound") },
  }),
};

const dictionaryResponse = success("Translations retrieved successfully", {
  type: "object",
  properties: {
    language: { type: "string" },
    direction: { type: "string" },
    fallbackLanguage: { type: "string", nullable: true },
    translations: { type: "object", additionalProperties: { type: "string" } },
  },
});

const translationCollection = {
  get: operation({
    tag: "Translations",
    summary: "List translation records",
    auth: true,
    parameters: [
      ...pageParameters,
      { name: "search", in: "query", schema: { type: "string" } },
      { name: "category", in: "query", schema: { type: "string" } },
      { name: "status", in: "query", schema: { type: "string", enum: ["active", "inactive"] } },
      ...langQuery,
    ],
    responses: {
      200: success("Records retrieved successfully", { type: "object", properties: { items: { type: "array", items: translation }, pagination } }),
      401: ref("Unauthorized"),
    },
  }),
  post: operation({
    tag: "Translations",
    summary: "Create a translation",
    auth: true,
    body: jsonBody(translationInput),
    responses: { 201: success("Translation created successfully", translation), 400: ref("BadRequest"), 401: ref("Unauthorized"), 409: ref("Conflict") },
  }),
};

const translationDictionary = {
  get: operation({
    tag: "Translations",
    summary: "Language dictionary",
    description: "Active translations for one language, with English fallback. Usable as a frontend message catalog.",
    parameters: langQuery,
    responses: { 200: dictionaryResponse, 400: ref("BadRequest") },
  }),
};

paths["/api/public/translations"] = translationDictionary;
paths["/api/translations"] = {
  get: translationDictionary.get,
  post: translationCollection.post,
};
paths["/api/admin/translations"] = translationCollection;

const translationByKey = {
  get: operation({
    tag: "Translations",
    summary: "Get an active translation by key",
    parameters: [{ $ref: "#/components/parameters/TranslationKey" }],
    responses: { 200: success("Translation retrieved successfully", translation), 404: ref("NotFound") },
  }),
};

paths["/api/public/translations/{key}"] = translationByKey;

const bulkCreate = operation({
  tag: "Translations",
  summary: "Create translations in bulk",
  auth: true,
  body: jsonBody({ type: "object", required: ["items"], properties: { items: { type: "array", maxItems: 200, items: translationInput } } }),
  responses: { 201: success("Translations created successfully", { type: "array", items: translation }), 400: ref("BadRequest"), 401: ref("Unauthorized"), 409: ref("Conflict") },
});

const bulkUpdate = operation({
  tag: "Translations",
  summary: "Update translations in bulk",
  description: "Each item identifies a record by `id` or `key`. Language values are merged.",
  auth: true,
  body: jsonBody({
    type: "object",
    required: ["items"],
    properties: { items: { type: "array", maxItems: 200, items: { type: "object", properties: { id, key: { type: "string" }, translations: { type: "object", additionalProperties: { type: "string" } }, category: { type: "string" }, description: { type: "string" }, status: { type: "string" } } } } },
  }),
  responses: { 200: success("Translations updated successfully", { type: "array", items: translation }), 401: ref("Unauthorized"), 404: ref("NotFound") },
});

const missing = operation({
  tag: "Translations",
  summary: "Missing translations",
  auth: true,
  parameters: [{ $ref: "#/components/parameters/Lang" }],
  responses: { 200: success("Missing translations retrieved successfully", { type: "object", properties: { language: { type: "string" }, count: { type: "integer" }, items: { type: "array", items: { type: "object" } } } }), 401: ref("Unauthorized") },
});

const unused = operation({
  tag: "Translations",
  summary: "Unused translation keys",
  description: "Keys that are not referenced by pages, sections, blogs, categories, or settings.",
  auth: true,
  responses: { 200: success("Unused translations retrieved successfully", { type: "object", properties: { count: { type: "integer" }, items: { type: "array", items: { type: "object" } } } }), 401: ref("Unauthorized") },
});

const importTranslations = operation({
  tag: "Translations",
  summary: "Import translations",
  description: "`upsert` merges language values. `create` rejects keys that already exist.",
  auth: true,
  body: jsonBody({
    type: "object",
    required: ["items"],
    properties: {
      mode: { type: "string", enum: ["create", "upsert"], default: "upsert" },
      items: { type: "array", maxItems: 200, items: translationInput },
    },
  }),
  responses: { 200: success("Translations imported successfully", { type: "object", properties: { created: { type: "integer" }, updated: { type: "integer" } } }), 401: ref("Unauthorized"), 409: ref("Conflict") },
});

const exportTranslations = operation({
  tag: "Translations",
  summary: "Export translations",
  auth: true,
  responses: { 200: success("Translations exported successfully", { type: "array", items: translationInput }), 401: ref("Unauthorized") },
});

paths["/api/admin/translations/bulk"] = { post: bulkCreate, put: bulkUpdate };
paths["/api/translations/bulk"] = paths["/api/admin/translations/bulk"];
paths["/api/admin/translations/missing"] = { get: missing };
paths["/api/translations/missing"] = { get: missing };
paths["/api/admin/translations/unused"] = { get: unused };
paths["/api/translations/unused"] = { get: unused };
paths["/api/admin/translations/import"] = { post: importTranslations };
paths["/api/translations/import"] = { post: importTranslations };
paths["/api/admin/translations/export"] = { get: exportTranslations };
paths["/api/translations/export"] = { get: exportTranslations };

paths["/api/admin/translations/key/{key}"] = {
  get: operation({
    tag: "Translations",
    summary: "Get a translation by key",
    description: "Includes inactive records.",
    auth: true,
    parameters: [{ $ref: "#/components/parameters/TranslationKey" }],
    responses: { 200: success("Translation retrieved successfully", translation), 401: ref("Unauthorized"), 404: ref("NotFound") },
  }),
};

paths["/api/admin/translations/{id}"] = {
  get: operation({
    tag: "Translations",
    summary: "Get a translation",
    auth: true,
    parameters: [{ $ref: "#/components/parameters/Id" }],
    responses: { 200: success("Translation retrieved successfully", translation), 401: ref("Unauthorized"), 404: ref("NotFound") },
  }),
  put: operation({
    tag: "Translations",
    summary: "Update a translation",
    description: "Language values are merged with the current record.",
    auth: true,
    parameters: [{ $ref: "#/components/parameters/Id" }],
    body: jsonBody(translationInput),
    responses: { 200: success("Translation updated successfully", translation), 401: ref("Unauthorized"), 404: ref("NotFound"), 409: ref("Conflict") },
  }),
  delete: operation({
    tag: "Translations",
    summary: "Delete a translation",
    auth: true,
    parameters: [{ $ref: "#/components/parameters/Id" }],
    responses: { 200: success("Translation deleted successfully", translation), 401: ref("Unauthorized"), 404: ref("NotFound") },
  }),
};

paths["/api/translations/{key}"] = {
  ...translationByKey,
  put: operation({
    tag: "Translations",
    summary: "Update a translation by id",
    description: "Alias of `PUT /api/admin/translations/{id}`. The path value is the MongoDB id, not the translation key.",
    auth: true,
    parameters: [{ name: "key", in: "path", required: true, schema: id, description: "Translation id." }],
    body: jsonBody(translationInput),
    responses: paths["/api/admin/translations/{id}"].put.responses,
  }),
  delete: operation({
    tag: "Translations",
    summary: "Delete a translation by id",
    description: "Alias of `DELETE /api/admin/translations/{id}`. The path value is the MongoDB id.",
    auth: true,
    parameters: [{ name: "key", in: "path", required: true, schema: id, description: "Translation id." }],
    responses: paths["/api/admin/translations/{id}"].delete.responses,
  }),
};

const language = {
  type: "object",
  properties: {
    _id: id,
    name: { type: "string", example: "Arabic" },
    code: { type: "string", example: "ar" },
    nativeName: { type: "string", example: "العربية" },
    direction: { type: "string", enum: ["ltr", "rtl"] },
    isDefault: { type: "boolean" },
    isActive: { type: "boolean" },
    isDeleted: { type: "boolean" },
  },
};

paths["/api/languages"] = {
  get: operation({
    tag: "Languages",
    summary: "List active languages",
    responses: { 200: success("Records retrieved successfully", { type: "array", items: language }) },
  }),
  post: operation({
    tag: "Languages",
    summary: "Create a language",
    auth: true,
    body: jsonBody({
      type: "object",
      required: ["name", "code"],
      properties: {
        name: { type: "string" },
        code: { type: "string", example: "ur" },
        nativeName: { type: "string" },
        direction: { type: "string", enum: ["ltr", "rtl"] },
        isDefault: { type: "boolean" },
        isActive: { type: "boolean" },
      },
    }),
    responses: { 201: success("Language created successfully", language), 400: ref("BadRequest"), 401: ref("Unauthorized"), 409: ref("Conflict") },
  }),
};

paths["/api/admin/languages"] = paths["/api/languages"];
paths["/api/public/languages"] = {
  get: operation({
    tag: "Languages",
    summary: "List active languages",
    responses: paths["/api/languages"].get.responses,
  }),
};

paths["/api/translations/static/{languageCode}"] = {
  get: operation({
    tag: "Translations",
    summary: "Get static translations for a language",
    description: "Returns a key-value map. Missing values fall back to the default language. Per-language static rows override legacy dictionary values.",
    parameters: [{ name: "languageCode", in: "path", required: true, schema: { type: "string", example: "ar" } }],
    responses: {
      200: success("Translations retrieved successfully", {
        type: "object",
        properties: {
          language: { type: "string" },
          direction: { type: "string" },
          fallbackLanguage: { type: "string", nullable: true },
          translations: { type: "object", additionalProperties: { type: "string" } },
        },
      }),
    },
  }),
};

paths["/api/public/translations/static/{languageCode}"] = paths["/api/translations/static/{languageCode}"];
paths["/api/admin/translations/static/{languageCode}"] = paths["/api/translations/static/{languageCode}"];

paths["/api/translations/static"] = {
  post: operation({
    tag: "Translations",
    summary: "Create a static translation",
    auth: true,
    body: jsonBody({
      type: "object",
      required: ["languageCode", "key", "value"],
      properties: {
        languageCode: { type: "string", example: "ar" },
        key: { type: "string", example: "common.save" },
        value: { type: "string", example: "حفظ" },
      },
    }),
    responses: { 201: success("Translation created successfully"), 400: ref("BadRequest"), 401: ref("Unauthorized"), 409: ref("Conflict") },
  }),
};

paths["/api/translations/dynamic"] = {
  post: operation({
    tag: "Translations",
    summary: "Create a dynamic translation",
    description: "Stores one translated field for a CMS record. The default language stays on the content document.",
    auth: true,
    body: jsonBody({
      type: "object",
      required: ["languageCode", "entityType", "entityId", "field", "value"],
      properties: {
        languageCode: { type: "string", example: "ar" },
        entityType: { type: "string", example: "Section" },
        entityId: id,
        field: { type: "string", example: "content.title" },
        value: { type: "string", example: "خدماتنا" },
      },
    }),
    responses: { 201: success("Translation created successfully"), 400: ref("BadRequest"), 401: ref("Unauthorized"), 404: ref("NotFound"), 409: ref("Conflict") },
  }),
};

paths["/api/admin/translations/dynamic"] = {
  get: operation({
    tag: "Translations",
    summary: "List CMS records and their translation coverage",
    auth: true,
    parameters: [
      { name: "entityType", in: "query", required: true, schema: { type: "string", example: "Section" } },
      { name: "languageCode", in: "query", required: true, schema: { type: "string", example: "ar" } },
      { name: "missing", in: "query", schema: { type: "boolean" } },
      { name: "page", in: "query", schema: { type: "integer" } },
      { name: "limit", in: "query", schema: { type: "integer" } },
    ],
    responses: { 200: success("Records retrieved successfully"), 401: ref("Unauthorized") },
  }),
  post: paths["/api/translations/dynamic"].post,
};

const blogFilters = [
  { name: "search", in: "query", schema: { type: "string" } },
  { name: "category", in: "query", schema: { type: "string" }, description: "Category id or slug." },
  { name: "tag", in: "query", schema: { type: "string" } },
  { name: "featured", in: "query", schema: { type: "boolean" } },
];

paths["/api/public/blogs"] = {
  get: operation({
    tag: "Blogs",
    summary: "List published blogs",
    description: "Summaries omit the body. Status filters are ignored.",
    parameters: [...pageParameters, ...langQuery, ...blogFilters],
    responses: {
      200: success("Records retrieved successfully", { type: "object", properties: { items: { type: "array", items: publicBlog }, pagination } }),
      503: ref("Unavailable"),
    },
  }),
};

paths["/api/public/blogs/{slug}"] = {
  get: operation({
    tag: "Blogs",
    summary: "Get a published blog",
    parameters: [{ $ref: "#/components/parameters/Slug" }, ...langQuery],
    responses: { 200: success("Blog retrieved successfully", publicBlog), 404: ref("NotFound"), 503: ref("Unavailable") },
  }),
};

paths["/api/public/blogs/{slug}/related"] = {
  get: operation({
    tag: "Blogs",
    summary: "Related blogs",
    description: "Up to three other published posts in the same category.",
    parameters: [{ $ref: "#/components/parameters/Slug" }, ...langQuery],
    responses: { 200: success("Records retrieved successfully", { type: "array", items: publicBlog }), 404: ref("NotFound"), 503: ref("Unavailable") },
  }),
};

paths["/api/admin/blogs"] = {
  get: operation({
    tag: "Blogs",
    summary: "List blogs",
    auth: true,
    parameters: [...pageParameters, ...blogFilters, { name: "status", in: "query", schema: { $ref: "#/components/schemas/PublishStatus" } }],
    responses: {
      200: success("Records retrieved successfully", { type: "object", properties: { items: { type: "array", items: blog }, pagination } }),
      401: ref("Unauthorized"),
    },
  }),
  post: operation({
    tag: "Blogs",
    summary: "Create a blog",
    description: "English title is required. Arabic content is stored separately in `locales.ar`.",
    auth: true,
    body: jsonBody(blogInput),
    responses: { 201: success("Blog created successfully", blog), 400: ref("BadRequest"), 401: ref("Unauthorized"), 409: ref("Conflict") },
  }),
};

paths["/api/admin/blogs/slug/{slug}"] = {
  get: operation({
    tag: "Blogs",
    summary: "Get a blog by slug",
    auth: true,
    parameters: [{ $ref: "#/components/parameters/Slug" }],
    responses: { 200: success("Blog retrieved successfully", blog), 401: ref("Unauthorized"), 404: ref("NotFound") },
  }),
};

paths["/api/admin/blogs/{id}"] = {
  get: operation({
    tag: "Blogs",
    summary: "Get a blog",
    auth: true,
    parameters: [{ $ref: "#/components/parameters/Id" }],
    responses: { 200: success("Blog retrieved successfully", blog), 401: ref("Unauthorized"), 404: ref("NotFound") },
  }),
  put: operation({
    tag: "Blogs",
    summary: "Update a blog",
    description: "Locale objects merge by language, so an Arabic update keeps the English content.",
    auth: true,
    parameters: [{ $ref: "#/components/parameters/Id" }],
    body: jsonBody(blogInput),
    responses: { 200: success("Blog updated successfully", blog), 400: ref("BadRequest"), 401: ref("Unauthorized"), 404: ref("NotFound"), 409: ref("Conflict") },
  }),
  delete: operation({
    tag: "Blogs",
    summary: "Delete a blog",
    auth: true,
    parameters: [{ $ref: "#/components/parameters/Id" }],
    responses: { 200: success("Blog deleted successfully", { type: "object" }), 401: ref("Unauthorized"), 404: ref("NotFound") },
  }),
};

paths["/api/admin/blogs/{id}/publish"] = {
  post: operation({ tag: "Blogs", summary: "Publish a blog", auth: true, parameters: [{ $ref: "#/components/parameters/Id" }], responses: { 200: success("Blog published successfully", blog), 401: ref("Unauthorized"), 404: ref("NotFound") } }),
};

paths["/api/admin/blogs/{id}/unpublish"] = {
  post: operation({ tag: "Blogs", summary: "Unpublish a blog", auth: true, parameters: [{ $ref: "#/components/parameters/Id" }], responses: { 200: success("Blog unpublished successfully", blog), 401: ref("Unauthorized"), 404: ref("NotFound") } }),
};

paths["/api/admin/blogs/{id}/preview"] = {
  get: operation({
    tag: "Blogs",
    summary: "Preview a blog",
    auth: true,
    parameters: [{ $ref: "#/components/parameters/Id" }, ...langQuery],
    responses: { 200: success("Blog retrieved successfully", publicBlog), 401: ref("Unauthorized"), 404: ref("NotFound") },
  }),
};

paths["/api/public/blog-categories"] = {
  get: operation({
    tag: "Blog categories",
    summary: "List active categories",
    parameters: langQuery,
    responses: {
      200: success("Records retrieved successfully", { type: "object", properties: { language: { type: "string" }, direction: { type: "string" }, items: { type: "array", items: { type: "object", properties: { slug: { type: "string" }, name: { type: "string" }, description: { type: "string" } } } } } }),
      503: ref("Unavailable"),
    },
  }),
};

paths["/api/admin/blog-categories"] = {
  get: operation({
    tag: "Blog categories",
    summary: "List categories",
    auth: true,
    parameters: [...pageParameters, { name: "search", in: "query", schema: { type: "string" } }, { name: "status", in: "query", schema: { type: "string", enum: ["active", "inactive"] } }],
    responses: { 200: success("Records retrieved successfully", { type: "object", properties: { items: { type: "array", items: category }, pagination } }), 401: ref("Unauthorized") },
  }),
  post: operation({
    tag: "Blog categories",
    summary: "Create a category",
    auth: true,
    body: jsonBody({
      type: "object",
      required: ["name"],
      properties: {
        name: { type: "object", additionalProperties: { type: "string" }, example: { en: "Projects", ar: "المشاريع" } },
        slug,
        description: { type: "object", additionalProperties: { type: "string" } },
        status: { type: "string", enum: ["active", "inactive"] },
      },
    }),
    responses: { 201: success("Category created successfully", category), 400: ref("BadRequest"), 401: ref("Unauthorized"), 409: ref("Conflict") },
  }),
};

paths["/api/admin/blog-categories/{id}"] = {
  get: operation({ tag: "Blog categories", summary: "Get a category", auth: true, parameters: [{ $ref: "#/components/parameters/Id" }], responses: { 200: success("Category retrieved successfully", category), 401: ref("Unauthorized"), 404: ref("NotFound") } }),
  put: operation({
    tag: "Blog categories",
    summary: "Update a category",
    auth: true,
    parameters: [{ $ref: "#/components/parameters/Id" }],
    body: jsonBody({ type: "object", properties: { name: { type: "object", additionalProperties: { type: "string" } }, slug, description: { type: "object", additionalProperties: { type: "string" } }, status: { type: "string", enum: ["active", "inactive"] } } }),
    responses: { 200: success("Category updated successfully", category), 401: ref("Unauthorized"), 404: ref("NotFound"), 409: ref("Conflict") },
  }),
  delete: operation({
    tag: "Blog categories",
    summary: "Delete a category",
    auth: true,
    parameters: [{ $ref: "#/components/parameters/Id" }, { $ref: "#/components/parameters/Force" }],
    responses: { 200: success("Category deleted successfully", category), 401: ref("Unauthorized"), 404: ref("NotFound"), 409: ref("Conflict") },
  }),
};

paths["/api/admin/media"] = {
  get: operation({
    tag: "Media",
    summary: "List media",
    auth: true,
    parameters: [...pageParameters, { name: "search", in: "query", schema: { type: "string" } }, { name: "folder", in: "query", schema: { type: "string" } }, { name: "mimeType", in: "query", schema: { type: "string" } }],
    responses: { 200: success("Records retrieved successfully", { type: "object", properties: { items: { type: "array", items: media }, pagination } }), 401: ref("Unauthorized") },
  }),
  post: operation({
    tag: "Media",
    summary: "Upload media",
    description: "Images, PDF, text, CSV, DOC, and DOCX up to 10MB. Requires Cloudinary.",
    auth: true,
    body: {
      required: true,
      content: {
        "multipart/form-data": {
          schema: {
            type: "object",
            required: ["file"],
            properties: {
              file: { type: "string", format: "binary" },
              folder: { type: "string", example: "general" },
              altText: { type: "string" },
            },
          },
        },
      },
    },
    responses: { 201: success("Media uploaded successfully", media), 400: ref("BadRequest"), 401: ref("Unauthorized"), 500: ref("ServerError"), 502: ref("BadGateway") },
  }),
};

paths["/api/admin/media/folders"] = {
  get: operation({ tag: "Media", summary: "List media folders", auth: true, responses: { 200: success("Folders retrieved successfully", { type: "array", items: { type: "string" } }), 401: ref("Unauthorized") } }),
};

paths["/api/admin/media/{id}"] = {
  get: operation({ tag: "Media", summary: "Get a media file", auth: true, parameters: [{ $ref: "#/components/parameters/Id" }], responses: { 200: success("Media retrieved successfully", media), 401: ref("Unauthorized"), 404: ref("NotFound") } }),
  patch: operation({
    tag: "Media",
    summary: "Update media details",
    auth: true,
    parameters: [{ $ref: "#/components/parameters/Id" }],
    body: jsonBody({ type: "object", properties: { altText: { type: "string" }, folder: { type: "string" } } }),
    responses: { 200: success("Media updated successfully", media), 401: ref("Unauthorized"), 404: ref("NotFound") },
  }),
  delete: operation({
    tag: "Media",
    summary: "Delete media",
    description: "Published pages, blogs, and settings that still reference the file block deletion until `force=true`.",
    auth: true,
    parameters: [{ $ref: "#/components/parameters/Id" }, { $ref: "#/components/parameters/Force" }],
    responses: { 200: success("Media deleted successfully", media), 401: ref("Unauthorized"), 404: ref("NotFound"), 409: ref("Conflict") },
  }),
};

paths["/api/public/contact"] = {
  post: operation({
    tag: "Contact",
    summary: "Submit the contact form",
    description: "Limited to 8 requests per 15 minutes per IP. A non-empty `company` field is a honeypot and is discarded.",
    body: jsonBody({
      type: "object",
      required: ["name", "email", "message"],
      properties: {
        name: { type: "string", minLength: 2, maxLength: 120 },
        email: { type: "string", format: "email" },
        phone: { type: "string" },
        subject: { type: "string" },
        message: { type: "string", minLength: 5, maxLength: 5000 },
        company: { type: "string", description: "Honeypot. Leave empty." },
      },
    }),
    responses: {
      201: success("Message sent successfully", { type: "object", properties: { accepted: { type: "boolean" }, id } }),
      400: ref("BadRequest"),
      429: ref("TooManyRequests"),
      503: ref("Unavailable"),
    },
  }),
};

paths["/api/admin/contact"] = {
  get: operation({
    tag: "Contact",
    summary: "List contact submissions",
    auth: true,
    parameters: [...pageParameters, { name: "status", in: "query", schema: { type: "string", enum: ["new", "read", "replied", "archived"] } }, { name: "search", in: "query", schema: { type: "string" } }],
    responses: { 200: success("Records retrieved successfully", { type: "object", properties: { items: { type: "array", items: contact }, pagination } }), 401: ref("Unauthorized") },
  }),
};

paths["/api/admin/contact/{id}"] = {
  get: operation({ tag: "Contact", summary: "Get a contact submission", auth: true, parameters: [{ $ref: "#/components/parameters/Id" }], responses: { 200: success("Contact submission retrieved successfully", contact), 401: ref("Unauthorized"), 404: ref("NotFound") } }),
  patch: operation({
    tag: "Contact",
    summary: "Update contact status",
    auth: true,
    parameters: [{ $ref: "#/components/parameters/Id" }],
    body: jsonBody({ type: "object", required: ["status"], properties: { status: { type: "string", enum: ["new", "read", "replied", "archived"] } } }),
    responses: { 200: success("Contact submission updated successfully", contact), 401: ref("Unauthorized"), 404: ref("NotFound") },
  }),
  delete: operation({ tag: "Contact", summary: "Delete a contact submission", auth: true, parameters: [{ $ref: "#/components/parameters/Id" }], responses: { 200: success("Contact submission deleted successfully", contact), 401: ref("Unauthorized"), 404: ref("NotFound") } }),
};

paths["/api/public/settings"] = {
  get: operation({
    tag: "Settings",
    summary: "Public website settings",
    description: "Translation references are resolved. This endpoint stays available while maintenance mode is on.",
    parameters: langQuery,
    responses: { 200: success("Settings retrieved successfully", settings), 400: ref("BadRequest") },
  }),
};

paths["/api/admin/settings"] = {
  get: operation({
    tag: "Settings",
    summary: "Get stored settings",
    description: "Returns translation references without resolving them.",
    auth: true,
    responses: { 200: success("Settings retrieved successfully", settings), 401: ref("Unauthorized") },
  }),
  put: operation({
    tag: "Settings",
    summary: "Update settings",
    description: "Only fields included in the body change. `supportedLanguages` must include `en`.",
    auth: true,
    body: jsonBody(settings),
    responses: { 200: success("Settings updated successfully", settings), 400: ref("BadRequest"), 401: ref("Unauthorized") },
  }),
};

module.exports = {
  openapi: "3.0.3",
  info: {
    title: "Construction Site CMS API",
    version: "1.0.0",
    description: [
      "Website CMS for pages, reusable sections, translations, blogs, media, contact, and settings.",
      "",
      "Authenticate admin requests with `Authorization: Bearer <token>` from `POST /api/auth/login`.",
      "",
      "Translation references use `{ \"$t\": \"home.hero.title\" }`. Public pages and blogs resolve those references, then apply dynamic translations, and fall back to the default language. Plain strings, URLs, and image paths are never treated as keys.",
    ].join("\n"),
  },
  servers: [{ url: "/", description: "Current server" }],
  tags: [
    { name: "Health" },
    { name: "Auth" },
    { name: "Uploads", description: "Cloudinary image uploads." },
    { name: "Pages" },
    { name: "Sections" },
    { name: "Translations" },
    { name: "Languages" },
    { name: "Blogs" },
    { name: "Blog categories" },
    { name: "Media" },
    { name: "Contact" },
    { name: "Settings" },
  ],
  "x-tagGroups": [
    { name: "System", tags: ["Health", "Auth"] },
    { name: "Website", tags: ["Pages", "Sections", "Translations", "Languages", "Settings", "Uploads"] },
    { name: "Blog", tags: ["Blogs", "Blog categories"] },
    { name: "Library", tags: ["Media", "Contact"] },
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: "http",
        scheme: "bearer",
        bearerFormat: "JWT",
      },
    },
    parameters: {
      Id: { name: "id", in: "path", required: true, schema: id },
      Slug: { name: "slug", in: "path", required: true, schema: slug },
      TranslationKey: { name: "key", in: "path", required: true, schema: { type: "string", example: "home.hero.title" } },
      Page: { name: "page", in: "query", schema: { type: "integer", minimum: 1, default: 1 } },
      Limit: { name: "limit", in: "query", schema: { type: "integer", minimum: 1, maximum: 100, default: 10 } },
      Lang: {
        name: "lang",
        in: "query",
        description: "Language code. Built-in languages are `en` and `ar`. The code must be enabled in website settings.",
        schema: { type: "string", example: "en" },
      },
      Force: {
        name: "force",
        in: "query",
        description: "Delete even when the record is still referenced.",
        schema: { type: "boolean", default: false },
      },
    },
    schemas: {
      PageType: { type: "string", enum: ["home", "about", "services", "contact", "blogs", "faq", "privacy", "terms", "custom"] },
      PublishStatus: { type: "string", enum: ["draft", "published", "archived"] },
      SectionType: {
        type: "string",
        enum: ["header", "hero", "about", "services", "features", "statistics", "testimonials", "team", "gallery", "pricing", "faq", "contact", "cta", "partners", "footer", "projects", "process", "why-us", "custom"],
      },
    },
    responses: {
      BadRequest: { description: "Validation failed", content: { "application/json": { schema: { type: "object", properties: { status: { type: "boolean", example: false }, message: { type: "string" }, data: { nullable: true }, errors: { type: "array", items: { type: "object", properties: { field: { type: "string" }, message: { type: "string" } } } } } } } } },
      Unauthorized: { description: "Authentication is required", content: { "application/json": { schema: { type: "object", properties: { status: { type: "boolean", example: false }, message: { type: "string", example: "Authentication is required" }, data: { nullable: true, example: null } } } } } },
      NotFound: { description: "Record or route not found", content: { "application/json": { schema: { type: "object", properties: { status: { type: "boolean", example: false }, message: { type: "string" }, data: { nullable: true, example: null } } } } } },
      Conflict: { description: "Duplicate slug, key, or a record that is still in use", content: { "application/json": { schema: { type: "object", properties: { status: { type: "boolean", example: false }, message: { type: "string" }, data: { nullable: true, example: null } } } } } },
      TooManyRequests: { description: "Rate limit exceeded", content: { "application/json": { schema: { type: "object", properties: { status: { type: "boolean", example: false }, message: { type: "string", example: "Too many requests" }, data: { nullable: true, example: null } } } } } },
      Unavailable: { description: "Maintenance mode or the database is unavailable", content: { "application/json": { schema: { type: "object", properties: { status: { type: "boolean", example: false }, message: { type: "string" }, data: { nullable: true } } } } } },
      ServerError: { description: "Server configuration error", content: { "application/json": { schema: { type: "object", properties: { status: { type: "boolean", example: false }, message: { type: "string", example: "Cloudinary is not configured" }, data: { nullable: true, example: null } } } } } },
      BadGateway: { description: "Cloudinary rejected the request", content: { "application/json": { schema: { type: "object", properties: { status: { type: "boolean", example: false }, message: { type: "string", example: "Cloudinary request failed" }, data: { nullable: true, example: null } } } } } },
    },
  },
  paths,
};
