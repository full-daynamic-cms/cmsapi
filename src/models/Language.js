const mongoose = require("mongoose");
const { LANGUAGE_PATTERN } = require("../config/cms");

const languageSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 80,
    },
    code: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
      maxlength: 8,
      match: LANGUAGE_PATTERN,
    },
    nativeName: {
      type: String,
      required: true,
      trim: true,
      maxlength: 80,
    },
    direction: {
      type: String,
      enum: ["ltr", "rtl"],
      required: true,
      default: "ltr",
    },
    isDefault: {
      type: Boolean,
      default: false,
      index: true,
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    isDeleted: {
      type: Boolean,
      default: false,
      index: true,
    },
  },
  {
    timestamps: true,
    versionKey: false,
    collection: "languages",
  }
);

languageSchema.index(
  { isDefault: 1 },
  {
    unique: true,
    partialFilterExpression: { isDefault: true, isDeleted: false },
    name: "one_default_language",
  }
);

module.exports = mongoose.model("Language", languageSchema);
