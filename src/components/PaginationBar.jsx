// src/components/PaginationBar.jsx
import React from "react";
import { PAGE_SIZES } from "../constants/pagination";

/**
 * Dumb pagination bar – purely UI + callbacks from parent/hook
 */
export default function PaginationBar({
  page,
  pageCount,
  pageSize,
  onChangePage,
  onChangePageSize,
  className = "",
}) {
  return (
    <div className={`pagination ${className}`}>
      <div>
        <label>
          Page size:&nbsp;
          <select
            className="page-size-select"
            value={pageSize}
            onChange={(e) => onChangePageSize(Number(e.target.value))}
          >
            {PAGE_SIZES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="pagination-center">
        <button onClick={() => onChangePage(1)} disabled={page === 1}>
          ⏮
        </button>
        <button
          onClick={() => onChangePage(Math.max(1, page - 1))}
          disabled={page === 1}
        >
          ◀
        </button>
        <span style={{ margin: "0 6px" }}>
          Page {page} / {pageCount}
        </span>
        <button
          onClick={() => onChangePage(Math.min(pageCount, page + 1))}
          disabled={page === pageCount}
        >
          ▶
        </button>
        <button onClick={() => onChangePage(pageCount)} disabled={page === pageCount}>
          ⏭
        </button>
      </div>

      <div />
    </div>
  );
}
