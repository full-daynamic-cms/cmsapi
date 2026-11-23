const asyncHandler = require("../utils/asyncHandler");
const { sendSuccess } = require("../utils/apiResponse");
const blogCategoryService = require("../services/blogCategoryService");

const createCategory = asyncHandler(async (req, res) => {
  const category = await blogCategoryService.createCategory(req.validated, req.user._id);
  return sendSuccess(res, 201, "Category created successfully", category);
});

const listCategories = asyncHandler(async (req, res) => {
  const categories = await blogCategoryService.listCategories(req.validated);
  return sendSuccess(res, 200, "Records retrieved successfully", categories);
});

const getCategory = asyncHandler(async (req, res) => {
  const category = await blogCategoryService.getCategory(req.params.id);
  return sendSuccess(res, 200, "Category retrieved successfully", category);
});

const updateCategory = asyncHandler(async (req, res) => {
  const category = await blogCategoryService.updateCategory(req.params.id, req.validated, req.user._id);
  return sendSuccess(res, 200, "Category updated successfully", category);
});

const deleteCategory = asyncHandler(async (req, res) => {
  const category = await blogCategoryService.deleteCategory(req.params.id, { force: req.validated.force });
  return sendSuccess(res, 200, "Category deleted successfully", category);
});

const listPublicCategories = asyncHandler(async (req, res) => {
  const categories = await blogCategoryService.listPublicCategories(req.validated.lang);
  return sendSuccess(res, 200, "Records retrieved successfully", categories);
});

module.exports = {
  createCategory,
  listCategories,
  getCategory,
  updateCategory,
  deleteCategory,
  listPublicCategories,
};
