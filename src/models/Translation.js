const mongoose = require("mongoose");
const { TRANSLATION_STATUSES, TRANSLATION_KEY_PATTERN } = require("../config/cms");

const translationSchema = new mongoose.Schema(
  {
    key: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
      maxlength: 160,
      match: TRANSLATION_KEY_PATTERN,
    },
    translations: {
      type: Object,
      default: () => ({}),
    },
    category: {
      type: String,
      default: "",
      trim: true,
      maxlength: 80,
      index: true,
    },
    description: {
      type: String,
      default: "",
      trim: true,
      maxlength: 500,
    },
    status: {
      type: String,
      enum: TRANSLATION_STATUSES,
      default: "active",
      index: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  {
    timestamps: true,
    minimize: false,
    versionKey: false,
    collection: "translations",
  }
);

translationSchema.index({ category: 1, status: 1 });
translationSchema.index({ status: 1, updatedAt: -1 });

module.exports = mongoose.model("Translation", translationSchema);
