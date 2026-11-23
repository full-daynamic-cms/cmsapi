const asyncHandler = require("../utils/asyncHandler");
const { sendSuccess } = require("../utils/apiResponse");
const languageService = require("../services/languageService");

const createLanguage = asyncHandler(async (req, res) => {
  const language = await languageService.createLanguage(req.validated);
  return sendSuccess(res, 201, "Language created successfully", language);
});

const listLanguages = asyncHandler(async (req, res) => {
  const activeOnly = req.user ? Boolean(req.validated?.activeOnly) : true;
  const includeDeleted = Boolean(req.user && req.validated?.includeDeleted);
  const languages = await languageService.listLanguages({ activeOnly, includeDeleted });
  return sendSuccess(res, 200, "Records retrieved successfully", languages);
});

const getLanguage = asyncHandler(async (req, res) => {
  const language = await languageService.getById(req.params.id, { includeInactive: Boolean(req.user) });
  return sendSuccess(res, 200, "Language retrieved successfully", language);
});

const getByCode = asyncHandler(async (req, res) => {
  const language = await languageService.getByCode(req.params.code || req.params.languageCode, {
    includeInactive: Boolean(req.user),
  });
  return sendSuccess(res, 200, "Language retrieved successfully", language);
});

const updateLanguage = asyncHandler(async (req, res) => {
  const language = await languageService.updateLanguage(req.params.id, req.validated);
  return sendSuccess(res, 200, "Language updated successfully", language);
});

const deleteLanguage = asyncHandler(async (req, res) => {
  const language = await languageService.deleteLanguage(req.params.id);
  return sendSuccess(res, 200, "Language deleted successfully", language);
});

module.exports = {
  createLanguage,
  listLanguages,
  getLanguage,
  getByCode,
  updateLanguage,
  deleteLanguage,
};
