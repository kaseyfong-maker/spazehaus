/*
 * SPAZEHAUS — SearchableSelect
 * A lightweight, dependency-free combobox: a styled trigger that opens a panel
 * with a search box + filtered option list. Built for long pickers (customers,
 * projects). Controlled — pass `value` + `onChange`. Closes on select, Escape,
 * or outside click.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { Search, ChevronDown, Check, X } from "lucide-react";

export type SearchableOption = { value: string; label: string; sublabel?: string };

interface SearchableSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: SearchableOption[];
  placeholder?: string;
  searchPlaceholder?: string;
  emptyText?: string;
  clearLabel?: string;
  disabled?: boolean;
  testId?: string;
}

export default function SearchableSelect({
  value,
  onChange,
  options,
  placeholder = "Select…",
  searchPlaceholder = "Search…",
  emptyText = "No matches",
  clearLabel,
  disabled = false,
  testId,
}: SearchableSelectProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const selected = options.find((o) => o.value === value);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter(
      (o) => o.label.toLowerCase().includes(q) || (o.sublabel ? o.sublabel.toLowerCase().includes(q) : false),
    );
  }, [options, query]);

  useEffect(() => {
    if (!open) { setQuery(""); return; }
    const onDown = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    const t = setTimeout(() => inputRef.current?.focus(), 0);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
      clearTimeout(t);
    };
  }, [open]);

  const pick = (v: string) => { onChange(v); setOpen(false); };

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        data-testid={testId}
        disabled={disabled}
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between gap-2 text-left"
        style={{ ...triggerStyle, opacity: disabled ? 0.5 : 1, cursor: disabled ? "not-allowed" : "pointer" }}
      >
        <span className="min-w-0 truncate" style={{ color: selected ? "var(--t-2)" : "var(--t-5)" }}>
          {selected ? selected.label : placeholder}
        </span>
        <ChevronDown size={15} style={{ color: "var(--t-5)", flexShrink: 0, transform: open ? "rotate(180deg)" : "none", transition: "transform 0.15s" }} />
      </button>

      {open && (
        <div
          className="absolute left-0 right-0 z-50 mt-1 rounded-xl overflow-hidden"
          style={{ background: "var(--s-card)", border: "1px solid var(--b-strong)", boxShadow: "0 12px 32px oklch(0 0 0 / 0.14)" }}
        >
          <div className="flex items-center gap-2 px-3 py-2.5" style={{ borderBottom: "1px solid var(--b-2)" }}>
            <Search size={14} style={{ color: "var(--t-6)", flexShrink: 0 }} />
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={searchPlaceholder}
              className="flex-1 bg-transparent outline-none text-sm"
              style={{ color: "var(--t-2)" }}
            />
            {query && (
              <button type="button" onClick={() => { setQuery(""); inputRef.current?.focus(); }} aria-label="Clear search">
                <X size={14} style={{ color: "var(--t-5)" }} />
              </button>
            )}
          </div>

          <div className="max-h-64 overflow-y-auto">
            {clearLabel && (
              <OptionRow label={clearLabel} selected={value === ""} muted onClick={() => pick("")} />
            )}
            {filtered.length === 0 ? (
              <div className="px-3 py-4 text-center text-xs" style={{ color: "var(--t-5)" }}>{emptyText}</div>
            ) : (
              filtered.map((o) => (
                <OptionRow key={o.value} label={o.label} sublabel={o.sublabel} selected={o.value === value} onClick={() => pick(o.value)} />
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function OptionRow({
  label, sublabel, selected, muted, onClick,
}: { label: string; sublabel?: string; selected: boolean; muted?: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full flex items-center justify-between gap-2 px-3 py-2.5 text-left transition-colors"
      style={{ background: selected ? "oklch(0.62 0.09 68 / 10%)" : "transparent", borderBottom: "1px solid var(--s-2)" }}
      onMouseEnter={(e) => { if (!selected) e.currentTarget.style.background = "var(--s-3)"; }}
      onMouseLeave={(e) => { if (!selected) e.currentTarget.style.background = "transparent"; }}
    >
      <span className="min-w-0">
        <span className="block text-sm truncate" style={{ color: muted ? "var(--t-5)" : "var(--t-2)", fontStyle: muted ? "italic" : "normal" }}>{label}</span>
        {sublabel && <span className="block text-[11px] truncate" style={{ color: "var(--t-5)" }}>{sublabel}</span>}
      </span>
      {selected && <Check size={15} style={{ color: "var(--acc-ink)", flexShrink: 0 }} />}
    </button>
  );
}

const triggerStyle: React.CSSProperties = {
  background: "var(--s-2)",
  border: "1px solid var(--b-1)",
  borderRadius: "0.75rem",
  padding: "0.75rem 1rem",
  fontSize: "0.875rem",
  width: "100%",
  outline: "none",
};
