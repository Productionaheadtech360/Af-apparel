export default function Certifications() {
  const certs = [
    { icon: "🏅", h: "ISO 9000", p: "International quality management standard — consistent production across all facilities." },
    { icon: "🌿", h: "Oeko-Tex Standard 100", p: "Tested for harmful substances. Safe for all skin types including children's wear." },
    { icon: "☘️", h: "GOTS Certified", p: "Global Organic Textile Standard — sustainable fiber sourcing throughout the supply chain." },
    { icon: "🌍", h: "WRAP Certified", p: "Worldwide Responsible Accredited Production — verified ethical factory conditions." },
  ];

  return (
    <section style={{ padding: "52px 0", background: "#F4F3EF" }}>
      <div style={{ maxWidth: "1280px", margin: "0 auto", padding: "0 32px" }}>
        <div style={{ marginBottom: "44px", textAlign: "center" }}>
          <h2 style={{ fontFamily: "var(--font-bebas)", fontSize: "clamp(32px,3.5vw,48px)", color: "#2A2830", letterSpacing: ".01em", lineHeight: 1, marginBottom: "10px" }}>Certified Quality</h2>
          <p style={{ fontSize: "14px", color: "#7A7880", maxWidth: "480px", margin: "0 auto" }}>Every blank meets rigorous international manufacturing and safety standards</p>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: "14px" }} className="cert-grid-responsive">
          {certs.map(cert => (
            <div key={cert.h} style={{ background: "#fff", border: "1px solid #E2E0DA", borderRadius: "10px", padding: "28px 20px", textAlign: "center", transition: "all .2s" }}>
              <div style={{ fontSize: "36px", marginBottom: "12px" }}>{cert.icon}</div>
              <h5 style={{ fontFamily: "var(--font-bebas)", fontSize: "14px", letterSpacing: ".04em", marginBottom: "6px", color: "#2A2830" }}>{cert.h}</h5>
              <p style={{ fontSize: "12px", color: "#7A7880", lineHeight: 1.55 }}>{cert.p}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
