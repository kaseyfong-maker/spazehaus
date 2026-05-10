/*
 * SPAZEHAUS CALENDAR PAGE
 * Design: Dark premium calendar with event overlay
 */
import { useState } from "react";
import { motion } from "framer-motion";
import AppHeader from "@/components/AppHeader";
import { calendarEvents } from "@/lib/mockData";
import { ChevronLeft, ChevronRight } from "lucide-react";

const DAYS_OF_WEEK = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}
function getFirstDayOfMonth(year: number, month: number) {
  return new Date(year, month, 1).getDay();
}

const eventTypeLabels: Record<string, string> = {
  project: "Site Visit / Project",
  meeting: "Client Meeting",
  leave: "Staff Leave",
  event: "Company Event",
};

export default function CalendarPage() {
  const today = new Date();
  const [year, setYear] = useState(2026);
  const [month, setMonth] = useState(1); // February = 1
  const [selectedDate, setSelectedDate] = useState<string | null>("2026-02-24");

  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfMonth(year, month);

  const prevMonth = () => {
    if (month === 0) { setMonth(11); setYear((y) => y - 1); }
    else setMonth((m) => m - 1);
  };
  const nextMonth = () => {
    if (month === 11) { setMonth(0); setYear((y) => y + 1); }
    else setMonth((m) => m + 1);
  };

  const getEventsForDate = (dateStr: string) => calendarEvents.filter((e) => e.date === dateStr);

  const selectedEvents = selectedDate ? getEventsForDate(selectedDate) : [];

  const cells = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  return (
    <div className="mobile-container">
      <AppHeader title="Calendar" subtitle="SCHEDULE" compact />

      <div className="px-4 py-4 pb-24 space-y-4">
        {/* Month nav */}
        <div className="flex items-center justify-between">
          <motion.button whileTap={{ scale: 0.9 }} onClick={prevMonth} className="w-9 h-9 flex items-center justify-center rounded-full" style={{ background: "oklch(1 0 0)", border: "1px solid oklch(0.90 0.010 75)" }}>
            <ChevronLeft size={16} style={{ color: "oklch(0.52 0.09 68)" }} />
          </motion.button>
          <h3 className="font-display text-lg font-semibold text-neutral-900">{MONTHS[month]} {year}</h3>
          <motion.button whileTap={{ scale: 0.9 }} onClick={nextMonth} className="w-9 h-9 flex items-center justify-center rounded-full" style={{ background: "oklch(1 0 0)", border: "1px solid oklch(0.90 0.010 75)" }}>
            <ChevronRight size={16} style={{ color: "oklch(0.52 0.09 68)" }} />
          </motion.button>
        </div>

        {/* Calendar grid */}
        <div className="rounded-2xl p-4" style={{ background: "oklch(1 0 0)", border: "1px solid oklch(0.90 0.010 75)" }}>
          {/* Day headers */}
          <div className="grid grid-cols-7 mb-2">
            {DAYS_OF_WEEK.map((d) => (
              <div key={d} className="text-center py-1">
                <span className="text-[10px] font-label" style={{ color: "oklch(0.52 0.010 68)", letterSpacing: "0.04em" }}>{d}</span>
              </div>
            ))}
          </div>

          {/* Date cells */}
          <div className="grid grid-cols-7 gap-y-1">
            {cells.map((day, i) => {
              if (!day) return <div key={`empty-${i}`} />;
              const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
              const events = getEventsForDate(dateStr);
              const isToday = day === today.getDate() && month === today.getMonth() && year === today.getFullYear();
              const isSelected = dateStr === selectedDate;

              return (
                <motion.button
                  key={day}
                  whileTap={{ scale: 0.88 }}
                  onClick={() => setSelectedDate(dateStr)}
                  className="flex flex-col items-center py-1.5 rounded-xl relative"
                  style={{
                    background: isSelected ? "oklch(0.72 0.09 68)" : isToday ? "oklch(0.62 0.09 68 / 12%)" : "transparent",
                  }}
                >
                  <span
                    className="text-sm font-medium"
                    style={{
                      color: isSelected ? "oklch(1 0 0)" : isToday ? "oklch(0.72 0.09 68)" : "oklch(0.25 0.008 65)",
                    }}
                  >
                    {day}
                  </span>
                  {events.length > 0 && (
                    <div className="flex gap-0.5 mt-0.5">
                      {events.slice(0, 3).map((e, ei) => (
                        <div
                          key={ei}
                          className="w-1 h-1 rounded-full"
                          style={{ background: isSelected ? "oklch(0.62 0.09 68 / 70%)" : e.color }}
                        />
                      ))}
                    </div>
                  )}
                </motion.button>
              );
            })}
          </div>
        </div>

        {/* Selected date events */}
        {selectedDate && (
          <div>
            <p className="text-xs font-label mb-3" style={{ color: "oklch(0.52 0.010 68)", letterSpacing: "0.08em" }}>
              {new Date(selectedDate + "T00:00:00").toLocaleDateString("en-MY", { weekday: "long", day: "numeric", month: "long" }).toUpperCase()}
            </p>

            {selectedEvents.length === 0 ? (
              <div className="rounded-2xl p-6 text-center" style={{ background: "oklch(1 0 0)", border: "1px solid oklch(0.90 0.010 75)" }}>
                <p className="text-sm" style={{ color: "oklch(0.52 0.010 68)" }}>No events on this day</p>
              </div>
            ) : (
              <div className="space-y-2">
                {selectedEvents.map((event, i) => (
                  <motion.div
                    key={event.id}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.07 }}
                    className="rounded-xl p-3 flex items-center gap-3"
                    style={{ background: "oklch(1 0 0)", border: "1px solid oklch(0.90 0.010 75)" }}
                  >
                    <div
                      className="w-1.5 h-10 rounded-full shrink-0"
                      style={{ background: event.color }}
                    />
                    <div>
                      <p className="text-sm font-semibold text-neutral-900">{event.title}</p>
                      <p className="text-[10px] mt-0.5 font-label" style={{ color: "oklch(0.52 0.010 68)", letterSpacing: "0.04em" }}>
                        {eventTypeLabels[event.type] || event.type}
                      </p>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Upcoming events */}
        <div>
          <p className="text-xs font-label mb-3" style={{ color: "oklch(0.52 0.010 68)", letterSpacing: "0.08em" }}>UPCOMING THIS WEEK</p>
          <div className="space-y-2">
            {calendarEvents.slice(0, 4).map((event, i) => (
              <motion.div
                key={event.id}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
                className="rounded-xl p-3 flex items-center gap-3"
                style={{ background: "oklch(1 0 0)", border: "1px solid oklch(0.90 0.010 75)" }}
              >
                <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0" style={{ background: `${event.color}22` }}>
                  <span className="text-xs font-bold" style={{ color: event.color }}>
                    {new Date(event.date + "T00:00:00").getDate()}
                  </span>
                </div>
                <div className="flex-1">
                  <p className="text-sm text-neutral-900">{event.title}</p>
                  <p className="text-[10px] mt-0.5" style={{ color: "oklch(0.52 0.010 68)" }}>
                    {new Date(event.date + "T00:00:00").toLocaleDateString("en-MY", { weekday: "short", day: "numeric", month: "short" })}
                  </p>
                </div>
                <div className="w-2 h-2 rounded-full shrink-0" style={{ background: event.color }} />
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
