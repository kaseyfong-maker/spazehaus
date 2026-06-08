/*
 * SPAZEHAUS CONVERT-INQUIRY DIALOG
 * Mobile bottom-sheet form that converts a "new-inquiry" / "showroom-meet"
 * customer into a real project.
 *
 * On submit:
 *   • A new Project is created (assigned status, 0% progress)
 *   • A new ProjectLifecycle is initialised at stage 4 (Design Proposal Signed)
 *     with gate ① Proposal Deposit collected today
 *   • The inquiry flips to "awarded" with awardedProjectId
 *   • User is navigated to the new project
 */
import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useLocation } from "wouter";
import { X, Sparkles, Calendar, Coins, AlertCircle, Check } from "lucide-react";
import { toast } from "sonner";
import { useAllStaff, useConvertInquiry, type Inquiry } from "@/lib/queries";
import { formatRM } from "@/lib/quotationData";
import { useIsDesktop } from "@/hooks/useMobile";

type Priority = "high" | "medium" | "low";

type FormState = {
  projectName: string;
  designerStaffId: string;
  pmStaffId: string;
  startDate: string;       // YYYY-MM-DD (input format)
  targetDate: string;
  budget: string;          // string for input control
  proposalDeposit: string;
  priority: Priority;
  areas: string;           // comma-separated
};

// —— date helpers ——
function pad(n: number) { return String(n).padStart(2, "0"); }
function isoToday(): string {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
function isoPlusDays(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
/** Convert YYYY-MM-DD → DD/MM/YYYY (the SPAZEHAUS canonical format). */
function isoToDDMMYYYY(iso: string): string {
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

export default function ConvertInquiryDialog({
  inquiry,
  open,
  onClose,
}: {
  inquiry: Inquiry;
  open: boolean;
  onClose: () => void;
}) {
  const [, navigate] = useLocation();
  const { data: allStaff = [] } = useAllStaff();
  const convertMutation = useConvertInquiry();
  const isDesktop = useIsDesktop();

  // Sensible defaults pulled from the inquiry
  const designStaff = useMemo(() => allStaff.filter((s) => s.dept === "Design"), [allStaff]);
  const opsStaff = useMemo(() => allStaff.filter((s) => s.dept === "Operations"), [allStaff]);

  const defaultDesigner = designStaff[1] || designStaff[0]; // skip Grace if there's a senior designer
  const defaultPM = opsStaff[0];
  const defaultBudget = inquiry.estimatedBudget ?? 100_000;
  const defaultDeposit = Math.max(2_000, Math.round(defaultBudget * 0.02));

  const [form, setForm] = useState<FormState>(() => ({
    projectName: `${inquiry.client.split(/[\s.&-]+/)[0] || "New"} ${inquiry.propertyType}`.trim(),
    designerStaffId: defaultDesigner?.id ?? "",
    pmStaffId: defaultPM?.id ?? "",
    startDate: isoToday(),
    targetDate: isoPlusDays(120),
    budget: String(defaultBudget),
    proposalDeposit: String(defaultDeposit),
    priority: "medium",
    areas: "",
  }));

  const [submitting, setSubmitting] = useState(false);

  // Derived validation
  const budgetNum = parseFloat(form.budget) || 0;
  const depositNum = parseFloat(form.proposalDeposit) || 0;
  const errors: string[] = [];
  if (!form.projectName.trim()) errors.push("Project name is required.");
  if (!form.designerStaffId) errors.push("Assign a designer.");
  if (!form.pmStaffId) errors.push("Assign a project manager.");
  if (budgetNum <= 0) errors.push("Budget must be greater than 0.");
  if (depositNum < 0 || depositNum > budgetNum) errors.push("Deposit must be ≥ 0 and ≤ budget.");
  if (form.startDate >= form.targetDate) errors.push("Target date must be after start date.");
  const isValid = errors.length === 0;

  async function handleSubmit() {
    if (!isValid || submitting) return;
    setSubmitting(true);

    const designer = allStaff.find((s) => s.id === form.designerStaffId);
    const pm = allStaff.find((s) => s.id === form.pmStaffId);

    try {
      const newId = await convertMutation.mutateAsync({
        inquiryId: inquiry.id,
        projectName: form.projectName.trim(),
        designerName: designer?.name ?? "",
        pmName: pm?.name ?? "",
        designerAvatar: designer?.avatar_code ?? "",
        pmAvatar: pm?.avatar_code ?? "",
        startDate: isoToDDMMYYYY(form.startDate),
        targetDate: isoToDDMMYYYY(form.targetDate),
        budget: budgetNum,
        priority: form.priority,
        areas: form.areas
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
        proposalDeposit: depositNum,
        assignedToAvatar: inquiry.assignedTo,
      });

      toast.success(`Converted to ${newId}`, {
        description: `${form.projectName} is live in /projects · ${formatRM(budgetNum)} secured`,
      });

      onClose();
      // Small timeout so the toast renders before route change
      setTimeout(() => navigate(`/projects/${newId}?tab=Lifecycle`), 250);
    } catch (err: any) {
      toast.error(err?.message ?? "Could not convert inquiry");
      setSubmitting(false);
    }
  }

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            className="fixed inset-0 z-40"
            style={{ background: "oklch(0.11 0.004 285 / 0.55)", backdropFilter: "blur(4px)" }}
          />

          {/* Bottom sheet */}
          <motion.div
            initial={isDesktop ? { opacity: 0, scale: 0.96 } : { y: "100%" }}
            animate={isDesktop ? { opacity: 1, scale: 1 } : { y: 0 }}
            exit={isDesktop ? { opacity: 0, scale: 0.96 } : { y: "100%" }}
            transition={isDesktop ? { duration: 0.18 } : { type: "spring", damping: 32, stiffness: 320 }}
            className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] z-50 flex flex-col lg:bottom-auto lg:top-1/2 lg:-translate-y-1/2 lg:max-w-[480px]"
            style={{
              maxHeight: "92vh",
              background: "oklch(1 0 0)",
              borderRadius: isDesktop ? 28 : "28px 28px 0 0",
              boxShadow: "0 -12px 48px oklch(0 0 0 / 0.18)",
            }}
          >
            {/* Drag handle (mobile bottom-sheet affordance only) */}
            <div className="flex justify-center pt-2.5 pb-1.5 shrink-0 lg:hidden">
              <div className="w-10 h-1 rounded-full" style={{ background: "oklch(0.85 0.008 75)" }} />
            </div>

            {/* Header */}
            <div
              className="px-4 pb-3 flex items-start justify-between shrink-0"
              style={{ borderBottom: "1px solid oklch(0.93 0.008 75)" }}
            >
              <div className="flex items-center gap-2.5">
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center"
                  style={{ background: "linear-gradient(135deg, oklch(0.62 0.09 68), oklch(0.52 0.08 65))" }}
                >
                  <Sparkles size={16} className="text-white" />
                </div>
                <div>
                  <p className="font-display text-base font-semibold leading-tight" style={{ color: "oklch(0.14 0.008 65)" }}>
                    Convert to Project
                  </p>
                  <p className="text-[11px]" style={{ color: "oklch(0.52 0.010 68)" }}>
                    {inquiry.client} · {inquiry.id}
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="w-8 h-8 rounded-full flex items-center justify-center"
                style={{ background: "oklch(0.96 0.006 75)" }}
              >
                <X size={14} style={{ color: "oklch(0.42 0.09 68)" }} />
              </button>
            </div>

            {/* Body — scrollable */}
            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
              <FieldGroup label="PROJECT NAME">
                <TextInput
                  value={form.projectName}
                  onChange={(v) => setForm({ ...form, projectName: v })}
                  placeholder="The Paragon Residence"
                />
              </FieldGroup>

              <div className="grid grid-cols-2 gap-3">
                <FieldGroup label="DESIGNER">
                  <Select
                    testid="convert-designer"
                    value={form.designerStaffId}
                    onChange={(v) => setForm({ ...form, designerStaffId: v })}
                    options={designStaff.map((s) => ({ value: s.id, label: s.name }))}
                  />
                </FieldGroup>
                <FieldGroup label="PROJECT MANAGER">
                  <Select
                    testid="convert-pm"
                    value={form.pmStaffId}
                    onChange={(v) => setForm({ ...form, pmStaffId: v })}
                    options={opsStaff.map((s) => ({ value: s.id, label: s.name }))}
                  />
                </FieldGroup>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <FieldGroup label="START DATE" icon={Calendar}>
                  <DateInput value={form.startDate} onChange={(v) => setForm({ ...form, startDate: v })} />
                </FieldGroup>
                <FieldGroup label="TARGET COMPLETION" icon={Calendar}>
                  <DateInput value={form.targetDate} onChange={(v) => setForm({ ...form, targetDate: v })} />
                </FieldGroup>
              </div>

              <FieldGroup label="CONFIRMED BUDGET (RM)" icon={Coins}>
                <NumberInput
                  value={form.budget}
                  onChange={(v) => setForm({ ...form, budget: v })}
                  prefix="RM"
                  hint={inquiry.estimatedBudget ? `Estimated at inquiry: ${formatRM(inquiry.estimatedBudget)}` : undefined}
                />
              </FieldGroup>

              <FieldGroup label="① PROPOSAL DEPOSIT (collected today)" icon={Coins}>
                <NumberInput
                  value={form.proposalDeposit}
                  onChange={(v) => setForm({ ...form, proposalDeposit: v })}
                  prefix="RM"
                  hint="Booking fee for the design phase. Sets gate ① as collected."
                />
              </FieldGroup>

              <FieldGroup label="PRIORITY">
                <div className="grid grid-cols-3 gap-2">
                  {([
                    { p: "high"   as Priority, tint: "oklch(0.50 0.12 25)",  bg: "oklch(0.60 0.12 25 / 12%)" },
                    { p: "medium" as Priority, tint: "oklch(0.42 0.09 68)",  bg: "oklch(0.62 0.09 68 / 12%)" },
                    { p: "low"    as Priority, tint: "oklch(0.38 0.09 145)", bg: "oklch(0.55 0.09 145 / 12%)" },
                  ]).map(({ p, tint, bg }) => {
                    const active = form.priority === p;
                    return (
                      <button
                        key={p}
                        onClick={() => setForm({ ...form, priority: p })}
                        className="py-2 rounded-lg text-xs font-label"
                        style={{
                          background: active ? bg : "oklch(0.985 0.004 80)",
                          color: active ? tint : "oklch(0.52 0.010 68)",
                          border: active ? `1.5px solid ${tint}` : "1px solid oklch(0.90 0.010 75)",
                          letterSpacing: "0.06em",
                          fontWeight: active ? 700 : 500,
                        }}
                      >
                        {p.toUpperCase()}
                      </button>
                    );
                  })}
                </div>
              </FieldGroup>

              <FieldGroup label="PROJECT AREAS (optional, comma-separated)">
                <TextInput
                  value={form.areas}
                  onChange={(v) => setForm({ ...form, areas: v })}
                  placeholder="Living Room, Master Bedroom, Kitchen"
                />
              </FieldGroup>

              {/* Preview card */}
              <div
                className="rounded-2xl p-3"
                style={{
                  background: "linear-gradient(135deg, oklch(0.62 0.09 68 / 5%), oklch(1 0 0))",
                  border: "1px solid oklch(0.62 0.09 68 / 25%)",
                }}
              >
                <p className="text-[10px] font-label mb-2" style={{ color: "oklch(0.42 0.09 68)", letterSpacing: "0.10em", fontWeight: 700 }}>
                  WHAT HAPPENS ON CONVERT
                </p>
                <Bullet text="A new project is created at status “Assigned”." />
                <Bullet text="Lifecycle starts at stage 4 — Design Proposal Signed." />
                <Bullet text={`Gate ① Proposal Deposit (${formatRM(depositNum)}) marked collected today.`} />
                <Bullet text={`Inquiry ${inquiry.id} flips to “Awarded” and links to the new project.`} />
              </div>

              {/* Errors */}
              {errors.length > 0 && (
                <div
                  className="rounded-xl p-3 flex items-start gap-2"
                  style={{ background: "oklch(0.60 0.12 25 / 8%)", border: "1px solid oklch(0.60 0.12 25 / 25%)" }}
                >
                  <AlertCircle size={14} style={{ color: "oklch(0.50 0.12 25)" }} className="mt-0.5 shrink-0" />
                  <div>
                    {errors.map((e) => (
                      <p key={e} className="text-[11px]" style={{ color: "oklch(0.50 0.12 25)" }}>
                        {e}
                      </p>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div
              className="px-4 py-3 flex gap-2 shrink-0"
              style={{ borderTop: "1px solid oklch(0.93 0.008 75)", paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 12px)" }}
            >
              <button
                onClick={onClose}
                className="flex-1 py-3 rounded-xl text-sm font-label"
                style={{
                  background: "oklch(0.985 0.004 80)",
                  color: "oklch(0.42 0.09 68)",
                  border: "1px solid oklch(0.90 0.010 75)",
                  letterSpacing: "0.04em",
                  fontWeight: 600,
                }}
              >
                Cancel
              </button>
              <motion.button
                whileTap={isValid ? { scale: 0.97 } : undefined}
                onClick={handleSubmit}
                disabled={!isValid || submitting}
                data-testid="convert-submit"
                className="flex-[2] py-3 rounded-xl text-sm font-label flex items-center justify-center gap-1.5"
                style={{
                  background: isValid
                    ? "linear-gradient(135deg, oklch(0.62 0.09 68), oklch(0.52 0.08 65))"
                    : "oklch(0.85 0.008 75)",
                  color: "white",
                  letterSpacing: "0.06em",
                  fontWeight: 700,
                  opacity: isValid ? 1 : 0.6,
                  boxShadow: isValid ? "0 4px 16px oklch(0.62 0.09 68 / 0.30)" : "none",
                }}
              >
                {submitting ? (
                  <>Converting…</>
                ) : (
                  <>
                    <Check size={14} strokeWidth={3} />
                    CONVERT TO PROJECT
                  </>
                )}
              </motion.button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

// ─── form atoms ──────────────────────────────────────────────────────────────

function FieldGroup({
  label,
  icon: Icon,
  children,
}: {
  label: string;
  icon?: typeof Calendar;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="flex items-center gap-1.5 mb-1.5">
        {Icon && <Icon size={11} style={{ color: "oklch(0.52 0.010 68)" }} />}
        <p className="text-[10px] font-label" style={{ color: "oklch(0.52 0.010 68)", letterSpacing: "0.08em", fontWeight: 700 }}>
          {label}
        </p>
      </div>
      {children}
    </div>
  );
}

function TextInput({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
      style={{
        background: "oklch(0.985 0.004 80)",
        border: "1px solid oklch(0.90 0.010 75)",
        color: "oklch(0.20 0.008 65)",
      }}
    />
  );
}

function NumberInput({
  value,
  onChange,
  prefix,
  hint,
}: {
  value: string;
  onChange: (v: string) => void;
  prefix?: string;
  hint?: string;
}) {
  return (
    <div>
      <div
        className="flex items-center gap-2 px-3 py-2.5 rounded-xl"
        style={{ background: "oklch(0.985 0.004 80)", border: "1px solid oklch(0.90 0.010 75)" }}
      >
        {prefix && (
          <span className="text-[10px] font-label" style={{ color: "oklch(0.52 0.010 68)", letterSpacing: "0.04em" }}>
            {prefix}
          </span>
        )}
        <input
          type="number"
          inputMode="decimal"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="flex-1 bg-transparent outline-none text-sm font-display font-semibold"
          style={{ color: "oklch(0.20 0.008 65)" }}
        />
      </div>
      {hint && (
        <p className="text-[10px] mt-1" style={{ color: "oklch(0.52 0.010 68)" }}>
          {hint}
        </p>
      )}
    </div>
  );
}

function DateInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <input
      type="date"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
      style={{
        background: "oklch(0.985 0.004 80)",
        border: "1px solid oklch(0.90 0.010 75)",
        color: "oklch(0.20 0.008 65)",
      }}
    />
  );
}

function Select({
  value,
  onChange,
  options,
  testid,
}: {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  testid?: string;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      data-testid={testid}
      className="w-full px-3 py-2.5 rounded-xl text-sm outline-none appearance-none"
      style={{
        background: "oklch(0.985 0.004 80)",
        border: "1px solid oklch(0.90 0.010 75)",
        color: "oklch(0.20 0.008 65)",
      }}
    >
      <option value="">— select —</option>
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}

function Bullet({ text }: { text: string }) {
  return (
    <div className="flex items-start gap-1.5 mb-1">
      <Check size={11} style={{ color: "oklch(0.38 0.09 145)" }} className="mt-0.5 shrink-0" strokeWidth={3} />
      <p className="text-[11px] leading-snug" style={{ color: "oklch(0.30 0.008 65)" }}>
        {text}
      </p>
    </div>
  );
}
