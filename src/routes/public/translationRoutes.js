const express = require("express");
const controller = require("../../controllers/translationController");
const { validate } = require("../../middleware/validate");
const requireTranslationKey = require("../../middleware/requireTranslationKey");
const { validateLanguageQuery } = require("../../validators/translationValidator");

const router = express.Router();

router.get("/", validate((req) => validateLanguageQuery(req.query)), controller.dictionary);
router.get("/:key", requireTranslationKey, controller.getByKey);

module.exports = router;
