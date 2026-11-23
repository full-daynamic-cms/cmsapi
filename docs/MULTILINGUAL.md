# Multilingual system

English stays on each content record. Every other language is stored in two collections: `languages` and `translations`. Adding a language does not change page, section, or blog schemas.

The existing `{ "$t": "home.hero.title" }` dictionary still works. A static translation row for the same key and language overrides that dictionary value. Dynamic translations override the English field only in the API response. They are never written back onto the content document.

## Collections

### Language

`name`, `code`, `nativeName`, `direction` (`ltr` or `rtl`), `isDefault`, `isActive`, `isDeleted`, timestamps.

- `code` is unique.
- Only one language is the default.
- The default language cannot be disabled or deleted.
- `ar`, `ur`, `fa`, `he`, and the other right-to-left codes get `direction: "rtl"` when direction is omitted.
- A new database is seeded with English (default) and Arabic.

### Translation

One collection, three document shapes:

| type | identity | used for |
| --- | --- | --- |
| `dictionary` | `key` | Existing static keys whose values live in `translations.en` / `translations.ar` |
| `static` | `languageCode` + `key` | One frontend string |
| `dynamic` | `languageCode` + `entityType` + `entityId` + `field` | One CMS field |

`value` is a string. The schema stores it as a mixed value so a later rich-text shape can be added without a new collection.

`PageSection` is accepted as an alias of `Section`.

## Translatable fields

Configured in `src/config/translatableFields.js`. IDs, slugs, prices, quantities, SKUs, barcodes, dates, status, relationships, images, links, emails, and phone numbers are rejected.

| Entity | Fields |
| --- | --- |
| `Page` | `title` |
| `Section` | `name`, text inside `content` (including `items`, `questions`, `features`, `slides`) |
| `Blog` | `title`, `excerpt`, `content` (English source is `locales.en`) |
| `BlogCategory` | `name`, `description` |
| `WebsiteSettings` | `websiteName`, `contact.address`, `maintenanceMessage`, text in `header` and `footer` |

## API

Responses keep the existing envelope:

```json
{ "status": true, "message": "Success", "data": {} }
```

Admin routes require `Authorization: Bearer <token>`.

### Languages

| Method | Path | Access |
| --- | --- | --- |
| GET | `/api/languages` | active languages |
| GET | `/api/languages/:id` | one language; a language code is also accepted |
| POST | `/api/languages` | admin |
| PUT | `/api/languages/:id` | admin |
| DELETE | `/api/languages/:id` | admin, soft delete |
| GET | `/api/admin/languages` | all languages that are not deleted |
| GET | `/api/public/languages` | active languages |

Create:

```json
{ "name": "Urdu", "code": "ur", "nativeName": "اردو" }
```

### Static translations

| Method | Path | Access |
| --- | --- | --- |
| POST | `/api/translations/static` | admin |
| POST | `/api/translations/static/bulk` | admin, `mode` is `upsert` or `create` |
| GET | `/api/translations/static/:languageCode` | public key-value bundle |
| GET | `/api/admin/translations/static?languageCode=ar` | paginated editor rows, `missing=true` filters gaps |
| PUT | `/api/translations/static/:id` | admin |
| DELETE | `/api/translations/static/:id` | admin |

Bundle:

```json
{
  "language": "ar",
  "direction": "rtl",
  "fallbackLanguage": "en",
  "translations": {
    "common.save": "حفظ",
    "common.cancel": "إلغاء"
  }
}
```

`GET /api/translations?lang=ar` and `GET /api/public/translations?lang=ar` return the same bundle. `GET /api/translations/ar` also returns it when `ar` is a language. Dotted keys such as `home.hero.title` still return the dictionary record.

The original dictionary endpoints (`POST /api/admin/translations`, bulk, import, export, missing, unused) are unchanged.

### Dynamic translations

| Method | Path | Access |
| --- | --- | --- |
| POST | `/api/translations/dynamic` | admin |
| POST | `/api/translations/dynamic/bulk` | admin |
| GET | `/api/translations/dynamic/:entityType/:entityId` | admin, original values plus every saved translation |
| GET | `/api/admin/translations/dynamic?entityType=Section&languageCode=ar` | editor list; add `missing=true` for gaps |
| PUT | `/api/translations/dynamic/:id` | admin |
| DELETE | `/api/translations/dynamic/:id` | admin |

Create:

```json
{
  "languageCode": "ar",
  "entityType": "Section",
  "entityId": "DOCUMENT_ID",
  "field": "content.title",
  "value": "خدماتنا"
}
```

A translation for the default language is rejected. That text stays on the content record.

### Public content

Pass `lang` on the existing public routes:

- `GET /api/public/pages/:slug?lang=ar`
- `GET /api/public/blogs/:slug?lang=ar`
- `GET /api/public/blog-categories?lang=ar`
- `GET /api/public/settings?lang=ar`

English, or whichever language is the default, returns the stored fields. Another language replaces configured text fields when a dynamic translation exists, then resolves `{ "$t": "key" }` references. A missing translation falls back to the default-language value.

Blog `locales.ar` and category `{ "ar": "..." }` values still work. A dynamic translation for the same field wins.

## Resolution

```js
const result = await translationService.resolve({
  entityType: "Section",
  entityId: section._id,
  document: section,
  languageCode: "ar",
  translatableFields: ["content.title", "content.description", "content.button.text"]
});
```

`resolveMany` loads every dynamic translation for that language once, then applies them to the current page of records. The input document is copied first.

Lists stay paginated. Translation lookup does not run one query per row.

## Cache

Redis is not configured in this project. Static bundles and dynamic translations are cached in memory for 30 seconds and cleared when a translation or language changes. The cache lives in `src/utils/translationCache.js`.

Compound indexes:

- dictionary: unique `key` where `type` is `dictionary`
- static: unique `languageCode` + `key`
- dynamic: unique `languageCode` + `entityType` + `entityId` + `field`
- languages: unique `code`, and one default language

On startup the API marks older translation documents as `dictionary` and rebuilds those indexes. It does not delete translation values.

## Migration

Legacy `*_ar` fields, blog `locales`, and category language maps can be copied into the translation collection. The script is a dry run until `--yes` is passed. It skips rows that already exist, so it can be run again. It does not delete or rename source fields.

```bash
npm run migrate:translations
npm run migrate:translations -- --yes
npm run migrate:translations -- --yes --split-static
npm run migrate:translations -- --yes --out translation-migration.json
```

`--split-static` copies the existing dictionary map into per-language static rows. Leave it off unless you want that copy. Dictionary keys already live in the translation collection.

Review the report before removing any old fields. Do that in a later change, after the public API has been checked in each language.

## Frontend

1. `GET /api/public/languages` for the language switcher. Use `direction` for `dir`.
2. `GET /api/public/translations?lang=ar` for interface strings. Look up `translations["common.save"]`. There is no `if (lang === "ar")` branch.
3. Request CMS content with the same `lang`. Render `title` and `description` directly. The API has already chosen the translation or the default-language fallback.
4. In the admin editor, load `GET /api/admin/translations/dynamic/:entityType/:entityId`, show `fields[].source`, and save with `POST /api/translations/dynamic` or the bulk route.
5. Use `missing=true` on the static and dynamic list routes to show untranslated rows.

## Tests

`npm run test:cms` covers English, Arabic, a new language, missing translations, fallback, static bulk upsert, duplicate protection, and the page and section flows. It needs MongoDB on `127.0.0.1:27017` and uses the database `construction_site_cms_cms_test`.
