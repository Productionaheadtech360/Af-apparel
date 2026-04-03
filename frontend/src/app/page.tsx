export const dynamic = "force-dynamic";

import Link from "next/link";
import { Header } from "@/components/layout/Header";
import { productsService } from "@/services/products.service";

export default async function HomePage() {
  let categories: { id: string; name: string; slug: string }[] = [];
  try {
    categories = await productsService.getCategories();
  } catch {
    // Backend unreachable from SSR
  }

  const categoryIcons: Record<string, string> = {
    "t-shirts": "👕",
    "hoodies": "🧥",
    "sweatshirts": "🧶",
    "polo-shirts": "👔",
    "dress-shirts": "👔",
    "jackets": "🧥",
  };

  const categoryDescriptions: Record<string, string> = {
    "t-shirts": "Ring-spun & CVC blends. DTF and screen print optimized.",
    "hoodies": "80/20 cotton-poly fleece. Pullover and zip-up styles.",
    "sweatshirts": "Classic crewneck fleece. Heavy-weight, print-friendly.",
    "polo-shirts": "CVC performance fabric. Corporate and retail ready.",
    "dress-shirts": "Easy-care blends. Slim-fit for uniform programs.",
    "jackets": "Denim and outerwear. Great for promotional programs.",
  };

  return (
    <>
      <Header />
      <main style={{ fontFamily: "var(--font-jakarta)" }}>

        {/* ── HERO ── */}
        <section style={{ background: "#080808", minHeight: "580px", display: "flex", alignItems: "center", position: "relative", overflow: "hidden" }}>
          <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse 80% 60% at 70% 50%,rgba(26,92,255,.08) 0%,transparent 70%),radial-gradient(ellipse 40% 40% at 10% 80%,rgba(232,36,42,.06) 0%,transparent 60%)" }} />
          <div style={{ position: "absolute", inset: 0, backgroundImage: "linear-gradient(rgba(255,255,255,.025) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.025) 1px,transparent 1px)", backgroundSize: "60px 60px", opacity: .6 }} />
          <div style={{ maxWidth: "1280px", margin: "0 auto", padding: "80px 32px", display: "grid", gridTemplateColumns: "1.3fr 1fr", gap: "60px", alignItems: "center", position: "relative", zIndex: 1, width: "100%" }} className="hero-inner-grid">
            <div>
              <div style={{ display: "inline-flex", alignItems: "center", gap: "8px", background: "rgba(26,92,255,.12)", border: "1px solid rgba(26,92,255,.25)", color: "#6B9FFF", fontSize: "11px", fontWeight: 700, padding: "6px 14px", borderRadius: "20px", letterSpacing: ".08em", textTransform: "uppercase", marginBottom: "22px" }}>
                <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#1A5CFF", display: "inline-block" }} />
                Direct From Manufacturer · Dallas, TX
              </div>
              <h1 style={{ fontFamily: "var(--font-bebas)", fontSize: "clamp(52px,6vw,84px)", color: "#fff", lineHeight: ".95", letterSpacing: ".01em", marginBottom: "20px" }}>
                PREMIUM
                <span style={{ color: "#1A5CFF" }}>AMERICAN </span>
                BLANKS AT 
                <span style={{ color: "#E8242A" }}>WHOLESALE</span>
              </h1>
              <p style={{ fontSize: "16px", color: "#666", lineHeight: 1.75, marginBottom: "30px", maxWidth: "530px" }}>
                Factory-direct blank apparel with <strong style={{ color: "#aaa", fontWeight: 600 }}>no middlemen</strong>, no minimums on in-stock items, and same-day shipping from Dallas. Print-optimized fabrics tested for DTF, screen printing, and embroidery.
              </p>
              <div className="hero-cta-row" style={{ marginBottom: "40px" }}>
                <Link href="/wholesale/register" style={{ background: "#E8242A", color: "#fff", padding: "15px 36px", fontSize: "15px", borderRadius: "6px", fontWeight: 700, textDecoration: "none", transition: "all .2s", display: "inline-flex", alignItems: "center" }}>
                  Apply for Wholesale →
                </Link>
                <Link href="/products" style={{ background: "transparent", color: "#888", padding: "15px 36px", fontSize: "15px", borderRadius: "6px", fontWeight: 700, textDecoration: "none", border: "1.5px solid #2a2a2a", transition: "all .2s", display: "inline-flex", alignItems: "center" }}>
                  Browse Catalog
                </Link>
              </div>
              <div className="hero-stats-grid" style={{ display: "grid", gridTemplateColumns: "repeat(5,1fr)", borderTop: "1px solid #1a1a1a", paddingTop: "28px" }}>
                {[
                  { n: "2,000+", l: "Businesses" },
                  { n: "50+", l: "Colors" },
                  { n: "XS–3XL", l: "Sizes" },
                  { n: "24HR", l: "Processing" },
                  { n: "No MOQ", l: "In-Stock" },
                ].map((stat, i) => (
                  <div key={stat.l} style={{ padding: i === 0 ? "0 16px 0 0" : "0 16px", textAlign: "left", borderLeft: i > 0 ? "1px solid #1a1a1a" : "none" }}>
                    <div style={{ fontFamily: "var(--font-bebas)", fontSize: "26px", color: "#fff", lineHeight: 1, marginBottom: "3px" }}>{stat.n}</div>
                    <div style={{ fontSize: "10px", color: "#444", textTransform: "uppercase", letterSpacing: ".1em", fontWeight: 600 }}>{stat.l}</div>
                  </div>
                ))}
              </div>
            </div>
            <div className="hidden lg:flex" style={{ position: "relative" }}>
              <div style={{ background: "linear-gradient(135deg,#1a1a1a 0%,#111 100%)", border: "1px solid rgba(255,255,255,.08)", borderRadius: "12px", height: "400px", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "12px", position: "relative", overflow: "hidden", width: "100%" }}>
                <div style={{ position: "absolute", top: "-40%", right: "-30%", width: "300px", height: "300px", background: "radial-gradient(circle,rgba(26,92,255,.15) 0%,transparent 70%)", pointerEvents: "none" }} />
                <div style={{ fontSize: "64px", opacity: .3 }}>👕</div>
                <div style={{ fontSize: "13px", color: "#333", fontWeight: 600, letterSpacing: ".05em" }}>HERO LIFESTYLE IMAGE</div>
                <div style={{ position: "absolute", top: "-12px", right: "20px", background: "#E8242A", color: "#fff", fontFamily: "var(--font-bebas)", fontSize: "14px", letterSpacing: ".06em", padding: "6px 16px", borderRadius: "4px" }}>NEW ARRIVALS</div>
                <div style={{ position: "absolute", bottom: "24px", left: "-28px", background: "rgba(255,255,255,.04)", backdropFilter: "blur(12px)", border: "1px solid rgba(255,255,255,.1)", borderRadius: "10px", padding: "14px 18px", display: "flex", alignItems: "center", gap: "12px" }}>
                  <span style={{ fontSize: "22px" }}>⚡</span>
                  <div>
                    <strong style={{ display: "block", color: "#fff", fontSize: "13px", fontWeight: 700 }}>Same-Day Shipping</strong>
                    <span style={{ fontSize: "11px", color: "#555" }}>Orders before 2 PM CT</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── TRUST STRIP ── */}
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

        {/* ── SHOP BY CATEGORY ── */}
        <section style={{ padding: "80px 0", background: "#F4F3EF" }}>
          <div style={{ maxWidth: "1280px", margin: "0 auto", padding: "0 32px" }}>
            <div style={{ marginBottom: "44px" }}>
              <h2 style={{ fontFamily: "var(--font-bebas)", fontSize: "clamp(32px,3.5vw,48px)", color: "#2A2830", letterSpacing: ".01em", lineHeight: 1, marginBottom: "10px" }}>Shop by Category</h2>
              <p style={{ fontSize: "14px", color: "#7A7880" }}>Browse our full range of print-ready blank apparel</p>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: "16px" }} className="cat-grid-responsive">
              {categories.length > 0 ? categories.map((cat) => (
                <Link key={cat.id} href={`/products?category=${cat.slug}`}
                  style={{ background: "#fff", border: "1px solid #E2E0DA", borderRadius: "10px", overflow: "hidden", cursor: "pointer", transition: "all .25s", textDecoration: "none", display: "block" }}
                  className="cat-card-hover">
                  <div style={{ height: "180px", display: "flex", alignItems: "center", justifyContent: "center", background: "linear-gradient(135deg,#f0ede8 0%,#e8e4df 100%)", position: "relative" }}>
                    <span style={{ fontSize: "52px", opacity: .35 }}>{categoryIcons[cat.slug] ?? "👕"}</span>
                  </div>
                  <div style={{ padding: "20px 22px" }}>
                    <h4 style={{ fontFamily: "var(--font-bebas)", fontSize: "18px", letterSpacing: ".03em", marginBottom: "5px", color: "#2A2830" }}>{cat.name}</h4>
                    <p style={{ fontSize: "13px", color: "#7A7880", marginBottom: "12px", lineHeight: 1.5 }}>{categoryDescriptions[cat.slug] ?? "Premium print-ready blanks."}</p>
                    <div style={{ fontSize: "13px", fontWeight: 700, color: "#1A5CFF", display: "flex", alignItems: "center", gap: "6px" }}>Shop {cat.name} →</div>
                  </div>
                </Link>
              )) : [
                { slug: "t-shirts", name: "T-Shirts" },
                { slug: "hoodies", name: "Hoodies" },
                { slug: "sweatshirts", name: "Sweatshirts" },
                { slug: "polo-shirts", name: "Polos" },
                { slug: "dress-shirts", name: "Dress Shirts" },
                { slug: "jackets", name: "Jackets" },
              ].map((cat) => (
                <Link key={cat.slug} href={`/products?category=${cat.slug}`}
                  style={{ background: "#fff", border: "1px solid #E2E0DA", borderRadius: "10px", overflow: "hidden", cursor: "pointer", transition: "all .25s", textDecoration: "none", display: "block" }}>
                  <div style={{ height: "180px", display: "flex", alignItems: "center", justifyContent: "center", background: "linear-gradient(135deg,#f0ede8 0%,#e8e4df 100%)" }}>
                    <span style={{ fontSize: "52px", opacity: .35 }}>{categoryIcons[cat.slug] ?? "👕"}</span>
                  </div>
                  <div style={{ padding: "20px 22px" }}>
                    <h4 style={{ fontFamily: "var(--font-bebas)", fontSize: "18px", letterSpacing: ".03em", marginBottom: "5px", color: "#2A2830" }}>{cat.name}</h4>
                    <p style={{ fontSize: "13px", color: "#7A7880", marginBottom: "12px", lineHeight: 1.5 }}>{categoryDescriptions[cat.slug] ?? "Premium print-ready blanks."}</p>
                    <div style={{ fontSize: "13px", fontWeight: 700, color: "#1A5CFF" }}>Shop {cat.name} →</div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>

        {/* ── HOW IT WORKS ── */}
        <section style={{ padding: "80px 0", background: "#F4F3EF" }}>
          <div style={{ maxWidth: "1280px", margin: "0 auto", padding: "0 32px" }}>
            <div style={{ marginBottom: "44px", textAlign: "center" }}>
              <h2 style={{ fontFamily: "var(--font-bebas)", fontSize: "clamp(32px,3.5vw,48px)", color: "#2A2830", letterSpacing: ".01em", lineHeight: 1, marginBottom: "10px" }}>How It Works</h2>
              <p style={{ fontSize: "14px", color: "#7A7880" }}>Wholesale ordering in 4 simple steps</p>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", background: "#fff", border: "1px solid #E2E0DA", borderRadius: "12px", overflow: "hidden" }} className="steps-grid-responsive">
              {[
                { n: "01", icon: "✍️", h: "Apply for Access", p: "Submit your business details. Free to apply. Approved within 24 hours. No commitment required." },
                { n: "02", icon: "📋", h: "Browse & Build Order", p: "Select colors, enter quantities across sizes. Real-time stock and pricing shown in your account." },
                { n: "03", icon: "🚚", h: "Checkout & Ship", p: "Pay via card, ACH, wire, or NET 30. Orders before 2 PM CT ship from Dallas same day." },
                { n: "04", icon: "🔄", h: "Reorder Easily", p: "Full order history saved in your account. Reorder a previous color breakdown in one click." },
              ].map((step, i) => (
                <div key={step.n} style={{ padding: "36px 28px", borderRight: i < 3 ? "1px solid #E2E0DA" : "none" }}>
                  <div style={{ fontFamily: "var(--font-bebas)", fontSize: "48px", color: "#F4F3EF", lineHeight: 1, marginBottom: "6px" }}>{step.n}</div>
                  <span style={{ fontSize: "30px", marginBottom: "12px", display: "block" }}>{step.icon}</span>
                  <h4 style={{ fontFamily: "var(--font-bebas)", fontSize: "17px", letterSpacing: ".03em", marginBottom: "8px", color: "#2A2830" }}>{step.h}</h4>
                  <p style={{ fontSize: "13px", color: "#7A7880", lineHeight: 1.65 }}>{step.p}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── WHO WE SERVE ── */}
        <section style={{ padding: "80px 0", background: "#111016" }}>
          <div style={{ maxWidth: "1280px", margin: "0 auto", padding: "0 32px" }}>
            <div style={{ marginBottom: "44px", textAlign: "center" }}>
              <h2 style={{ fontFamily: "var(--font-bebas)", fontSize: "clamp(32px,3.5vw,48px)", color: "#fff", letterSpacing: ".01em", lineHeight: 1, marginBottom: "10px" }}>Who We Serve</h2>
              <p style={{ fontSize: "14px", color: "#555" }}>Built for businesses that move volume</p>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: "12px" }} className="serve-grid-responsive">
              {[
                { icon: "🖨️", h: "Printing Companies", p: "DTF, screen, embroidery, and sublimation shops. Fabrics tested for your specific decoration process." },
                { icon: "🏪", h: "Retailers", p: "In-store and online retailers stocking private-label or branded apparel lines. Deep inventory always available." },
                { icon: "🏢", h: "Corporate Buyers", p: "Uniforms, branded merch, event apparel at scale. NET 30 terms available for qualifying accounts." },
                { icon: "👗", h: "Apparel Brands", p: "Building your own line? Private label starts at 2,500 units per style per color with full branding." },
              ].map(card => (
                <div key={card.h} style={{ background: "#1E1D24", border: "1px solid rgba(255,255,255,.06)", borderRadius: "10px", padding: "28px 22px", transition: "all .2s" }}>
                  <span style={{ fontSize: "32px", marginBottom: "14px", display: "block" }}>{card.icon}</span>
                  <h4 style={{ fontFamily: "var(--font-bebas)", fontSize: "17px", letterSpacing: ".04em", color: "#fff", marginBottom: "10px" }}>{card.h}</h4>
                  <p style={{ fontSize: "13px", color: "#555", lineHeight: 1.65 }}>{card.p}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── WHY CHOOSE US ── */}
        <section style={{ padding: "80px 0", background: "#fff" }}>
          <div style={{ maxWidth: "1280px", margin: "0 auto", padding: "0 32px" }}>
            <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: "64px", alignItems: "center" }} className="why-grid-responsive">
              <div>
                <div style={{ marginBottom: "44px" }}>
                  <h2 style={{ fontFamily: "var(--font-bebas)", fontSize: "clamp(32px,3.5vw,48px)", color: "#2A2830", letterSpacing: ".01em", lineHeight: 1, marginBottom: "10px" }}>Why Choose AF Blanks</h2>
                  <p style={{ fontSize: "14px", color: "#7A7880" }}>Five reasons 2,000+ businesses source direct from us</p>
                </div>
                {[
                  { icon: "🏭", h: "Factory-Direct = Better Margins", p: "No distributors. No middlemen. You pay factory price — more profit on every print, every order." },
                  { icon: "🎨", h: "Print-Optimized Fabrics", p: "Every blank tested for DTF, screen printing, embroidery, and sublimation. Better prints, repeat customers." },
                  { icon: "📦", h: "Bulk-Ready Inventory", p: "Deep stock across all sizes and colors. Order 10 units or 10,000 — no minimums, no waiting." },
                  { icon: "⚡", h: "Same-Day Shipping from Dallas", p: "Orders before 2 PM CT ship the same day. Faster fulfillment = faster cash flow." },
                  { icon: "🤝", h: "Dedicated Account Support", p: "Not a ticket queue — a real account manager who knows your volume. Phone and email." },
                ].map(row => (
                  <div key={row.h} style={{ display: "flex", gap: "16px", marginBottom: "22px", alignItems: "flex-start" }}>
                    <div style={{ fontSize: "24px", minWidth: "40px", height: "40px", background: "#F4F3EF", borderRadius: "8px", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{row.icon}</div>
                    <div>
                      <h4 style={{ fontFamily: "var(--font-bebas)", fontSize: "15px", letterSpacing: ".04em", marginBottom: "4px", color: "#2A2830" }}>{row.h}</h4>
                      <p style={{ fontSize: "13px", color: "#7A7880", lineHeight: 1.6 }}>{row.p}</p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="hidden lg:flex" style={{ background: "linear-gradient(135deg,#F4F3EF 0%,#e5e0d8 100%)", borderRadius: "16px", height: "440px", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "10px", color: "#bbb", fontWeight: 600, fontSize: "13px", border: "1px solid #E2E0DA" }}>
                <div style={{ fontSize: "60px", opacity: .3 }}>🏭</div>
                <span>WAREHOUSE / TEAM IMAGE</span>
              </div>
            </div>
          </div>
        </section>

        {/* ── CERTIFICATIONS ── */}
        <section style={{ padding: "52px 0", background: "#F4F3EF" }}>
          <div style={{ maxWidth: "1280px", margin: "0 auto", padding: "0 32px" }}>
            <div style={{ marginBottom: "44px", textAlign: "center" }}>
              <h2 style={{ fontFamily: "var(--font-bebas)", fontSize: "clamp(32px,3.5vw,48px)", color: "#2A2830", letterSpacing: ".01em", lineHeight: 1, marginBottom: "10px" }}>Certified Quality</h2>
              <p style={{ fontSize: "14px", color: "#7A7880", maxWidth: "480px", margin: "0 auto" }}>Every blank meets rigorous international manufacturing and safety standards</p>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: "14px" }} className="cert-grid-responsive">
              {[
                { icon: "🏅", h: "ISO 9000", p: "International quality management standard — consistent production across all facilities." },
                { icon: "🌿", h: "Oeko-Tex Standard 100", p: "Tested for harmful substances. Safe for all skin types including children's wear." },
                { icon: "☘️", h: "GOTS Certified", p: "Global Organic Textile Standard — sustainable fiber sourcing throughout the supply chain." },
                { icon: "🌍", h: "WRAP Certified", p: "Worldwide Responsible Accredited Production — verified ethical factory conditions." },
              ].map(cert => (
                <div key={cert.h} style={{ background: "#fff", border: "1px solid #E2E0DA", borderRadius: "10px", padding: "28px 20px", textAlign: "center", transition: "all .2s" }}>
                  <div style={{ fontSize: "36px", marginBottom: "12px" }}>{cert.icon}</div>
                  <h5 style={{ fontFamily: "var(--font-bebas)", fontSize: "14px", letterSpacing: ".04em", marginBottom: "6px", color: "#2A2830" }}>{cert.h}</h5>
                  <p style={{ fontSize: "12px", color: "#7A7880", lineHeight: 1.55 }}>{cert.p}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── FAQ ── */}
        <section style={{ padding: "80px 0", background: "#fff" }}>
          <div style={{ maxWidth: "1280px", margin: "0 auto", padding: "0 32px" }}>
            <div style={{ marginBottom: "44px", textAlign: "center" }}>
              <h2 style={{ fontFamily: "var(--font-bebas)", fontSize: "clamp(32px,3.5vw,48px)", color: "#2A2830", letterSpacing: ".01em", lineHeight: 1 }}>Frequently Asked Questions</h2>
            </div>
            <div style={{ maxWidth: "780px", margin: "0 auto" }}>
              {[
                { q: "How do I access wholesale pricing?", a: "Create a free wholesale account by submitting your business information. Once approved (typically within 24 hours), you'll have full access to wholesale pricing, the bulk order grid, and your account dashboard. There's no fee and no commitment required to apply." },
                { q: "Is there a minimum order quantity (MOQ)?", a: "No minimums on in-stock items — order 1 unit or 10,000, your choice. Pricing scales with volume automatically. Private label orders have a minimum of 2,500 units per style per color." },
                { q: "Are your blanks compatible with DTF and screen printing?", a: "Yes — all core blanks are tested for DTF transfers, screen printing, and embroidery. Each product page includes a Print Guide tab with compatibility ratings and recommended press settings." },
                { q: "How fast do orders ship?", a: "Orders placed before 2 PM CT ship the same day from our Dallas, TX warehouse. Standard ground delivery reaches most of the continental US in 2–5 business days." },
                { q: "What payment methods do you accept?", a: "We accept Visa, Mastercard, American Express, ACH bank transfer, and wire transfer. NET 30 terms available for qualifying accounts." },
              ].map((faq, i) => (
                <details key={i} style={{ border: "1px solid #E2E0DA", borderRadius: "8px", marginBottom: "8px", background: "#fff", overflow: "hidden" }}>
                  <summary style={{ padding: "18px 22px", fontSize: "14px", fontWeight: 600, cursor: "pointer", listStyle: "none", display: "flex", justifyContent: "space-between", alignItems: "center", color: "#2A2830" }}>
                    {faq.q}
                    <span style={{ fontSize: "18px", color: "#aaa", fontWeight: 300, marginLeft: "16px", flexShrink: 0 }}>＋</span>
                  </summary>
                  <div style={{ padding: "0 22px 18px", fontSize: "14px", color: "#7A7880", lineHeight: 1.75, borderTop: "1px solid #E2E0DA", paddingTop: "14px" }}>
                    {faq.a}
                  </div>
                </details>
              ))}
            </div>
          </div>
        </section>

        {/* ── CTA ── */}
        <div style={{ background: "#080808", padding: "88px 32px", textAlign: "center", position: "relative", overflow: "hidden" }}>
          <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse 60% 60% at 50% 50%,rgba(26,92,255,.08) 0%,transparent 70%)" }} />
          <h2 style={{ fontFamily: "var(--font-bebas)", fontSize: "clamp(40px,5vw,68px)", color: "#fff", lineHeight: 1, marginBottom: "14px", letterSpacing: ".01em", position: "relative" }}>
            READY TO STOCK<br />PREMIUM BLANKS?
          </h2>
          <p style={{ fontSize: "15px", color: "#555", marginBottom: "36px", maxWidth: "440px", marginLeft: "auto", marginRight: "auto", position: "relative" }}>
            Join 2,000+ printing companies, retailers, and brands sourcing direct from American Fashion. Apply free — approved in 24 hours.
          </p>
          <div style={{ display: "flex", gap: "14px", justifyContent: "center", flexWrap: "wrap", position: "relative", marginBottom: "18px" }}>
            <Link href="/wholesale/register" style={{ background: "#E8242A", color: "#fff", padding: "15px 36px", fontSize: "15px", borderRadius: "6px", fontWeight: 700, textDecoration: "none", transition: "all .2s", display: "inline-flex", alignItems: "center" }}>
              Apply for Wholesale Access →
            </Link>
            <Link href="/products" style={{ background: "transparent", color: "#888", padding: "15px 36px", fontSize: "15px", borderRadius: "6px", fontWeight: 700, textDecoration: "none", border: "1.5px solid #2a2a2a", transition: "all .2s", display: "inline-flex", alignItems: "center" }}>
              Browse Catalog
            </Link>
          </div>
          <div style={{ fontSize: "12px", color: "#333", fontWeight: 500, letterSpacing: ".03em", position: "relative" }}>
            No fees · No minimums · Approved within 24 hours · (214) 272-7213
          </div>
        </div>

        {/* ── FOOTER ── */}
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
              <p style={{ fontSize: "13px", color: "#3a3a4a", lineHeight: 1.75, marginTop: "14px" }}>
                Factory-direct wholesale blank apparel. Serving 2,000+ businesses across the US from our Dallas, TX warehouse.<br /><br />
                📞 (214) 272-7213<br />
                ✉️ wholesale@afapparels.com
              </p>
            </div>
            {[
              { h: "Shop", links: ["All Products", "T-Shirts", "Hoodies", "Sweatshirts", "Women's", "Youth", "Polos"] },
              { h: "Resources", links: ["Print Guide", "Size Charts", "Product Catalog", "Style Sheets", "Private Label"] },
              { h: "Account", links: ["Apply for Wholesale", "Log In", "Order History", "NET 30 Terms", "Settings"] },
              { h: "Support", links: ["Contact Us", "Shipping Info", "Returns Policy", "Certifications", "FAQ"] },
            ].map(col => (
              <div key={col.h}>
                <h5 style={{ fontFamily: "var(--font-bebas)", fontSize: "12px", letterSpacing: ".14em", color: "#333", marginBottom: "14px" }}>{col.h}</h5>
                {col.links.map(link => (
                  <a key={link} href="#" style={{ display: "block", fontSize: "13px", color: "#333", marginBottom: "8px", textDecoration: "none", transition: "color .2s" }}>{link}</a>
                ))}
              </div>
            ))}
          </div>
          <div style={{ borderTop: "1px solid rgba(255,255,255,.04)", padding: "18px 32px", maxWidth: "1280px", margin: "0 auto", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "10px" }}>
            <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", alignItems: "center" }}>
              <span style={{ fontSize: "10px", color: "#2a2a3a", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".07em", marginRight: "6px" }}>Accepted:</span>
              {["VISA", "MC", "AMEX", "ACH", "WIRE", "NET 30"].map(m => (
                <span key={m} style={{ background: "#0d0d0f", color: "#333", padding: "5px 12px", borderRadius: "4px", fontSize: "10px", fontWeight: 800, border: "1px solid rgba(255,255,255,.04)", letterSpacing: ".04em" }}>{m}</span>
              ))}
            </div>
            <div style={{ fontSize: "12px", color: "#222", letterSpacing: ".02em" }}>© {new Date().getFullYear()} AF Apparels · Dallas, TX · All rights reserved</div>
          </div>
        </footer>
      </main>
    </>
  );
}
