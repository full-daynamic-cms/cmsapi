const asyncHandler = require("../utils/asyncHandler");
const { sendSuccess } = require("../utils/apiResponse");
const sectionService = require("../services/sectionService");

const createSection = asyncHandler(async (req, res) => {
  const section = await sectionService.createSection(req.validated, req.user._id);
  return sendSuccess(res, 201, "Section created successfully", section);
});

const listSections = asyncHandler(async (req, res) => {
  const sections = await sectionService.listSections(req.validated);
  return sendSuccess(res, 200, "Records retrieved successfully", sections);
});

const getSection = asyncHandler(async (req, res) => {
  const section = await sectionService.getSectionById(req.params.id);
  return sendSuccess(res, 200, "Section retrieved successfully", section);
});

const updateSection = asyncHandler(async (req, res) => {
  const section = await sectionService.updateSection(req.params.id, req.validated, req.user._id);
  return sendSuccess(res, 200, "Section updated successfully", section);
});

const deleteSection = asyncHandler(async (req, res) => {
  const section = await sectionService.deleteSection(req.params.id, { force: req.validated.force });
  return sendSuccess(res, 200, "Section deleted successfully", section);
});

const updateStatus = asyncHandler(async (req, res) => {
  const section = await sectionService.setStatus(req.params.id, req.validated.status, req.user._id);
  return sendSuccess(res, 200, "Section status updated successfully", section);
});

const reorderSections = asyncHandler(async (req, res) => {
  const sections = await sectionService.reorderSections(req.validated.sections, req.user._id);
  return sendSuccess(res, 200, "Sections reordered successfully", sections);
});

const duplicateSection = asyncHandler(async (req, res) => {
  const section = await sectionService.duplicateSection(req.params.id, req.validated, req.user._id);
  return sendSuccess(res, 201, "Section duplicated successfully", section);
});

module.exports = {
  createSection,
  listSections,
  getSection,
  updateSection,
  deleteSection,
  updateStatus,
  reorderSections,
  duplicateSection,
};
