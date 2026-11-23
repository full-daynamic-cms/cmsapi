require("dotenv").config();

const mongoose = require("mongoose");
const connectDB = require("../config/db");
const { SECTION_TYPES } = require("../config/cms");
const { fieldsFor } = require("../config/translatableFields");
const Page = require("../models/Page");
const Section = require("../models/Section");
const Translation = require("../models/Translation");
const WebsiteSettings = require("../models/WebsiteSettings");
const languageService = require("../services/languageService");
const contentTranslationService = require("../services/contentTranslationService");
const { getSettingsDocument } = require("../services/settingsService");
const { expandPattern, readPath } = require("../utils/translationPaths");
const defaultSections = require("./defaultSections");

const SEED_SOURCE = "cms-seed";
const LANGUAGE = "ar";

const AR = {
  Header: "الترويسة",
  Hero: "الواجهة",
  About: "من نحن",
  Services: "الخدمات",
  Projects: "المشاريع",
  "Why Us": "لماذا نحن",
  Process: "آلية العمل",
  Testimonials: "آراء العملاء",
  CTA: "دعوة",
  Contact: "تواصل معنا",
  Footer: "التذييل",
  Home: "الرئيسية",
  "Get a Quote": "اطلب عرض سعر",
  "Building spaces that last": "نبني مساحات تدوم",
  "Commercial and residential construction": "إنشاءات تجارية وسكنية",
  "Commercial and residential construction.": "إنشاءات تجارية وسكنية.",
  "Disciplined construction for offices, homes, and mixed-use developments.":
    "تنفيذ منضبط للمكاتب والمنازل والمشاريع متعددة الاستخدامات.",
  "Start a project": "ابدأ مشروعًا",
  "A builder focused on the long term": "بنّاء يركز على المدى البعيد",
  "About the company": "عن الشركة",
  "We plan carefully, build cleanly, and stay accountable from the first site visit through handover.":
    "نخطط بعناية، ونبني بإتقان، ونبقى مسؤولين من أول زيارة للموقع حتى التسليم.",
  "Our process": "آلية عملنا",
  Years: "سنوات",
  "Delivering commercial and residential work.": "ننفذ أعمالًا تجارية وسكنية.",
  "Completed across the region.": "أُنجزت في مختلف أنحاء المنطقة.",
  Trades: "حرف",
  "Coordinated under one site team.": "تُنسَّق ضمن فريق موقع واحد.",
  "Full-spectrum construction": "إنشاءات متكاملة",
  "Professional construction services.": "خدمات إنشاء احترافية.",
  "Commercial Construction": "الإنشاءات التجارية",
  "Offices, retail, and mixed-use buildings.": "مكاتب ومحال تجارية ومبانٍ متعددة الاستخدامات.",
  "Residential Construction": "الإنشاءات السكنية",
  "Professional residential construction.": "إنشاءات سكنية احترافية.",
  Renovation: "الترميم والتجديد",
  "Structural and interior renovations with occupied-site care.": "ترميم إنشائي وداخلي مع مراعاة المواقع المشغولة.",
  "Selected work": "أعمال مختارة",
  "A sample of recently completed buildings.": "نماذج من المباني التي أُنجزت مؤخرًا.",
  "Harbor House": "بيت المرفأ",
  Residential: "سكني",
  "A four-storey residential building delivered on a tight urban site.": "مبنى سكني من أربعة طوابق نُفّذ في موقع حضري ضيق.",
  "North Exchange": "نورث إكستشينج",
  Commercial: "تجاري",
  "Office and retail space built for a mixed-use block.": "مكاتب ومساحات تجارية ضمن مجمع متعدد الاستخدامات.",
  "Why teams hire us": "لماذا تختارنا الفرق",
  "Clear scope, a steady site, and a finish that matches the drawings.": "نطاق واضح، وموقع منضبط، وتشطيب يطابق المخططات.",
  "Documented scope": "نطاق موثّق",
  "Budgets and schedules are written down before work starts.": "تُكتب الميزانيات والجداول قبل بدء العمل.",
  "One site lead": "قائد موقع واحد",
  "Trades, inspections, and client updates run through a single lead.": "تمر الحرف والتفتيش وتحديثات العميل عبر قائد واحد.",
  "Finish standards": "معايير التشطيب",
  "Handover includes a punch list, manuals, and as-built notes.": "يشمل التسليم قائمة الملاحظات والأدلة ومخططات ما تم تنفيذه.",
  "How a project moves": "كيف يسير المشروع",
  "Four stages from the first call to handover.": "أربع مراحل من أول اتصال حتى التسليم.",
  Consult: "الاستشارة",
  "Walk the site, confirm the brief, and flag constraints.": "نعاين الموقع، ونؤكد المطلوب، ونبيّن القيود.",
  Plan: "التخطيط",
  "Lock scope, budget, schedule, and procurement.": "نثبّت النطاق والميزانية والجدول والمشتريات.",
  Build: "التنفيذ",
  "Run the site with weekly progress and cost updates.": "ندير الموقع مع تحديث أسبوعي للتقدم والتكلفة.",
  Handover: "التسليم",
  "Complete inspections, punch list, and closeout documents.": "نُتم التفتيش وقائمة الملاحظات ووثائق الإغلاق.",
  "Client notes": "ملاحظات العملاء",
  "Feedback from recent project owners.": "آراء أصحاب المشاريع الأخيرة.",
  "John Doe": "جون دو",
  CEO: "الرئيس التنفيذي",
  "ABC Company": "شركة إيه بي سي",
  "Excellent service. The team kept the schedule visible and the site orderly.":
    "خدمة ممتازة. أبقى الفريق الجدول واضحًا والموقع منظمًا.",
  "Amira Shah": "أميرة شاه",
  "Development Manager": "مديرة التطوير",
  "Clear communication from demolition through handover.": "تواصل واضح من الهدم حتى التسليم.",
  "Planning a build?": "تخطط لمشروع بناء؟",
  "Tell us about the site": "أخبرنا عن الموقع",
  "Share the location, timeline, and what you want built. We will reply with the next step.":
    "شارك الموقع والمدة وما تريد بناءه. سنرد بالخطوة التالية.",
  "Request a consultation": "اطلب استشارة",
  "Call, email, or send a note about your project.": "اتصل أو راسلنا أو أرسل ملاحظة عن مشروعك.",
  "100 Builder Street": "شارع البنّاء 100",
  "Monday to Friday, 8:00 to 17:00": "من الاثنين إلى الجمعة، 8:00 إلى 17:00",
  "Projects desk": "مكتب المشاريع",
  "Site line": "خط الموقع",
  Explore: "استكشف",
  Company: "الشركة",
  "All rights reserved.": "جميع الحقوق محفوظة.",
  "Northline Builders": "نورثلاين للإنشاءات",
  "We are updating the site. Please check back shortly.": "نحدّث الموقع الآن. يرجى العودة بعد قليل.",
};

const STATIC_WORDS = [
  ["common.home", "الرئيسية"],
  ["common.about", "من نحن"],
  ["common.services", "الخدمات"],
  ["common.projects", "المشاريع"],
  ["common.process", "آلية العمل"],
  ["common.contact", "تواصل معنا"],
  ["common.get-quote", "اطلب عرض سعر"],
  ["common.read-more", "اقرأ المزيد"],
  ["common.learn-more", "اعرف المزيد"],
  ["common.view-project", "عرض المشروع"],
  ["common.submit", "إرسال"],
  ["common.send-message", "أرسل الرسالة"],
  ["common.menu", "القائمة"],
  ["common.close", "إغلاق"],
  ["common.language", "اللغة"],
  ["common.search", "بحث"],
  ["common.loading", "جارٍ التحميل"],
  ["common.back", "رجوع"],
  ["common.next", "التالي"],
  ["common.previous", "السابق"],
  ["form.name", "الاسم"],
  ["form.email", "البريد الإلكتروني"],
  ["form.phone", "الهاتف"],
  ["form.message", "الرسالة"],
  ["form.subject", "الموضوع"],
  ["form.required", "هذا الحقل مطلوب"],
  ["form.success", "تم إرسال رسالتك."],
  ["footer.rights", "جميع الحقوق محفوظة."],
];

const PAGES = [
  {
    slug: "home",
    title: "Home",
    pageType: "home",
    sectionKeys: [
      "header",
      "hero",
      "about",
      "services",
      "projects",
      "why-us",
      "process",
      "testimonials",
      "cta",
      "contact",
      "footer",
    ],
    seo: {
      en: {
        metaTitle: "Northline Builders | Construction",
        metaDescription: "Commercial and residential construction for offices, homes, and mixed-use developments.",
        keywords: ["construction", "commercial", "residential"],
      },
      ar: {
        metaTitle: "نورثلاين للإنشاءات | المقاولات",
        metaDescription: "إنشاءات تجارية وسكنية للمكاتب والمنازل والمشاريع متعددة الاستخدامات.",
        keywords: ["إنشاءات", "مقاولات", "سكني", "تجاري"],
      },
    },
  },
  {
    slug: "about",
    title: "About",
    pageType: "about",
    sectionKeys: ["header", "about", "why-us", "cta", "footer"],
    seo: {
      en: {
        metaTitle: "About | Northline Builders",
        metaDescription: "A builder focused on careful planning, clean construction, and accountable handover.",
        keywords: ["about", "construction company"],
      },
      ar: {
        metaTitle: "من نحن | نورثلاين للإنشاءات",
        metaDescription: "بنّاء يركز على التخطيط الدقيق والتنفيذ النظيف والتسليم المسؤول.",
        keywords: ["من نحن", "شركة إنشاءات"],
      },
    },
  },
  {
    slug: "services",
    title: "Services",
    pageType: "services",
    sectionKeys: ["header", "services", "process", "cta", "footer"],
    seo: {
      en: {
        metaTitle: "Services | Northline Builders",
        metaDescription: "Commercial construction, residential construction, and renovation.",
        keywords: ["services", "renovation"],
      },
      ar: {
        metaTitle: "الخدمات | نورثلاين للإنشاءات",
        metaDescription: "إنشاءات تجارية وسكنية وترميم.",
        keywords: ["الخدمات", "ترميم"],
      },
    },
  },
  {
    slug: "contact",
    title: "Contact",
    pageType: "contact",
    sectionKeys: ["header", "contact", "cta", "footer"],
    seo: {
      en: {
        metaTitle: "Contact | Northline Builders",
        metaDescription: "Call, email, or send a note about your project.",
        keywords: ["contact", "quote"],
      },
      ar: {
        metaTitle: "تواصل معنا | نورثلاين للإنشاءات",
        metaDescription: "اتصل أو راسلنا أو أرسل ملاحظة عن مشروعك.",
        keywords: ["تواصل", "عرض سعر"],
      },
    },
  },
];

const WEBSITE = {
  websiteName: "Northline Builders",
  contact: {
    email: "hello@example.com",
    phone: "+1 (000) 000-0000",
    address: "100 Builder Street",
  },
  maintenanceMessage: "We are updating the site. Please check back shortly.",
};

const ignoredText = (value) => {
  const text = String(value || "").trim();

  if (!text) {
    return true;
  }

  if (text.includes("@") || text.startsWith("#") || text.startsWith("/") || /^https?:\/\//i.test(text)) {
    return true;
  }

  return /^[+\d][\d\s().:-]{5,}$/.test(text) || /^\d+\+?$/.test(text);
};

const toSection = (section) => {
  const content = {};

  for (const [key, value] of Object.entries(section)) {
    if (key === "sectionKey" || key === "sectionName" || key === "order" || key === "settings") {
      continue;
    }

    content[key] = value;
  }

  return {
    name: section.sectionName,
    type: SECTION_TYPES.includes(section.sectionKey) ? section.sectionKey : "custom",
    content,
    settings: {
      ...(section.settings || {}),
      seedSource: SEED_SOURCE,
      legacySectionKey: section.sectionKey,
    },
    status: "active",
    order: section.order,
  };
};

const translationRows = (entityType, document) => {
  const rows = [];
  const missing = [];

  for (const pattern of fieldsFor(entityType)) {
    for (const field of expandPattern(document, pattern)) {
      const value = readPath(document, field);

      if (typeof value !== "string" || ignoredText(value)) {
        continue;
      }

      if (!AR[value]) {
        missing.push(`${entityType} ${field}: ${value}`);
        continue;
      }

      rows.push({
        entityType,
        entityId: document._id,
        field,
        value: AR[value],
      });
    }
  }

  return { rows, missing };
};

const upsertDynamic = async (rows) => {
  if (rows.length === 0) {
    return { created: 0, updated: 0 };
  }

  const now = new Date();
  const result = await Translation.bulkWrite(
    rows.map((item) => ({
      updateOne: {
        filter: {
          type: "dynamic",
          languageCode: LANGUAGE,
          entityType: item.entityType,
          entityId: item.entityId,
          field: item.field,
        },
        update: {
          $set: {
            value: item.value,
            status: "active",
            updatedAt: now,
          },
          $setOnInsert: {
            type: "dynamic",
            languageCode: LANGUAGE,
            entityType: item.entityType,
            entityId: item.entityId,
            field: item.field,
            createdAt: now,
          },
        },
        upsert: true,
      },
    }))
  );

  return { created: result.upsertedCount || 0, updated: result.modifiedCount || 0 };
};

const upsertStatic = async () => {
  const now = new Date();
  const result = await Translation.bulkWrite(
    STATIC_WORDS.map(([key, value]) => ({
      updateOne: {
        filter: { type: "static", languageCode: LANGUAGE, key },
        update: {
          $set: {
            value,
            category: "ui",
            description: "Seeded interface word",
            status: "active",
            updatedAt: now,
          },
          $setOnInsert: {
            type: "static",
            languageCode: LANGUAGE,
            key,
            createdAt: now,
          },
        },
        upsert: true,
      },
    }))
  );

  return { created: result.upsertedCount || 0, updated: result.modifiedCount || 0 };
};

const seed = async () => {
  const force = process.argv.includes("--force");
  await connectDB();
  await languageService.ensureDefaults();

  const slugs = PAGES.map((page) => page.slug);
  const existingSections = await Section.countDocuments({ "settings.seedSource": SEED_SOURCE });
  const existingPages = await Page.countDocuments({ slug: { $in: slugs } });

  if ((existingSections > 0 || existingPages > 0) && !force) {
    console.log(
      `Pages and sections are already seeded (${existingPages} page(s), ${existingSections} section(s)). Re-run with --force to replace them.`
    );
    return;
  }

  if (force) {
    const seededSections = await Section.find({ "settings.seedSource": SEED_SOURCE }).select("_id").lean();
    const seededPages = await Page.find({ slug: { $in: slugs } }).select("_id").lean();
    const sectionIds = seededSections.map((item) => item._id);
    const pageIds = seededPages.map((item) => item._id);

    if (sectionIds.length > 0) {
      await Translation.deleteMany({ type: "dynamic", entityType: "Section", entityId: { $in: sectionIds } });
      await Section.deleteMany({ _id: { $in: sectionIds } });
    }

    if (pageIds.length > 0) {
      await Translation.deleteMany({ type: "dynamic", entityType: "Page", entityId: { $in: pageIds } });
      await Page.deleteMany({ _id: { $in: pageIds } });
    }

    console.log(`Replaced ${seededPages.length} page(s) and ${seededSections.length} section(s).`);
  }

  const sectionDocs = await Section.insertMany(defaultSections.map(toSection));
  const byKey = new Map(sectionDocs.map((section) => [section.settings.legacySectionKey, section]));
  const now = new Date();
  const pageDocs = [];

  for (const page of PAGES) {
    const sections = page.sectionKeys.map((key, order) => {
      const section = byKey.get(key);

      if (!section) {
        throw new Error(`Missing seeded section: ${key}`);
      }

      return { section: section._id, order };
    });
    const snapshot = { title: page.title, sections, seo: page.seo };
    pageDocs.push(
      await Page.create({
        title: page.title,
        slug: page.slug,
        pageType: page.pageType,
        status: "published",
        sections,
        seo: page.seo,
        publishedSnapshot: snapshot,
        publishedAt: now,
        hasUnpublishedChanges: false,
      })
    );
  }

  const settings = await getSettingsDocument();

  if (!settings.websiteName) {
    await WebsiteSettings.updateOne({ _id: settings._id }, { $set: WEBSITE });
    settings.websiteName = WEBSITE.websiteName;
    settings.contact = WEBSITE.contact;
    settings.maintenanceMessage = WEBSITE.maintenanceMessage;
  }

  const rows = [];
  const missing = [];

  for (const section of sectionDocs) {
    const collected = translationRows("Section", section.toObject());
    rows.push(...collected.rows);
    missing.push(...collected.missing);
  }

  for (const page of pageDocs) {
    const collected = translationRows("Page", { _id: page._id, title: page.title });
    rows.push(...collected.rows);
    missing.push(...collected.missing);
  }

  const settingsDoc = {
    _id: settings._id,
    websiteName: settings.websiteName,
    contact: settings.contact || {},
    maintenanceMessage: settings.maintenanceMessage || "",
  };
  const settingsRows = translationRows("WebsiteSettings", settingsDoc);
  rows.push(...settingsRows.rows);
  missing.push(...settingsRows.missing);

  const dynamic = await upsertDynamic(rows);
  const staticWords = await upsertStatic();
  contentTranslationService.invalidateDictionary();

  const hero = sectionDocs.find((section) => section.type === "hero");
  const resolved = await contentTranslationService.resolve({
    entityType: "Section",
    entityId: hero._id,
    document: hero.toObject(),
    languageCode: LANGUAGE,
  });

  console.log(`Seeded ${pageDocs.length} pages and ${sectionDocs.length} sections.`);
  console.log(`Arabic section and page translations: ${dynamic.created} created, ${dynamic.updated} updated.`);
  console.log(`Arabic interface words: ${staticWords.created} created, ${staticWords.updated} updated.`);
  console.log(`Check: Arabic hero title is "${resolved.content.title}".`);

  if (missing.length > 0) {
    console.log("English text left without an Arabic translation:");
    missing.forEach((line) => console.log(`- ${line}`));
  }
};

seed()
  .catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.connection.close();
    }
  });
