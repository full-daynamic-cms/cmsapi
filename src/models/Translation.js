const mongoose = require("mongoose");
const { TRANSLATION_STATUSES, TRANSLATION_TYPES, TRANSLATION_KEY_PATTERN, LANGUAGE_PATTERN } = require("../config/cms");

/**
 * One collection stores three document shapes:
 * - dictionary: legacy static key with a translations map (`{ en, ar }`)
 * - static: one frontend string for one language and key
 * - dynamic: one CMS field translation for one language, entity, and field
 */
const translationSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: TRANSLATION_TYPES,
      default: "dictionary",
      index: true,
    },
    key: {
      type: String,
      trim: true,
      lowercase: true,
      maxlength: 160,
      match: TRANSLATION_KEY_PATTERN,
    },
    translations: {
      type: Object,
      default: undefined,
    },
    languageCode: {
      type: String,
      trim: true,
      lowercase: true,
      maxlength: 8,
      match: LANGUAGE_PATTERN,
    },
    entityType: {
      type: String,
      trim: true,
      maxlength: 40,
    },
    entityId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
    },
    field: {
      type: String,
      trim: true,
      maxlength: 180,
    },
    value: {
      type: mongoose.Schema.Types.Mixed,
      default: undefined,
    },
    category: {
      type: String,
      default: "",
      trim: true,
      maxlength: 80,
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

translationSchema.pre("validate", function validateTranslationShape(next) {
  const type = this.type || "dictionary";

  if ((type === "dictionary" || type === "static") && !this.key) {
    this.invalidate("key", "key is required");
  }

  if (type === "static" || type === "dynamic") {
    if (!this.languageCode) {
      this.invalidate("languageCode", "languageCode is required");
    }

    if (typeof this.value !== "string") {
      this.invalidate("value", "value must be a string");
    }
  }

  if (type === "dynamic") {
    if (!this.entityType) {
      this.invalidate("entityType", "entityType is required");
    }

    if (!this.entityId) {
      this.invalidate("entityId", "entityId is required");
    }

    if (!this.field) {
      this.invalidate("field", "field is required");
    }
  }

  next();
});

translationSchema.index(
  { key: 1 },
  { unique: true, partialFilterExpression: { type: "dictionary" }, name: "dictionary_key_unique" }
);
translationSchema.index(
  { languageCode: 1, key: 1 },
  { unique: true, partialFilterExpression: { type: "static" }, name: "static_language_key_unique" }
);
translationSchema.index(
  { languageCode: 1, entityType: 1, entityId: 1, field: 1 },
  { unique: true, partialFilterExpression: { type: "dynamic" }, name: "dynamic_identity_unique" }
);
translationSchema.index({ type: 1, languageCode: 1, entityType: 1, entityId: 1 });
translationSchema.index({ category: 1, status: 1 });
translationSchema.index({ status: 1, updatedAt: -1 });

const Translation = mongoose.model("Translation", translationSchema);

let indexPromise = null;

Translation.ensureTranslationIndexes = () => {
  if (!indexPromise) {
    indexPromise = (async () => {
      await Translation.updateMany(
        { type: { $exists: false }, key: { $type: "string" } },
        { $set: { type: "dictionary" } }
      );
      await Translation.syncIndexes();
    })().catch((error) => {
      indexPromise = null;
      throw error;
    });
  }

  return indexPromise;
};

module.exports = Translation;
