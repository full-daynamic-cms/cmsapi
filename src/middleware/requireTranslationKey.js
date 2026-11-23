const { TRANSLATION_KEY_PATTERN } = require("../config/cms");
const ApiError = require("../utils/ApiError");

const requireTranslationKey = (req, res, next) => {
  const key = typeof req.params.key === "string" ? req.params.key.trim().toLowerCase() : "";
  req.params.key = key;

  if (!key || key.length > 160 || !TRANSLATION_KEY_PATTERN.test(key)) {
    next(new ApiError(400, "Invalid translation key"));
    return;
  }

  next();
};

module.exports = requireTranslationKey;
