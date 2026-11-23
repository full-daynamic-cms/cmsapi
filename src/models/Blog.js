const mongoose = require("mongoose");
const { BLOG_STATUSES, SLUG_PATTERN } = require("../config/cms");

const blogSchema = new mongoose.Schema(
  {
    slug: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
      maxlength: 140,
      match: SLUG_PATTERN,
    },
    locales: {
      type: Object,
      required: true,
      default: () => ({}),
    },
    featuredImage: {
      type: String,
      default: "",
      trim: true,
      maxlength: 4000,
    },
    gallery: {
      type: [String],
      default: [],
    },
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "BlogCategory",
      default: null,
      index: true,
    },
    tags: {
      type: [String],
      default: [],
    },
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    status: {
      type: String,
      enum: BLOG_STATUSES,
      default: "draft",
      index: true,
    },
    featured: {
      type: Boolean,
      default: false,
      index: true,
    },
    publishedAt: {
      type: Date,
      default: null,
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
    collection: "blogs",
  }
);

blogSchema.index({ status: 1, publishedAt: -1 });
blogSchema.index({ category: 1, status: 1, publishedAt: -1 });
blogSchema.index({ featured: 1, status: 1, publishedAt: -1 });
blogSchema.index({ tags: 1 });

module.exports = mongoose.model("Blog", blogSchema);
