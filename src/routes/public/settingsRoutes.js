const express = require("express");
const controller = require("../../controllers/settingsController");
const { validate } = require("../../middleware/validate");
const { validatePublicSettings } = require("../../validators/settingsValidator");

const router = express.Router();

router.get("/", validate((req) => validatePublicSettings(req.query)), controller.getPublicSettings);

module.exports = router;
