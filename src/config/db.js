require("dotenv").config();
const mongoose = require("mongoose");

let cached = global.mongoose;

if (!cached) {
  cached = global.mongoose = { conn: null, promise: null };
}

let indexPromise = null;

const ensureIndexes = () => {
  if (!indexPromise) {
    indexPromise = (async () => {
      const Translation = require("../models/Translation");
      await Translation.ensureTranslationIndexes();
      const Language = require("../models/Language");
      await Language.syncIndexes();
    })().catch((error) => {
      indexPromise = null;
      console.error("Translation index sync failed:", error.message);
    });
  }

  return indexPromise;
};

const connectDB = async () => {
  if (mongoose.connection.readyState === 1) {
    cached.conn = mongoose.connection;
    await ensureIndexes();
    return cached.conn;
  }

  const uri = process.env.MONGODB_URI;

  if (!uri) {
    throw new Error("MONGODB_URI is not defined");
  }

  if (!cached.promise) {
    mongoose.set("strictQuery", true);
    cached.promise = mongoose
      .connect(uri, {
        serverSelectionTimeoutMS: 8000,
        family: 4,
      })
      .then((instance) => instance.connection)
      .catch((error) => {
        cached.promise = null;
        throw error;
      });
  }

  cached.conn = await cached.promise;
  await ensureIndexes();
  return cached.conn;
};

module.exports = connectDB;
