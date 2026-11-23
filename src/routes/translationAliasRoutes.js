const express = require("express");
const requireAuth = require("../middleware/requireAuth");
const rateLimit = require("../middleware/rateLimit");
const { validate } = require("../middleware/validate");
const requireObjectId = require("../middleware/requireObjectId");
const requireTranslationKey = require("../middleware/requireTranslationKey");
const requireLanguageCode = require("../middleware/requireLanguageCode");
const controller = require("../controllers/translationController");
const languageService = require("../services/languageService");
const { LANGUAGE_PATTERN } = require("../config/cms");
const {
  validateCreateTranslation,
  validateUpdateTranslation,
  validateBulkCreateTranslations,
  validateBulkUpdateTranslations,
  validateImportTranslations,
  validateLanguageQuery,
  validateCreateStaticTranslation,
  validateUpdateStaticTranslation,
  validateBulkStaticTranslations,
  validateCreateDynamicTranslation,
  validateUpdateDynamicTranslation,
  validateBulkDynamicTranslations,
  validateListDynamicTranslations,
} = require("../validators/translationValidator");

const router = express.Router();

router.use(rateLimit({ windowMs: 60 * 1000, max: 300, name: "translations" }));

router.get("/export", requireAuth, controller.exportTranslations);
router.get("/missing", requireAuth, validate((req) => validateLanguageQuery(req.query)), controller.missing);
router.get("/unused", requireAuth, controller.unused);
router.post("/import", requireAuth, validate((req) => validateImportTranslations(req.body)), controller.importTranslations);
router.post("/bulk", requireAuth, validate((req) => validateBulkCreateTranslations(req.body)), controller.bulkCreate);
router.put("/bulk", requireAuth, validate((req) => validateBulkUpdateTranslations(req.body)), controller.bulkUpdate);
router.post("/static/bulk", requireAuth, validate((req) => validateBulkStaticTranslations(req.body)), controller.bulkStatic);
router.post("/static", requireAuth, validate((req) => validateCreateStaticTranslation(req.body)), controller.createStatic);
router.get("/static/:languageCode", requireLanguageCode(), controller.bundle);
router.put(
  "/static/:id",
  requireAuth,
  requireObjectId(),
  validate((req) => validateUpdateStaticTranslation(req.body)),
  controller.updateStatic
);
router.delete("/static/:id", requireAuth, requireObjectId(), controller.deleteStatic);
router.get("/dynamic", requireAuth, validate((req) => validateListDynamicTranslations(req.query)), controller.listDynamic);
router.post("/dynamic/bulk", requireAuth, validate((req) => validateBulkDynamicTranslations(req.body)), controller.bulkDynamic);
router.post("/dynamic", requireAuth, validate((req) => validateCreateDynamicTranslation(req.body)), controller.createDynamic);
router.get("/dynamic/:entityType/:entityId", requireAuth, controller.getDynamicEntity);
router.put(
  "/dynamic/:id",
  requireAuth,
  requireObjectId(),
  validate((req) => validateUpdateDynamicTranslation(req.body)),
  controller.updateDynamic
);
router.delete("/dynamic/:id", requireAuth, requireObjectId(), controller.deleteDynamic);
router.get("/bundle/:languageCode", requireLanguageCode(), controller.bundle);
router.get("/", validate((req) => validateLanguageQuery(req.query)), controller.dictionary);
router.post("/", requireAuth, validate((req) => validateCreateTranslation(req.body)), controller.createTranslation);
router.get("/:key", async (req, res, next) => {
  const value = typeof req.params.key === "string" ? req.params.key.trim().toLowerCase() : "";

  if (LANGUAGE_PATTERN.test(value)) {
    const language = await languageService.findByCode(value);

    if (language) {
      req.params.languageCode = value;
      return controller.bundle(req, res, next);
    }
  }

  return requireTranslationKey(req, res, (error) => {
    if (error) {
      next(error);
      return;
    }

    return controller.getByKey(req, res, next);
  });
});
router.put(
  "/:id",
  requireAuth,
  requireObjectId(),
  validate((req) => validateUpdateTranslation(req.body)),
  controller.updateTranslation
);
router.delete("/:id", requireAuth, requireObjectId(), controller.deleteTranslation);

module.exports = router;
