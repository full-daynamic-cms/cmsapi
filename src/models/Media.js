const mongoose = require("mongoose");

const mediaSchema = new mongoose.Schema(
  {
    filename: {
      type: String,
      required: true,
      trim: true,
      maxlength: 300,
    },
    originalName: {
      type: String,
      required: true,
      trim: true,
      maxlength: 300,
    },
    mimeType: {
      type: String,
      required: true,
      trim: true,
      maxlength: 120,
    },
    size: {
      type: Number,
      required: true,
      min: 0,
    },
    url: {
      type: String,
      required: true,
      trim: true,
      maxlength: 4000,
    },
    publicId: {
      type: String,
      default: "",
      trim: true,
      maxlength: 500,
    },
    resourceType: {
      type: String,
      default: "image",
      trim: true,
      maxlength: 20,
    },
    altText: {
      type: String,
      default: "",
      trim: true,
      maxlength: 300,
    },
    folder: {
      type: String,
      default: "general",
      trim: true,
      lowercase: true,
      maxlength: 80,
      index: true,
    },
    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  {
    timestamps: true,
    versionKey: false,
    collection: "media",
  }
);

mediaSchema.index({ folder: 1, createdAt: -1 });
mediaSchema.index({ createdAt: -1 });

module.exports = mongoose.model("Media", mediaSchema);
