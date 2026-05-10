/*
 * SPAZEHAUS QUOTATION LIST PAGE
 * Design: Dark premium list of quotations and invoices
 * Accessible from Projects tab and individual Project Detail
 */
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useLocation } from "wouter";
import { Plus, Search, FileText, Receipt } from "lucide-react";
import AppHeader from "@/components/AppHeader";
import { quotations, statusConfig, computeTotals, formatRM } from "@/lib/quotationData";

const typeFilters = [
  { key: "all", label: "All" },
  { key: "Quotation", label: "Quotations" },
  { key: "Invoice", label: "Invoices" },
  { key: "Proforma Invoice", label: "Proforma" },
];

const statusFilters = [
  { key: "all", label: "All Status" },
  { key: "draft", label: "Draft" },
  { key: "sent", label: "Sent" },
  { key: "accepted", label: "Accepted" },
  { key: "paid", label: "Paid" },
];

export default function QuotationList() {
  const [, navigate] = useLocation();
  const [typeFilter, setTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [search, setSearch] = useState("");

  const filtered = quotations.filter((q) => {
    const matchType = typeFilter === "all" || q.type === typeFilter;
    const matchStatus = statusFilter === "all" || q.status === statusFilter;
    const matchSearch =
      q.id.toLowerCase().includes(search.toLowerCase()) ||
      q.projectName.toLowerCase().includes(search.toLowerCase()) ||
      q.client.toLowerCase().includes(search.toLowerCase());
    return matchType && matchStatus && matchSearch;
  });

  const totalValue = quotations.reduce((sum, q) => sum + computeTotals(q.items, q.taxRate).total, 0);
  const acceptedValue = quotations
    .filter((q) => q.status === "accepted" || q.status === "invoiced" || q.status === "paid")
    .reduce((sum, q) => sum + computeTotals(q.items, q.taxRate).total, 0);

  return (
    <div className="mobile-container">
      <AppHeader title="Quotations" subtitle="& INVOICES" showBack compact />

      <div className="px-4 py-4 space-y-4 pb-24">
        {/* Summary cards */}
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-2xl p-4" style={{ background: "oklch(1 0 0)", border: "1px solid oklch(0.90 0.010 75)" }}>
            <p className="text-[10px] font-label mb-1" style={{ color: "oklch(0.52 0.010 68)", letterSpacing: "0.06em" }}>TOTAL PIPELINE</p>
            <p className="text-lg font-display font-semibold" style={{ color: "oklch(0.52 0.09 68)" }}>{formatRM(totalValue)}</p>
            <p className="text-[10px] mt-0.5" style={{ color: "oklch(0.52 0.010 68)" }}>{quotations.length} documents</p>
          </div>
          <div className="rounded-2xl p-4" style={{ background: "oklch(1 0 0)", border: "1px solid oklch(0.90 0.010 75)" }}>
            <p className="text-[10px] font-label mb-1" style={{ color: "oklch(0.52 0.010 68)", letterSpacing: "0.06em" }}>ACCEPTED / PAID</p>
            <p className="text-lg font-display font-semibold" style={{ color: "oklch(0.70 0.09 145)" }}>{formatRM(acceptedValue)}</p>
            <p className="text-[10px] mt-0.5" style={{ color: "oklch(0.52 0.010 68)" }}>
              {quotations.filter((q) => q.status === "accepted" || q.status === "paid").length} accepted
            </p>
          </div>
        </div>

        {/* Search */}
        <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl" style={{ background: "oklch(1 0 0)", border: "1px solid oklch(0.90 0.010 75)" }}>
          <Search size={14} style={{ color: "oklch(0.52 0.010 68)" }} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by ID, project or client..."
            className="flex-1 bg-transparent text-sm outline-none"
            style={{ color: "oklch(0.20 0.008 65)" }}
          />
        </div>

        {/* Type filters */}
        <div className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4">
          {typeFilters.map((f) => (
            <motion.button
              key={f.key}
              whileTap={{ scale: 0.92 }}
              onClick={() => setTypeFilter(f.key)}
              className="shrink-0 px-3 py-1.5 rounded-full text-xs font-label"
              style={{
                background: typeFilter === f.key ? "oklch(0.62 0.09 68)" : "oklch(1 0 0)",
                color: typeFilter === f.key ? "oklch(1 0 0)" : "oklch(0.45 0.008 65)",
                border: typeFilter === f.key ? "none" : "1px solid oklch(0.90 0.010 75)",
                letterSpacing: "0.04em",
                fontWeight: typeFilter === f.key ? 600 : 400,
              }}
            >
              {f.label}
            </motion.button>
          ))}
        </div>

        {/* Status filters */}
        <div className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4">
          {statusFilters.map((f) => (
            <motion.button
              key={f.key}
              whileTap={{ scale: 0.92 }}
              onClick={() => setStatusFilter(f.key)}
              className="shrink-0 px-3 py-1.5 rounded-full text-xs font-label"
              style={{
                background: statusFilter === f.key ? "oklch(0.62 0.09 68 / 10%)" : "transparent",
                color: statusFilter === f.key ? "oklch(0.42 0.09 68)" : "oklch(0.45 0.008 65)",
                border: statusFilter === f.key ? "1px solid oklch(0.62 0.09 68 / 25%)" : "1px solid oklch(0.90 0.010 75)",
                letterSpacing: "0.04em",
              }}
            >
              {f.label}
            </motion.button>
          ))}
        </div>

        {/* Quotation cards */}
        <AnimatePresence mode="popLayout">
          <div className="space-y-3">
            {filtered.length === 0 && (
              <div className="rounded-2xl p-8 text-center" style={{ background: "oklch(1 0 0)", border: "1px solid oklch(0.90 0.010 75)" }}>
                <p className="text-sm" style={{ color: "oklch(0.52 0.010 68)" }}>No documents found</p>
              </div>
            )}
            {filtered.map((q, i) => {
              const sc = statusConfig[q.status];
              const { total } = computeTotals(q.items, q.taxRate);
              const isInvoice = q.type === "Invoice" || q.type === "Proforma Invoice";
              return (
                <motion.div
                  key={q.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.96 }}
                  transition={{ delay: i * 0.05 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => navigate(`/quotations/${q.id}`)}
                  className="rounded-2xl p-4"
                  style={{ background: "oklch(1 0 0)", border: "1px solid oklch(0.90 0.010 75)" }}
                >
                  <div className="flex items-start gap-3 mb-3">
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                      style={{ background: isInvoice ? "oklch(0.70 0.09 240 / 15%)" : "oklch(0.62 0.09 68 / 12%)" }}
                    >
                      {isInvoice
                        ? <Receipt size={18} style={{ color: "oklch(0.70 0.09 240)" }} />
                        : <FileText size={18} style={{ color: "oklch(0.52 0.09 68)" }} />
                      }
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="text-sm font-semibold text-neutral-900">{q.id}</p>
                          <p className="text-xs mt-0.5" style={{ color: "oklch(0.52 0.010 68)" }}>{q.projectName}</p>
                        </div>
                        <span
                          className="status-pill shrink-0"
                          style={{ background: sc.bg, color: sc.color, border: `1px solid ${sc.border}` }}
                        >
                          {sc.label}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs" style={{ color: "oklch(0.52 0.010 68)" }}>{q.client}</p>
                      <p className="text-[10px] mt-0.5" style={{ color: "oklch(0.52 0.010 68)" }}>
                        {q.type} · Rev {q.revision} · {q.issueDate}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-base font-display font-semibold" style={{ color: "oklch(0.52 0.09 68)" }}>
                        {formatRM(total)}
                      </p>
                      <p className="text-[10px]" style={{ color: "oklch(0.52 0.010 68)" }}>
                        {q.items.length} line items
                      </p>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </AnimatePresence>
      </div>

      {/* FAB */}
      <motion.button
        whileTap={{ scale: 0.9 }}
        onClick={() => navigate("/quotations/new")}
        className="fixed bottom-20 right-4 w-14 h-14 rounded-full flex items-center justify-center shadow-2xl z-40"
        style={{ background: "linear-gradient(135deg, oklch(0.62 0.09 68), oklch(0.52 0.08 65))", boxShadow: "0 4px 20px oklch(0.62 0.09 68 / 40%)" }}
      >
        <Plus size={22} style={{ color: "oklch(1 0 0)" }} />
      </motion.button>
    </div>
  );
}
