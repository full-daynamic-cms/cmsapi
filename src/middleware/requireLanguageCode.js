const { LANGUAGE_PATTERN } = require("../config/cms");
const ApiError = require("../utils/ApiError");

const requireLanguageCode = (param = "languageCode") => (req, res, next) => {
  const value = typeof req.params[param] === "string" ? req.params[param].trim().toLowerCase() : "";
  req.params[param] = value;

  if (!LANGUAGE_PATTERN.test(value)) {
    next(new ApiError(400, "Invalid language code"));
    return;
  }

  next();
};

module.exports = requireLanguageCode;
