const express = require("express");
const controller = require("../../controllers/contactController");
const { validate } = require("../../middleware/validate");
const { validateCreateContact } = require("../../validators/contactValidator");

const router = express.Router();

router.post("/", validate((req) => validateCreateContact(req.body)), controller.createSubmission);

module.exports = router;
