"use client";

import Link from "next/link";
import { useAuthStore } from "@/stores/auth.store";

export default function HeroSection() {
  const { isAuthenticated } = useAuthStore();
  const loggedIn = isAuthenticated();

  return (
    <section style={{ background: "##080808", minHeight: "580px", display: "flex", alignItems: "center", position: "relative", overflow: "hidden" }}>
      <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse 80% 60% at 70% 50%,rgba(26,92,255,.08) 0%,transparent 70%),radial-gradient(ellipse 40% 40% at 10% 80%,rgba(232,36,42,.06) 0%,transparent 60%)" }} />
      <div style={{ position: "absolute", inset: 0, backgroundImage: "linear-gradient(rgba(255,255,255,.025) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.025) 1px,transparent 1px)", backgroundSize: "60px 60px", opacity: .6 }} />
      <div style={{ maxWidth: "1280px", margin: "0 auto", padding: "80px 32px", display: "grid", gridTemplateColumns: "1.3fr 1fr", gap: "60px", alignItems: "center", position: "relative", zIndex: 1, width: "100%" }} className="hero-inner-grid">
        <div>
          <div style={{ display: "inline-flex", alignItems: "center", gap: "8px", background: "rgba(26,92,255,.12)", border: "1px solid rgba(26,92,255,.25)", color: "#6B9FFF", fontSize: "11px", fontWeight: 700, padding: "6px 14px", borderRadius: "20px", letterSpacing: ".08em", textTransform: "uppercase", marginBottom: "22px" }}>
            <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#1A5CFF", display: "inline-block" }} />
            Direct From Manufacturer · Dallas, TX
          </div>
          <h1 style={{ fontFamily: "var(--font-bebas)", fontSize: "clamp(52px,6vw,84px)", color: "#000", lineHeight: ".95", letterSpacing: ".01em", marginBottom: "20px" }}>
            PREMIUM
            <span style={{ color: "#1A5CFF" }}> AMERICAN </span>
            BLANKS AT{" "}
            <span style={{ color: "#E8242A" }}>WHOLESALE</span>
          </h1>
          <p style={{ fontSize: "16px", color: "#000", lineHeight: 1.75, marginBottom: "30px", maxWidth: "530px" }}>
            Factory-direct blank apparel with <strong style={{ color: "#000", fontWeight: 800 }}>no middlemen</strong>, no minimums on in-stock items, and same-day shipping from Dallas. Print-optimized fabrics tested for DTF, screen printing, and embroidery.
          </p>
          <div className="hero-cta-row" style={{ marginBottom: "40px" }}>
            <Link
              href={loggedIn ? "/account" : "/wholesale/register"}
              style={{ background: "#E8242A", color: "#fff", padding: "15px 36px", fontSize: "15px", borderRadius: "6px", fontWeight: 700, textDecoration: "none", transition: "all .2s", display: "inline-flex", alignItems: "center" }}
            >
              {loggedIn ? "Go to Dashboard →" : "Apply for Wholesale →"}
            </Link>
            <Link href="/products" style={{ background: "transparent", color: "#1a5cff", padding: "15px 36px", fontSize: "15px", borderRadius: "6px", fontWeight: 700, textDecoration: "none", border: "1.5px solid #1a5cff", transition: "all .2s", display: "inline-flex", alignItems: "center" }}>
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
                <div style={{ fontFamily: "var(--font-bebas)", fontSize: "26px", color: "#000", lineHeight: 1, marginBottom: "3px" }}>{stat.n}</div>
                <div style={{ fontSize: "10px", color: "#444", textTransform: "uppercase", letterSpacing: ".1em", fontWeight: 600 }}>{stat.l}</div>
              </div>
            ))}
          </div>
        </div>
        <div className="hidden lg:flex" style={{ position: "relative" }}>
          <div style={{ background: "linear-gradient(135deg,#1a1a1a 0%,#111 100%)", border: "1px solid rgba(255,255,255,.08)", borderRadius: "12px", height: "400px", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "12px", position: "relative", overflow: "hidden", width: "100%" }}>
            <div style={{ position: "absolute", top: "-20%", right: "-30%", width: "300px", height: "300px", background: "radial-gradient(circle,rgba(26,92,255,.15) 0%,transparent 70%)", pointerEvents: "none" }} />
            <img
              src="/image1.webp"
              alt="Hero Lifestyle Image"
              style={{ width: "100%", height: "100%", objectFit: "cover", position: "absolute", top: 0, left: 0, borderRadius: "12px" }}
            />
            <div style={{ position: "absolute", top: "10px", right: "20px", background: "#E8242A", color: "#fff", fontFamily: "var(--font-bebas)", fontSize: "14px", letterSpacing: ".06em", padding: "6px 16px", borderRadius: "4px" }}>NEW ARRIVALS</div>
          </div>
        </div>
      </div>
    </section>
  );
}
