const asyncHandler = require("../utils/asyncHandler");
const { sendSuccess } = require("../utils/apiResponse");
const pageService = require("../services/pageService");

const createPage = asyncHandler(async (req, res) => {
  const page = await pageService.createPage(req.validated, req.user._id);
  return sendSuccess(res, 201, "Page created successfully", page);
});

const listPages = asyncHandler(async (req, res) => {
  const pages = await pageService.listPages(req.validated);
  return sendSuccess(res, 200, "Records retrieved successfully", pages);
});

const getPage = asyncHandler(async (req, res) => {
  const page = await pageService.getPageById(req.params.id);
  return sendSuccess(res, 200, "Page retrieved successfully", page);
});

const getPageBySlug = asyncHandler(async (req, res) => {
  const page = await pageService.getPageBySlug(req.params.slug);
  return sendSuccess(res, 200, "Page retrieved successfully", page);
});

const updatePage = asyncHandler(async (req, res) => {
  const page = await pageService.updatePage(req.params.id, req.validated, req.user._id);
  return sendSuccess(res, 200, "Page updated successfully", page);
});

const deletePage = asyncHandler(async (req, res) => {
  const page = await pageService.deletePage(req.params.id);
  return sendSuccess(res, 200, "Page deleted successfully", page);
});

const setSections = asyncHandler(async (req, res) => {
  const page = await pageService.setPageSections(req.params.id, req.validated.sections, req.user._id);
  return sendSuccess(res, 200, "Page sections updated successfully", page);
});

const publishPage = asyncHandler(async (req, res) => {
  const page = await pageService.publishPage(req.params.id, req.user._id);
  return sendSuccess(res, 200, "Page published successfully", page);
});

const unpublishPage = asyncHandler(async (req, res) => {
  const page = await pageService.unpublishPage(req.params.id, req.user._id);
  return sendSuccess(res, 200, "Page unpublished successfully", page);
});

const previewPage = asyncHandler(async (req, res) => {
  const page = await pageService.previewPage(req.params.id, req.validated.lang);
  return sendSuccess(res, 200, "Page retrieved successfully", page);
});

const listPublicPages = asyncHandler(async (req, res) => {
  const pages = await pageService.listPublicPages({
    page: req.validated.page,
    limit: req.validated.limit,
    requestedLanguage: req.validated.lang,
  });
  return sendSuccess(res, 200, "Records retrieved successfully", pages);
});

const getPublicPage = asyncHandler(async (req, res) => {
  const page = await pageService.getPublicPage(req.params.slug, req.validated.lang);
  return sendSuccess(res, 200, "Page retrieved successfully", page);
});

module.exports = {
  createPage,
  listPages,
  getPage,
  getPageBySlug,
  updatePage,
  deletePage,
  setSections,
  publishPage,
  unpublishPage,
  previewPage,
  listPublicPages,
  getPublicPage,
};
