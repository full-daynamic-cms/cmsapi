const DEFAULT_TTL_MS = 30 * 1000;
const buckets = new Map();

const get = (key) => {
  const hit = buckets.get(key);

  if (!hit) {
    return null;
  }

  if (Date.now() - hit.at > hit.ttl) {
    buckets.delete(key);
    return null;
  }

  return hit.value;
};

const set = (key, value, ttl = DEFAULT_TTL_MS) => {
  buckets.set(key, { value, at: Date.now(), ttl });
  return value;
};

const invalidate = (prefix) => {
  if (!prefix) {
    buckets.clear();
    return;
  }

  for (const key of buckets.keys()) {
    if (key === prefix || key.startsWith(prefix)) {
      buckets.delete(key);
    }
  }
};

module.exports = {
  DEFAULT_TTL_MS,
  get,
  set,
  invalidate,
};
