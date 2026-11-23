const BlogCategory = require("../models/BlogCategory");
const Blog = require("../models/Blog");
const ApiError = require("../utils/ApiError");
const { paginateQuery } = require("../utils/pagination");
const { containsRegex } = require("../utils/regex");
const { slugify } = require("../utils/slugify");
const translationService = require("./translationService");

const present = (category) => ({
  _id: category._id,
  name: category.name || {},
  slug: category.slug,
  description: category.description || {},
  status: category.status,
  createdBy: category.createdBy || null,
  updatedBy: category.updatedBy || null,
  createdAt: category.createdAt,
  updatedAt: category.updatedAt,
});

const reserveSlug = async (slug, ignoreId) => {
  const filter = { slug };

  if (ignoreId) {
    filter._id = { $ne: ignoreId };
  }

  if (await BlogCategory.exists(filter)) {
    throw new ApiError(409, "Category slug already exists");
  }
};

const localizedText = (value, language) => {
  if (!value || typeof value !== "object") {
    return typeof value === "string" ? value : "";
  }

  if (typeof value[language] === "string" && value[language].trim()) {
    return value[language];
  }

  return typeof value.en === "string" ? value.en : "";
};

const createCategory = async (payload, userId) => {
  const slug = payload.slug || slugify(payload.name?.en || "");

  if (!slug) {
    throw new ApiError(400, "Validation failed", [{ field: "slug", message: "slug is required" }]);
  }

  await reserveSlug(slug);
  const category = await BlogCategory.create({
    name: payload.name,
    slug,
    description: payload.description || {},
    status: payload.status || "active",
    createdBy: userId || null,
    updatedBy: userId || null,
  });
  return present(category.toObject());
};

const updateCategory = async (id, payload, userId) => {
  const existing = await BlogCategory.findById(id).lean();

  if (!existing) {
    throw new ApiError(404, "Category not found");
  }

  const update = { updatedBy: userId || null };

  if (payload.name) {
    update.name = { ...(existing.name || {}), ...payload.name };
  }

  if (payload.description) {
    update.description = { ...(existing.description || {}), ...payload.description };
  }

  if (payload.status) {
    update.status = payload.status;
  }

  if (payload.slug && payload.slug !== existing.slug) {
    await reserveSlug(payload.slug, id);
    update.slug = payload.slug;
  }

  const category = await BlogCategory.findByIdAndUpdate(id, { $set: update }, { new: true, runValidators: true }).lean();
  return present(category);
};

const deleteCategory = async (id, { force = false } = {}) => {
  const category = await BlogCategory.findById(id).lean();

  if (!category) {
    throw new ApiError(404, "Category not found");
  }

  const inUse = await Blog.exists({ category: id });

  if (inUse && !force) {
    throw new ApiError(409, "Category is assigned to a blog");
  }

  if (inUse && force) {
    await Blog.updateMany({ category: id }, { $set: { category: null } });
  }

  await BlogCategory.deleteOne({ _id: id });
  await translationService.removeEntityTranslations("BlogCategory", id);
  return present(category);
};

const getCategory = async (id) => {
  const category = await BlogCategory.findById(id).lean();

  if (!category) {
    throw new ApiError(404, "Category not found");
  }

  return present(category);
};

const listCategories = async ({ page, limit, search, status }) => {
  const filter = {};

  if (status) {
    filter.status = status;
  }

  if (search) {
    const regex = containsRegex(search);
    filter.$or = [{ slug: regex }, { "name.en": regex }, { "name.ar": regex }, { "description.en": regex }];
  }

  const result = await paginateQuery(BlogCategory.find(filter), {
    page,
    limit,
    sort: { updatedAt: -1 },
  });

  return { items: result.items.map(present), pagination: result.pagination };
};

const listPublicCategories = async (requestedLanguage) => {
  const settingsService = require("./settingsService");
  await settingsService.assertPublicAvailable();
  const { language: described } = await settingsService.resolveRequestedLanguage(requestedLanguage);
  const language = described.code;
  const categories = await BlogCategory.find({ status: "active" }).sort({ slug: 1 }).lean();
  const resolved = await translationService.resolveContent(
    categories.map((category) => ({
      slug: category.slug,
      name: category.name || {},
      description: category.description || {},
    })),
    language
  );
  const localized = categories.map((category, index) => ({
    _id: category._id,
    slug: category.slug,
    name: localizedText(resolved[index].name, language),
    description: localizedText(resolved[index].description, language),
  }));
  const translated = await translationService.resolveMany({
    entityType: "BlogCategory",
    documents: localized,
    languageCode: language,
  });

  return {
    language,
    direction: described.direction,
    items: translated.map((category) => ({
      slug: category.slug,
      name: category.name,
      description: category.description,
    })),
  };
};

const resolveCategoryId = async (category) => {
  if (!category) {
    return null;
  }

  if (/^[a-f\d]{24}$/i.test(category)) {
    const found = await BlogCategory.findById(category).select("_id").lean();

    if (!found) {
      throw new ApiError(404, "Category not found");
    }

    return found._id;
  }

  const found = await BlogCategory.findOne({ slug: category }).select("_id").lean();

  if (!found) {
    throw new ApiError(404, "Category not found");
  }

  return found._id;
};

module.exports = {
  present,
  localizedText,
  createCategory,
  updateCategory,
  deleteCategory,
  getCategory,
  listCategories,
  listPublicCategories,
  resolveCategoryId,
};
