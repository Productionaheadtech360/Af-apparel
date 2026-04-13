"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { apiClient } from "@/lib/api-client";

interface DraftOrder {
  id: string;
  order_number: string;
  company_name: string;
  status: string;
  payment_status: string;
  po_number: string | null;
  total: string;
  item_count: number;
  created_at: string;
}

const STATUS_STYLE: Record<string, { bg: string; color: string }> = {
  pending: { bg: "rgba(217,119,6,.1)", color: "#D97706" },
  confirmed: { bg: "rgba(26,92,255,.1)", color: "#1A5CFF" },
  cancelled: { bg: "rgba(232,36,42,.1)", color: "#E8242A" },
};

function StatusBadge({ status }: { status: string }) {
  const s = STATUS_STYLE[status] ?? { bg: "rgba(0,0,0,.06)", color: "#555" };
  return (
    <span style={{ background: s.bg, color: s.color, padding: "3px 10px", borderRadius: "20px", fontSize: "11px", fontWeight: 700, textTransform: "capitalize" as const }}>
      {status}
    </span>
  );
}

export default function DraftOrdersPage() {
  const [orders, setOrders] = useState<DraftOrder[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  async function load() {
    setIsLoading(true);
    try {
      const data = await apiClient.get<{ items: DraftOrder[]; total: number }>(
        "/api/v1/admin/orders?status=pending&page_size=100"
      );
      setOrders(data?.items ?? []);
      setTotal(data?.total ?? 0);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function handleConvert(orderId: string) {
    try {
      await apiClient.patch(`/api/v1/admin/orders/${orderId}`, { status: "confirmed" });
      setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: "confirmed" } : o));
    } catch { /* ignore */ }
  }

  return (
    <div style={{ fontFamily: "var(--font-jakarta)" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
        <div>
          <h1 style={{ fontFamily: "var(--font-bebas)", fontSize: "32px", color: "#2A2830", letterSpacing: ".02em", lineHeight: 1 }}>DRAFT ORDERS</h1>
          <p style={{ fontSize: "13px", color: "#7A7880", marginTop: "4px" }}>Pending orders awaiting confirmation · {total} total</p>
        </div>
        <button style={{ background: "#1A5CFF", color: "#fff", border: "none", padding: "10px 20px", borderRadius: "6px", fontWeight: 700, cursor: "pointer", fontSize: "13px" }}>
          + Create Draft
        </button>
      </div>

      {/* Table */}
      <div style={{ background: "#fff", border: "1px solid #E2E0DA", borderRadius: "10px", overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
          <thead>
            <tr style={{ background: "#FAFAF8", borderBottom: "2px solid #E2E0DA" }}>
              {["Order #", "Company", "Status", "PO #", "Items", "Total", "Created", "Actions"].map(h => (
                <th key={h} style={{ padding: "11px 16px", textAlign: h === "Total" ? "right" as const : "left" as const, fontSize: "11px", fontWeight: 700, color: "#7A7880", textTransform: "uppercase" as const, letterSpacing: ".06em" }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isLoading && orders.length === 0 ? (
              <tr><td colSpan={8} style={{ padding: "40px", textAlign: "center", color: "#bbb", fontSize: "14px" }}>Loading…</td></tr>
            ) : orders.length === 0 ? (
              <tr>
                <td colSpan={8} style={{ padding: "56px", textAlign: "center" as const }}>
                  <div style={{ fontSize: "32px", marginBottom: "10px" }}>📝</div>
                  <div style={{ fontSize: "14px", color: "#aaa", fontWeight: 600 }}>No draft orders</div>
                  <div style={{ fontSize: "12px", color: "#bbb", marginTop: "4px" }}>Pending orders will appear here</div>
                </td>
              </tr>
            ) : orders.map((o, i) => (
              <tr key={o.id}
                style={{ borderBottom: i < orders.length - 1 ? "1px solid #F0EDE8" : "none" }}
                onMouseEnter={e => (e.currentTarget.style.background = "#FAFAF8")}
                onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
              >
                <td style={{ padding: "13px 16px" }}>
                  <Link href={`/admin/orders/${o.id}`} style={{ color: "#1A5CFF", textDecoration: "none", fontFamily: "monospace", fontSize: "12px", fontWeight: 700 }}>
                    {o.order_number}
                  </Link>
                </td>
                <td style={{ padding: "13px 16px", color: "#2A2830", fontWeight: 600 }}>{o.company_name}</td>
                <td style={{ padding: "13px 16px" }}><StatusBadge status={o.status} /></td>
                <td style={{ padding: "13px 16px", color: "#7A7880" }}>{o.po_number ?? "—"}</td>
                <td style={{ padding: "13px 16px", color: "#2A2830" }}>{o.item_count}</td>
                <td style={{ padding: "13px 16px", textAlign: "right" as const, fontWeight: 700, color: "#2A2830" }}>${Number(o.total).toFixed(2)}</td>
                <td style={{ padding: "13px 16px", color: "#7A7880" }}>{new Date(o.created_at).toLocaleDateString()}</td>
                <td style={{ padding: "13px 16px" }}>
                  <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" as const }}>
                    {o.status === "pending" && (
                      <button onClick={() => handleConvert(o.id)}
                        style={{ background: "rgba(5,150,105,.1)", color: "#059669", border: "none", padding: "5px 12px", borderRadius: "5px", fontSize: "11px", fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap" as const }}>
                        ✓ Confirm
                      </button>
                    )}
                    <Link href={`/admin/orders/${o.id}`}
                      style={{ background: "#F4F3EF", color: "#2A2830", border: "1px solid #E2E0DA", padding: "5px 12px", borderRadius: "5px", fontSize: "11px", fontWeight: 700, textDecoration: "none" }}>
                      Edit
                    </Link>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
