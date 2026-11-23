const express = require("express");
const controller = require("../../controllers/blogCategoryController");
const { validate } = require("../../middleware/validate");
const requireObjectId = require("../../middleware/requireObjectId");
const {
  validateCreateCategory,
  validateUpdateCategory,
  validateListCategories,
  validateForce,
} = require("../../validators/blogValidator");

const router = express.Router();

router.get("/", validate((req) => validateListCategories(req.query)), controller.listCategories);
router.post("/", validate((req) => validateCreateCategory(req.body)), controller.createCategory);
router.get("/:id", requireObjectId(), controller.getCategory);
router.put("/:id", requireObjectId(), validate((req) => validateUpdateCategory(req.body)), controller.updateCategory);
router.delete("/:id", requireObjectId(), validate((req) => validateForce(req.query)), controller.deleteCategory);

module.exports = router;
