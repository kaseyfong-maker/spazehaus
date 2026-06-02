/*
 * SPAZEHAUS EDIT-STAFF SHEET
 * Bottom-sheet (mobile) / centred modal (desktop) form for editing a staff
 * record from the Staff Profile page.
 *
 * Two modes (driven by `canEditAll`):
 *   • admin tier        → name, job title, department, role, status, phone,
 *                         WhatsApp opt-in
 *   • self (non-admin)  → phone + WhatsApp opt-in only
 *
 * `email` is never editable here — it is the magic-link auth key. RLS
 * (`staff_write_admin` / `staff_update_self`) + the `guard_staff_sensitive_columns`
 * trigger enforce the same split server-side.
 */
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, UserCog, Check } from "lucide-react";
import { toast } from "sonner";
import { useUpdateStaff, type UpdateStaffArgs } from "@/lib/queries";
import { useIsDesktop } from "@/hooks/useMobile";
import type { StaffRow } from "@/lib/dbTypes";

const ROLES: StaffRow["role"][] = [
  "principal", "admin", "admin_exec", "pm", "site_supervisor", "designer", "sales",
];
const STATUSES: StaffRow["status"][] = ["active", "on-leave", "on-project", "inactive"];

export default function EditStaffSheet({
  staff,
  open,
  onClose,
  canEditAll,
}: {
  staff: StaffRow | null;
  open: boolean;
  onClose: () => void;
  /** true for the admin tier (full field set); false for a self-editor. */
  canEditAll: boolean;
}) {
  const updateStaff = useUpdateStaff();
  const isDesktop = useIsDesktop();

  const [name, setName] = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const [dept, setDept] = useState("");
  const [phone, setPhone] = useState("");
  const [whatsappOptIn, setWhatsappOptIn] = useState(true);
  const [role, setRole] = useState<StaffRow["role"]>("designer");
  const [status, setStatus] = useState<StaffRow["status"]>("active");

  // Reset the form whenever the sheet opens against a staff member
  useEffect(() => {
    if (open && staff) {
      setName(staff.name);
      setJobTitle(staff.job_title);
      setDept(staff.dept);
      setPhone(staff.phone ?? "");
      setWhatsappOptIn(staff.whatsapp_opt_in);
      setRole(staff.role);
      setStatus(staff.status);
    }
  }, [open, staff]);

  if (!staff) return null;

  async function handleSubmit() {
    if (!staff) return;
    if (canEditAll && !name.trim()) {
      toast.error("Name is required");
      return;
    }
    // Build the payload from the fields this mode is allowed to change.
    const args: UpdateStaffArgs = {
      id: staff.id,
      phone: phone.trim() || null,
      whatsapp_opt_in: whatsappOptIn,
    };
    if (canEditAll) {
      args.name = name.trim();
      args.job_title = jobTitle.trim();
      args.dept = dept.trim();
      args.role = role;
      args.status = status;
    }
    try {
      await updateStaff.mutateAsync(args);
      toast.success("Staff profile updated", { description: staff.name });
      onClose();
    } catch (err) {
      toast.error(`Update failed: ${err instanceof Error ? err.message : "unknown error"}`);
    }
  }

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={() => !updateStaff.isPending && onClose()}
            className="fixed inset-0 z-40"
            style={{ background: "oklch(0.11 0.004 285 / 0.55)", backdropFilter: "blur(4px)" }}
          />

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
                  <UserCog size={16} className="text-white" />
                </div>
                <div>
                  <p className="font-display text-base font-semibold leading-tight" style={{ color: "oklch(0.14 0.008 65)" }}>
                    Edit Profile
                  </p>
                  <p className="text-[11px]" style={{ color: "oklch(0.52 0.010 68)" }}>
                    {staff.name} · {staff.id}
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                disabled={updateStaff.isPending}
                className="w-8 h-8 rounded-full flex items-center justify-center"
                style={{ background: "oklch(0.96 0.006 75)", opacity: updateStaff.isPending ? 0.5 : 1 }}
              >
                <X size={14} style={{ color: "oklch(0.42 0.09 68)" }} />
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
              {canEditAll && (
                <>
                  <FieldGroup label="NAME *">
                    <input type="text" value={name} onChange={(e) => setName(e.target.value)} style={inputStyle} />
                  </FieldGroup>
                  <FieldGroup label="JOB TITLE">
                    <input type="text" value={jobTitle} onChange={(e) => setJobTitle(e.target.value)} style={inputStyle} />
                  </FieldGroup>
                  <FieldGroup label="DEPARTMENT">
                    <input type="text" value={dept} onChange={(e) => setDept(e.target.value)} style={inputStyle} />
                  </FieldGroup>
                  <FieldGroup label="ROLE" hint="Controls access tier (admin / ops / field).">
                    <select value={role} onChange={(e) => setRole(e.target.value as StaffRow["role"])} style={inputStyle}>
                      {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
                    </select>
                  </FieldGroup>
                  <FieldGroup label="STATUS">
                    <select value={status} onChange={(e) => setStatus(e.target.value as StaffRow["status"])} style={inputStyle}>
                      {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </FieldGroup>
                </>
              )}

              <FieldGroup label="PHONE" hint="Used for WhatsApp site-photo reminders.">
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+60 12-345 6789"
                  style={inputStyle}
                />
              </FieldGroup>

              {/* WhatsApp opt-in toggle */}
              <button
                type="button"
                onClick={() => setWhatsappOptIn((v) => !v)}
                className="w-full flex items-center justify-between rounded-xl px-3.5 py-3"
                style={{ background: "oklch(0.97 0.004 80)", border: "1px solid oklch(0.90 0.010 75)" }}
              >
                <div className="text-left">
                  <p className="text-sm font-medium" style={{ color: "oklch(0.20 0.008 65)" }}>WhatsApp reminders</p>
                  <p className="text-[11px]" style={{ color: "oklch(0.52 0.010 68)" }}>Daily site-photo SOP nudges</p>
                </div>
                <span
                  className="relative w-11 h-6 rounded-full transition-colors"
                  style={{ background: whatsappOptIn ? "oklch(0.55 0.09 145)" : "oklch(0.85 0.008 75)" }}
                >
                  <span
                    className="absolute top-0.5 w-5 h-5 rounded-full bg-white transition-all"
                    style={{ left: whatsappOptIn ? "1.375rem" : "0.125rem" }}
                  />
                </span>
              </button>

              {!canEditAll && (
                <p className="text-[11px] leading-relaxed" style={{ color: "oklch(0.52 0.010 68)" }}>
                  You can update your own phone and reminder preference. Name, role,
                  and status changes are handled by an admin.
                </p>
              )}
            </div>

            {/* Footer */}
            <div className="px-4 py-3 flex gap-2 shrink-0" style={{ borderTop: "1px solid oklch(0.93 0.008 75)" }}>
              <button
                onClick={onClose}
                disabled={updateStaff.isPending}
                className="flex-1 py-3 rounded-xl text-sm font-label"
                style={{
                  background: "oklch(0.96 0.006 75)",
                  color: "oklch(0.35 0.008 65)",
                  border: "1px solid oklch(0.90 0.010 75)",
                  letterSpacing: "0.04em",
                  opacity: updateStaff.isPending ? 0.5 : 1,
                }}
              >
                Cancel
              </button>
              <motion.button
                whileTap={updateStaff.isPending ? undefined : { scale: 0.96 }}
                onClick={handleSubmit}
                disabled={updateStaff.isPending}
                className="flex-1 py-3 rounded-xl text-sm font-label font-semibold flex items-center justify-center gap-2"
                style={{
                  background: "linear-gradient(135deg, oklch(0.62 0.09 68), oklch(0.52 0.08 65))",
                  color: "oklch(1 0 0)",
                  letterSpacing: "0.04em",
                  boxShadow: updateStaff.isPending ? "none" : "0 4px 16px oklch(0.62 0.09 68 / 0.35)",
                  opacity: updateStaff.isPending ? 0.7 : 1,
                }}
              >
                {updateStaff.isPending ? <span>Saving…</span> : (<><Check size={15} />Save Changes</>)}
              </motion.button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

// ─── Form primitives ────────────────────────────────────────────────────────

function FieldGroup({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-[10px] font-label mb-1.5" style={{ color: "oklch(0.52 0.010 68)", letterSpacing: "0.06em", fontWeight: 700 }}>
        {label}
      </label>
      {children}
      {hint && <p className="text-[10px] mt-1" style={{ color: "oklch(0.52 0.010 68)" }}>{hint}</p>}
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  background: "oklch(0.97 0.004 80)",
  border: "1px solid oklch(0.90 0.010 75)",
  color: "oklch(0.20 0.008 65)",
  borderRadius: "0.75rem",
  padding: "0.7rem 0.9rem",
  fontSize: "0.875rem",
  width: "100%",
  outline: "none",
};
