"use client";

import Link from "next/link";
import { Calendar, ArrowUpRight } from "lucide-react";
import { BiotechEvent } from "@/lib/types";

interface UpcomingEventsProps {
  events: BiotechEvent[];
}

const flagMap: Record<string, string> = {
  Spain: "🇪🇸", Norway: "🇳🇴", USA: "🇺🇸", Germany: "🇩🇪",
  France: "🇫🇷", UK: "🇬🇧", Switzerland: "🇨🇭", Denmark: "🇩🇰",
};

function getFlag(location: string): string {
  for (const [country, flag] of Object.entries(flagMap)) {
    if (location.includes(country)) return flag;
  }
  return "🌍";
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

function getCity(location: string): string {
  return location.split(",")[0].trim();
}

export function UpcomingEvents({ events }: UpcomingEventsProps) {
  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between px-3.5 py-2.5 border-b" style={{ borderColor: "var(--color-border-subtle)" }}>
        <div className="flex items-center gap-1.5">
          <Calendar size={14} style={{ color: "var(--color-accent)" }} />
          <span className="text-12 uppercase tracking-[0.5px] font-medium" style={{ color: "var(--color-text-secondary)" }}>
            Upcoming Events
          </span>
        </div>
        <Link href="/events" className="flex items-center gap-1 text-12 font-medium" style={{ color: "var(--color-accent)" }}>
          All events <ArrowUpRight size={11} />
        </Link>
      </div>

      {/* Events */}
      {events.map((event, i) => (
        <Link
          key={i}
          href="/events"
          className="flex items-start gap-3 px-3.5 py-3 border-b transition-colors duration-100 hover:bg-[var(--color-bg-secondary)]"
          style={{ borderColor: "var(--color-border-subtle)" }}
        >
          {/* Date badge */}
          <div
            className="flex flex-col items-center justify-center flex-shrink-0 rounded-lg w-[42px] h-[42px]"
            style={{ background: "var(--color-bg-tertiary)", border: "0.5px solid var(--color-border-subtle)" }}
          >
            <span className="text-[10px] uppercase font-medium leading-none" style={{ color: "var(--color-accent)" }}>
              {new Date(event.date).toLocaleString("en-US", { month: "short" })}
            </span>
            <span className="text-[16px] font-medium leading-tight" style={{ color: "var(--color-text-primary)" }}>
              {new Date(event.date).getDate()}
            </span>
          </div>
          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="text-13 font-medium mb-0.5 truncate" style={{ color: "var(--color-text-primary)" }}>
              {event.name}
            </div>
            <div className="flex items-center gap-1.5 text-12" style={{ color: "var(--color-text-tertiary)" }}>
              <span>{getFlag(event.location)}</span>
              <span>{getCity(event.location)}</span>
              <span>·</span>
              <span style={{ color: "var(--color-accent)" }}>{formatEventDate(event.date, event.endDate)}</span>
            </div>
          </div>
        </Link>
      ))}
    </div>
  );
}
