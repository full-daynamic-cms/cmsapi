const express = require("express");
const { validate } = require("../../middleware/validate");
const requireObjectId = require("../../middleware/requireObjectId");
const controller = require("../../controllers/languageController");
const { validateCreateLanguage, validateUpdateLanguage, validateListLanguages } = require("../../validators/languageValidator");

const router = express.Router();

router.get("/", validate((req) => validateListLanguages(req.query)), controller.listLanguages);
router.post("/", validate((req) => validateCreateLanguage(req.body)), controller.createLanguage);
router.get("/:id", requireObjectId(), controller.getLanguage);
router.put("/:id", requireObjectId(), validate((req) => validateUpdateLanguage(req.body)), controller.updateLanguage);
router.delete("/:id", requireObjectId(), controller.deleteLanguage);

module.exports = router;
