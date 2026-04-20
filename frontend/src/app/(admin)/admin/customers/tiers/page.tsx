"use client";
export const dynamic = "force-dynamic";

import { useEffect, useMemo, useState } from "react";
import { adminService } from "@/services/admin.service";
import { TagIcon, CheckIcon, TrashIcon } from "@/components/ui/icons";

// ─── Types ────────────────────────────────────────────────────────────────────

interface VolumeBreak { min_qty: number; discount: number; }

interface PricingTier {
  id: string;
  name: string;
  description: string | null;
  discount_percent: number;
  discount_percentage: number;
  moq: number;
  free_shipping: boolean;
  shipping_discount_percentage: number;
  tax_exempt: boolean;
  tax_percentage: number;
  payment_terms: string;
  credit_limit: number;
  priority_support: boolean;
  volume_breaks: VolumeBreak[];
  customer_count: number;
  is_active: boolean;
}

const EMPTY_FORM = {
  name: "",
  description: "",
  discount_percent: 0,
  moq: 0,
  free_shipping: false,
  shipping_discount_percentage: 0,
  tax_exempt: false,
  tax_percentage: 0,
  payment_terms: "immediate",
  credit_limit: 0,
  priority_support: false,
  volume_breaks: [] as VolumeBreak[],
};

// ─── Styles ───────────────────────────────────────────────────────────────────

const labelStyle: React.CSSProperties = {
  fontSize: "11px", fontWeight: 700, textTransform: "uppercase",
  letterSpacing: ".08em", color: "#7A7880", display: "block", marginBottom: "5px",
};

const inputStyle: React.CSSProperties = {
  width: "100%", padding: "10px 12px", border: "1.5px solid #E2E0DA",
  borderRadius: "7px", fontSize: "14px", fontFamily: "var(--font-jakarta)",
  outline: "none", boxSizing: "border-box", background: "#fff",
};

const sectionBox: React.CSSProperties = {
  background: "#F4F3EF", borderRadius: "8px", padding: "18px", marginBottom: "16px",
};

// ─── Component ────────────────────────────────────────────────────────────────

export default function PricingTiersPage() {
  const [tiers, setTiers]           = useState<PricingTier[]>([]);
  const [loading, setLoading]       = useState(true);
  const [showModal, setShowModal]   = useState(false);
  const [editingId, setEditingId]   = useState<string | null>(null);
  const [form, setForm]             = useState({ ...EMPTY_FORM });
  const [saving, setSaving]         = useState(false);
  const [toast, setToast]           = useState<{ msg: string; ok: boolean } | null>(null);

  function showToast(msg: string, ok = true) {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3000);
  }

  async function load() {
    setLoading(true);
    try {
      const data = await adminService.listPricingTiers() as PricingTier[];
      setTiers(Array.isArray(data) ? data : []);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  // ── Stats ────────────────────────────────────────────────────────────────

  const stats = useMemo(() => {
    const totalCustomers = tiers.reduce((s, t) => s + (t.customer_count || 0), 0);
    const avgDiscount = tiers.length
      ? tiers.reduce((s, t) => s + (t.discount_percentage ?? t.discount_percent ?? 0), 0) / tiers.length
      : 0;
    const popular = tiers.length
      ? tiers.reduce((a, b) => (a.customer_count || 0) >= (b.customer_count || 0) ? a : b)
      : null;
    return { totalCustomers, avgDiscount, popular };
  }, [tiers]);

  // ── Modal helpers ─────────────────────────────────────────────────────────

  function openCreate() {
    setEditingId(null);
    setForm({ ...EMPTY_FORM });
    setShowModal(true);
  }

  function openEdit(tier: PricingTier) {
    setEditingId(tier.id);
    setForm({
      name: tier.name,
      description: tier.description ?? "",
      discount_percent: tier.discount_percent ?? tier.discount_percentage ?? 0,
      moq: tier.moq ?? 0,
      free_shipping: tier.free_shipping ?? false,
      shipping_discount_percentage: tier.shipping_discount_percentage ?? 0,
      tax_exempt: tier.tax_exempt ?? false,
      tax_percentage: tier.tax_percentage ?? 0,
      payment_terms: tier.payment_terms ?? "immediate",
      credit_limit: tier.credit_limit ?? 0,
      priority_support: tier.priority_support ?? false,
      volume_breaks: (tier.volume_breaks ?? []).map(vb => ({ ...vb })),
    });
    setShowModal(true);
  }

  function closeModal() {
    setShowModal(false);
    setEditingId(null);
  }

  async function handleSave() {
    if (!form.name.trim()) { showToast("Tier name is required", false); return; }
    setSaving(true);
    try {
      if (editingId) {
        await adminService.updatePricingTier(editingId, form);
        showToast("Tier updated");
      } else {
        await adminService.createPricingTier(form);
        showToast("Tier created");
      }
      closeModal();
      await load();
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : "Save failed", false);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string, name: string) {
    if (!confirm(`Delete tier "${name}"? Customers will lose their pricing.`)) return;
    try {
      await adminService.deletePricingTier(id);
      showToast("Tier deleted");
      await load();
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : "Delete failed", false);
    }
  }

  function setVB(i: number, field: "min_qty" | "discount", val: number) {
    const vbs = [...form.volume_breaks];
    vbs[i] = { ...vbs[i]!, [field]: val };
    setForm(f => ({ ...f, volume_breaks: vbs }));
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div style={{ fontFamily: "var(--font-jakarta)" }}>

      {/* Toast */}
      {toast && (
        <div style={{ position: "fixed", top: "20px", right: "20px", zIndex: 9999, background: toast.ok ? "#059669" : "#E8242A", color: "#fff", padding: "10px 18px", borderRadius: "8px", fontSize: "13px", fontWeight: 600, boxShadow: "0 4px 16px rgba(0,0,0,.15)" }}>
          {toast.msg}
        </div>
      )}

      {/* Page header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
        <div>
          <h1 style={{ fontFamily: "var(--font-bebas)", fontSize: "32px", color: "#2A2830", letterSpacing: ".02em", lineHeight: 1 }}>Customer Tiers</h1>
          <p style={{ fontSize: "13px", color: "#7A7880", marginTop: "4px" }}>Manage wholesale discount tiers, MOQ, and payment terms</p>
        </div>
        <button
          onClick={openCreate}
          style={{ padding: "10px 20px", background: "#1A5CFF", color: "#fff", border: "none", borderRadius: "8px", fontSize: "13px", fontWeight: 700, cursor: "pointer" }}>
          + New Tier
        </button>
      </div>

      {/* Stats row */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: "12px", marginBottom: "24px" }}>
        {[
          { label: "Total Tiers",     value: tiers.length.toString(),                                         color: "#2A2830" },
          { label: "Total Customers", value: stats.totalCustomers.toString(),                                  color: "#1A5CFF" },
          { label: "Avg Discount",    value: `${stats.avgDiscount.toFixed(1)}%`,                               color: "#D97706" },
          { label: "Most Popular",    value: stats.popular ? stats.popular.name : "—",                        color: "#059669" },
        ].map(s => (
          <div key={s.label} style={{ background: "#fff", border: "1px solid #E2E0DA", borderRadius: "10px", padding: "14px 16px" }}>
            <div style={{ fontSize: "10px", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".06em", color: "#7A7880", marginBottom: "6px" }}>{s.label}</div>
            <div style={{ fontFamily: "var(--font-bebas)", fontSize: "24px", color: s.color, lineHeight: 1 }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Tiers grid */}
      {loading ? (
        <div style={{ textAlign: "center", padding: "60px", color: "#bbb", fontSize: "14px" }}>Loading…</div>
      ) : tiers.length === 0 ? (
        <div style={{ textAlign: "center", padding: "60px", background: "#fff", border: "1px solid #E2E0DA", borderRadius: "10px" }}>
          <div style={{ marginBottom: "12px" }}><TagIcon size={32} color="#2A2830" /></div>
          <div style={{ fontFamily: "var(--font-bebas)", fontSize: "20px", color: "#2A2830", marginBottom: "6px" }}>No Customer Tiers</div>
          <div style={{ fontSize: "13px", color: "#7A7880", marginBottom: "20px" }}>Create your first tier to start segmenting wholesale customers</div>
          <button onClick={openCreate} style={{ padding: "10px 20px", background: "#1A5CFF", color: "#fff", border: "none", borderRadius: "8px", fontSize: "13px", fontWeight: 700, cursor: "pointer" }}>
            + Create First Tier
          </button>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(320px,1fr))", gap: "16px" }}>
          {tiers.map(tier => {
            const disc = tier.discount_percentage ?? tier.discount_percent ?? 0;
            return (
              <div key={tier.id} style={{ background: "#fff", border: "1px solid #E2E0DA", borderRadius: "10px", padding: "24px" }}>
                {/* Header */}
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "16px" }}>
                  <div>
                    <div style={{ fontFamily: "var(--font-bebas)", fontSize: "22px", color: "#2A2830", lineHeight: 1 }}>{tier.name}</div>
                    <div style={{ fontSize: "12px", color: "#7A7880", marginTop: "2px" }}>{tier.customer_count || 0} customer{tier.customer_count !== 1 ? "s" : ""}</div>
                    {tier.description && <div style={{ fontSize: "12px", color: "#9CA3AF", marginTop: "4px" }}>{tier.description}</div>}
                  </div>
                  <div style={{ display: "flex", gap: "6px" }}>
                    <button
                      onClick={() => openEdit(tier)}
                      style={{ padding: "6px 12px", border: "1px solid #E2E0DA", borderRadius: "6px", background: "#fff", fontSize: "12px", fontWeight: 600, cursor: "pointer", color: "#2A2830" }}>
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(tier.id, tier.name)}
                      style={{ padding: "6px 12px", border: "1px solid rgba(232,36,42,.25)", borderRadius: "6px", background: "rgba(232,36,42,.05)", fontSize: "12px", fontWeight: 600, cursor: "pointer", color: "#E8242A" }}>
                      Delete
                    </button>
                  </div>
                </div>

                {/* Details grid */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                  <div style={{ background: "#F4F3EF", borderRadius: "8px", padding: "12px" }}>
                    <div style={{ fontSize: "10px", fontWeight: 700, textTransform: "uppercase", color: "#aaa", marginBottom: "4px" }}>Discount</div>
                    <div style={{ fontFamily: "var(--font-bebas)", fontSize: "24px", color: "#1A5CFF" }}>{disc}%</div>
                  </div>
                  <div style={{ background: "#F4F3EF", borderRadius: "8px", padding: "12px" }}>
                    <div style={{ fontSize: "10px", fontWeight: 700, textTransform: "uppercase", color: "#aaa", marginBottom: "4px" }}>MOQ</div>
                    <div style={{ fontFamily: "var(--font-bebas)", fontSize: "24px", color: "#2A2830" }}>{tier.moq || 0} units</div>
                  </div>
                  <div style={{ background: "#F4F3EF", borderRadius: "8px", padding: "12px" }}>
                    <div style={{ fontSize: "10px", fontWeight: 700, textTransform: "uppercase", color: "#aaa", marginBottom: "4px" }}>Shipping</div>
                    <div style={{ fontSize: "14px", fontWeight: 700, color: "#2A2830" }}>
                      {tier.free_shipping ? <span style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}><CheckIcon size={12} color="#059669" /> Free</span> : tier.shipping_discount_percentage ? `${tier.shipping_discount_percentage}% off` : "Standard"}
                    </div>
                  </div>
                  <div style={{ background: "#F4F3EF", borderRadius: "8px", padding: "12px" }}>
                    <div style={{ fontSize: "10px", fontWeight: 700, textTransform: "uppercase", color: "#aaa", marginBottom: "4px" }}>Payment Terms</div>
                    <div style={{ fontSize: "14px", fontWeight: 700, color: "#2A2830", textTransform: "uppercase" }}>{tier.payment_terms || "Standard"}</div>
                  </div>
                </div>

                {/* Badges */}
                <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", marginTop: "12px" }}>
                  {tier.tax_exempt && <span style={{ padding: "2px 8px", background: "rgba(5,150,105,.1)", color: "#059669", borderRadius: "20px", fontSize: "11px", fontWeight: 700 }}>Tax Exempt</span>}
                  {tier.priority_support && <span style={{ padding: "2px 8px", background: "rgba(124,58,237,.1)", color: "#7C3AED", borderRadius: "20px", fontSize: "11px", fontWeight: 700 }}>Priority Support</span>}
                  {tier.credit_limit > 0 && <span style={{ padding: "2px 8px", background: "rgba(8,145,178,.1)", color: "#0891B2", borderRadius: "20px", fontSize: "11px", fontWeight: 700 }}>${tier.credit_limit.toLocaleString()} credit</span>}
                </div>

                {/* Volume breaks */}
                {(tier.volume_breaks?.length ?? 0) > 0 && (
                  <div style={{ marginTop: "14px", borderTop: "1px solid #E2E0DA", paddingTop: "14px" }}>
                    <div style={{ fontSize: "11px", fontWeight: 700, textTransform: "uppercase", color: "#aaa", marginBottom: "8px" }}>Volume Breaks</div>
                    {tier.volume_breaks!.map((vb, i) => (
                      <div key={i} style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", padding: "4px 0", borderBottom: "1px solid #F4F3EF" }}>
                        <span style={{ color: "#7A7880" }}>{vb.min_qty}+ units</span>
                        <span style={{ fontWeight: 700, color: "#059669" }}>{vb.discount}% off</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ── CREATE / EDIT MODAL ─────────────────────────────────────────────── */}
      {showModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.5)", zIndex: 1000, display: "flex", alignItems: "flex-start", justifyContent: "center", padding: "40px 20px", overflowY: "auto" }}>
          <div style={{ background: "#fff", borderRadius: "12px", width: "100%", maxWidth: "720px", padding: "28px" }}>

            {/* Modal header */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "22px" }}>
              <h2 style={{ fontFamily: "var(--font-bebas)", fontSize: "26px", color: "#2A2830" }}>
                {editingId ? "EDIT TIER" : "CREATE PRICING TIER"}
              </h2>
              <button onClick={closeModal} style={{ background: "none", border: "none", fontSize: "20px", cursor: "pointer", color: "#7A7880", lineHeight: 1 }}>✕</button>
            </div>

            {/* Section 1: Basic Info */}
            <div style={sectionBox}>
              <div style={{ fontFamily: "var(--font-bebas)", fontSize: "13px", letterSpacing: ".1em", color: "#7A7880", marginBottom: "14px" }}>BASIC INFO</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" }}>
                <div>
                  <label style={labelStyle}>Tier Name *</label>
                  <input
                    value={form.name}
                    onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                    placeholder="e.g. Silver, Gold, Platinum"
                    style={inputStyle}
                  />
                </div>
                <div>
                  <label style={labelStyle}>Base Discount %</label>
                  <input
                    type="number" min="0" max="100"
                    value={form.discount_percent}
                    onChange={e => setForm(f => ({ ...f, discount_percent: parseFloat(e.target.value) || 0 }))}
                    style={inputStyle}
                  />
                </div>
                <div style={{ gridColumn: "1/-1" }}>
                  <label style={labelStyle}>Description</label>
                  <input
                    value={form.description}
                    onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                    placeholder="Tier description for internal use"
                    style={inputStyle}
                  />
                </div>
              </div>
            </div>

            {/* Section 2: Shipping */}
            <div style={sectionBox}>
              <div style={{ fontFamily: "var(--font-bebas)", fontSize: "13px", letterSpacing: ".1em", color: "#7A7880", marginBottom: "14px" }}>SHIPPING</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "12px", padding: "12px", background: "#fff", borderRadius: "8px", border: "1px solid #E2E0DA" }}>
                  <input
                    type="checkbox" id="free_shipping"
                    checked={form.free_shipping}
                    onChange={e => setForm(f => ({ ...f, free_shipping: e.target.checked }))}
                    style={{ width: "18px", height: "18px", cursor: "pointer", accentColor: "#1A5CFF" }}
                  />
                  <div>
                    <label htmlFor="free_shipping" style={{ fontSize: "14px", fontWeight: 700, cursor: "pointer" }}>Free Shipping</label>
                    <div style={{ fontSize: "12px", color: "#7A7880" }}>All orders ship free</div>
                  </div>
                </div>
                {!form.free_shipping && (
                  <div>
                    <label style={labelStyle}>Shipping Discount %</label>
                    <input
                      type="number" min="0" max="100"
                      value={form.shipping_discount_percentage}
                      onChange={e => setForm(f => ({ ...f, shipping_discount_percentage: parseFloat(e.target.value) || 0 }))}
                      style={inputStyle}
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Section 3: Tax & Payment */}
            <div style={sectionBox}>
              <div style={{ fontFamily: "var(--font-bebas)", fontSize: "13px", letterSpacing: ".1em", color: "#7A7880", marginBottom: "14px" }}>TAX &amp; PAYMENT</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "14px" }}>
                <div>
                  <label style={labelStyle}>Payment Terms</label>
                  <select
                    value={form.payment_terms}
                    onChange={e => setForm(f => ({ ...f, payment_terms: e.target.value }))}
                    style={{ ...inputStyle, cursor: "pointer" }}>
                    <option value="immediate">Immediate</option>
                    <option value="net15">NET 15</option>
                    <option value="net30">NET 30</option>
                    <option value="net60">NET 60</option>
                    <option value="net90">NET 90</option>
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>Credit Limit ($)</label>
                  <input
                    type="number" min="0"
                    value={form.credit_limit}
                    onChange={e => setForm(f => ({ ...f, credit_limit: parseFloat(e.target.value) || 0 }))}
                    style={inputStyle}
                  />
                </div>
                <div>
                  <label style={labelStyle}>MOQ (units)</label>
                  <input
                    type="number" min="0"
                    value={form.moq}
                    onChange={e => setForm(f => ({ ...f, moq: parseInt(e.target.value) || 0 }))}
                    style={inputStyle}
                  />
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "10px", padding: "12px", background: "#fff", borderRadius: "8px", border: "1px solid #E2E0DA" }}>
                  <input
                    type="checkbox" id="tax_exempt"
                    checked={form.tax_exempt}
                    onChange={e => setForm(f => ({ ...f, tax_exempt: e.target.checked }))}
                    style={{ width: "18px", height: "18px", cursor: "pointer", accentColor: "#1A5CFF" }}
                  />
                  <label htmlFor="tax_exempt" style={{ fontSize: "13px", fontWeight: 700, cursor: "pointer" }}>Tax Exempt</label>
                </div>
                {!form.tax_exempt && (
                  <div>
                    <label style={labelStyle}>Custom Tax %</label>
                    <input
                      type="number" min="0" max="30" step="0.1"
                      value={form.tax_percentage}
                      onChange={e => setForm(f => ({ ...f, tax_percentage: parseFloat(e.target.value) || 0 }))}
                      style={inputStyle}
                    />
                  </div>
                )}
                <div style={{ display: "flex", alignItems: "center", gap: "10px", padding: "12px", background: "#fff", borderRadius: "8px", border: "1px solid #E2E0DA" }}>
                  <input
                    type="checkbox" id="priority"
                    checked={form.priority_support}
                    onChange={e => setForm(f => ({ ...f, priority_support: e.target.checked }))}
                    style={{ width: "18px", height: "18px", cursor: "pointer", accentColor: "#1A5CFF" }}
                  />
                  <label htmlFor="priority" style={{ fontSize: "13px", fontWeight: 700, cursor: "pointer" }}>Priority Support</label>
                </div>
              </div>
            </div>

            {/* Section 4: Volume Pricing */}
            <div style={sectionBox}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
                <div style={{ fontFamily: "var(--font-bebas)", fontSize: "13px", letterSpacing: ".1em", color: "#7A7880" }}>VOLUME PRICING BREAKS</div>
                <button
                  onClick={() => setForm(f => ({ ...f, volume_breaks: [...f.volume_breaks, { min_qty: 100, discount: 5 }] }))}
                  style={{ padding: "5px 12px", background: "#1A5CFF", color: "#fff", border: "none", borderRadius: "5px", fontSize: "12px", fontWeight: 700, cursor: "pointer" }}>
                  + Add Break
                </button>
              </div>
              {form.volume_breaks.length === 0 ? (
                <div style={{ textAlign: "center", color: "#bbb", fontSize: "13px", padding: "16px" }}>
                  No volume breaks — flat discount applied to all quantities
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                  {form.volume_breaks.map((vb, i) => (
                    <div key={i} style={{ display: "flex", gap: "10px", alignItems: "center", background: "#fff", padding: "10px 14px", borderRadius: "7px", border: "1px solid #E2E0DA" }}>
                      <span style={{ fontSize: "13px", color: "#7A7880", minWidth: "60px" }}>Min Qty:</span>
                      <input
                        type="number"
                        value={vb.min_qty}
                        onChange={e => setVB(i, "min_qty", parseInt(e.target.value) || 0)}
                        style={{ width: "80px", padding: "7px", border: "1px solid #E2E0DA", borderRadius: "5px", fontSize: "13px", textAlign: "center", outline: "none" }}
                      />
                      <span style={{ fontSize: "13px", color: "#7A7880" }}>units →</span>
                      <input
                        type="number"
                        value={vb.discount}
                        onChange={e => setVB(i, "discount", parseFloat(e.target.value) || 0)}
                        style={{ width: "70px", padding: "7px", border: "1px solid #E2E0DA", borderRadius: "5px", fontSize: "13px", textAlign: "center", outline: "none" }}
                      />
                      <span style={{ fontSize: "13px", color: "#7A7880" }}>% off</span>
                      <button
                        onClick={() => setForm(f => ({ ...f, volume_breaks: f.volume_breaks.filter((_, idx) => idx !== i) }))}
                        style={{ marginLeft: "auto", background: "none", border: "none", color: "#E8242A", cursor: "pointer", fontSize: "16px" }}>
                        <TrashIcon size={14} color="#E8242A" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Actions */}
            <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}>
              <button
                onClick={closeModal}
                style={{ padding: "11px 22px", border: "1px solid #E2E0DA", borderRadius: "8px", background: "#fff", cursor: "pointer", fontWeight: 600, fontSize: "13px" }}>
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                style={{ padding: "11px 22px", background: saving ? "#aaa" : "#1A5CFF", color: "#fff", border: "none", borderRadius: "8px", fontWeight: 700, fontSize: "13px", cursor: saving ? "not-allowed" : "pointer" }}>
                {saving ? "Saving…" : editingId ? "Save Changes" : "Create Tier"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
