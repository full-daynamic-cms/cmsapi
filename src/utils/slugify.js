const { SLUG_PATTERN } = require("../config/cms");

const slugify = (value) =>
  String(value || "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 120);

const isSlug = (value) => typeof value === "string" && value.length <= 120 && SLUG_PATTERN.test(value);

module.exports = { slugify, isSlug };
