"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { formatCurrency } from "@/lib/utils";
import { cartService } from "@/services/cart.service";
import { MOQWarning } from "@/components/cart/MOQWarning";
import type { Cart, CartItem } from "@/types/order.types";

// ── Color map (same as quick-order) ──────────────────────────────────────────
const COLOR_MAP: Record<string, string> = {
  White: "#FFFFFF", Black: "#111111", Navy: "#1e3a5f", Red: "#E8242A",
  Blue: "#1A5CFF", Royal: "#2251CC", "Royal Blue": "#2251CC",
  Grey: "#9ca3af", Gray: "#9ca3af", "Dark Grey": "#4b5563", Charcoal: "#374151",
  "Light Grey": "#d1d5db", "Light Gray": "#d1d5db", "Sport Grey": "#9ca3af",
  Heather: "#b0b7c3", Sand: "#e2c89a", Natural: "#f5f0e8", Tan: "#c9a96e",
  Brown: "#78350f", Maroon: "#7f1d1d", Burgundy: "#881337",
  Green: "#166534", "Forest Green": "#14532d", "Kelly Green": "#15803d",
  Lime: "#65a30d", Yellow: "#eab308", Gold: "#C9A84C", Orange: "#ea580c",
  Purple: "#7c3aed", Pink: "#ec4899", "Hot Pink": "#db2777", Coral: "#f87171",
  Teal: "#0d9488", Turquoise: "#06b6d4", Mint: "#6ee7b7", Olive: "#4d7c0f",
  Cream: "#fef3c7", Ivory: "#fffff0", "Sky Blue": "#38bdf8", Lavender: "#a78bfa",
};
function colorHex(c: string) { return COLOR_MAP[c] ?? "#888888"; }
function isLight(hex: string) {
  return ["#FFFFFF", "#fffff0", "#fef3c7", "#f5f0e8", "#d1d5db", "#e2c89a"].includes(hex);
}

// ── Group by product ─────────────────────────────────────────────────────────
interface ProductGroup {
  productId: string;
  productName: string;
  sku: string;            // representative SKU (first item)
  items: CartItem[];
  totalUnits: number;
  totalPrice: number;
  unitPrice: number;
  colorGroups: { color: string; sizes: { size: string; qty: number }[]; units: number }[];
}

function groupByProduct(items: CartItem[]): ProductGroup[] {
  const map = new Map<string, CartItem[]>();
  for (const item of items) {
    const pid = item.product_id;
    if (!map.has(pid)) map.set(pid, []);
    map.get(pid)!.push(item);
  }

  return Array.from(map.entries()).map(([productId, grpItems]) => {
    const totalUnits = grpItems.reduce((s, i) => s + i.quantity, 0);
    const totalPrice = grpItems.reduce((s, i) => s + Number(i.line_total), 0);
    const unitPrice = grpItems[0] ? Number(grpItems[0].unit_price) : 0;

    // Group by color
    const colorMap = new Map<string, CartItem[]>();
    for (const item of grpItems) {
      const c = item.color ?? "Default";
      if (!colorMap.has(c)) colorMap.set(c, []);
      colorMap.get(c)!.push(item);
    }

    const colorGroups = Array.from(colorMap.entries()).map(([color, cItems]) => ({
      color,
      sizes: cItems.map(i => ({ size: i.size ?? "One Size", qty: i.quantity })),
      units: cItems.reduce((s, i) => s + i.quantity, 0),
    }));

    return {
      productId,
      productName: grpItems[0]?.product_name ?? "Unknown Product",
      sku: grpItems[0]?.sku?.split("-")[0] ?? grpItems[0]?.sku ?? "",
      items: grpItems,
      totalUnits,
      totalPrice,
      unitPrice,
      colorGroups,
    };
  });
}

// ── Shared styles ─────────────────────────────────────────────────────────────
const divider = <div style={{ borderTop: "1px solid #F0EEE9", margin: "14px 0" }} />;

// ── Component ─────────────────────────────────────────────────────────────────
export default function CartPage() {
  const router = useRouter();
  const [cart, setCart] = useState<Cart | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [removingProductId, setRemovingProductId] = useState<string | null>(null);
  const [savingTemplate, setSavingTemplate] = useState(false);
  const [templateName, setTemplateName] = useState("");
  const [showTemplateDialog, setShowTemplateDialog] = useState(false);

  useEffect(() => {
    cartService.getCart().then(setCart).catch(console.error).finally(() => setIsLoading(false));
  }, []);

  async function handleRemoveProduct(group: ProductGroup) {
    setRemovingProductId(group.productId);
    try {
      let updated: Cart | null = null;
      for (const item of group.items) {
        updated = await cartService.removeItem(item.id);
      }
      if (updated) setCart(updated);
      else {
        const fresh = await cartService.getCart();
        setCart(fresh);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setRemovingProductId(null);
    }
  }

  async function handleSaveTemplate() {
    if (!templateName.trim()) return;
    setSavingTemplate(true);
    try {
      await cartService.saveTemplate(templateName.trim());
      setShowTemplateDialog(false);
      setTemplateName("");
    } catch (err) {
      console.error(err);
    } finally {
      setSavingTemplate(false);
    }
  }

  function getCheckoutDisabledReason(): string | undefined {
    if (!cart || !cart.items || cart.items.length === 0) return "Cart is empty";
    if (!cart.validation) return undefined;
    const v = cart.validation;
    if (v.moq_violations?.length > 0) return `${v.moq_violations.length} item${v.moq_violations.length !== 1 ? "s" : ""} below minimum order quantity`;
    if (v.mov_violation) return `Minimum order value of ${formatCurrency(Number(v.mov_required))} not met`;
    return undefined;
  }

  if (isLoading) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#F4F3EF" }}>
        <p style={{ color: "#aaa", fontSize: "14px" }}>Loading cart…</p>
      </div>
    );
  }

  const isEmpty = !cart || !cart.items || cart.items.length === 0;
  const disabledReason = getCheckoutDisabledReason();
  const isCheckoutEnabled = !disabledReason;
  const groups = cart ? groupByProduct(cart.items) : [];
  const subtotal = Number(cart?.subtotal ?? 0);
  const discountPercent = Number(cart?.discount_percent ?? 0);

  return (
    <div style={{ minHeight: "100vh", background: "#F4F3EF", fontFamily: "var(--font-jakarta)", paddingBottom: "60px" }}>

      {/* Header bar */}
      <div style={{ background: "#080808", borderBottom: "1px solid rgba(255,255,255,.06)", padding: "20px 32px 18px" }}>
        <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
          <div style={{ fontSize: "10px", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".14em", color: "#555", marginBottom: "4px" }}>Wholesale</div>
          <h1 style={{ fontFamily: "var(--font-bebas)", fontSize: "clamp(24px,4vw,40px)", color: "#fff", letterSpacing: ".03em", lineHeight: 1 }}>
            Shopping Cart
          </h1>
        </div>
      </div>

      <div style={{ maxWidth: "1200px", margin: "0 auto", padding: "28px 24px 0" }}>
        {isEmpty ? (
          /* ── Empty state ── */
          <div style={{ textAlign: "center", padding: "80px 24px", background: "#fff", borderRadius: "12px", border: "1.5px dashed #E2E0DA" }}>
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#ddd" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" style={{ margin: "0 auto 16px" }}>
              <circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/>
              <path d="M1 1h4l2.68 13.39a2 2 0 001.99 1.61h9.66a2 2 0 001.99-1.78L23 6H6"/>
            </svg>
            <p style={{ fontSize: "15px", fontWeight: 700, color: "#2A2830", marginBottom: "8px" }}>Your cart is empty</p>
            <p style={{ fontSize: "13px", color: "#7A7880", marginBottom: "24px" }}>Browse our wholesale catalog to add products.</p>
            <Link href="/products" style={{ background: "#E8242A", color: "#fff", padding: "12px 28px", borderRadius: "7px", fontSize: "13px", fontWeight: 700, textDecoration: "none", textTransform: "uppercase", letterSpacing: ".06em" }}>
              Browse Products
            </Link>
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 360px", gap: "24px", alignItems: "flex-start" }} className="cart-grid-responsive">

            {/* ── Items column ── */}
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>

              {/* MOV warning */}
              {cart?.validation?.mov_violation && (
                <div style={{ background: "rgba(232,36,42,.07)", border: "1.5px solid rgba(232,36,42,.25)", borderRadius: "8px", padding: "12px 16px", fontSize: "13px", color: "#E8242A", fontWeight: 600 }}>
                  Minimum order value not met —&nbsp;
                  <span style={{ fontWeight: 400, color: "#2A2830" }}>
                    current {formatCurrency(Number(cart.validation.mov_current))}, need {formatCurrency(Number(cart.validation.mov_required))}
                  </span>
                </div>
              )}

              {groups.map((group) => {
                const isRemoving = removingProductId === group.productId;
                const hasViolation = cart?.validation?.moq_violations?.some(v =>
                  group.items.some(i => i.variant_id === v.variant_id)
                );

                return (
                  <div
                    key={group.productId}
                    style={{
                      background: "#fff",
                      borderRadius: "12px",
                      border: `1.5px solid ${hasViolation ? "rgba(232,36,42,.3)" : "#E2E0DA"}`,
                      padding: "20px 22px",
                      opacity: isRemoving ? 0.5 : 1,
                      transition: "opacity .2s",
                    }}
                  >
                    {/* ── Product header (image + title) ── */}
                    <div style={{ display: "flex", gap: "14px", marginBottom: "4px", alignItems: "flex-start" }}>
                      {/* Product image */}
                      <div style={{ width: "72px", height: "72px", borderRadius: "8px", overflow: "hidden", background: "#F4F3EF", border: "1px solid #E2E0DA", flexShrink: 0 }}>
                        {group.items[0]?.product_image_url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={group.items[0].product_image_url}
                            alt={group.productName}
                            style={{ width: "100%", height: "100%", objectFit: "contain" }}
                          />
                        ) : (
                          <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
                            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#ccc" strokeWidth={1.5}><path d="M20.38 3.46L16 2a4 4 0 01-8 0L3.62 3.46a2 2 0 00-1.34 2.23l.58 3.57a1 1 0 00.99.84H6v10c0 1.1.9 2 2 2h8a2 2 0 002-2V10h2.15a1 1 0 00.99-.84l.58-3.57a2 2 0 00-1.34-2.23z"/></svg>
                          </div>
                        )}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <h2 style={{ fontSize: "15px", fontWeight: 800, color: "#2A2830", marginBottom: "4px", lineHeight: 1.2 }}>
                          {group.productName}
                        </h2>
                        <div style={{ fontSize: "12px", color: "#7A7880", display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap" }}>
                          {group.sku && <span style={{ fontFamily: "monospace", background: "#F4F3EF", padding: "1px 6px", borderRadius: "3px", fontSize: "11px" }}>#{group.sku}</span>}
                        </div>
                      </div>
                    </div>

                    {/* ── Units + price/unit ── */}
                    {(() => {
                      const retailPrice = Number(group.items[0]?.retail_price ?? 0);
                      const hasDiscount = retailPrice > 0 && retailPrice > group.unitPrice + 0.001;
                      return (
                        <div style={{ marginTop: "10px", fontSize: "13px", color: "#7A7880", display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap" }}>
                          <span style={{ fontWeight: 700, color: "#2A2830", fontSize: "14px" }}>{group.totalUnits.toLocaleString()} total units</span>
                          <span style={{ color: "#ccc" }}>·</span>
                          {hasDiscount ? (
                            <>
                              <span style={{ textDecoration: "line-through", color: "#bbb" }}>{formatCurrency(retailPrice)}</span>
                              <span style={{ fontWeight: 700, color: "#059669" }}>{formatCurrency(group.unitPrice)}/unit</span>
                            </>
                          ) : (
                            <span>{formatCurrency(group.unitPrice)}/unit</span>
                          )}
                        </div>
                      );
                    })()}

                    {divider}

                    {/* ── Color breakdown rows ── */}
                    <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                      {group.colorGroups.map(({ color, sizes, units }) => {
                        const hex = colorHex(color);
                        const light = isLight(hex);
                        return (
                          <div key={color} style={{ display: "flex", alignItems: "center", gap: "10px", fontSize: "13px", flexWrap: "wrap" }}>
                            {/* Color swatch */}
                            <div style={{
                              width: "16px", height: "16px", borderRadius: "3px", flexShrink: 0,
                              background: hex, border: light ? "1.5px solid #E2E0DA" : "1.5px solid rgba(0,0,0,.15)",
                            }} />
                            {/* Color name */}
                            <span style={{ fontWeight: 700, color: "#2A2830", minWidth: "64px" }}>{color}</span>
                            <span style={{ color: "#bbb" }}>—</span>
                            {/* Sizes */}
                            <span style={{ color: "#7A7880", flex: 1 }}>
                              {sizes.map(({ size, qty }) => `${size}:${qty}`).join(" / ")}
                            </span>
                            <span style={{ color: "#bbb" }}>—</span>
                            {/* Color units */}
                            <span style={{ fontWeight: 700, color: "#2A2830", whiteSpace: "nowrap" }}>{units} units</span>
                          </div>
                        );
                      })}
                    </div>

                    {/* MOQ warnings */}
                    {hasViolation && (
                      <div style={{ marginTop: "10px" }}>
                        {cart?.validation?.moq_violations
                          ?.filter(v => group.items.some(i => i.variant_id === v.variant_id))
                          .map(v => (
                            <MOQWarning key={v.variant_id} sku={v.sku} required={v.required} current={v.current} />
                          ))}
                      </div>
                    )}

                    {divider}

                    {/* ── Footer: Remove + Total ── */}
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      <button
                        onClick={() => handleRemoveProduct(group)}
                        disabled={isRemoving}
                        style={{ fontSize: "12px", fontWeight: 700, color: "#E8242A", background: "rgba(232,36,42,.06)", border: "1px solid rgba(232,36,42,.2)", borderRadius: "6px", padding: "6px 14px", cursor: isRemoving ? "not-allowed" : "pointer", transition: "all .15s" }}
                      >
                        {isRemoving ? "Removing…" : "Remove"}
                      </button>
                      <div style={{ textAlign: "right" }}>
                        <div style={{ fontFamily: "var(--font-bebas)", fontSize: "22px", color: "#2A2830", lineHeight: 1 }}>
                          {formatCurrency(group.totalPrice)}
                        </div>
                        <div style={{ fontSize: "11px", color: "#7A7880" }}>product total</div>
                      </div>
                    </div>
                  </div>
                );
              })}

              {/* Save as template */}
              <div style={{ display: "flex", justifyContent: "flex-end", paddingTop: "4px" }}>
                <button
                  onClick={() => setShowTemplateDialog(true)}
                  style={{ fontSize: "12px", fontWeight: 600, color: "#7A7880", background: "none", border: "none", cursor: "pointer", textDecoration: "underline", textUnderlineOffset: "3px" }}
                >
                  Save as Template
                </button>
              </div>
            </div>

            {/* ── Order Summary sidebar ── */}
            <div style={{ position: "sticky", top: "88px" }}>
              <OrderSummary
                subtotal={subtotal}
                estimatedShipping={Number(cart?.validation?.estimated_shipping ?? 0)}
                discountPercent={discountPercent}
                isValid={isCheckoutEnabled}
                disabledReason={disabledReason}
                onCheckout={() => router.push("/checkout/address")}
              />
            </div>
          </div>
        )}
      </div>

      {/* Save Template Dialog */}
      {showTemplateDialog && (
        <div style={{ position: "fixed", inset: 0, zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,.4)", padding: "16px" }}>
          <div style={{ background: "#fff", borderRadius: "12px", padding: "24px", width: "100%", maxWidth: "380px", boxShadow: "0 20px 60px rgba(0,0,0,.2)" }}>
            <h2 style={{ fontFamily: "var(--font-bebas)", fontSize: "22px", letterSpacing: ".04em", color: "#2A2830", marginBottom: "16px" }}>
              Save as Template
            </h2>
            <input
              type="text"
              placeholder="Template name"
              value={templateName}
              onChange={(e) => setTemplateName(e.target.value)}
              style={{ width: "100%", padding: "10px 12px", border: "1.5px solid #E2E0DA", borderRadius: "7px", fontSize: "13px", fontFamily: "var(--font-jakarta)", outline: "none", boxSizing: "border-box" }}
              autoFocus
            />
            <div style={{ display: "flex", gap: "10px", marginTop: "16px", justifyContent: "flex-end" }}>
              <button onClick={() => setShowTemplateDialog(false)} style={{ padding: "9px 16px", border: "1px solid #E2E0DA", borderRadius: "7px", background: "#fff", fontSize: "13px", fontWeight: 600, cursor: "pointer", color: "#7A7880" }}>
                Cancel
              </button>
              <button
                onClick={handleSaveTemplate}
                disabled={savingTemplate || !templateName.trim()}
                style={{ padding: "9px 20px", background: "#1A5CFF", color: "#fff", border: "none", borderRadius: "7px", fontSize: "13px", fontWeight: 700, cursor: !templateName.trim() ? "not-allowed" : "pointer", opacity: !templateName.trim() ? 0.4 : 1 }}
              >
                {savingTemplate ? "Saving…" : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Order Summary sidebar component ──────────────────────────────────────────
function OrderSummary({
  subtotal, estimatedShipping, discountPercent, isValid, disabledReason, onCheckout,
}: {
  subtotal: number;
  estimatedShipping: number;
  discountPercent: number;
  isValid: boolean;
  disabledReason?: string;
  onCheckout: () => void;
}) {
  const tax = 0; // shown as "Calculated at checkout"
  const total = subtotal + estimatedShipping + tax;

  const usp = [
    { icon: "🚚", text: "Orders before 2 PM CT ship same day" },
    { icon: "🔒", text: "Secure checkout — SSL encrypted" },
    { icon: "📞", text: "(214) 272-7213" },
    { icon: "✉", text: "info.afapparel@gmail.com" },
  ];

  return (
    <div style={{ background: "#fff", borderRadius: "12px", border: "1.5px solid #E2E0DA", overflow: "hidden" }}>
      {/* Title */}
      <div style={{ padding: "18px 20px 0", borderBottom: "none" }}>
        <h2 style={{ fontFamily: "var(--font-bebas)", fontSize: "20px", letterSpacing: ".04em", color: "#2A2830" }}>Order Summary</h2>
      </div>

      {/* Line items */}
      <div style={{ padding: "16px 20px", display: "flex", flexDirection: "column", gap: "10px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13px", color: "#7A7880" }}>
          <span>Subtotal</span>
          <span style={{ fontWeight: 600, color: "#2A2830" }}>{formatCurrency(subtotal)}</span>
        </div>
        {discountPercent > 0 && (
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", color: "#059669" }}>
            <span style={{ fontWeight: 600 }}>Tier Discount ({discountPercent}% applied)</span>
            <span style={{ fontWeight: 700 }}>✓ Included</span>
          </div>
        )}
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13px", color: "#7A7880" }}>
          <span>Shipping</span>
          <span style={{ color: "#7A7880" }}>
            {estimatedShipping > 0 ? formatCurrency(estimatedShipping) : "Calculated at checkout"}
          </span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13px", color: "#7A7880" }}>
          <span>Tax</span>
          <span style={{ color: "#7A7880" }}>Calculated at checkout</span>
        </div>

        {/* Divider */}
        <div style={{ borderTop: "1.5px solid #F0EEE9", margin: "4px 0" }} />

        <div style={{ display: "flex", justifyContent: "space-between", fontSize: "15px", fontWeight: 800, color: "#2A2830" }}>
          <span>Total</span>
          <span style={{ fontFamily: "var(--font-bebas)", fontSize: "22px", letterSpacing: ".02em" }}>{formatCurrency(total)}</span>
        </div>
      </div>

      {/* CTA */}
      <div style={{ padding: "0 20px 18px" }}>
        <button
          onClick={onCheckout}
          disabled={!isValid}
          title={disabledReason}
          style={{
            width: "100%", padding: "14px", background: isValid ? "#E8242A" : "#E2E0DA",
            color: isValid ? "#fff" : "#aaa", border: "none", borderRadius: "8px",
            fontFamily: "var(--font-bebas)", fontSize: "17px", letterSpacing: ".08em",
            cursor: isValid ? "pointer" : "not-allowed", transition: "background .2s",
          }}
          onMouseEnter={e => { if (isValid) (e.currentTarget as HTMLButtonElement).style.background = "#c91e23"; }}
          onMouseLeave={e => { if (isValid) (e.currentTarget as HTMLButtonElement).style.background = "#E8242A"; }}
        >
          Proceed to Checkout
        </button>
        {disabledReason && (
          <p style={{ fontSize: "11px", color: "#E8242A", textAlign: "center", marginTop: "8px" }}>{disabledReason}</p>
        )}
      </div>

      {/* Divider */}
      <div style={{ borderTop: "1.5px solid #F0EEE9" }} />

      {/* USPs */}
      <div style={{ padding: "16px 20px", display: "flex", flexDirection: "column", gap: "9px" }}>
        {usp.map(({ icon, text }) => (
          <div key={text} style={{ display: "flex", alignItems: "center", gap: "10px", fontSize: "12px", color: "#7A7880" }}>
            <span style={{ fontSize: "14px", flexShrink: 0 }}>{icon}</span>
            <span>{text}</span>
          </div>
        ))}
      </div>

      {/* Divider + accepted cards */}
      <div style={{ borderTop: "1.5px solid #F0EEE9" }} />
      <div style={{ padding: "14px 20px" }}>
        <p style={{ fontSize: "10px", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".08em", color: "#bbb", marginBottom: "10px" }}>Accepted Payment</p>
        <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
          {[
            { label: "VISA", bg: "#1A1F71", color: "#fff", font: "800" },
            { label: "MC", bg: "#252525", color: "#F79E1B", font: "800" },
            { label: "AMEX", bg: "#2E77BC", color: "#fff", font: "700" },
            { label: "DISC", bg: "#fff", color: "#231F20", font: "700", border: "1px solid #E2E0DA" },
          ].map(card => (
            <div key={card.label} style={{ padding: "4px 8px", background: card.bg, color: card.color, fontWeight: card.font, fontSize: "9px", letterSpacing: ".04em", borderRadius: "4px", border: card.border ?? "none", fontFamily: "Arial,sans-serif" }}>
              {card.label}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
