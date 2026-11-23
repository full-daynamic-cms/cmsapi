const mongoose = require("mongoose");

const seoSchema = new mongoose.Schema(
  {
    metaTitle: { type: mongoose.Schema.Types.Mixed, default: "" },
    metaDescription: { type: mongoose.Schema.Types.Mixed, default: "" },
    keywords: { type: [mongoose.Schema.Types.Mixed], default: [] },
    canonicalUrl: { type: String, default: "", trim: true, maxlength: 2000 },
    ogTitle: { type: mongoose.Schema.Types.Mixed, default: "" },
    ogDescription: { type: mongoose.Schema.Types.Mixed, default: "" },
    ogImage: { type: String, default: "", trim: true, maxlength: 4000 },
    robots: { type: String, default: "index,follow", trim: true, maxlength: 100 },
    schemaMarkup: { type: mongoose.Schema.Types.Mixed, default: null },
  },
  { _id: false, minimize: false }
);

const emptySeo = () => ({
  metaTitle: "",
  metaDescription: "",
  keywords: [],
  canonicalUrl: "",
  ogTitle: "",
  ogDescription: "",
  ogImage: "",
  robots: "index,follow",
  schemaMarkup: null,
});

module.exports = { seoSchema, emptySeo };
