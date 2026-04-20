"use client";

import { useEffect, useState } from "react";
import { adminService } from "@/services/admin.service";

// ─── Types ────────────────────────────────────────────────────────────────────

interface ShippingBracket {
  id?: string;
  // unit-based
  min_units: number;
  max_units: number | null;
  // order-value-based
  min_order_value: number | null;
  max_order_value: number | null;
  cost: number;
}

interface ShippingTier {
  id: string;
  name: string;
  description: string | null;
  calculation_type: "units" | "order_value" | "free";
  cutoff_time: string | null;
  is_active: boolean;
  brackets: ShippingBracket[];
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const labelStyle: React.CSSProperties = {
  fontSize: "11px", fontWeight: 700, textTransform: "uppercase",
  letterSpacing: ".08em", color: "#7A7880", display: "block", marginBottom: "5px",
};
const inputStyle: React.CSSProperties = {
  width: "100%", padding: "9px 12px", border: "1.5px solid #E2E0DA", borderRadius: "7px",
  fontSize: "13px", fontFamily: "var(--font-jakarta)", outline: "none", boxSizing: "border-box",
};
const cardStyle: React.CSSProperties = {
  background: "#fff", border: "1px solid #E2E0DA", borderRadius: "10px", overflow: "hidden",
  marginBottom: "16px",
};

const TYPE_LABELS: Record<string, string> = {
  units: "Unit-Based",
  order_value: "Order Value",
  free: "Free / Will Call",
};
const TYPE_COLORS: Record<string, { bg: string; color: string }> = {
  units: { bg: "rgba(26,92,255,.08)", color: "#1A5CFF" },
  order_value: { bg: "rgba(5,150,105,.08)", color: "#059669" },
  free: { bg: "rgba(156,163,175,.12)", color: "#6B7280" },
};

// ─── New bracket row default ──────────────────────────────────────────────────

function emptyBracket(): ShippingBracket {
  return { min_units: 0, max_units: null, min_order_value: null, max_order_value: null, cost: 0 };
}

// ─── Bracket editor ───────────────────────────────────────────────────────────

function BracketEditor({
  brackets,
  calcType,
  onChange,
}: {
  brackets: ShippingBracket[];
  calcType: "units" | "order_value" | "free";
  onChange: (brackets: ShippingBracket[]) => void;
}) {
  if (calcType === "free") {
    return (
      <div style={{ padding: "16px", background: "#F4F3EF", borderRadius: "8px", fontSize: "13px", color: "#7A7880", textAlign: "center" }}>
        No brackets needed — shipping is always free for this tier.
      </div>
    );
  }

  function updateBracket(index: number, field: string, value: string) {
    const updated = brackets.map((b, i) => {
      if (i !== index) return b;
      if (field === "cost") return { ...b, cost: parseFloat(value) || 0 };
      if (field === "max_units" || field === "min_units") {
        return { ...b, [field]: value === "" ? null : parseInt(value) || 0 };
      }
      if (field === "min_order_value" || field === "max_order_value") {
        return { ...b, [field]: value === "" ? null : parseFloat(value) || 0 };
      }
      return b;
    });
    onChange(updated);
  }

  const thStyle: React.CSSProperties = {
    padding: "9px 12px", textAlign: "left", fontSize: "10px",
    textTransform: "uppercase", letterSpacing: ".06em", color: "#7A7880", fontWeight: 700,
  };

  return (
    <div>
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
          <thead>
            <tr style={{ background: "#F4F3EF", borderBottom: "1px solid #E2E0DA" }}>
              {calcType === "units" ? (
                <>
                  <th style={thStyle}>Min Units</th>
                  <th style={thStyle}>Max Units</th>
                </>
              ) : (
                <>
                  <th style={thStyle}>Min Order ($)</th>
                  <th style={thStyle}>Max Order ($)</th>
                </>
              )}
              <th style={thStyle}>Shipping Cost ($)</th>
              <th style={{ ...thStyle, width: "36px" }} />
            </tr>
          </thead>
          <tbody>
            {brackets.map((b, i) => (
              <tr key={i} style={{ borderBottom: "1px solid #F4F3EF" }}>
                {calcType === "units" ? (
                  <>
                    <td style={{ padding: "8px 10px" }}>
                      <input
                        type="number"
                        min={0}
                        value={b.min_units}
                        onChange={e => updateBracket(i, "min_units", e.target.value)}
                        style={{ ...inputStyle, width: "100px" }}
                      />
                    </td>
                    <td style={{ padding: "8px 10px" }}>
                      <input
                        type="number"
                        min={1}
                        value={b.max_units ?? ""}
                        onChange={e => updateBracket(i, "max_units", e.target.value)}
                        placeholder="∞"
                        style={{ ...inputStyle, width: "100px" }}
                      />
                    </td>
                  </>
                ) : (
                  <>
                    <td style={{ padding: "8px 10px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                        <span style={{ color: "#aaa" }}>$</span>
                        <input
                          type="number"
                          min={0}
                          step="0.01"
                          value={b.min_order_value ?? ""}
                          onChange={e => updateBracket(i, "min_order_value", e.target.value)}
                          placeholder="0.00"
                          style={{ ...inputStyle, width: "100px" }}
                        />
                      </div>
                    </td>
                    <td style={{ padding: "8px 10px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                        <span style={{ color: "#aaa" }}>$</span>
                        <input
                          type="number"
                          min={0}
                          step="0.01"
                          value={b.max_order_value ?? ""}
                          onChange={e => updateBracket(i, "max_order_value", e.target.value)}
                          placeholder="∞"
                          style={{ ...inputStyle, width: "100px" }}
                        />
                      </div>
                    </td>
                  </>
                )}
                <td style={{ padding: "8px 10px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                    <span style={{ color: "#aaa" }}>$</span>
                    <input
                      type="number"
                      min={0}
                      step="0.01"
                      value={b.cost}
                      onChange={e => updateBracket(i, "cost", e.target.value)}
                      style={{ ...inputStyle, width: "90px" }}
                    />
                    {b.cost === 0 && (
                      <span style={{ fontSize: "10px", fontWeight: 700, color: "#059669", background: "rgba(5,150,105,.1)", padding: "2px 6px", borderRadius: "4px", whiteSpace: "nowrap" }}>FREE</span>
                    )}
                  </div>
                </td>
                <td style={{ padding: "8px 6px", textAlign: "center" }}>
                  <button
                    onClick={() => onChange(brackets.filter((_, idx) => idx !== i))}
                    style={{ background: "none", border: "none", cursor: "pointer", color: "#E8242A", fontSize: "16px", lineHeight: 1, padding: "0 4px" }}
                  >×</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <button
        onClick={() => onChange([...brackets, emptyBracket()])}
        style={{ marginTop: "10px", padding: "6px 16px", background: "#F4F3EF", border: "1px solid #E2E0DA", borderRadius: "6px", fontSize: "12px", fontWeight: 700, cursor: "pointer", color: "#2A2830" }}
      >
        + Add Bracket
      </button>
    </div>
  );
}

// ─── Tier Card ────────────────────────────────────────────────────────────────

function TierCard({
  tier,
  onSave,
  onDelete,
}: {
  tier: ShippingTier;
  onSave: (id: string, data: object) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}) {
  const [expanded, setExpanded] = useState(false);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<ShippingTier>({ ...tier, brackets: tier.brackets.map(b => ({ ...b })) });

  function reset() {
    setForm({ ...tier, brackets: tier.brackets.map(b => ({ ...b })) });
    setEditing(false);
  }

  async function save() {
    setSaving(true);
    try {
      await onSave(tier.id, {
        name: form.name,
        description: form.description || null,
        calculation_type: form.calculation_type,
        cutoff_time: form.cutoff_time || null,
        is_active: form.is_active,
        brackets: form.brackets.map(b => ({
          min_units: b.min_units ?? 0,
          max_units: b.max_units ?? null,
          min_order_value: b.min_order_value ?? null,
          max_order_value: b.max_order_value ?? null,
          cost: b.cost,
        })),
      });
      setEditing(false);
    } finally {
      setSaving(false);
    }
  }

  const typeStyle = TYPE_COLORS[tier.calculation_type] ?? TYPE_COLORS.units!;

  return (
    <div style={cardStyle}>
      {/* Header */}
      <div
        style={{ padding: "16px 20px", display: "flex", alignItems: "center", gap: "12px", cursor: "pointer", background: expanded ? "#FAFAFA" : "#fff", borderBottom: expanded ? "1px solid #E2E0DA" : "none" }}
        onClick={() => setExpanded(v => !v)}
      >
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
            <span style={{ fontWeight: 700, fontSize: "15px", color: "#2A2830" }}>{tier.name}</span>
            <span style={{ padding: "3px 10px", borderRadius: "20px", fontSize: "11px", fontWeight: 700, background: typeStyle.bg, color: typeStyle.color }}>
              {TYPE_LABELS[tier.calculation_type]}
            </span>
            {tier.cutoff_time && (
              <span style={{ fontSize: "11px", color: "#7A7880", background: "#F4F3EF", padding: "2px 8px", borderRadius: "4px" }}>
                ⏰ Cutoff {tier.cutoff_time}
              </span>
            )}
            {!tier.is_active && (
              <span style={{ fontSize: "11px", fontWeight: 700, color: "#E8242A", background: "rgba(232,36,42,.08)", padding: "2px 8px", borderRadius: "4px" }}>Inactive</span>
            )}
          </div>
          {tier.description && (
            <div style={{ fontSize: "12px", color: "#7A7880", marginTop: "3px" }}>{tier.description}</div>
          )}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "8px", flexShrink: 0 }}>
          <span style={{ fontSize: "12px", color: "#aaa" }}>
            {tier.calculation_type === "free" ? "Free" : `${tier.brackets.length} bracket${tier.brackets.length !== 1 ? "s" : ""}`}
          </span>
          <span style={{ fontSize: "11px", color: "#aaa", transition: "transform .2s", transform: expanded ? "rotate(180deg)" : "rotate(0deg)", display: "inline-block" }}>▼</span>
        </div>
      </div>

      {/* Expanded body */}
      {expanded && (
        <div style={{ padding: "20px" }}>
          {editing ? (
            /* Edit form */
            <div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px", marginBottom: "16px" }}>
                <div>
                  <label style={labelStyle}>Tier Name</label>
                  <input
                    value={form.name}
                    onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                    style={inputStyle}
                  />
                </div>
                <div>
                  <label style={labelStyle}>Calculation Type</label>
                  <select
                    value={form.calculation_type}
                    onChange={e => setForm(f => ({ ...f, calculation_type: e.target.value as ShippingTier["calculation_type"] }))}
                    style={{ ...inputStyle, background: "#fff" }}
                  >
                    <option value="units">Unit-Based (per piece count)</option>
                    <option value="order_value">Order Value (per $ total)</option>
                    <option value="free">Free / Will Call</option>
                  </select>
                </div>
                <div style={{ gridColumn: "1 / -1" }}>
                  <label style={labelStyle}>Description</label>
                  <input
                    value={form.description ?? ""}
                    onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                    placeholder="Brief description of this tier…"
                    style={inputStyle}
                  />
                </div>
                <div>
                  <label style={labelStyle}>Order Cutoff Time</label>
                  <input
                    value={form.cutoff_time ?? ""}
                    onChange={e => setForm(f => ({ ...f, cutoff_time: e.target.value }))}
                    placeholder="e.g. 12PM"
                    style={{ ...inputStyle, width: "120px" }}
                  />
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "8px", paddingTop: "18px" }}>
                  <input
                    id={`active-${tier.id}`}
                    type="checkbox"
                    checked={form.is_active}
                    onChange={e => setForm(f => ({ ...f, is_active: e.target.checked }))}
                    style={{ width: "16px", height: "16px", accentColor: "#1A5CFF" }}
                  />
                  <label htmlFor={`active-${tier.id}`} style={{ fontSize: "13px", fontWeight: 600, cursor: "pointer", color: "#2A2830" }}>Active (available for assignment)</label>
                </div>
              </div>

              <div style={{ marginBottom: "20px" }}>
                <label style={{ ...labelStyle, marginBottom: "10px" }}>Pricing Brackets</label>
                <BracketEditor
                  brackets={form.brackets}
                  calcType={form.calculation_type}
                  onChange={brackets => setForm(f => ({ ...f, brackets }))}
                />
              </div>

              <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end" }}>
                <button
                  onClick={reset}
                  style={{ padding: "9px 18px", border: "1px solid #E2E0DA", borderRadius: "7px", background: "#fff", fontSize: "13px", fontWeight: 600, cursor: "pointer" }}
                >Cancel</button>
                <button
                  onClick={save}
                  disabled={saving || !form.name.trim()}
                  style={{ padding: "9px 22px", background: "#1A5CFF", color: "#fff", border: "none", borderRadius: "7px", fontWeight: 700, cursor: "pointer", fontSize: "13px", opacity: (saving || !form.name.trim()) ? 0.6 : 1 }}
                >
                  {saving ? "Saving…" : "Save Changes"}
                </button>
              </div>
            </div>
          ) : (
            /* Read-only view */
            <div>
              {/* Bracket table preview */}
              {tier.calculation_type !== "free" && tier.brackets.length > 0 && (
                <div style={{ overflowX: "auto", marginBottom: "16px" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
                    <thead>
                      <tr style={{ background: "#F4F3EF", borderBottom: "1px solid #E2E0DA" }}>
                        {tier.calculation_type === "units" ? (
                          <><th style={{ padding: "8px 12px", textAlign: "left", fontSize: "10px", textTransform: "uppercase", letterSpacing: ".06em", color: "#7A7880", fontWeight: 700 }}>Units Range</th></>
                        ) : (
                          <><th style={{ padding: "8px 12px", textAlign: "left", fontSize: "10px", textTransform: "uppercase", letterSpacing: ".06em", color: "#7A7880", fontWeight: 700 }}>Order Value Range</th></>
                        )}
                        <th style={{ padding: "8px 12px", textAlign: "left", fontSize: "10px", textTransform: "uppercase", letterSpacing: ".06em", color: "#7A7880", fontWeight: 700 }}>Shipping Cost</th>
                      </tr>
                    </thead>
                    <tbody>
                      {[...tier.brackets]
                        .sort((a, b) =>
                          tier.calculation_type === "order_value"
                            ? (a.min_order_value ?? 0) - (b.min_order_value ?? 0)
                            : a.min_units - b.min_units
                        )
                        .map((b, i) => (
                          <tr key={i} style={{ borderBottom: "1px solid #F4F3EF" }}>
                            <td style={{ padding: "10px 12px", color: "#2A2830", fontWeight: 600 }}>
                              {tier.calculation_type === "order_value" ? (
                                <>
                                  ${(b.min_order_value ?? 0).toFixed(2)} — {b.max_order_value != null ? `$${Number(b.max_order_value).toFixed(2)}` : "and over"}
                                </>
                              ) : (
                                <>{b.min_units} — {b.max_units != null ? b.max_units : "and over"} units</>
                              )}
                            </td>
                            <td style={{ padding: "10px 12px" }}>
                              {Number(b.cost) === 0 ? (
                                <span style={{ fontWeight: 700, color: "#059669" }}>FREE</span>
                              ) : (
                                <span style={{ fontWeight: 700, color: "#2A2830" }}>${Number(b.cost).toFixed(2)}</span>
                              )}
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              )}

              {tier.calculation_type === "free" && (
                <div style={{ padding: "16px", background: "rgba(5,150,105,.05)", borderRadius: "8px", fontSize: "13px", color: "#059669", fontWeight: 600, marginBottom: "16px" }}>
                  ✓ Always free — no shipping charge for this tier
                </div>
              )}

              <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end" }}>
                <button
                  onClick={async () => {
                    if (!confirm(`Delete tier "${tier.name}"? Companies assigned to this tier will need to be reassigned.`)) return;
                    await onDelete(tier.id);
                  }}
                  style={{ padding: "8px 16px", background: "rgba(232,36,42,.06)", color: "#E8242A", border: "1px solid #FECACA", borderRadius: "7px", fontSize: "12px", fontWeight: 700, cursor: "pointer" }}
                >
                  Delete
                </button>
                <button
                  onClick={() => setEditing(true)}
                  style={{ padding: "8px 18px", background: "#1A5CFF", color: "#fff", border: "none", borderRadius: "7px", fontSize: "13px", fontWeight: 700, cursor: "pointer" }}
                >
                  Edit Tier
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── New Tier Form ────────────────────────────────────────────────────────────

function NewTierForm({ onCreated }: { onCreated: () => void }) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: "",
    description: "",
    calculation_type: "units" as "units" | "order_value" | "free",
    cutoff_time: "",
    brackets: [] as ShippingBracket[],
  });

  async function handleCreate() {
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      await adminService.createShippingTier({
        name: form.name.trim(),
        description: form.description || null,
        calculation_type: form.calculation_type,
        cutoff_time: form.cutoff_time || null,
        brackets: form.brackets.map(b => ({
          min_units: b.min_units ?? 0,
          max_units: b.max_units ?? null,
          min_order_value: b.min_order_value ?? null,
          max_order_value: b.max_order_value ?? null,
          cost: b.cost,
        })),
      });
      setForm({ name: "", description: "", calculation_type: "units", cutoff_time: "", brackets: [] });
      setOpen(false);
      onCreated();
    } finally {
      setSaving(false);
    }
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        style={{ padding: "11px 22px", background: "#1A5CFF", color: "#fff", border: "none", borderRadius: "8px", fontWeight: 700, cursor: "pointer", fontSize: "14px" }}
      >
        + New Tier
      </button>
    );
  }

  return (
    <div style={{ background: "#fff", border: "2px solid #1A5CFF", borderRadius: "10px", padding: "24px", marginBottom: "20px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
        <span style={{ fontFamily: "var(--font-bebas)", fontSize: "18px", letterSpacing: ".06em", color: "#2A2830" }}>NEW SHIPPING TIER</span>
        <button onClick={() => setOpen(false)} style={{ background: "none", border: "none", fontSize: "20px", cursor: "pointer", color: "#aaa" }}>✕</button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px", marginBottom: "16px" }}>
        <div>
          <label style={labelStyle}>Tier Name <span style={{ color: "#E8242A" }}>*</span></label>
          <input
            value={form.name}
            onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
            placeholder="e.g. Tier 1 — Standard Ground"
            style={inputStyle}
          />
        </div>
        <div>
          <label style={labelStyle}>Calculation Type</label>
          <select
            value={form.calculation_type}
            onChange={e => setForm(f => ({ ...f, calculation_type: e.target.value as typeof form.calculation_type, brackets: [] }))}
            style={{ ...inputStyle, background: "#fff" }}
          >
            <option value="units">Unit-Based (per piece count)</option>
            <option value="order_value">Order Value (per $ total)</option>
            <option value="free">Free / Will Call</option>
          </select>
        </div>
        <div style={{ gridColumn: "1 / -1" }}>
          <label style={labelStyle}>Description</label>
          <input
            value={form.description}
            onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
            placeholder="Brief description of this tier…"
            style={inputStyle}
          />
        </div>
        <div>
          <label style={labelStyle}>Order Cutoff Time</label>
          <input
            value={form.cutoff_time}
            onChange={e => setForm(f => ({ ...f, cutoff_time: e.target.value }))}
            placeholder="e.g. 12PM"
            style={{ ...inputStyle, width: "120px" }}
          />
        </div>
      </div>

      <div style={{ marginBottom: "20px" }}>
        <label style={{ ...labelStyle, marginBottom: "10px" }}>Pricing Brackets</label>
        <BracketEditor
          brackets={form.brackets}
          calcType={form.calculation_type}
          onChange={brackets => setForm(f => ({ ...f, brackets }))}
        />
      </div>

      <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end" }}>
        <button
          onClick={() => setOpen(false)}
          style={{ padding: "9px 18px", border: "1px solid #E2E0DA", borderRadius: "7px", background: "#fff", fontSize: "13px", fontWeight: 600, cursor: "pointer" }}
        >Cancel</button>
        <button
          onClick={handleCreate}
          disabled={saving || !form.name.trim()}
          style={{ padding: "9px 22px", background: "#1A5CFF", color: "#fff", border: "none", borderRadius: "7px", fontWeight: 700, cursor: "pointer", fontSize: "13px", opacity: (saving || !form.name.trim()) ? 0.6 : 1 }}
        >
          {saving ? "Creating…" : "Create Tier"}
        </button>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function ShippingTiersPage() {
  const [tiers, setTiers] = useState<ShippingTier[]>([]);
  const [loading, setLoading] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const [seedMsg, setSeedMsg] = useState("");

  async function load() {
    setLoading(true);
    try {
      const data = await adminService.listShippingTiers() as ShippingTier[];
      setTiers(data ?? []);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function handleSave(id: string, data: object) {
    await adminService.updateShippingTier(id, data);
    await load();
  }

  async function handleDelete(id: string) {
    await adminService.deleteShippingTier(id);
    setTiers(prev => prev.filter(t => t.id !== id));
  }

  async function handleSeedDefaults() {
    setSeeding(true);
    setSeedMsg("");
    try {
      const result = await adminService.seedDefaultShippingTiers() as { created: string[]; skipped: number };
      if (result.created.length > 0) {
        setSeedMsg(`Created ${result.created.length} tier(s). ${result.skipped > 0 ? `${result.skipped} already existed.` : ""}`);
      } else {
        setSeedMsg("All default tiers already exist.");
      }
      await load();
    } finally {
      setSeeding(false);
      setTimeout(() => setSeedMsg(""), 5000);
    }
  }

  return (
    <div style={{ fontFamily: "var(--font-jakarta)" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "24px" }}>
        <div>
          <h1 style={{ fontFamily: "var(--font-bebas)", fontSize: "32px", color: "#2A2830", letterSpacing: ".02em", lineHeight: 1 }}>SHIPPING TIERS</h1>
          <p style={{ fontSize: "13px", color: "#7A7880", marginTop: "4px" }}>
            Configure bracket-based shipping rates. Tiers are assigned to companies.
          </p>
        </div>
        <div style={{ display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap", justifyContent: "flex-end" }}>
          {seedMsg && <span style={{ fontSize: "12px", color: "#059669", fontWeight: 600 }}>{seedMsg}</span>}
          <button
            onClick={handleSeedDefaults}
            disabled={seeding}
            style={{ padding: "10px 16px", border: "1px solid #E2E0DA", borderRadius: "8px", background: "#fff", fontSize: "13px", fontWeight: 600, cursor: "pointer", opacity: seeding ? 0.6 : 1 }}
          >
            {seeding ? "Loading…" : "⚡ Load Default Tiers"}
          </button>
          <NewTierForm onCreated={load} />
        </div>
      </div>

      {/* Info banner */}
      <div style={{ background: "rgba(26,92,255,.04)", border: "1px solid rgba(26,92,255,.15)", borderRadius: "8px", padding: "14px 18px", marginBottom: "20px", fontSize: "13px", color: "#2A2830" }}>
        <strong>How shipping tiers work:</strong> Each company is assigned a shipping tier. When an order is placed, the shipping cost is calculated based on the tier's brackets.
        <span style={{ color: "#1A5CFF" }}> Unit-based</span> tiers charge by total piece count.
        <span style={{ color: "#059669" }}> Order value</span> tiers charge by order dollar total (set cost to $0 for free shipping over a threshold).
        <span style={{ color: "#6B7280" }}> Free tiers</span> always charge $0 (e.g. Will Call / Pickup).
      </div>

      {/* Tiers list */}
      {loading && tiers.length === 0 ? (
        <div style={{ padding: "48px", textAlign: "center", color: "#aaa", fontSize: "14px" }}>Loading shipping tiers…</div>
      ) : tiers.length === 0 ? (
        <div style={{ padding: "64px", textAlign: "center", background: "#fff", border: "1px solid #E2E0DA", borderRadius: "10px" }}>
          <div style={{ fontSize: "40px", marginBottom: "12px" }}>🚚</div>
          <div style={{ fontSize: "16px", fontWeight: 700, color: "#2A2830", marginBottom: "6px" }}>No shipping tiers yet</div>
          <div style={{ fontSize: "13px", color: "#7A7880", marginBottom: "20px" }}>
            Click <strong>"Load Default Tiers"</strong> to create 7 pre-configured tiers, or create your own.
          </div>
          <button
            onClick={handleSeedDefaults}
            disabled={seeding}
            style={{ padding: "12px 24px", background: "#1A5CFF", color: "#fff", border: "none", borderRadius: "8px", fontWeight: 700, cursor: "pointer", fontSize: "14px" }}
          >
            {seeding ? "Loading…" : "⚡ Load Default Tiers"}
          </button>
        </div>
      ) : (
        <>
          {tiers.map(tier => (
            <TierCard key={tier.id} tier={tier} onSave={handleSave} onDelete={handleDelete} />
          ))}
        </>
      )}
    </div>
  );
}
