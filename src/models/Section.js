const mongoose = require("mongoose");
const { SECTION_TYPES, SECTION_STATUSES } = require("../config/cms");

const sectionSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 120,
    },
    type: {
      type: String,
      required: true,
      enum: SECTION_TYPES,
      index: true,
    },
    content: {
      type: Object,
      default: () => ({}),
    },
    settings: {
      type: Object,
      default: () => ({}),
    },
    status: {
      type: String,
      enum: SECTION_STATUSES,
      default: "active",
      index: true,
    },
    order: {
      type: Number,
      default: 0,
      min: 0,
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
    collection: "sections",
  }
);

sectionSchema.index({ type: 1, status: 1, order: 1 });
sectionSchema.index({ status: 1, updatedAt: -1 });

module.exports = mongoose.model("Section", sectionSchema);
