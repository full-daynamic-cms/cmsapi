const express = require("express");
const controller = require("../../controllers/blogCategoryController");
const { validate } = require("../../middleware/validate");
const { validateLanguage } = require("../../validators/pageValidator");

const router = express.Router();

router.get("/", validate((req) => validateLanguage(req.query)), controller.listPublicCategories);

module.exports = router;
