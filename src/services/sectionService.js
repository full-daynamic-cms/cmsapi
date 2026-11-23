const Section = require("../models/Section");
const Page = require("../models/Page");
const ApiError = require("../utils/ApiError");
const { paginateQuery } = require("../utils/pagination");
const { containsRegex } = require("../utils/regex");
const { OBJECT_ID_PATTERN } = require("../config/cms");
const translationService = require("./translationService");
const { assertContent, assertSettings } = require("../validators/sectionValidator");

const present = (section) => {
  if (!section) {
    return section;
  }

  return {
    _id: section._id,
    name: section.name,
    type: section.type,
    content: section.content || {},
    settings: section.settings || {},
    status: section.status,
    order: section.order,
    createdBy: section.createdBy || null,
    updatedBy: section.updatedBy || null,
    createdAt: section.createdAt,
    updatedAt: section.updatedAt,
  };
};

const createSection = async (payload, userId) => {
  const section = await Section.create({
    ...payload,
    content: payload.content || {},
    settings: payload.settings || {},
    createdBy: userId || null,
    updatedBy: userId || null,
  });

  return present(section.toObject());
};

const updateSection = async (id, payload, userId) => {
  const existing = await Section.findById(id).lean();

  if (!existing) {
    throw new ApiError(404, "Section not found");
  }

  const update = { ...payload, updatedBy: userId || null };
  const nextType = payload.type || existing.type;

  if (payload.content || (payload.type && payload.type !== existing.type)) {
    update.content = assertContent(nextType, payload.content || existing.content || {});
  }

  if (payload.settings) {
    update.settings = assertSettings(payload.settings);
  }

  const section = await Section.findByIdAndUpdate(id, { $set: update }, { new: true, runValidators: true }).lean();
  return present(section);
};

const getSectionById = async (id) => {
  const section = await Section.findById(id).lean();

  if (!section) {
    throw new ApiError(404, "Section not found");
  }

  return present(section);
};

const listSections = async ({ page, limit, search, type, status, pageId }) => {
  const filter = {};

  if (type) {
    filter.type = type;
  }

  if (status) {
    filter.status = status;
  }

  if (search) {
    filter.name = containsRegex(search);
  }

  let sort = { order: 1, createdAt: 1 };

  if (pageId) {
    if (!OBJECT_ID_PATTERN.test(pageId)) {
      throw new ApiError(400, "Invalid id");
    }

    const owner = await Page.findById(pageId).select("sections").lean();

    if (!owner) {
      throw new ApiError(404, "Page not found");
    }

    const ids = owner.sections.map((item) => item.section);
    filter._id = { $in: ids };
    const result = await Section.find(filter).lean();
    const byId = new Map(result.map((section) => [String(section._id), section]));
    const items = owner.sections
      .map((item) => {
        const section = byId.get(String(item.section));
        return section ? { ...present(section), order: item.order } : null;
      })
      .filter(Boolean)
      .filter((section) => (status ? section.status === status : true) && (type ? section.type === type : true));

    return {
      items,
      pagination: {
        total: items.length,
        page: 1,
        limit: items.length || limit,
        totalPages: items.length ? 1 : 0,
      },
    };
  }

  const result = await paginateQuery(Section.find(filter), { page, limit, sort });
  return { items: result.items.map(present), pagination: result.pagination };
};

const deleteSection = async (id, { force = false } = {}) => {
  const section = await Section.findById(id).lean();

  if (!section) {
    throw new ApiError(404, "Section not found");
  }

  const inUse = await Page.exists({
    $or: [{ "sections.section": id }, { "publishedSnapshot.sections.section": id }],
  });

  if (inUse && !force) {
    throw new ApiError(409, "Section is assigned to a page");
  }

  if (inUse && force) {
    await Page.updateMany({ "sections.section": id }, { $pull: { sections: { section: id } } });
    await Page.updateMany(
      { "publishedSnapshot.sections.section": id },
      { $pull: { "publishedSnapshot.sections": { section: id } } }
    );
  }

  await Section.deleteOne({ _id: id });
  return present(section);
};

const setStatus = async (id, status, userId) => {
  const section = await Section.findById(id);

  if (!section) {
    throw new ApiError(404, "Section not found");
  }

  section.status = status || (section.status === "active" ? "inactive" : "active");
  section.updatedBy = userId || null;
  await section.save();
  return present(section.toObject());
};

const reorderSections = async (sections, userId) => {
  const ids = sections.map((section) => section.id);
  const existing = await Section.find({ _id: { $in: ids } }).select("_id").lean();
  const found = new Set(existing.map((section) => String(section._id)));
  const missing = ids.filter((id) => !found.has(String(id)));

  if (missing.length > 0) {
    throw new ApiError(404, `Section not found: ${missing.join(", ")}`);
  }

  const now = new Date();
  await Section.bulkWrite(
    sections.map((section) => ({
      updateOne: {
        filter: { _id: section.id },
        update: { $set: { order: section.order, updatedBy: userId || null, updatedAt: now } },
      },
    }))
  );

  const updated = await Section.find({ _id: { $in: ids } }).sort({ order: 1, name: 1 }).lean();
  return updated.map(present);
};

const duplicateSection = async (id, { name, assignToPage } = {}, userId) => {
  const source = await Section.findById(id).lean();

  if (!source) {
    throw new ApiError(404, "Section not found");
  }

  if (assignToPage && !OBJECT_ID_PATTERN.test(assignToPage)) {
    throw new ApiError(400, "Invalid id");
  }

  if (assignToPage) {
    const page = await Page.exists({ _id: assignToPage });

    if (!page) {
      throw new ApiError(404, "Page not found");
    }
  }

  const content = await translationService.duplicateTranslationTree(source.content || {}, userId);
  const settings = await translationService.duplicateTranslationTree(source.settings || {}, userId);
  const copy = await Section.create({
    name: name || `${source.name} copy`.slice(0, 120),
    type: source.type,
    content,
    settings,
    status: source.status,
    order: source.order,
    createdBy: userId || null,
    updatedBy: userId || null,
  });

  if (assignToPage) {
    const page = await Page.findById(assignToPage);

    if (!page) {
      throw new ApiError(404, "Page not found");
    }

    const nextOrder = page.sections.reduce((max, item) => Math.max(max, item.order), -1) + 1;
    page.sections.push({ section: copy._id, order: nextOrder });
    page.hasUnpublishedChanges = true;
    page.updatedBy = userId || null;
    page.version += 1;
    await page.save();
  }

  return present(copy.toObject());
};

module.exports = {
  present,
  createSection,
  updateSection,
  getSectionById,
  listSections,
  deleteSection,
  setStatus,
  reorderSections,
  duplicateSection,
};
