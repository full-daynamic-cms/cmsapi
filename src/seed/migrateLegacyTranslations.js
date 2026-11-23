require("dotenv").config();

const fs = require("fs");
const mongoose = require("mongoose");
const connectDB = require("../config/db");
const { migrateLegacyTranslations } = require("../services/translationMigrationService");

const dryRun = !process.argv.includes("--yes");
const splitStatic = process.argv.includes("--split-static");
const outFlag = process.argv.indexOf("--out");
const outPath = outFlag >= 0 ? process.argv[outFlag + 1] : "";

const start = async () => {
  if (outFlag >= 0 && !outPath) {
    throw new Error("--out requires a file path");
  }

  await connectDB();
  const report = await migrateLegacyTranslations({ dryRun, splitStatic });

  if (outPath) {
    fs.writeFileSync(outPath, JSON.stringify(report, null, 2));
  }

  console.log(JSON.stringify(report, null, 2));

  if (dryRun) {
    console.log("Dry run only. Re-run with --yes to write translations. Source fields are never deleted.");
  }
};

start()
  .catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.connection.close().catch(() => {});
  });
