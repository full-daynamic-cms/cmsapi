const SECTION_TYPES = Object.freeze([
  "header",
  "hero",
  "about",
  "services",
  "features",
  "statistics",
  "testimonials",
  "team",
  "gallery",
  "pricing",
  "faq",
  "contact",
  "cta",
  "partners",
  "footer",
  "projects",
  "process",
  "why-us",
  "custom",
]);

const PAGE_TYPES = Object.freeze([
  "home",
  "about",
  "services",
  "contact",
  "blogs",
  "faq",
  "privacy",
  "terms",
  "custom",
]);

const PAGE_STATUSES = Object.freeze(["draft", "published", "archived"]);
const SECTION_STATUSES = Object.freeze(["active", "inactive"]);
const BLOG_STATUSES = Object.freeze(["draft", "published", "archived"]);
const CATEGORY_STATUSES = Object.freeze(["active", "inactive"]);
const TRANSLATION_STATUSES = Object.freeze(["active", "inactive"]);
const CONTACT_STATUSES = Object.freeze(["new", "read", "replied", "archived"]);

const LANGUAGE_PATTERN = /^[a-z]{2,8}$/;
const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const TRANSLATION_KEY_PATTERN = /^[a-z0-9]+(?:[._-][a-z0-9]+)*$/;
const OBJECT_ID_PATTERN = /^[a-f\d]{24}$/i;

const BUILTIN_LANGUAGES = Object.freeze({
  en: { code: "en", name: "English", direction: "ltr" },
  ar: { code: "ar", name: "Arabic", direction: "rtl" },
});

const describeLanguage = (code) => {
  const normalized = typeof code === "string" ? code.trim().toLowerCase() : "";

  if (!LANGUAGE_PATTERN.test(normalized)) {
    return null;
  }

  return BUILTIN_LANGUAGES[normalized] || { code: normalized, name: normalized, direction: "ltr" };
};

const MEDIA_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/avif",
  "application/pdf",
  "text/plain",
  "text/csv",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]);

const MEDIA_MAX_BYTES = 10 * 1024 * 1024;

module.exports = {
  SECTION_TYPES,
  PAGE_TYPES,
  PAGE_STATUSES,
  SECTION_STATUSES,
  BLOG_STATUSES,
  CATEGORY_STATUSES,
  TRANSLATION_STATUSES,
  CONTACT_STATUSES,
  LANGUAGE_PATTERN,
  SLUG_PATTERN,
  TRANSLATION_KEY_PATTERN,
  OBJECT_ID_PATTERN,
  BUILTIN_LANGUAGES,
  describeLanguage,
  MEDIA_MIME_TYPES,
  MEDIA_MAX_BYTES,
};
