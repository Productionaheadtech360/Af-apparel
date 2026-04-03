"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { formatCurrency } from "@/lib/utils";
import type { ProductDetail } from "@/types/product.types";
import { useAuthStore } from "@/stores/auth.store";
import { VariantMatrix } from "@/components/products/VariantMatrix";
import { apiClient } from "@/lib/api-client";

interface ProductDetailClientProps {
  product: ProductDetail;
}

const COLOR_MAP: Record<string, string> = {
  White: "#FFFFFF",
  Black: "#111111",
  Navy: "#1e3a5f",
  Red: "#E8242A",
  Blue: "#1A5CFF",
  Royal: "#2251CC",
  "Royal Blue": "#2251CC",
  Grey: "#9ca3af",
  Gray: "#9ca3af",
  "Dark Grey": "#4b5563",
  "Dark Gray": "#4b5563",
  "Light Grey": "#d1d5db",
  "Light Gray": "#d1d5db",
  Charcoal: "#374151",
  Heather: "#b0b7c3",
  Sand: "#e2c89a",
  Natural: "#f5f0e8",
  Tan: "#c9a96e",
  Brown: "#78350f",
  Maroon: "#7f1d1d",
  Burgundy: "#881337",
  Green: "#166534",
  "Forest Green": "#14532d",
  "Kelly Green": "#15803d",
  Lime: "#65a30d",
  Yellow: "#eab308",
  Gold: "#C9A84C",
  Orange: "#ea580c",
  Purple: "#7c3aed",
  Pink: "#ec4899",
  "Hot Pink": "#db2777",
  Coral: "#f87171",
  Teal: "#0d9488",
  Turquoise: "#06b6d4",
  Mint: "#6ee7b7",
  Olive: "#4d7c0f",
  Cream: "#fef3c7",
  Ivory: "#fffff0",
  "Sky Blue": "#38bdf8",
  Lavender: "#a78bfa",
};

const TABS = ["Description", "Specifications", "Print Guide", "Size Chart", "Reviews"] as const;
type Tab = (typeof TABS)[number];

export function ProductDetailClient({ product }: ProductDetailClientProps) {
  const [activeImage, setActiveImage] = useState(
    product.images?.find((i) => i.is_primary) ?? product.images?.[0]
  );
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated());
  const [assetMsg, setAssetMsg] = useState<string | null>(null);
  const [emailingFlyer, setEmailingFlyer] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>("Description");

  const primaryVariant = product.variants?.[0];
  const hasFlyer = product.assets?.some((a: any) => a.asset_type === "flyer");

  // Unique colors and sizes
  const uniqueColors = Array.from(
    new Set(product.variants?.map((v) => v.color).filter(Boolean) ?? [])
  ) as string[];
  const uniqueSizes = Array.from(
    new Set(product.variants?.map((v) => v.size).filter(Boolean) ?? [])
  ) as string[];

  async function handleDownloadImages() {
    window.open(`/api/v1/products/${product.id}/download-images`, "_blank");
  }

  async function handleDownloadFlyer() {
    window.open(`/api/v1/products/${product.id}/download-flyer`, "_blank");
  }

  async function handleEmailFlyer() {
    setEmailingFlyer(true);
    try {
      await apiClient.post(`/api/v1/products/${product.id}/email-flyer`, {});
      setAssetMsg("Flyer sent to your account email.");
    } catch {
      setAssetMsg("Failed to send flyer.");
    } finally {
      setEmailingFlyer(false);
      setTimeout(() => setAssetMsg(null), 5000);
    }
  }

  return (
    <div style={{ minHeight: "100vh", background: "#fff", fontFamily: "var(--font-jakarta)" }}>
      {/* Breadcrumb */}
      <div style={{ background: "#F4F3EF", borderBottom: "1px solid #E2E0DA", padding: "12px 32px" }}>
        <div style={{ maxWidth: "1280px", margin: "0 auto", display: "flex", alignItems: "center", gap: "6px", fontSize: "12px", color: "#7A7880" }}>
          <Link href="/" style={{ color: "#7A7880", textDecoration: "none" }}>Home</Link>
          <span>/</span>
          <Link href="/products" style={{ color: "#7A7880", textDecoration: "none" }}>Products</Link>
          {product.categories?.[0] && (
            <>
              <span>/</span>
              <Link
                href={`/products?category=${product.categories[0].slug}`}
                style={{ color: "#7A7880", textDecoration: "none" }}
              >
                {product.categories[0].name}
              </Link>
            </>
          )}
          <span>/</span>
          <span style={{ color: "#2A2830", fontWeight: 600 }}>{product.name}</span>
        </div>
      </div>

      {/* Main content */}
      <div style={{ maxWidth: "1280px", margin: "0 auto", padding: "40px 32px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "48px", alignItems: "flex-start" }} className="product-detail-grid">

          {/* Image Gallery */}
          <div>
            {/* Main image */}
            <div style={{ position: "relative", aspectRatio: "1/1", borderRadius: "12px", overflow: "hidden", background: "#F4F3EF", border: "1px solid #E2E0DA", marginBottom: "12px" }}>
              {activeImage ? (
                <Image
                  src={activeImage.url_large_webp ?? activeImage.url_large}
                  alt={activeImage.alt_text ?? product.name}
                  fill
                  sizes="(max-width: 1024px) 100vw, 50vw"
                  style={{ objectFit: "cover" }}
                  priority
                />
              ) : (
                <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: "8px" }}>
                  <div style={{ width: "60px", height: "60px", background: "#E2E0DA", borderRadius: "50%" }} />
                  <span style={{ fontSize: "12px", color: "#7A7880" }}>No image</span>
                </div>
              )}

              {/* Badges */}
              <div style={{ position: "absolute", top: "12px", left: "12px", display: "flex", flexDirection: "column", gap: "6px" }}>
                {product.moq > 1 && (
                  <span style={{ background: "#111016", color: "#fff", fontSize: "10px", fontWeight: 700, padding: "3px 8px", borderRadius: "4px", textTransform: "uppercase", letterSpacing: ".06em" }}>
                    Min {product.moq} units
                  </span>
                )}
              </div>
            </div>

            {/* Thumbnails */}
            {product.images && product.images.length > 1 && (
              <div style={{ display: "flex", gap: "8px", overflowX: "auto", paddingBottom: "4px" }}>
                {product.images.map((img) => (
                  <button
                    key={img.id}
                    onClick={() => setActiveImage(img)}
                    style={{
                      position: "relative",
                      flexShrink: 0,
                      width: "72px",
                      height: "72px",
                      borderRadius: "8px",
                      overflow: "hidden",
                      border: activeImage?.id === img.id ? "2px solid #E8242A" : "2px solid #E2E0DA",
                      cursor: "pointer",
                      background: "#F4F3EF",
                      transition: "border-color .15s",
                    }}
                  >
                    <Image
                      src={img.url_thumbnail_webp ?? img.url_thumbnail}
                      alt={img.alt_text ?? ""}
                      fill
                      sizes="72px"
                      style={{ objectFit: "cover" }}
                    />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Product Info */}
          <div>
            {/* Category */}
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
              {product.categories?.[0] && (
                <span style={{ fontSize: "11px", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".08em", color: "#7A7880" }}>
                  {product.categories[0].name}
                </span>
              )}
            </div>

            {/* Title */}
            <h1 style={{ fontFamily: "var(--font-bebas)", fontSize: "clamp(28px,3vw,42px)", color: "#2A2830", letterSpacing: ".02em", lineHeight: 1.1, marginBottom: "16px" }}>
              {product.name}
            </h1>

            {/* Stars placeholder */}
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "20px" }}>
              <div style={{ display: "flex", gap: "2px" }}>
                {[1, 2, 3, 4, 5].map((s) => (
                  <svg key={s} width="14" height="14" viewBox="0 0 24 24" fill={s <= 4 ? "#C9A84C" : "#E2E0DA"}>
                    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                  </svg>
                ))}
              </div>
              <span style={{ fontSize: "12px", color: "#7A7880" }}>4.8 (124 reviews)</span>
            </div>

            {/* Pricing */}
            {isAuthenticated ? (
              <div style={{ background: "#F4F3EF", border: "1px solid #E2E0DA", borderRadius: "10px", padding: "20px", marginBottom: "20px" }}>
                <div style={{ fontSize: "11px", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".08em", color: "#7A7880", marginBottom: "8px" }}>
                  Wholesale Price
                </div>
                {primaryVariant?.effective_price ? (
                  <div style={{ display: "flex", alignItems: "baseline", gap: "10px" }}>
                    <span style={{ fontFamily: "var(--font-bebas)", fontSize: "36px", color: "#E8242A", letterSpacing: ".02em" }}>
                      {formatCurrency(Number(primaryVariant.effective_price))}
                    </span>
                    {primaryVariant.effective_price !== primaryVariant.retail_price && primaryVariant.retail_price && (
                      <span style={{ fontSize: "16px", color: "#7A7880", textDecoration: "line-through" }}>
                        {formatCurrency(Number(primaryVariant.retail_price))}
                      </span>
                    )}
                    <span style={{ fontSize: "12px", color: "#7A7880" }}>/ unit</span>
                  </div>
                ) : (
                  <span style={{ fontFamily: "var(--font-bebas)", fontSize: "28px", color: "#7A7880" }}>Price on request</span>
                )}
                {product.moq > 1 && (
                  <p style={{ fontSize: "12px", color: "#7A7880", marginTop: "6px" }}>
                    Minimum order quantity: <strong style={{ color: "#2A2830" }}>{product.moq} units</strong>
                  </p>
                )}
              </div>
            ) : (
              /* Guest login gate */
              <div style={{ background: "#111016", border: "1px solid rgba(255,255,255,.08)", borderRadius: "10px", padding: "24px", marginBottom: "20px", textAlign: "center" }}>
                <div style={{ fontSize: "24px", marginBottom: "8px" }}>🔒</div>
                <div style={{ fontFamily: "var(--font-bebas)", fontSize: "18px", color: "#fff", letterSpacing: ".04em", marginBottom: "6px" }}>
                  Wholesale Pricing Locked
                </div>
                <p style={{ fontSize: "13px", color: "#555", marginBottom: "16px", lineHeight: 1.5 }}>
                  Log in to your approved wholesale account to see factory-direct pricing and place orders.
                </p>
                <div style={{ display: "flex", gap: "10px", justifyContent: "center" }}>
                  <Link
                    href="/login"
                    style={{ background: "#E8242A", color: "#fff", padding: "10px 20px", borderRadius: "6px", fontSize: "13px", fontWeight: 700, textDecoration: "none", textTransform: "uppercase", letterSpacing: ".06em" }}
                  >
                    Log In
                  </Link>
                  <Link
                    href="/wholesale/register"
                    style={{ background: "transparent", color: "#fff", padding: "10px 20px", borderRadius: "6px", fontSize: "13px", fontWeight: 600, textDecoration: "none", border: "1px solid rgba(255,255,255,.15)" }}
                  >
                    Apply for Access
                  </Link>
                </div>
              </div>
            )}

            {/* Color swatches */}
            {uniqueColors.length > 0 && (
              <div style={{ marginBottom: "16px" }}>
                <div style={{ fontSize: "11px", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".08em", color: "#7A7880", marginBottom: "8px" }}>
                  Available Colors ({uniqueColors.length})
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                  {uniqueColors.map((color) => {
                    const hex = COLOR_MAP[color] ?? "#E2E0DA";
                    const isLight = hex === "#FFFFFF" || hex === "#fffff0" || hex === "#fef3c7" || hex === "#f5f0e8";
                    return (
                      <div
                        key={color}
                        title={color}
                        style={{
                          width: "24px",
                          height: "24px",
                          borderRadius: "50%",
                          background: hex,
                          border: isLight ? "1px solid #E2E0DA" : "1px solid transparent",
                          cursor: "default",
                          flexShrink: 0,
                        }}
                      />
                    );
                  })}
                </div>
              </div>
            )}

            {/* Size pills */}
            {uniqueSizes.length > 0 && (
              <div style={{ marginBottom: "20px" }}>
                <div style={{ fontSize: "11px", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".08em", color: "#7A7880", marginBottom: "8px" }}>
                  Sizes
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                  {uniqueSizes.map((size) => (
                    <span
                      key={size}
                      style={{
                        padding: "4px 10px",
                        border: "1px solid #E2E0DA",
                        borderRadius: "4px",
                        fontSize: "12px",
                        fontWeight: 600,
                        color: "#2A2830",
                        background: "#fff",
                      }}
                    >
                      {size}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Variant Matrix — bulk order entry for authenticated users */}
            {isAuthenticated && product.variants && product.variants.length > 0 && (
              <div style={{ marginBottom: "20px" }}>
                <VariantMatrix
                  productId={product.id}
                  variants={product.variants}
                  moq={product.moq}
                />
              </div>
            )}

            {/* Trust badges */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", marginBottom: "20px" }}>
              {[
                { icon: "🏭", text: "Factory-Direct Pricing" },
                { icon: "⚡", text: "Same-Day Shipping" },
                { icon: "📦", text: "No Order Minimums" },
                { icon: "🎨", text: "Print-Optimized Blanks" },
              ].map((item) => (
                <div key={item.text} style={{ display: "flex", alignItems: "center", gap: "8px", padding: "10px 12px", background: "#F4F3EF", borderRadius: "6px", border: "1px solid #E2E0DA" }}>
                  <span style={{ fontSize: "16px" }}>{item.icon}</span>
                  <span style={{ fontSize: "11px", fontWeight: 600, color: "#2A2830" }}>{item.text}</span>
                </div>
              ))}
            </div>

            {/* Asset Downloads */}
            {isAuthenticated && (
              <div style={{ borderTop: "1px solid #E2E0DA", paddingTop: "16px" }}>
                <div style={{ fontSize: "11px", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".08em", color: "#7A7880", marginBottom: "10px" }}>
                  Downloads & Assets
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                  {product.images && product.images.length > 0 && (
                    <button
                      onClick={handleDownloadImages}
                      style={{ display: "inline-flex", alignItems: "center", gap: "6px", padding: "8px 14px", border: "1px solid #E2E0DA", borderRadius: "6px", fontSize: "12px", fontWeight: 600, color: "#2A2830", background: "#fff", cursor: "pointer" }}
                    >
                      <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                      </svg>
                      Download Images
                    </button>
                  )}
                  {hasFlyer && (
                    <>
                      <button
                        onClick={handleDownloadFlyer}
                        style={{ display: "inline-flex", alignItems: "center", gap: "6px", padding: "8px 14px", border: "1px solid #E2E0DA", borderRadius: "6px", fontSize: "12px", fontWeight: 600, color: "#2A2830", background: "#fff", cursor: "pointer" }}
                      >
                        <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                        </svg>
                        Download Flyer
                      </button>
                      <button
                        onClick={handleEmailFlyer}
                        disabled={emailingFlyer}
                        style={{ display: "inline-flex", alignItems: "center", gap: "6px", padding: "8px 14px", border: "1px solid #E2E0DA", borderRadius: "6px", fontSize: "12px", fontWeight: 600, color: "#2A2830", background: "#fff", cursor: emailingFlyer ? "not-allowed" : "pointer", opacity: emailingFlyer ? 0.5 : 1 }}
                      >
                        <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                        </svg>
                        {emailingFlyer ? "Sending…" : "Email Flyer"}
                      </button>
                    </>
                  )}
                </div>
                {assetMsg && (
                  <p style={{ marginTop: "8px", fontSize: "12px", color: "#1A5CFF" }}>{assetMsg}</p>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Product Tabs */}
        <div style={{ marginTop: "56px", borderTop: "1px solid #E2E0DA" }}>
          {/* Tab bar */}
          <div className="pd-tab-bar" style={{ gap: "0", borderBottom: "1px solid #E2E0DA" }}>
            {TABS.map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                style={{
                  padding: "14px 20px",
                  fontSize: "13px",
                  fontWeight: 700,
                  textTransform: "uppercase",
                  letterSpacing: ".06em",
                  color: activeTab === tab ? "#E8242A" : "#7A7880",
                  background: "none",
                  border: "none",
                  borderBottom: activeTab === tab ? "2px solid #E8242A" : "2px solid transparent",
                  marginBottom: "-1px",
                  cursor: "pointer",
                  whiteSpace: "nowrap",
                  transition: "color .15s",
                }}
              >
                {tab}
              </button>
            ))}
          </div>

          {/* Tab content */}
          <div style={{ padding: "32px 0" }}>
            {activeTab === "Description" && (
              <div style={{ maxWidth: "720px" }}>
                <p style={{ fontSize: "15px", color: "#2A2830", lineHeight: 1.7 }}>
                  {product.description ?? "No description available for this product."}
                </p>
              </div>
            )}

            {activeTab === "Specifications" && (
              <div style={{ maxWidth: "600px" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "14px" }}>
                  <tbody>
                    {[
                      { label: "Colors Available", value: uniqueColors.join(", ") || "—" },
                      { label: "Sizes Available", value: uniqueSizes.join(", ") || "—" },
                      { label: "Min Order Qty", value: `${product.moq} units` },
                      { label: "Variants", value: `${product.variants?.length ?? 0} options` },
                    ].map((row) => (
                      <tr key={row.label} style={{ borderBottom: "1px solid #F4F3EF" }}>
                        <td style={{ padding: "12px 0", color: "#7A7880", fontWeight: 600, width: "40%" }}>{row.label}</td>
                        <td style={{ padding: "12px 0", color: "#2A2830" }}>{row.value}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {activeTab === "Print Guide" && (
              <div style={{ maxWidth: "720px" }}>
                <div style={{ background: "#F4F3EF", border: "1px solid #E2E0DA", borderRadius: "10px", padding: "24px" }}>
                  <h3 style={{ fontFamily: "var(--font-bebas)", fontSize: "18px", letterSpacing: ".04em", color: "#2A2830", marginBottom: "12px" }}>
                    Print Compatibility
                  </h3>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: "12px" }}>
                    {["DTF (Direct to Film)", "Screen Printing", "Embroidery", "DTG (Direct to Garment)", "Heat Transfer", "Sublimation"].map((method) => (
                      <div key={method} style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "13px", color: "#2A2830" }}>
                        <span style={{ width: "18px", height: "18px", borderRadius: "50%", background: "#E8242A", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={3}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                        </span>
                        {method}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {activeTab === "Size Chart" && (
              <div style={{ overflowX: "auto" }}>
                <table style={{ borderCollapse: "collapse", fontSize: "13px", minWidth: "500px" }}>
                  <thead>
                    <tr style={{ background: "#111016" }}>
                      {["Size", "Chest (in)", "Length (in)", "Sleeve (in)"].map((h) => (
                        <th key={h} style={{ padding: "10px 16px", textAlign: "left", color: "#fff", fontFamily: "var(--font-bebas)", letterSpacing: ".06em", fontSize: "13px" }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      ["XS", "32–34", "27", "16"],
                      ["S", "35–37", "28", "17"],
                      ["M", "38–40", "29", "18"],
                      ["L", "41–43", "30", "19"],
                      ["XL", "44–46", "31", "20"],
                      ["2XL", "47–49", "32", "21"],
                      ["3XL", "50–52", "33", "22"],
                    ].map((row, i) => (
                      <tr key={row[0]} style={{ background: i % 2 === 0 ? "#F4F3EF" : "#fff", borderBottom: "1px solid #E2E0DA" }}>
                        {row.map((cell, j) => (
                          <td key={j} style={{ padding: "10px 16px", color: "#2A2830", fontWeight: j === 0 ? 700 : 400 }}>{cell}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {activeTab === "Reviews" && (
              <div style={{ maxWidth: "640px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "24px", padding: "24px", background: "#F4F3EF", borderRadius: "10px", marginBottom: "24px", border: "1px solid #E2E0DA" }}>
                  <div style={{ textAlign: "center" }}>
                    <div style={{ fontFamily: "var(--font-bebas)", fontSize: "56px", color: "#2A2830", lineHeight: 1 }}>4.8</div>
                    <div style={{ display: "flex", gap: "2px", justifyContent: "center", marginTop: "4px" }}>
                      {[1, 2, 3, 4, 5].map((s) => (
                        <svg key={s} width="14" height="14" viewBox="0 0 24 24" fill={s <= 4 ? "#C9A84C" : "#E2E0DA"}>
                          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                        </svg>
                      ))}
                    </div>
                    <div style={{ fontSize: "12px", color: "#7A7880", marginTop: "4px" }}>124 reviews</div>
                  </div>
                  <div style={{ flex: 1 }}>
                    {[5, 4, 3, 2, 1].map((star) => {
                      const pct = star === 5 ? 72 : star === 4 ? 18 : star === 3 ? 6 : star === 2 ? 2 : 2;
                      return (
                        <div key={star} style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
                          <span style={{ fontSize: "12px", color: "#7A7880", width: "8px" }}>{star}</span>
                          <div style={{ flex: 1, height: "6px", background: "#E2E0DA", borderRadius: "3px", overflow: "hidden" }}>
                            <div style={{ width: `${pct}%`, height: "100%", background: "#C9A84C", borderRadius: "3px" }} />
                          </div>
                          <span style={{ fontSize: "11px", color: "#7A7880", width: "28px" }}>{pct}%</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
                <p style={{ fontSize: "13px", color: "#7A7880", textAlign: "center" }}>
                  Verified buyer reviews coming soon.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      <style>{`
        @media (max-width: 768px) {
          .product-detail-grid {
            grid-template-columns: 1fr !important;
            gap: 24px !important;
          }
        }
      `}</style>
    </div>
  );
}
