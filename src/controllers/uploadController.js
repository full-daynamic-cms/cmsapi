const asyncHandler = require("../utils/asyncHandler");
const ApiError = require("../utils/ApiError");
const { sendSuccess } = require("../utils/apiResponse");
const mediaService = require("../services/mediaService");

const SECTION_FOLDER = /^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/;

const uploadImage = asyncHandler(async (req, res) => {
  if (!req.file) {
    throw new ApiError(400, "Image file is required");
  }

  const sectionKey = typeof req.body.sectionKey === "string" ? req.body.sectionKey.trim().toLowerCase() : "";

  if (sectionKey && (sectionKey.length > 40 || !SECTION_FOLDER.test(sectionKey))) {
    throw new ApiError(400, "Invalid section key");
  }

  const image = await mediaService.uploadImage({
    buffer: req.file.buffer,
    sectionKey,
  });

  return sendSuccess(res, 201, "Image uploaded successfully", image);
});

const deleteImage = asyncHandler(async (req, res) => {
  const image = await mediaService.deleteImage(req.validated);
  return sendSuccess(res, 200, "Image deleted successfully", image);
});

module.exports = {
  uploadImage,
  deleteImage,
};
