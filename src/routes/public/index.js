const express = require("express");
const rateLimit = require("../../middleware/rateLimit");
const pageRoutes = require("./pageRoutes");
const blogRoutes = require("./blogRoutes");
const blogCategoryRoutes = require("./blogCategoryRoutes");
const translationRoutes = require("./translationRoutes");
const settingsRoutes = require("./settingsRoutes");
const contactRoutes = require("./contactRoutes");

const router = express.Router();

router.use(rateLimit({ windowMs: 60 * 1000, max: 300, name: "public" }));
router.use("/pages", pageRoutes);
router.use("/blogs", blogRoutes);
router.use("/blog-categories", blogCategoryRoutes);
router.use("/translations", translationRoutes);
router.use("/settings", settingsRoutes);
router.use("/contact", rateLimit({ windowMs: 15 * 60 * 1000, max: 8, name: "contact" }), contactRoutes);

module.exports = router;
