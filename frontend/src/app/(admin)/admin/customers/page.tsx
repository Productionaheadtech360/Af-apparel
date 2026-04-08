"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { adminService } from "@/services/admin.service";

interface CompanyRow {
  id: string;
  name: string;
  status: string;
  pricing_tier_id: string | null;
  shipping_tier_id: string | null;
  order_count: number;
  total_spend: string;
  created_at: string;
  // enriched fields (may be present in future)
  contact_name?: string;
  email?: string;
  phone?: string;
  last_order_date?: string;
}

interface RFMGroup { label: string; color: string; bg: string }

function getRFMGroup(c: CompanyRow): RFMGroup {
  const orders = c.order_count || 0;
  const days = c.last_order_date
    ? Math.floor((Date.now() - new Date(c.last_order_date).getTime()) / 86400000)
    : 999;
  if (orders >= 10 && days < 30) return { label: "Champions", color: "#059669", bg: "rgba(5,150,105,.1)" };
  if (orders >= 5 && days < 60)  return { label: "Loyal",     color: "#1A5CFF", bg: "rgba(26,92,255,.1)" };
  if (days > 90 && orders > 2)   return { label: "At Risk",   color: "#D97706", bg: "rgba(217,119,6,.1)" };
  if (days > 180)                 return { label: "Lost",      color: "#E8242A", bg: "rgba(232,36,42,.1)" };
  if (orders <= 1)                return { label: "New",       color: "#7C3AED", bg: "rgba(124,58,237,.1)" };
  return                                  { label: "Potential", color: "#0891B2", bg: "rgba(8,145,178,.1)" };
}

const STATUS_BADGE: Record<string, { bg: string; color: string }> = {
  active:    { bg: "rgba(5,150,105,.1)",  color: "#059669" },
  suspended: { bg: "rgba(232,36,42,.1)",  color: "#E8242A" },
  pending:   { bg: "rgba(217,119,6,.1)",  color: "#D97706" },
};

export default function AdminCustomersPage() {
  const router = useRouter();
  const [companies, setCompanies] = useState<CompanyRow[]>([]);
  const [total, setTotal] = useState(0);
  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [rfmFilter, setRfmFilter] = useState("");
  const [sortBy, setSortBy] = useState("created_at");
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const PAGE_SIZE = 50;

  async function load() {
    setIsLoading(true);
    try {
      const data = await adminService.listCompanies({
        q: q || undefined,
        status: statusFilter || undefined,
        page,
        page_size: PAGE_SIZE,
      }) as { items: CompanyRow[]; total: number };
      setCompanies(data.items);
      setTotal(data.total);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => { load(); }, [q, statusFilter, page]);

  const filtered = useMemo(() => {
    let list = [...companies];
    if (rfmFilter) list = list.filter(c => getRFMGroup(c).label === rfmFilter);
    list.sort((a, b) => {
      if (sortBy === "total_spend") return Number(b.total_spend) - Number(a.total_spend);
      if (sortBy === "order_count") return b.order_count - a.order_count;
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
    return list;
  }, [companies, rfmFilter, sortBy]);

  const stats = useMemo(() => ({
    total: total,
    active: companies.filter(c => c.status === "active").length,
    avg_spend: companies.length
      ? companies.reduce((s, c) => s + Number(c.total_spend), 0) / companies.length
      : 0,
    total_revenue: companies.reduce((s, c) => s + Number(c.total_spend), 0),
  }), [companies, total]);

  const pages = Math.ceil(total / PAGE_SIZE);

  const thStyle: React.CSSProperties = {
    padding: "11px 14px", textAlign: "left", fontSize: "10px",
    textTransform: "uppercase", letterSpacing: ".07em", color: "#7A7880", fontWeight: 700,
  };

  return (
    <div style={{ fontFamily: "var(--font-jakarta)" }}>

      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
        <div>
          <h1 style={{ fontFamily: "var(--font-bebas)", fontSize: "32px", color: "#2A2830", letterSpacing: ".02em", lineHeight: 1 }}>CUSTOMERS</h1>
          <p style={{ fontSize: "13px", color: "#7A7880", marginTop: "4px" }}>{total} companies · wholesale accounts</p>
        </div>
        <div style={{ display: "flex", gap: "10px" }}>
          <button style={{ padding: "10px 18px", border: "1px solid #E2E0DA", borderRadius: "8px", background: "#fff", fontSize: "13px", fontWeight: 600, cursor: "pointer" }}>
            📥 Export CSV
          </button>
          <button style={{ background: "#1A5CFF", color: "#fff", border: "none", padding: "10px 20px", borderRadius: "8px", fontWeight: 700, cursor: "pointer", fontSize: "14px" }}>
            + Add Customer
          </button>
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: "12px", marginBottom: "20px" }}>
        {[
          { label: "Total Customers",    value: stats.total,                                                             icon: "👥", color: "#2A2830" },
          { label: "Active Accounts",    value: stats.active,                                                            icon: "✅", color: "#059669" },
          { label: "Avg Order Value",    value: `$${stats.avg_spend.toLocaleString("en-US", { minimumFractionDigits: 2 })}`, icon: "📊", color: "#1A5CFF" },
          { label: "Total Revenue",      value: `$${stats.total_revenue.toLocaleString("en-US", { minimumFractionDigits: 2 })}`, icon: "💰", color: "#D97706" },
        ].map(s => (
          <div key={s.label} style={{ background: "#fff", border: "1px solid #E2E0DA", borderRadius: "10px", padding: "16px 18px", display: "flex", alignItems: "center", gap: "12px" }}>
            <span style={{ fontSize: "22px" }}>{s.icon}</span>
            <div>
              <div style={{ fontFamily: "var(--font-bebas)", fontSize: "24px", color: s.color, lineHeight: 1 }}>{s.value}</div>
              <div style={{ fontSize: "10px", color: "#7A7880", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".05em" }}>{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div style={{ display: "flex", gap: "10px", marginBottom: "16px", flexWrap: "wrap", alignItems: "center" }}>
        <input
          value={q} onChange={e => { setQ(e.target.value); setPage(1); }}
          placeholder="Search customers…"
          style={{ padding: "9px 14px", border: "1.5px solid #E2E0DA", borderRadius: "8px", fontSize: "13px", fontFamily: "var(--font-jakarta)", outline: "none", width: "220px" }}
        />
        <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1); }}
          style={{ padding: "9px 12px", border: "1.5px solid #E2E0DA", borderRadius: "8px", fontSize: "13px", fontFamily: "var(--font-jakarta)", background: "#fff", cursor: "pointer" }}>
          <option value="">All Status</option>
          <option value="active">Active</option>
          <option value="pending">Pending</option>
          <option value="suspended">Suspended</option>
        </select>
        <select value={rfmFilter} onChange={e => setRfmFilter(e.target.value)}
          style={{ padding: "9px 12px", border: "1.5px solid #E2E0DA", borderRadius: "8px", fontSize: "13px", fontFamily: "var(--font-jakarta)", background: "#fff", cursor: "pointer" }}>
          <option value="">All RFM Groups</option>
          {["Champions","Loyal","At Risk","Lost","New","Potential"].map(g => <option key={g}>{g}</option>)}
        </select>
        <select value={sortBy} onChange={e => setSortBy(e.target.value)}
          style={{ padding: "9px 12px", border: "1.5px solid #E2E0DA", borderRadius: "8px", fontSize: "13px", fontFamily: "var(--font-jakarta)", background: "#fff", cursor: "pointer" }}>
          <option value="created_at">Sort: Newest</option>
          <option value="total_spend">Sort: Most Spent</option>
          <option value="order_count">Sort: Most Orders</option>
        </select>
        <span style={{ fontSize: "13px", color: "#7A7880", marginLeft: "auto" }}>
          {filtered.length} result{filtered.length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Table */}
      <div style={{ background: "#fff", border: "1px solid #E2E0DA", borderRadius: "10px", overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: "#F4F3EF", borderBottom: "2px solid #E2E0DA" }}>
              <th style={thStyle}>Company</th>
              <th style={thStyle}>Email</th>
              <th style={{ ...thStyle, textAlign: "right" }}>Orders</th>
              <th style={{ ...thStyle, textAlign: "right" }}>Amount Spent</th>
              <th style={thStyle}>Joined</th>
              <th style={thStyle}>RFM Group</th>
              <th style={thStyle}>Status</th>
              <th style={thStyle}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={8} style={{ padding: "40px", textAlign: "center", color: "#bbb", fontSize: "14px" }}>Loading…</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={8} style={{ padding: "40px", textAlign: "center", color: "#bbb", fontSize: "14px" }}>No customers found</td></tr>
            ) : filtered.map(co => {
              const rfm = getRFMGroup(co);
              const statusCfg = STATUS_BADGE[co.status] ?? { bg: "rgba(156,163,175,.15)", color: "#9CA3AF" };
              return (
                <tr key={co.id}
                  onClick={() => router.push(`/admin/customers/${co.id}`)}
                  style={{ borderBottom: "1px solid #F4F3EF", cursor: "pointer", transition: "background .12s" }}
                  onMouseEnter={e => (e.currentTarget.style.background = "#FAFAF8")}
                  onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
                  <td style={{ padding: "13px 14px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                      <div style={{ width: "34px", height: "34px", borderRadius: "50%", background: "#1A5CFF", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontFamily: "var(--font-bebas)", fontSize: "15px", flexShrink: 0 }}>
                        {co.name[0]?.toUpperCase()}
                      </div>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: "13px", color: "#2A2830" }}>{co.name}</div>
                        {co.contact_name && <div style={{ fontSize: "11px", color: "#7A7880" }}>{co.contact_name}</div>}
                      </div>
                    </div>
                  </td>
                  <td style={{ padding: "13px 14px", fontSize: "13px", color: "#7A7880" }}>{co.email ?? "—"}</td>
                  <td style={{ padding: "13px 14px", textAlign: "right", fontWeight: 700, fontSize: "14px", color: "#2A2830" }}>{co.order_count}</td>
                  <td style={{ padding: "13px 14px", textAlign: "right", fontFamily: "var(--font-bebas)", fontSize: "18px", color: "#2A2830" }}>
                    ${Number(co.total_spend).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                  </td>
                  <td style={{ padding: "13px 14px", fontSize: "12px", color: "#7A7880" }}>{new Date(co.created_at).toLocaleDateString()}</td>
                  <td style={{ padding: "13px 14px" }}>
                    <span style={{ padding: "3px 9px", borderRadius: "20px", fontSize: "11px", fontWeight: 700, background: rfm.bg, color: rfm.color }}>
                      {rfm.label}
                    </span>
                  </td>
                  <td style={{ padding: "13px 14px" }}>
                    <span style={{ padding: "3px 9px", borderRadius: "20px", fontSize: "11px", fontWeight: 700, background: statusCfg.bg, color: statusCfg.color, textTransform: "capitalize" }}>
                      {co.status}
                    </span>
                  </td>
                  <td style={{ padding: "13px 14px" }} onClick={e => e.stopPropagation()}>
                    <button
                      onClick={() => router.push(`/admin/customers/${co.id}`)}
                      style={{ padding: "5px 12px", border: "1px solid #E2E0DA", borderRadius: "6px", background: "#fff", fontSize: "12px", fontWeight: 600, cursor: "pointer" }}>
                      View
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {pages > 1 && (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", marginTop: "16px" }}>
          <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
            style={{ padding: "7px 14px", border: "1px solid #E2E0DA", borderRadius: "6px", background: "#fff", cursor: page === 1 ? "not-allowed" : "pointer", opacity: page === 1 ? 0.4 : 1, fontSize: "13px", fontWeight: 600 }}>
            ← Prev
          </button>
          <span style={{ fontSize: "13px", color: "#7A7880" }}>{page} / {pages}</span>
          <button onClick={() => setPage(p => Math.min(pages, p + 1))} disabled={page === pages}
            style={{ padding: "7px 14px", border: "1px solid #E2E0DA", borderRadius: "6px", background: "#fff", cursor: page === pages ? "not-allowed" : "pointer", opacity: page === pages ? 0.4 : 1, fontSize: "13px", fontWeight: 600 }}>
            Next →
          </button>
        </div>
      )}
    </div>
  );
}
