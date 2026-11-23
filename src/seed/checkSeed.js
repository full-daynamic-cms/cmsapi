const assert = require("assert");
const {
  publicIdFromCloudinaryUrl,
  normalizeManagedImages,
  removedManagedIds,
  collectManagedIds,
} = require("../services/mediaService");

const previousCloud = process.env.CLOUDINARY_CLOUD_NAME;
const previousFolder = process.env.CLOUDINARY_FOLDER;
process.env.CLOUDINARY_CLOUD_NAME = "demo";
process.env.CLOUDINARY_FOLDER = "cms";

const cloudinaryUrl = (publicId) => `https://res.cloudinary.com/demo/image/upload/v1/${publicId}.jpg`;

assert.equal(publicIdFromCloudinaryUrl(cloudinaryUrl("cms/hero/house")), "cms/hero/house");
assert.equal(
  publicIdFromCloudinaryUrl("https://res.cloudinary.com/demo/image/upload/c_fill,w_400/v12/cms/services/site.png"),
  "cms/services/site"
);
assert.equal(publicIdFromCloudinaryUrl("/uploads/commercial.jpg"), null);
assert.equal(publicIdFromCloudinaryUrl("https://res.cloudinary.com/other/image/upload/v1/cms/hero/house.jpg"), null);

const stored = {
  image: cloudinaryUrl("cms/hero/old"),
  imagePublicId: "cms/hero/old",
  items: [
    { title: "Keep", image: cloudinaryUrl("cms/services/keep") },
    { title: "Drop", image: "https://res.cloudinary.com/demo/image/upload/c_fill,w_200/v9/cms/services/drop.jpg" },
  ],
  settings: { logo: cloudinaryUrl("cms/header/logo") },
};
const edited = {
  ...stored,
  title: "Updated",
  items: [{ title: "Keep", image: cloudinaryUrl("cms/services/keep") }],
  settings: { logo: "" },
};

assert.deepStrictEqual(removedManagedIds(stored, { ...stored, title: "Hi" }), []);
assert.deepStrictEqual(removedManagedIds(stored, edited).sort(), ["cms/header/logo", "cms/services/drop"]);

const uploaded = { image: cloudinaryUrl("cms/hero/new") };
normalizeManagedImages(uploaded);
assert.equal(uploaded.imagePublicId, "cms/hero/new");

const outside = { image: "https://res.cloudinary.com/demo/image/upload/v1/other-folder/pic.jpg" };
normalizeManagedImages(outside);
assert.equal(outside.imagePublicId, "");
assert.equal(collectManagedIds(outside).size, 0);

const restoreEnv = (key, value) => {
  if (value === undefined) {
    delete process.env[key];
  } else {
    process.env[key] = value;
  }
};

restoreEnv("CLOUDINARY_CLOUD_NAME", previousCloud);
restoreEnv("CLOUDINARY_FOLDER", previousFolder);

console.log("Validated media id handling.");
