const express = require("express");
const requireAuth = require("../middleware/requireAuth");
const rateLimit = require("../middleware/rateLimit");
const { validate } = require("../middleware/validate");
const requireObjectId = require("../middleware/requireObjectId");
const requireTranslationKey = require("../middleware/requireTranslationKey");
const controller = require("../controllers/translationController");
const {
  validateCreateTranslation,
  validateUpdateTranslation,
  validateBulkCreateTranslations,
  validateBulkUpdateTranslations,
  validateImportTranslations,
  validateLanguageQuery,
} = require("../validators/translationValidator");

const router = express.Router();

router.use(rateLimit({ windowMs: 60 * 1000, max: 300, name: "translations" }));

router.get("/export", requireAuth, controller.exportTranslations);
router.get("/missing", requireAuth, validate((req) => validateLanguageQuery(req.query)), controller.missing);
router.get("/unused", requireAuth, controller.unused);
router.post("/import", requireAuth, validate((req) => validateImportTranslations(req.body)), controller.importTranslations);
router.post("/bulk", requireAuth, validate((req) => validateBulkCreateTranslations(req.body)), controller.bulkCreate);
router.put("/bulk", requireAuth, validate((req) => validateBulkUpdateTranslations(req.body)), controller.bulkUpdate);
router.get("/", validate((req) => validateLanguageQuery(req.query)), controller.dictionary);
router.post("/", requireAuth, validate((req) => validateCreateTranslation(req.body)), controller.createTranslation);
router.get("/:key", requireTranslationKey, controller.getByKey);
router.put(
  "/:id",
  requireAuth,
  requireObjectId(),
  validate((req) => validateUpdateTranslation(req.body)),
  controller.updateTranslation
);
router.delete("/:id", requireAuth, requireObjectId(), controller.deleteTranslation);

module.exports = router;
