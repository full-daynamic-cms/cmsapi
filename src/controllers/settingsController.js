const asyncHandler = require("../utils/asyncHandler");
const { sendSuccess } = require("../utils/apiResponse");
const settingsService = require("../services/settingsService");

const getSettings = asyncHandler(async (req, res) => {
  const settings = await settingsService.getAdminSettings();
  return sendSuccess(res, 200, "Settings retrieved successfully", settings);
});

const updateSettings = asyncHandler(async (req, res) => {
  const settings = await settingsService.updateSettings(req.validated, req.user._id);
  return sendSuccess(res, 200, "Settings updated successfully", settings);
});

const getPublicSettings = asyncHandler(async (req, res) => {
  const settings = await settingsService.getPublicSettings(req.validated.lang);
  return sendSuccess(res, 200, "Settings retrieved successfully", settings);
});

module.exports = {
  getSettings,
  updateSettings,
  getPublicSettings,
};
