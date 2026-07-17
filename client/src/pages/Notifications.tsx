/*
 * SPAZEHAUS — NOTIFICATION PREFERENCES
 * Per-staff in-app alert toggles, persisted to notification_preferences.
 * Reached from Profile → Notifications.
 */
import AppHeader from "@/components/AppHeader";
import { Switch } from "@/components/ui/switch";
import { useAuth } from "@/contexts/AuthContext";
import {
  useNotificationPrefs,
  useUpdateNotificationPrefs,
  DEFAULT_NOTIFICATION_PREFS,
  type NotificationPrefs,
} from "@/lib/queries";
import { toast } from "sonner";
import { Bell, Megaphone, Coins, CheckSquare, CalendarClock } from "lucide-react";

type CategoryKey = Exclude<keyof NotificationPrefs, "notifications_enabled">;

const CATEGORIES: { key: CategoryKey; icon: typeof Bell; label: string; subtitle: string; color: string }[] = [
  { key: "reminders", icon: CalendarClock, label: "Reminders", subtitle: "Daily site photos & weekly cadence", color: "var(--acc)" },
  { key: "announcements", icon: Megaphone, label: "Announcements", subtitle: "Company-wide updates", color: "oklch(0.70 0.09 240)" },
  { key: "payment_alerts", icon: Coins, label: "Payment alerts", subtitle: "Collections & overdue gates", color: "oklch(0.55 0.09 145)" },
  { key: "task_updates", icon: CheckSquare, label: "Task updates", subtitle: "Assignments & status changes", color: "oklch(0.68 0.12 25)" },
];

const cardStyle = { background: "var(--s-card)", border: "1px solid var(--b-1)" } as const;

export default function Notifications() {
  const { staff: me } = useAuth();
  const { data: prefs = DEFAULT_NOTIFICATION_PREFS, isLoading } = useNotificationPrefs(me?.id);
  const update = useUpdateNotificationPrefs(me?.id);

  const save = (next: NotificationPrefs) => {
    update.mutate(next, {
      onError: (e) => toast.error(`Couldn't save: ${e instanceof Error ? e.message : "unknown error"}`),
    });
  };

  const masterOff = !prefs.notifications_enabled;
  const disabled = isLoading || !me;

  return (
    <div className="mobile-container" style={{ background: "var(--s-page)" }}>
      <AppHeader title="Notifications" subtitle="IN-APP ALERTS" showBack compact />

      <div className="px-4 py-4 pb-24 space-y-5 lg:px-8 lg:py-7 lg:max-w-[720px]">
        {/* Master switch */}
        <div className="rounded-2xl p-4 flex items-center gap-3" style={cardStyle}>
          <IconBox icon={Bell} color="var(--acc)" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium" style={{ color: "var(--t-1)" }}>Enable notifications</p>
            <p className="text-xs" style={{ color: "var(--t-5)" }}>Master switch for all in-app alerts</p>
          </div>
          <Switch
            checked={prefs.notifications_enabled}
            onCheckedChange={(v) => save({ ...prefs, notifications_enabled: v })}
            disabled={disabled}
            data-testid="notif-master"
            aria-label="Enable notifications"
          />
        </div>

        {/* Categories */}
        <div className="rounded-2xl overflow-hidden" style={cardStyle}>
          {CATEGORIES.map((c, i) => (
            <div
              key={c.key}
              className="flex items-center gap-3 px-4 py-3.5"
              style={{
                borderBottom: i < CATEGORIES.length - 1 ? "1px solid var(--b-2)" : "none",
                opacity: masterOff ? 0.45 : 1,
                transition: "opacity 0.2s",
              }}
            >
              <IconBox icon={c.icon} color={c.color} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium" style={{ color: "var(--t-1)" }}>{c.label}</p>
                <p className="text-xs" style={{ color: "var(--t-5)" }}>{c.subtitle}</p>
              </div>
              <Switch
                checked={!masterOff && prefs[c.key]}
                onCheckedChange={(v) => save({ ...prefs, [c.key]: v } as NotificationPrefs)}
                disabled={disabled || masterOff}
                data-testid={`notif-${c.key}`}
                aria-label={c.label}
              />
            </div>
          ))}
        </div>

        <p className="text-xs leading-relaxed px-1" style={{ color: "var(--t-5)" }}>
          These control the in-app alerts and badges you see. Changes save automatically.
        </p>
      </div>
    </div>
  );
}

function IconBox({ icon: Icon, color }: { icon: typeof Bell; color: string }) {
  return (
    <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: "var(--s-3)" }}>
      <Icon size={15} style={{ color }} />
    </div>
  );
}
