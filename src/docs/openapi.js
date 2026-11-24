const model = {
  name: "model",
  in: "path",
  required: true,
  schema: {
    type: "string",
    enum: ["page", "section", "blog", "blog-category", "translation", "language", "media", "contact", "settings"],
  },
  description: "Record type. The same routes serve every model.",
};

const envelope = (description, data) => ({
  description,
  content: {
    "application/json": {
      schema: {
        type: "object",
        properties: {
          status: { type: "boolean", example: true },
          message: { type: "string" },
          data,
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

module.exports = {
  openapi: "3.0.3",
  info: {
    title: "Construction Site CMS API",
    version: "1.0.0",
    description: [
      "Four content routes serve every model.",
      "",
      "`GET /api/public/{model}` reads published content. Pass `slug`, `lang`, `key`, or list filters in the query.",
      "`POST /api/public/contact` is the only public write.",
      "`GET /api/admin/{model}` reads the stored records. Pass `id`, `slug`, or `view`.",
      "`PUT /api/admin/{model}` creates, updates, publishes, reorders, and deletes. The body field `action` selects the operation. Omit it to create, or send `id` to update.",
      "",
      "Models: `page`, `section`, `blog`, `blog-category`, `translation`, `language`, `media`, `contact`, `settings`.",
      "Translation `kind` is `dictionary`, `static`, or `dynamic`. It is inferred when omitted.",
      "Admin reads use `view=preview`, `view=related`, `view=missing`, `view=unused`, `view=export`, or `view=folders`.",
    ].join("\n"),
  },
  servers: [{ url: "/", description: "Current server" }],
  tags: [
    { name: "Public" },
    { name: "Admin" },
    { name: "Auth" },
    { name: "Uploads" },
    { name: "Health" },
  ],
  components: {
    securitySchemes: {
      bearerAuth: { type: "http", scheme: "bearer", bearerFormat: "JWT" },
    },
  },
  paths: {
    "/api/health": {
      get: {
        tags: ["Health"],
        summary: "Health check",
        responses: { 200: envelope("Server is running", { type: "object" }) },
      },
    },
    "/api/auth/register": {
      post: {
        tags: ["Auth"],
        summary: "Register",
        requestBody: { required: true, content: { "application/json": { schema: { type: "object" } } } },
        responses: { 201: envelope("Registered", { type: "object" }), 400: error("Validation failed", "Validation failed") },
      },
    },
    "/api/auth/login": {
      post: {
        tags: ["Auth"],
        summary: "Log in",
        requestBody: { required: true, content: { "application/json": { schema: { type: "object" } } } },
        responses: { 200: envelope("Logged in", { type: "object" }), 401: error("Invalid credentials", "Invalid email or password") },
      },
    },
    "/api/auth/me": {
      get: {
        tags: ["Auth"],
        summary: "Current user",
        security: [{ bearerAuth: [] }],
        responses: { 200: envelope("Profile", { type: "object" }), 401: error("Unauthorized", "Authentication is required") },
      },
    },
    "/api/public/{model}": {
      get: {
        tags: ["Public"],
        summary: "Read any public model",
        parameters: [
          model,
          { name: "slug", in: "query", schema: { type: "string" }, description: "One page or blog." },
          { name: "lang", in: "query", schema: { type: "string", example: "ar" } },
          { name: "key", in: "query", schema: { type: "string" }, description: "One translation key." },
          { name: "code", in: "query", schema: { type: "string" }, description: "One language code." },
          { name: "view", in: "query", schema: { type: "string", enum: ["related"] } },
          { name: "page", in: "query", schema: { type: "integer" } },
          { name: "limit", in: "query", schema: { type: "integer" } },
        ],
        responses: {
          200: envelope("Record or list", { type: "object" }),
          404: error("Not found", "Page not found"),
        },
      },
      post: {
        tags: ["Public"],
        summary: "Create a contact message",
        description: "Only `contact` accepts a public write.",
        parameters: [model],
        requestBody: { required: true, content: { "application/json": { schema: { type: "object" } } } },
        responses: { 201: envelope("Message sent", { type: "object" }), 400: error("Validation failed", "Validation failed") },
      },
    },
    "/api/admin/{model}": {
      get: {
        tags: ["Admin"],
        summary: "Read any admin model",
        security: [{ bearerAuth: [] }],
        parameters: [
          model,
          { name: "id", in: "query", schema: { type: "string" } },
          { name: "slug", in: "query", schema: { type: "string" } },
          { name: "view", in: "query", schema: { type: "string", enum: ["preview", "missing", "unused", "export", "folders"] } },
          { name: "kind", in: "query", schema: { type: "string", enum: ["dictionary", "static", "dynamic"] } },
          { name: "lang", in: "query", schema: { type: "string" } },
          { name: "page", in: "query", schema: { type: "integer" } },
          { name: "limit", in: "query", schema: { type: "integer" } },
        ],
        responses: { 200: envelope("Record or list", { type: "object" }), 401: error("Unauthorized", "Authentication is required") },
      },
      put: {
        tags: ["Admin"],
        summary: "Create or update any model",
        description: "Omit `id` to create. Send `id` to update. `action` can be `publish`, `unpublish`, `delete`, `reorder`, `duplicate`, `status`, `sections`, `bulk`, or `import`.",
        security: [{ bearerAuth: [] }],
        parameters: [model],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                description: "Omit id to add a record. Send id to update that record. action selects publish, delete, reorder, and the other operations.",
                properties: {
                  id: { type: "string", description: "Query on GET. Body field on PUT. Present means update." },
                  action: { type: "string", enum: ["create", "update", "publish", "unpublish", "delete", "reorder", "duplicate", "status", "sections", "bulk", "import"] },
                  kind: { type: "string", enum: ["dictionary", "static", "dynamic"] },
                  force: { type: "boolean" },
                },
                additionalProperties: true,
              },
              examples: {
                addPage: {
                  summary: "Add a page",
                  value: { title: "Home", slug: "home", pageType: "home", status: "published", sections: [{ section: "665f0a2b9c0e4a0012ab34cd", order: 0 }] },
                },
                updatePage: {
                  summary: "Update a page",
                  value: { id: "665f0a2b9c0e4a0012ab34cd", title: "Welcome home" },
                },
                publishPage: {
                  summary: "Publish a page",
                  value: { action: "publish", id: "665f0a2b9c0e4a0012ab34cd" },
                },
                addSection: {
                  summary: "Add a section",
                  value: { name: "Hero", type: "hero", order: 1, content: { title: "Building spaces that last" } },
                },
                updateSection: {
                  summary: "Update a section",
                  value: { id: "665f0a2b9c0e4a0012ab34cd", type: "hero", content: { title: "Spaces that last" } },
                },
                addLanguage: {
                  summary: "Add a language",
                  value: { name: "Urdu", code: "ur", nativeName: "اردو" },
                },
                updateLanguage: {
                  summary: "Update a language",
                  value: { id: "665f0a2b9c0e4a0012ab34cd", nativeName: "اردو" },
                },
                addDynamicTranslation: {
                  summary: "Add a section translation",
                  value: { languageCode: "ar", entityType: "Section", entityId: "665f0a2b9c0e4a0012ab34cd", field: "content.title", value: "نبني مساحات تدوم" },
                },
                updateDynamicTranslation: {
                  summary: "Update a translation",
                  value: { id: "665f0a2b9c0e4a0012ab34cd", kind: "dynamic", value: "مساحات تدوم" },
                },
                addStaticTranslation: {
                  summary: "Add an interface word",
                  value: { languageCode: "ar", key: "common.menu", value: "القائمة" },
                },
                updateSettings: {
                  summary: "Update settings",
                  value: { websiteName: "Northline Builders", defaultLanguage: "en", supportedLanguages: ["en", "ar"] },
                },
              },
            },
            "multipart/form-data": {
              schema: { type: "object", properties: { file: { type: "string", format: "binary" } } },
            },
          },
        },
        responses: {
          200: envelope("Updated", { type: "object" }),
          201: envelope("Created", { type: "object" }),
          400: error("Validation failed", "Validation failed"),
          401: error("Unauthorized", "Authentication is required"),
          409: error("Conflict", "Slug already exists"),
        },
      },
    },
    "/api/uploads": {
      post: {
        tags: ["Uploads"],
        summary: "Upload an image",
        security: [{ bearerAuth: [] }],
        responses: { 201: envelope("Uploaded", { type: "object" }) },
      },
      delete: {
        tags: ["Uploads"],
        summary: "Delete an uploaded image",
        security: [{ bearerAuth: [] }],
        responses: { 200: envelope("Deleted", { type: "object" }) },
      },
    },
  },
};
