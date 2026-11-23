const asyncHandler = require("../utils/asyncHandler");
const { sendSuccess } = require("../utils/apiResponse");
const translationService = require("../services/translationService");
const contentTranslationService = require("../services/contentTranslationService");
const settingsService = require("../services/settingsService");

const createTranslation = asyncHandler(async (req, res) => {
  const translation = await translationService.createTranslation(req.validated, req.user._id);
  return sendSuccess(res, 201, "Translation created successfully", translation);
});

const bulkCreate = asyncHandler(async (req, res) => {
  const translations = await translationService.bulkCreate(req.validated.items, req.user._id);
  return sendSuccess(res, 201, "Translations created successfully", translations);
});

const updateTranslation = asyncHandler(async (req, res) => {
  const translation = await translationService.updateTranslation(req.params.id, req.validated, req.user._id);
  return sendSuccess(res, 200, "Translation updated successfully", translation);
});

const bulkUpdate = asyncHandler(async (req, res) => {
  const translations = await translationService.bulkUpdate(req.validated.items, req.user._id);
  return sendSuccess(res, 200, "Translations updated successfully", translations);
});

const deleteTranslation = asyncHandler(async (req, res) => {
  const translation = await translationService.deleteTranslation(req.params.id);
  return sendSuccess(res, 200, "Translation deleted successfully", translation);
});

const getTranslation = asyncHandler(async (req, res) => {
  const translation = await translationService.getTranslationById(req.params.id);
  return sendSuccess(res, 200, "Translation retrieved successfully", translation);
});

const getByKey = asyncHandler(async (req, res) => {
  const translation = await translationService.getTranslationByKey(req.params.key, {
    activeOnly: !req.user,
  });
  return sendSuccess(res, 200, "Translation retrieved successfully", translation);
});

const listTranslations = asyncHandler(async (req, res) => {
  const translations = await translationService.listTranslations(req.validated);
  return sendSuccess(res, 200, "Records retrieved successfully", translations);
});

const dictionary = asyncHandler(async (req, res) => {
  const { language } = await settingsService.resolveRequestedLanguage(req.validated.lang);
  const data = await translationService.dictionaryForLanguage(language.code);
  return sendSuccess(res, 200, "Translations retrieved successfully", data);
});

const missing = asyncHandler(async (req, res) => {
  const { language } = await settingsService.resolveRequestedLanguage(req.validated.lang);
  const data = await translationService.missingTranslations(language.code);
  return sendSuccess(res, 200, "Missing translations retrieved successfully", data);
});

const unused = asyncHandler(async (req, res) => {
  const data = await translationService.unusedTranslations();
  return sendSuccess(res, 200, "Unused translations retrieved successfully", data);
});

const importTranslations = asyncHandler(async (req, res) => {
  const data = await translationService.importTranslations(req.validated.items, req.validated.mode, req.user._id);
  return sendSuccess(res, 200, "Translations imported successfully", data);
});

const exportTranslations = asyncHandler(async (req, res) => {
  const data = await translationService.exportTranslations();
  return sendSuccess(res, 200, "Translations exported successfully", data);
});

const bundle = asyncHandler(async (req, res) => {
  const code = req.params.languageCode || req.validated?.lang;
  const { language } = await settingsService.resolveRequestedLanguage(code);
  const data = await translationService.dictionaryForLanguage(language);
  return sendSuccess(res, 200, "Translations retrieved successfully", data);
});

const createStatic = asyncHandler(async (req, res) => {
  const translation = await contentTranslationService.createStatic(req.validated, req.user._id);
  return sendSuccess(res, 201, "Translation created successfully", translation);
});

const bulkStatic = asyncHandler(async (req, res) => {
  const result = await contentTranslationService.bulkStatic(req.validated.items, req.validated.mode, req.user._id);
  const created = req.validated.mode === "create";
  return sendSuccess(res, created ? 201 : 200, "Translations saved successfully", result);
});

const updateStatic = asyncHandler(async (req, res) => {
  const translation = await contentTranslationService.updateStatic(req.params.id, req.validated, req.user._id);
  return sendSuccess(res, 200, "Translation updated successfully", translation);
});

const deleteStatic = asyncHandler(async (req, res) => {
  const translation = await contentTranslationService.deleteStatic(req.params.id);
  return sendSuccess(res, 200, "Translation deleted successfully", translation);
});

const listStatic = asyncHandler(async (req, res) => {
  const translations = await contentTranslationService.listStatic(req.validated);
  return sendSuccess(res, 200, "Records retrieved successfully", translations);
});

const createDynamic = asyncHandler(async (req, res) => {
  const translation = await contentTranslationService.createDynamic(req.validated, req.user._id);
  return sendSuccess(res, 201, "Translation created successfully", translation);
});

const bulkDynamic = asyncHandler(async (req, res) => {
  const result = await contentTranslationService.bulkDynamic(req.validated.items, req.validated.mode, req.user._id);
  const created = req.validated.mode === "create";
  return sendSuccess(res, created ? 201 : 200, "Translations saved successfully", result);
});

const updateDynamic = asyncHandler(async (req, res) => {
  const translation = await contentTranslationService.updateDynamic(req.params.id, req.validated, req.user._id);
  return sendSuccess(res, 200, "Translation updated successfully", translation);
});

const deleteDynamic = asyncHandler(async (req, res) => {
  const translation = await contentTranslationService.deleteDynamic(req.params.id);
  return sendSuccess(res, 200, "Translation deleted successfully", translation);
});

const getDynamicEntity = asyncHandler(async (req, res) => {
  const translation = await contentTranslationService.getEntityTranslations(req.params.entityType, req.params.entityId);
  return sendSuccess(res, 200, "Translations retrieved successfully", translation);
});

const listDynamic = asyncHandler(async (req, res) => {
  const translations = await contentTranslationService.listDynamicEntities(req.validated);
  return sendSuccess(res, 200, "Records retrieved successfully", translations);
});

module.exports = {
  bundle,
  createStatic,
  bulkStatic,
  updateStatic,
  deleteStatic,
  listStatic,
  createDynamic,
  bulkDynamic,
  updateDynamic,
  deleteDynamic,
  getDynamicEntity,
  listDynamic,
  createTranslation,
  bulkCreate,
  updateTranslation,
  bulkUpdate,
  deleteTranslation,
  getTranslation,
  getByKey,
  listTranslations,
  dictionary,
  missing,
  unused,
  importTranslations,
  exportTranslations,
};
