const id = "665f0a2b9c0e4a0012ab34cd";

const envelope = (description) => ({
  description,
  content: {
    "application/json": {
      schema: {
        type: "object",
        properties: {
          status: { type: "boolean", example: true },
          message: { type: "string" },
          data: { type: "object" },
        },
      },
    },
  },
});

const error = (description, example) => ({
  description,
  content: {
    "application/json": {
      schema: {
        type: "object",
        properties: {
          status: { type: "boolean", example: false },
          message: { type: "string", example },
          data: { nullable: true, example: null },
        },
      },
    },
  },
});

const query = (name, schema, description) => ({ name, in: "query", schema, description });

const jsonBody = (schema) => ({
  required: true,
  content: { "application/json": { schema } },
});

const saved = {
  200: envelope("Updated"),
  201: envelope("Created"),
  400: error("Validation failed", "Validation failed"),
  401: error("Unauthorized", "Authentication is required"),
  404: error("Not found", "Record not found"),
  409: error("Conflict", "Already exists"),
};

const read = (tag, summary, parameters) => ({
  tags: [tag],
  summary,
  parameters,
  responses: { 200: envelope("Retrieved"), 404: error("Not found", "Record not found") },
});

const adminRead = (tag, summary, parameters) => ({
  ...read(tag, summary, parameters),
  security: [{ bearerAuth: [] }],
  responses: { ...read(tag, summary, parameters).responses, 401: error("Unauthorized", "Authentication is required") },
});

const adminWrite = (tag, summary, schema) => ({
  tags: [tag],
  summary,
  description: "Leave `id` out to add a record. Send `id` to update that record.",
  security: [{ bearerAuth: [] }],
  requestBody: jsonBody(schema),
  responses: saved,
});

const pageBody = {
  type: "object",
  properties: {
    id: { type: "string", description: "Send this to update. Leave it out to add." },
    action: { type: "string", enum: ["publish", "unpublish", "delete", "sections"] },
    title: { type: "string", example: "Home" },
    slug: { type: "string", example: "home" },
    pageType: { type: "string", enum: ["home", "about", "services", "contact", "blogs", "faq", "privacy", "terms", "custom"], example: "home" },
    status: { type: "string", enum: ["draft", "published", "archived"], example: "published" },
    sections: {
      type: "array",
      items: {
        type: "object",
        properties: {
          section: { type: "string", example: id },
          order: { type: "integer", example: 0 },
        },
      },
    },
    seo: { type: "object", example: { en: { metaTitle: "Home", metaDescription: "Welcome" } } },
  },
  example: {
    title: "Home",
    slug: "home",
    pageType: "home",
    status: "published",
    sections: [{ section: id, order: 0 }],
  },
};

const sectionBody = {
  type: "object",
  properties: {
    id: { type: "string", description: "Send this to update. Leave it out to add." },
    action: { type: "string", enum: ["status", "reorder", "duplicate", "delete"] },
    force: { type: "boolean" },
    name: { type: "string", example: "Hero" },
    type: {
      type: "string",
      enum: ["header", "hero", "about", "services", "features", "statistics", "testimonials", "team", "gallery", "pricing", "faq", "contact", "cta", "partners", "footer", "projects", "process", "why-us", "custom"],
      example: "hero",
    },
    order: { type: "integer", example: 1 },
    status: { type: "string", enum: ["active", "inactive"], example: "active" },
    content: {
      type: "object",
      example: { title: "Building spaces that last", description: "Commercial and residential construction.", button: { text: "Start a project", link: "#contact" } },
    },
    settings: { type: "object" },
    sections: { type: "array", items: { type: "object" }, description: "Used with action reorder." },
  },
  example: {
    name: "Hero",
    type: "hero",
    order: 1,
    status: "active",
    content: { title: "Building spaces that last", description: "Commercial and residential construction." },
  },
};

const blogBody = {
  type: "object",
  properties: {
    id: { type: "string" },
    action: { type: "string", enum: ["publish", "unpublish", "delete"] },
    slug: { type: "string", example: "first-project" },
    category: { type: "string", example: "projects" },
    tags: { type: "array", items: { type: "string" }, example: ["construction"] },
    featured: { type: "boolean", example: true },
    status: { type: "string", enum: ["draft", "published", "archived"] },
    locales: {
      type: "object",
      example: {
        en: { title: "First project", excerpt: "A commercial build", content: "<p>English body</p>" },
        ar: { title: "المشروع الأول", excerpt: "بناء تجاري", content: "<p>النص العربي</p>" },
      },
    },
  },
  example: {
    slug: "first-project",
    category: "projects",
    tags: ["construction"],
    featured: true,
    locales: { en: { title: "First project", excerpt: "A commercial build", content: "<p>English body</p>" } },
  },
};

const categoryBody = {
  type: "object",
  properties: {
    id: { type: "string" },
    action: { type: "string", enum: ["delete"] },
    force: { type: "boolean" },
    name: { type: "object", example: { en: "Projects", ar: "المشاريع" } },
    slug: { type: "string", example: "projects" },
    description: { type: "object", example: { en: "Project stories" } },
    status: { type: "string", enum: ["active", "inactive"], example: "active" },
  },
  example: { name: { en: "Projects", ar: "المشاريع" }, slug: "projects", description: { en: "Project stories" }, status: "active" },
};

const translationBody = {
  type: "object",
  properties: {
    id: { type: "string", description: "Send this to update. Leave it out to add." },
    action: { type: "string", enum: ["bulk", "import", "delete"] },
    kind: { type: "string", enum: ["dictionary", "static", "dynamic"] },
    key: { type: "string", example: "home.hero.title" },
    translations: { type: "object", example: { en: "Welcome", ar: "مرحباً" } },
    category: { type: "string", example: "home" },
    description: { type: "string" },
    languageCode: { type: "string", example: "ar" },
    value: { type: "string", example: "نبني مساحات تدوم" },
    entityType: { type: "string", enum: ["Page", "Section", "Blog", "BlogCategory", "WebsiteSettings"], example: "Section" },
    entityId: { type: "string", example: id },
    field: { type: "string", example: "content.title" },
    mode: { type: "string", enum: ["create", "upsert"] },
    items: { type: "array", items: { type: "object" } },
  },
  example: {
    languageCode: "ar",
    entityType: "Section",
    entityId: id,
    field: "content.title",
    value: "نبني مساحات تدوم",
  },
};

const languageBody = {
  type: "object",
  properties: {
    id: { type: "string" },
    action: { type: "string", enum: ["delete"] },
    name: { type: "string", example: "Urdu" },
    code: { type: "string", example: "ur" },
    nativeName: { type: "string", example: "اردو" },
    direction: { type: "string", enum: ["ltr", "rtl"] },
    isActive: { type: "boolean" },
  },
  example: { name: "Urdu", code: "ur", nativeName: "اردو" },
};

const settingsBody = {
  type: "object",
  properties: {
    websiteName: { type: "string", example: "Northline Builders" },
    logo: { type: "string" },
    favicon: { type: "string" },
    defaultLanguage: { type: "string", example: "en" },
    supportedLanguages: { type: "array", items: { type: "string" }, example: ["en", "ar"] },
    contact: { type: "object", example: { email: "hello@example.com", phone: "+1 (000) 000-0000", address: "100 Builder Street" } },
    socialLinks: { type: "array", items: { type: "object" } },
    header: { type: "object" },
    footer: { type: "object" },
    defaultSeo: { type: "object" },
    maintenanceMode: { type: "boolean", example: false },
    maintenanceMessage: { type: "string" },
  },
  example: { websiteName: "Northline Builders", defaultLanguage: "en", supportedLanguages: ["en", "ar"], maintenanceMode: false },
};

const mediaBody = {
  type: "object",
  properties: {
    id: { type: "string" },
    action: { type: "string", enum: ["delete"] },
    force: { type: "boolean" },
    altText: { type: "string", example: "Site photo" },
    folder: { type: "string", example: "projects" },
  },
  example: { id, altText: "Site photo", folder: "projects" },
};

const contactBody = {
  type: "object",
  properties: {
    id: { type: "string" },
    action: { type: "string", enum: ["delete"] },
    status: { type: "string", enum: ["new", "read", "replied", "archived"], example: "read" },
  },
  example: { id, status: "read" },
};

const publicContactBody = {
  type: "object",
  required: ["name", "email", "message"],
  properties: {
    name: { type: "string", example: "Amina" },
    email: { type: "string", example: "amina@example.com" },
    phone: { type: "string", example: "0500000000" },
    subject: { type: "string", example: "Project" },
    message: { type: "string", example: "We need a new office." },
  },
  example: { name: "Amina", email: "amina@example.com", phone: "0500000000", subject: "Project", message: "We need a new office." },
};

const lang = query("lang", { type: "string", example: "ar" }, "Language code.");
const recordId = query("id", { type: "string", example: id }, "One stored record.");
const paging = [query("page", { type: "integer", example: 1 }), query("limit", { type: "integer", example: 10 })];

module.exports = {
  openapi: "3.0.3",
  info: {
    title: "Construction Site CMS API",
    version: "1.0.0",
    description: [
      "Each model has its own request body. Pick Page, Section, Blog, or another model in the sidebar.",
      "",
      "The server address is still `/api/admin/page` or `/api/admin/section`. Leave `id` out of the body to add a record. Send `id` to update it.",
    ].join("\n"),
  },
  servers: [{ url: "/", description: "Current server" }],
  tags: [
    { name: "Page" },
    { name: "Section" },
    { name: "Blog" },
    { name: "Blog category" },
    { name: "Translation" },
    { name: "Language" },
    { name: "Settings" },
    { name: "Media" },
    { name: "Contact" },
    { name: "Auth" },
    { name: "Uploads" },
    { name: "Health" },
  ],
  "x-tagGroups": [
    { name: "Content", tags: ["Page", "Section", "Blog", "Blog category", "Translation", "Language", "Settings", "Media", "Contact"] },
    { name: "System", tags: ["Auth", "Uploads", "Health"] },
  ],
  components: {
    securitySchemes: {
      bearerAuth: { type: "http", scheme: "bearer", bearerFormat: "JWT" },
    },
  },
  paths: {
    "/api/health": {
      get: { tags: ["Health"], summary: "Health check", responses: { 200: envelope("Server is running") } },
    },
    "/api/auth/register": {
      post: {
        tags: ["Auth"],
        summary: "Register",
        requestBody: jsonBody({
          type: "object",
          example: { name: "Site Admin", email: "admin@example.com", password: "password123" },
        }),
        responses: { 201: envelope("Registered"), 400: error("Validation failed", "Validation failed") },
      },
    },
    "/api/auth/login": {
      post: {
        tags: ["Auth"],
        summary: "Log in",
        requestBody: jsonBody({ type: "object", example: { email: "admin@example.com", password: "password123" } }),
        responses: { 200: envelope("Logged in"), 401: error("Invalid credentials", "Invalid email or password") },
      },
    },
    "/api/auth/me": {
      get: {
        tags: ["Auth"],
        summary: "Current user",
        security: [{ bearerAuth: [] }],
        responses: { 200: envelope("Profile"), 401: error("Unauthorized", "Authentication is required") },
      },
    },
    "/api/public/page": {
      get: read("Page", "Read a published page", [query("slug", { type: "string", example: "home" }), lang, ...paging]),
    },
    "/api/admin/page": {
      get: adminRead("Page", "Read a stored page", [recordId, query("slug", { type: "string", example: "home" }), query("view", { type: "string", enum: ["preview"] }), lang, query("status", { type: "string" }), query("search", { type: "string" }), ...paging]),
      put: adminWrite("Page", "Add or update a page", pageBody),
    },
    "/api/admin/section": {
      get: adminRead("Section", "Read a section", [recordId, query("type", { type: "string", example: "hero" }), query("status", { type: "string" }), query("search", { type: "string" }), ...paging]),
      put: adminWrite("Section", "Add or update a section", sectionBody),
    },
    "/api/public/blog": {
      get: read("Blog", "Read a published blog", [query("slug", { type: "string", example: "first-project" }), query("view", { type: "string", enum: ["related"] }), lang, query("category", { type: "string" }), query("featured", { type: "boolean" }), ...paging]),
    },
    "/api/admin/blog": {
      get: adminRead("Blog", "Read a stored blog", [recordId, query("slug", { type: "string" }), query("view", { type: "string", enum: ["preview"] }), lang, query("status", { type: "string" }), query("search", { type: "string" }), ...paging]),
      put: adminWrite("Blog", "Add or update a blog", blogBody),
    },
    "/api/public/blog-category": {
      get: read("Blog category", "Read published categories", [lang]),
    },
    "/api/admin/blog-category": {
      get: adminRead("Blog category", "Read a category", [recordId, query("search", { type: "string" }), query("status", { type: "string" }), ...paging]),
      put: adminWrite("Blog category", "Add or update a category", categoryBody),
    },
    "/api/public/translation": {
      get: read("Translation", "Read a translation bundle or one key", [lang, query("key", { type: "string", example: "home.hero.title" })]),
    },
    "/api/admin/translation": {
      get: adminRead("Translation", "Read translations", [
        recordId,
        query("key", { type: "string" }),
        query("kind", { type: "string", enum: ["dictionary", "static", "dynamic"] }),
        query("view", { type: "string", enum: ["missing", "unused", "export"] }),
        lang,
        query("languageCode", { type: "string", example: "ar" }),
        query("entityType", { type: "string", example: "Section" }),
        query("entityId", { type: "string" }),
        query("missing", { type: "boolean" }),
        ...paging,
      ]),
      put: adminWrite("Translation", "Add or update a translation", translationBody),
    },
    "/api/public/language": {
      get: read("Language", "Read languages", [query("code", { type: "string", example: "ar" })]),
    },
    "/api/admin/language": {
      get: adminRead("Language", "Read a stored language", [recordId, query("code", { type: "string", example: "ar" })]),
      put: adminWrite("Language", "Add or update a language", languageBody),
    },
    "/api/public/settings": {
      get: read("Settings", "Read public settings", [lang]),
    },
    "/api/admin/settings": {
      get: adminRead("Settings", "Read stored settings", []),
      put: adminWrite("Settings", "Update settings", settingsBody),
    },
    "/api/admin/media": {
      get: adminRead("Media", "Read media", [recordId, query("view", { type: "string", enum: ["folders"] }), query("folder", { type: "string" }), query("search", { type: "string" }), ...paging]),
      put: {
        ...adminWrite("Media", "Add or update media", mediaBody),
        description: "Send JSON to update `altText` or `folder`. Send multipart form data with a `file` field to add a file.",
        requestBody: {
          required: true,
          content: {
            "application/json": { schema: mediaBody },
            "multipart/form-data": {
              schema: {
                type: "object",
                properties: {
                  file: { type: "string", format: "binary" },
                  folder: { type: "string", example: "projects" },
                  altText: { type: "string", example: "Site photo" },
                },
              },
            },
          },
        },
      },
    },
    "/api/public/contact": {
      post: {
        tags: ["Contact"],
        summary: "Send a contact message",
        requestBody: jsonBody(publicContactBody),
        responses: { 201: envelope("Message sent"), 400: error("Validation failed", "Validation failed") },
      },
    },
    "/api/admin/contact": {
      get: adminRead("Contact", "Read contact messages", [recordId, query("status", { type: "string", example: "new" }), query("search", { type: "string" }), ...paging]),
      put: adminWrite("Contact", "Update a contact message", contactBody),
    },
    "/api/uploads": {
      post: {
        tags: ["Uploads"],
        summary: "Upload an image",
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "multipart/form-data": {
              schema: { type: "object", properties: { image: { type: "string", format: "binary" }, sectionKey: { type: "string", example: "hero" } } },
            },
          },
        },
        responses: { 201: envelope("Uploaded"), 401: error("Unauthorized", "Authentication is required") },
      },
      delete: {
        tags: ["Uploads"],
        summary: "Delete an uploaded image",
        security: [{ bearerAuth: [] }],
        requestBody: jsonBody({ type: "object", example: { publicId: "cms/hero/photo" } }),
        responses: { 200: envelope("Deleted"), 401: error("Unauthorized", "Authentication is required") },
      },
    },
  },
};
