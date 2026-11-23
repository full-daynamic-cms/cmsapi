const path = require("path");
const Media = require("../models/Media");
const Page = require("../models/Page");
const Section = require("../models/Section");
const Blog = require("../models/Blog");
const WebsiteSettings = require("../models/WebsiteSettings");
const ApiError = require("../utils/ApiError");
const { paginateQuery } = require("../utils/pagination");
const { containsRegex } = require("../utils/regex");
const { isConfigured } = require("../config/cloudinary");
const { uploadAsset, deleteManagedAssets, isManagedPublicId } = require("./mediaService");
const logger = require("../utils/logger");

const present = (media) => ({
  _id: media._id,
  filename: media.filename,
  originalName: media.originalName,
  mimeType: media.mimeType,
  size: media.size,
  url: media.url,
  publicId: media.publicId || "",
  resourceType: media.resourceType || "image",
  altText: media.altText || "",
  folder: media.folder || "general",
  uploadedBy: media.uploadedBy || null,
  createdAt: media.createdAt,
  updatedAt: media.updatedAt,
});

const safeName = (name) => path.basename(String(name || "file")).replace(/[^\w.\- ]+/g, "").slice(0, 180) || "file";

const uploadMedia = async ({ file, folder, altText, userId }) => {
  if (!isConfigured()) {
    throw new ApiError(500, "Cloudinary is not configured");
  }

  const resourceType = file.mimetype.startsWith("image/") ? "image" : "raw";
  const uploaded = await uploadAsset({
    buffer: file.buffer,
    folder: folder || "general",
    resourceType,
  });
  const originalName = safeName(file.originalname);
  const media = await Media.create({
    filename: uploaded.publicId.split("/").pop(),
    originalName,
    mimeType: file.mimetype,
    size: uploaded.bytes || file.size,
    url: uploaded.url,
    publicId: uploaded.publicId,
    resourceType: uploaded.resourceType || resourceType,
    altText: altText || "",
    folder: folder || "general",
    uploadedBy: userId || null,
  });

  return present(media.toObject());
};

const listMedia = async ({ page, limit, search, folder, mimeType }) => {
  const filter = {};

  if (folder) filter.folder = folder;
  if (mimeType) filter.mimeType = mimeType;

  if (search) {
    const regex = containsRegex(search);
    filter.$or = [{ originalName: regex }, { altText: regex }, { filename: regex }];
  }

  const result = await paginateQuery(Media.find(filter), {
    page,
    limit,
    sort: { createdAt: -1 },
  });

  return { items: result.items.map(present), pagination: result.pagination };
};

const getMedia = async (id) => {
  const media = await Media.findById(id).lean();

  if (!media) {
    throw new ApiError(404, "Media not found");
  }

  return present(media);
};

const updateMedia = async (id, payload) => {
  const media = await Media.findByIdAndUpdate(id, { $set: payload }, { new: true, runValidators: true }).lean();

  if (!media) {
    throw new ApiError(404, "Media not found");
  }

  return present(media);
};

const isReferencedByPublishedContent = async (media) => {
  const needles = [media.url, media.publicId].filter((value) => typeof value === "string" && value.length > 8);
  if (needles.length === 0) {
    return false;
  }

  const pages = await Page.find({ status: "published" }).select("title seo publishedSnapshot").lean();
  const sectionIds = pages.flatMap((page) => (page.publishedSnapshot?.sections || []).map((item) => item.section));
  const [sections, blogs, settings] = await Promise.all([
    sectionIds.length ? Section.find({ _id: { $in: sectionIds } }).select("content settings").lean() : [],
    Blog.find({ status: "published" }).select("locales featuredImage gallery").lean(),
    WebsiteSettings.findOne().select("logo favicon websiteName footer header defaultSeo custom").lean(),
  ]);
  const haystack = JSON.stringify({ pages, sections, blogs, settings });
  return needles.some((needle) => haystack.includes(needle));
};

const deleteMedia = async (id, { force = false } = {}) => {
  const media = await Media.findById(id).lean();

  if (!media) {
    throw new ApiError(404, "Media not found");
  }

  if (!force && (await isReferencedByPublishedContent(media))) {
    throw new ApiError(409, "Media is used by published content");
  }

  if (media.publicId && isManagedPublicId(media.publicId)) {
    await deleteManagedAssets([{ publicId: media.publicId, resourceType: media.resourceType }]);
  }

  await Media.deleteOne({ _id: id });
  logger.info(`Media deleted: ${media._id}`);
  return present(media);
};

const listFolders = async () => {
  const folders = await Media.distinct("folder");
  return folders.filter(Boolean).sort();
};

module.exports = {
  uploadMedia,
  listMedia,
  getMedia,
  updateMedia,
  deleteMedia,
  listFolders,
};
