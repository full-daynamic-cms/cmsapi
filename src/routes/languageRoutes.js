const express = require("express");
const requireAuth = require("../middleware/requireAuth");
const rateLimit = require("../middleware/rateLimit");
const { validate } = require("../middleware/validate");
const requireObjectId = require("../middleware/requireObjectId");
const requireLanguageCode = require("../middleware/requireLanguageCode");
const { OBJECT_ID_PATTERN } = require("../config/cms");
const controller = require("../controllers/languageController");
const { validateCreateLanguage, validateUpdateLanguage, validateListLanguages } = require("../validators/languageValidator");

const router = express.Router();

router.use(rateLimit({ windowMs: 60 * 1000, max: 300, name: "languages" }));

router.get("/", validate((req) => validateListLanguages(req.query)), controller.listLanguages);
router.post("/", requireAuth, validate((req) => validateCreateLanguage(req.body)), controller.createLanguage);
router.put(
  "/:id",
  requireAuth,
  requireObjectId(),
  validate((req) => validateUpdateLanguage(req.body)),
  controller.updateLanguage
);
router.delete("/:id", requireAuth, requireObjectId(), controller.deleteLanguage);
router.get("/:id", (req, res, next) => {
  if (OBJECT_ID_PATTERN.test(req.params.id)) {
    return controller.getLanguage(req, res, next);
  }

  return requireLanguageCode("id")(req, res, (error) => {
    if (error) {
      next(error);
      return;
    }

    req.params.code = req.params.id;
    return controller.getByCode(req, res, next);
  });
});

module.exports = router;
