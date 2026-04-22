"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { adminService } from "@/services/admin.service";
import { apiClient } from "@/lib/api-client";
import { TruckIcon, PackageIcon, CheckIcon } from "@/components/ui/icons";

interface OrderItem {
  id: string;
  sku: string;
  product_name: string;
  color: string | null;
  size: string | null;
  quantity: number;
  unit_price: string;
  line_total: string;
}

interface ShippingAddress {
  full_name?: string;
  address_line1?: string;
  address_line2?: string;
  city?: string;
  state?: string;
  zip_code?: string;
  postal_code?: string;
  country?: string;
}

interface AdminOrder {
  id: string;
  order_number: string;
  company_name: string;
  company_id: string;
  status: string;
  payment_status: string;
  po_number: string | null;
  order_notes: string | null;
  tracking_number: string | null;
  courier: string | null;
  courier_service: string | null;
  shipped_at: string | null;
  qb_invoice_id: string | null;
  subtotal: string;
  shipping_cost: string;
  tax_amount?: string;
  total: string;
  items: OrderItem[];
  created_at: string;
  updated_at: string;
  shipping_address?: ShippingAddress;
  // Customer fields (may not be present)
  customer_name?: string;
  customer_email?: string;
  customer_phone?: string;
  pricing_tier?: string;
  payment_method?: string;
}

interface CustomerStats {
  total_orders: number;
  total_spent: number;
  created_at: string;
}

interface CompanyRegistration {
  company_email: string | null;
  address_line1: string | null;
  address_line2: string | null;
  city: string | null;
  state_province: string | null;
  postal_code: string | null;
  country: string | null;
  how_heard: string | null;
  num_employees: string | null;
  num_sales_reps: string | null;
  secondary_business: string | null;
  estimated_annual_volume: string | null;
  ppac_number: string | null;
  ppai_number: string | null;
  asi_number: string | null;
  fax: string | null;
}

const STATUSES = ["pending", "confirmed", "processing", "shipped", "delivered", "cancelled"];

const COURIERS = [
  { id: "fedex", name: "FedEx",  icon: "FX",  services: ["Ground", "2-Day", "Overnight", "Express Saver"] },
  { id: "ups",   name: "UPS",    icon: "UPS", services: ["Ground", "2-Day Air", "Next Day Air", "3-Day Select"] },
  { id: "usps",  name: "USPS",   icon: "US",  services: ["Priority Mail", "Priority Express", "First Class", "Parcel Select"] },
  { id: "dhl",   name: "DHL",    icon: "DHL", services: ["Express", "Economy Select", "Expedited"] },
  { id: "other", name: "Other",  icon: "→",   services: ["Standard", "Express"] },
];

const STATUS_STYLE: Record<string, { bg: string; color: string }> = {
  pending:    { bg: "rgba(217,119,6,.1)",   color: "#D97706" },
  confirmed:  { bg: "rgba(26,92,255,.1)",   color: "#1A5CFF" },
  processing: { bg: "rgba(99,102,241,.1)",  color: "#6366F1" },
  shipped:    { bg: "rgba(139,92,246,.1)",  color: "#8B5CF6" },
  delivered:  { bg: "rgba(5,150,105,.1)",   color: "#059669" },
  cancelled:  { bg: "rgba(232,36,42,.1)",   color: "#E8242A" },
  authorized: { bg: "rgba(245,158,11,.1)",  color: "#D97706" },
  paid:       { bg: "rgba(5,150,105,.1)",   color: "#059669" },
  unpaid:     { bg: "rgba(107,114,128,.1)", color: "#6B7280" },
};

function StatusBadge({ status }: { status: string }) {
  const s = STATUS_STYLE[status] ?? { bg: "rgba(0,0,0,.06)", color: "#555" };
  return (
    <span style={{ background: s.bg, color: s.color, padding: "4px 12px", borderRadius: "20px", fontSize: "12px", fontWeight: 700, textTransform: "capitalize" as const }}>
      {status}
    </span>
  );
}

function generateTrackingNumber(courier: string): string {
  const prefix: Record<string, string> = { fedex: "7489", ups: "1Z", usps: "9400", dhl: "JD", other: "TRK" };
  const p = prefix[courier] ?? "TRK";
  const random = Math.random().toString(36).substring(2, 12).toUpperCase();
  const ts = Date.now().toString().slice(-6);
  return `${p}${ts}${random}`;
}

const LabelStyle: React.CSSProperties = {
  fontSize: "11px", fontWeight: 700,
  textTransform: "uppercase", letterSpacing: ".08em",
  color: "#7A7880", marginBottom: "6px", display: "block",
};

const CardStyle: React.CSSProperties = {
  background: "#fff", border: "1px solid #E2E0DA",
  borderRadius: "10px", padding: "20px", marginBottom: "16px",
};

const SectionHead: React.CSSProperties = {
  fontFamily: "var(--font-bebas)", fontSize: "16px",
  letterSpacing: ".06em", color: "#2A2830",
};

export default function AdminOrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [order, setOrder] = useState<AdminOrder | null>(null);
  const [customerStats, setCustomerStats] = useState<CustomerStats | null>(null);
  const [companyReg, setCompanyReg] = useState<CompanyRegistration | null>(null);
  const [status, setStatus] = useState("");
  const [tracking, setTracking] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isCapturing, setIsCapturing] = useState(false);
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);

  // Courier state
  const [selectedCourier, setSelectedCourier] = useState("");
  const [selectedService, setSelectedService] = useState("");
  const [trackingNumber, setTrackingNumber] = useState("");
  const [isShipping, setIsShipping] = useState(false);

  // Notes state
  const [editingNote, setEditingNote] = useState(false);
  const [noteText, setNoteText] = useState("");

  // Order items edit mode
  const [editingItems, setEditingItems] = useState(false);

  // Add item state
  const [itemSearch, setItemSearch] = useState("");
  const [itemResults, setItemResults] = useState<{ variant_id: string; sku: string; product_name: string; color: string | null; size: string | null; price: number }[]>([]);
  const [addingItem, setAddingItem] = useState(false);
  const [selectedVariant, setSelectedVariant] = useState<{ variant_id: string; sku: string; product_name: string; color: string | null; size: string | null; price: number } | null>(null);
  const [addQty, setAddQty] = useState(1);
  const [addItemMsg, setAddItemMsg] = useState<{ text: string; ok: boolean } | null>(null);
  const searchDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    adminService.getOrder(id).then(async (d) => {
      const o = d as AdminOrder;
      setOrder(o);
      setStatus(o.status);
      setTracking(o.tracking_number ?? "");
      setNoteText(o.order_notes ?? "");
      if (o.courier) setSelectedCourier(o.courier);
      if (o.courier_service) setSelectedService(o.courier_service);
      if (o.tracking_number) setTrackingNumber(o.tracking_number);

      // Fetch customer stats and company registration info (best-effort)
      try {
        const stats = await apiClient.get<CustomerStats>(`/api/v1/admin/customers/${o.company_id}/stats`);
        if (stats) setCustomerStats(stats);
      } catch { /* stats are optional */ }
      try {
        const co = await apiClient.get<CompanyRegistration>(`/api/v1/admin/customers/${o.company_id}`);
        if (co) setCompanyReg(co);
      } catch { /* company info optional */ }
    });
  }, [id]);

  function handleCourierSelect(courierId: string) {
    setSelectedCourier(courierId);
    setSelectedService("");
    setTrackingNumber(generateTrackingNumber(courierId));
  }

  async function handleUpdate(e: React.FormEvent) {
    e.preventDefault();
    setIsSaving(true); setMsg(null);
    try {
      await adminService.updateOrder(id, { status });
      setMsg({ text: "Order updated successfully.", ok: true });
      setOrder(prev => prev ? { ...prev, status, tracking_number: tracking || null } : prev);
    } catch {
      setMsg({ text: "Failed to update order.", ok: false });
    } finally { setIsSaving(false); }
  }

  async function handleSyncQB() {
    setIsSyncing(true); setMsg(null);
    try {
      await adminService.syncOrderToQb(id);
      setMsg({ text: "QuickBooks sync queued.", ok: true });
    } catch {
      setMsg({ text: "QB sync failed.", ok: false });
    } finally { setIsSyncing(false); }
  }

  async function handleMarkShipped() {
    if (!selectedCourier || !selectedService) return;
    setIsShipping(true); setMsg(null);
    try {
      await apiClient.patch(`/api/v1/admin/orders/${id}/status`, {
        status: "shipped",
        tracking_number: trackingNumber || undefined,
        courier: selectedCourier,
        courier_service: selectedService,
      });
      const courierLabel = COURIERS.find(c => c.id === selectedCourier)?.name ?? selectedCourier;
      setMsg({ text: `Order marked as shipped via ${courierLabel} ${selectedService}.`, ok: true });
      setOrder(prev => prev ? {
        ...prev, status: "shipped",
        tracking_number: trackingNumber || null,
        courier: selectedCourier, courier_service: selectedService,
        shipped_at: new Date().toISOString(),
      } : prev);
      setStatus("shipped");
      setTracking(trackingNumber);
    } catch {
      setMsg({ text: "Failed to mark as shipped.", ok: false });
    } finally { setIsShipping(false); }
  }

  async function handleCapturePayment() {
    setIsCapturing(true); setMsg(null);
    try {
      await apiClient.post(`/api/v1/admin/orders/${id}/capture`, {});
      setMsg({ text: "Payment captured successfully.", ok: true });
      setOrder(prev => prev ? { ...prev, payment_status: "paid" } : prev);
    } catch {
      setMsg({ text: "Failed to capture payment.", ok: false });
    } finally { setIsCapturing(false); }
  }

  async function handleSaveNote() {
    try {
      await apiClient.patch(`/api/v1/admin/orders/${id}`, { notes: noteText });
      setEditingNote(false);
      setOrder(prev => prev ? { ...prev, order_notes: noteText } : prev);
      setMsg({ text: "Note saved.", ok: true });
    } catch {
      setMsg({ text: "Failed to save note.", ok: false });
    }
  }

  function handleItemSearchChange(val: string) {
    setItemSearch(val);
    setSelectedVariant(null);
    if (searchDebounce.current) clearTimeout(searchDebounce.current);
    if (!val.trim()) { setItemResults([]); return; }
    searchDebounce.current = setTimeout(async () => {
      try {
        const data = await apiClient.get<{ items: { id: string; name: string; variants: { id: string; sku: string; color: string | null; size: string | null; retail_price: number }[] }[] }>(
          `/api/v1/admin/products?q=${encodeURIComponent(val)}&page_size=20`
        );
        const results: typeof itemResults = [];
        for (const p of data.items ?? []) {
          for (const v of p.variants ?? []) {
            results.push({ variant_id: v.id, sku: v.sku, product_name: p.name, color: v.color, size: v.size, price: Number(v.retail_price || 0) });
          }
        }
        setItemResults(results.slice(0, 30));
      } catch { /* ignore */ }
    }, 350);
  }

  async function handleAddItem() {
    if (!selectedVariant || addQty < 1) return;
    setAddingItem(true); setAddItemMsg(null);
    try {
      const result = await apiClient.post<{ subtotal: number; total: number }>(
        `/api/v1/admin/orders/${id}/items`,
        { variant_id: selectedVariant.variant_id, quantity: addQty, unit_price: selectedVariant.price }
      );
      setOrder(prev => prev ? {
        ...prev,
        subtotal: String(result.subtotal),
        total: String(result.total),
        items: [...prev.items, {
          id: crypto.randomUUID(),
          sku: selectedVariant.sku,
          product_name: selectedVariant.product_name,
          color: selectedVariant.color,
          size: selectedVariant.size,
          quantity: addQty,
          unit_price: String(selectedVariant.price),
          line_total: String(selectedVariant.price * addQty),
        }],
      } : prev);
      setAddItemMsg({ text: `Added ${addQty}x ${selectedVariant.product_name}`, ok: true });
      setSelectedVariant(null); setItemSearch(""); setItemResults([]); setAddQty(1);
    } catch (err: unknown) {
      setAddItemMsg({ text: err instanceof Error ? err.message : "Failed to add item", ok: false });
    } finally {
      setAddingItem(false);
    }
  }

  async function handleRemoveItem(itemId: string, lineTotal: string) {
    try {
      await apiClient.delete(`/api/v1/admin/orders/${id}/items/${itemId}`);
      setOrder(prev => prev ? {
        ...prev,
        items: prev.items.filter(i => i.id !== itemId),
        subtotal: String(Math.max(0, Number(prev.subtotal) - Number(lineTotal))),
        total: String(Math.max(0, Number(prev.total) - Number(lineTotal))),
      } : prev);
    } catch {
      setMsg({ text: "Failed to remove item.", ok: false });
    }
  }

  if (!order) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "320px" }}>
        <div style={{ fontSize: "13px", color: "#aaa" }}>Loading order…</div>
      </div>
    );
  }

  const courierObj = COURIERS.find(c => c.id === selectedCourier);
  const courierDisplayName = COURIERS.find(c => c.id === order.courier)?.name ?? order.courier;
  const addr = order.shipping_address;
  const zip = addr?.zip_code ?? addr?.postal_code ?? "";

  const timelineEvents = [
    order.shipped_at ? {
      icon: <PackageIcon size={10} color="#fff" />,
      text: `Shipped via ${courierDisplayName ?? "courier"}${order.courier_service ? ` ${order.courier_service}` : ""}`,
      sub: order.tracking_number ? `Tracking: ${order.tracking_number}` : "",
      time: order.shipped_at, color: "#059669",
    } : null,
    {
      icon: <CheckIcon size={10} color="#fff" />,
      text: "Order placed",
      sub: `${order.company_name} · ${order.payment_status}`,
      time: order.created_at, color: "#1A5CFF",
    },
  ].filter(Boolean) as { icon: React.ReactNode; text: string; sub: string; time: string; color: string }[];

  const avatarInitial = order.customer_name?.[0]?.toUpperCase() ?? order.company_name?.[0]?.toUpperCase() ?? "C";
  const mapQuery = [addr?.address_line1, addr?.city, addr?.state].filter(Boolean).join(", ");

  return (
    <div style={{ fontFamily: "var(--font-jakarta)", maxWidth: "1200px" }}>
      {/* Back */}
      <button onClick={() => router.back()} style={{ background: "none", border: "none", color: "#1A5CFF", cursor: "pointer", fontSize: "13px", fontWeight: 700, padding: 0, marginBottom: "20px", display: "flex", alignItems: "center", gap: "6px" }}>
        ← Back to Orders
      </button>

      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "24px", flexWrap: "wrap", gap: "12px" }}>
        <div>
          <h1 style={{ fontFamily: "var(--font-bebas)", fontSize: "28px", color: "#2A2830", letterSpacing: ".04em", lineHeight: 1 }}>
            {order.order_number}
          </h1>
          <p style={{ fontSize: "13px", color: "#7A7880", marginTop: "6px", display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" as const }}>
            <span>{order.company_name}</span>
            <span>·</span>
            <span>{new Date(order.created_at).toLocaleDateString()}</span>
            <span>·</span>
            <StatusBadge status={order.status} />
            <StatusBadge status={order.payment_status} />
          </p>
        </div>
        {/* QB Sync intentionally hidden */}
      </div>

      {/* Feedback */}
      {msg && (
        <div style={{ marginBottom: "16px", padding: "12px 16px", borderRadius: "8px", fontSize: "13px", fontWeight: 600, background: msg.ok ? "rgba(5,150,105,.1)" : "rgba(232,36,42,.1)", color: msg.ok ? "#059669" : "#E8242A", border: `1px solid ${msg.ok ? "rgba(5,150,105,.2)" : "rgba(232,36,42,.2)"}` }}>
          {msg.text}
        </div>
      )}

      {/* Payment Capture Alert */}
      {order.payment_status === "authorized" && (
        <div style={{ background: "#fff8f0", border: "1.5px solid #fed7aa", borderRadius: "10px", padding: "20px 24px", marginBottom: "16px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "16px", flexWrap: "wrap" as const }}>
            <div>
              <h4 style={{ fontWeight: 700, color: "#c2410c", marginBottom: "4px", fontSize: "15px" }}>⏰ Payment Authorized</h4>
              <p style={{ fontSize: "13px", color: "#7A7880" }}>Capture payment before authorization expires</p>
            </div>
            <button onClick={handleCapturePayment} disabled={isCapturing}
              style={{ background: "#059669", color: "#fff", border: "none", padding: "10px 20px", borderRadius: "6px", fontWeight: 700, cursor: "pointer", fontSize: "14px", opacity: isCapturing ? .6 : 1, whiteSpace: "nowrap" as const }}>
              {isCapturing ? "Capturing…" : `Capture $${Number(order.total).toFixed(2)}`}
            </button>
          </div>
        </div>
      )}

      {/* ── 2-COLUMN LAYOUT ── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 360px", gap: "20px", alignItems: "flex-start" }}>

        {/* ── LEFT: Main content ── */}
        <div>
          {/* SHIPPING & COURIER */}
          <div style={{ ...CardStyle, padding: "24px" }}>
            <h3 style={{ ...SectionHead, fontSize: "18px", letterSpacing: ".05em", marginBottom: "14px" }}>SHIPPING & COURIER</h3>

            {order.status === "shipped" && order.courier && (
              <div style={{ fontSize: "12px", color: "#059669", fontWeight: 600, marginBottom: "14px", padding: "8px 12px", background: "rgba(5,150,105,.08)", borderRadius: "6px" }}>
                ✓ Shipped via {courierDisplayName} {order.courier_service}
                {order.tracking_number && ` · Tracking: ${order.tracking_number}`}
                {order.shipped_at && ` · ${new Date(order.shipped_at).toLocaleDateString()}`}
              </div>
            )}

            <div style={{ display: "grid", gridTemplateColumns: "repeat(5,1fr)", gap: "8px", marginBottom: "16px" }}>
              {COURIERS.map(courier => (
                <div key={courier.id} onClick={() => handleCourierSelect(courier.id)}
                  style={{ border: selectedCourier === courier.id ? "2px solid #1A5CFF" : "1.5px solid #E2E0DA", borderRadius: "8px", padding: "12px 8px", textAlign: "center" as const, cursor: "pointer", background: selectedCourier === courier.id ? "rgba(26,92,255,.05)" : "#fff", transition: "all .15s" }}>
                  <div style={{ fontSize: "13px", fontWeight: 800, color: selectedCourier === courier.id ? "#1A5CFF" : "#7A7880", marginBottom: "4px", letterSpacing: ".04em" }}>{courier.icon}</div>
                  <div style={{ fontSize: "12px", fontWeight: 700, color: selectedCourier === courier.id ? "#1A5CFF" : "#2A2830" }}>{courier.name}</div>
                </div>
              ))}
            </div>

            {selectedCourier && (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "16px" }}>
                <div>
                  <label style={LabelStyle}>Service Type</label>
                  <select value={selectedService} onChange={e => setSelectedService(e.target.value)}
                    style={{ width: "100%", padding: "10px 14px", border: "1.5px solid #E2E0DA", borderRadius: "6px", fontSize: "14px", fontFamily: "var(--font-jakarta)", background: "#fff" }}>
                    <option value="">Select service…</option>
                    {courierObj?.services.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label style={LabelStyle}>Tracking Number</label>
                  <div style={{ display: "flex", gap: "8px" }}>
                    <input value={trackingNumber} onChange={e => setTrackingNumber(e.target.value)}
                      placeholder="Auto-generated or enter…"
                      style={{ flex: 1, padding: "10px 14px", border: "1.5px solid #E2E0DA", borderRadius: "6px", fontSize: "13px", fontFamily: "var(--font-jakarta)", boxSizing: "border-box" as const }} />
                    <button type="button" onClick={() => setTrackingNumber(generateTrackingNumber(selectedCourier))}
                      title="Regenerate"
                      style={{ padding: "10px 12px", border: "1.5px solid #E2E0DA", borderRadius: "6px", background: "#fff", cursor: "pointer", fontSize: "14px" }}>
                      🔄
                    </button>
                  </div>
                </div>
              </div>
            )}

            {selectedCourier && selectedService && (
              <button onClick={handleMarkShipped} disabled={isShipping}
                style={{ background: "#059669", color: "#fff", border: "none", padding: "12px 24px", borderRadius: "6px", fontSize: "14px", fontWeight: 700, cursor: "pointer", opacity: isShipping ? .6 : 1 }}>
                {isShipping ? "Marking shipped…" : `✓ Mark as Shipped via ${courierObj?.name} ${selectedService}`}
              </button>
            )}
          </div>

          {/* STATUS UPDATE */}
          <div style={{ ...CardStyle, padding: "24px" }}>
            <h3 style={{ ...SectionHead, fontSize: "18px", letterSpacing: ".05em", marginBottom: "16px" }}>UPDATE ORDER</h3>
            <form onSubmit={handleUpdate} style={{ display: "flex", gap: "12px", alignItems: "flex-end", flexWrap: "wrap" as const }}>
              <div>
                <label style={LabelStyle}>Status</label>
                <select value={status} onChange={e => setStatus(e.target.value)}
                  style={{ padding: "10px 14px", border: "1.5px solid #E2E0DA", borderRadius: "6px", fontSize: "14px", fontFamily: "var(--font-jakarta)", background: "#fff" }}>
                  {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              {/* Tracking is managed via Shipping & Courier section above */}
              <button type="submit" disabled={isSaving}
                style={{ background: "#1A5CFF", color: "#fff", border: "none", padding: "11px 24px", borderRadius: "6px", fontSize: "14px", fontWeight: 700, cursor: "pointer", opacity: isSaving ? .6 : 1 }}>
                {isSaving ? "Saving…" : "Update Order"}
              </button>
            </form>
          </div>

          {/* ORDER ITEMS */}
          <div style={{ ...CardStyle, padding: "24px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
              <h3 style={{ ...SectionHead, fontSize: "18px", letterSpacing: ".05em" }}>ORDER ITEMS</h3>
              {["pending", "confirmed", "processing"].includes(order.status) && (
                editingItems ? (
                  <button
                    onClick={() => setEditingItems(false)}
                    style={{ display: "flex", alignItems: "center", gap: "5px", background: "none", border: "1.5px solid #E2E0DA", borderRadius: "6px", padding: "6px 12px", fontSize: "12px", fontWeight: 700, cursor: "pointer", color: "#7A7880" }}>
                    ✕ Done Editing
                  </button>
                ) : (
                  <button
                    onClick={() => setEditingItems(true)}
                    style={{ display: "flex", alignItems: "center", gap: "5px", background: "#F4F3EF", border: "1px solid #E2E0DA", borderRadius: "6px", padding: "6px 12px", fontSize: "12px", fontWeight: 700, cursor: "pointer", color: "#2A2830" }}>
                    ✎ Edit
                  </button>
                )
              )}
            </div>

            {/* Add Items — only in edit mode */}
            {editingItems && (
              <div style={{ background: "#F4F3EF", borderRadius: "8px", padding: "16px", marginBottom: "20px" }}>
                <div style={{ fontSize: "11px", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".08em", color: "#7A7880", marginBottom: "10px" }}>Add Product</div>
                <div style={{ display: "flex", gap: "8px", marginBottom: "8px" }}>
                  <div style={{ flex: 1, position: "relative" }}>
                    <input
                      value={itemSearch}
                      onChange={e => handleItemSearchChange(e.target.value)}
                      placeholder="Search product by name or SKU…"
                      style={{ width: "100%", padding: "9px 12px", border: "1.5px solid #E2E0DA", borderRadius: "6px", fontSize: "13px", fontFamily: "var(--font-jakarta)", outline: "none", boxSizing: "border-box" as const, background: "#fff" }}
                    />
                    {itemResults.length > 0 && !selectedVariant && (
                      <div style={{ position: "absolute", top: "100%", left: 0, right: 0, background: "#fff", border: "1.5px solid #E2E0DA", borderRadius: "6px", boxShadow: "0 8px 24px rgba(0,0,0,.12)", zIndex: 50, maxHeight: "200px", overflowY: "auto" as const }}>
                        {itemResults.map(v => (
                          <div
                            key={v.variant_id}
                            onClick={() => { setSelectedVariant(v); setItemSearch(`${v.product_name} — ${[v.color, v.size].filter(Boolean).join(" / ")}`); setItemResults([]); }}
                            style={{ padding: "9px 12px", fontSize: "13px", cursor: "pointer", borderBottom: "1px solid #F4F3EF" }}
                            onMouseEnter={e => (e.currentTarget.style.background = "#F4F3EF")}
                            onMouseLeave={e => (e.currentTarget.style.background = "#fff")}
                          >
                            <span style={{ fontWeight: 600, color: "#2A2830" }}>{v.product_name}</span>
                            <span style={{ color: "#7A7880", marginLeft: "8px" }}>
                              {[v.color, v.size].filter(Boolean).join(" / ")}
                            </span>
                            <span style={{ color: "#1A5CFF", marginLeft: "8px", fontFamily: "monospace", fontSize: "11px" }}>{v.sku}</span>
                            <span style={{ color: "#059669", marginLeft: "8px", fontWeight: 700 }}>${v.price.toFixed(2)}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <input
                    type="number"
                    min={1}
                    value={addQty}
                    onChange={e => setAddQty(Math.max(1, Number(e.target.value)))}
                    placeholder="Qty"
                    style={{ width: "72px", padding: "9px 8px", border: "1.5px solid #E2E0DA", borderRadius: "6px", fontSize: "13px", textAlign: "center" as const, background: "#fff" }}
                  />
                  <button
                    onClick={handleAddItem}
                    disabled={!selectedVariant || addingItem}
                    style={{ background: selectedVariant && !addingItem ? "#059669" : "#E2E0DA", color: selectedVariant && !addingItem ? "#fff" : "#aaa", border: "none", padding: "9px 18px", borderRadius: "6px", fontSize: "13px", fontWeight: 700, cursor: selectedVariant && !addingItem ? "pointer" : "not-allowed", whiteSpace: "nowrap" as const }}>
                    {addingItem ? "Adding…" : "+ Add"}
                  </button>
                </div>
                {selectedVariant && (
                  <div style={{ fontSize: "12px", color: "#059669", fontWeight: 600 }}>
                    Selected: {selectedVariant.product_name} — {[selectedVariant.color, selectedVariant.size].filter(Boolean).join(" / ")} @ ${selectedVariant.price.toFixed(2)}/unit
                    <button onClick={() => { setSelectedVariant(null); setItemSearch(""); }} style={{ marginLeft: "8px", fontSize: "11px", color: "#E8242A", background: "none", border: "none", cursor: "pointer" }}>✕</button>
                  </div>
                )}
                {addItemMsg && (
                  <div style={{ marginTop: "8px", fontSize: "12px", fontWeight: 600, color: addItemMsg.ok ? "#059669" : "#E8242A" }}>{addItemMsg.text}</div>
                )}
              </div>
            )}
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ borderBottom: "2px solid #E2E0DA" }}>
                  {["Product", "SKU", "Color / Size", "Qty", "Unit Price", "Total", ""].map(h => (
                    <th key={h} style={{ textAlign: (h === "Qty" || h === "Unit Price" || h === "Total") ? "right" as const : "left" as const, padding: "10px 12px", fontSize: "11px", fontWeight: 700, textTransform: "uppercase" as const, letterSpacing: ".06em", color: "#7A7880" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {order.items.map((item, i) => (
                  <tr key={item.id} style={{ borderBottom: i < order.items.length - 1 ? "1px solid #F4F3EF" : "none" }}>
                    <td style={{ padding: "14px 12px", fontWeight: 700, fontSize: "14px", color: "#2A2830" }}>{item.product_name}</td>
                    <td style={{ padding: "14px 12px", fontSize: "12px", color: "#7A7880", fontFamily: "monospace" }}>{item.sku}</td>
                    <td style={{ padding: "14px 12px" }}>
                      {item.color && <span style={{ fontSize: "13px", color: "#2A2830", marginRight: "6px" }}>{item.color}</span>}
                      {item.size && <span style={{ background: "#F4F3EF", padding: "2px 8px", borderRadius: "4px", fontSize: "11px", fontWeight: 700, color: "#2A2830" }}>{item.size}</span>}
                      {!item.color && !item.size && <span style={{ color: "#aaa" }}>—</span>}
                    </td>
                    <td style={{ padding: "14px 12px", textAlign: "right" as const, fontWeight: 700, color: "#2A2830" }}>{item.quantity}</td>
                    <td style={{ padding: "14px 12px", textAlign: "right" as const, color: "#7A7880" }}>${Number(item.unit_price).toFixed(2)}</td>
                    <td style={{ padding: "14px 12px", textAlign: "right" as const, fontWeight: 700, fontFamily: "var(--font-bebas)", fontSize: "16px", color: "#2A2830" }}>${Number(item.line_total).toFixed(2)}</td>
                    <td style={{ padding: "14px 12px", textAlign: "right" as const }}>
                      {editingItems && (
                        <button
                          onClick={() => handleRemoveItem(item.id, item.line_total)}
                          style={{ background: "none", border: "none", cursor: "pointer", color: "#E8242A", fontSize: "14px", fontWeight: 700, padding: "2px 6px" }}
                          title="Remove item">
                          ✕
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {/* Totals */}
            <div style={{ borderTop: "2px solid #E2E0DA", marginTop: "16px", paddingTop: "16px", display: "flex", justifyContent: "flex-end" }}>
              <div style={{ minWidth: "260px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px", fontSize: "14px", color: "#7A7880" }}>
                  <span>Subtotal</span><span>${Number(order.subtotal).toFixed(2)}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px", fontSize: "14px", color: "#7A7880" }}>
                  <span>Shipping</span><span>${Number(order.shipping_cost).toFixed(2)}</span>
                </div>
                {order.tax_amount && Number(order.tax_amount) > 0 && (
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px", fontSize: "14px", color: "#7A7880" }}>
                    <span>Tax</span><span>${Number(order.tax_amount).toFixed(2)}</span>
                  </div>
                )}
                <div style={{ display: "flex", justifyContent: "space-between", fontFamily: "var(--font-bebas)", fontSize: "20px", color: "#2A2830", borderTop: "1px solid #E2E0DA", paddingTop: "10px", marginTop: "4px" }}>
                  <span>Total</span><span>${Number(order.total).toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* TIMELINE */}
          <div style={{ ...CardStyle, padding: "24px", marginBottom: 0 }}>
            <h3 style={{ ...SectionHead, fontSize: "18px", letterSpacing: ".05em", marginBottom: "20px" }}>TIMELINE</h3>
            <div style={{ position: "relative", paddingLeft: "28px" }}>
              <div style={{ position: "absolute", left: "8px", top: "8px", bottom: "8px", width: "2px", background: "#E2E0DA" }} />
              {timelineEvents.map((event, i) => (
                <div key={i} style={{ display: "flex", gap: "16px", marginBottom: "20px", position: "relative", alignItems: "flex-start" }}>
                  <div style={{ width: "20px", height: "20px", borderRadius: "50%", background: event.color, border: "2px solid #fff", boxShadow: `0 0 0 2px ${event.color}`, flexShrink: 0, zIndex: 1, display: "flex", alignItems: "center", justifyContent: "center", marginLeft: "-14px", marginTop: "2px" }}>
                    {event.icon}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: "14px", color: "#2A2830" }}>{event.text}</div>
                    {event.sub && <div style={{ fontSize: "12px", color: "#7A7880", marginTop: "2px" }}>{event.sub}</div>}
                    <div style={{ fontSize: "11px", color: "#bbb", marginTop: "4px" }}>{new Date(event.time).toLocaleString()}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── RIGHT SIDEBAR ── */}
        <div>
          {/* ── SECTION 1: NOTES ── */}
          <div style={CardStyle}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
              <h3 style={SectionHead}>NOTES</h3>
              <button onClick={() => { setEditingNote(true); setNoteText(order.order_notes ?? ""); }}
                style={{ background: "none", border: "none", cursor: "pointer", fontSize: "16px", lineHeight: 1 }}>✏️</button>
            </div>

            {editingNote ? (
              <div>
                <textarea value={noteText} onChange={e => setNoteText(e.target.value)}
                  placeholder="Add note about this order…"
                  style={{ width: "100%", padding: "10px 12px", border: "1.5px solid #1A5CFF", borderRadius: "6px", fontSize: "13px", fontFamily: "var(--font-jakarta)", minHeight: "80px", resize: "vertical" as const, outline: "none", boxSizing: "border-box" as const }} />
                <div style={{ display: "flex", gap: "8px", marginTop: "8px" }}>
                  <button onClick={handleSaveNote}
                    style={{ background: "#1A5CFF", color: "#fff", border: "none", padding: "8px 16px", borderRadius: "6px", fontSize: "13px", fontWeight: 700, cursor: "pointer" }}>
                    Save
                  </button>
                  <button onClick={() => setEditingNote(false)}
                    style={{ background: "none", border: "1px solid #E2E0DA", padding: "8px 16px", borderRadius: "6px", fontSize: "13px", cursor: "pointer", color: "#555" }}>
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <p style={{ fontSize: "13px", color: order.order_notes ? "#2A2830" : "#bbb", fontStyle: order.order_notes ? "normal" : "italic" as const, lineHeight: 1.65 }}>
                {order.order_notes || "No notes added yet"}
              </p>
            )}

            {(order.po_number || order.qb_invoice_id) && (
              <div style={{ marginTop: "14px", paddingTop: "14px", borderTop: "1px solid #F4F3EF" }}>
                <div style={{ fontSize: "11px", fontWeight: 700, textTransform: "uppercase" as const, letterSpacing: ".08em", color: "#aaa", marginBottom: "8px" }}>Additional Details</div>
                {order.po_number && (
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13px", marginBottom: "5px" }}>
                    <span style={{ color: "#7A7880" }}>PO Number</span>
                    <span style={{ fontWeight: 600, color: "#2A2830" }}>{order.po_number}</span>
                  </div>
                )}
                {order.qb_invoice_id && (
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13px" }}>
                    <span style={{ color: "#7A7880" }}>QB Invoice</span>
                    <span style={{ fontWeight: 600, color: "#059669" }}>#{order.qb_invoice_id}</span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* ── SECTION 2: CUSTOMER ── */}
          <div style={CardStyle}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
              <h3 style={SectionHead}>CUSTOMER</h3>
              <span onClick={() => router.push(`/admin/customers/${order.company_id}`)}
                style={{ fontSize: "12px", color: "#1A5CFF", fontWeight: 700, cursor: "pointer" }}>
                View Profile →
              </span>
            </div>

            {/* Avatar + company */}
            <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "14px" }}>
              <div style={{ width: "40px", height: "40px", borderRadius: "50%", background: "#1A5CFF", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 700, fontSize: "16px", flexShrink: 0 }}>
                {avatarInitial}
              </div>
              <div>
                <div style={{ fontWeight: 700, fontSize: "14px", color: "#2A2830" }}>{order.customer_name ?? order.company_name}</div>
                {order.customer_name && <div style={{ fontSize: "12px", color: "#7A7880" }}>{order.company_name}</div>}
              </div>
            </div>

            {/* Contact */}
            {(order.customer_email || order.customer_phone) && (
              <div style={{ fontSize: "13px", marginBottom: "14px" }}>
                {order.customer_email && <div style={{ color: "#1A5CFF", marginBottom: "4px" }}>📧 {order.customer_email}</div>}
                {order.customer_phone && <div style={{ color: "#7A7880" }}>📞 {order.customer_phone}</div>}
              </div>
            )}

            {/* All orders link */}
            <div style={{ background: "#F4F3EF", borderRadius: "6px", padding: "10px 14px", marginBottom: "14px", fontSize: "13px" }}>
              <span style={{ color: "#7A7880" }}>Orders from this company: </span>
              <span onClick={() => router.push(`/admin/orders?company=${order.company_id}`)}
                style={{ fontWeight: 700, color: "#1A5CFF", cursor: "pointer" }}>
                View all →
              </span>
            </div>

            {/* Shipping Address */}
            {addr && (
              <div style={{ borderTop: "1px solid #F4F3EF", paddingTop: "14px", marginBottom: "14px" }}>
                <div style={{ fontSize: "11px", fontWeight: 700, textTransform: "uppercase" as const, letterSpacing: ".08em", color: "#aaa", marginBottom: "8px" }}>Shipping Address</div>
                <div style={{ fontSize: "13px", color: "#2A2830", lineHeight: 1.7 }}>
                  {addr.full_name && <div style={{ fontWeight: 600 }}>{addr.full_name}</div>}
                  {addr.address_line1 && <div>{addr.address_line1}</div>}
                  {addr.address_line2 && <div>{addr.address_line2}</div>}
                  {(addr.city || addr.state) && <div>{[addr.city, addr.state, zip].filter(Boolean).join(", ")}</div>}
                  <div>{addr.country ?? "United States"}</div>
                </div>
                {mapQuery && (
                  <a href={`https://maps.google.com/?q=${encodeURIComponent(mapQuery)}`}
                    target="_blank" rel="noopener noreferrer"
                    style={{ fontSize: "12px", color: "#1A5CFF", fontWeight: 700, textDecoration: "none", display: "inline-block", marginTop: "6px" }}>
                    View map →
                  </a>
                )}
              </div>
            )}

            <div style={{ borderTop: "1px solid #F4F3EF", paddingTop: "14px" }}>
              <div style={{ fontSize: "11px", fontWeight: 700, textTransform: "uppercase" as const, letterSpacing: ".08em", color: "#aaa", marginBottom: "8px" }}>Billing Address</div>
              <div style={{ fontSize: "13px", color: "#7A7880" }}>Same as shipping address</div>
            </div>

            {/* Company Registration Info */}
            {companyReg && (companyReg.company_email || companyReg.address_line1 || companyReg.city || companyReg.secondary_business || companyReg.ppac_number || companyReg.how_heard) && (
              <div style={{ borderTop: "1px solid #F4F3EF", paddingTop: "14px", marginTop: "4px" }}>
                <div style={{ fontSize: "11px", fontWeight: 700, textTransform: "uppercase" as const, letterSpacing: ".08em", color: "#aaa", marginBottom: "10px" }}>Company Registration Info</div>
                <div style={{ display: "flex", flexDirection: "column" as const, gap: "6px", fontSize: "13px" }}>
                  {companyReg.company_email && (
                    <div><span style={{ color: "#7A7880", fontSize: "11px" }}>Company Email: </span><span style={{ color: "#2A2830", fontWeight: 600 }}>{companyReg.company_email}</span></div>
                  )}
                  {(companyReg.address_line1 || companyReg.city) && (
                    <div>
                      <span style={{ color: "#7A7880", fontSize: "11px" }}>Address: </span>
                      <span style={{ color: "#2A2830" }}>
                        {[companyReg.address_line1, companyReg.address_line2, companyReg.city, companyReg.state_province, companyReg.postal_code, companyReg.country].filter(Boolean).join(", ")}
                      </span>
                    </div>
                  )}
                  {companyReg.secondary_business && (
                    <div><span style={{ color: "#7A7880", fontSize: "11px" }}>Secondary Business: </span><span style={{ color: "#2A2830" }}>{companyReg.secondary_business}</span></div>
                  )}
                  {companyReg.estimated_annual_volume && (
                    <div><span style={{ color: "#7A7880", fontSize: "11px" }}>Est. Annual Volume: </span><span style={{ color: "#2A2830" }}>{companyReg.estimated_annual_volume}</span></div>
                  )}
                  {(companyReg.ppac_number || companyReg.ppai_number || companyReg.asi_number) && (
                    <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" as const }}>
                      {companyReg.ppac_number && <span><span style={{ color: "#7A7880", fontSize: "11px" }}>PPAC: </span><span style={{ color: "#2A2830" }}>{companyReg.ppac_number}</span></span>}
                      {companyReg.ppai_number && <span><span style={{ color: "#7A7880", fontSize: "11px" }}>PPAI: </span><span style={{ color: "#2A2830" }}>{companyReg.ppai_number}</span></span>}
                      {companyReg.asi_number && <span><span style={{ color: "#7A7880", fontSize: "11px" }}>ASI: </span><span style={{ color: "#2A2830" }}>{companyReg.asi_number}</span></span>}
                    </div>
                  )}
                  {(companyReg.num_employees || companyReg.num_sales_reps) && (
                    <div style={{ display: "flex", gap: "16px" }}>
                      {companyReg.num_employees && <span><span style={{ color: "#7A7880", fontSize: "11px" }}>Employees: </span><span style={{ color: "#2A2830" }}>{companyReg.num_employees}</span></span>}
                      {companyReg.num_sales_reps && <span><span style={{ color: "#7A7880", fontSize: "11px" }}>Sales Reps: </span><span style={{ color: "#2A2830" }}>{companyReg.num_sales_reps}</span></span>}
                    </div>
                  )}
                  {companyReg.how_heard && (
                    <div><span style={{ color: "#7A7880", fontSize: "11px" }}>How heard: </span><span style={{ color: "#2A2830" }}>{companyReg.how_heard}</span></div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* ── SECTION 3: CONVERSION SUMMARY ── */}
          <div style={{ ...CardStyle, marginBottom: 0 }}>
            <h3 style={{ ...SectionHead, marginBottom: "14px" }}>CONVERSION SUMMARY</h3>

            {/* Key metrics */}
            <div style={{ display: "flex", flexDirection: "column" as const, gap: "10px", marginBottom: "16px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px", padding: "10px 12px", background: "#F4F3EF", borderRadius: "8px" }}>
                <span style={{ fontSize: "18px" }}>🛒</span>
                <div>
                  <div style={{ fontSize: "13px", fontWeight: 700, color: "#2A2830" }}>
                    {customerStats?.total_orders ?? 1} total orders
                  </div>
                  <div style={{ fontSize: "11px", color: "#7A7880" }}>from this customer</div>
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "10px", padding: "10px 12px", background: "#F4F3EF", borderRadius: "8px" }}>
                <span style={{ fontSize: "18px" }}>💰</span>
                <div>
                  <div style={{ fontSize: "13px", fontWeight: 700, color: "#2A2830" }}>
                    ${customerStats ? Number(customerStats.total_spent).toFixed(2) : Number(order.total).toFixed(2)} lifetime value
                  </div>
                  <div style={{ fontSize: "11px", color: "#7A7880" }}>total revenue from customer</div>
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "10px", padding: "10px 12px", background: "#F4F3EF", borderRadius: "8px" }}>
                <span style={{ fontSize: "18px" }}>📅</span>
                <div>
                  <div style={{ fontSize: "13px", fontWeight: 700, color: "#2A2830" }}>
                    {customerStats?.created_at
                      ? new Date(customerStats.created_at).toLocaleDateString("en-US", { month: "short", year: "numeric" })
                      : "New Customer"}
                  </div>
                  <div style={{ fontSize: "11px", color: "#7A7880" }}>customer since</div>
                </div>
              </div>
            </div>

            {/* Order source */}
            <div style={{ borderTop: "1px solid #F4F3EF", paddingTop: "14px", marginBottom: "14px" }}>
              <div style={{ fontSize: "11px", fontWeight: 700, textTransform: "uppercase" as const, letterSpacing: ".08em", color: "#aaa", marginBottom: "10px" }}>Order Source</div>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "13px", color: "#2A2830", marginBottom: "6px" }}>
                <span>🌐</span><span>Online Store — Direct</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "13px", color: "#2A2830" }}>
                <span>📱</span><span>Device: Desktop</span>
              </div>
            </div>

            {/* Pricing tier */}
            {order.pricing_tier && (
              <div style={{ borderTop: "1px solid #F4F3EF", paddingTop: "14px", marginBottom: "14px" }}>
                <div style={{ fontSize: "11px", fontWeight: 700, textTransform: "uppercase" as const, letterSpacing: ".08em", color: "#aaa", marginBottom: "8px" }}>Pricing Tier</div>
                <span style={{ background: "rgba(26,92,255,.1)", color: "#1A5CFF", padding: "4px 12px", borderRadius: "20px", fontSize: "12px", fontWeight: 700 }}>
                  {order.pricing_tier}
                </span>
              </div>
            )}

            {/* Payment */}
            <div style={{ borderTop: "1px solid #F4F3EF", paddingTop: "14px" }}>
              <div style={{ fontSize: "11px", fontWeight: 700, textTransform: "uppercase" as const, letterSpacing: ".08em", color: "#aaa", marginBottom: "8px" }}>Payment</div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13px", marginBottom: "5px" }}>
                <span style={{ color: "#7A7880" }}>Method</span>
                <span style={{ fontWeight: 600, color: "#2A2830" }}>{order.payment_method ?? "Card"}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13px", marginBottom: "5px" }}>
                <span style={{ color: "#7A7880" }}>Status</span>
                <span style={{ background: order.payment_status === "paid" ? "rgba(5,150,105,.1)" : "rgba(217,119,6,.1)", color: order.payment_status === "paid" ? "#059669" : "#D97706", padding: "2px 8px", borderRadius: "10px", fontSize: "11px", fontWeight: 700 }}>
                  {order.payment_status.toUpperCase()}
                </span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13px" }}>
                <span style={{ color: "#7A7880" }}>QB Invoice</span>
                <span style={{ fontWeight: 600, color: order.qb_invoice_id ? "#059669" : "#aaa" }}>
                  {order.qb_invoice_id ? `#${order.qb_invoice_id}` : "Not synced"}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
