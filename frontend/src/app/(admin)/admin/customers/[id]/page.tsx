"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { adminService } from "@/services/admin.service";

interface CompanyDetail {
  id: string;
  name: string;
  status: string;
  tax_id: string | null;
  business_type: string | null;
  website: string | null;
  pricing_tier_id: string | null;
  shipping_tier_id: string | null;
  shipping_override_amount: string | null;
  stripe_customer_id: string | null;
  qb_customer_id: string | null;
  created_at: string;
  updated_at: string;
  // enriched fields
  contact_name?: string;
  email?: string;
  phone?: string;
  notes?: string;
  tags?: string[];
  order_count?: number;
  total_spend?: string;
  last_order_date?: string;
}

interface PricingTier { id: string; name: string; }
interface ShippingTier { id: string; name: string; }

interface OrderRow {
  id: string;
  order_number: string;
  status: string;
  total_amount: string;
  created_at: string;
  items_count?: number;
}

interface RFMGroup { label: string; color: string; bg: string }

function getRFMGroup(c: CompanyDetail): RFMGroup {
  const orders = c.order_count || 0;
  const days = c.last_order_date
    ? Math.floor((Date.now() - new Date(c.last_order_date).getTime()) / 86400000)
    : 999;
  if (orders >= 10 && days < 30) return { label: "Champions", color: "#059669", bg: "rgba(5,150,105,.1)" };
  if (orders >= 5  && days < 60) return { label: "Loyal",     color: "#1A5CFF", bg: "rgba(26,92,255,.1)" };
  if (days > 90 && orders > 2)   return { label: "At Risk",   color: "#D97706", bg: "rgba(217,119,6,.1)" };
  if (days > 180)                 return { label: "Lost",      color: "#E8242A", bg: "rgba(232,36,42,.1)" };
  if (orders <= 1)                return { label: "New",       color: "#7C3AED", bg: "rgba(124,58,237,.1)" };
  return                                  { label: "Potential", color: "#0891B2", bg: "rgba(8,145,178,.1)" };
}

const STATUS_BADGE: Record<string, { bg: string; color: string }> = {
  active:    { bg: "rgba(5,150,105,.1)",  color: "#059669" },
  suspended: { bg: "rgba(232,36,42,.1)",  color: "#E8242A" },
  pending:   { bg: "rgba(217,119,6,.1)",  color: "#D97706" },
  cancelled: { bg: "rgba(156,163,175,.15)", color: "#9CA3AF" },
  completed: { bg: "rgba(26,92,255,.1)",  color: "#1A5CFF" },
};

const card: React.CSSProperties = {
  background: "#fff",
  border: "1px solid #E2E0DA",
  borderRadius: "10px",
  padding: "18px 20px",
  marginBottom: "14px",
};

const sectionTitle: React.CSSProperties = {
  fontWeight: 700,
  fontSize: "12px",
  textTransform: "uppercase",
  letterSpacing: ".07em",
  color: "#7A7880",
  marginBottom: "14px",
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "8px 11px",
  border: "1.5px solid #E2E0DA",
  borderRadius: "7px",
  fontSize: "13px",
  fontFamily: "var(--font-jakarta)",
  outline: "none",
  boxSizing: "border-box",
};

const selectStyle: React.CSSProperties = {
  ...inputStyle,
  background: "#fff",
  cursor: "pointer",
};

export default function AdminCompanyDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [company, setCompany]           = useState<CompanyDetail | null>(null);
  const [orders, setOrders]             = useState<OrderRow[]>([]);
  const [pricingTiers, setPricingTiers] = useState<PricingTier[]>([]);
  const [shippingTiers, setShippingTiers] = useState<ShippingTier[]>([]);

  // editable tiers
  const [editPricingTier, setEditPricingTier]     = useState("");
  const [editShippingTier, setEditShippingTier]   = useState("");
  const [shippingOverride, setShippingOverride]   = useState("");

  // suspend flow
  const [showSuspendForm, setShowSuspendForm] = useState(false);
  const [suspendReason, setSuspendReason]     = useState("");
  const [isSuspending, setIsSuspending]       = useState(false);

  // save tiers
  const [isSaving, setIsSaving] = useState(false);

  // tags
  const [tags, setTags]       = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [isSavingTags, setIsSavingTags] = useState(false);

  // notes
  const [notes, setNotes]       = useState("");
  const [editNotes, setEditNotes] = useState(false);
  const [isSavingNotes, setIsSavingNotes] = useState(false);

  // feedback
  const [error, setError]       = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      const [co, pt, st] = await Promise.all([
        adminService.getCompany(id) as Promise<CompanyDetail>,
        adminService.listPricingTiers() as Promise<PricingTier[]>,
        adminService.listShippingTiers() as Promise<ShippingTier[]>,
      ]);
      setCompany(co);
      setPricingTiers(pt);
      setShippingTiers(st);
      setEditPricingTier(co.pricing_tier_id ?? "");
      setEditShippingTier(co.shipping_tier_id ?? "");
      setShippingOverride(co.shipping_override_amount ?? "");
      setTags(co.tags ?? []);
      setNotes(co.notes ?? "");
    }
    load();
  }, [id]);

  useEffect(() => {
    // Load orders separately so it doesn't block the main load
    async function loadOrders() {
      try {
        const data = await adminService.listOrders({ q: id }) as { items?: OrderRow[] } | OrderRow[];
        const items = Array.isArray(data) ? data : (data.items ?? []);
        // Filter client-side by company_id since the API may not support it directly
        setOrders(items);
      } catch {
        // orders load failure is non-fatal
      }
    }
    if (id) loadOrders();
  }, [id]);

  const rfm = useMemo(() => company ? getRFMGroup(company) : null, [company]);

  async function handleSaveTiers() {
    setIsSaving(true);
    setError(null);
    setSuccessMsg(null);
    try {
      await adminService.updateCompany(id, {
        pricing_tier_id: editPricingTier || null,
        shipping_tier_id: editShippingTier || null,
        shipping_override_amount: shippingOverride ? Number(shippingOverride) : null,
      });
      setSuccessMsg("Tiers updated");
      const co = await adminService.getCompany(id) as CompanyDetail;
      setCompany(co);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to update");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleSuspend() {
    if (!suspendReason.trim()) return;
    setIsSuspending(true);
    setError(null);
    try {
      await adminService.suspendCompany(id, suspendReason);
      setCompany(c => c ? { ...c, status: "suspended" } : c);
      setShowSuspendForm(false);
      setSuspendReason("");
      setSuccessMsg("Company suspended");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to suspend");
    } finally {
      setIsSuspending(false);
    }
  }

  async function handleReactivate() {
    setError(null);
    try {
      await adminService.reactivateCompany(id);
      setCompany(c => c ? { ...c, status: "active" } : c);
      setSuccessMsg("Company reactivated");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to reactivate");
    }
  }

  async function handleAddTag() {
    const t = tagInput.trim();
    if (!t || tags.includes(t)) { setTagInput(""); return; }
    const next = [...tags, t];
    setTags(next);
    setTagInput("");
    setIsSavingTags(true);
    try {
      await adminService.updateCompany(id, { tags: next });
    } finally {
      setIsSavingTags(false);
    }
  }

  async function handleRemoveTag(tag: string) {
    const next = tags.filter(t => t !== tag);
    setTags(next);
    await adminService.updateCompany(id, { tags: next });
  }

  async function handleSaveNotes() {
    setIsSavingNotes(true);
    try {
      await adminService.updateCompany(id, { notes });
      setEditNotes(false);
      setSuccessMsg("Notes saved");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to save notes");
    } finally {
      setIsSavingNotes(false);
    }
  }

  function clearMsg() { setSuccessMsg(null); setError(null); }

  if (!company) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "200px", color: "#bbb", fontSize: "14px", fontFamily: "var(--font-jakarta)" }}>
        Loading…
      </div>
    );
  }

  const statusCfg = STATUS_BADGE[company.status] ?? { bg: "rgba(156,163,175,.15)", color: "#9CA3AF" };
  const totalSpend = Number(company.total_spend || 0);
  const orderCount = company.order_count || 0;

  const thStyle: React.CSSProperties = {
    padding: "10px 14px", textAlign: "left", fontSize: "10px",
    textTransform: "uppercase", letterSpacing: ".07em", color: "#7A7880", fontWeight: 700,
  };

  return (
    <div style={{ fontFamily: "var(--font-jakarta)" }}>

      {/* Back */}
      <button
        onClick={() => router.back()}
        style={{ fontSize: "13px", color: "#1A5CFF", fontWeight: 600, background: "none", border: "none", cursor: "pointer", padding: 0, marginBottom: "18px", display: "flex", alignItems: "center", gap: "4px" }}
      >
        ← Back to Customers
      </button>

      {/* Feedback banners */}
      {error && (
        <div style={{ background: "rgba(232,36,42,.07)", border: "1px solid rgba(232,36,42,.2)", borderRadius: "8px", padding: "10px 14px", marginBottom: "14px", fontSize: "13px", color: "#E8242A", display: "flex", justifyContent: "space-between" }}>
          {error} <button onClick={clearMsg} style={{ background: "none", border: "none", cursor: "pointer", color: "#E8242A", fontWeight: 700 }}>✕</button>
        </div>
      )}
      {successMsg && (
        <div style={{ background: "rgba(5,150,105,.07)", border: "1px solid rgba(5,150,105,.2)", borderRadius: "8px", padding: "10px 14px", marginBottom: "14px", fontSize: "13px", color: "#059669", display: "flex", justifyContent: "space-between" }}>
          {successMsg} <button onClick={clearMsg} style={{ background: "none", border: "none", cursor: "pointer", color: "#059669", fontWeight: 700 }}>✕</button>
        </div>
      )}

      {/* HEADER */}
      <div style={{ background: "#fff", border: "1px solid #E2E0DA", borderRadius: "12px", padding: "22px 24px", marginBottom: "20px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "20px", flexWrap: "wrap" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          <div style={{ width: "52px", height: "52px", borderRadius: "50%", background: "#1A5CFF", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontFamily: "var(--font-bebas)", fontSize: "24px", flexShrink: 0 }}>
            {company.name[0]?.toUpperCase()}
          </div>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
              <h1 style={{ fontFamily: "var(--font-bebas)", fontSize: "28px", color: "#2A2830", letterSpacing: ".02em", lineHeight: 1 }}>{company.name}</h1>
              <span style={{ padding: "3px 10px", borderRadius: "20px", fontSize: "11px", fontWeight: 700, background: statusCfg.bg, color: statusCfg.color, textTransform: "capitalize" }}>
                {company.status}
              </span>
            </div>
            <div style={{ fontSize: "13px", color: "#7A7880", marginTop: "4px", display: "flex", gap: "16px", flexWrap: "wrap" }}>
              {company.contact_name && <span>{company.contact_name}</span>}
              {company.email && <span>{company.email}</span>}
              {company.phone && <span>{company.phone}</span>}
              {!company.contact_name && !company.email && (
                <span>Joined {new Date(company.created_at).toLocaleDateString()}</span>
              )}
            </div>
          </div>
        </div>
        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
          {company.status === "active" ? (
            <button
              onClick={() => setShowSuspendForm(true)}
              style={{ padding: "9px 16px", border: "1px solid rgba(232,36,42,.3)", borderRadius: "8px", background: "rgba(232,36,42,.05)", color: "#E8242A", fontSize: "13px", fontWeight: 600, cursor: "pointer" }}>
              Suspend
            </button>
          ) : (
            <button
              onClick={handleReactivate}
              style={{ padding: "9px 16px", border: "1px solid rgba(5,150,105,.3)", borderRadius: "8px", background: "rgba(5,150,105,.05)", color: "#059669", fontSize: "13px", fontWeight: 600, cursor: "pointer" }}>
              Reactivate
            </button>
          )}
          <button
            onClick={() => router.push(`/admin/orders?company=${id}`)}
            style={{ padding: "9px 16px", border: "1px solid #E2E0DA", borderRadius: "8px", background: "#fff", fontSize: "13px", fontWeight: 600, cursor: "pointer", color: "#2A2830" }}>
            View Orders
          </button>
        </div>
      </div>

      {/* Suspend form modal (inline) */}
      {showSuspendForm && (
        <div style={{ background: "rgba(232,36,42,.04)", border: "1px solid rgba(232,36,42,.2)", borderRadius: "10px", padding: "16px 20px", marginBottom: "16px" }}>
          <div style={{ fontWeight: 700, fontSize: "13px", color: "#E8242A", marginBottom: "10px" }}>Suspend Company</div>
          <textarea
            rows={2}
            value={suspendReason}
            onChange={e => setSuspendReason(e.target.value)}
            placeholder="Reason for suspension (required)"
            style={{ ...inputStyle, resize: "vertical", marginBottom: "10px", borderColor: "rgba(232,36,42,.4)" }}
          />
          <div style={{ display: "flex", gap: "8px" }}>
            <button
              onClick={handleSuspend}
              disabled={isSuspending || !suspendReason.trim()}
              style={{ padding: "8px 16px", background: "#E8242A", color: "#fff", border: "none", borderRadius: "7px", fontSize: "13px", fontWeight: 700, cursor: isSuspending || !suspendReason.trim() ? "not-allowed" : "pointer", opacity: isSuspending || !suspendReason.trim() ? 0.5 : 1 }}>
              {isSuspending ? "Suspending…" : "Confirm Suspend"}
            </button>
            <button
              onClick={() => { setShowSuspendForm(false); setSuspendReason(""); }}
              style={{ padding: "8px 16px", border: "1px solid #E2E0DA", borderRadius: "7px", background: "#fff", fontSize: "13px", fontWeight: 600, cursor: "pointer" }}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* TOP STATS ROW */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: "12px", marginBottom: "20px" }}>
        {[
          { label: "Amount Spent", value: `$${totalSpend.toLocaleString("en-US", { minimumFractionDigits: 2 })}`, icon: "💰", color: "#D97706" },
          { label: "Total Orders", value: orderCount.toString(), icon: "📦", color: "#1A5CFF" },
          { label: "Customer Since", value: new Date(company.created_at).toLocaleDateString("en-US", { month: "short", year: "numeric" }), icon: "📅", color: "#2A2830" },
          rfm ? { label: "RFM Group", value: rfm.label, icon: "📊", color: rfm.color } : { label: "RFM Group", value: "—", icon: "📊", color: "#7A7880" },
        ].map(s => (
          <div key={s.label} style={{ background: "#fff", border: "1px solid #E2E0DA", borderRadius: "10px", padding: "14px 16px", display: "flex", alignItems: "center", gap: "12px" }}>
            <span style={{ fontSize: "20px" }}>{s.icon}</span>
            <div>
              <div style={{ fontFamily: s.label === "Customer Since" ? "var(--font-jakarta)" : "var(--font-bebas)", fontSize: s.label === "Customer Since" ? "14px" : "22px", color: s.color, lineHeight: 1, fontWeight: s.label === "Customer Since" ? 700 : undefined }}>{s.value}</div>
              <div style={{ fontSize: "10px", color: "#7A7880", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".05em", marginTop: "2px" }}>{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* 2-COLUMN LAYOUT */}
      <div style={{ display: "grid", gridTemplateColumns: "65% 35%", gap: "14px", alignItems: "start" }}>

        {/* LEFT COLUMN */}
        <div>
          {/* Last Order */}
          {orders.length > 0 && orders[0] && (
            <div style={card}>
              <div style={sectionTitle}>Last Order</div>
              {(() => {
                const last = orders[0]!;
                const oCfg = STATUS_BADGE[last.status] ?? { bg: "rgba(156,163,175,.15)", color: "#9CA3AF" };
                return (
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: "14px", color: "#2A2830" }}>#{last.order_number}</div>
                      <div style={{ fontSize: "12px", color: "#7A7880", marginTop: "2px" }}>{new Date(last.created_at).toLocaleDateString()}</div>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                      <span style={{ fontFamily: "var(--font-bebas)", fontSize: "20px", color: "#2A2830" }}>
                        ${Number(last.total_amount).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                      </span>
                      <span style={{ padding: "3px 9px", borderRadius: "20px", fontSize: "11px", fontWeight: 700, background: oCfg.bg, color: oCfg.color, textTransform: "capitalize" }}>
                        {last.status}
                      </span>
                      <button
                        onClick={() => router.push(`/admin/orders/${last.id}`)}
                        style={{ padding: "5px 12px", border: "1px solid #E2E0DA", borderRadius: "6px", background: "#fff", fontSize: "12px", fontWeight: 600, cursor: "pointer" }}>
                        View
                      </button>
                    </div>
                  </div>
                );
              })()}
            </div>
          )}

          {/* Orders History */}
          <div style={card}>
            <div style={sectionTitle}>Order History</div>
            {orders.length === 0 ? (
              <div style={{ textAlign: "center", padding: "24px", color: "#bbb", fontSize: "13px" }}>No orders yet</div>
            ) : (
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ background: "#F4F3EF", borderBottom: "1.5px solid #E2E0DA" }}>
                    <th style={thStyle}>Order #</th>
                    <th style={thStyle}>Date</th>
                    <th style={{ ...thStyle, textAlign: "right" }}>Amount</th>
                    <th style={thStyle}>Status</th>
                    <th style={thStyle}></th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map(o => {
                    const oCfg = STATUS_BADGE[o.status] ?? { bg: "rgba(156,163,175,.15)", color: "#9CA3AF" };
                    return (
                      <tr key={o.id} style={{ borderBottom: "1px solid #F4F3EF" }}>
                        <td style={{ padding: "11px 14px", fontWeight: 700, fontSize: "13px", color: "#2A2830" }}>#{o.order_number}</td>
                        <td style={{ padding: "11px 14px", fontSize: "12px", color: "#7A7880" }}>{new Date(o.created_at).toLocaleDateString()}</td>
                        <td style={{ padding: "11px 14px", textAlign: "right", fontFamily: "var(--font-bebas)", fontSize: "16px", color: "#2A2830" }}>
                          ${Number(o.total_amount).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                        </td>
                        <td style={{ padding: "11px 14px" }}>
                          <span style={{ padding: "3px 9px", borderRadius: "20px", fontSize: "11px", fontWeight: 700, background: oCfg.bg, color: oCfg.color, textTransform: "capitalize" }}>
                            {o.status}
                          </span>
                        </td>
                        <td style={{ padding: "11px 14px" }}>
                          <button
                            onClick={() => router.push(`/admin/orders/${o.id}`)}
                            style={{ padding: "4px 10px", border: "1px solid #E2E0DA", borderRadius: "6px", background: "#fff", fontSize: "11px", fontWeight: 600, cursor: "pointer" }}>
                            View
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>

          {/* Timeline */}
          <div style={card}>
            <div style={sectionTitle}>Timeline</div>
            <div style={{ display: "flex", flexDirection: "column", gap: "0" }}>
              {[
                { date: company.updated_at, label: "Profile last updated", color: "#7C3AED" },
                ...(company.last_order_date ? [{ date: company.last_order_date, label: "Last order placed", color: "#1A5CFF" }] : []),
                { date: company.created_at, label: "Account created", color: "#059669" },
              ].map((ev, i) => (
                <div key={i} style={{ display: "flex", gap: "14px", alignItems: "flex-start" }}>
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                    <div style={{ width: "10px", height: "10px", borderRadius: "50%", background: ev.color, flexShrink: 0, marginTop: "4px" }} />
                    {i < 2 && <div style={{ width: "2px", flex: 1, background: "#E2E0DA", minHeight: "24px" }} />}
                  </div>
                  <div style={{ paddingBottom: "16px" }}>
                    <div style={{ fontSize: "13px", fontWeight: 600, color: "#2A2830" }}>{ev.label}</div>
                    <div style={{ fontSize: "11px", color: "#7A7880" }}>{new Date(ev.date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN */}
        <div>
          {/* Customer Details */}
          <div style={card}>
            <div style={sectionTitle}>Customer Details</div>
            <dl style={{ display: "grid", gridTemplateColumns: "auto 1fr", gap: "6px 16px", fontSize: "13px" }}>
              {[
                { label: "Tax ID",        value: company.tax_id },
                { label: "Business Type", value: company.business_type },
                { label: "Website",       value: company.website },
                { label: "Stripe ID",     value: company.stripe_customer_id },
                { label: "QB Customer",   value: company.qb_customer_id },
                { label: "Joined",        value: new Date(company.created_at).toLocaleDateString() },
              ].map(row => (
                row.value ? (
                  <>
                    <dt key={`dt-${row.label}`} style={{ color: "#7A7880", whiteSpace: "nowrap", lineHeight: "1.7" }}>{row.label}</dt>
                    <dd key={`dd-${row.label}`} style={{ color: "#2A2830", fontWeight: 600, wordBreak: "break-all", lineHeight: "1.7", margin: 0 }}>{row.value}</dd>
                  </>
                ) : null
              ))}
            </dl>

            {/* Pricing & Shipping Tiers */}
            <div style={{ marginTop: "16px", paddingTop: "14px", borderTop: "1px solid #F4F3EF" }}>
              <div style={{ ...sectionTitle, marginBottom: "10px" }}>Pricing &amp; Shipping</div>
              <div style={{ marginBottom: "10px" }}>
                <label style={{ fontSize: "11px", color: "#7A7880", fontWeight: 700, display: "block", marginBottom: "4px" }}>Pricing Tier</label>
                <select value={editPricingTier} onChange={e => setEditPricingTier(e.target.value)} style={selectStyle}>
                  <option value="">None</option>
                  {pricingTiers.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
              </div>
              <div style={{ marginBottom: "10px" }}>
                <label style={{ fontSize: "11px", color: "#7A7880", fontWeight: 700, display: "block", marginBottom: "4px" }}>Shipping Tier</label>
                <select value={editShippingTier} onChange={e => setEditShippingTier(e.target.value)} style={selectStyle}>
                  <option value="">None</option>
                  {shippingTiers.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
              </div>
              <div style={{ marginBottom: "12px" }}>
                <label style={{ fontSize: "11px", color: "#7A7880", fontWeight: 700, display: "block", marginBottom: "4px" }}>Shipping Override ($)</label>
                <input
                  type="number"
                  value={shippingOverride}
                  onChange={e => setShippingOverride(e.target.value)}
                  placeholder="Leave blank to use tier"
                  style={inputStyle}
                />
              </div>
              <button
                onClick={handleSaveTiers}
                disabled={isSaving}
                style={{ width: "100%", padding: "9px", background: "#1A5CFF", color: "#fff", border: "none", borderRadius: "7px", fontSize: "13px", fontWeight: 700, cursor: isSaving ? "not-allowed" : "pointer", opacity: isSaving ? 0.6 : 1 }}>
                {isSaving ? "Saving…" : "Save Changes"}
              </button>
            </div>
          </div>

          {/* Tags */}
          <div style={card}>
            <div style={sectionTitle}>Tags</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", marginBottom: "10px" }}>
              {tags.length === 0 && <span style={{ fontSize: "12px", color: "#bbb" }}>No tags yet</span>}
              {tags.map(tag => (
                <span key={tag} style={{ display: "inline-flex", alignItems: "center", gap: "5px", padding: "3px 9px", background: "rgba(26,92,255,.08)", color: "#1A5CFF", borderRadius: "20px", fontSize: "12px", fontWeight: 600 }}>
                  {tag}
                  <button
                    onClick={() => handleRemoveTag(tag)}
                    style={{ background: "none", border: "none", cursor: "pointer", color: "#1A5CFF", padding: 0, fontSize: "13px", lineHeight: 1 }}>
                    ×
                  </button>
                </span>
              ))}
            </div>
            <div style={{ display: "flex", gap: "6px" }}>
              <input
                value={tagInput}
                onChange={e => setTagInput(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleAddTag()}
                placeholder="Add tag…"
                style={{ ...inputStyle, flex: 1 }}
              />
              <button
                onClick={handleAddTag}
                disabled={isSavingTags || !tagInput.trim()}
                style={{ padding: "8px 12px", background: "#1A5CFF", color: "#fff", border: "none", borderRadius: "7px", fontSize: "13px", fontWeight: 700, cursor: !tagInput.trim() ? "not-allowed" : "pointer", opacity: !tagInput.trim() ? 0.5 : 1 }}>
                +
              </button>
            </div>
          </div>

          {/* Notes */}
          <div style={card}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
              <div style={sectionTitle}>Notes</div>
              {!editNotes && (
                <button onClick={() => setEditNotes(true)} style={{ fontSize: "12px", color: "#1A5CFF", fontWeight: 600, background: "none", border: "none", cursor: "pointer", padding: 0 }}>
                  Edit
                </button>
              )}
            </div>
            {editNotes ? (
              <>
                <textarea
                  rows={5}
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  placeholder="Add internal notes about this customer…"
                  style={{ ...inputStyle, resize: "vertical", marginBottom: "8px" }}
                />
                <div style={{ display: "flex", gap: "8px" }}>
                  <button
                    onClick={handleSaveNotes}
                    disabled={isSavingNotes}
                    style={{ flex: 1, padding: "8px", background: "#1A5CFF", color: "#fff", border: "none", borderRadius: "7px", fontSize: "13px", fontWeight: 700, cursor: isSavingNotes ? "not-allowed" : "pointer", opacity: isSavingNotes ? 0.6 : 1 }}>
                    {isSavingNotes ? "Saving…" : "Save"}
                  </button>
                  <button
                    onClick={() => setEditNotes(false)}
                    style={{ padding: "8px 14px", border: "1px solid #E2E0DA", borderRadius: "7px", background: "#fff", fontSize: "13px", fontWeight: 600, cursor: "pointer" }}>
                    Cancel
                  </button>
                </div>
              </>
            ) : (
              <p style={{ fontSize: "13px", color: notes ? "#2A2830" : "#bbb", lineHeight: 1.6, margin: 0, whiteSpace: "pre-wrap" }}>
                {notes || "No notes yet. Click Edit to add internal notes."}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
