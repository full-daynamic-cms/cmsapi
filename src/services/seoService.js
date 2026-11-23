const { emptySeo } = require("../models/schemas/seoSchema");

const pickSeo = (seo, language) => {
  const source = seo && typeof seo === "object" ? seo[language] || seo.en || {} : {};

  return {
    ...emptySeo(),
    ...source,
    keywords: Array.isArray(source.keywords) ? source.keywords : [],
  };
};

module.exports = { pickSeo, emptySeo };
