"use client";

import { useState } from "react";

export default function PurchaseOrdersPage() {
  const [showCreate, setShowCreate] = useState(false);

  const STAT_CARDS = [
    { label: "Open POs", value: "0", icon: "📋", color: "#1A5CFF" },
    { label: "Pending Receipt", value: "0", icon: "🚚", color: "#D97706" },
    { label: "Received", value: "0", icon: "✅", color: "#059669" },
    { label: "Total Value", value: "$0", icon: "💰", color: "#7A7880" },
  ];

  return (
    <div style={{ fontFamily: "var(--font-jakarta)" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
        <div>
          <h1 style={{ fontFamily: "var(--font-bebas)", fontSize: "32px", color: "#2A2830", letterSpacing: ".02em", lineHeight: 1 }}>PURCHASE ORDERS</h1>
          <p style={{ fontSize: "13px", color: "#7A7880", marginTop: "4px" }}>Manage incoming inventory from suppliers</p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          style={{ background: "#1A5CFF", color: "#fff", border: "none", padding: "10px 20px", borderRadius: "8px", fontWeight: 700, cursor: "pointer", fontSize: "14px" }}
        >
          + Create Purchase Order
        </button>
      </div>

      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "12px", marginBottom: "24px" }}>
        {STAT_CARDS.map(stat => (
          <div key={stat.label} style={{ background: "#fff", border: "1px solid #E2E0DA", borderRadius: "10px", padding: "16px 20px", display: "flex", alignItems: "center", gap: "12px" }}>
            <div style={{ width: "42px", height: "42px", borderRadius: "10px", background: "rgba(26,92,255,.08)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "20px", flexShrink: 0 }}>
              {stat.icon}
            </div>
            <div>
              <div style={{ fontFamily: "var(--font-bebas)", fontSize: "28px", color: stat.color, lineHeight: 1 }}>{stat.value}</div>
              <div style={{ fontSize: "11px", color: "#7A7880", fontWeight: 600, textTransform: "uppercase", letterSpacing: ".05em" }}>{stat.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Empty state */}
      <div style={{ background: "#fff", border: "1px solid #E2E0DA", borderRadius: "10px", padding: "60px", textAlign: "center" }}>
        <div style={{ fontSize: "48px", marginBottom: "12px" }}>📋</div>
        <h3 style={{ fontFamily: "var(--font-bebas)", fontSize: "22px", color: "#2A2830", marginBottom: "8px" }}>NO PURCHASE ORDERS YET</h3>
        <p style={{ fontSize: "14px", color: "#7A7880", maxWidth: "380px", margin: "0 auto 20px" }}>
          Create purchase orders to track incoming inventory from your suppliers and keep stock levels accurate.
        </p>
        <button
          onClick={() => setShowCreate(true)}
          style={{ background: "#1A5CFF", color: "#fff", border: "none", padding: "12px 24px", borderRadius: "8px", fontWeight: 700, cursor: "pointer", fontSize: "14px" }}
        >
          + Create First Purchase Order
        </button>
      </div>

      {/* Create PO modal placeholder */}
      {showCreate && (
        <div
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.5)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center" }}
          onClick={() => setShowCreate(false)}
        >
          <div
            style={{ background: "#fff", borderRadius: "12px", padding: "32px", maxWidth: "480px", width: "90%", boxShadow: "0 20px 60px rgba(0,0,0,.2)" }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
              <h2 style={{ fontFamily: "var(--font-bebas)", fontSize: "24px", color: "#2A2830", letterSpacing: ".04em" }}>CREATE PURCHASE ORDER</h2>
              <button onClick={() => setShowCreate(false)} style={{ background: "none", border: "none", fontSize: "22px", cursor: "pointer", color: "#aaa" }}>✕</button>
            </div>
            <div style={{ padding: "32px 0", textAlign: "center", color: "#7A7880", fontSize: "14px" }}>
              <div style={{ fontSize: "32px", marginBottom: "12px" }}>🚧</div>
              Purchase Order creation is coming soon.<br />
              This feature will allow you to track supplier orders and automatically update inventory on receipt.
            </div>
            <button
              onClick={() => setShowCreate(false)}
              style={{ width: "100%", padding: "12px", background: "#F4F3EF", color: "#2A2830", border: "none", borderRadius: "8px", fontWeight: 600, cursor: "pointer", fontSize: "14px" }}
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
