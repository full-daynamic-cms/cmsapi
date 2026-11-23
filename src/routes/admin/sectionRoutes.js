const express = require("express");
const controller = require("../../controllers/sectionController");
const { validate } = require("../../middleware/validate");
const requireObjectId = require("../../middleware/requireObjectId");
const {
  validateCreateSection,
  validateUpdateSection,
  validateListSections,
  validateReorderSections,
  validateSectionStatus,
  validateDuplicateSection,
  validateForce,
} = require("../../validators/sectionValidator");

const router = express.Router();

router.get("/", validate((req) => validateListSections(req.query)), controller.listSections);
router.post("/", validate((req) => validateCreateSection(req.body)), controller.createSection);
router.patch("/reorder", validate((req) => validateReorderSections(req.body)), controller.reorderSections);
router.post(
  "/:id/duplicate",
  requireObjectId(),
  validate((req) => validateDuplicateSection(req.body || {})),
  controller.duplicateSection
);
router.patch(
  "/:id/status",
  requireObjectId(),
  validate((req) => validateSectionStatus(req.body || {})),
  controller.updateStatus
);
router.get("/:id", requireObjectId(), controller.getSection);
router.put("/:id", requireObjectId(), validate((req) => validateUpdateSection(req.body)), controller.updateSection);
router.delete("/:id", requireObjectId(), validate((req) => validateForce(req.query)), controller.deleteSection);

module.exports = router;
