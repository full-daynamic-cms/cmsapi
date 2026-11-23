const ContactSubmission = require("../models/ContactSubmission");
const ApiError = require("../utils/ApiError");
const { paginateQuery } = require("../utils/pagination");
const { containsRegex } = require("../utils/regex");
const logger = require("../utils/logger");

const present = (submission) => ({
  _id: submission._id,
  name: submission.name,
  email: submission.email,
  phone: submission.phone || "",
  subject: submission.subject || "",
  message: submission.message,
  status: submission.status,
  createdAt: submission.createdAt,
  updatedAt: submission.updatedAt,
});

const createSubmission = async (payload) => {
  const settingsService = require("./settingsService");
  await settingsService.assertPublicAvailable();

  if (typeof payload.company === "string" && payload.company.trim()) {
    logger.warn("Contact honeypot rejected a submission");
    return { spam: true };
  }

  const links = payload.message.match(/https?:\/\//gi) || [];

  if (links.length > 5) {
    throw new ApiError(400, "Message looks like spam");
  }

  const submission = await ContactSubmission.create({
    name: payload.name,
    email: payload.email,
    phone: payload.phone || "",
    subject: payload.subject || "",
    message: payload.message,
    status: "new",
  });
  logger.info("Contact submission received");
  return present(submission.toObject());
};

const listSubmissions = async ({ page, limit, status, search }) => {
  const filter = {};

  if (status) {
    filter.status = status;
  }

  if (search) {
    const regex = containsRegex(search);
    filter.$or = [{ name: regex }, { email: regex }, { subject: regex }, { message: regex }];
  }

  const result = await paginateQuery(ContactSubmission.find(filter), {
    page,
    limit,
    sort: { createdAt: -1 },
  });

  return { items: result.items.map(present), pagination: result.pagination };
};

const getSubmission = async (id) => {
  const submission = await ContactSubmission.findById(id).lean();

  if (!submission) {
    throw new ApiError(404, "Contact submission not found");
  }

  return present(submission);
};

const updateSubmission = async (id, payload) => {
  const submission = await ContactSubmission.findByIdAndUpdate(
    id,
    { $set: { status: payload.status } },
    { new: true, runValidators: true }
  ).lean();

  if (!submission) {
    throw new ApiError(404, "Contact submission not found");
  }

  return present(submission);
};

const deleteSubmission = async (id) => {
  const submission = await ContactSubmission.findByIdAndDelete(id).lean();

  if (!submission) {
    throw new ApiError(404, "Contact submission not found");
  }

  return present(submission);
};

module.exports = {
  createSubmission,
  listSubmissions,
  getSubmission,
  updateSubmission,
  deleteSubmission,
};
