# Website CMS

Node.js, Express, and MongoDB API for pages built from reusable sections. A published page is what the public site reads. English stays on each record. Other languages are stored as translations.

Interactive docs are at [http://localhost:5000/docs](http://localhost:5000/docs). The written reference is [CMS API](docs/CMS_API.md). The language system is described in [Multilingual system](docs/MULTILINGUAL.md).

## Run

```bash
npm install
npm run dev
```

Set `MONGODB_URI` in `.env`. Image uploads also need `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`, and `CLOUDINARY_FOLDER`.

## Sample pages

```bash
npm run seed
```

This creates published home, about, services, and contact pages, plus Arabic translations for the section text. `npm run seed -- --force` replaces those seeded pages.

Public home page:

```text
GET /api/public/pages/home?lang=ar
```

Admin page and section routes use a Bearer token from `POST /api/auth/login`.
