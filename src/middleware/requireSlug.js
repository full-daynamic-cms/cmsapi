const ApiError = require("../utils/ApiError");

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

const requireSlug = (max = 140) => (req, res, next) => {
  const slug = typeof req.params.slug === "string" ? req.params.slug.trim().toLowerCase() : "";
  req.params.slug = slug;

  if (!slug || slug.length > max || !SLUG_PATTERN.test(slug)) {
    next(new ApiError(400, "Invalid slug"));
    return;
  }

  next();
};

module.exports = requireSlug;
