import { Check } from "lucide-react";

export function PaywallCard() {
  const features = [
    { text: "Full company rankings", soon: false },
    { text: "All company profiles", soon: false },
    { text: "Watchlist & alerts", soon: false },
    { text: "Funding round data", soon: false },
    { text: "AI investor assistant", soon: true },
    { text: "Weekly email digest", soon: true },
  ];

  return (
    <div
      className="rounded-lg overflow-hidden border"
      style={{
        background: "var(--color-bg-secondary)",
        borderColor: "var(--color-border-subtle)",
      }}
    >
      <div className="px-3.5 py-3" style={{ background: "#0a3d2e" }}>
        <div className="text-13 font-medium" style={{ color: "#5DCAA5" }}>
          Unlock Full Access
        </div>
        <div className="text-11" style={{ color: "#5DCAA5" }}>
          See every company. Track every deal.
        </div>
      </div>
      <div className="px-3.5 py-3">
        <div className="mb-2">
          <span
            className="text-[22px] font-medium tracking-tight"
            style={{ color: "var(--color-text-primary)", letterSpacing: "-0.5px" }}
          >
            $49
          </span>
          <span className="text-11 ml-1" style={{ color: "var(--color-text-secondary)" }}>
            /month
          </span>
        </div>
        <div className="text-11 mb-3" style={{ color: "var(--color-accent)" }}>
          First month free
        </div>
        <div className="flex flex-col gap-2 mb-3">
          {features.map((f) => (
            <div key={f.text} className="flex items-center gap-1.5">
              <div
                className="w-3.5 h-3.5 rounded-sm flex items-center justify-center"
                style={{ background: "var(--color-accent)" }}
              >
                <Check size={10} color="white" strokeWidth={2.5} />
              </div>
              <span className="text-12" style={{ color: "var(--color-text-primary)" }}>
                {f.text}
              </span>
              {f.soon && (
                <span
                  className="text-[9px] ml-[3px]"
                  style={{ color: "var(--color-text-tertiary)" }}
                >
                  Coming soon
                </span>
              )}
            </div>
          ))}
        </div>
        <button
          className="w-full py-[9px] rounded text-13 font-medium text-white"
          style={{ background: "var(--color-accent)" }}
        >
          Start free trial
        </button>
        <div className="text-center mt-2">
          <span className="text-11" style={{ color: "var(--color-text-tertiary)" }}>
            Already have an account?{" "}
            <span className="cursor-pointer" style={{ color: "var(--color-accent)" }}>
              Log in
            </span>
          </span>
        </div>
      </div>
    </div>
  );
}
