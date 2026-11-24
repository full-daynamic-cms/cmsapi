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
    pageType: { type: "string", enum: ["home", "about", "services", "contact", "faq", "privacy", "terms", "custom"], example: "home" },
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

const sectionOf = (name, type, order, content, extra = {}) => ({
  summary: name,
  value: { name, type, order, status: "active", content, ...extra },
});

const sectionExamples = {
  hero: sectionOf("Hero", "hero", 1, {
    title: "Building spaces that last",
    subtitle: "Commercial and residential construction",
    description: "Disciplined construction for offices, homes, and mixed-use developments.",
    image: "",
    button: { text: "Start a project", link: "#contact" },
  }),
  services: sectionOf("Services", "services", 3, {
    title: "Full-spectrum construction",
    description: "Professional construction services.",
    items: [
      { number: "01", title: "Commercial Construction", description: "Offices, retail, and mixed-use buildings.", image: "" },
      { number: "02", title: "Residential Construction", description: "Homes and apartment buildings.", image: "" },
    ],
  }),
  features: sectionOf("Features", "features", 4, {
    title: "What you get",
    description: "The parts of a typical build.",
    items: [
      { icon: "plan", title: "Documented scope", description: "Budgets and schedules are written down before work starts." },
      { icon: "site", title: "One site lead", description: "Trades and updates run through a single lead." },
    ],
  }),
  header: sectionOf("Header", "header", 0, {
    button: { text: "Get a Quote", link: "#contact" },
    items: [
      { label: "About", link: "#about" },
      { label: "Services", link: "#services" },
    ],
  }, { settings: { logo: "", phone: "+1 (000) 000-0000", email: "hello@example.com" } }),
  about: sectionOf("About", "about", 2, {
    title: "A builder focused on the long term",
    subtitle: "About the company",
    description: "We plan carefully and stay accountable through handover.",
    image: "",
    button: { text: "Our process", link: "#process" },
    items: [{ title: "Years", value: "25+", description: "Delivering commercial and residential work." }],
  }),
  statistics: sectionOf("Statistics", "statistics", 5, {
    title: "By the numbers",
    items: [{ label: "Projects", value: "180+" }],
  }),
  testimonials: sectionOf("Testimonials", "testimonials", 6, {
    title: "Client notes",
    items: [{ name: "Amira Shah", position: "Development Manager", company: "North Exchange", message: "Clear communication through handover.", image: "" }],
  }),
  team: sectionOf("Team", "team", 7, {
    title: "Site team",
    items: [{ name: "Lina Haddad", role: "Project lead", bio: "Runs commercial sites from first visit to handover.", image: "" }],
  }),
  gallery: sectionOf("Gallery", "gallery", 8, {
    title: "On site",
    description: "Recent work.",
    images: [{ image: "", alt: "Finished lobby", caption: "North Exchange lobby" }],
  }),
  pricing: sectionOf("Pricing", "pricing", 9, {
    title: "Ways to start",
    plans: [{ name: "Consult", price: "Fixed", period: "one visit", description: "A site walk and a written next step.", features: ["Site visit", "Written brief"], button: { text: "Book", link: "#contact" } }],
  }),
  faq: sectionOf("FAQ", "faq", 10, {
    title: "Questions",
    items: [{ question: "How long does a fit-out take?", answer: "A typical office fit-out is planned in weeks, then built to that schedule." }],
  }),
  contact: sectionOf("Contact", "contact", 11, {
    title: "Contact",
    description: "Call, email, or send a note about your project.",
    items: [
      { label: "Projects desk", value: "hello@example.com", type: "email" },
      { label: "Site line", value: "+1 (000) 000-0000", type: "phone" },
    ],
  }, { settings: { email: "hello@example.com", phone: "+1 (000) 000-0000", address: "100 Builder Street", hours: "Monday to Friday, 8:00 to 17:00" } }),
  cta: sectionOf("Call to action", "cta", 12, {
    title: "Planning a build?",
    subtitle: "Tell us about the site",
    description: "Share the location, timeline, and what you want built.",
    button: { text: "Request a consultation", link: "#contact" },
  }),
  partners: sectionOf("Partners", "partners", 13, {
    title: "Partners",
    items: [{ name: "North Exchange", logo: "", link: "https://example.com" }],
  }),
  footer: sectionOf("Footer", "footer", 14, {
    description: "Commercial and residential construction.",
    items: [
      { group: "Explore", label: "Services", link: "#services" },
      { group: "Company", label: "Contact", link: "#contact" },
    ],
  }, { settings: { copyright: "All rights reserved." } }),
  projects: sectionOf("Projects", "projects", 15, {
    title: "Selected work",
    items: [{ title: "Harbor House", category: "Residential", description: "A four-storey residential building.", image: "", link: "" }],
  }),
  process: sectionOf("Process", "process", 16, {
    title: "How a project moves",
    items: [{ number: "01", title: "Consult", description: "Walk the site and confirm the brief." }],
  }),
  whyUs: sectionOf("Why us", "why-us", 17, {
    title: "Why teams hire us",
    items: [{ icon: "plan", title: "Documented scope", description: "Budgets and schedules are written down before work starts." }],
  }),
  custom: sectionOf("Custom", "custom", 18, {
    heading: "Anything the other types do not cover",
    notes: ["Free object", "Up to 100KB"],
  }),
};

const sectionBody = {
  type: "object",
  description: "Set type, then match content to that type. Use the Hero, Services, or Features example.",
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
    content: { type: "object" },
    settings: { type: "object" },
    sections: { type: "array", items: { type: "object" }, description: "Used with action reorder." },
  },
  example: sectionExamples.hero.value,
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
    entityType: { type: "string", enum: ["Page", "Section", "WebsiteSettings"], example: "Section" },
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
      "Each model has its own request body. Pick Page or Section for site content.",
      "",
      "The server address is still `/api/admin/page` or `/api/admin/section`. Leave `id` out of the body to add a record. Send `id` to update it.",
    ].join("\n"),
  },
  servers: [{ url: "/", description: "Current server" }],
  tags: [
    { name: "Page" },
    { name: "Section" },
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
    { name: "Content", tags: ["Page", "Section", "Translation", "Language", "Settings", "Media", "Contact"] },
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
      put: {
        ...adminWrite("Section", "Add or update a section", sectionBody),
        description: "Choose an example for the section type. Hero is one block. Services and features are a title plus a list of items. Send type again whenever content changes.",
        requestBody: {
          required: true,
          content: { "application/json": { schema: sectionBody, examples: sectionExamples } },
        },
      },
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
