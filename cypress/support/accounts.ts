// Seed staff accounts (see supabase/seed.sql). All log in by magic link.
export const ACCOUNTS = {
  admin: "admin@spazehaus.test", // Grace Tan · principal (ADMIN)
  admin2: "admin2@spazehaus.test", // Adam Lee · admin (2nd ADMIN)
  ops: "ops@spazehaus.test", // Priya Menon · pm (OPS)
  site: "site@spazehaus.test", // Sam Wong · site_supervisor (OPS)
  field: "designer@spazehaus.test", // Jamie Tan · designer (FIELD)
  sales: "sales@spazehaus.test", // Jordan Teh · sales (FIELD)
} as const;
