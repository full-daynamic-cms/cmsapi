const buildPagination = (total, page, limit) => ({
  total,
  page,
  limit,
  totalPages: total === 0 ? 0 : Math.ceil(total / limit),
});

const paginateQuery = async (query, { page, limit, sort }) => {
  const filter = query.getFilter();
  const itemsQuery = query
    .clone()
    .sort(sort)
    .skip((page - 1) * limit)
    .limit(limit)
    .lean();
  const [items, total] = await Promise.all([itemsQuery, query.model.countDocuments(filter)]);

  return {
    items,
    pagination: buildPagination(total, page, limit),
  };
};

module.exports = { buildPagination, paginateQuery };
