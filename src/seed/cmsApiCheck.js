const mongoose = require("mongoose");

process.env.JWT_SECRET = process.env.JWT_SECRET || "test-only-secret";

const uri = "mongodb://127.0.0.1:27017/construction_site_cms_cms_test";
process.env.MONGODB_URI = uri;

const assert = (condition, message, extra) => {
  if (!condition) {
    const error = new Error(message);
    error.extra = extra;
    throw error;
  }

  console.log(`OK ${message}`);
};

const start = async () => {
  await mongoose.connect(uri);
  const app = require("../app");
  const Media = require("../models/Media");
  await mongoose.connection.dropDatabase();

  const server = await new Promise((resolve) => {
    const instance = app.listen(0, "127.0.0.1", () => resolve(instance));
  });
  const base = `http://127.0.0.1:${server.address().port}`;
  let token = "";

  const request = async (method, path, body, { auth = true, form } = {}) => {
    const headers = {};

    if (auth && token) {
      headers.Authorization = `Bearer ${token}`;
    }

    let payload;

    if (form) {
      payload = form;
    } else if (body !== undefined) {
      headers["Content-Type"] = "application/json";
      payload = JSON.stringify(body);
    }

    const response = await fetch(`${base}${path}`, { method, headers, body: payload });
    const json = await response.json();
    return { status: response.status, json };
  };

  try {
    const spec = await request("GET", "/openapi.json", undefined, { auth: false });
    assert(spec.status === 200 && spec.json.openapi === "3.0.3" && spec.json.paths["/api/public/{model}"], "serves the OpenAPI document", spec.json.info);
    const docsResponse = await fetch(`${base}/docs`);
    const docsHtml = await docsResponse.text();
    assert(docsResponse.status === 200 && docsHtml.includes("@scalar/api-reference"), "serves the Scalar reference");

    const registered = await request("POST", "/api/auth/register", {
      name: "Site Admin",
      email: "cms-admin@example.com",
      password: "password123",
    }, { auth: false });
    assert(registered.status === 201, "registers an admin", registered.json);
    token = registered.json.data.token;

    const locked = await request("GET", "/api/admin/page", undefined, { auth: false });
    assert(locked.status === 401, "admin CMS routes require authentication");

    const duplicateKey = await request("PUT", "/api/admin/translation", {
      key: "home.hero.title",
      translations: { en: "Welcome to Our Company", ar: "مرحباً بكم في شركتنا" },
      category: "home",
      description: "Home hero heading",
    });
    assert(duplicateKey.status === 201, "creates a translation", duplicateKey.json);
    const again = await request("PUT", "/api/admin/translation", {
      key: "home.hero.title",
      translations: { en: "Welcome to Our Company" },
    });
    assert(again.status === 409, "rejects a duplicate translation key", again.json);

    const subtitle = await request("PUT", "/api/admin/translation", {
      action: "bulk",
      items: [
        {
          key: "home.hero.subtitle",
          translations: { en: "Building Better Solutions", ar: "" },
          category: "home",
        },
        {
          key: "pages.home.title",
          translations: { en: "Home", ar: "الرئيسية" },
          category: "pages",
        },
        {
          key: "unused.sample",
          translations: { en: "Unused", ar: "غير مستخدم" },
          category: "sample",
        },
      ],
    });
    assert(subtitle.status === 201 && subtitle.json.data.length === 3, "bulk creates translations", subtitle.json);

    const english = await request("GET", "/api/public/translation?lang=en", undefined, { auth: false });
    assert(
      english.status === 200 && english.json.data.translations["home.hero.title"] === "Welcome to Our Company",
      "returns the English dictionary"
    );
    const arabic = await request("GET", "/api/public/translation?lang=ar", undefined, { auth: false });
    assert(
      arabic.status === 200 &&
        arabic.json.data.direction === "rtl" &&
        arabic.json.data.translations["home.hero.title"] === "مرحباً بكم في شركتنا",
      "returns the Arabic dictionary"
    );
    const missing = await request("GET", "/api/admin/translation?view=missing&lang=ar");
    assert(
      missing.status === 200 && missing.json.data.items.some((item) => item.key === "home.hero.subtitle"),
      "detects a missing Arabic translation"
    );

    const hero = await request("PUT", "/api/admin/section", {
      name: "Home hero",
      type: "hero",
      order: 1,
      content: {
        title: { $t: "home.hero.title" },
        subtitle: { $t: "home.hero.subtitle" },
        button: { text: "Contact Us", link: "/contact" },
      },
    });
    assert(hero.status === 201 && hero.json.data.content.title.$t === "home.hero.title", "stores a translation reference", hero.json);

    const services = await request("PUT", "/api/admin/section", {
      name: "Home services",
      type: "services",
      order: 2,
      content: {
        title: "Our Services",
        items: [{ title: "Commercial", description: "Offices and mixed-use buildings." }],
      },
    });
    assert(services.status === 201, "creates a second section of a repeated type", services.json);

    const unused = await request("GET", "/api/admin/translation?view=unused");
    assert(unused.status === 200 && unused.json.data.items.some((item) => item.key === "unused.sample"), "finds an unused key");
    assert(!unused.json.data.items.some((item) => item.key === "home.hero.title"), "does not flag a used key");

    const draft = await request("PUT", "/api/admin/page", {
      title: { $t: "pages.home.title" },
      slug: "home",
      pageType: "home",
      status: "draft",
      sections: [
        { section: hero.json.data._id, order: 1 },
        { section: services.json.data._id, order: 2 },
      ],
      seo: { en: { metaTitle: "Home", metaDescription: "Welcome to our website" } },
    });
    assert(draft.status === 201 && draft.json.data.status === "draft", "creates a draft page", draft.json);
    const hidden = await request("GET", "/api/public/page?slug=home&lang=en", undefined, { auth: false });
    assert(hidden.status === 404, "public pages omit drafts");

    const published = await request("PUT", "/api/admin/page", { action: "publish", id: draft.json.data._id });
    assert(published.status === 200 && published.json.data.status === "published", "publishes a page", published.json);
    const home = await request("GET", "/api/public/page?slug=home&lang=en", undefined, { auth: false });
    assert(home.status === 200 && home.json.message === "Page retrieved successfully", "retrieves a published page", home.json);
    assert(home.json.data.title === "Home", "resolves the page title");
    assert(home.json.data.language === "en" && home.json.data.direction === "ltr", "returns language metadata");
    assert(home.json.data.sections[0].content.title === "Welcome to Our Company", "resolves section translation keys");
    assert(home.json.data.sections[0].content.subtitle === "Building Better Solutions", "falls back to English when Arabic is empty");
    assert(home.json.data.sections[1].type === "services" && home.json.data.sections[1].order === 2, "keeps section order");
    assert(!JSON.stringify(home.json.data).includes("$t"), "does not expose translation references");
    assert(home.json.data.seo.metaTitle === "Home", "returns SEO metadata");

    const homeArabic = await request("GET", "/api/public/page?slug=home&lang=ar", undefined, { auth: false });
    assert(
      homeArabic.status === 200 &&
        homeArabic.json.data.language === "ar" &&
        homeArabic.json.data.direction === "rtl" &&
        homeArabic.json.data.title === "الرئيسية" &&
        homeArabic.json.data.sections[0].content.title === "مرحباً بكم في شركتنا" &&
        homeArabic.json.data.sections[0].content.subtitle === "Building Better Solutions",
      "returns Arabic content and English fallback",
      homeArabic.json
    );

    const edited = await request("PUT", "/api/admin/page", {
      id: draft.json.data._id,
      title: "Home draft title",
    });
    assert(edited.status === 200 && edited.json.data.hasUnpublishedChanges === true, "keeps unpublished edits off the public page");
    const stillPublished = await request("GET", "/api/public/page?slug=home&lang=en", undefined, { auth: false });
    assert(stillPublished.json.data.title === "Home", "public page keeps the published snapshot");
    const preview = await request("GET", `/api/admin/page?view=preview&id=${draft.json.data._id}&lang=en`);
    assert(preview.json.data.title === "Home draft title", "admin preview shows the working copy");

    await request("PUT", "/api/admin/section", {
      id: services.json.data._id,
      type: "services",
      content: {
        title: "Updated services",
        items: [{ title: "Commercial", description: "Offices and mixed-use buildings." }],
      },
    });
    const about = await request("PUT", "/api/admin/page", {
      title: "About",
      slug: "about",
      pageType: "about",
      status: "published",
      sections: [{ section: services.json.data._id, order: 1 }],
    });
    assert(about.status === 201, "shares a section with a second page", about.json);
    const aboutPublic = await request("GET", "/api/public/page?slug=about&lang=en", undefined, { auth: false });
    const homeAfterShare = await request("GET", "/api/public/page?slug=home&lang=en", undefined, { auth: false });
    assert(
      aboutPublic.json.data.sections[0].content.title === "Updated services" &&
        homeAfterShare.json.data.sections[1].content.title === "Updated services",
      "a shared section update is reflected on every page"
    );

    const copy = await request("PUT", "/api/admin/section", { action: "duplicate", id: hero.json.data._id });
    assert(copy.status === 201 && copy.json.data.content.title.$t !== "home.hero.title", "duplicates translation keys", copy.json);
    await request("PUT", "/api/admin/translation", {
      id: duplicateKey.json.data._id,
      translations: { en: "Welcome changed" },
    });
    const copiedKey = copy.json.data.content.title.$t;
    const copiedTranslation = await request("GET", `/api/public/translation?key=${encodeURIComponent(copiedKey)}`, undefined, { auth: false });
    assert(copiedTranslation.json.data.translations.en === "Welcome to Our Company", "a duplicated section keeps its own translation");
    const changedOriginal = await request("GET", "/api/public/page?slug=home&lang=en", undefined, { auth: false });
    assert(changedOriginal.json.data.sections[0].content.title === "Welcome changed", "the original section uses the updated translation");

    await request("PUT", "/api/admin/section", { action: "status", id: services.json.data._id, status: "inactive" });
    const withoutServices = await request("GET", "/api/public/page?slug=home&lang=en", undefined, { auth: false });
    assert(
      withoutServices.json.data.sections.every((section) => section.type !== "services"),
      "public pages omit inactive sections"
    );
    await request("PUT", "/api/admin/section", { action: "status", id: services.json.data._id, status: "active" });

    const blockedDelete = await request("PUT", "/api/admin/section", { action: "delete", id: hero.json.data._id });
    assert(blockedDelete.status === 409, "refuses to delete an assigned section");

    const category = await request("PUT", "/api/admin/blog-category", {
      name: { en: "Projects", ar: "المشاريع" },
      slug: "projects",
      description: { en: "Project stories" },
    });
    assert(category.status === 201, "creates a blog category", category.json);
    const duplicateCategory = await request("PUT", "/api/admin/blog-category", {
      name: { en: "Projects" },
      slug: "projects",
    });
    assert(duplicateCategory.status === 409, "rejects a duplicate category slug");

    const post = await request("PUT", "/api/admin/blog", {
      slug: "first-project",
      category: "projects",
      tags: ["construction"],
      featured: true,
      locales: {
        en: {
          title: "First project",
          excerpt: "A commercial build",
          content: "<p>English body</p>",
          seo: { metaTitle: "First project" },
        },
        ar: { title: "المشروع الأول", excerpt: "بناء تجاري", content: "<p>النص العربي</p>" },
      },
    });
    assert(post.status === 201 && post.json.data.status === "draft", "creates a bilingual blog", post.json);
    const hiddenPost = await request("GET", "/api/public/blog?slug=first-project&lang=ar", undefined, { auth: false });
    assert(hiddenPost.status === 404, "public blogs omit drafts");
    await request("PUT", "/api/admin/blog", { action: "publish", id: post.json.data._id });
    const arabicPost = await request("GET", "/api/public/blog?slug=first-project&lang=ar", undefined, { auth: false });
    assert(
      arabicPost.status === 200 &&
        arabicPost.json.data.title === "المشروع الأول" &&
        arabicPost.json.data.content === "<p>النص العربي</p>" &&
        arabicPost.json.data.direction === "rtl" &&
        arabicPost.json.data.category.name === "المشاريع",
      "returns Arabic blog content",
      arabicPost.json
    );
    const englishPost = await request("GET", "/api/public/blog?slug=first-project&lang=en", undefined, { auth: false });
    assert(englishPost.json.data.title === "First project" && englishPost.json.data.content === "<p>English body</p>", "returns English blog content");

    await request("PUT", "/api/admin/blog", {
      slug: "second-project",
      category: category.json.data._id,
      status: "published",
      locales: { en: { title: "Second project", excerpt: "Another build", content: "<p>Second</p>" } },
    });
    await request("PUT", "/api/admin/blog", {
      slug: "office-notes",
      status: "published",
      featured: false,
      locales: { en: { title: "Office notes", excerpt: "Internal", content: "<p>Notes</p>" } },
    });
    const filtered = await request("GET", "/api/public/blog?lang=en&category=projects&featured=true", undefined, { auth: false });
    assert(
      filtered.status === 200 && filtered.json.data.items.length === 1 && filtered.json.data.items[0].slug === "first-project",
      "filters public blogs",
      filtered.json
    );
    assert(filtered.json.data.pagination.total === 1, "returns pagination");
    const related = await request("GET", "/api/public/blog?slug=first-project&view=related&lang=en", undefined, { auth: false });
    assert(related.status === 200 && related.json.data.some((item) => item.slug === "second-project"), "returns related blogs", related.json);
    const found = await request("GET", "/api/admin/blog?search=Office&status=published");
    assert(found.status === 200 && found.json.data.items.some((item) => item.slug === "office-notes"), "searches admin blogs");

    const badFile = new FormData();
    badFile.append("file", new Blob(["MZ"], { type: "application/x-msdownload" }), "app.exe");
    const rejectedFile = await request("PUT", "/api/admin/media", undefined, { form: badFile });
    assert(rejectedFile.status === 400, "rejects an unsupported media type", rejectedFile.json);

    const media = await Media.create({
      filename: "published-photo",
      originalName: "published-photo.jpg",
      mimeType: "image/jpeg",
      size: 1200,
      url: "https://cdn.example.com/published-photo.jpg",
      folder: "general",
    });
    await request("PUT", "/api/admin/section", {
      id: services.json.data._id,
      type: "services",
      content: {
        title: "Updated services",
        items: [{ title: "Commercial", description: "Offices", image: media.url }],
      },
    });
    const mediaBlocked = await request("PUT", "/api/admin/media", { action: "delete", id: media._id });
    assert(mediaBlocked.status === 409, "refuses to delete media used by published content", mediaBlocked.json);
    const mediaForced = await request("PUT", "/api/admin/media", { action: "delete", id: media._id, force: true });
    assert(mediaForced.status === 200, "deletes media when force is set", mediaForced.json);

    const invalidContact = await request("POST", "/api/public/contact", { name: "A", email: "not-an-email", message: "Hi" }, { auth: false });
    assert(invalidContact.status === 400, "validates contact submissions");
    const honeypot = await request(
      "POST",
      "/api/public/contact",
      { name: "Bot", email: "bot@example.com", message: "Buy this now", company: "https://spam.example" },
      { auth: false }
    );
    assert(honeypot.status === 201 && honeypot.json.data.accepted === true, "accepts a honeypot without an error");
    const message = await request(
      "POST",
      "/api/public/contact",
      { name: "Amina", email: "amina@example.com", phone: "0500000000", subject: "Project", message: "We need a new office." },
      { auth: false }
    );
    assert(message.status === 201, "stores a contact submission", message.json);
    const inbox = await request("GET", "/api/admin/contact?search=amina");
    assert(inbox.status === 200 && inbox.json.data.items.length === 1 && inbox.json.data.pagination.page === 1, "lists contact submissions");
    const updatedMessage = await request("PUT", "/api/admin/contact", { id: inbox.json.data.items[0]._id, status: "read" });
    assert(updatedMessage.status === 200 && updatedMessage.json.data.status === "read", "updates contact status");

    const savedSettings = await request("PUT", "/api/admin/settings", {
      websiteName: { $t: "pages.home.title" },
      defaultLanguage: "en",
      supportedLanguages: ["en", "ar"],
      contact: { email: "hello@example.com", phone: "0500000000", address: "Riyadh" },
      socialLinks: [{ platform: "instagram", url: "https://instagram.example/company" }],
    });
    assert(savedSettings.status === 200, "updates website settings", savedSettings.json);
    const publicSettings = await request("GET", "/api/public/settings?lang=ar", undefined, { auth: false });
    assert(
      publicSettings.status === 200 && publicSettings.json.data.websiteName === "الرئيسية" && publicSettings.json.data.direction === "rtl",
      "resolves public settings",
      publicSettings.json
    );

    const exported = await request("GET", "/api/admin/translation?view=export");
    assert(exported.status === 200 && exported.json.data.some((item) => item.key === "home.hero.title"), "exports translations");
    const imported = await request("PUT", "/api/admin/translation", {
      action: "import",
      mode: "upsert",
      items: [
        {
          key: "home.hero.subtitle",
          translations: { ar: "نبني حلولاً أفضل" },
          category: "home",
          description: "Home hero subtitle",
        },
      ],
    });
    assert(imported.status === 200 && imported.json.data.updated === 1, "imports translations", imported.json);
    const filled = await request("GET", "/api/admin/translation?view=missing&lang=ar");
    assert(!filled.json.data.items.some((item) => item.key === "home.hero.subtitle"), "clears a translation after import");

    const reordered = await request("PUT", "/api/admin/section", {
      action: "reorder",
      sections: [
        { id: hero.json.data._id, order: 2 },
        { id: services.json.data._id, order: 1 },
      ],
    });
    assert(
      reordered.status === 200 && reordered.json.data.find((section) => section._id === services.json.data._id).order === 1,
      "reorders sections",
      reordered.json
    );

    const publicCategories = await request("GET", "/api/public/blog-category?lang=ar", undefined, { auth: false });
    assert(
      publicCategories.status === 200 &&
        publicCategories.json.data.direction === "rtl" &&
        publicCategories.json.data.items.some((item) => item.slug === "projects" && item.name === "المشاريع"),
      "lists public categories",
      publicCategories.json
    );
    await request("PUT", "/api/admin/blog", { action: "unpublish", id: post.json.data._id });
    const unpublished = await request("GET", "/api/public/blog?slug=first-project&lang=en", undefined, { auth: false });
    assert(unpublished.status === 404, "unpublish hides a blog");
    await request("PUT", "/api/admin/blog", { action: "publish", id: post.json.data._id });

    await request("PUT", "/api/admin/settings", { maintenanceMode: true });
    const closed = await request("GET", "/api/public/page?slug=home&lang=en", undefined, { auth: false });
    assert(closed.status === 503, "maintenance mode blocks public content");
    const settingsWhileClosed = await request("GET", "/api/public/settings?lang=en", undefined, { auth: false });
    assert(settingsWhileClosed.status === 200 && settingsWhileClosed.json.data.maintenanceMode === true, "settings stay available during maintenance");
    await request("PUT", "/api/admin/settings", { maintenanceMode: false });
    const reopened = await request("GET", "/api/public/page?slug=home&lang=en", undefined, { auth: false });
    assert(reopened.status === 200, "public content returns after maintenance");

    const pages = await request("GET", "/api/admin/page?page=1&limit=1");
    assert(pages.status === 200 && pages.json.data.pagination.limit === 1 && pages.json.data.pagination.total >= 2, "paginates admin pages");

    const languages = await request("GET", "/api/public/language", undefined, { auth: false });
    assert(
      languages.status === 200 &&
        languages.json.data.some((item) => item.code === "en" && item.isDefault && item.direction === "ltr") &&
        languages.json.data.some((item) => item.code === "ar" && item.direction === "rtl"),
      "lists the default languages",
      languages.json
    );
    const englishLanguage = languages.json.data.find((item) => item.code === "en");
    const blockedDefaultDelete = await request("PUT", "/api/admin/language", { action: "delete", id: englishLanguage._id });
    assert(blockedDefaultDelete.status === 400, "refuses to delete the default language");
    const urdu = await request("PUT", "/api/admin/language", {
      name: "Urdu",
      code: "ur",
      nativeName: "اردو",
    });
    assert(urdu.status === 201 && urdu.json.data.direction === "rtl" && urdu.json.data.isDefault === false, "adds a language", urdu.json);
    const duplicateLanguage = await request("PUT", "/api/admin/language", { name: "Urdu", code: "ur", nativeName: "اردو" });
    assert(duplicateLanguage.status === 409, "rejects a duplicate language code");

    const saveLabel = await request("PUT", "/api/admin/translation", {
      languageCode: "ar",
      key: "common.save",
      value: "حفظ",
    });
    assert(saveLabel.status === 201 && saveLabel.json.data.value === "حفظ", "creates a static translation", saveLabel.json);
    const duplicateLabel = await request("PUT", "/api/admin/translation", {
      languageCode: "ar",
      key: "common.save",
      value: "حفظ",
    });
    assert(duplicateLabel.status === 409, "rejects a duplicate static translation");
    const staticBundle = await request("GET", "/api/public/translation?lang=ar", undefined, { auth: false });
    assert(
      staticBundle.status === 200 && staticBundle.json.data.direction === "rtl" && staticBundle.json.data.translations["common.save"] === "حفظ",
      "returns static translations for a language",
      staticBundle.json
    );
    const staticBulk = await request("PUT", "/api/admin/translation", {
      action: "bulk",
      languageCode: "ar",
      items: [{ key: "common.cancel", value: "إلغاء" }],
    });
    assert(staticBulk.status === 200 && staticBulk.json.data.created === 1, "bulk upserts static translations", staticBulk.json);

    const dynamic = await request("PUT", "/api/admin/translation", {
      languageCode: "ar",
      entityType: "PageSection",
      field: "content.title",
      entityId: services.json.data._id,
      value: "خدماتنا",
    });
    assert(dynamic.status === 201 && dynamic.json.data.entityType === "Section", "creates a dynamic translation", dynamic.json);
    const duplicateDynamic = await request("PUT", "/api/admin/translation", {
      languageCode: "ar",
      entityType: "Section",
      field: "content.title",
      entityId: services.json.data._id,
      value: "خدماتنا",
    });
    assert(duplicateDynamic.status === 409, "rejects a duplicate dynamic translation");
    const defaultDynamic = await request("PUT", "/api/admin/translation", {
      languageCode: "en",
      entityType: "Section",
      field: "content.title",
      entityId: services.json.data._id,
      value: "Our Services",
    });
    assert(defaultDynamic.status === 400, "keeps default-language content on the record");
    const blockedField = await request("PUT", "/api/admin/translation", {
      languageCode: "ar",
      entityType: "Section",
      field: "content.slug",
      entityId: services.json.data._id,
      value: "خدمات",
    });
    assert(blockedField.status === 400, "rejects a non-translatable field");

    const englishPage = await request("GET", "/api/public/page?slug=home&lang=en", undefined, { auth: false });
    const arabicPage = await request("GET", "/api/public/page?slug=home&lang=ar", undefined, { auth: false });
    const urduPage = await request("GET", "/api/public/page?slug=home&lang=ur", undefined, { auth: false });
    const englishServices = englishPage.json.data.sections.find((section) => section.type === "services");
    const arabicServices = arabicPage.json.data.sections.find((section) => section.type === "services");
    const urduServices = urduPage.json.data.sections.find((section) => section.type === "services");
    assert(englishServices.content.title === "Updated services", "English page content stays on the record", englishPage.json);
    assert(arabicServices.content.title === "خدماتنا", "Arabic page content comes from dynamic translations", arabicPage.json);
    assert(urduServices.content.title === "Updated services", "a missing dynamic translation falls back to the default language", urduPage.json);
    const coverage = await request("GET", "/api/admin/translation?kind=dynamic&entityType=Section&languageCode=ur&missing=true&page=1&limit=10");
    assert(
      coverage.status === 200 && coverage.json.data.items.some((item) => String(item.entityId) === String(services.json.data._id)),
      "lists content that is missing a translation",
      coverage.json
    );

    console.log("CMS checks passed.");
  } finally {
    server.closeAllConnections?.();
    await new Promise((resolve) => server.close(resolve));
    await mongoose.connection.dropDatabase();
    await mongoose.connection.close();
  }
};

start().catch((error) => {
  console.error(error.message);
  if (error.extra) {
    console.error(JSON.stringify(error.extra, null, 2));
  }
  mongoose.connection.close().finally(() => process.exit(1));
});
