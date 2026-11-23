const ApiError = require("../utils/ApiError");

const buckets = new Map();

const rateLimit = ({ windowMs, max, name }) => (req, res, next) => {
  const now = Date.now();
  const ip = req.ip || req.socket?.remoteAddress || "unknown";
  const key = `${name}:${ip}`;
  const hits = (buckets.get(key) || []).filter((timestamp) => now - timestamp < windowMs);

  if (buckets.size > 5000) {
    buckets.clear();
  }

  if (hits.length >= max) {
    res.set("Retry-After", String(Math.ceil(windowMs / 1000)));
    next(new ApiError(429, "Too many requests"));
    return;
  }

  hits.push(now);
  buckets.set(key, hits);
  next();
};

module.exports = rateLimit;
