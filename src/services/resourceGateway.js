const ApiError = require("../utils/ApiError");
const pageService = require("./pageService");
const sectionService = require("./sectionService");
const blogService = require("./blogService");
const blogCategoryService = require("./blogCategoryService");
const translationService = require("./translationService");
const contentTranslationService = require("./contentTranslationService");
const languageService = require("./languageService");
const settingsService = require("./settingsService");
const contactService = require("./contactService");
const mediaLibraryService = require("./mediaLibraryService");
const pageValidator = require("../validators/pageValidator");
const sectionValidator = require("../validators/sectionValidator");
const blogValidator = require("../validators/blogValidator");
const translationValidator = require("../validators/translationValidator");
const languageValidator = require("../validators/languageValidator");
const settingsValidator = require("../validators/settingsValidator");
const contactValidator = require("../validators/contactValidator");
const mediaValidator = require("../validators/mediaValidator");

const MODELS = Object.freeze({
  page: "page",
  pages: "page",
  section: "section",
  sections: "section",
  blog: "blog",
  blogs: "blog",
  "blog-category": "blog-category",
  "blog-categories": "blog-category",
  category: "blog-category",
  categories: "blog-category",
  translation: "translation",
  translations: "translation",
  language: "language",
  languages: "language",
  media: "media",
  contact: "contact",
  contacts: "contact",
  settings: "settings",
  setting: "settings",
});

const PUBLIC_MODELS = new Set(["page", "blog", "blog-category", "translation", "language", "settings"]);
const QUERY_CONTROL = new Set(["slug", "id", "view", "key", "code", "kind", "entityId", "action", "force"]);
const BODY_CONTROL = new Set(["action", "id", "kind", "force"]);

const ok = (status, message, data) => ({ status, message, data });

const canonicalModel = (model) => {
  const name = MODELS[String(model || "").trim().toLowerCase()];

  if (!name) {
    throw new ApiError(404, "Route not found");
  }

  return name;
};

const omit = (source, keys) => {
  const output = {};

  for (const [key, value] of Object.entries(source || {})) {
    if (!keys.has(key)) {
      output[key] = value;
    }
  }

  return output;
};

const langQuery = (query) => (query.lang === undefined ? {} : { lang: query.lang });

const requireId = (id) => {
  if (!id) {
    throw new ApiError(400, "Validation failed", [{ field: "id", message: "id is required" }]);
  }

  return id;
};

const isForce = (body, query) => body.force === true || body.force === "true" || query.force === true || query.force === "true";

const inferTranslationKind = (body, query = {}) => {
  const kind = body.kind || query.kind;

  if (kind === "static" || kind === "dynamic" || kind === "dictionary") {
    return kind;
  }

  if (body.entityType || body.entityId || body.field || query.entityType || query.entityId) {
    return "dynamic";
  }

  if (body.value !== undefined && body.translations === undefined && (body.languageCode || body.key)) {
    return "static";
  }

  if (Array.isArray(body.items) && body.items.some((item) => item && (item.entityId || item.field))) {
    return "dynamic";
  }

  if (Array.isArray(body.items) && body.items.some((item) => item && item.value !== undefined && item.translations === undefined)) {
    return "static";
  }

  return "dictionary";
};

const readPage = async (query, admin) => {
  if (admin && query.view === "preview") {
    const validated = pageValidator.validateLanguage(langQuery(query));
    return ok(200, "Page retrieved successfully", await pageService.previewPage(requireId(query.id), validated.lang));
  }

  if (!admin && query.slug) {
    pageValidator.validateLanguage(langQuery(query));
    return ok(200, "Page retrieved successfully", await pageService.getPublicPage(query.slug, query.lang));
  }

  if (admin && query.id) {
    return ok(200, "Page retrieved successfully", await pageService.getPageById(query.id));
  }

  if (admin && query.slug) {
    return ok(200, "Page retrieved successfully", await pageService.getPageBySlug(query.slug));
  }

  if (admin) {
    return ok(200, "Records retrieved successfully", await pageService.listPages(pageValidator.validateListPages(omit(query, QUERY_CONTROL))));
  }

  const validated = pageValidator.validatePublicPages(omit(query, QUERY_CONTROL));
  return ok(
    200,
    "Records retrieved successfully",
    await pageService.listPublicPages({
      page: validated.page,
      limit: validated.limit,
      requestedLanguage: validated.lang,
    })
  );
};

const readSection = async (query) => {
  if (query.id) {
    return ok(200, "Section retrieved successfully", await sectionService.getSectionById(query.id));
  }

  return ok(200, "Records retrieved successfully", await sectionService.listSections(sectionValidator.validateListSections(omit(query, QUERY_CONTROL))));
};

const readBlog = async (query, admin) => {
  if (admin && query.view === "preview") {
    const validated = pageValidator.validateLanguage(langQuery(query));
    return ok(200, "Blog retrieved successfully", await blogService.previewBlog(requireId(query.id), validated.lang));
  }

  if (!admin && query.slug && query.view === "related") {
    pageValidator.validateLanguage(langQuery(query));
    return ok(200, "Records retrieved successfully", await blogService.relatedBlogs(query.slug, query.lang));
  }

  if (!admin && query.slug) {
    pageValidator.validateLanguage(langQuery(query));
    return ok(200, "Blog retrieved successfully", await blogService.getPublicBlog(query.slug, query.lang));
  }

  if (admin && query.id) {
    return ok(200, "Blog retrieved successfully", await blogService.getBlog(query.id));
  }

  if (admin && query.slug) {
    return ok(200, "Blog retrieved successfully", await blogService.getBlogBySlug(query.slug));
  }

  if (admin) {
    return ok(200, "Records retrieved successfully", await blogService.listBlogs(blogValidator.validateListBlogs(omit(query, QUERY_CONTROL))));
  }

  return ok(200, "Records retrieved successfully", await blogService.listPublicBlogs(blogValidator.validatePublicBlogs(omit(query, QUERY_CONTROL))));
};

const readCategory = async (query, admin) => {
  if (admin && query.id) {
    return ok(200, "Category retrieved successfully", await blogCategoryService.getCategory(query.id));
  }

  if (admin) {
    return ok(200, "Records retrieved successfully", await blogCategoryService.listCategories(blogValidator.validateListCategories(omit(query, QUERY_CONTROL))));
  }

  pageValidator.validateLanguage(langQuery(query));
  return ok(200, "Records retrieved successfully", await blogCategoryService.listPublicCategories(query.lang));
};

const readTranslation = async (query, admin) => {
  if (query.key) {
    return ok(200, "Translation retrieved successfully", await translationService.getTranslationByKey(query.key, { activeOnly: !admin }));
  }

  if (admin && query.view === "export") {
    return ok(200, "Translations exported successfully", await translationService.exportTranslations());
  }

  if (admin && query.view === "missing") {
    const validated = translationValidator.validateLanguageQuery(langQuery(query));
    const { language } = await settingsService.resolveRequestedLanguage(validated.lang);
    return ok(200, "Missing translations retrieved successfully", await translationService.missingTranslations(language.code));
  }

  if (admin && query.view === "unused") {
    return ok(200, "Unused translations retrieved successfully", await translationService.unusedTranslations());
  }

  const kind = inferTranslationKind({}, query);

  if (admin && kind === "dynamic" && query.entityId) {
    return ok(200, "Translations retrieved successfully", await contentTranslationService.getEntityTranslations(query.entityType, query.entityId));
  }

  if (admin && kind === "dynamic") {
    return ok(200, "Records retrieved successfully", await contentTranslationService.listDynamicEntities(translationValidator.validateListDynamicTranslations(omit(query, QUERY_CONTROL))));
  }

  if (admin && kind === "static") {
    return ok(200, "Records retrieved successfully", await contentTranslationService.listStatic(translationValidator.validateListStaticTranslations(omit(query, QUERY_CONTROL))));
  }

  if (admin && query.id) {
    return ok(200, "Translation retrieved successfully", await translationService.getTranslationById(query.id));
  }

  if (admin) {
    return ok(200, "Records retrieved successfully", await translationService.listTranslations(translationValidator.validateListTranslations(omit(query, QUERY_CONTROL))));
  }

  const validated = translationValidator.validateLanguageQuery(langQuery(query));
  const { language } = await settingsService.resolveRequestedLanguage(validated.lang);
  return ok(200, "Translations retrieved successfully", await translationService.dictionaryForLanguage(language));
};

const readLanguage = async (query, admin) => {
  if (query.id) {
    return ok(200, "Language retrieved successfully", await languageService.getById(query.id, { includeInactive: admin }));
  }

  if (query.code) {
    return ok(200, "Language retrieved successfully", await languageService.getByCode(query.code, { includeInactive: admin }));
  }

  if (!admin) {
    return ok(200, "Records retrieved successfully", await languageService.listLanguages({ activeOnly: true }));
  }

  const validated = languageValidator.validateListLanguages(omit(query, QUERY_CONTROL));
  return ok(200, "Records retrieved successfully", await languageService.listLanguages(validated));
};

const readSettings = async (query, admin) => {
  if (admin) {
    return ok(200, "Settings retrieved successfully", await settingsService.getAdminSettings());
  }

  const validated = settingsValidator.validatePublicSettings(langQuery(query));
  return ok(200, "Settings retrieved successfully", await settingsService.getPublicSettings(validated.lang));
};

const readContact = async (query) => {
  if (query.id) {
    return ok(200, "Contact submission retrieved successfully", await contactService.getSubmission(query.id));
  }

  return ok(200, "Records retrieved successfully", await contactService.listSubmissions(contactValidator.validateListContacts(omit(query, QUERY_CONTROL))));
};

const readMedia = async (query) => {
  if (query.view === "folders") {
    return ok(200, "Folders retrieved successfully", await mediaLibraryService.listFolders());
  }

  if (query.id) {
    return ok(200, "Media retrieved successfully", await mediaLibraryService.getMedia(query.id));
  }

  return ok(200, "Records retrieved successfully", await mediaLibraryService.listMedia(mediaValidator.validateListMedia(omit(query, QUERY_CONTROL))));
};

const readPublic = async (modelName, query) => {
  const model = canonicalModel(modelName);

  if (!PUBLIC_MODELS.has(model)) {
    throw new ApiError(404, "Route not found");
  }

  if (model === "page") return readPage(query, false);
  if (model === "blog") return readBlog(query, false);
  if (model === "blog-category") return readCategory(query, false);
  if (model === "translation") return readTranslation(query, false);
  if (model === "language") return readLanguage(query, false);
  return readSettings(query, false);
};

const readAdmin = async (modelName, query) => {
  const model = canonicalModel(modelName);

  if (model === "page") return readPage(query, true);
  if (model === "section") return readSection(query);
  if (model === "blog") return readBlog(query, true);
  if (model === "blog-category") return readCategory(query, true);
  if (model === "translation") return readTranslation(query, true);
  if (model === "language") return readLanguage(query, true);
  if (model === "settings") return readSettings(query, true);
  if (model === "contact") return readContact(query);
  return readMedia(query);
};

const writePage = async (body, userId) => {
  const action = body.action || (body.id ? "update" : "create");
  const payload = omit(body, BODY_CONTROL);

  if (action === "publish") {
    return ok(200, "Page published successfully", await pageService.publishPage(requireId(body.id), userId));
  }

  if (action === "unpublish") {
    return ok(200, "Page unpublished successfully", await pageService.unpublishPage(requireId(body.id), userId));
  }

  if (action === "delete") {
    return ok(200, "Page deleted successfully", await pageService.deletePage(requireId(body.id)));
  }

  if (action === "sections") {
    const validated = pageValidator.validatePageSections(payload);
    return ok(200, "Page sections updated successfully", await pageService.setPageSections(requireId(body.id), validated.sections, userId));
  }

  if (action === "update") {
    const validated = pageValidator.validateUpdatePage(payload);
    return ok(200, "Page updated successfully", await pageService.updatePage(requireId(body.id), validated, userId));
  }

  if (action === "create") {
    const validated = pageValidator.validateCreatePage(payload);
    return ok(201, "Page created successfully", await pageService.createPage(validated, userId));
  }

  throw new ApiError(400, "Unknown action");
};

const writeSection = async (body, userId, query) => {
  const action = body.action || (body.id ? "update" : "create");
  const payload = omit(body, BODY_CONTROL);

  if (action === "delete") {
    return ok(200, "Section deleted successfully", await sectionService.deleteSection(requireId(body.id), { force: isForce(body, query) }));
  }

  if (action === "status") {
    const validated = sectionValidator.validateSectionStatus(payload);
    return ok(200, "Section updated successfully", await sectionService.setStatus(requireId(body.id), validated.status, userId));
  }

  if (action === "reorder") {
    const validated = sectionValidator.validateReorderSections(payload);
    return ok(200, "Sections reordered successfully", await sectionService.reorderSections(validated.sections, userId));
  }

  if (action === "duplicate") {
    const validated = sectionValidator.validateDuplicateSection(payload);
    return ok(201, "Section duplicated successfully", await sectionService.duplicateSection(requireId(body.id), validated, userId));
  }

  if (action === "update") {
    const validated = sectionValidator.validateUpdateSection(payload);
    return ok(200, "Section updated successfully", await sectionService.updateSection(requireId(body.id), validated, userId));
  }

  if (action === "create") {
    const validated = sectionValidator.validateCreateSection(payload);
    return ok(201, "Section created successfully", await sectionService.createSection(validated, userId));
  }

  throw new ApiError(400, "Unknown action");
};

const writeBlog = async (body, userId) => {
  const action = body.action || (body.id ? "update" : "create");
  const payload = omit(body, BODY_CONTROL);

  if (action === "publish") {
    return ok(200, "Blog published successfully", await blogService.publishBlog(requireId(body.id), userId));
  }

  if (action === "unpublish") {
    return ok(200, "Blog unpublished successfully", await blogService.unpublishBlog(requireId(body.id), userId));
  }

  if (action === "delete") {
    return ok(200, "Blog deleted successfully", await blogService.deleteBlog(requireId(body.id)));
  }

  if (action === "update") {
    const validated = blogValidator.validateUpdateBlog(payload);
    return ok(200, "Blog updated successfully", await blogService.updateBlog(requireId(body.id), validated, userId));
  }

  if (action === "create") {
    const validated = blogValidator.validateCreateBlog(payload);
    return ok(201, "Blog created successfully", await blogService.createBlog(validated, userId));
  }

  throw new ApiError(400, "Unknown action");
};

const writeCategory = async (body, userId, query) => {
  const action = body.action || (body.id ? "update" : "create");
  const payload = omit(body, BODY_CONTROL);

  if (action === "delete") {
    return ok(200, "Category deleted successfully", await blogCategoryService.deleteCategory(requireId(body.id), { force: isForce(body, query) }));
  }

  if (action === "update") {
    const validated = blogValidator.validateUpdateCategory(payload);
    return ok(200, "Category updated successfully", await blogCategoryService.updateCategory(requireId(body.id), validated, userId));
  }

  if (action === "create") {
    const validated = blogValidator.validateCreateCategory(payload);
    return ok(201, "Category created successfully", await blogCategoryService.createCategory(validated, userId));
  }

  throw new ApiError(400, "Unknown action");
};

const writeTranslation = async (body, userId) => {
  const action = body.action || (body.id ? "update" : body.items ? "bulk" : "create");
  const kind = inferTranslationKind(body);
  const payload = omit(body, BODY_CONTROL);

  if (action === "import") {
    const validated = translationValidator.validateImportTranslations(payload);
    return ok(200, "Translations imported successfully", await translationService.importTranslations(validated.items, validated.mode, userId));
  }

  if (action === "bulk") {
    if (kind === "static") {
      const validated = translationValidator.validateBulkStaticTranslations(payload);
      const data = await contentTranslationService.bulkStatic(validated.items, validated.mode, userId);
      return ok(validated.mode === "create" ? 201 : 200, "Translations saved successfully", data);
    }

    if (kind === "dynamic") {
      const validated = translationValidator.validateBulkDynamicTranslations(payload);
      const data = await contentTranslationService.bulkDynamic(validated.items, validated.mode, userId);
      return ok(validated.mode === "create" ? 201 : 200, "Translations saved successfully", data);
    }

    const validated = translationValidator.validateBulkCreateTranslations(payload);
    return ok(201, "Translations created successfully", await translationService.bulkCreate(validated.items, userId));
  }

  if (action === "delete") {
    requireId(body.id);

    if (kind === "static") {
      return ok(200, "Translation deleted successfully", await contentTranslationService.deleteStatic(body.id));
    }

    if (kind === "dynamic") {
      return ok(200, "Translation deleted successfully", await contentTranslationService.deleteDynamic(body.id));
    }

    return ok(200, "Translation deleted successfully", await translationService.deleteTranslation(body.id));
  }

  if (action === "update") {
    requireId(body.id);

    if (kind === "static") {
      const validated = translationValidator.validateUpdateStaticTranslation(payload);
      return ok(200, "Translation updated successfully", await contentTranslationService.updateStatic(body.id, validated, userId));
    }

    if (kind === "dynamic") {
      const validated = translationValidator.validateUpdateDynamicTranslation(payload);
      return ok(200, "Translation updated successfully", await contentTranslationService.updateDynamic(body.id, validated, userId));
    }

    const validated = translationValidator.validateUpdateTranslation(payload);
    return ok(200, "Translation updated successfully", await translationService.updateTranslation(body.id, validated, userId));
  }

  if (action === "create") {
    if (kind === "static") {
      const validated = translationValidator.validateCreateStaticTranslation(payload);
      return ok(201, "Translation created successfully", await contentTranslationService.createStatic(validated, userId));
    }

    if (kind === "dynamic") {
      const validated = translationValidator.validateCreateDynamicTranslation(payload);
      return ok(201, "Translation created successfully", await contentTranslationService.createDynamic(validated, userId));
    }

    const validated = translationValidator.validateCreateTranslation(payload);
    return ok(201, "Translation created successfully", await translationService.createTranslation(validated, userId));
  }

  throw new ApiError(400, "Unknown action");
};

const writeLanguage = async (body) => {
  const action = body.action || (body.id ? "update" : "create");
  const payload = omit(body, BODY_CONTROL);

  if (action === "delete") {
    return ok(200, "Language deleted successfully", await languageService.deleteLanguage(requireId(body.id)));
  }

  if (action === "update") {
    const validated = languageValidator.validateUpdateLanguage(payload);
    return ok(200, "Language updated successfully", await languageService.updateLanguage(requireId(body.id), validated));
  }

  if (action === "create") {
    const validated = languageValidator.validateCreateLanguage(payload);
    return ok(201, "Language created successfully", await languageService.createLanguage(validated));
  }

  throw new ApiError(400, "Unknown action");
};

const writeSettings = async (body, userId) => {
  const validated = settingsValidator.validateUpdateSettings(omit(body, BODY_CONTROL));
  return ok(200, "Settings updated successfully", await settingsService.updateSettings(validated, userId));
};

const writeContact = async (body) => {
  const action = body.action || (body.id ? "update" : "create");
  const payload = omit(body, BODY_CONTROL);

  if (action === "delete") {
    return ok(200, "Contact submission deleted successfully", await contactService.deleteSubmission(requireId(body.id)));
  }

  if (action === "update") {
    const validated = contactValidator.validateUpdateContact(payload);
    return ok(200, "Contact submission updated successfully", await contactService.updateSubmission(requireId(body.id), validated));
  }

  throw new ApiError(400, "Unknown action");
};

const writeMedia = async (body, userId, file, query) => {
  if (file) {
    const validated = mediaValidator.validateUploadFields(body);
    return ok(201, "Media uploaded successfully", await mediaLibraryService.uploadMedia({
      file,
      folder: validated.folder,
      altText: validated.altText,
      userId,
    }));
  }

  const action = body.action || (body.id ? "update" : "create");

  if (action === "delete") {
    return ok(200, "Media deleted successfully", await mediaLibraryService.deleteMedia(requireId(body.id), { force: isForce(body, query) }));
  }

  if (action === "update") {
    const validated = mediaValidator.validateUpdateMedia(omit(body, BODY_CONTROL));
    return ok(200, "Media updated successfully", await mediaLibraryService.updateMedia(requireId(body.id), validated));
  }

  throw new ApiError(400, "File is required");
};

const createContact = async (body) => {
  const validated = contactValidator.validateCreateContact(body);
  const submission = await contactService.createSubmission(validated);
  return ok(201, "Message sent successfully", {
    accepted: true,
    ...(submission.spam ? {} : { id: submission._id }),
  });
};

const writeAdmin = async (modelName, body, userId, file, query = {}) => {
  const model = canonicalModel(modelName);

  if (model === "page") return writePage(body, userId);
  if (model === "section") return writeSection(body, userId, query);
  if (model === "blog") return writeBlog(body, userId);
  if (model === "blog-category") return writeCategory(body, userId, query);
  if (model === "translation") return writeTranslation(body, userId);
  if (model === "language") return writeLanguage(body);
  if (model === "settings") return writeSettings(body, userId);
  if (model === "contact") return writeContact(body);
  return writeMedia(body || {}, userId, file, query);
};

const writePublic = async (modelName, body) => {
  const model = canonicalModel(modelName);

  if (model !== "contact") {
    throw new ApiError(404, "Route not found");
  }

  return createContact(body);
};

module.exports = {
  canonicalModel,
  readPublic,
  readAdmin,
  writeAdmin,
  writePublic,
};
