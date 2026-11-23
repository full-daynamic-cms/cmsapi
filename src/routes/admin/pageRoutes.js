const express = require("express");
const controller = require("../../controllers/pageController");
const { validate } = require("../../middleware/validate");
const requireObjectId = require("../../middleware/requireObjectId");
const requireSlug = require("../../middleware/requireSlug");
const {
  validateCreatePage,
  validateUpdatePage,
  validatePageSections,
  validateListPages,
  validateLanguage,
} = require("../../validators/pageValidator");

const router = express.Router();

router.get("/", validate((req) => validateListPages(req.query)), controller.listPages);
router.post("/", validate((req) => validateCreatePage(req.body)), controller.createPage);
router.get("/slug/:slug", requireSlug(), controller.getPageBySlug);
router.put(
  "/:id/sections",
  requireObjectId(),
  validate((req) => validatePageSections(req.body)),
  controller.setSections
);
router.post("/:id/publish", requireObjectId(), controller.publishPage);
router.post("/:id/unpublish", requireObjectId(), controller.unpublishPage);
router.get("/:id/preview", requireObjectId(), validate((req) => validateLanguage(req.query)), controller.previewPage);
router.get("/:id", requireObjectId(), controller.getPage);
router.put("/:id", requireObjectId(), validate((req) => validateUpdatePage(req.body)), controller.updatePage);
router.delete("/:id", requireObjectId(), controller.deletePage);

module.exports = router;
