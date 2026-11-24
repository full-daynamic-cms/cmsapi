const TEXT_LEAVES = [
  "title",
  "subtitle",
  "description",
  "buttonText",
  "caption",
  "label",
  "name",
  "position",
  "company",
  "message",
  "question",
  "answer",
  "value",
  "heading",
  "subheading",
  "eyebrow",
  "badge",
  "placeholder",
  "submitText",
  "copyright",
  "announcement",
  "address",
  "hours",
  "excerpt",
  "content",
  "text",
  "quote",
  "role",
  "category",
  "group",
];

const nestedLeaves = (prefix, collections) => {
  const paths = TEXT_LEAVES.map((leaf) => `${prefix}.${leaf}`);
  paths.push(`${prefix}.button.text`);

  for (const collection of collections) {
    for (const leaf of TEXT_LEAVES) {
      paths.push(`${prefix}.${collection}.*.${leaf}`);
    }

    paths.push(`${prefix}.${collection}.*.button.text`);
  }

  return paths;
};

const ENTITY_ALIASES = Object.freeze({
  page: "Page",
  pagesection: "Section",
  section: "Section",
  websitesettings: "WebsiteSettings",
  settings: "WebsiteSettings",
});

const ENTITY_FIELDS = Object.freeze({
  Page: Object.freeze(["title"]),
  Section: Object.freeze([
    "name",
    ...nestedLeaves("content", ["items", "questions", "features", "slides", "stats", "members"]),
    "settings.copyright",
    "settings.address",
    "settings.hours",
    "settings.announcement",
  ]),
  WebsiteSettings: Object.freeze([
    "websiteName",
    "contact.address",
    "maintenanceMessage",
    "footer.*",
    "header.*",
  ]),
});

const canonicalEntityType = (entityType) => {
  const value = typeof entityType === "string" ? entityType.trim() : "";

  if (!value) {
    return "";
  }

  if (ENTITY_FIELDS[value]) {
    return value;
  }

  return ENTITY_ALIASES[value.toLowerCase()] || value;
};

const fieldsFor = (entityType) => {
  const canonical = canonicalEntityType(entityType);
  return ENTITY_FIELDS[canonical] ? [...ENTITY_FIELDS[canonical]] : null;
};

const knownEntityTypes = () => Object.keys(ENTITY_FIELDS);

module.exports = {
  ENTITY_FIELDS,
  canonicalEntityType,
  fieldsFor,
  knownEntityTypes,
};
