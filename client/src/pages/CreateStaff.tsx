/*
 * SPAZEHAUS CREATE STAFF
 * Admin-only form for registering a new staff member directly from the web app
 * (no magic-link invite / seed SQL needed). Server-side gating: the
 * `staff_write_admin` RLS policy means only the ADMIN tier can insert — this
 * page also guards on `isAdminTier` client-side and bounces non-admins.
 *
 * The new record is linked to a Supabase Auth account automatically by the
 * `link_staff_to_auth_user` trigger the first time the person signs in with
 * the email entered here.
 */
import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { useLocation } from "wouter";
import { Check, UserPlus } from "lucide-react";
import { toast } from "sonner";
import AppHeader from "@/components/AppHeader";
import { useAuth } from "@/contexts/AuthContext";
import { useCreateStaff, deriveAvatarCode, isAdminTier, type CreateStaffArgs } from "@/lib/queries";
import type { StaffRow } from "@/lib/dbTypes";

const DEPTS = ["Design", "Operations", "Sales", "Admin"];
const ROLES: StaffRow["role"][] = [
  "principal", "admin", "admin_exec", "pm", "site_supervisor", "designer", "sales",
];
const STATUSES: StaffRow["status"][] = ["active", "on-leave", "on-project", "inactive"];

// Local YYYY-MM-DD for the join-date default (avoids UTC off-by-one near midnight).
function todayIso(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export default function CreateStaff() {
  const [, navigate] = useLocation();
  const { staff: me } = useAuth();
  const createStaff = useCreateStaff();

  const isAdmin = isAdminTier(me?.role);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const [dept, setDept] = useState(DEPTS[0]);
  const [role, setRole] = useState<StaffRow["role"]>("designer");
  const [status, setStatus] = useState<StaffRow["status"]>("active");
  const [phone, setPhone] = useState("");
  const [whatsappOptIn, setWhatsappOptIn] = useState(true);
  const [joinDate, setJoinDate] = useState(todayIso());
  const [avatarCode, setAvatarCode] = useState("");

  // Admin-only page — bounce anyone else (covers a deep link / role downgrade).
  useEffect(() => {
    if (me && !isAdmin) {
      toast.error("Only admins can add staff");
      navigate("/company/staff");
    }
  }, [me, isAdmin, navigate]);

  // Live preview of the avatar initials: the typed override, else derived.
  const avatarPreview = useMemo(
    () => (avatarCode.trim() ? avatarCode.trim().toUpperCase() : name.trim() ? deriveAvatarCode(name) : "?"),
    [avatarCode, name],
  );

  if (!me || !isAdmin) return null;

  async function handleSubmit() {
    if (!name.trim()) return toast.error("Name is required");
    if (!email.trim()) return toast.error("Email is required");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) return toast.error("Enter a valid email");
    if (!jobTitle.trim()) return toast.error("Job title is required");
    if (!joinDate) return toast.error("Join date is required");

    const args: CreateStaffArgs = {
      name: name.trim(),
      email: email.trim().toLowerCase(),
      job_title: jobTitle.trim(),
      dept,
      role,
      status,
      phone: phone.trim() || null,
      whatsapp_opt_in: whatsappOptIn,
      join_date: joinDate,
      avatar_code: avatarCode.trim() || undefined,
    };

    try {
      const created = await createStaff.mutateAsync(args);
      toast.success("Staff added", { description: `${created.name} · ${created.id}` });
      navigate(`/company/staff/${created.id}`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "unknown error";
      // Most likely cause if it ever fires: RLS rejected the insert.
      toast.error(`Could not add staff: ${msg}`);
    }
  }

  return (
    <div className="mobile-container">
      <AppHeader title="Add Staff" subtitle="NEW TEAM MEMBER" showBack compact />

      <div className="px-4 py-4 space-y-4 pb-10 lg:px-8 lg:py-7">
        {/* Identity preview */}
        <div className="flex items-center gap-3 rounded-2xl px-4 py-3.5" style={cardStyle}>
          <div
            className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0"
            style={{ background: "linear-gradient(135deg, oklch(0.62 0.09 68), oklch(0.52 0.08 65))" }}
          >
            <span className="text-white font-display font-semibold text-base">{avatarPreview}</span>
          </div>
          <div className="min-w-0">
            <p className="font-display text-base font-semibold leading-tight truncate" style={{ color: "oklch(0.14 0.008 65)" }}>
              {name.trim() || "New staff member"}
            </p>
            <p className="text-[11px]" style={{ color: "oklch(0.52 0.010 68)" }}>
              {jobTitle.trim() || "Job title"} · {dept}
            </p>
          </div>
        </div>

        <FieldGroup label="NAME *">
          <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Sarah Lim" style={inputStyle} />
        </FieldGroup>

        <FieldGroup label="EMAIL *" hint="The sign-in identity. The staff signs in with this email — auto-linked on first login.">
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@spazehaus.com" style={inputStyle} />
        </FieldGroup>

        <FieldGroup label="JOB TITLE *">
          <input type="text" value={jobTitle} onChange={(e) => setJobTitle(e.target.value)} placeholder="e.g. Interior Designer" style={inputStyle} />
        </FieldGroup>

        <div className="grid grid-cols-2 gap-3">
          <FieldGroup label="DEPARTMENT">
            <select value={dept} onChange={(e) => setDept(e.target.value)} style={inputStyle}>
              {DEPTS.map((d) => <option key={d} value={d}>{d}</option>)}
            </select>
          </FieldGroup>
          <FieldGroup label="STATUS">
            <select value={status} onChange={(e) => setStatus(e.target.value as StaffRow["status"])} style={inputStyle}>
              {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </FieldGroup>
        </div>

        <FieldGroup label="ROLE" hint="Controls access tier — admin (principal/admin/admin_exec), ops (pm/site_supervisor), field (designer/sales).">
          <select value={role} onChange={(e) => setRole(e.target.value as StaffRow["role"])} style={inputStyle}>
            {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
          </select>
        </FieldGroup>

        <div className="grid grid-cols-2 gap-3">
          <FieldGroup label="JOIN DATE *">
            <input type="date" value={joinDate} onChange={(e) => setJoinDate(e.target.value)} style={inputStyle} />
          </FieldGroup>
          <FieldGroup label="INITIALS" hint="Avatar code — auto-filled from name.">
            <input type="text" value={avatarCode} maxLength={3} onChange={(e) => setAvatarCode(e.target.value)} placeholder={name.trim() ? deriveAvatarCode(name) : "—"} style={inputStyle} />
          </FieldGroup>
        </div>

        <FieldGroup label="PHONE" hint="Used for WhatsApp site-photo reminders.">
          <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+60 12-345 6789" style={inputStyle} />
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
          <span className="relative w-11 h-6 rounded-full transition-colors" style={{ background: whatsappOptIn ? "oklch(0.55 0.09 145)" : "oklch(0.85 0.008 75)" }}>
            <span className="absolute top-0.5 w-5 h-5 rounded-full bg-white transition-all" style={{ left: whatsappOptIn ? "1.375rem" : "0.125rem" }} />
          </span>
        </button>

        {/* Action buttons — in normal flow so they never overlap the form
            (a fixed bar would mis-align against the desktop sidebar layout). */}
        <div className="flex gap-2 pt-2">
          <button
            onClick={() => navigate("/company/staff")}
            disabled={createStaff.isPending}
            className="flex-1 py-3 rounded-xl text-sm font-label"
            style={{ background: "oklch(0.96 0.006 75)", color: "oklch(0.35 0.008 65)", border: "1px solid oklch(0.90 0.010 75)", letterSpacing: "0.04em", opacity: createStaff.isPending ? 0.5 : 1 }}
          >
            Cancel
          </button>
          <motion.button
            whileTap={createStaff.isPending ? undefined : { scale: 0.96 }}
            onClick={handleSubmit}
            disabled={createStaff.isPending}
            className="flex-1 py-3 rounded-xl text-sm font-label font-semibold flex items-center justify-center gap-2"
            style={{
              background: "linear-gradient(135deg, oklch(0.62 0.09 68), oklch(0.52 0.08 65))",
              color: "oklch(1 0 0)",
              letterSpacing: "0.04em",
              boxShadow: createStaff.isPending ? "none" : "0 4px 16px oklch(0.62 0.09 68 / 0.35)",
              opacity: createStaff.isPending ? 0.7 : 1,
            }}
          >
            {createStaff.isPending ? <span>Adding…</span> : (<><UserPlus size={15} />Add Staff</>)}
          </motion.button>
        </div>
      </div>
    </div>
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

const cardStyle: React.CSSProperties = {
  background: "oklch(1 0 0)",
  border: "1px solid oklch(0.93 0.008 75)",
  boxShadow: "0 2px 12px oklch(0 0 0 / 0.04)",
};
