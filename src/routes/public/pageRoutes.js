const express = require("express");
const controller = require("../../controllers/pageController");
const { validate } = require("../../middleware/validate");
const requireSlug = require("../../middleware/requireSlug");
const { validatePublicPages, validateLanguage } = require("../../validators/pageValidator");

const router = express.Router();

router.get("/", validate((req) => validatePublicPages(req.query)), controller.listPublicPages);
router.get("/:slug", requireSlug(), validate((req) => validateLanguage(req.query)), controller.getPublicPage);

module.exports = router;
