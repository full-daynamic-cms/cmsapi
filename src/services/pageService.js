const Page = require("../models/Page");
const Section = require("../models/Section");
const ApiError = require("../utils/ApiError");
const { paginateQuery } = require("../utils/pagination");
const { containsRegex } = require("../utils/regex");
const { slugify } = require("../utils/slugify");
const translationService = require("./translationService");
const settingsService = require("./settingsService");
const { pickSeo } = require("./seoService");

const normalizeRefs = (sections = []) => {
  const seen = new Set();

  return sections.map((item, index) => {
    const id = String(item.section || item.id || item);

    if (seen.has(id)) {
      throw new ApiError(400, "Validation failed", [{ field: "sections", message: "sections contains a duplicate section" }]);
    }

    seen.add(id);
    return {
      section: id,
      order: Number.isInteger(item.order) ? item.order : index,
    };
  });
};

const assertSectionsExist = async (refs) => {
  if (refs.length === 0) {
    return;
  }

  const ids = refs.map((item) => item.section);
  const found = await Section.find({ _id: { $in: ids } }).select("_id").lean();
  const existing = new Set(found.map((item) => String(item._id)));
  const missing = ids.filter((id) => !existing.has(String(id)));

  if (missing.length > 0) {
    throw new ApiError(404, `Section not found: ${missing.join(", ")}`);
  }
};

const snapshotFrom = (page) => ({
  title: page.title,
  sections: (page.sections || []).map((item) => ({
    section: item.section,
    order: item.order,
  })),
  seo: page.seo || {},
});

const attachSections = async (pages) => {
  const ids = [...new Set(pages.flatMap((page) => (page.sections || []).map((item) => String(item.section))))];
  const sections = ids.length ? await Section.find({ _id: { $in: ids } }).lean() : [];
  const byId = new Map(sections.map((section) => [String(section._id), section]));

  return pages.map((page) => ({
    _id: page._id,
    title: page.title,
    slug: page.slug,
    pageType: page.pageType,
    status: page.status,
    sections: (page.sections || [])
      .map((item) => {
        const section = byId.get(String(item.section));
        return {
          order: item.order,
          section: section
            ? {
                _id: section._id,
                name: section.name,
                type: section.type,
                status: section.status,
                content: section.content || {},
                settings: section.settings || {},
              }
            : item.section,
        };
      })
      .sort((left, right) => left.order - right.order),
    seo: page.seo || {},
    publishedAt: page.publishedAt,
    hasUnpublishedChanges: page.hasUnpublishedChanges,
    version: page.version,
    createdBy: page.createdBy || null,
    updatedBy: page.updatedBy || null,
    createdAt: page.createdAt,
    updatedAt: page.updatedAt,
  }));
};

const presentOne = async (page) => {
  const [presented] = await attachSections([page]);
  return presented;
};

const reserveSlug = async (slug, ignoreId) => {
  const filter = { slug };

  if (ignoreId) {
    filter._id = { $ne: ignoreId };
  }

  const existing = await Page.exists(filter);

  if (existing) {
    throw new ApiError(409, "Page slug already exists");
  }
};

const applyPublishState = (update, existing, payload) => {
  const contentTouched = ["title", "sections", "seo", "slug", "pageType"].some((field) =>
    Object.prototype.hasOwnProperty.call(payload, field)
  );

  if (!existing) {
    update.status = payload.status || "draft";
  } else if (payload.status) {
    update.status = payload.status;
  }

  const publishing = payload.status === "published" || (!existing && update.status === "published");

  if (publishing) {
    update.publishedSnapshot = snapshotFrom({
      title: update.title !== undefined ? update.title : existing?.title,
      sections: update.sections !== undefined ? update.sections : existing?.sections || [],
      seo: update.seo !== undefined ? update.seo : existing?.seo || {},
    });
    update.publishedAt = existing?.publishedAt || new Date();
    update.hasUnpublishedChanges = false;
    return;
  }

  if (contentTouched) {
    update.hasUnpublishedChanges = true;
  }
};

const createPage = async (payload, userId) => {
  const slug = payload.slug || slugify(typeof payload.title === "string" ? payload.title : "");

  if (!slug) {
    throw new ApiError(400, "Validation failed", [{ field: "slug", message: "slug is required" }]);
  }

  await reserveSlug(slug);
  const sections = normalizeRefs(payload.sections || []);
  await assertSectionsExist(sections);
  const update = {
    title: payload.title,
    slug,
    pageType: payload.pageType || "custom",
    sections,
    seo: payload.seo || {},
    version: 1,
    createdBy: userId || null,
    updatedBy: userId || null,
  };
  applyPublishState(update, null, payload);
  const page = await Page.create(update);
  return presentOne(page.toObject());
};

const updatePage = async (id, payload, userId) => {
  const existing = await Page.findById(id).lean();

  if (!existing) {
    throw new ApiError(404, "Page not found");
  }

  const update = { updatedBy: userId || null, version: (existing.version || 1) + 1 };

  if (payload.title !== undefined) update.title = payload.title;
  if (payload.pageType !== undefined) update.pageType = payload.pageType;
  if (payload.seo !== undefined) update.seo = payload.seo;

  if (payload.slug && payload.slug !== existing.slug) {
    await reserveSlug(payload.slug, id);
    update.slug = payload.slug;
  }

  if (payload.sections) {
    const sections = normalizeRefs(payload.sections);
    await assertSectionsExist(sections);
    update.sections = sections;
  }

  applyPublishState(update, { ...existing, ...update }, payload);
  const page = await Page.findByIdAndUpdate(id, { $set: update }, { new: true, runValidators: true }).lean();
  return presentOne(page);
};

const deletePage = async (id) => {
  const page = await Page.findByIdAndDelete(id).lean();

  if (!page) {
    throw new ApiError(404, "Page not found");
  }

  return { _id: page._id, slug: page.slug, title: page.title };
};

const getPageById = async (id) => {
  const page = await Page.findById(id).lean();

  if (!page) {
    throw new ApiError(404, "Page not found");
  }

  return presentOne(page);
};

const getPageBySlug = async (slug) => {
  const page = await Page.findOne({ slug }).lean();

  if (!page) {
    throw new ApiError(404, "Page not found");
  }

  return presentOne(page);
};

const listPages = async ({ page, limit, search, status, pageType }) => {
  const filter = {};

  if (status) filter.status = status;
  if (pageType) filter.pageType = pageType;

  if (search) {
    const regex = containsRegex(search);
    filter.$or = [{ slug: regex }, { title: regex }, { pageType: regex }];
  }

  const result = await paginateQuery(Page.find(filter), {
    page,
    limit,
    sort: { updatedAt: -1 },
  });
  const items = await attachSections(result.items);
  return { items, pagination: result.pagination };
};

const setPageSections = async (id, sectionsInput, userId) => {
  return updatePage(id, { sections: sectionsInput }, userId);
};

const publishPage = async (id, userId) => {
  const existing = await Page.findById(id).lean();

  if (!existing) {
    throw new ApiError(404, "Page not found");
  }

  return updatePage(id, { status: "published" }, userId);
};

const unpublishPage = async (id, userId) => {
  const existing = await Page.findById(id).lean();

  if (!existing) {
    throw new ApiError(404, "Page not found");
  }

  const page = await Page.findByIdAndUpdate(
    id,
    {
      $set: {
        status: "draft",
        updatedBy: userId || null,
        version: (existing.version || 1) + 1,
      },
    },
    { new: true, runValidators: true }
  ).lean();

  return presentOne(page);
};

const composePublicPage = async (page, language, { includeInactive = false, source = "published" } = {}) => {
  const working = source === "working" ? page : page.publishedSnapshot || page;
  const refs = (working.sections || []).slice().sort((left, right) => left.order - right.order);
  const ids = refs.map((item) => item.section);
  const sections = ids.length
    ? await Section.find({ _id: { $in: ids } }).select("name type content settings status").lean()
    : [];
  const byId = new Map(sections.map((section) => [String(section._id), section]));
  const visible = refs
    .map((item) => {
      const section = byId.get(String(item.section));

      if (!section || (!includeInactive && section.status !== "active")) {
        return null;
      }

      const payload = {
        type: section.type,
        order: item.order,
        content: section.content || {},
      };

      if (includeInactive) {
        payload.status = section.status;
        payload.id = section._id;
        payload.name = section.name;
      }

      if (section.settings && Object.keys(section.settings).length > 0) {
        payload.settings = section.settings;
      }

      return payload;
    })
    .filter(Boolean);
  const seo = pickSeo(working.seo || page.seo, language.code);
  const resolved = await translationService.resolveContent(
    {
      title: working.title,
      sections: visible,
      seo,
    },
    language.code
  );

  return {
    title: resolved.title,
    slug: page.slug,
    pageType: page.pageType,
    language: language.code,
    direction: language.direction,
    fallbackLanguage: language.code === "en" ? null : "en",
    sections: resolved.sections,
    seo: resolved.seo,
  };
};

const getPublicPage = async (slug, requestedLanguage) => {
  await settingsService.assertPublicAvailable();
  const { language } = await settingsService.resolveRequestedLanguage(requestedLanguage);
  const page = await Page.findOne({ slug, status: "published" }).lean();

  if (!page) {
    throw new ApiError(404, "Page not found");
  }

  return composePublicPage(page, language);
};

const listPublicPages = async ({ page, limit, requestedLanguage }) => {
  await settingsService.assertPublicAvailable();
  const { language } = await settingsService.resolveRequestedLanguage(requestedLanguage);
  const result = await paginateQuery(Page.find({ status: "published" }), {
    page,
    limit,
    sort: { publishedAt: -1, slug: 1 },
  });
  const items = [];

  for (const entry of result.items) {
    const resolved = await translationService.resolveContent(entry.publishedSnapshot?.title || entry.title, language.code);
    items.push({
      title: resolved,
      slug: entry.slug,
      pageType: entry.pageType,
      language: language.code,
      direction: language.direction,
      publishedAt: entry.publishedAt,
    });
  }

  return { items, pagination: result.pagination };
};

const previewPage = async (id, requestedLanguage) => {
  const { language } = await settingsService.resolveRequestedLanguage(requestedLanguage);
  const page = await Page.findById(id).lean();

  if (!page) {
    throw new ApiError(404, "Page not found");
  }

  const resolved = await composePublicPage(page, language, { includeInactive: true, source: "working" });
  return {
    ...resolved,
    status: page.status,
    hasUnpublishedChanges: page.hasUnpublishedChanges,
  };
};

module.exports = {
  createPage,
  updatePage,
  deletePage,
  getPageById,
  getPageBySlug,
  listPages,
  setPageSections,
  publishPage,
  unpublishPage,
  getPublicPage,
  listPublicPages,
  previewPage,
};
