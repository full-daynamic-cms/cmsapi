const express = require("express");
const controller = require("../../controllers/mediaController");
const { uploadMediaFile } = require("../../middleware/upload");
const { validate } = require("../../middleware/validate");
const requireObjectId = require("../../middleware/requireObjectId");
const {
  validateListMedia,
  validateUpdateMedia,
  validateUploadFields,
  validateForce,
} = require("../../validators/mediaValidator");

const router = express.Router();

router.get("/folders", controller.listFolders);
router.get("/", validate((req) => validateListMedia(req.query)), controller.listMedia);
router.post(
  "/",
  uploadMediaFile,
  validate((req) => validateUploadFields(req.body || {})),
  controller.uploadMedia
);
router.get("/:id", requireObjectId(), controller.getMedia);
router.patch("/:id", requireObjectId(), validate((req) => validateUpdateMedia(req.body)), controller.updateMedia);
router.delete("/:id", requireObjectId(), validate((req) => validateForce(req.query)), controller.deleteMedia);

module.exports = router;
