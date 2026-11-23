const express = require("express");
const controller = require("../../controllers/blogController");
const { validate } = require("../../middleware/validate");
const requireObjectId = require("../../middleware/requireObjectId");
const requireSlug = require("../../middleware/requireSlug");
const { validateCreateBlog, validateUpdateBlog, validateListBlogs } = require("../../validators/blogValidator");
const { validateLanguage } = require("../../validators/pageValidator");

const router = express.Router();

router.get("/", validate((req) => validateListBlogs(req.query)), controller.listBlogs);
router.post("/", validate((req) => validateCreateBlog(req.body)), controller.createBlog);
router.get("/slug/:slug", requireSlug(), controller.getBlogBySlug);
router.post("/:id/publish", requireObjectId(), controller.publishBlog);
router.post("/:id/unpublish", requireObjectId(), controller.unpublishBlog);
router.get("/:id/preview", requireObjectId(), validate((req) => validateLanguage(req.query)), controller.previewBlog);
router.get("/:id", requireObjectId(), controller.getBlog);
router.put("/:id", requireObjectId(), validate((req) => validateUpdateBlog(req.body)), controller.updateBlog);
router.delete("/:id", requireObjectId(), controller.deleteBlog);

module.exports = router;
