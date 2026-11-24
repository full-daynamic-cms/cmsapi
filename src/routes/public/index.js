const express = require("express");
const asyncHandler = require("../../utils/asyncHandler");
const rateLimit = require("../../middleware/rateLimit");
const { sendSuccess } = require("../../utils/apiResponse");
const resourceGateway = require("../../services/resourceGateway");

const router = express.Router();
const contactLimit = rateLimit({ windowMs: 15 * 60 * 1000, max: 8, name: "contact" });

const respond = (res, result) => sendSuccess(res, result.status, result.message, result.data);

router.use(rateLimit({ windowMs: 60 * 1000, max: 300, name: "public" }));

router.get(
  "/:model",
  asyncHandler(async (req, res) => {
    respond(res, await resourceGateway.readPublic(req.params.model, req.query));
  })
);

router.post(
  "/:model",
  (req, res, next) => {
    if (String(req.params.model || "").toLowerCase() !== "contact") {
      next();
      return;
    }

    contactLimit(req, res, next);
  },
  asyncHandler(async (req, res) => {
    respond(res, await resourceGateway.writePublic(req.params.model, req.body || {}));
  })
);

module.exports = router;
