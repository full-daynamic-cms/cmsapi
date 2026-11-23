const express = require("express");
const requireLanguageCode = require("../../middleware/requireLanguageCode");
const controller = require("../../controllers/languageController");

const router = express.Router();

router.get("/", controller.listLanguages);
router.get("/:code", requireLanguageCode("code"), controller.getByCode);

module.exports = router;
