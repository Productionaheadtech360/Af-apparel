import Link from "next/link";

export function Footer() {
  return (
    <footer style={{ background: "#040406", borderTop: "1px solid rgba(255,255,255,.04)" }}>
      <div style={{ maxWidth: "1280px", margin: "0 auto", padding: "52px 32px 40px", display: "grid", gridTemplateColumns: "1.8fr 1fr 1fr 1fr 1fr", gap: "32px" }} className="footer-grid-responsive">
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <div style={{ display: "flex", alignItems: "center" }}>
              <span style={{ fontFamily: "var(--font-bebas)", fontSize: "36px", color: "#1A5CFF", lineHeight: 1 }}>A</span>
              <span style={{ fontFamily: "var(--font-bebas)", fontSize: "36px", color: "#E8242A", lineHeight: 1 }}>F</span>
            </div>
            <div>
              <span style={{ fontFamily: "var(--font-bebas)", fontSize: "13px", color: "#fff", letterSpacing: ".18em", lineHeight: 1, display: "block" }}>APPARELS</span>
              <span style={{ fontSize: "9px", color: "#444", letterSpacing: ".15em", fontWeight: 600, textTransform: "uppercase" }}>Wholesale B2B Platform</span>
            </div>
          </div>
          <p style={{ fontSize: "13px", color: "#666", lineHeight: 1.75, marginTop: "14px" }}>
            Factory-direct wholesale blank apparel. Serving 2,000+ businesses across the US from our Dallas, TX warehouse.<br /><br />
            📞 (214) 272-7213<br />
            ✉️ wholesale@afapparels.com
          </p>
        </div>
        {[
          {
            h: "Shop",
            links: [
              { label: "All Products", href: "/products" },
              { label: "T-Shirts", href: "/products?category=t-shirts" },
              { label: "Hoodies", href: "/products?category=hoodies" },
              { label: "Sweatshirts", href: "/products?category=sweatshirts" },
              { label: "Polos", href: "/products?category=polo-shirts" },
              { label: "Jackets", href: "/products?category=jackets" },
            ],
          },
          {
            h: "Resources",
            links: [
              { label: "Print Guide", href: "#" },
              { label: "Size Charts", href: "#" },
              { label: "Product Catalog", href: "#" },
              { label: "Style Sheets", href: "#" },
              { label: "Private Label", href: "#" },
            ],
          },
          {
            h: "Account",
            links: [
              { label: "Apply for Wholesale", href: "/wholesale/register" },
              { label: "Log In", href: "/login" },
              { label: "Order History", href: "/account/orders" },
              { label: "NET 30 Terms", href: "#" },
              { label: "Settings", href: "/account/profile" },
            ],
          },
          {
            h: "Support",
            links: [
              { label: "Contact Us", href: "#" },
              { label: "Shipping Info", href: "#" },
              { label: "Returns Policy", href: "#" },
              { label: "Certifications", href: "#" },
              { label: "FAQ", href: "#" },
            ],
          },
        ].map(col => (
          <div key={col.h}>
            <h5 style={{ fontFamily: "var(--font-bebas)", fontSize: "12px", letterSpacing: ".14em", color: "#aaa", marginBottom: "14px" }}>{col.h}</h5>
            {col.links.map(link => (
              <Link
                key={link.label}
                href={link.href}
                style={{ display: "block", fontSize: "13px", color: "#888", marginBottom: "8px", textDecoration: "none", transition: "color .2s" }}
              >
                {link.label}
              </Link>
            ))}
          </div>
        ))}
      </div>
      <div style={{ borderTop: "1px solid rgba(255,255,255,.04)", padding: "18px 32px", maxWidth: "1280px", margin: "0 auto", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "10px" }}>
        <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", alignItems: "center" }}>
          <span style={{ fontSize: "10px", color: "#666", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".07em", marginRight: "6px" }}>Accepted:</span>
          {["VISA", "MC", "AMEX", "ACH", "WIRE", "NET 30"].map(m => (
            <span key={m} style={{ background: "#0d0d0f", color: "#666", padding: "5px 12px", borderRadius: "4px", fontSize: "10px", fontWeight: 800, border: "1px solid rgba(255,255,255,.08)", letterSpacing: ".04em" }}>{m}</span>
          ))}
        </div>
        <div style={{ fontSize: "12px", color: "#444", letterSpacing: ".02em" }}>
          © {new Date().getFullYear()} AF Apparels · Dallas, TX · All rights reserved
        </div>
      </div>
    </footer>
  );
}
