/*
 * SPAZEHAUS — Database row types
 *
 * Hand-written for now to match the Supabase schema (Phase 0A migrations).
 * In Phase 0C we'll generate these automatically from the database via
 * `supabase gen types typescript`.
 */

export type StaffRole =
  | "admin"
  | "principal"
  | "designer"
  | "sales"
  | "site_supervisor"
  | "pm"
  | "admin_exec";

export type StaffStatus = "active" | "on-leave" | "on-project" | "inactive";

export type StaffRow = {
  id: string;                     // SH001
  auth_user_id: string | null;
  email: string;
  name: string;
  role: StaffRole;
  job_title: string;
  dept: string;
  avatar_code: string;
  status: StaffStatus;
  join_date: string;              // YYYY-MM-DD
  leave_balance_annual: number;
  leave_balance_medical: number;
  kpi_grade: string | null;
  phone: string | null;
  created_at: string;
  updated_at: string;
};
