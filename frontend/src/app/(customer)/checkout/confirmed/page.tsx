"use client";

export const dynamic = "force-dynamic";

import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCheckoutStore } from "@/stores/checkout.store";
import { formatCurrency } from "@/lib/utils";

const SHIPPING_LABELS: Record<string, string> = {
  standard: "Standard Ground — FREE",
  expedited: "Expedited (2-Day) — $45.00",
  freight: "Freight / LTL — Quoted",
};

export default function CheckoutConfirmedPage() {
  const router = useRouter();
  const {
    confirmedOrderId,
    confirmedOrderNumber,
    confirmedOrderTotal,
    confirmedUnits,
    confirmedColorSummary,
    confirmedProductName,
    confirmedShippingMethod,
  } = useCheckoutStore();

  // Redirect if no confirmed order (e.g. direct navigation)
  useEffect(() => {
    if (!confirmedOrderId && !confirmedOrderNumber) {
      router.replace("/cart");
    }
  }, [confirmedOrderId, confirmedOrderNumber, router]);

  if (!confirmedOrderNumber) {
    return (
      <div style={{ textAlign: "center", padding: "60px 0", color: "#aaa", fontSize: "14px" }}>
        Redirecting&hellip;
      </div>
    );
  }

  const orderNum = confirmedOrderNumber.startsWith("AF-")
    ? confirmedOrderNumber
    : `AF-${confirmedOrderNumber}`;

  const shippingLabel = SHIPPING_LABELS[confirmedShippingMethod] ?? "Standard Ground";

  return (
    <div style={{ textAlign: "center" }}>

      {/* Success icon */}
      <div style={{ marginBottom: "20px" }}>
        <div style={{
          width: "72px", height: "72px", borderRadius: "50%",
          background: "rgba(5,150,105,.1)", border: "2px solid rgba(5,150,105,.3)",
          display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px",
        }}>
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </div>

        <h1 style={{ fontFamily: "var(--font-bebas)", fontSize: "clamp(28px,5vw,44px)", color: "#2A2830", letterSpacing: ".03em", lineHeight: 1, marginBottom: "10px" }}>
          Order Confirmed!
        </h1>

        <div style={{ fontFamily: "var(--font-bebas)", fontSize: "20px", color: "#7A7880", letterSpacing: ".06em", marginBottom: "14px" }}>
          Order {orderNum}
        </div>

        <p style={{ fontSize: "14px", color: "#7A7880", lineHeight: 1.7, maxWidth: "480px", margin: "0 auto" }}>
          Your order of <strong style={{ color: "#2A2830" }}>{confirmedUnits.toLocaleString()} units</strong> is confirmed and will be processed for same-day shipping from our Dallas, TX warehouse.
          A confirmation email has been sent to your account address.
        </p>
      </div>

      {/* Order detail box */}
      <div style={{
        background: "#fff", border: "1.5px solid #E2E0DA", borderRadius: "12px",
        padding: "22px 24px", textAlign: "left", margin: "28px 0",
      }}>
        <div style={{ fontSize: "10px", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".1em", color: "#7A7880", marginBottom: "14px" }}>
          Order Details
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: "12px", alignItems: "flex-start", fontSize: "13px" }}>
            <span style={{ color: "#7A7880", flexShrink: 0 }}>Product</span>
            <span style={{ fontWeight: 700, color: "#2A2830", textAlign: "right" }}>{confirmedProductName}</span>
          </div>

          {confirmedColorSummary && (
            <div style={{ display: "flex", justifyContent: "space-between", gap: "12px", alignItems: "flex-start", fontSize: "13px" }}>
              <span style={{ color: "#7A7880", flexShrink: 0 }}>Colors</span>
              <span style={{ fontWeight: 600, color: "#2A2830", textAlign: "right" }}>{confirmedColorSummary}</span>
            </div>
          )}

          <div style={{ borderTop: "1px solid #F0EEE9" }} />

          <div style={{ display: "flex", justifyContent: "space-between", gap: "12px", fontSize: "13px" }}>
            <span style={{ color: "#7A7880" }}>Shipping</span>
            <span style={{ fontWeight: 600, color: "#2A2830" }}>{shippingLabel}</span>
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", gap: "12px", fontSize: "13px" }}>
            <span style={{ color: "#7A7880" }}>Payment</span>
            <span style={{ fontWeight: 600, color: "#2A2830" }}>Credit Card</span>
          </div>

          <div style={{ borderTop: "1.5px solid #E2E0DA" }} />

          <div style={{ display: "flex", justifyContent: "space-between", gap: "12px" }}>
            <span style={{ fontSize: "14px", fontWeight: 700, color: "#2A2830" }}>Total Charged</span>
            <span style={{ fontFamily: "var(--font-bebas)", fontSize: "20px", color: "#E8242A", letterSpacing: ".02em" }}>
              {formatCurrency(confirmedOrderTotal)}
            </span>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
        <Link
          href="/account/orders"
          style={{
            display: "block", padding: "14px", background: "#E8242A", color: "#fff",
            borderRadius: "8px", textDecoration: "none", fontFamily: "var(--font-bebas)",
            fontSize: "17px", letterSpacing: ".08em", transition: "background .2s",
          }}
        >
          View My Orders
        </Link>
        <Link
          href="/products"
          style={{
            display: "block", padding: "14px", background: "#fff", color: "#2A2830",
            border: "1.5px solid #E2E0DA", borderRadius: "8px", textDecoration: "none",
            fontFamily: "var(--font-bebas)", fontSize: "17px", letterSpacing: ".08em",
          }}
        >
          Continue Shopping
        </Link>
      </div>
    </div>
  );
}
