import { PrinterIcon, BuildingIcon, ShirtIcon, UsersIcon } from "@/components/ui/icons";

export default function WhoWeServe() {
  const cards = [
    { icon: <PrinterIcon size={32} color="#fff" />, h: "Printing Companies", p: "DTF, screen, embroidery, and sublimation shops. Fabrics tested for your specific decoration process." },
    { icon: <UsersIcon size={32} color="#fff" />, h: "Retailers", p: "In-store and online retailers stocking private-label or branded apparel lines. Deep inventory always available." },
    { icon: <BuildingIcon size={32} color="#fff" />, h: "Corporate Buyers", p: "Uniforms, branded merch, event apparel at scale. NET 30 terms available for qualifying accounts." },
    { icon: <ShirtIcon size={32} color="#fff" />, h: "Apparel Brands", p: "Building your own line? Private label starts at 2,500 units per style per color with full branding." },
  ];

  return (
    <section style={{ padding: "80px 0", background: "#111016" }}>
      <div style={{ maxWidth: "1280px", margin: "0 auto", padding: "0 32px" }}>
        <div style={{ marginBottom: "44px", textAlign: "center" }}>
          <h2 style={{ fontFamily: "var(--font-bebas)", fontSize: "clamp(32px,3.5vw,48px)", color: "#fff", letterSpacing: ".01em", lineHeight: 1, marginBottom: "10px" }}>Who We Serve</h2>
          <p style={{ fontSize: "15px", color: "#d3d0d0", fontWeight: 500 }}>Built for businesses that move volume</p>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: "12px" }} className="serve-grid-responsive">
          {cards.map(card => (
            <div key={card.h} style={{ background: "#1E1D24", border: "1px solid rgba(255,255,255,.06)", borderRadius: "10px", padding: "28px 22px", transition: "all .2s" }}>
              <div style={{ marginBottom: "14px" }}>{card.icon}</div>
              <h4 style={{ fontFamily: "var(--font-bebas)", fontSize: "17px", letterSpacing: ".04em", color: "#fff", marginBottom: "10px" }}>{card.h}</h4>
              <p style={{ fontSize: "15px", color: "#d3d0d0", lineHeight: 1.65, fontWeight: 500 }}>{card.p}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
