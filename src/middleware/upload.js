const multer = require("multer");
const ApiError = require("../utils/ApiError");
const { MEDIA_MIME_TYPES, MEDIA_MAX_BYTES } = require("../config/cms");

const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif", "image/avif"]);

const fileFilter = (req, file, callback) => {
  if (!ALLOWED_TYPES.has(file.mimetype)) {
    callback(new ApiError(400, "Only JPEG, PNG, WEBP, GIF, and AVIF images can be uploaded"));
    return;
  }

  callback(null, true);
};

const createUploader = (files) =>
  multer({
    storage: multer.memoryStorage(),
    limits: {
      fileSize: 5 * 1024 * 1024,
      files,
    },
    fileFilter,
  });

const handleUpload = (
  middleware,
  { sizeMessage = "Image must be 5MB or smaller", invalidMessage = "Image upload is invalid" } = {}
) => (req, res, next) => {
  middleware(req, res, (error) => {
    if (!error) {
      next();
      return;
    }

    if (error instanceof ApiError) {
      next(error);
      return;
    }

    if (error instanceof multer.MulterError) {
      const message = error.code === "LIMIT_FILE_SIZE" ? sizeMessage : invalidMessage;
      next(new ApiError(400, message));
      return;
    }

    next(error);
  });
};

const mediaFileFilter = (req, file, callback) => {
  if (!MEDIA_MIME_TYPES.has(file.mimetype)) {
    callback(new ApiError(400, "This file type is not supported"));
    return;
  }

  callback(null, true);
};

const uploadImage = handleUpload(createUploader(1).single("image"));
const uploadMediaFile = handleUpload(
  multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: MEDIA_MAX_BYTES, files: 1 },
    fileFilter: mediaFileFilter,
  }).single("file"),
  { sizeMessage: "File must be 10MB or smaller", invalidMessage: "File upload is invalid" }
);

module.exports = { uploadImage, uploadMediaFile };
