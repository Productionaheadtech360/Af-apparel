"use client";

const messages = [
  "🇺🇸 Factory-Direct Wholesale Blanks",
  "2,000+ American Businesses",
  "Same-Day Shipping — Dallas, TX",
  "No Minimums on In-Stock Items",
  "Apply Free — Approved in 24 Hours",
];

export function AnnouncementBar() {
  return (
    <div style={{ background: "#E8242A", color: "#fff", overflow: "hidden" }}>
      {/* Desktop: static centered */}
      <div className="hidden sm:flex" style={{
        justifyContent: "center", alignItems: "center",
        padding: "9px 24px", fontSize: "12px", fontWeight: 700,
        letterSpacing: ".06em", textTransform: "uppercase", gap: "16px",
      }}>
        <span>🇺🇸 Factory-Direct Wholesale Blanks</span>
        <span style={{ opacity: .5 }}>·</span>
        <span>2,000+ American Businesses</span>
        <span style={{ opacity: .5 }}>·</span>
        <span>Same-Day Shipping — Dallas, TX</span>
      </div>

      {/* Mobile: marquee */}
      <div className="flex sm:hidden" style={{ padding: "10px 0", overflow: "hidden", position: "relative" }}>
        <div className="marquee-track" style={{
          display: "flex", gap: "48px",
          whiteSpace: "nowrap", willChange: "transform",
        }}>
          {[...messages, ...messages].map((msg, i) => (
            <span key={i} style={{
              fontSize: "12px", fontWeight: 700,
              letterSpacing: ".06em", textTransform: "uppercase",
              flexShrink: 0,
            }}>
              {msg}
              <span style={{ marginLeft: "48px", opacity: .4 }}>✦</span>
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
