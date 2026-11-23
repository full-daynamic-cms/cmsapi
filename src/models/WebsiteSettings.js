const mongoose = require("mongoose");

const socialLinkSchema = new mongoose.Schema(
  {
    platform: { type: String, required: true, trim: true, maxlength: 40 },
    url: { type: String, required: true, trim: true, maxlength: 2000 },
  },
  { _id: false }
);

const websiteSettingsSchema = new mongoose.Schema(
  {
    singleton: {
      type: String,
      required: true,
      unique: true,
      default: "default",
      immutable: true,
    },
    websiteName: {
      type: mongoose.Schema.Types.Mixed,
      default: "",
    },
    logo: {
      type: String,
      default: "",
      trim: true,
      maxlength: 4000,
    },
    favicon: {
      type: String,
      default: "",
      trim: true,
      maxlength: 4000,
    },
    defaultLanguage: {
      type: String,
      default: "en",
      lowercase: true,
      trim: true,
    },
    supportedLanguages: {
      type: [String],
      default: () => ["en", "ar"],
    },
    socialLinks: {
      type: [socialLinkSchema],
      default: [],
    },
    contact: {
      email: { type: String, default: "", trim: true, maxlength: 200 },
      phone: { type: String, default: "", trim: true, maxlength: 40 },
      address: { type: mongoose.Schema.Types.Mixed, default: "" },
    },
    footer: {
      type: Object,
      default: () => ({}),
    },
    header: {
      type: Object,
      default: () => ({}),
    },
    defaultSeo: {
      type: Object,
      default: () => ({}),
    },
    maintenanceMode: {
      type: Boolean,
      default: false,
    },
    maintenanceMessage: {
      type: mongoose.Schema.Types.Mixed,
      default: "",
    },
    custom: {
      type: Object,
      default: () => ({}),
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
    collection: "websitesettings",
  }
);

module.exports = mongoose.model("WebsiteSettings", websiteSettingsSchema);
