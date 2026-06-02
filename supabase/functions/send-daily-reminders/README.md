# `send-daily-reminders` — WhatsApp reminder dispatcher

Runs once a day, finds active build-phase projects whose close-door photo
hasn't been uploaded yet, and sends WhatsApp reminders to the responsible
site supervisor(s).

Status: **stub-mode by default** — the function is fully wired, the schema is
applied, dedup logic works, but no real WhatsApp messages send until you flip
`WHATSAPP_PROVIDER` to `meta` or `twilio` and provide the matching credentials.

---

## Quick-glance flow

```
┌────────────────────────────────────────────────────────────────┐
│  Scheduler (Supabase Cron / pg_cron / curl / external)         │
│  POSTs to /functions/v1/send-daily-reminders @ 09:00 UTC       │
└────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌────────────────────────────────────────────────────────────────┐
│  index.ts — Deno.serve()                                        │
│    1. Verify Authorization: Bearer <service-role|secret>        │
│    2. Build Supabase client (service-role → bypasses RLS)       │
│    3. resolveProvider(env) → Stub | Meta | Twilio               │
│    4. findDispatchTargets():                                    │
│         active+build projects                                   │
│         × site-supervisor staff                                 │
│         − projects with photo already uploaded today            │
│         − pairs already pinged today (dedup via whatsapp_log)   │
│    5. for each target → provider.send() → log                   │
│    6. return DispatchSummary JSON                               │
└────────────────────────────────────────────────────────────────┘
                              │
                              ▼
                       whatsapp_log table
                       (audit + dedup source)
```

---

## One-time setup

### 1. Apply the schema migration

In Supabase SQL Editor, paste `supabase/migrations/20260513000007_whatsapp_reminders.sql`.

Adds: `staff.whatsapp_opt_in` column (default true), `whatsapp_log` table, dedup
index, RLS policies. Idempotent — safe to re-run.

### 2. Set staff phone numbers

The schema already has `staff.phone` (nullable, E.164). Populate it for each
site supervisor:

```sql
UPDATE staff
   SET phone = '+60123456789'
 WHERE id = 'SH009';  -- Leong Hui
```

### 3. Deploy the function

From the project root (requires `supabase` CLI authenticated to your project):

```bash
bun x supabase functions deploy send-daily-reminders \
  --project-ref exajkbvaqjqdedqavbvs
```

Verify by hitting the function URL with your service role key — it should
return a JSON `DispatchSummary` (in stub mode, with `provider: "stub"` and
counts):

```bash
curl -X POST \
  "https://exajkbvaqjqdedqavbvs.supabase.co/functions/v1/send-daily-reminders" \
  -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json"
```

### 4. Schedule the function

Easiest: **Supabase Dashboard → Database → Cron Jobs → Create a new cron job**.

| Field | Value |
|---|---|
| Name | `send-daily-reminders` |
| Schedule | `0 9 * * *` (09:00 UTC = 5pm SGT, daily) |
| Type | HTTP Request |
| Method | POST |
| URL | `https://exajkbvaqjqdedqavbvs.supabase.co/functions/v1/send-daily-reminders` |
| Headers | `Authorization: Bearer <SUPABASE_SERVICE_ROLE_KEY>` and `Content-Type: application/json` |
| Body | `{}` (empty) |
| Timeout | 60 seconds |

Alternative (pg_cron + pg_net, in SQL Editor — paste once):

```sql
-- Replace <SERVICE_ROLE_KEY> with the value from
-- Supabase → Settings → API → service_role key.
SELECT cron.schedule(
  'send-daily-reminders',
  '0 9 * * *',
  $$
  SELECT net.http_post(
    url     := 'https://exajkbvaqjqdedqavbvs.supabase.co/functions/v1/send-daily-reminders',
    headers := jsonb_build_object(
      'Authorization', 'Bearer <SERVICE_ROLE_KEY>',
      'Content-Type', 'application/json'
    ),
    body    := '{}'::jsonb
  );
  $$
);
```

To unschedule: `SELECT cron.unschedule('send-daily-reminders');`.

---

## Going live — pick a provider

The function defaults to `StubProvider` (console.log only). To send real
WhatsApp messages, set `WHATSAPP_PROVIDER` and the matching credentials in
**Supabase → Edge Functions → Secrets**:

### Option A — Meta WhatsApp Cloud API (free tier: 1,000 conversations/month)

1. Create a Meta Business Manager account at https://business.facebook.com/
2. Add a WhatsApp Business Account, then add + verify a phone number you own
3. Create a message template named e.g. `daily_site_photo_reminder` with body:

   ```
   Hi {{1}}, friendly reminder: please upload today's close-door photo
   for "{{2}}" (date {{3}}). Snap & upload via the Spazehaus app.
   ```

   Approved templates take a few hours to clear Meta review.

4. Generate a System User access token with `whatsapp_business_messaging`
   permission. Keep it — it doesn't expire if generated correctly.

5. Set these secrets in Supabase:

   | Key | Value |
   |---|---|
   | `WHATSAPP_PROVIDER` | `meta` |
   | `WHATSAPP_META_ACCESS_TOKEN` | (your system user access token) |
   | `WHATSAPP_META_PHONE_NUMBER_ID` | (numeric, from your WhatsApp Business Account settings) |
   | `WHATSAPP_META_TEMPLATE_NAME` | `daily_site_photo_reminder` |
   | `WHATSAPP_META_TEMPLATE_LANG` | `en` (must match the template registration) |

### Option B — Twilio WhatsApp

1. Sign up at https://www.twilio.com/ and enable WhatsApp messaging (sandbox
   for testing, then production senders for real use)
2. Note your Account SID + Auth Token (Twilio Console → Dashboard)
3. Create a Content Template (Twilio Content API) with the same body as above
   and capture the SID (starts with `HX...`)
4. Set these secrets in Supabase:

   | Key | Value |
   |---|---|
   | `WHATSAPP_PROVIDER` | `twilio` |
   | `TWILIO_ACCOUNT_SID` | `AC...` |
   | `TWILIO_AUTH_TOKEN` | (Twilio auth token) |
   | `TWILIO_WHATSAPP_FROM` | e.g. `whatsapp:+14155238886` (sandbox) or your prod sender |
   | `TWILIO_WHATSAPP_CONTENT_SID` | `HX...` |

### Optional — separate dispatch secret

Instead of using the service role key as the dispatch credential, you can set
a dedicated `WHATSAPP_DISPATCH_SECRET` and use that in the cron job's
`Authorization` header. Lower blast radius if the cron config leaks.

---

## Testing

```bash
# Trigger a dispatch right now (will respect dedup; only sends if a
# project is missing today's photo AND nobody's been pinged yet today)
curl -sS -X POST \
  "https://exajkbvaqjqdedqavbvs.supabase.co/functions/v1/send-daily-reminders" \
  -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  | jq .

# Sample output (stub provider, 1 project missing photo, 1 supervisor):
# {
#   "ok": true,
#   "provider": "stub",
#   "scheduledAtIso": "2026-05-13T09:00:01.234Z",
#   "durationMs": 142,
#   "counts": { "sent": 1, "failed": 0, "skipped_no_phone": 0,
#               "skipped_opt_out": 0, "skipped_already_pinged": 0,
#               "skipped_no_supervisor": 0 },
#   "attempts": [ ... ]
# }

# Check the audit log
psql "$SUPABASE_DB_URL" -c \
  "select sent_at, staff_id, project_id, status, provider, error_message
     from whatsapp_log order by sent_at desc limit 10;"

# Force a re-send today (e.g. after fixing a misconfigured template) —
# clear the dedup entry for today:
delete from whatsapp_log
 where sent_at::date = (now() at time zone 'Asia/Singapore')::date;
```

---

## Operational notes

- **Idempotency**: the same call repeated within a day is safe — the dedup
  query filters out staff/project pairs already in `whatsapp_log` for today.
- **Failure handling**: provider errors are caught and logged with
  `status='failed'`. The dispatcher still counts those as "attempted" for
  dedup purposes (we don't want to spam staff with retries on the same day).
  Investigate failures via the admin UI at `/company/audit` (filter
  `table=whatsapp_log`) or via direct SQL.
- **Multi-supervisor scaling**: today the dispatcher pings *every* active
  staff with `role='site_supervisor'`. When SPAZEHAUS scales to multiple
  supervisors-per-project, add a `projects.site_supervisor_id` column and
  scope the cross-product accordingly. The query in `findDispatchTargets()`
  is the single place to update.
- **Time zone**: the function uses UTC internally but formats `photo_date`
  as DD/MM/YYYY for the template variable. The 5pm-SGT scheduling happens
  at the cron layer, not in the function code — so if you move to a
  different region, just change the cron expression.
