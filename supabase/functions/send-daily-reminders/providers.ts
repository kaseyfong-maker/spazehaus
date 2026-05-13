/*
 * SPAZEHAUS — WhatsApp reminders: provider implementations
 *
 * Three implementations of the `WhatsAppProvider` interface:
 *
 *   StubProvider  — logs only, never sends. Default. Use to verify the
 *                   dispatch pipeline end-to-end before involving a real
 *                   provider account.
 *
 *   MetaProvider  — Meta WhatsApp Cloud API. Free tier (1k conversations
 *                   per month). Requires Meta Business Manager + approved
 *                   template.
 *
 *   TwilioProvider — Twilio WhatsApp API. Easier setup (Twilio handles Meta
 *                    onboarding). Paid per message but cheap at this volume.
 *
 * Provider selection happens in index.ts based on the WHATSAPP_PROVIDER
 * env var.
 */
import type { ProviderResult, ReminderTarget, WhatsAppProvider } from "./types.ts";

// ─── StubProvider ─────────────────────────────────────────────────────────
// Logs the would-be send to console and pretends it succeeded. Use when you
// want to test the dispatch pipeline (query, dedup, log-write) without
// signing up for a real WhatsApp provider yet.
export class StubProvider implements WhatsAppProvider {
  readonly name = "stub";

  async sendDailySitePhotoReminder(target: ReminderTarget): Promise<ProviderResult> {
    const templateVariables = {
      staff_name: target.staffName,
      project_name: target.projectName,
      photo_date: target.photoDateIso,
    };
    // Visible in Supabase → Edge Functions → Logs.
    console.log(
      `[stub] would send WhatsApp to ${target.phone} ` +
        `(staff=${target.staffName} project=${target.projectName})`,
    );
    return {
      status: "sent",
      providerMessageId: `stub_${Date.now()}_${target.staffId}_${target.projectId}`,
      templateName: "daily_site_photo_reminder",
      templateVariables,
    };
  }
}

// ─── MetaProvider ─────────────────────────────────────────────────────────
// Meta WhatsApp Cloud API. Docs:
//   https://developers.facebook.com/docs/whatsapp/cloud-api/reference/messages
//
// Required env vars:
//   WHATSAPP_META_ACCESS_TOKEN     — system-user access token (never expires
//                                    if generated correctly)
//   WHATSAPP_META_PHONE_NUMBER_ID  — the numeric id of the WhatsApp Business
//                                    phone number you registered with Meta
//   WHATSAPP_META_TEMPLATE_NAME    — exact name of your approved template
//                                    (e.g. "daily_site_photo_reminder")
//   WHATSAPP_META_TEMPLATE_LANG    — BCP-47 language code matching the
//                                    template registration (e.g. "en", "en_US")
//
// Template must accept three positional body variables in this order:
//   {{1}} = staff first name
//   {{2}} = project name
//   {{3}} = date string (DD/MM/YYYY)
export class MetaProvider implements WhatsAppProvider {
  readonly name = "meta";

  constructor(
    private readonly accessToken: string,
    private readonly phoneNumberId: string,
    private readonly templateName: string,
    private readonly templateLang: string,
  ) {}

  async sendDailySitePhotoReminder(target: ReminderTarget): Promise<ProviderResult> {
    const url = `https://graph.facebook.com/v22.0/${this.phoneNumberId}/messages`;
    const templateVariables = {
      "1": target.staffName.split(" ")[0],
      "2": target.projectName,
      "3": target.photoDateIso,
    };
    const body = {
      messaging_product: "whatsapp",
      to: stripPlusForMeta(target.phone),
      type: "template",
      template: {
        name: this.templateName,
        language: { code: this.templateLang },
        components: [
          {
            type: "body",
            parameters: [
              { type: "text", text: templateVariables["1"] },
              { type: "text", text: templateVariables["2"] },
              { type: "text", text: templateVariables["3"] },
            ],
          },
        ],
      },
    };

    try {
      const res = await fetch(url, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${this.accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });
      const json = (await res.json().catch(() => ({}))) as {
        messages?: Array<{ id: string }>;
        error?: { message?: string; code?: number };
      };
      if (!res.ok || json.error) {
        return {
          status: "failed",
          errorMessage:
            json.error?.message ?? `Meta API HTTP ${res.status}`,
          templateName: this.templateName,
          templateVariables,
        };
      }
      const messageId = json.messages?.[0]?.id ?? null;
      return {
        status: "sent",
        providerMessageId: messageId ?? undefined,
        templateName: this.templateName,
        templateVariables,
      };
    } catch (err) {
      return {
        status: "failed",
        errorMessage: err instanceof Error ? err.message : String(err),
        templateName: this.templateName,
        templateVariables,
      };
    }
  }
}

// Meta wants the number with country code but WITHOUT a leading '+'.
function stripPlusForMeta(phone: string): string {
  return phone.startsWith("+") ? phone.slice(1) : phone;
}

// ─── TwilioProvider ───────────────────────────────────────────────────────
// Twilio WhatsApp API. Docs:
//   https://www.twilio.com/docs/whatsapp/api
//
// Required env vars:
//   TWILIO_ACCOUNT_SID           — starts with 'AC...'
//   TWILIO_AUTH_TOKEN            — Twilio auth token (rotate regularly)
//   TWILIO_WHATSAPP_FROM         — your Twilio WhatsApp sender number,
//                                  formatted as 'whatsapp:+1415XXXXXXX'
//   TWILIO_WHATSAPP_CONTENT_SID  — Content Template SID (HX...) of your
//                                  approved template
//
// The template must accept three positional variables (1=staff, 2=project,
// 3=date). See Twilio Content API for details on creating templates:
//   https://www.twilio.com/docs/content
export class TwilioProvider implements WhatsAppProvider {
  readonly name = "twilio";

  constructor(
    private readonly accountSid: string,
    private readonly authToken: string,
    private readonly fromWhatsApp: string,
    private readonly contentSid: string,
  ) {}

  async sendDailySitePhotoReminder(target: ReminderTarget): Promise<ProviderResult> {
    const url = `https://api.twilio.com/2010-04-01/Accounts/${this.accountSid}/Messages.json`;
    const templateVariables = {
      "1": target.staffName.split(" ")[0],
      "2": target.projectName,
      "3": target.photoDateIso,
    };
    const params = new URLSearchParams({
      From: this.fromWhatsApp,
      To: `whatsapp:${target.phone}`,
      ContentSid: this.contentSid,
      ContentVariables: JSON.stringify(templateVariables),
    });

    try {
      const auth = btoa(`${this.accountSid}:${this.authToken}`);
      const res = await fetch(url, {
        method: "POST",
        headers: {
          "Authorization": `Basic ${auth}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: params.toString(),
      });
      const json = (await res.json().catch(() => ({}))) as {
        sid?: string;
        message?: string;
        code?: number;
      };
      if (!res.ok) {
        return {
          status: "failed",
          errorMessage: json.message ?? `Twilio API HTTP ${res.status}`,
          templateName: this.contentSid,
          templateVariables,
        };
      }
      return {
        status: "sent",
        providerMessageId: json.sid,
        templateName: this.contentSid,
        templateVariables,
      };
    } catch (err) {
      return {
        status: "failed",
        errorMessage: err instanceof Error ? err.message : String(err),
        templateName: this.contentSid,
        templateVariables,
      };
    }
  }
}

// ─── Provider factory ─────────────────────────────────────────────────────
/** Resolve the active provider from env vars. Falls back to stub on any
 *  misconfiguration so the dispatch pipeline keeps working without leaking
 *  credentials or failing silently. */
export function resolveProvider(env: {
  WHATSAPP_PROVIDER?: string;
  WHATSAPP_META_ACCESS_TOKEN?: string;
  WHATSAPP_META_PHONE_NUMBER_ID?: string;
  WHATSAPP_META_TEMPLATE_NAME?: string;
  WHATSAPP_META_TEMPLATE_LANG?: string;
  TWILIO_ACCOUNT_SID?: string;
  TWILIO_AUTH_TOKEN?: string;
  TWILIO_WHATSAPP_FROM?: string;
  TWILIO_WHATSAPP_CONTENT_SID?: string;
}): WhatsAppProvider {
  const choice = (env.WHATSAPP_PROVIDER ?? "stub").trim().toLowerCase();

  if (choice === "meta") {
    const access = env.WHATSAPP_META_ACCESS_TOKEN;
    const phoneId = env.WHATSAPP_META_PHONE_NUMBER_ID;
    const tpl = env.WHATSAPP_META_TEMPLATE_NAME;
    const lang = env.WHATSAPP_META_TEMPLATE_LANG ?? "en";
    if (!access || !phoneId || !tpl) {
      console.warn(
        "[provider] WHATSAPP_PROVIDER=meta but one of " +
          "WHATSAPP_META_ACCESS_TOKEN / WHATSAPP_META_PHONE_NUMBER_ID / " +
          "WHATSAPP_META_TEMPLATE_NAME is missing — falling back to stub.",
      );
      return new StubProvider();
    }
    return new MetaProvider(access, phoneId, tpl, lang);
  }

  if (choice === "twilio") {
    const sid = env.TWILIO_ACCOUNT_SID;
    const token = env.TWILIO_AUTH_TOKEN;
    const from = env.TWILIO_WHATSAPP_FROM;
    const content = env.TWILIO_WHATSAPP_CONTENT_SID;
    if (!sid || !token || !from || !content) {
      console.warn(
        "[provider] WHATSAPP_PROVIDER=twilio but one of " +
          "TWILIO_ACCOUNT_SID / TWILIO_AUTH_TOKEN / TWILIO_WHATSAPP_FROM / " +
          "TWILIO_WHATSAPP_CONTENT_SID is missing — falling back to stub.",
      );
      return new StubProvider();
    }
    return new TwilioProvider(sid, token, from, content);
  }

  return new StubProvider();
}
