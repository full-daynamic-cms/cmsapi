const escapeRegex = (value) => String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const containsRegex = (value) => new RegExp(escapeRegex(value), "i");

module.exports = { escapeRegex, containsRegex };
