# Website CMS API

Interactive Scalar documentation is served by the API at `/docs`. The OpenAPI document is at `/openapi.json`.

With the server running, open [http://localhost:5000/docs](http://localhost:5000/docs). Use the Bearer token from `POST /api/auth/login` to try admin requests.

Pages are built from reusable sections. Public content is read from a published page.

The content API is four routes. `model` is `page`, `section`, `blog`, `blog-category`, `translation`, `language`, `media`, `contact`, or `settings`.

| Method | Path | Auth | Use |
| --- | --- | --- | --- |
| GET | `/api/public/{model}` | Public | Read one record or a list |
| POST | `/api/public/contact` | Public | Send a contact message |
| GET | `/api/admin/{model}` | Bearer | Read stored records |
| PUT | `/api/admin/{model}` | Bearer | Create, update, publish, reorder, or delete |

A public page is `GET /api/public/page?slug=home&lang=ar`. An admin update is `PUT /api/admin/page` with `{ "id": "...", "title": "Home" }`. Omit `id` to create. Set `action` to `publish`, `unpublish`, `delete`, `reorder`, `duplicate`, `status`, `sections`, `bulk`, or `import`. Translation writes use `kind`: `dictionary`, `static`, or `dynamic`.

## Passing parameters

The model name is the path. Filters and the record you want are query parameters. Fields you save are the JSON body. Admin writes send `Authorization: Bearer <token>`.

| Place | What it does | Example |
| --- | --- | --- |
| Path | Which model | `/api/admin/page`, `/api/admin/section`, `/api/public/language` |
| Query | Which record, language, or list filter | `?id=665f0a2b9c0e4a0012ab34cd&lang=ar&page=1&limit=10` |
| Body | Fields to create or change | `{ "id": "665f0a2b9c0e4a0012ab34cd", "title": "Home" }` |

Leave `id` out of the body to add a record. Send `id` to update that record. `id` in a GET is a query parameter, not a path segment.

```text
GET  /api/admin/page?id=665f0a2b9c0e4a0012ab34cd
PUT  /api/admin/page
```

### Page

Add a page. `PUT /api/admin/page`

```json
{
  "title": "Home",
  "slug": "home",
  "pageType": "home",
  "status": "published",
  "sections": [{ "section": "665f0a2b9c0e4a0012ab34cd", "order": 0 }],
  "seo": { "en": { "metaTitle": "Home", "metaDescription": "Welcome" } }
}
```

Update a page. The same URL, with `id` plus only the fields that change.

```json
{ "id": "665f0a2b9c0e4a0012ab34cd", "title": "Welcome home" }
```

Other page bodies:

```json
{ "action": "publish", "id": "665f0a2b9c0e4a0012ab34cd" }
```

```json
{ "action": "unpublish", "id": "665f0a2b9c0e4a0012ab34cd" }
```

```json
{ "action": "sections", "id": "665f0a2b9c0e4a0012ab34cd", "sections": [{ "section": "665f0a2b9c0e4a0012ab34ce", "order": 0 }] }
```

```json
{ "action": "delete", "id": "665f0a2b9c0e4a0012ab34cd" }
```

Read it:

```text
GET /api/public/page?slug=home&lang=ar
GET /api/public/page?lang=en&page=1&limit=10
GET /api/admin/page?id=665f0a2b9c0e4a0012ab34cd
GET /api/admin/page?slug=home
GET /api/admin/page?view=preview&id=665f0a2b9c0e4a0012ab34cd&lang=en
GET /api/admin/page?page=1&limit=10&status=published&search=home
```

`pageType` is `home`, `about`, `services`, `contact`, `blogs`, `faq`, `privacy`, `terms`, or `custom`. `status` is `draft`, `published`, or `archived`.

### Section

Add a section. `PUT /api/admin/section`

```json
{
  "name": "Hero",
  "type": "hero",
  "order": 1,
  "status": "active",
  "content": {
    "title": "Building spaces that last",
    "description": "Commercial and residential construction.",
    "button": { "text": "Start a project", "link": "#contact" }
  }
}
```

Update a section.

```json
{
  "id": "665f0a2b9c0e4a0012ab34cd",
  "content": { "title": "Spaces that last" }
}
```

Send `type` again when `content` changes, so the section shape stays valid.

```json
{ "action": "status", "id": "665f0a2b9c0e4a0012ab34cd", "status": "inactive" }
```

```json
{ "action": "reorder", "sections": [{ "id": "665f0a2b9c0e4a0012ab34cd", "order": 0 }, { "id": "665f0a2b9c0e4a0012ab34ce", "order": 1 }] }
```

```json
{ "action": "duplicate", "id": "665f0a2b9c0e4a0012ab34cd", "name": "Hero copy" }
```

```json
{ "action": "delete", "id": "665f0a2b9c0e4a0012ab34cd", "force": true }
```

Read it: `GET /api/admin/section?id=665f0a2b9c0e4a0012ab34cd` or `GET /api/admin/section?type=hero&status=active&page=1&limit=10`.

### Blog

Add a post. `PUT /api/admin/blog`

```json
{
  "slug": "first-project",
  "category": "projects",
  "tags": ["construction"],
  "featured": true,
  "locales": {
    "en": { "title": "First project", "excerpt": "A commercial build", "content": "<p>English body</p>" },
    "ar": { "title": "المشروع الأول", "excerpt": "بناء تجاري", "content": "<p>النص العربي</p>" }
  }
}
```

Update a post.

```json
{ "id": "665f0a2b9c0e4a0012ab34cd", "featured": false }
```

```json
{ "action": "publish", "id": "665f0a2b9c0e4a0012ab34cd" }
```

```json
{ "action": "unpublish", "id": "665f0a2b9c0e4a0012ab34cd" }
```

```json
{ "action": "delete", "id": "665f0a2b9c0e4a0012ab34cd" }
```

Read it:

```text
GET /api/public/blog?slug=first-project&lang=ar
GET /api/public/blog?lang=en&category=projects&featured=true&page=1&limit=10
GET /api/public/blog?slug=first-project&view=related&lang=en
GET /api/admin/blog?id=665f0a2b9c0e4a0012ab34cd
GET /api/admin/blog?view=preview&id=665f0a2b9c0e4a0012ab34cd&lang=en
```

### Blog category

Add a category. `PUT /api/admin/blog-category`

```json
{
  "name": { "en": "Projects", "ar": "المشاريع" },
  "slug": "projects",
  "description": { "en": "Project stories" },
  "status": "active"
}
```

Update a category.

```json
{ "id": "665f0a2b9c0e4a0012ab34cd", "name": { "en": "Selected projects" } }
```

```json
{ "action": "delete", "id": "665f0a2b9c0e4a0012ab34cd", "force": true }
```

Read it: `GET /api/public/blog-category?lang=ar` and `GET /api/admin/blog-category?id=665f0a2b9c0e4a0012ab34cd`.

### Language

Add a language. `PUT /api/admin/language`

```json
{ "name": "Urdu", "code": "ur", "nativeName": "اردو" }
```

`direction` can be omitted. `ar`, `ur`, `fa`, and `he` are stored as `rtl`.

Update a language.

```json
{ "id": "665f0a2b9c0e4a0012ab34cd", "nativeName": "اردو" }
```

```json
{ "action": "delete", "id": "665f0a2b9c0e4a0012ab34cd" }
```

Read it: `GET /api/public/language`, `GET /api/public/language?code=ar`, and `GET /api/admin/language?id=665f0a2b9c0e4a0012ab34cd`.

### Translation

A dictionary row is a reusable key. A static row is one interface word. A dynamic row is the Arabic (or other) text for one field on one page, section, blog, category, or settings record. English stays on the content record, so do not send a dynamic translation for the default language.

Add a dictionary key. `PUT /api/admin/translation`

```json
{
  "key": "home.hero.title",
  "translations": { "en": "Welcome", "ar": "مرحباً" },
  "category": "home"
}
```

Update that key.

```json
{ "id": "665f0a2b9c0e4a0012ab34cd", "translations": { "ar": "أهلاً" } }
```

Add an interface word.

```json
{ "languageCode": "ar", "key": "common.menu", "value": "القائمة" }
```

Update it.

```json
{ "id": "665f0a2b9c0e4a0012ab34cd", "kind": "static", "value": "القائمة" }
```

Add a section translation.

```json
{
  "languageCode": "ar",
  "entityType": "Section",
  "entityId": "665f0a2b9c0e4a0012ab34cd",
  "field": "content.title",
  "value": "نبني مساحات تدوم"
}
```

`entityType` can be `Page`, `Section`, `Blog`, `BlogCategory`, or `WebsiteSettings`. `PageSection` is accepted and stored as `Section`.

Update it.

```json
{ "id": "665f0a2b9c0e4a0012ab34cd", "kind": "dynamic", "value": "مساحات تدوم" }
```

Save many at once, or replace a key from an import file.

```json
{ "action": "bulk", "items": [{ "key": "common.save", "translations": { "en": "Save", "ar": "حفظ" } }] }
```

```json
{ "action": "bulk", "kind": "static", "languageCode": "ar", "mode": "upsert", "items": [{ "key": "common.cancel", "value": "إلغاء" }] }
```

```json
{ "action": "import", "mode": "upsert", "items": [{ "key": "home.hero.title", "translations": { "ar": "مرحباً" } }] }
```

```json
{ "action": "delete", "id": "665f0a2b9c0e4a0012ab34cd", "kind": "dynamic" }
```

Read it:

```text
GET /api/public/translation?lang=ar
GET /api/public/translation?key=home.hero.title
GET /api/admin/translation?id=665f0a2b9c0e4a0012ab34cd
GET /api/admin/translation?kind=static&languageCode=ar&missing=true&page=1&limit=10
GET /api/admin/translation?kind=dynamic&entityType=Section&entityId=665f0a2b9c0e4a0012ab34cd
GET /api/admin/translation?kind=dynamic&entityType=Section&languageCode=ar&missing=true
GET /api/admin/translation?view=missing&lang=ar
GET /api/admin/translation?view=unused
GET /api/admin/translation?view=export
```

### Settings

Settings are one record. There is no `id`. `PUT /api/admin/settings` updates only the fields you send.

```json
{
  "websiteName": "Northline Builders",
  "defaultLanguage": "en",
  "supportedLanguages": ["en", "ar"],
  "contact": { "email": "hello@example.com", "phone": "+1 (000) 000-0000", "address": "100 Builder Street" },
  "maintenanceMode": false
}
```

Read it: `GET /api/public/settings?lang=ar` and `GET /api/admin/settings`.

### Media

Add a file with `PUT /api/admin/media` as `multipart/form-data`. The file field is `file`. Optional fields are `folder` and `altText`.

Update the label.

```json
{ "id": "665f0a2b9c0e4a0012ab34cd", "altText": "Site photo", "folder": "projects" }
```

```json
{ "action": "delete", "id": "665f0a2b9c0e4a0012ab34cd", "force": true }
```

Read it: `GET /api/admin/media?id=665f0a2b9c0e4a0012ab34cd`, `GET /api/admin/media?folder=projects&page=1&limit=10`, and `GET /api/admin/media?view=folders`.

### Contact

The public form is the only body that is not an admin update. `POST /api/public/contact`

```json
{
  "name": "Amina",
  "email": "amina@example.com",
  "phone": "0500000000",
  "subject": "Project",
  "message": "We need a new office."
}
```

Update the inbox status. `PUT /api/admin/contact`

```json
{ "id": "665f0a2b9c0e4a0012ab34cd", "status": "read" }
```

`status` is `new`, `read`, `replied`, or `archived`.

```json
{ "action": "delete", "id": "665f0a2b9c0e4a0012ab34cd" }
```

Read it: `GET /api/admin/contact?search=amina&status=new&page=1&limit=10`.

| Method | Path | Auth |
| --- | --- | --- |
| POST | `/api/auth/register` | Public |
| POST | `/api/auth/login` | Public |
| GET | `/api/auth/me` | Bearer |
| POST, DELETE | `/api/uploads` | Bearer |

Admin CMS routes use the same Bearer token. Public CMS routes never return drafts, author emails, or audit fields.

## Response format

Success:

```json
{ "status": true, "message": "Page retrieved successfully", "data": {} }
```

Error:

```json
{ "status": false, "message": "Page not found", "data": null }
```

Validation errors add `errors`:

```json
{
  "status": false,
  "message": "Validation failed",
  "data": null,
  "errors": [{ "field": "slug", "message": "slug is required" }]
}
```

Paginated lists:

```json
{
  "status": true,
  "message": "Records retrieved successfully",
  "data": {
    "items": [],
    "pagination": { "total": 100, "page": 1, "limit": 10, "totalPages": 10 }
  }
}
```

`page` defaults to 1. `limit` defaults to 10 and cannot exceed 100.

## Languages

English (`en`, left to right) and Arabic (`ar`, right to left) are built in. Add another language by including its code in website settings and writing values under that code. The database shape does not change.

Public `?lang=` must be one of `supportedLanguages`. When it is omitted, the default language is used. An unknown code returns `400 Unsupported language`.

Missing text falls back to English. Empty Arabic is treated as missing. The raw key is not returned on public pages.

## Translation references

Only this object is a translation reference:

```json
{ "$t": "home.hero.title" }
```

Plain strings, URLs, image paths, and HTML stay as written. Keys match `category.part.part` using lowercase letters, numbers, dots, underscores, and hyphens.

There is no automatic translation. English and Arabic values are edited by an admin.

Active translations are cached in process memory for 30 seconds and cleared on every write. Redis is not part of this project.

## Publishing model

A page has a working copy and a published snapshot.

- Public pages read the snapshot and only when `status` is `published`.
- Saving a published page does not change the public page until `POST /publish`.
- Section content is live. A section shared by several pages updates all of them immediately.
- `POST /sections/:id/duplicate` copies the section and its translation keys so later edits stay independent.
- Inactive sections are left out of public pages.
- `maintenanceMode` makes public pages, blogs, categories, and contact return `503`. Settings and translations stay available.

## Public pages

### List published pages

`GET /api/public/page?lang=en&page=1&limit=10`

Auth: none.

Query: `lang`, `page`, `limit`.

```json
{
  "status": true,
  "message": "Records retrieved successfully",
  "data": {
    "items": [
      { "title": "Home", "slug": "home", "pageType": "home", "language": "en", "direction": "ltr", "publishedAt": "2026-11-23T00:00:00.000Z" }
    ],
    "pagination": { "total": 1, "page": 1, "limit": 10, "totalPages": 1 }
  }
}
```

### Get one published page

`GET /api/public/page?slug=home&lang=en`

Auth: none.

Params: `slug` (lowercase hyphenated).

Query: `lang`.

`200`

```json
{
  "status": true,
  "message": "Page retrieved successfully",
  "data": {
    "title": "Home",
    "slug": "home",
    "pageType": "home",
    "language": "en",
    "direction": "ltr",
    "fallbackLanguage": null,
    "sections": [
      {
        "type": "hero",
        "order": 1,
        "content": {
          "title": "Welcome to Our Company",
          "subtitle": "Building Better Solutions",
          "button": { "text": "Contact Us", "link": "/contact" }
        }
      }
    ],
    "seo": { "metaTitle": "Home", "metaDescription": "Welcome to our website" }
  }
}
```

Arabic responses set `language` to `ar`, `direction` to `rtl`, and `fallbackLanguage` to `en`.

Errors: `400` invalid slug or language, `404` missing or unpublished, `503` maintenance.

## Admin pages

Auth: Bearer.

| Method | Path | Body / query | Success |
| --- | --- | --- | --- |
| GET | `/api/admin/page` | `page`, `limit`, `search`, `status`, `pageType` | `200` paginated working copies |
| PUT | `/api/admin/page` | page object, no `id` | `201` |
| GET | `/api/admin/page?slug=home` | | `200` any status |
| GET | `/api/admin/page?id=` | | `200` |
| PUT | `/api/admin/page` | `{ "id", ...fields }` | `200` |
| PUT | `/api/admin/page` | `{ "action": "delete", "id" }` | `200` sections are kept |
| PUT | `/api/admin/page` | `{ "action": "sections", "id", "sections": [{ "section": "id", "order": 0 }] }` | `200` |
| PUT | `/api/admin/page` | `{ "action": "publish", "id" }` | `200` copies the working page into the snapshot |
| PUT | `/api/admin/page` | `{ "action": "unpublish", "id" }` | `200` sets `draft` |
| GET | `/api/admin/page?view=preview&id=&lang=en` | | `200` resolved working copy, including inactive sections |

Create body:

```json
{
  "title": { "$t": "pages.home.title" },
  "slug": "home",
  "pageType": "home",
  "status": "draft",
  "sections": [{ "section": "665f0a2b9c0e4a0012ab34cd", "order": 1 }],
  "seo": {
    "en": { "metaTitle": "Home", "metaDescription": "Welcome to our website", "keywords": ["construction"] },
    "ar": { "metaTitle": { "$t": "pages.home.metaTitle" } }
  }
}
```

`title` is a string or a translation reference. `slug` is unique. `pageType` is `home`, `about`, `services`, `contact`, `blogs`, `faq`, `privacy`, `terms`, or `custom`. `status` is `draft`, `published`, or `archived`. Section ids cannot repeat on one page. Publishing with `status: "published"` on create publishes immediately.

Errors: `400` validation, `401` missing token, `404` page or section, `409` duplicate slug.

## Sections

Auth: Bearer. One route, `/api/admin/section`.

| Method | Path | Notes |
| --- | --- | --- |
| GET | `/api/admin/section` | `page`, `limit`, `search`, `type`, `status`, `pageId` |
| PUT | `/api/admin/section` | create when `id` is omitted |
| PUT | `/api/admin/section` | `{ "action": "reorder", "sections": [{ "id": "...", "order": 1 }] }` |
| GET | `/api/admin/section?id=` | |
| PUT | `/api/admin/section` | `{ "id", ...fields }`. Send `type` when `content` changes |
| PUT | `/api/admin/section` | `{ "action": "status", "id", "status": "active" }` |
| PUT | `/api/admin/section` | `{ "action": "duplicate", "id", "name": "Hero copy" }` |
| PUT | `/api/admin/section` | `{ "action": "delete", "id", "force": true }` when a page still uses it |

Types: `header`, `hero`, `about`, `services`, `features`, `statistics`, `testimonials`, `team`, `gallery`, `pricing`, `faq`, `contact`, `cta`, `partners`, `footer`, `projects`, `process`, `why-us`, `custom`.

The same type can be used more than once. `custom` accepts a free content object up to 100KB. Other types validate their own fields. Text fields accept either a string or `{ "$t": "key" }`.

`status` is `active` or `inactive`. `order` is the section's own order. The order stored on a page is separate and is what the public page uses.

Errors: `400`, `401`, `404`, `409`.

## Translations

Dictionary for the website:

`GET /api/public/translation?lang=en`

`GET /api/public/translation?lang=ar`

Auth: none. Only `active` keys. Values fall back to English.

```json
{
  "status": true,
  "message": "Translations retrieved successfully",
  "data": {
    "language": "ar",
    "direction": "rtl",
    "fallbackLanguage": "en",
    "translations": { "home.hero.title": "مرحباً بكم في شركتنا" }
  }
}
```

`GET /api/public/translation?key=home.hero.title` returns one active record. Inactive keys are `404` here.

Admin reads and writes use `/api/admin/translation` and require Bearer auth. Add `kind` when the row is `static` or `dynamic`. Dictionary is the default.

| Method | Path | Body / query | Success |
| --- | --- | --- | --- |
| GET | `/api/admin/translation` | `page`, `limit`, `search`, `category`, `status`, `lang` | `200` paginated records |
| PUT | `/api/admin/translation` | one translation | `201` |
| PUT | `/api/admin/translation` | `{ "action": "bulk", "items": [ ... ] }` up to 200 | `201` |
| PUT | `/api/admin/translation` | `{ "id", ...fields }`; language values are merged | `200` |
| PUT | `/api/admin/translation` | `{ "action": "delete", "id" }` | `200` |
| GET | `/api/admin/translation?view=missing&lang=ar` | | `200` active keys with an empty value |
| GET | `/api/admin/translation?view=unused` | | `200` keys not referenced by pages, sections, blogs, categories, or settings |
| GET | `/api/admin/translation?view=export` | | `200` JSON array |
| PUT | `/api/admin/translation` | `{ "action": "import", "mode": "upsert", "items": [] }` | `200` `{ "created", "updated" }` |
| GET | `/api/admin/translation?key=` | includes inactive | `200` |

Create body:

```json
{
  "key": "home.hero.title",
  "translations": { "en": "Welcome to Our Company", "ar": "مرحباً بكم في شركتنا" },
  "category": "home",
  "description": "Home hero heading",
  "status": "active"
}
```

`mode` is `create` or `upsert`. Upsert merges language values and does not wipe omitted fields. Duplicate keys return `409`.

## Blogs

Public:

| Method | Path | Query |
| --- | --- | --- |
| GET | `/api/public/blog` | `lang`, `page`, `limit`, `search`, `category` (id or slug), `tag`, `featured` |
| GET | `/api/public/blog?slug=first-project` | `lang` |
| GET | `/api/public/blog?slug=first-project&view=related` | `lang`, up to 3 published posts in the same category |

List items omit the body. The detail response is one language:

```json
{
  "title": "المشروع الأول",
  "slug": "first-project",
  "excerpt": "بناء تجاري",
  "content": "<p>النص العربي</p>",
  "featuredImage": "",
  "gallery": [],
  "category": { "slug": "projects", "name": "المشاريع" },
  "tags": ["construction"],
  "author": { "name": "Site Admin" },
  "featured": true,
  "publishedAt": "2026-11-23T00:00:00.000Z",
  "language": "ar",
  "direction": "rtl",
  "fallbackLanguage": "en",
  "seo": { "metaTitle": "", "metaDescription": "" }
}
```

`content` may be HTML or rich-text JSON. A missing Arabic field falls back to English.

Admin route `/api/admin/blog`. Bearer.

| Method | Path | Notes |
| --- | --- | --- |
| GET | `/api/admin/blog` | `page`, `limit`, `search`, `status`, `category`, `tag`, `featured` |
| PUT | `/api/admin/blog` | create when `id` is omitted |
| GET | `/api/admin/blog?slug=` | any status |
| GET | `/api/admin/blog?id=` | full locales |
| PUT | `/api/admin/blog` | `{ "id", ...fields }`. Locale objects are merged per language |
| PUT | `/api/admin/blog` | `{ "action": "delete", "id" }` |
| PUT | `/api/admin/blog` | `{ "action": "publish", "id" }` sets `publishedAt` the first time |
| PUT | `/api/admin/blog` | `{ "action": "unpublish", "id" }` sets `draft` |
| GET | `/api/admin/blog?view=preview&id=&lang=en` | resolved draft or published copy |

```json
{
  "slug": "first-project",
  "category": "projects",
  "tags": ["construction"],
  "featured": true,
  "featuredImage": "https://cdn.example.com/cover.jpg",
  "gallery": [],
  "status": "draft",
  "locales": {
    "en": {
      "title": "First project",
      "excerpt": "A commercial build",
      "content": "<p>English body</p>",
      "seo": { "metaTitle": "First project", "metaDescription": "" }
    },
    "ar": {
      "title": "المشروع الأول",
      "excerpt": "بناء تجاري",
      "content": "<p>النص العربي</p>"
    }
  }
}
```

`locales.en.title` is required. `status` is `draft`, `published`, or `archived`. Slugs are unique.

## Blog categories

`GET /api/public/blog-category?lang=ar` returns active categories only.

Admin `/api/admin/blog-category`. Bearer.

| Method | Path | Notes |
| --- | --- | --- |
| GET | `/api/admin/blog-category` | `page`, `limit`, `search`, `status` |
| PUT | `/api/admin/blog-category` | create. `name.en` required |
| GET | `/api/admin/blog-category?id=` | |
| PUT | `/api/admin/blog-category` | `{ "id", ...fields }`. Name and description merge by language |
| PUT | `/api/admin/blog-category` | `{ "action": "delete", "id", "force": true }` when a blog uses it |

```json
{
  "name": { "en": "Projects", "ar": "المشاريع" },
  "slug": "projects",
  "description": { "en": "Project stories", "ar": "" },
  "status": "active"
}
```

`status` is `active` or `inactive`.

## Media

Admin `/api/admin/media`. Bearer. Uploads use the existing Cloudinary account and are stored under the configured folder plus `/media/{folder}`.

| Method | Path | Notes |
| --- | --- | --- |
| GET | `/api/admin/media` | `page`, `limit`, `search`, `folder`, `mimeType` |
| GET | `/api/admin/media?view=folders` | distinct folder names |
| PUT | `/api/admin/media` | multipart field `file`; optional `folder`, `altText` |
| GET | `/api/admin/media?id=` | |
| PUT | `/api/admin/media` | `{ "id", "altText", "folder" }` |
| PUT | `/api/admin/media` | `{ "action": "delete", "id", "force": true }` when published content uses the file |

Accepted types: JPEG, PNG, WEBP, GIF, AVIF, PDF, plain text, CSV, DOC, and DOCX. Maximum size is 10MB. `POST /api/uploads` remains a 5MB image-only upload.

`500` when Cloudinary is not configured. `502` when Cloudinary rejects the file. `400` for a rejected type or a file that is too large.

## Contact

`POST /api/public/contact`

Auth: none. Limited to 8 requests per 15 minutes per IP. Other public CMS routes allow 300 requests per minute. Admin routes allow 600 per minute.

```json
{
  "name": "Amina",
  "email": "amina@example.com",
  "phone": "0500000000",
  "subject": "Project",
  "message": "We need a new office."
}
```

`name` is 2–120 characters. `email` must be valid. `message` is 5–5000 characters. More than five links is rejected. A non-empty `company` field is a honeypot: the API returns `201` and does not store the message.

`201`

```json
{ "status": true, "message": "Message sent successfully", "data": { "accepted": true, "id": "665f0a2b9c0e4a0012ab34cd" } }
```

Admin `/api/admin/contact`. Bearer.

| Method | Path | Notes |
| --- | --- | --- |
| GET | `/api/admin/contact` | `page`, `limit`, `status`, `search` |
| GET | `/api/admin/contact?id=` | |
| PUT | `/api/admin/contact` | `{ "id", "status": "read" }` |
| PUT | `/api/admin/contact` | `{ "action": "delete", "id" }` |

`status` is `new`, `read`, `replied`, or `archived`.

## Settings

`GET /api/public/settings?lang=en`

Auth: none. Returns the resolved public site: name, logo, favicon, languages, direction, social links, contact details, header, footer, default SEO, and maintenance state.

`GET /api/admin/settings` returns the stored values, including translation references, so the editor can change them.

`PUT /api/admin/settings` updates only the fields that are sent.

```json
{
  "websiteName": { "$t": "pages.home.title" },
  "logo": "https://cdn.example.com/logo.png",
  "favicon": "",
  "defaultLanguage": "en",
  "supportedLanguages": ["en", "ar"],
  "socialLinks": [{ "platform": "instagram", "url": "https://instagram.example/company" }],
  "contact": { "email": "hello@example.com", "phone": "0500000000", "address": "Riyadh" },
  "header": {},
  "footer": { "copyright": { "$t": "footer.copyright" } },
  "defaultSeo": { "en": { "metaTitle": "Company", "metaDescription": "" } },
  "maintenanceMode": false,
  "maintenanceMessage": "We will be back soon.",
  "custom": {}
}
```

`supportedLanguages` must include `en`. `defaultLanguage` must be in that list. `header`, `footer`, and `custom` are objects limited to 50KB.

## SEO fields

Page SEO, blog SEO, and default SEO use the same fields, stored separately for each language:

`metaTitle`, `metaDescription`, `keywords`, `canonicalUrl`, `ogTitle`, `ogDescription`, `ogImage`, `robots`, `schemaMarkup`.

Title and description fields accept translation references. `canonicalUrl`, `ogImage`, and `robots` are plain strings.

## Sample content

```bash
npm run seed
npm run seed -- --force
```

`npm run seed` creates the home, about, services, and contact pages from reusable sections, with Arabic translations for the visible text. `--force` replaces those seeded pages and sections.

## Tests

```bash
npm run check
npm run test:cms
```
