import { useEffect, useMemo, useState } from "react";

/**
 * Client-side pagination for already-fetched lists.
 *
 * @param items    the full (already filtered/sorted) array
 * @param pageSize rows per page
 * @param resetKey when this changes (e.g. the active search/filter), jump back
 *                 to page 1 so the user isn't stranded on an empty page
 */
export function usePagination<T>(items: T[], pageSize: number, resetKey?: unknown) {
  const [page, setPage] = useState(1);

  useEffect(() => {
    setPage(1);
  }, [resetKey]);

  const pageCount = Math.max(1, Math.ceil(items.length / pageSize));

  useEffect(() => {
    if (page > pageCount) setPage(pageCount);
  }, [page, pageCount]);

  const safePage = Math.min(page, pageCount);
  const pageItems = useMemo(
    () => items.slice((safePage - 1) * pageSize, safePage * pageSize),
    [items, safePage, pageSize],
  );

  const from = items.length === 0 ? 0 : (safePage - 1) * pageSize + 1;
  const to = Math.min(safePage * pageSize, items.length);

  return { page: safePage, setPage, pageCount, pageItems, total: items.length, from, to };
}

/** Windowed page-number list with ellipsis markers, e.g. [1, "…", 4, 5, 6, "…", 12]. */
export function pageWindow(page: number, pageCount: number, span = 1): (number | "…")[] {
  const out: (number | "…")[] = [];
  const start = Math.max(1, page - span);
  const end = Math.min(pageCount, page + span);
  if (start > 1) {
    out.push(1);
    if (start > 2) out.push("…");
  }
  for (let p = start; p <= end; p++) out.push(p);
  if (end < pageCount) {
    if (end < pageCount - 1) out.push("…");
    out.push(pageCount);
  }
  return out;
}
