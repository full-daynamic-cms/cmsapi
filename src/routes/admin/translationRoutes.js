const express = require("express");
const controller = require("../../controllers/translationController");
const { validate } = require("../../middleware/validate");
const requireObjectId = require("../../middleware/requireObjectId");
const requireTranslationKey = require("../../middleware/requireTranslationKey");
const requireLanguageCode = require("../../middleware/requireLanguageCode");
const {
  validateCreateTranslation,
  validateUpdateTranslation,
  validateBulkCreateTranslations,
  validateBulkUpdateTranslations,
  validateImportTranslations,
  validateListTranslations,
  validateLanguageQuery,
  validateCreateStaticTranslation,
  validateUpdateStaticTranslation,
  validateBulkStaticTranslations,
  validateListStaticTranslations,
  validateCreateDynamicTranslation,
  validateUpdateDynamicTranslation,
  validateBulkDynamicTranslations,
  validateListDynamicTranslations,
} = require("../../validators/translationValidator");

const router = express.Router();

router.get("/export", controller.exportTranslations);
router.get("/missing", validate((req) => validateLanguageQuery(req.query)), controller.missing);
router.get("/unused", controller.unused);
router.post("/import", validate((req) => validateImportTranslations(req.body)), controller.importTranslations);
router.post("/bulk", validate((req) => validateBulkCreateTranslations(req.body)), controller.bulkCreate);
router.put("/bulk", validate((req) => validateBulkUpdateTranslations(req.body)), controller.bulkUpdate);
router.get("/key/:key", requireTranslationKey, controller.getByKey);
router.get("/static", validate((req) => validateListStaticTranslations(req.query)), controller.listStatic);
router.post("/static/bulk", validate((req) => validateBulkStaticTranslations(req.body)), controller.bulkStatic);
router.post("/static", validate((req) => validateCreateStaticTranslation(req.body)), controller.createStatic);
router.get("/static/:languageCode", requireLanguageCode(), controller.bundle);
router.put(
  "/static/:id",
  requireObjectId(),
  validate((req) => validateUpdateStaticTranslation(req.body)),
  controller.updateStatic
);
router.delete("/static/:id", requireObjectId(), controller.deleteStatic);
router.get("/dynamic", validate((req) => validateListDynamicTranslations(req.query)), controller.listDynamic);
router.post("/dynamic/bulk", validate((req) => validateBulkDynamicTranslations(req.body)), controller.bulkDynamic);
router.post("/dynamic", validate((req) => validateCreateDynamicTranslation(req.body)), controller.createDynamic);
router.get("/dynamic/:entityType/:entityId", controller.getDynamicEntity);
router.put(
  "/dynamic/:id",
  requireObjectId(),
  validate((req) => validateUpdateDynamicTranslation(req.body)),
  controller.updateDynamic
);
router.delete("/dynamic/:id", requireObjectId(), controller.deleteDynamic);
router.get("/bundle/:languageCode", requireLanguageCode(), controller.bundle);
router.get("/", validate((req) => validateListTranslations(req.query)), controller.listTranslations);
router.post("/", validate((req) => validateCreateTranslation(req.body)), controller.createTranslation);
router.get("/:id", requireObjectId(), controller.getTranslation);
router.put("/:id", requireObjectId(), validate((req) => validateUpdateTranslation(req.body)), controller.updateTranslation);
router.delete("/:id", requireObjectId(), controller.deleteTranslation);

module.exports = router;
