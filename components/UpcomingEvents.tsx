"use client";

import { Calendar } from "lucide-react";
import { BiotechEvent } from "@/lib/types";

interface UpcomingEventsProps {
  events: BiotechEvent[];
}

function formatEventDate(date: string, endDate?: string): string {
  const d = new Date(date);
  const month = d.toLocaleString("en-US", { month: "short" });
  const day = d.getDate();

  if (endDate) {
    const ed = new Date(endDate);
    const endDay = ed.getDate();
    return `${month} ${day}–${endDay}`;
  }
  return `${month} ${day}`;
}

export function UpcomingEvents({ events }: UpcomingEventsProps) {
  return (
    <div>
      <div className="flex items-center gap-2 px-3.5 py-2.5 border-b">
        <Calendar size={14} style={{ color: "var(--color-text-secondary)" }} />
        <span
          className="text-12 uppercase tracking-[0.5px] font-medium"
          style={{ color: "var(--color-text-secondary)" }}
        >
          UPCOMING EVENTS
        </span>
      </div>
      {events.map((event, i) => (
        <div
          key={i}
          className="px-3.5 py-2.5 border-b cursor-pointer transition-colors duration-100"
          onMouseEnter={(e) =>
            (e.currentTarget.style.background = "var(--color-bg-secondary)")
          }
          onMouseLeave={(e) => (e.currentTarget.style.background = "")}
        >
          <div
            className="text-14 font-medium mb-[2px]"
            style={{ color: "var(--color-text-primary)" }}
          >
            {event.name}
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-12" style={{ color: "var(--color-accent)" }}>
              {formatEventDate(event.date, event.endDate)}
            </span>
            <span className="text-12" style={{ color: "var(--color-text-tertiary)" }}>
              · {event.location}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}
