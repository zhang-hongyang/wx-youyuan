function extractList(payload) {
  if (Array.isArray(payload)) {
    return payload;
  }

  if (payload && Array.isArray(payload.list)) {
    return payload.list;
  }

  if (payload && payload.data && Array.isArray(payload.data.list)) {
    return payload.data.list;
  }

  return [];
}

function extractPagination(payload, defaults = {}) {
  const pageNo = payload && (payload.pageNo || payload.page || defaults.pageNo || 1);
  const pageSize = payload && (payload.pageSize || defaults.pageSize || 20);
  const total = payload && (payload.total || defaults.total || 0);

  return {
    pageNo,
    pageSize,
    total
  };
}

module.exports = {
  extractList,
  extractPagination
};
