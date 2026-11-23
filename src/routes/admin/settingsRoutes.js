const express = require("express");
const controller = require("../../controllers/settingsController");
const { validate } = require("../../middleware/validate");
const { validateUpdateSettings } = require("../../validators/settingsValidator");

const router = express.Router();

router.get("/", controller.getSettings);
router.put("/", validate((req) => validateUpdateSettings(req.body)), controller.updateSettings);

module.exports = router;
