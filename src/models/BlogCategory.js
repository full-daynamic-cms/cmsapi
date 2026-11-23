const mongoose = require("mongoose");
const { CATEGORY_STATUSES, SLUG_PATTERN } = require("../config/cms");

const blogCategorySchema = new mongoose.Schema(
  {
    name: {
      type: Object,
      required: true,
      default: () => ({}),
    },
    slug: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
      maxlength: 120,
      match: SLUG_PATTERN,
    },
    description: {
      type: Object,
      default: () => ({}),
    },
    status: {
      type: String,
      enum: CATEGORY_STATUSES,
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
    collection: "blogcategories",
  }
);

blogCategorySchema.index({ status: 1, updatedAt: -1 });

module.exports = mongoose.model("BlogCategory", blogCategorySchema);
