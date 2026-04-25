// frontend/src/app/(customer)/checkout/address/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiClient } from "@/lib/api-client";
import { useCheckoutStore, type ShippingMethod } from "@/stores/checkout.store";
import { useAuthStore } from "@/stores/auth.store";
import { cartService } from "@/services/cart.service";
import { formatCurrency } from "@/lib/utils";

const US_STATES = [
  "AL", "AK", "AZ", "AR", "CA", "CO", "CT", "DE", "FL", "GA", "HI", "ID", "IL", "IN", "IA",
  "KS", "KY", "LA", "ME", "MD", "MA", "MI", "MN", "MS", "MO", "MT", "NE", "NV", "NH", "NJ",
  "NM", "NY", "NC", "ND", "OH", "OK", "OR", "PA", "RI", "SC", "SD", "TN", "TX", "UT", "VT",
  "VA", "WA", "WV", "WI", "WY",
];

interface SavedAddress {
  id: string;
  label: string | null;
  full_name: string | null;
  line1: string;
  line2: string | null;
  city: string;
  state: string;
  postal_code: string;
  country: string;
  phone: string | null;
  is_default: boolean;
}

const inp: React.CSSProperties = {
  width: "100%", padding: "10px 12px", border: "1.5px solid #E2E0DA",
  borderRadius: "7px", fontSize: "13px", fontFamily: "var(--font-jakarta)",
  outline: "none", boxSizing: "border-box", color: "#2A2830", background: "#fff",
};
const lbl: React.CSSProperties = {
  display: "block", fontSize: "11px", fontWeight: 700, color: "#7A7880",
  textTransform: "uppercase", letterSpacing: ".06em", marginBottom: "5px",
};
const sectionCard: React.CSSProperties = {
  background: "#fff", border: "1.5px solid #E2E0DA", borderRadius: "12px", padding: "22px 24px", marginBottom: "16px",
};
const sectionTitle: React.CSSProperties = {
  fontFamily: "var(--font-bebas)", fontSize: "17px", letterSpacing: ".06em",
  color: "#2A2830", marginBottom: "18px", display: "block",
};

const EXPEDITED_SURCHARGE = 45;

export default function CheckoutAddressPage() {
  const router = useRouter();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated());
  const authIsLoading = useAuthStore((s) => s.isLoading);
  const isGuest = !authIsLoading && !isAuthenticated;

  const {
    companyName, setCompanyName,
    contactName, setContactName,
    shippingPhone, setShippingPhone,
    shippingAddress, setShippingAddress,
    setAddressId,
    shippingMethod, setShippingMethod,
    setShippingCost,
  } = useCheckoutStore();

  const [savedAddresses, setSavedAddresses] = useState<SavedAddress[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null);
  const [showNewForm, setShowNewForm] = useState(false);
  const [subtotal, setSubtotal] = useState(0);
  const [tierShipping, setTierShipping] = useState<number | null>(null);

  const [form, setForm] = useState({
    company: companyName || "",
    contact: contactName || "",
    street: shippingAddress?.line1 || "",
    city: shippingAddress?.city || "",
    state: shippingAddress?.state || "",
    zip: shippingAddress?.postal_code || "",
    phone: shippingPhone || "",
    // Guest-specific fields
    email: "",
  });
  const [errors, setErrors] = useState<Partial<typeof form>>({});
  const [couponDiscount, setCouponDiscount] = useState(0);

  // Load saved addresses + cart (subtotal + tier-based shipping)
  useEffect(() => {
    if (authIsLoading) return;
    const saved = localStorage.getItem("af_coupon");
    if (saved) {
      try { setCouponDiscount(JSON.parse(saved).discount_amount ?? 0); } catch { }
    }

    if (isGuest) {
      // Calculate subtotal from guest cart localStorage
      try {
        const guestCart = JSON.parse(localStorage.getItem("af_guest_cart") || "[]") as Array<{ unit_price: number; quantity: number }>;
        const guestSubtotal = guestCart.reduce((s, i) => s + i.unit_price * i.quantity, 0);
        setSubtotal(guestSubtotal);
      } catch { /* ignore */ }
      setTierShipping(9.99); // flat guest shipping
      setShowNewForm(true);

      // Restore from sessionStorage if returning to this step
      try {
        const stored = sessionStorage.getItem("af_guest_checkout");
        if (stored) {
          const data = JSON.parse(stored);
          setForm(prev => ({
            ...prev,
            contact: data.name || prev.contact,
            email: data.email || prev.email,
            phone: data.phone || prev.phone,
            street: data.line1 || prev.street,
            city: data.city || prev.city,
            state: data.state || prev.state,
            zip: data.postal_code || prev.zip,
          }));
        }
      } catch { /* ignore */ }
    } else {
      cartService.getCart().then(c => {
        setSubtotal(Number(c.subtotal));
        const hasTier = (c.validation as (typeof c.validation & { has_shipping_tier?: boolean }))?.has_shipping_tier ?? false;
        setTierShipping(hasTier ? Number(c.validation?.estimated_shipping ?? 0) : null);
      }).catch(() => {
        setTierShipping(null);
      });
      apiClient.get<SavedAddress[]>("/api/v1/account/addresses").then(addrs => {
        setSavedAddresses(addrs);
        if (addrs.length > 0) {
          const def = addrs.find(a => a.is_default) ?? addrs[0]!;
          setSelectedAddressId(def.id);
          setShowNewForm(false);
        } else {
          setShowNewForm(true);
        }
      }).catch(() => {
        setShowNewForm(true);
      });
    }
  }, [authIsLoading, isGuest]);

  // Compute the shipping cost for a given method
  function methodCost(method: ShippingMethod): number {
    const base = tierShipping ?? 0;
    if (method === "will_call") return 0;
    if (method === "expedited") return base + EXPEDITED_SURCHARGE;
    return base; // standard
  }

  const selectedCost = methodCost(shippingMethod);
  const orderTotal = subtotal + selectedCost - couponDiscount;

  function validate() {
    const e: Partial<typeof form> = {};
    if (isGuest) {
      if (!form.contact.trim()) e.contact = "Required";
      if (!form.email.trim()) e.email = "Required";
      else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = "Invalid email";
    } else {
      if (!form.company.trim()) e.company = "Required";
      if (!form.contact.trim()) e.contact = "Required";
    }
    if (!form.street.trim()) e.street = "Required";
    if (!form.city.trim()) e.city = "Required";
    if (!form.state.trim()) e.state = "Required";
    if (!form.zip.trim()) e.zip = "Required";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function handleContinue() {
    setShippingCost(methodCost(shippingMethod));

    if (isGuest) {
      if (!validate()) return;
      // Persist guest info to sessionStorage for review page
      const guestData = {
        name: form.contact,
        email: form.email,
        phone: form.phone,
        line1: form.street,
        city: form.city,
        state: form.state,
        postal_code: form.zip,
        country: "US",
      };
      sessionStorage.setItem("af_guest_checkout", JSON.stringify(guestData));
      setContactName(form.contact);
      setShippingPhone(form.phone);
      setShippingAddress({ line1: form.street, city: form.city, state: form.state, postal_code: form.zip, country: "US" });
      setAddressId(null);
      router.push("/checkout/payment");
      return;
    }

    if (!showNewForm && selectedAddressId) {
      const addr = savedAddresses.find(a => a.id === selectedAddressId);
      if (!addr) return;
      setCompanyName(form.company || companyName);
      setContactName(addr.full_name || contactName);
      setShippingPhone(addr.phone || "");
      setShippingAddress({
        line1: addr.line1,
        line2: addr.line2 || undefined,
        city: addr.city,
        state: addr.state,
        postal_code: addr.postal_code,
        country: addr.country || "US",
      });
      setAddressId(selectedAddressId);
      router.push("/checkout/payment");
    } else {
      if (!validate()) return;
      setCompanyName(form.company);
      setContactName(form.contact);
      setShippingPhone(form.phone);
      setShippingAddress({
        line1: form.street,
        city: form.city,
        state: form.state,
        postal_code: form.zip,
        country: "US",
      });
      setAddressId(null);
      router.push("/checkout/payment");
    }
  }

  // Build shipping option display
  function shippingOptionLabel(method: ShippingMethod): { price: string; note?: string } {
    if (method === "will_call") {
      return { price: "FREE", note: "Pick up from our warehouse — no shipping charge." };
    }
    // No tier assigned yet
    if (tierShipping === null) {
      if (method === "expedited") {
        return { price: `+ $${EXPEDITED_SURCHARGE} surcharge`, note: "Tier-based base rate + $45 expedited surcharge." };
      }
      return { price: "Calculated", note: "Contact us to have a shipping tier assigned to your account." };
    }
    if (method === "expedited") {
      const cost = tierShipping + EXPEDITED_SURCHARGE;
      return {
        price: formatCurrency(cost),
        note: `Your tier rate ${formatCurrency(tierShipping)} + $${EXPEDITED_SURCHARGE} expedited surcharge.`,
      };
    }
    // standard
    if (tierShipping === 0) {
      return { price: "FREE", note: "Free shipping on your account's tier." };
    }
    return { price: formatCurrency(tierShipping), note: "Rate based on your assigned shipping tier." };
  }

  const SHIPPING_OPTIONS: { id: ShippingMethod; label: string; sub: string }[] = [
    { id: "standard", label: "Standard Ground", sub: "3–5 business days · Ships from Dallas, TX" },
    { id: "expedited", label: "Expedited (2-Day)", sub: "2 business days — guaranteed delivery" },
    { id: "will_call", label: "Will Call Pickup", sub: "Pick up from our warehouse · No shipping fee" },
  ];

  return (
    <div>
      {/* ── Shipping Address ── */}
      <div style={sectionCard}>
        <span style={sectionTitle}>Shipping Address</span>

        {savedAddresses.length > 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginBottom: "10px" }}>
            {savedAddresses.map(addr => {
              const isSelected = selectedAddressId === addr.id && !showNewForm;
              return (
                <label
                  key={addr.id}
                  onClick={() => { setSelectedAddressId(addr.id); setShowNewForm(false); }}
                  style={{
                    display: "flex", alignItems: "flex-start", gap: "14px",
                    padding: "14px 18px", borderRadius: "10px",
                    border: `1.5px solid ${isSelected ? "#E8242A" : "#E2E0DA"}`,
                    background: isSelected ? "rgba(232,36,42,.03)" : "#FAFAF8",
                    cursor: "pointer", transition: "all .15s",
                  }}
                >
                  <div style={{
                    width: "18px", height: "18px", borderRadius: "50%", flexShrink: 0, marginTop: "2px",
                    border: `2px solid ${isSelected ? "#E8242A" : "#E2E0DA"}`,
                    background: isSelected ? "#E8242A" : "#fff",
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }}>
                    {isSelected && <div style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#fff" }} />}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "2px" }}>
                      <span style={{ fontSize: "13px", fontWeight: 700, color: "#2A2830" }}>
                        {addr.label || "Address"}
                      </span>
                      {addr.is_default && (
                        <span style={{ fontSize: "10px", fontWeight: 700, padding: "1px 6px", borderRadius: "3px", background: "rgba(232,36,42,.1)", color: "#E8242A" }}>
                          Default
                        </span>
                      )}
                    </div>
                    {addr.full_name && <div style={{ fontSize: "12px", color: "#7A7880" }}>{addr.full_name}</div>}
                    <div style={{ fontSize: "12px", color: "#7A7880" }}>
                      {addr.line1}{addr.line2 ? `, ${addr.line2}` : ""}, {addr.city}, {addr.state} {addr.postal_code}
                    </div>
                    {addr.phone && <div style={{ fontSize: "11px", color: "#aaa", marginTop: "2px" }}>{addr.phone}</div>}
                  </div>
                </label>
              );
            })}

            <label
              onClick={() => { setShowNewForm(true); setSelectedAddressId(null); }}
              style={{
                display: "flex", alignItems: "center", gap: "14px",
                padding: "12px 18px", borderRadius: "10px",
                border: `1.5px solid ${showNewForm ? "#E8242A" : "#E2E0DA"}`,
                background: showNewForm ? "rgba(232,36,42,.03)" : "#FAFAF8",
                cursor: "pointer", fontSize: "13px", fontWeight: 600, color: "#2A2830",
                transition: "all .15s",
              }}
            >
              <div style={{
                width: "18px", height: "18px", borderRadius: "50%", flexShrink: 0,
                border: `2px solid ${showNewForm ? "#E8242A" : "#E2E0DA"}`,
                background: showNewForm ? "#E8242A" : "#fff",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                {showNewForm && <div style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#fff" }} />}
              </div>
              + Use a different address
            </label>
          </div>
        )}

        {/* Company name — wholesale only */}
        {!isGuest && (
          <div style={{ marginBottom: "14px" }}>
            <label style={lbl}>Company Name <span style={{ color: "#E8242A" }}>*</span></label>
            <input
              style={{ ...inp, borderColor: errors.company ? "#E8242A" : "#E2E0DA" }}
              value={form.company}
              onChange={e => setForm(p => ({ ...p, company: e.target.value }))}
              placeholder="AF Apparels Inc."
            />
            {errors.company && <p style={{ fontSize: "11px", color: "#E8242A", marginTop: "3px" }}>{errors.company}</p>}
          </div>
        )}

        {showNewForm && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" }}>
            <div style={{ gridColumn: "1 / -1" }}>
              <label style={lbl}>{isGuest ? "Full Name" : "Contact Name"} <span style={{ color: "#E8242A" }}>*</span></label>
              <input
                style={{ ...inp, borderColor: errors.contact ? "#E8242A" : "#E2E0DA" }}
                value={form.contact}
                onChange={e => setForm(p => ({ ...p, contact: e.target.value }))}
                placeholder={isGuest ? "Jane Smith" : "John Smith"}
              />
              {errors.contact && <p style={{ fontSize: "11px", color: "#E8242A", marginTop: "3px" }}>{errors.contact}</p>}
            </div>

            {/* Guest email field */}
            {isGuest && (
              <div style={{ gridColumn: "1 / -1" }}>
                <label style={lbl}>Email Address <span style={{ color: "#E8242A" }}>*</span></label>
                <input
                  type="email"
                  style={{ ...inp, borderColor: errors.email ? "#E8242A" : "#E2E0DA" }}
                  value={form.email}
                  onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
                  placeholder="you@example.com"
                />
                {errors.email && <p style={{ fontSize: "11px", color: "#E8242A", marginTop: "3px" }}>{errors.email}</p>}
                <p style={{ fontSize: "11px", color: "#7A7880", marginTop: "3px" }}>Order confirmation will be sent to this email.</p>
              </div>
            )}

            <div style={{ gridColumn: "1 / -1" }}>
              <label style={lbl}>Street Address <span style={{ color: "#E8242A" }}>*</span></label>
              <input
                style={{ ...inp, borderColor: errors.street ? "#E8242A" : "#E2E0DA" }}
                value={form.street}
                onChange={e => setForm(p => ({ ...p, street: e.target.value }))}
                placeholder="123 Commerce Blvd, Suite 400"
              />
              {errors.street && <p style={{ fontSize: "11px", color: "#E8242A", marginTop: "3px" }}>{errors.street}</p>}
            </div>

            <div>
              <label style={lbl}>City <span style={{ color: "#E8242A" }}>*</span></label>
              <input
                style={{ ...inp, borderColor: errors.city ? "#E8242A" : "#E2E0DA" }}
                value={form.city}
                onChange={e => setForm(p => ({ ...p, city: e.target.value }))}
                placeholder="Dallas"
              />
              {errors.city && <p style={{ fontSize: "11px", color: "#E8242A", marginTop: "3px" }}>{errors.city}</p>}
            </div>

            <div>
              <label style={lbl}>State <span style={{ color: "#E8242A" }}>*</span></label>
              <select
                style={{ ...inp, cursor: "pointer", borderColor: errors.state ? "#E8242A" : "#E2E0DA" }}
                value={form.state}
                onChange={e => setForm(p => ({ ...p, state: e.target.value }))}
              >
                <option value="">Select state</option>
                {US_STATES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
              {errors.state && <p style={{ fontSize: "11px", color: "#E8242A", marginTop: "3px" }}>{errors.state}</p>}
            </div>

            <div>
              <label style={lbl}>ZIP Code <span style={{ color: "#E8242A" }}>*</span></label>
              <input
                style={{ ...inp, borderColor: errors.zip ? "#E8242A" : "#E2E0DA" }}
                value={form.zip}
                onChange={e => setForm(p => ({ ...p, zip: e.target.value }))}
                placeholder="75001"
                maxLength={10}
              />
              {errors.zip && <p style={{ fontSize: "11px", color: "#E8242A", marginTop: "3px" }}>{errors.zip}</p>}
            </div>

            <div>
              <label style={lbl}>Phone <span style={{ fontSize: "10px", color: "#aaa", textTransform: "none", letterSpacing: 0 }}>(for shipping updates)</span></label>
              <input
                style={inp}
                type="tel"
                value={form.phone}
                onChange={e => setForm(p => ({ ...p, phone: e.target.value }))}
                placeholder="(214) 555-0100"
              />
            </div>
          </div>
        )}
      </div>

      {/* ── Shipping Method ── */}
      <div style={sectionCard}>
        <span style={sectionTitle}>Shipping Method</span>

        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          {SHIPPING_OPTIONS.map(opt => {
            const isSelected = shippingMethod === opt.id;
            const { price: priceDisplay, note } = shippingOptionLabel(opt.id);
            const isFree = priceDisplay === "FREE";

            return (
              <label
                key={opt.id}
                onClick={() => setShippingMethod(opt.id)}
                style={{
                  display: "flex", alignItems: "flex-start", gap: "14px",
                  padding: "16px 18px", borderRadius: "10px",
                  border: `1.5px solid ${isSelected ? "#E8242A" : "#E2E0DA"}`,
                  background: isSelected ? "rgba(232,36,42,.03)" : "#FAFAF8",
                  cursor: "pointer", transition: "border-color .15s, background .15s",
                }}
              >
                <div style={{
                  width: "18px", height: "18px", borderRadius: "50%", flexShrink: 0, marginTop: "1px",
                  border: `2px solid ${isSelected ? "#E8242A" : "#E2E0DA"}`,
                  background: isSelected ? "#E8242A" : "#fff",
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                  {isSelected && <div style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#fff" }} />}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px" }}>
                    <span style={{ fontSize: "14px", fontWeight: 700, color: "#2A2830" }}>{opt.label}</span>
                    <span style={{ fontSize: "14px", fontWeight: 800, color: isFree ? "#059669" : "#2A2830" }}>
                      {priceDisplay}
                    </span>
                  </div>
                  <div style={{ fontSize: "12px", color: "#7A7880", marginTop: "3px" }}>{opt.sub}</div>
                  {note && (
                    <div style={{ fontSize: "11px", color: isFree ? "#059669" : "#7A7880", marginTop: "4px", fontWeight: isFree ? 600 : 400 }}>
                      {note}
                    </div>
                  )}
                </div>
              </label>
            );
          })}
        </div>
      </div>

      {/* ── Order Summary ── */}
      <div style={{ background: "#fff", border: "1.5px solid #E2E0DA", borderRadius: "12px", padding: "18px 24px", marginBottom: "16px" }}>
        <div style={{ fontFamily: "var(--font-bebas)", fontSize: "15px", letterSpacing: ".06em", color: "#2A2830", marginBottom: "12px" }}>
          Order Summary
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13px", color: "#7A7880" }}>
            <span>Subtotal</span>
            <span style={{ fontWeight: 600, color: "#2A2830" }}>{formatCurrency(subtotal)}</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13px", color: "#7A7880" }}>
            <span>Shipping ({SHIPPING_OPTIONS.find(o => o.id === shippingMethod)?.label})</span>
            <span style={{ fontWeight: 600, color: (shippingMethod === "will_call" || (tierShipping !== null && selectedCost === 0)) ? "#059669" : "#2A2830" }}>
              {shippingMethod === "will_call"
                ? "FREE"
                : tierShipping === null
                  ? <span style={{ color: "#7A7880", fontWeight: 400 }}>Calculated at checkout</span>
                  : selectedCost === 0
                    ? "FREE"
                    : formatCurrency(selectedCost)}
            </span>
          </div>
          {couponDiscount > 0 && (
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13px", color: "#059669" }}>
              <span style={{ fontWeight: 600 }}>Coupon Applied</span>
              <span style={{ fontWeight: 700 }}>-{formatCurrency(couponDiscount)}</span>
            </div>
          )}
          <div style={{ borderTop: "1px solid #F0EEE9", paddingTop: "8px", display: "flex", justifyContent: "space-between" }}>
            <span style={{ fontSize: "14px", fontWeight: 800, color: "#2A2830" }}>Total</span>
            <span style={{ fontFamily: "var(--font-bebas)", fontSize: "20px", color: "#E8242A", letterSpacing: ".02em" }}>
              {(tierShipping !== null || shippingMethod === "will_call") ? formatCurrency(orderTotal) : `${formatCurrency(subtotal)}+`}
            </span>
          </div>
        </div>
      </div>

      {/* Continue button */}
      <button
        onClick={handleContinue}
        style={{
          width: "100%", padding: "15px", background: "#E8242A", color: "#fff",
          border: "none", borderRadius: "8px", fontFamily: "var(--font-bebas)",
          fontSize: "17px", letterSpacing: ".08em", cursor: "pointer",
          transition: "background .2s",
        }}
        onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = "#c91e23"; }}
        onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = "#E8242A"; }}
      >
        Continue to Payment
      </button>
    </div>
  );
}
