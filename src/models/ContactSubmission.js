const mongoose = require("mongoose");
const { CONTACT_STATUSES } = require("../config/cms");

const contactSubmissionSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 120,
    },
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      maxlength: 200,
    },
    phone: {
      type: String,
      default: "",
      trim: true,
      maxlength: 40,
    },
    subject: {
      type: String,
      default: "",
      trim: true,
      maxlength: 200,
    },
    message: {
      type: String,
      required: true,
      maxlength: 5000,
    },
    status: {
      type: String,
      enum: CONTACT_STATUSES,
      default: "new",
      index: true,
    },
  },
  {
    timestamps: true,
    versionKey: false,
    collection: "contactsubmissions",
  }
);

contactSubmissionSchema.index({ status: 1, createdAt: -1 });
contactSubmissionSchema.index({ email: 1, createdAt: -1 });

module.exports = mongoose.model("ContactSubmission", contactSubmissionSchema);
