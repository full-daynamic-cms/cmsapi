const express = require("express");
const controller = require("../../controllers/contactController");
const { validate } = require("../../middleware/validate");
const requireObjectId = require("../../middleware/requireObjectId");
const { validateListContacts, validateUpdateContact } = require("../../validators/contactValidator");

const router = express.Router();

router.get("/", validate((req) => validateListContacts(req.query)), controller.listSubmissions);
router.get("/:id", requireObjectId(), controller.getSubmission);
router.patch("/:id", requireObjectId(), validate((req) => validateUpdateContact(req.body)), controller.updateSubmission);
router.delete("/:id", requireObjectId(), controller.deleteSubmission);

module.exports = router;
