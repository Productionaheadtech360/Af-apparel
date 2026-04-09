export default function WhyChooseUs() {
  const rows = [
    { icon: "🏭", h: "Factory-Direct = Better Margins", p: "No distributors. No middlemen. You pay factory price — more profit on every print, every order." },
    { icon: "🎨", h: "Print-Optimized Fabrics", p: "Every blank tested for DTF, screen printing, embroidery, and sublimation. Better prints, repeat customers." },
    { icon: "📦", h: "Bulk-Ready Inventory", p: "Deep stock across all sizes and colors. Order 10 units or 10,000 — no minimums, no waiting." },
    { icon: "⚡", h: "Same-Day Shipping from Dallas", p: "Orders before 2 PM CT ship the same day. Faster fulfillment = faster cash flow." },
    { icon: "🤝", h: "Dedicated Account Support", p: "Not a ticket queue — a real account manager who knows your volume. Phone and email." },
  ];

  return (
    <section style={{ padding: "80px 0", background: "#fff" }}>
      <div style={{ maxWidth: "1280px", margin: "0 auto", padding: "0 32px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: "64px", alignItems: "center" }} className="why-grid-responsive">
          <div>
            <div style={{ marginBottom: "44px" }}>
              <h2 style={{ fontFamily: "var(--font-bebas)", fontSize: "clamp(32px,3.5vw,48px)", color: "#2A2830", letterSpacing: ".01em", lineHeight: 1, marginBottom: "10px" }}>Why Choose AF Blanks</h2>
              <p style={{ fontSize: "14px", color: "#7A7880" }}>Five reasons 2,000+ businesses source direct from us</p>
            </div>
            {rows.map(row => (
              <div key={row.h} style={{ display: "flex", gap: "16px", marginBottom: "22px", alignItems: "flex-start" }}>
                <div style={{ fontSize: "24px", minWidth: "40px", height: "40px", background: "#F4F3EF", borderRadius: "8px", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{row.icon}</div>
                <div>
                  <h4 style={{ fontFamily: "var(--font-bebas)", fontSize: "15px", letterSpacing: ".04em", marginBottom: "4px", color: "#2A2830" }}>{row.h}</h4>
                  <p style={{ fontSize: "13px", color: "#7A7880", lineHeight: 1.6 }}>{row.p}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="hidden lg:flex" style={{ background: "linear-gradient(135deg,#F4F3EF 0%,#e5e0d8 100%)", borderRadius: "16px", height: "440px", position: "relative", overflow: "hidden", border: "1px solid #E2E0DA" }}>
            <img
              src="/private_labels_af.webp"
              alt="Private Labels"
              style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: "16px" }}
            />
          </div>
        </div>
      </div>
    </section>
  );
}
