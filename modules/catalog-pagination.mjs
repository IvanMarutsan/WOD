export const getTotalPages = (total, pageSize) => {
  const safeTotal = Number.isFinite(total) ? Math.max(0, total) : 0;
  const safeSize = Number.isFinite(pageSize) && pageSize > 0 ? pageSize : 1;
  return Math.max(1, Math.ceil(safeTotal / safeSize));
};

export const clampPage = (page, totalPages) => {
  const safeTotal = Number.isFinite(totalPages) ? totalPages : 1;
  const safePage = Number.isFinite(page) ? page : 1;
  return Math.min(Math.max(1, safePage), Math.max(1, safeTotal));
};

export const getPageSlice = (list, page, pageSize) => {
  const safeList = Array.isArray(list) ? list : [];
  const totalPages = getTotalPages(safeList.length, pageSize);
  const currentPage = clampPage(page, totalPages);
  const startIndex = (currentPage - 1) * pageSize;
  return {
    totalPages,
    currentPage,
    items: safeList.slice(startIndex, startIndex + pageSize)
  };
};
