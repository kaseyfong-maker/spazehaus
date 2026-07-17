/*
 * SPAZEHAUS — company + support contact (single source of truth)
 *
 * Mirrors the COMPANY_INFO block used on generated PDFs (lib/generatePDF.ts).
 * Consumed by the in-app Help & Support page. Update here when details change.
 */
export const COMPANY = {
  name: "Spazehaus Design Sdn Bhd",
  regNo: "202001012345 (1234567-A)",
  address: "No. 12, Jalan Molek 1/30, Taman Molek, 81300 Johor Bahru, Johor, Malaysia",
  phone: "+60 7-358 8899",
  email: "hello@spazehaus.com",
  website: "www.spazehaus.com",
  /**
   * Support contact used by Help & Support. Email + phone are wired to real
   * mailto:/tel: links. `whatsapp` is optional — set it to a WhatsApp-capable
   * number in international format WITHOUT the leading "+" (e.g. "60127961234")
   * to surface a "Chat on WhatsApp" button; leave it empty to hide that option.
   */
  support: {
    email: "hello@spazehaus.com",
    phone: "+60 7-358 8899",
    whatsapp: "" as string,
  },
} as const;
