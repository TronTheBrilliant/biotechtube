interface UpcomingEvent {
  name: string;
  date: string;
  endDate?: string;
  location: string;
}

interface UpcomingEventsSectionProps {
  events: UpcomingEvent[];
}

function formatDateRange(date: string, endDate?: string): string {
  const d = new Date(date);
  const month = d.toLocaleString("en-US", { month: "short" });
  const day = d.getDate();
  if (endDate) {
    const ed = new Date(endDate);
    const endDay = ed.getDate();
    return `${month} ${day}-${endDay}`;
  }
  return `${month} ${day}`;
}

function getCity(location: string): string {
  return location.split(",")[0].trim();
}

export function UpcomingEventsSection({ events }: UpcomingEventsSectionProps) {
  return (
    <div>
      {events.map((event, i) => (
        <div
          key={i}
          className="px-4 py-2.5 flex items-center gap-3"
          style={
            i < events.length - 1
              ? { borderBottom: "0.5px solid var(--color-border-subtle)" }
              : undefined
          }
        >
          {/* Date badge */}
          <div
            className="flex flex-col items-center justify-center flex-shrink-0 rounded-md w-10 h-10"
            style={{
              background: "var(--color-bg-tertiary)",
              border: "0.5px solid var(--color-border-subtle)",
            }}
          >
            <span
              className="text-[10px] uppercase font-medium leading-none"
              style={{ color: "var(--color-accent)" }}
            >
              {new Date(event.date).toLocaleString("en-US", { month: "short" })}
            </span>
            <span
              className="text-[15px] font-medium leading-tight"
              style={{ color: "var(--color-text-primary)" }}
            >
              {new Date(event.date).getDate()}
            </span>
          </div>

          {/* Name + location */}
          <div className="min-w-0">
            <div
              className="text-13 font-medium truncate"
              style={{ color: "var(--color-text-primary)" }}
            >
              {event.name}
            </div>
            <div
              className="text-11"
              style={{ color: "var(--color-text-secondary)" }}
            >
              {getCity(event.location)}
            </div>
          </div>

          {/* Spacer */}
          <div className="flex-1" />

          {/* Date range */}
          <span
            className="text-11 flex-shrink-0"
            style={{ color: "var(--color-text-tertiary)" }}
          >
            {formatDateRange(event.date, event.endDate)}
          </span>
        </div>
      ))}
    </div>
  );
}
