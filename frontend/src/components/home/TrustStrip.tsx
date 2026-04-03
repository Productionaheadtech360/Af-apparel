export default function TrustStrip() {
  return (
    <div style={{ background: "#fff", borderBottom: "1px solid #E2E0DA", padding: "18px 0" }}>
      <div style={{ maxWidth: "1280px", margin: "0 auto", padding: "0 32px", display: "flex", justifyContent: "space-between", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
        {[
          { ico: "🏭", text: "Factory-Direct" },
          { ico: "🗺️", text: "Dallas, TX" },
          { ico: "🏅", text: "ISO 9000" },
          { ico: "🌿", text: "GOTS & Oeko-Tex" },
          { ico: "📦", text: "No Minimums" },
          { ico: "⚡", text: "Same-Day Shipping" },
        ].map(item => (
          <div key={item.text} style={{ display: "flex", alignItems: "center", gap: "10px", flex: 1, minWidth: "140px", justifyContent: "center", padding: "6px 12px" }}>
            <span style={{ fontSize: "20px" }}>{item.ico}</span>
            <span style={{ fontSize: "12px", fontWeight: 700, color: "#2A2830", textTransform: "uppercase", letterSpacing: ".05em" }}>{item.text}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
