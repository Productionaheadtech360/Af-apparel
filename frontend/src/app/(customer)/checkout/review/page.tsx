"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useCheckoutStore } from "@/stores/checkout.store";
import { useCartStore } from "@/stores/cart.store";
import { cartService } from "@/services/cart.service";
import { ordersService } from "@/services/orders.service";
import { apiClient } from "@/lib/api-client";
import { formatCurrency } from "@/lib/utils";
import type { Cart } from "@/types/order.types";

interface SavedCard {
  id: string;
  brand: string;
  last4: string;
  exp_month: string;
  exp_year: string;
  is_default: boolean;
}

function brandDisplayName(brand: string): string {
  const b = brand.toLowerCase();
  if (b === "visa") return "Visa";
  if (b === "mastercard") return "Mastercard";
  if (b === "amex" || b === "american express") return "Amex";
  if (b === "discover") return "Discover";
  return brand.charAt(0).toUpperCase() + brand.slice(1);
}

const SHIPPING_LABELS: Record<string, string> = {
  standard: "Standard Ground",
  expedited: "Expedited (2-Day)",
  will_call: "Will Call Pickup",
};

const row: React.CSSProperties = {
  display: "flex", justifyContent: "space-between", gap: "12px", fontSize: "13px",
};

export default function CheckoutReviewPage() {
  const router = useRouter();
  const {
    shippingAddress, companyName, contactName, shippingPhone, shippingMethod,
    shippingCost,
    addressId, poNumber, orderNotes, setPoNumber, setOrderNotes,
    savedCardId, qbToken,
    setConfirmedOrder,
  } = useCheckoutStore();
  const clearCart = useCartStore((s) => s.clearCart);

  const [cart, setCart] = useState<Cart | null>(null);
  const [savedCards, setSavedCards] = useState<SavedCard[]>([]);
  const [isPlacing, setIsPlacing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Guard: must have shipping + payment
  useEffect(() => {
    if (!shippingAddress) {
      router.replace("/checkout/address");
    } else if (!savedCardId && !qbToken) {
      router.replace("/checkout/payment");
    }
  }, [shippingAddress, savedCardId, qbToken, router]);

  useEffect(() => {
    cartService.getCart().then(setCart).catch(() => {});
  }, []);

  useEffect(() => {
    apiClient.get<SavedCard[]>("/api/v1/account/payment-methods").then(setSavedCards).catch(() => {});
  }, []);

  function buildColorSummary(c: Cart): string {
    const colorMap = new Map<string, number>();
    for (const item of c.items) {
      const col = item.color ?? "Default";
      colorMap.set(col, (colorMap.get(col) ?? 0) + item.quantity);
    }
    return Array.from(colorMap.entries())
      .map(([color, units]) => `${color} x ${units} units`)
      .join(", ");
  }

  async function handlePlaceOrder() {
    if (!shippingAddress) return;
    setIsPlacing(true);
    setError(null);

    const fullAddress = {
      label: companyName || "Shipping",
      full_name: contactName || undefined,
      line1: shippingAddress.line1,
      line2: shippingAddress.line2,
      city: shippingAddress.city,
      state: shippingAddress.state,
      postal_code: shippingAddress.postal_code,
      country: shippingAddress.country || "US",
      phone: shippingPhone || undefined,
    };

    try {
      const order = await ordersService.confirmOrder({
        qb_token: qbToken ?? undefined,
        saved_card_id: savedCardId ?? undefined,
        address_id: addressId ?? undefined,
        shipping_address: fullAddress,
        shipping_method: shippingMethod || "standard",
        po_number: poNumber || undefined,
        order_notes: orderNotes || undefined,
      });

      const productName = cart?.items[0]?.product_name ?? "Your Order";
      const colorSummary = cart ? buildColorSummary(cart) : "";
      const subtotal = Number(cart?.subtotal ?? 0);
      const total = subtotal + shippingCost;

      const confirmedData = {
        id: order.id,
        number: order.order_number,
        total,
        units: cart?.total_units ?? 0,
        colorSummary,
        productName,
        shippingMethod,
      };
      setConfirmedOrder(confirmedData);
      // Persist to sessionStorage so the confirmed page survives any navigation type
      sessionStorage.setItem("af_confirmed_order", JSON.stringify(confirmedData));

      clearCart();
      router.push("/checkout/confirmed");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to place order. Please try again.");
      setIsPlacing(false);
    }
  }

  const selectedCard = savedCards.find(c => c.id === savedCardId);
  const paymentLabel = selectedCard
    ? `${brandDisplayName(selectedCard.brand)} \u2022\u2022\u2022\u2022 ${selectedCard.last4}`
    : qbToken
    ? "New Card (tokenized)"
    : "Credit Card";

  const subtotal = Number(cart?.subtotal ?? 0);
  const shipping = shippingCost;
  const total = subtotal + shipping;
  const shippingLabel = SHIPPING_LABELS[shippingMethod] ?? "Standard Ground";

  const sectionCard: React.CSSProperties = {
    background: "#fff", border: "1.5px solid #E2E0DA", borderRadius: "12px",
    padding: "20px 24px", marginBottom: "14px",
  };
  const sectionLabel: React.CSSProperties = {
    fontSize: "10px", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".1em",
    color: "#7A7880", marginBottom: "14px",
  };

  return (
    <div>
      {/* ── Heading ── */}
      <div style={{ marginBottom: "20px" }}>
        <h1 style={{ fontFamily: "var(--font-bebas)", fontSize: "clamp(22px,4vw,32px)", color: "#2A2830", letterSpacing: ".03em", lineHeight: 1, marginBottom: "6px" }}>
          Review Your Order
        </h1>
        <p style={{ fontSize: "13px", color: "#7A7880" }}>
          Please confirm all details before placing your order.
        </p>
      </div>

      {/* ── Shipping ── */}
      <div style={sectionCard}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
          <div style={sectionLabel as React.CSSProperties}>Shipping Address</div>
          <button onClick={() => router.push("/checkout/address")} style={{ fontSize: "11px", color: "#1A5CFF", background: "none", border: "none", cursor: "pointer", fontWeight: 700 }}>Edit</button>
        </div>
        <div style={{ fontSize: "13px", color: "#2A2830", lineHeight: 1.7 }}>
          {companyName && <div style={{ fontWeight: 700 }}>{companyName}</div>}
          {contactName && <div>{contactName}</div>}
          {shippingAddress && (
            <>
              <div>{shippingAddress.line1}</div>
              {shippingAddress.line2 && <div>{shippingAddress.line2}</div>}
              <div>{shippingAddress.city}, {shippingAddress.state} {shippingAddress.postal_code}</div>
            </>
          )}
          {shippingPhone && <div style={{ color: "#7A7880" }}>{shippingPhone}</div>}
        </div>
        <div style={{ borderTop: "1px solid #F0EEE9", margin: "12px 0" }} />
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13px" }}>
          <span style={{ color: "#7A7880" }}>Shipping Method</span>
          <span style={{ fontWeight: 700, color: "#2A2830" }}>
            {shippingLabel} — {shipping === 0 ? "FREE" : formatCurrency(shipping)}
          </span>
        </div>
      </div>

      {/* ── Payment ── */}
      <div style={sectionCard}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
          <div style={sectionLabel as React.CSSProperties}>Payment</div>
          <button onClick={() => router.push("/checkout/payment")} style={{ fontSize: "11px", color: "#1A5CFF", background: "none", border: "none", cursor: "pointer", fontWeight: 700 }}>Change</button>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <svg width="32" height="22" viewBox="0 0 32 22" fill="none">
            <rect width="32" height="22" rx="3" fill="#F4F3EF" stroke="#E2E0DA" />
            <rect x="4" y="8" width="10" height="6" rx="1.5" fill="#E2E0DA" />
            <rect x="4" y="16" width="5" height="2" rx="0.5" fill="#E2E0DA" />
            <rect x="11" y="16" width="5" height="2" rx="0.5" fill="#E2E0DA" />
          </svg>
          <span style={{ fontSize: "13px", fontWeight: 700, color: "#2A2830" }}>{paymentLabel}</span>
        </div>
      </div>

      {/* ── Order Items ── */}
      {cart && cart.items.length > 0 && (
        <div style={sectionCard}>
          <div style={sectionLabel as React.CSSProperties}>Items in Your Order</div>
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {cart.items.map(item => (
              <div key={item.id} style={{ display: "flex", justifyContent: "space-between", fontSize: "13px" }}>
                <div>
                  <span style={{ fontWeight: 600, color: "#2A2830" }}>{item.product_name}</span>
                  {(item.color || item.size) && (
                    <span style={{ color: "#7A7880", marginLeft: "6px" }}>
                      {[item.color, item.size].filter(Boolean).join(" / ")}
                    </span>
                  )}
                  <span style={{ color: "#7A7880", marginLeft: "6px" }}>x{item.quantity}</span>
                </div>
                <span style={{ fontWeight: 600, color: "#2A2830", whiteSpace: "nowrap" }}>{formatCurrency(Number(item.line_total))}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── PO Number & Notes ── */}
      <div style={sectionCard}>
        <div style={sectionLabel as React.CSSProperties}>Order Details (Optional)</div>
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          <div>
            <label style={{ display: "block", fontSize: "11px", fontWeight: 700, color: "#7A7880", textTransform: "uppercase", letterSpacing: ".06em", marginBottom: "5px" }}>
              PO Number
            </label>
            <input
              type="text"
              value={poNumber}
              onChange={e => setPoNumber(e.target.value)}
              placeholder="Optional purchase order reference"
              style={{ width: "100%", padding: "9px 12px", border: "1.5px solid #E2E0DA", borderRadius: "7px", fontSize: "13px", outline: "none", boxSizing: "border-box", color: "#2A2830" }}
            />
          </div>
          <div>
            <label style={{ display: "block", fontSize: "11px", fontWeight: 700, color: "#7A7880", textTransform: "uppercase", letterSpacing: ".06em", marginBottom: "5px" }}>
              Order Notes
            </label>
            <textarea
              value={orderNotes}
              onChange={e => setOrderNotes(e.target.value)}
              placeholder="Special instructions or notes for this order"
              rows={3}
              style={{ width: "100%", padding: "9px 12px", border: "1.5px solid #E2E0DA", borderRadius: "7px", fontSize: "13px", outline: "none", resize: "vertical", boxSizing: "border-box", color: "#2A2830", fontFamily: "var(--font-jakarta)" }}
            />
          </div>
        </div>
      </div>

      {/* ── Order Total ── */}
      <div style={{ background: "#fff", border: "1.5px solid #E2E0DA", borderRadius: "12px", padding: "18px 24px", marginBottom: "16px" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          <div style={row}>
            <span style={{ color: "#7A7880" }}>Subtotal ({cart?.total_units ?? 0} units)</span>
            <span style={{ fontWeight: 600, color: "#2A2830" }}>{formatCurrency(subtotal)}</span>
          </div>
          {Number(cart?.discount_percent ?? 0) > 0 && (
            <div style={{ ...row, color: "#059669" }}>
              <span style={{ fontWeight: 600 }}>Tier Discount ({cart?.discount_percent}% applied)</span>
              <span style={{ fontWeight: 700 }}>&#10003; Included</span>
            </div>
          )}
          <div style={row}>
            <span style={{ color: "#7A7880" }}>Shipping ({shippingLabel})</span>
            <span style={{ color: shipping === 0 ? "#059669" : "#2A2830", fontWeight: 600 }}>
              {shipping === 0 ? "FREE" : formatCurrency(shipping)}
            </span>
          </div>
          <div style={{ borderTop: "1.5px solid #E2E0DA", paddingTop: "10px", display: "flex", justifyContent: "space-between" }}>
            <span style={{ fontSize: "15px", fontWeight: 800, color: "#2A2830" }}>Total</span>
            <span style={{ fontFamily: "var(--font-bebas)", fontSize: "22px", color: "#E8242A", letterSpacing: ".02em" }}>{formatCurrency(total)}</span>
          </div>
        </div>
      </div>

      {/* ── Error ── */}
      {error && (
        <div style={{ padding: "12px 16px", borderRadius: "8px", background: "rgba(232,36,42,.07)", border: "1.5px solid rgba(232,36,42,.25)", color: "#E8242A", fontSize: "13px", fontWeight: 600, marginBottom: "14px" }}>
          {error}
        </div>
      )}

      {/* ── Place Order ── */}
      <div style={{ display: "flex", gap: "10px" }}>
        <button
          type="button"
          onClick={() => router.push("/checkout/payment")}
          style={{ flex: 1, padding: "14px", border: "1.5px solid #E2E0DA", borderRadius: "8px", background: "#fff", fontSize: "13px", fontWeight: 600, cursor: "pointer", color: "#7A7880" }}
        >
          &#8592; Back
        </button>
        <button
          type="button"
          onClick={handlePlaceOrder}
          disabled={isPlacing}
          style={{
            flex: 3, padding: "14px",
            background: isPlacing ? "#E2E0DA" : "#E8242A",
            color: isPlacing ? "#aaa" : "#fff",
            border: "none", borderRadius: "8px",
            fontFamily: "var(--font-bebas)", fontSize: "18px", letterSpacing: ".08em",
            cursor: isPlacing ? "not-allowed" : "pointer", transition: "background .2s",
          }}
        >
          {isPlacing ? "Placing Order\u2026" : "Place Order"}
        </button>
      </div>

      <p style={{ textAlign: "center", fontSize: "11px", color: "#aaa", marginTop: "12px" }}>
        By placing your order you agree to our Terms of Service and wholesale pricing agreement.
      </p>
    </div>
  );
}
