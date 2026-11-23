const { OBJECT_ID_PATTERN } = require("../config/cms");
const ApiError = require("../utils/ApiError");

const requireObjectId = (param = "id") => (req, res, next) => {
  const value = req.params[param];

  if (typeof value !== "string" || !OBJECT_ID_PATTERN.test(value)) {
    next(new ApiError(400, "Invalid id"));
    return;
  }

  next();
};

module.exports = requireObjectId;
