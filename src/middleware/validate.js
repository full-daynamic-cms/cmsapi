const validate = (validateFn) => (req, res, next) => {
  try {
    req.validated = validateFn(req);
    next();
  } catch (error) {
    next(error);
  }
};

module.exports = { validate };
