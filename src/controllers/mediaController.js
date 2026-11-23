const asyncHandler = require("../utils/asyncHandler");
const ApiError = require("../utils/ApiError");
const { sendSuccess } = require("../utils/apiResponse");
const mediaLibraryService = require("../services/mediaLibraryService");

const uploadMedia = asyncHandler(async (req, res) => {
  if (!req.file) {
    throw new ApiError(400, "File is required");
  }

  const media = await mediaLibraryService.uploadMedia({
    file: req.file,
    folder: req.validated.folder,
    altText: req.validated.altText,
    userId: req.user._id,
  });
  return sendSuccess(res, 201, "Media uploaded successfully", media);
});

const listMedia = asyncHandler(async (req, res) => {
  const media = await mediaLibraryService.listMedia(req.validated);
  return sendSuccess(res, 200, "Records retrieved successfully", media);
});

const listFolders = asyncHandler(async (req, res) => {
  const folders = await mediaLibraryService.listFolders();
  return sendSuccess(res, 200, "Folders retrieved successfully", folders);
});

const getMedia = asyncHandler(async (req, res) => {
  const media = await mediaLibraryService.getMedia(req.params.id);
  return sendSuccess(res, 200, "Media retrieved successfully", media);
});

const updateMedia = asyncHandler(async (req, res) => {
  const media = await mediaLibraryService.updateMedia(req.params.id, req.validated);
  return sendSuccess(res, 200, "Media updated successfully", media);
});

const deleteMedia = asyncHandler(async (req, res) => {
  const media = await mediaLibraryService.deleteMedia(req.params.id, { force: req.validated.force });
  return sendSuccess(res, 200, "Media deleted successfully", media);
});

module.exports = {
  uploadMedia,
  listMedia,
  listFolders,
  getMedia,
  updateMedia,
  deleteMedia,
};
