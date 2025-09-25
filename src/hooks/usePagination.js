// src/hooks/usePagination.js
import { useMemo, useState } from "react";
import { PAGE_SIZES } from "../constants/pagination";

/**
 * Reusable pagination hook
 * @param {Array} data - full array to paginate
 * @param {number} initialSize - default page size
 */
export default function usePagination(data = [], initialSize = PAGE_SIZES[0]) {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(initialSize);

  const pageCount = Math.max(1, Math.ceil((data?.length || 0) / pageSize));

  const pageRows = useMemo(() => {
    const start = (page - 1) * pageSize;
    return (data || []).slice(start, start + pageSize);
  }, [data, page, pageSize]);

  // if data size shrinks, keep page in range
  if (page > pageCount) {
   
    void setPage(pageCount);
  }

  const setPageSizeAndReset = (size) => {
    setPageSize(size);
    setPage(1);
  };

  return {
    page,
    setPage,
    pageSize,
    setPageSize: setPageSizeAndReset,
    pageCount,
    pageRows,
  };
}
