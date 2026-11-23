const express = require("express");
const controller = require("../../controllers/blogController");
const { validate } = require("../../middleware/validate");
const requireSlug = require("../../middleware/requireSlug");
const { validatePublicBlogs } = require("../../validators/blogValidator");
const { validateLanguage } = require("../../validators/pageValidator");

const router = express.Router();

router.get("/", validate((req) => validatePublicBlogs(req.query)), controller.listPublicBlogs);
router.get(
  "/:slug/related",
  requireSlug(),
  validate((req) => validateLanguage(req.query)),
  controller.relatedBlogs
);
router.get("/:slug", requireSlug(), validate((req) => validateLanguage(req.query)), controller.getPublicBlog);

module.exports = router;
