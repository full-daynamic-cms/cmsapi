# Website CMS API

Interactive Scalar documentation is served by the API at `/docs`. The OpenAPI document is at `/openapi.json`.

With the server running, open [http://localhost:5000/docs](http://localhost:5000/docs). Use the Bearer token from `POST /api/auth/login` to try admin requests.

The CMS extends the existing landing-page API. These routes are unchanged:

| Method | Path | Auth |
| --- | --- | --- |
| POST | `/api/auth/register` | Public |
| POST | `/api/auth/login` | Public |
| GET | `/api/auth/me` | Bearer |
| GET, POST, PUT, PATCH, DELETE | `/api/landing-page` | Bearer |
| GET | `/api/public/landing-page` | Public |
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

`GET /api/public/pages?lang=en&page=1&limit=10`

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

`GET /api/public/pages/:slug?lang=en`

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
| GET | `/api/admin/pages` | `page`, `limit`, `search`, `status`, `pageType` | `200` paginated working copies |
| POST | `/api/admin/pages` | page object | `201` |
| GET | `/api/admin/pages/slug/:slug` | | `200` any status |
| GET | `/api/admin/pages/:id` | | `200` |
| PUT | `/api/admin/pages/:id` | any page fields | `200` |
| DELETE | `/api/admin/pages/:id` | | `200` sections are kept |
| PUT | `/api/admin/pages/:id/sections` | `{ "sections": [{ "section": "id", "order": 0 }] }` | `200` |
| POST | `/api/admin/pages/:id/publish` | | `200` copies the working page into the snapshot |
| POST | `/api/admin/pages/:id/unpublish` | | `200` sets `draft` |
| GET | `/api/admin/pages/:id/preview?lang=en` | | `200` resolved working copy, including inactive sections |

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

Auth: Bearer. Base path `/api/admin/sections`.

| Method | Path | Notes |
| --- | --- | --- |
| GET | `/` | `page`, `limit`, `search`, `type`, `status`, `pageId` |
| POST | `/` | create |
| PATCH | `/reorder` | `{ "sections": [{ "id": "...", "order": 1 }] }` |
| GET | `/:id` | |
| PUT | `/:id` | send `type` when `content` changes so the type schema is applied |
| PATCH | `/:id/status` | `{ "status": "active" }` or `{}` to toggle |
| POST | `/:id/duplicate` | `{ "name": "Hero copy", "assignToPage": "pageId" }` |
| DELETE | `/:id` | `409` when a page uses it; `?force=true` detaches and deletes |

Types: `header`, `hero`, `about`, `services`, `features`, `statistics`, `testimonials`, `team`, `gallery`, `pricing`, `faq`, `contact`, `cta`, `partners`, `footer`, `projects`, `process`, `why-us`, `custom`.

The same type can be used more than once. `custom` accepts a free content object up to 100KB. Other types validate their own fields. Text fields accept either a string or `{ "$t": "key" }`.

`status` is `active` or `inactive`. `order` is the section's own order. The order stored on a page is separate and is what the public page uses.

Errors: `400`, `401`, `404`, `409`.

## Translations

Dictionary for the website:

`GET /api/translations?lang=en`

`GET /api/public/translations?lang=ar`

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

`GET /api/translations/:key` and `GET /api/public/translations/:key` return one active record. Inactive keys are `404` here.

Admin path `/api/admin/translations`, and the same write paths under `/api/translations`, require Bearer auth.

| Method | Path | Body / query | Success |
| --- | --- | --- | --- |
| GET | `/api/admin/translations` | `page`, `limit`, `search`, `category`, `status`, `lang` | `200` paginated records |
| POST | `/api/translations` | one translation | `201` |
| POST | `/api/translations/bulk` | `{ "items": [ ... ] }` up to 200 | `201` |
| PUT | `/api/translations/:id` | partial fields; language values are merged | `200` |
| PUT | `/api/translations/bulk` | `{ "items": [{ "id" or "key", "translations": {} }] }` | `200` |
| DELETE | `/api/translations/:id` | | `200` |
| GET | `/api/translations/missing?lang=ar` | | `200` active keys with an empty value |
| GET | `/api/admin/translations/unused` | | `200` keys not referenced by pages, sections, blogs, categories, or settings |
| GET | `/api/admin/translations/export` | | `200` JSON array |
| POST | `/api/admin/translations/import` | `{ "mode": "upsert", "items": [] }` | `200` `{ "created", "updated" }` |
| GET | `/api/admin/translations/key/:key` | includes inactive | `200` |

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
| GET | `/api/public/blogs` | `lang`, `page`, `limit`, `search`, `category` (id or slug), `tag`, `featured` |
| GET | `/api/public/blogs/:slug` | `lang` |
| GET | `/api/public/blogs/:slug/related` | `lang`, up to 3 published posts in the same category |

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

Admin base `/api/admin/blogs`. Bearer.

| Method | Path | Notes |
| --- | --- | --- |
| GET | `/` | `page`, `limit`, `search`, `status`, `category`, `tag`, `featured` |
| POST | `/` | create |
| GET | `/slug/:slug` | any status |
| GET | `/:id` | full locales |
| PUT | `/:id` | locale objects are merged per language |
| DELETE | `/:id` | |
| POST | `/:id/publish` | sets `publishedAt` the first time |
| POST | `/:id/unpublish` | sets `draft` |
| GET | `/:id/preview?lang=en` | resolved draft or published copy |

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

`GET /api/public/blog-categories?lang=ar` returns active categories only.

Admin `/api/admin/blog-categories`. Bearer.

| Method | Path | Notes |
| --- | --- | --- |
| GET | `/` | `page`, `limit`, `search`, `status` |
| POST | `/` | `name.en` required |
| GET | `/:id` | |
| PUT | `/:id` | name and description merge by language |
| DELETE | `/:id` | `409` when a blog uses it; `?force=true` clears those blogs |

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
| GET | `/` | `page`, `limit`, `search`, `folder`, `mimeType` |
| GET | `/folders` | distinct folder names |
| POST | `/` | multipart field `file`; optional `folder`, `altText` |
| GET | `/:id` | |
| PATCH | `/:id` | `altText`, `folder` |
| DELETE | `/:id` | `409` when published content uses the file; `?force=true` overrides |

Accepted types: JPEG, PNG, WEBP, GIF, AVIF, PDF, plain text, CSV, DOC, and DOCX. Maximum size is 10MB. The original landing-page image upload remains 5MB and image-only.

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
| GET | `/` | `page`, `limit`, `status`, `search` |
| GET | `/:id` | |
| PATCH | `/:id` | `{ "status": "read" }` |
| DELETE | `/:id` | |

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

## Migration

```bash
npm run migrate:cms
npm run migrate:cms -- --yes
npm run migrate:cms -- --yes --force
```

The dry run prints the landing sections it would copy. `--yes` creates translation keys from the current English text, reusable sections, and a published `home` page. Arabic values are left empty for an admin to fill in. `--force` updates that copied content. Landing-page documents and `/api/landing-page` stay in place.

## Tests

```bash
npm run check
npm run test:api
npm run test:cms
```
