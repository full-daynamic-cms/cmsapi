const Blog = require("../models/Blog");
const ApiError = require("../utils/ApiError");
const { paginateQuery } = require("../utils/pagination");
const { containsRegex } = require("../utils/regex");
const { slugify } = require("../utils/slugify");
const translationService = require("./translationService");
const settingsService = require("./settingsService");
const blogCategoryService = require("./blogCategoryService");
const { pickSeo } = require("./seoService");

const reserveSlug = async (slug, ignoreId) => {
  const filter = { slug };

  if (ignoreId) {
    filter._id = { $ne: ignoreId };
  }

  if (await Blog.exists(filter)) {
    throw new ApiError(409, "Blog slug already exists");
  }
};

const mergeLocales = (current = {}, incoming = {}) => {
  const next = { ...current };

  for (const [language, value] of Object.entries(incoming)) {
    next[language] = {
      ...(current[language] || {}),
      ...value,
    };

    if (value.seo) {
      next[language].seo = { ...(current[language]?.seo || {}), ...value.seo };
    }
  }

  return next;
};

const summarizeLocales = (locales = {}) => {
  const output = {};

  for (const [language, value] of Object.entries(locales || {})) {
    output[language] = {
      title: value?.title || "",
      excerpt: value?.excerpt || "",
    };
  }

  return output;
};

const presentAdmin = (blog, { full = false } = {}) => ({
  _id: blog._id,
  slug: blog.slug,
  locales: full ? blog.locales || {} : summarizeLocales(blog.locales),
  featuredImage: blog.featuredImage || "",
  gallery: blog.gallery || [],
  category: blog.category
    ? {
        _id: blog.category._id || blog.category,
        name: blog.category.name,
        slug: blog.category.slug,
        status: blog.category.status,
      }
    : null,
  tags: blog.tags || [],
  author: blog.author ? { _id: blog.author._id || blog.author, name: blog.author.name } : null,
  status: blog.status,
  featured: Boolean(blog.featured),
  publishedAt: blog.publishedAt,
  createdBy: blog.createdBy || null,
  updatedBy: blog.updatedBy || null,
  createdAt: blog.createdAt,
  updatedAt: blog.updatedAt,
});

const withRelations = (query) =>
  query
    .populate("category", "name slug status")
    .populate("author", "name")
    .populate("createdBy", "name")
    .populate("updatedBy", "name");

const loadBlog = async (filter) => {
  const blog = await withRelations(Blog.findOne(filter)).lean();

  if (!blog) {
    throw new ApiError(404, "Blog not found");
  }

  return blog;
};

const createBlog = async (payload, userId) => {
  const slug = payload.slug || slugify(payload.locales?.en?.title || "");

  if (!slug) {
    throw new ApiError(400, "Validation failed", [{ field: "slug", message: "slug is required" }]);
  }

  await reserveSlug(slug);
  const category = await blogCategoryService.resolveCategoryId(payload.category);
  const status = payload.status || "draft";
  const blog = await Blog.create({
    slug,
    locales: payload.locales,
    featuredImage: payload.featuredImage || "",
    gallery: payload.gallery || [],
    category,
    tags: payload.tags || [],
    author: payload.author || userId || null,
    status,
    featured: Boolean(payload.featured),
    publishedAt: status === "published" ? new Date() : null,
    createdBy: userId || null,
    updatedBy: userId || null,
  });
  return presentAdmin(await loadBlog({ _id: blog._id }), { full: true });
};

const updateBlog = async (id, payload, userId) => {
  const existing = await Blog.findById(id).lean();

  if (!existing) {
    throw new ApiError(404, "Blog not found");
  }

  const update = { updatedBy: userId || null };

  if (payload.slug && payload.slug !== existing.slug) {
    await reserveSlug(payload.slug, id);
    update.slug = payload.slug;
  }

  if (payload.locales) {
    update.locales = mergeLocales(existing.locales, payload.locales);
  }

  if (payload.featuredImage !== undefined) update.featuredImage = payload.featuredImage;
  if (payload.gallery) update.gallery = payload.gallery;
  if (payload.tags) update.tags = payload.tags;
  if (payload.featured !== undefined) update.featured = payload.featured;
  if (payload.author) update.author = payload.author;

  if (payload.category !== undefined) {
    update.category = payload.category ? await blogCategoryService.resolveCategoryId(payload.category) : null;
  }

  if (payload.status) {
    update.status = payload.status;

    if (payload.status === "published" && !existing.publishedAt) {
      update.publishedAt = new Date();
    }
  }

  await Blog.findByIdAndUpdate(id, { $set: update }, { new: true, runValidators: true });
  return presentAdmin(await loadBlog({ _id: id }), { full: true });
};

const deleteBlog = async (id) => {
  const blog = await Blog.findByIdAndDelete(id).lean();

  if (!blog) {
    throw new ApiError(404, "Blog not found");
  }

  await translationService.removeEntityTranslations("Blog", id);
  return { _id: blog._id, slug: blog.slug };
};

const getBlog = async (id) => presentAdmin(await loadBlog({ _id: id }), { full: true });

const getBlogBySlug = async (slug) => presentAdmin(await loadBlog({ slug }), { full: true });

const buildFilter = async ({ search, status, category, tag, featured, languages }) => {
  const filter = {};

  if (status) filter.status = status;
  if (tag) filter.tags = tag.toLowerCase();
  if (featured !== undefined) filter.featured = featured;

  if (category) {
    filter.category = await blogCategoryService.resolveCategoryId(category);
  }

  if (search) {
    const regex = containsRegex(search);
    const clauses = [{ slug: regex }, { tags: regex }];
    const langs = languages?.length ? languages : ["en", "ar"];

    for (const language of langs) {
      clauses.push({ [`locales.${language}.title`]: regex });
      clauses.push({ [`locales.${language}.excerpt`]: regex });
    }

    filter.$or = clauses;
  }

  return filter;
};

const listBlogs = async (query) => {
  const settings = await settingsService.getSettingsDocument();
  const filter = await buildFilter({ ...query, languages: settings.supportedLanguages });
  const result = await paginateQuery(withRelations(Blog.find(filter)), {
    page: query.page,
    limit: query.limit,
    sort: { publishedAt: -1, updatedAt: -1 },
  });

  return {
    items: result.items.map((blog) => presentAdmin(blog)),
    pagination: result.pagination,
  };
};

const publicBlog = async (blog, language) => {
  const locales = blog.locales || {};
  const selected = locales[language.code] || {};
  const fallback = locales.en || {};
  const locale = {
    title: selected.title || fallback.title || "",
    excerpt: selected.excerpt || fallback.excerpt || "",
    content: selected.content !== undefined && selected.content !== "" ? selected.content : fallback.content || "",
    seo: pickSeo({ [language.code]: selected.seo, en: fallback.seo }, language.code),
  };
  const resolved = await translationService.resolveContent(locale, language.code);
  const [overlaid] = await translationService.resolveMany({
    entityType: "Blog",
    documents: [{ _id: blog._id, title: resolved.title, excerpt: resolved.excerpt, content: resolved.content }],
    languageCode: language.code,
  });
  let categoryName = blog.category
    ? blogCategoryService.localizedText(
        await translationService.resolveContent(blog.category.name || {}, language.code),
        language.code
      )
    : "";

  if (blog.category?._id) {
    const [categoryCopy] = await translationService.resolveMany({
      entityType: "BlogCategory",
      documents: [{ _id: blog.category._id, name: categoryName }],
      languageCode: language.code,
      translatableFields: ["name"],
    });
    categoryName = categoryCopy.name;
  }

  const category = blog.category ? { slug: blog.category.slug, name: categoryName } : null;

  return {
    title: overlaid.title,
    slug: blog.slug,
    excerpt: overlaid.excerpt,
    content: overlaid.content,
    featuredImage: blog.featuredImage || "",
    gallery: blog.gallery || [],
    category,
    tags: blog.tags || [],
    author: blog.author?.name ? { name: blog.author.name } : null,
    featured: Boolean(blog.featured),
    publishedAt: blog.publishedAt,
    language: language.code,
    direction: language.direction,
    fallbackLanguage: language.isDefault ? null : language.fallbackCode || "en",
    seo: resolved.seo,
  };
};

const publicSummary = (blog) => {
  const { content, seo, gallery, ...summary } = blog;
  return summary;
};

const listPublicBlogs = async (query) => {
  await settingsService.assertPublicAvailable();
  const { language, settings } = await settingsService.resolveRequestedLanguage(query.lang);
  const filter = await buildFilter({
    ...query,
    status: "published",
    languages: settings.supportedLanguages,
  });
  const result = await paginateQuery(withRelations(Blog.find(filter)), {
    page: query.page,
    limit: query.limit,
    sort: { publishedAt: -1 },
  });
  const items = [];

  for (const blog of result.items) {
    items.push(publicSummary(await publicBlog(blog, language)));
  }

  return { items, pagination: result.pagination };
};

const getPublicBlog = async (slug, requestedLanguage) => {
  await settingsService.assertPublicAvailable();
  const { language } = await settingsService.resolveRequestedLanguage(requestedLanguage);
  const blog = await withRelations(Blog.findOne({ slug, status: "published" })).lean();

  if (!blog) {
    throw new ApiError(404, "Blog not found");
  }

  return publicBlog(blog, language);
};

const relatedBlogs = async (slug, requestedLanguage) => {
  await settingsService.assertPublicAvailable();
  const { language } = await settingsService.resolveRequestedLanguage(requestedLanguage);
  const blog = await Blog.findOne({ slug, status: "published" }).select("category").lean();

  if (!blog) {
    throw new ApiError(404, "Blog not found");
  }

  const filter = { status: "published", _id: { $ne: blog._id } };

  if (blog.category) {
    filter.category = blog.category;
  }

  const items = await withRelations(Blog.find(filter).sort({ publishedAt: -1 }).limit(3)).lean();
  const related = [];

  for (const item of items) {
    related.push(publicSummary(await publicBlog(item, language)));
  }

  return related;
};

const publishBlog = async (id, userId) => {
  const existing = await Blog.findById(id).lean();

  if (!existing) {
    throw new ApiError(404, "Blog not found");
  }

  return updateBlog(
    id,
    { status: "published", publishedAt: existing.publishedAt || new Date() },
    userId
  );
};

const unpublishBlog = async (id, userId) => updateBlog(id, { status: "draft" }, userId);

const previewBlog = async (id, requestedLanguage) => {
  const { language } = await settingsService.resolveRequestedLanguage(requestedLanguage);
  const blog = await loadBlog({ _id: id });
  const resolved = await publicBlog(blog, language);
  return { ...resolved, status: blog.status };
};

module.exports = {
  createBlog,
  updateBlog,
  deleteBlog,
  getBlog,
  getBlogBySlug,
  listBlogs,
  listPublicBlogs,
  getPublicBlog,
  relatedBlogs,
  publishBlog,
  unpublishBlog,
  previewBlog,
};
