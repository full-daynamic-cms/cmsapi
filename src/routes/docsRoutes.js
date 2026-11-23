const express = require("express");
const openapi = require("../docs/openapi");

const router = express.Router();

const page = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>CMS API Reference</title>
  </head>
  <body>
    <script
      id="api-reference"
      data-url="/openapi.json"
      data-configuration='{"theme":"default","layout":"modern","persistAuth":true,"defaultHttpClient":{"targetKey":"shell","clientKey":"curl"}}'
    ></script>
    <script src="https://cdn.jsdelivr.net/npm/@scalar/api-reference"></script>
  </body>
</html>`;

router.get("/openapi.json", (req, res) => {
  res.json(openapi);
});

router.get(["/docs", "/docs/"], (req, res) => {
  res.type("html").send(page);
});

module.exports = router;
