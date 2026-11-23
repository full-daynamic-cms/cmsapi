const mongoose = require("mongoose");
const { PAGE_TYPES, PAGE_STATUSES, SLUG_PATTERN } = require("../config/cms");

const sectionRefSchema = new mongoose.Schema(
  {
    section: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Section",
      required: true,
    },
    order: {
      type: Number,
      required: true,
      min: 0,
    },
  },
  { _id: false }
);

const pageSchema = new mongoose.Schema(
  {
    title: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
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
    pageType: {
      type: String,
      enum: PAGE_TYPES,
      default: "custom",
      index: true,
    },
    status: {
      type: String,
      enum: PAGE_STATUSES,
      default: "draft",
      index: true,
    },
    sections: {
      type: [sectionRefSchema],
      default: [],
    },
    seo: {
      type: Object,
      default: () => ({}),
    },
    publishedSnapshot: {
      title: { type: mongoose.Schema.Types.Mixed },
      sections: { type: [sectionRefSchema] },
      seo: { type: Object },
    },
    publishedAt: {
      type: Date,
      default: null,
    },
    hasUnpublishedChanges: {
      type: Boolean,
      default: true,
    },
    version: {
      type: Number,
      default: 1,
      min: 1,
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
    collection: "pages",
  }
);

pageSchema.index({ status: 1, publishedAt: -1 });
pageSchema.index({ pageType: 1, status: 1 });

module.exports = mongoose.model("Page", pageSchema);
