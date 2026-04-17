"use client";

import Link from "next/link";
import { useAuthStore } from "@/stores/auth.store";

export default function CtaSection() {
  const { isAuthenticated } = useAuthStore();
  const loggedIn = isAuthenticated();

  return (
    <div style={{ background: "#080808", padding: "88px 32px", textAlign: "center", position: "relative", overflow: "hidden" }}>
      <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse 60% 60% at 50% 50%,rgba(26,92,255,.08) 0%,transparent 70%)" }} />
      <h2 style={{ fontFamily: "var(--font-bebas)", fontSize: "clamp(40px,3vw,68px)", color: "#fff", lineHeight: 1, marginBottom: "14px", letterSpacing: ".01em", position: "relative" }}>
        READY TO STOCK PREMIUM BLANKS?
      </h2>
      <p style={{ fontSize: "17px", color: "#d3d0d0", marginBottom: "36px", maxWidth: "440px", marginLeft: "auto", marginRight: "auto", position: "relative", fontWeight: 500 }}>
        Join 2,000+ printing companies, retailers, and brands sourcing direct from American Fashion. Apply free — approved in 24 hours.
      </p>
      <div style={{ display: "flex", gap: "14px", justifyContent: "center", flexWrap: "wrap", position: "relative", marginBottom: "18px" }}>
        <Link
          href={loggedIn ? "/account" : "/wholesale/register"}
          style={{ background: "#E8242A", color: "#fff", padding: "15px 36px", fontSize: "17px", borderRadius: "6px", fontWeight: 700, textDecoration: "none", transition: "all .2s", display: "inline-flex", alignItems: "center" }}
        >
          {loggedIn ? "Go to Dashboard →" : "Apply for Wholesale Access →"}
        </Link>
        <Link href="/products" style={{ background: "transparent", color: "#d3d0d0", padding: "15px 36px", fontSize: "17px", borderRadius: "6px", fontWeight: 700, textDecoration: "none", border: "1.5px solid #444", transition: "all .2s", display: "inline-flex", alignItems: "center" }}>
          Browse Catalog
        </Link>
      </div>
      <div style={{ fontSize: "12px", color: "#d3d0d0", fontWeight: 500, letterSpacing: ".03em", position: "relative" }}>
        No fees · No minimums · Approved within 24 hours · (214) 272-7213
      </div>
    </div>
  );
}
