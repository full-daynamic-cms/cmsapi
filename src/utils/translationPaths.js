const { isTranslationRef } = require("./translationRef");

const BLOCKED_SEGMENTS = new Set([
  "_id",
  "id",
  "__v",
  "slug",
  "price",
  "quantity",
  "sku",
  "barcode",
  "status",
  "order",
  "version",
  "featured",
  "author",
  "createdBy",
  "updatedBy",
  "createdAt",
  "updatedAt",
  "publishedAt",
  "pageType",
  "type",
  "sectionKey",
  "section",
  "image",
  "imagePublicId",
  "featuredImage",
  "gallery",
  "logo",
  "favicon",
  "icon",
  "link",
  "url",
  "href",
  "email",
  "phone",
  "canonicalUrl",
  "ogImage",
  "tags",
  "isActive",
  "isDefault",
  "isDeleted",
  "maintenanceMode",
  "singleton",
  "publicId",
  "password",
  "token",
]);

const UNSAFE_SEGMENTS = new Set(["__proto__", "constructor", "prototype"]);

const isPlainObject = (value) => {
  if (!value || typeof value !== "object" || Array.isArray(value) || value instanceof Date || value._bsontype) {
    return false;
  }

  return true;
};

const isBlockedSegment = (segment) => BLOCKED_SEGMENTS.has(segment) || UNSAFE_SEGMENTS.has(segment);

const isBlockedField = (field) => String(field || "").split(".").some((segment) => isBlockedSegment(segment));

const fieldMatches = (field, pattern) => {
  const left = String(field || "").split(".");
  const right = String(pattern || "").split(".");

  if (!left.length || left.length !== right.length) {
    return false;
  }

  return right.every((part, index) => (part === "*" ? /^[A-Za-z0-9_]+$/.test(left[index]) : part === left[index]));
};

const matchesAnyPattern = (field, patterns) => patterns.some((pattern) => fieldMatches(field, pattern));

const readPath = (document, path) => {
  const parts = String(path || "").split(".").filter(Boolean);
  let node = document;

  for (const part of parts) {
    if (!node || typeof node !== "object") {
      return undefined;
    }

    node = node[part];
  }

  return node;
};

const setPath = (document, path, value) => {
  const parts = String(path || "").split(".").filter(Boolean);

  if (!parts.length || parts.some((part) => UNSAFE_SEGMENTS.has(part))) {
    return false;
  }

  let node = document;

  for (let index = 0; index < parts.length - 1; index += 1) {
    if (!node || typeof node !== "object") {
      return false;
    }

    node = node[parts[index]];
  }

  if (!node || typeof node !== "object") {
    return false;
  }

  node[parts[parts.length - 1]] = value;
  return true;
};

const expandPattern = (document, pattern) => {
  const parts = String(pattern || "").split(".").filter(Boolean);
  const found = [];

  const walk = (node, index, prefix) => {
    if (node == null) {
      return;
    }

    if (index === parts.length) {
      if (typeof node === "string" || isTranslationRef(node)) {
        found.push(prefix.join("."));
      }

      return;
    }

    const part = parts[index];

    if (part === "*") {
      if (Array.isArray(node)) {
        node.forEach((item, itemIndex) => walk(item, index + 1, prefix.concat(String(itemIndex))));
        return;
      }

      if (isPlainObject(node)) {
        for (const [key, nested] of Object.entries(node)) {
          if (isBlockedSegment(key) || key.startsWith("$")) {
            continue;
          }

          walk(nested, index + 1, prefix.concat(key));
        }
      }

      return;
    }

    if (isBlockedSegment(part)) {
      return;
    }

    if (Array.isArray(node)) {
      const item = node[Number(part)];

      if (item !== undefined) {
        walk(item, index + 1, prefix.concat(part));
      }

      return;
    }

    if (isPlainObject(node) && Object.prototype.hasOwnProperty.call(node, part)) {
      walk(node[part], index + 1, prefix.concat(part));
    }
  };

  walk(document, 0, []);
  return found;
};

const cloneValue = (value) => {
  if (Array.isArray(value)) {
    return value.map(cloneValue);
  }

  if (!value || typeof value !== "object" || value instanceof Date || value._bsontype || Buffer.isBuffer?.(value)) {
    return value;
  }

  const output = {};

  for (const [key, nested] of Object.entries(value)) {
    output[key] = cloneValue(nested);
  }

  return output;
};

const detach = (document) => {
  if (!document || typeof document !== "object") {
    return document;
  }

  if (typeof document.toObject === "function") {
    return cloneValue(document.toObject());
  }

  return cloneValue(document);
};

const applyTranslations = (document, fieldMap, patterns = []) => {
  const entries = fieldMap instanceof Map ? [...fieldMap.entries()] : Object.entries(fieldMap || {});

  for (const [field, value] of entries) {
    if (typeof value !== "string" || !value.trim() || isBlockedField(field)) {
      continue;
    }

    if (patterns.length > 0 && !matchesAnyPattern(field, patterns)) {
      continue;
    }

    setPath(document, field, value);
  }

  return document;
};

module.exports = {
  BLOCKED_SEGMENTS,
  isBlockedField,
  fieldMatches,
  matchesAnyPattern,
  readPath,
  setPath,
  expandPattern,
  cloneValue,
  detach,
  applyTranslations,
};
