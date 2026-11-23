const asyncHandler = require("../utils/asyncHandler");
const { sendSuccess } = require("../utils/apiResponse");
const blogService = require("../services/blogService");

const createBlog = asyncHandler(async (req, res) => {
  const blog = await blogService.createBlog(req.validated, req.user._id);
  return sendSuccess(res, 201, "Blog created successfully", blog);
});

const listBlogs = asyncHandler(async (req, res) => {
  const blogs = await blogService.listBlogs(req.validated);
  return sendSuccess(res, 200, "Records retrieved successfully", blogs);
});

const getBlog = asyncHandler(async (req, res) => {
  const blog = await blogService.getBlog(req.params.id);
  return sendSuccess(res, 200, "Blog retrieved successfully", blog);
});

const getBlogBySlug = asyncHandler(async (req, res) => {
  const blog = await blogService.getBlogBySlug(req.params.slug);
  return sendSuccess(res, 200, "Blog retrieved successfully", blog);
});

const updateBlog = asyncHandler(async (req, res) => {
  const blog = await blogService.updateBlog(req.params.id, req.validated, req.user._id);
  return sendSuccess(res, 200, "Blog updated successfully", blog);
});

const deleteBlog = asyncHandler(async (req, res) => {
  const blog = await blogService.deleteBlog(req.params.id);
  return sendSuccess(res, 200, "Blog deleted successfully", blog);
});

const publishBlog = asyncHandler(async (req, res) => {
  const blog = await blogService.publishBlog(req.params.id, req.user._id);
  return sendSuccess(res, 200, "Blog published successfully", blog);
});

const unpublishBlog = asyncHandler(async (req, res) => {
  const blog = await blogService.unpublishBlog(req.params.id, req.user._id);
  return sendSuccess(res, 200, "Blog unpublished successfully", blog);
});

const previewBlog = asyncHandler(async (req, res) => {
  const blog = await blogService.previewBlog(req.params.id, req.validated.lang);
  return sendSuccess(res, 200, "Blog retrieved successfully", blog);
});

const listPublicBlogs = asyncHandler(async (req, res) => {
  const blogs = await blogService.listPublicBlogs(req.validated);
  return sendSuccess(res, 200, "Records retrieved successfully", blogs);
});

const getPublicBlog = asyncHandler(async (req, res) => {
  const blog = await blogService.getPublicBlog(req.params.slug, req.validated.lang);
  return sendSuccess(res, 200, "Blog retrieved successfully", blog);
});

const relatedBlogs = asyncHandler(async (req, res) => {
  const blogs = await blogService.relatedBlogs(req.params.slug, req.validated.lang);
  return sendSuccess(res, 200, "Records retrieved successfully", blogs);
});

module.exports = {
  createBlog,
  listBlogs,
  getBlog,
  getBlogBySlug,
  updateBlog,
  deleteBlog,
  publishBlog,
  unpublishBlog,
  previewBlog,
  listPublicBlogs,
  getPublicBlog,
  relatedBlogs,
};
