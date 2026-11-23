const BLOCKED_KEYS = new Set(["__proto__", "constructor", "prototype"]);

const sanitizeInPlace = (value) => {
  if (Array.isArray(value)) {
    value.forEach((item) => sanitizeInPlace(item));
    return;
  }

  if (!value || typeof value !== "object" || value instanceof Date) {
    return;
  }

  for (const key of Object.keys(value)) {
    if (BLOCKED_KEYS.has(key) || key.includes(".") || (key.startsWith("$") && key !== "$t")) {
      delete value[key];
      continue;
    }

    sanitizeInPlace(value[key]);
  }
};

const sanitizeRequest = (req, res, next) => {
  sanitizeInPlace(req.body);
  sanitizeInPlace(req.query);
  sanitizeInPlace(req.params);
  next();
};

module.exports = sanitizeRequest;
