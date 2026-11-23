const express = require("express");
const requireAuth = require("../../middleware/requireAuth");
const rateLimit = require("../../middleware/rateLimit");
const pageRoutes = require("./pageRoutes");
const sectionRoutes = require("./sectionRoutes");
const translationRoutes = require("./translationRoutes");
const blogRoutes = require("./blogRoutes");
const blogCategoryRoutes = require("./blogCategoryRoutes");
const mediaRoutes = require("./mediaRoutes");
const contactRoutes = require("./contactRoutes");
const settingsRoutes = require("./settingsRoutes");
const languageRoutes = require("./languageRoutes");

const router = express.Router();

router.use(rateLimit({ windowMs: 60 * 1000, max: 600, name: "admin" }));
router.use(requireAuth);
router.use("/pages", pageRoutes);
router.use("/sections", sectionRoutes);
router.use("/translations", translationRoutes);
router.use("/blogs", blogRoutes);
router.use("/blog-categories", blogCategoryRoutes);
router.use("/media", mediaRoutes);
router.use("/contact", contactRoutes);
router.use("/settings", settingsRoutes);
router.use("/languages", languageRoutes);

module.exports = router;
