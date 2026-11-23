const express = require("express");
const controller = require("../../controllers/translationController");
const { validate } = require("../../middleware/validate");
const requireObjectId = require("../../middleware/requireObjectId");
const requireTranslationKey = require("../../middleware/requireTranslationKey");
const {
  validateCreateTranslation,
  validateUpdateTranslation,
  validateBulkCreateTranslations,
  validateBulkUpdateTranslations,
  validateImportTranslations,
  validateListTranslations,
  validateLanguageQuery,
} = require("../../validators/translationValidator");

const router = express.Router();

router.get("/export", controller.exportTranslations);
router.get("/missing", validate((req) => validateLanguageQuery(req.query)), controller.missing);
router.get("/unused", controller.unused);
router.post("/import", validate((req) => validateImportTranslations(req.body)), controller.importTranslations);
router.post("/bulk", validate((req) => validateBulkCreateTranslations(req.body)), controller.bulkCreate);
router.put("/bulk", validate((req) => validateBulkUpdateTranslations(req.body)), controller.bulkUpdate);
router.get("/key/:key", requireTranslationKey, controller.getByKey);
router.get("/", validate((req) => validateListTranslations(req.query)), controller.listTranslations);
router.post("/", validate((req) => validateCreateTranslation(req.body)), controller.createTranslation);
router.get("/:id", requireObjectId(), controller.getTranslation);
router.put("/:id", requireObjectId(), validate((req) => validateUpdateTranslation(req.body)), controller.updateTranslation);
router.delete("/:id", requireObjectId(), controller.deleteTranslation);

module.exports = router;
