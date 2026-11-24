const express = require("express");
const asyncHandler = require("../../utils/asyncHandler");
const requireAuth = require("../../middleware/requireAuth");
const rateLimit = require("../../middleware/rateLimit");
const { uploadMediaFile } = require("../../middleware/upload");
const { sendSuccess } = require("../../utils/apiResponse");
const resourceGateway = require("../../services/resourceGateway");

const router = express.Router();

const respond = (res, result) => sendSuccess(res, result.status, result.message, result.data);

const acceptMediaUpload = (req, res, next) => {
  const model = String(req.params.model || "").toLowerCase();
  const contentType = req.headers["content-type"] || "";

  if (model !== "media" || !contentType.toLowerCase().includes("multipart/form-data")) {
    next();
    return;
  }

  uploadMediaFile(req, res, next);
};

router.use(rateLimit({ windowMs: 60 * 1000, max: 600, name: "admin" }));
router.use(requireAuth);

router.get(
  "/:model",
  asyncHandler(async (req, res) => {
    respond(res, await resourceGateway.readAdmin(req.params.model, req.query));
  })
);

router.put(
  "/:model",
  acceptMediaUpload,
  asyncHandler(async (req, res) => {
    respond(res, await resourceGateway.writeAdmin(req.params.model, req.body || {}, req.user._id, req.file, req.query));
  })
);

module.exports = router;
