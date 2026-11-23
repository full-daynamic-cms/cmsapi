require("dotenv").config();

const mongoose = require("mongoose");
const connectDB = require("../config/db");
const LandingPage = require("../models/LandingPage");
const Translation = require("../models/Translation");
const Section = require("../models/Section");
const Page = require("../models/Page");
const { SECTION_TYPES } = require("../config/cms");

const APPLY = process.argv.includes("--yes");
const FORCE = process.argv.includes("--force");
const TEXT_FIELDS = new Set([
  "title",
  "subtitle",
  "description",
  "label",
  "value",
  "name",
  "position",
  "company",
  "message",
  "text",
  "copyright",
  "group",
  "category",
  "question",
  "answer",
  "role",
  "bio",
  "caption",
  "alt",
]);

const keyFor = (sectionKey, path) =>
  `landing.${sectionKey}.${path}`
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/^[.-]+|[.-]+$/g, "");

const toRef = async (sectionKey, path, value, cache) => {
  if (typeof value !== "string" || !value.trim()) {
    return value;
  }

  const key = keyFor(sectionKey, path);

  if (!cache.has(key)) {
    cache.set(key, value);

    if (APPLY) {
      await Translation.updateOne(
        { key },
        {
          $setOnInsert: {
            key,
            translations: { en: value, ar: "" },
            category: "landing",
            description: `Migrated from landing page ${sectionKey} ${path}`,
            status: "active",
          },
        },
        { upsert: true }
      );
    }
  }

  return { $t: key };
};

const convertNode = async (sectionKey, path, value, cache) => {
  if (Array.isArray(value)) {
    const items = [];

    for (let index = 0; index < value.length; index += 1) {
      items.push(await convertNode(sectionKey, `${path}.${index}`, value[index], cache));
    }

    return items;
  }

  if (!value || typeof value !== "object") {
    return value;
  }

  const output = {};

  for (const [field, nested] of Object.entries(value)) {
    const nextPath = path ? `${path}.${field}` : field;

    if (TEXT_FIELDS.has(field) && typeof nested === "string") {
      output[field] = await toRef(sectionKey, nextPath, nested, cache);
    } else {
      output[field] = await convertNode(sectionKey, nextPath, nested, cache);
    }
  }

  return output;
};

const start = async () => {
  if (!process.env.MONGODB_URI) {
    throw new Error("MONGODB_URI is not defined");
  }

  await connectDB();
  const landingSections = await LandingPage.find().sort({ order: 1 }).lean();
  const cache = new Map();
  const sectionIds = [];

  console.log(`${APPLY ? "Applying" : "Dry run"}: ${landingSections.length} landing section(s).`);

  for (const landing of landingSections) {
    const type = SECTION_TYPES.includes(landing.sectionKey) ? landing.sectionKey : "custom";
    const content = await convertNode(
      landing.sectionKey,
      "",
      {
        title: landing.title,
        subtitle: landing.subtitle,
        description: landing.description,
        image: landing.image,
        imagePublicId: landing.imagePublicId,
        button: landing.button,
        items: landing.items,
      },
      cache
    );
    const settings = await convertNode(landing.sectionKey, "settings", landing.settings || {}, cache);
    settings.legacySectionKey = landing.sectionKey;
    const existing = await Section.findOne({ "settings.legacySectionKey": landing.sectionKey }).select("_id").lean();

    if (existing && !FORCE) {
      sectionIds.push({ section: existing._id, order: landing.order });
      console.log(`keep section ${landing.sectionKey}`);
      continue;
    }

    console.log(`${existing ? "update" : "create"} section ${landing.sectionKey}`);

    if (!APPLY) {
      continue;
    }

    const payload = {
      name: landing.sectionName,
      type,
      content,
      settings,
      status: landing.isActive ? "active" : "inactive",
      order: landing.order,
    };
    const saved = existing
      ? await Section.findByIdAndUpdate(existing._id, { $set: payload }, { new: true })
      : await Section.create(payload);
    sectionIds.push({ section: saved._id, order: landing.order });
  }

  const home = await Page.findOne({ slug: "home" }).select("_id").lean();

  if (home && !FORCE) {
    console.log("keep page home");
  } else if (!APPLY) {
    console.log(`${home ? "update" : "create"} page home`);
  } else if (sectionIds.length > 0) {
    const title = { $t: "landing.page.home.title" };
    await Translation.updateOne(
      { key: "landing.page.home.title" },
      {
        $setOnInsert: {
          key: "landing.page.home.title",
          translations: { en: "Home", ar: "" },
          category: "landing",
          description: "Migrated home page title",
          status: "active",
        },
      },
      { upsert: true }
    );
    const snapshot = { title, sections: sectionIds, seo: {} };
    const payload = {
      title,
      slug: "home",
      pageType: "home",
      status: "published",
      sections: sectionIds,
      seo: {},
      publishedSnapshot: snapshot,
      publishedAt: new Date(),
      hasUnpublishedChanges: false,
    };

    if (home) {
      await Page.findByIdAndUpdate(home._id, { $set: payload });
    } else {
      await Page.create(payload);
    }

    console.log("page home published");
  }

  if (!APPLY) {
    console.log("Dry run only. Re-run with --yes to write. Existing landing page documents are never deleted.");
  }
};

start()
  .catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.connection.close();
    }
  });
