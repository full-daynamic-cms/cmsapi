const asyncHandler = require("../utils/asyncHandler");
const { sendSuccess } = require("../utils/apiResponse");
const contactService = require("../services/contactService");

const createSubmission = asyncHandler(async (req, res) => {
  const submission = await contactService.createSubmission(req.validated);
  return sendSuccess(res, 201, "Message sent successfully", { accepted: true, id: submission.spam ? undefined : submission._id });
});

const listSubmissions = asyncHandler(async (req, res) => {
  const submissions = await contactService.listSubmissions(req.validated);
  return sendSuccess(res, 200, "Records retrieved successfully", submissions);
});

const getSubmission = asyncHandler(async (req, res) => {
  const submission = await contactService.getSubmission(req.params.id);
  return sendSuccess(res, 200, "Contact submission retrieved successfully", submission);
});

const updateSubmission = asyncHandler(async (req, res) => {
  const submission = await contactService.updateSubmission(req.params.id, req.validated);
  return sendSuccess(res, 200, "Contact submission updated successfully", submission);
});

const deleteSubmission = asyncHandler(async (req, res) => {
  const submission = await contactService.deleteSubmission(req.params.id);
  return sendSuccess(res, 200, "Contact submission deleted successfully", submission);
});

module.exports = {
  createSubmission,
  listSubmissions,
  getSubmission,
  updateSubmission,
  deleteSubmission,
};
