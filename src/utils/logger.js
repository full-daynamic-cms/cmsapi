const write = (level, message, meta) => {
  const entry = `[cms] ${message}`;

  if (meta === undefined) {
    console[level](entry);
    return;
  }

  console[level](entry, meta);
};

module.exports = {
  info: (message, meta) => write("log", message, meta),
  warn: (message, meta) => write("warn", message, meta),
  error: (message, meta) => write("error", message, meta),
};
