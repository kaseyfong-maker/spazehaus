/*
 * SPAZEHAUS — Pagination bar (client-side, page numbers)
 * Prev / windowed numbers / Next + "from–to of total". Hidden when one page.
 */
import { ChevronLeft, ChevronRight } from "lucide-react";
import { pageWindow } from "@/hooks/usePagination";

export default function PaginationBar({
  page,
  pageCount,
  onPage,
  from,
  to,
  total,
  label = "items",
}: {
  page: number;
  pageCount: number;
  onPage: (p: number) => void;
  from: number;
  to: number;
  total: number;
  label?: string;
}) {
  if (pageCount <= 1) return null;
  const win = pageWindow(page, pageCount);

  return (
    <div className="flex items-center justify-between gap-3 pt-4 flex-wrap">
      <span className="text-[11px]" style={{ color: "var(--t-5)" }}>
        {from}–{to} of {total} {label}
      </span>

      <div className="flex items-center gap-1">
        <PagerButton disabled={page === 1} onClick={() => onPage(page - 1)} ariaLabel="Previous page">
          <ChevronLeft size={15} />
        </PagerButton>

        {win.map((p, i) =>
          p === "…" ? (
            <span key={`e${i}`} className="px-1.5 text-xs" style={{ color: "var(--t-6)" }}>…</span>
          ) : (
            <button
              key={p}
              onClick={() => onPage(p)}
              aria-label={`Page ${p}`}
              aria-current={p === page ? "page" : undefined}
              className="min-w-8 h-8 px-2 rounded-lg text-xs font-label transition-colors"
              style={
                p === page
                  ? { background: "var(--acc-strong)", color: "oklch(1 0 0)", fontWeight: 700, border: "1px solid var(--acc-strong)" }
                  : { background: "var(--s-card)", color: "var(--t-3)", border: "1px solid var(--b-1)" }
              }
            >
              {p}
            </button>
          ),
        )}

        <PagerButton disabled={page === pageCount} onClick={() => onPage(page + 1)} ariaLabel="Next page">
          <ChevronRight size={15} />
        </PagerButton>
      </div>
    </div>
  );
}

function PagerButton({
  disabled, onClick, ariaLabel, children,
}: {
  disabled: boolean;
  onClick: () => void;
  ariaLabel: string;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      aria-label={ariaLabel}
      className="w-8 h-8 flex items-center justify-center rounded-lg"
      style={{
        background: "var(--s-card)",
        color: "var(--t-3)",
        border: "1px solid var(--b-1)",
        opacity: disabled ? 0.4 : 1,
        cursor: disabled ? "not-allowed" : "pointer",
      }}
    >
      {children}
    </button>
  );
}
