/**
 * Translation references are objects of the form { $t: "home.hero.title" }.
 * Plain strings, URLs, and image paths are never treated as keys.
 */

const isTranslationRef = (value) => {
  if (!value || typeof value !== "object" || Array.isArray(value) || value instanceof Date || value._bsontype) {
    return false;
  }

  const keys = Object.keys(value);
  return keys.length === 1 && keys[0] === "$t" && typeof value.$t === "string" && value.$t.length > 0;
};

const collectTranslationKeys = (value, keys = new Set()) => {
  if (isTranslationRef(value)) {
    keys.add(value.$t);
    return keys;
  }

  if (Array.isArray(value)) {
    value.forEach((item) => collectTranslationKeys(item, keys));
    return keys;
  }

  if (value && typeof value === "object" && !(value instanceof Date) && !value._bsontype) {
    Object.values(value).forEach((item) => collectTranslationKeys(item, keys));
  }

  return keys;
};

const mapTranslationRefs = (value, mapper) => {
  if (isTranslationRef(value)) {
    return mapper(value);
  }

  if (Array.isArray(value)) {
    return value.map((item) => mapTranslationRefs(item, mapper));
  }

  if (value && typeof value === "object" && !(value instanceof Date) && !value._bsontype) {
    const output = {};

    for (const [key, nested] of Object.entries(value)) {
      output[key] = mapTranslationRefs(nested, mapper);
    }

    return output;
  }

  return value;
};

module.exports = {
  isTranslationRef,
  collectTranslationKeys,
  mapTranslationRefs,
};
