"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { apiClient } from "@/lib/api-client";
import { useAuthStore } from "@/stores/auth.store";
import type { Category, ProductListItem } from "@/types/product.types";

interface ProductListClientProps {
  initialProducts: ProductListItem[];
  total: number;
  currentPage: number;
  pages: number;
  categories: Category[];
  sizes: string[];
  colors: string[];
}

// Color name → hex for swatch dots
const COLOR_MAP: Record<string, string> = {
  White: "#FFFFFF",
  Black: "#111111",
  Grey: "#9CA3AF",
  "Sport Grey": "#9CA3AF",
  Charcoal: "#555555",
  Navy: "#1e3a5f",
  Red: "#E8242A",
  Blue: "#1A5CFF",
  "Royal Blue": "#1A5CFF",
  "Light Blue": "#7DD3FC",
  "Stonewash Blue": "#5b8fa8",
  Forest: "#1B4332",
  Burgundy: "#722F37",
  Purple: "#7C3AED",
  Pink: "#F9A8D4",
  "Lt. Pink": "#F9A8D4",
  Sand: "#E8D5B7",
  Gold: "#C9A84C",
  Mustard: "#D4A843",
  Mint: "#4ADE80",
  Orange: "#F97316",
  Yellow: "#FDE047",
};

function swatchColor(name: string): string {
  return COLOR_MAP[name] ?? "#ccc";
}

export function ProductListClient({
  initialProducts,
  total,
  currentPage,
  pages,
  categories,
  sizes,
  colors,
}: ProductListClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated());

  // Filter drawer state (mobile)
  const [filterOpen, setFilterOpen] = useState(false);

  // Bulk download state
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkDownloading, setBulkDownloading] = useState(false);
  const [bulkMessage, setBulkMessage] = useState<string | null>(null);

  const currentCategory = searchParams.get("category") ?? "";
  const currentSize = searchParams.get("size") ?? "";
  const currentColor = searchParams.get("color") ?? "";
  const currentGender = searchParams.get("gender") ?? "";
  const currentInStock = searchParams.get("in_stock ") ?? "";

  function buildFilterUrl(updates: Record<string, string | null>) {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("page");
    for (const [key, value] of Object.entries(updates)) {
      if (value) params.set(key, value);
      else params.delete(key);
    }
    return `/products?${params.toString()}`;
  }

  function buildPageUrl(page: number) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", String(page));
    return `/products?${params.toString()}`;
  }

  function handleCategoryClick(slug: string) {
    const next = currentCategory === slug ? null : slug;
    router.push(buildFilterUrl({ category: next }));
    setFilterOpen(false);
  }

  function handleSizeClick(size: string) {
    const next = currentSize === size ? null : size;
    router.push(buildFilterUrl({ size: next }));
    setFilterOpen(false);
  }

  function handleColorClick(color: string) {
    const next = currentColor === color ? null : color;
    router.push(buildFilterUrl({ color: next }));
    setFilterOpen(false);
  }

  function handleClearAll() {
    router.push("/products");
    setFilterOpen(false);
  }

  function handleGenderClick(gender: string) {
    const next = currentGender === gender ? null : gender;
    router.push(buildFilterUrl({ gender: next }));
    setFilterOpen(false);
  }

  function handleInStockClick() {
    const next = currentInStock === "true" ? null : "true";
    router.push(buildFilterUrl({ in_stock: next }));
    setFilterOpen(false);
  }


  const hasFilters = currentCategory || currentSize || currentColor || currentGender || currentInStock;

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function handleBulkDownload() {
    if (selected.size === 0) return;
    setBulkDownloading(true);
    setBulkMessage(null);
    try {
      const res: any = await apiClient.post("/api/v1/products/bulk-download", {
        product_ids: Array.from(selected),
      });
      const taskId = res.data?.task_id;
      setBulkMessage(`ZIP generation queued (task: ${taskId?.slice(0, 8)}…). Check back in a moment.`);
    } catch {
      setBulkMessage("Failed to queue bulk download.");
    } finally {
      setBulkDownloading(false);
    }
  }

  // Sidebar content (shared by desktop & mobile drawer)
  const sidebarContent = (
    <div>
      {/* Gender */}
      <div style={{ marginBottom: "24px" }}>
        <h4 style={{ fontFamily: "var(--font-bebas)", fontSize: "11px", letterSpacing: ".14em", color: "#aaa", marginBottom: "12px", textTransform: "uppercase" }}>
          Gender
        </h4>
        {[
          { label: "Men's", value: "mens" },
          { label: "Women's", value: "womens" },
          { label: "Youth", value: "youth" },
          { label: "Unisex", value: "unisex" },
        ].map(g => (
          <div
            key={g.value}
            onClick={() => handleGenderClick(g.value)}
            style={{ fontSize: "13px", color: currentGender === g.value ? "#1A5CFF" : "#7A7880", padding: "6px 10px", borderRadius: "6px", cursor: "pointer", fontWeight: currentGender === g.value ? 700 : 500, background: currentGender === g.value ? "rgba(26,92,255,.06)" : "transparent" }}
          >
            {g.label}
          </div>
        ))}
      </div>

      {/* In Stock */}
      <div style={{ marginBottom: "24px" }}>
        <h4 style={{ fontFamily: "var(--font-bebas)", fontSize: "11px", letterSpacing: ".14em", color: "#aaa", marginBottom: "12px", textTransform: "uppercase" }}>
          Availability
        </h4>
        <div
          onClick={handleInStockClick}
          style={{ fontSize: "13px", color: currentInStock === "true" ? "#1A5CFF" : "#7A7880", padding: "6px 10px", borderRadius: "6px", cursor: "pointer", fontWeight: currentInStock === "true" ? 700 : 500, background: currentInStock === "true" ? "rgba(26,92,255,.06)" : "transparent", display: "flex", alignItems: "center", gap: "8px" }}
        >
          <span style={{ fontSize: "8px", color: "#059669" }}>●</span> In Stock Only
        </div>
      </div>

      {/* Category */}
      <div style={{ marginBottom: "24px" }}>
        <h4 style={{ fontFamily: "var(--font-bebas)", fontSize: "11px", letterSpacing: ".14em", color: "#aaa", marginBottom: "12px", textTransform: "uppercase" }}>
          Category
        </h4>
        <div
          onClick={() => handleCategoryClick("")}
          style={{ fontSize: "13px", color: currentCategory === "" ? "#1A5CFF" : "#7A7880", padding: "6px 10px", borderRadius: "6px", cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center", fontWeight: currentCategory === "" ? 700 : 500, background: currentCategory === "" ? "rgba(26,92,255,.06)" : "transparent" }}
        >
          All Products
          <span style={{ fontSize: "11px", color: currentCategory === "" ? "#1A5CFF" : "#bbb", background: currentCategory === "" ? "rgba(26,92,255,.1)" : "#f5f5f5", padding: "2px 6px", borderRadius: "10px" }}>{total}</span>
        </div>
        {categories.map((cat) => (
          <div
            key={cat.id}
            onClick={() => handleCategoryClick(cat.slug)}
            style={{ fontSize: "13px", color: currentCategory === cat.slug ? "#1A5CFF" : "#7A7880", padding: "6px 10px", borderRadius: "6px", cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center", fontWeight: currentCategory === cat.slug ? 700 : 500, background: currentCategory === cat.slug ? "rgba(26,92,255,.06)" : "transparent" }}
          >
            {cat.name}
          </div>
        ))}
      </div>

      {/* Color swatches */}
      {colors.length > 0 && (
        <div style={{ marginBottom: "24px" }}>
          <h4 style={{ fontFamily: "var(--font-bebas)", fontSize: "11px", letterSpacing: ".14em", color: "#aaa", marginBottom: "12px", textTransform: "uppercase" }}>Color</h4>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
            {colors.map((color) => {
              const hex = swatchColor(color);
              const selected = currentColor === color;
              return (
                <button
                  key={color}
                  onClick={() => handleColorClick(color)}
                  title={color}
                  style={{
                    width: "24px", height: "24px", borderRadius: "50%",
                    background: hex,
                    border: selected ? "2px solid transparent" : "2px solid rgba(0,0,0,.1)",
                    cursor: "pointer",
                    boxShadow: selected ? "0 0 0 2px #fff, 0 0 0 4px #1A5CFF" : "none",
                    transition: "transform .15s",
                    flexShrink: 0,
                    outline: "none",
                  }}
                />
              );
            })}
          </div>
        </div>
      )}

      {/* Size pills */}
      {sizes.length > 0 && (
        <div style={{ marginBottom: "24px" }}>
          <h4 style={{ fontFamily: "var(--font-bebas)", fontSize: "11px", letterSpacing: ".14em", color: "#aaa", marginBottom: "12px", textTransform: "uppercase" }}>Size</h4>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "5px" }}>
            {sizes.map((size) => {
              const sel = currentSize === size;
              return (
                <button
                  key={size}
                  onClick={() => handleSizeClick(size)}
                  style={{
                    padding: "5px 12px", borderRadius: "20px", fontSize: "12px", fontWeight: 600,
                    border: `1.5px solid ${sel ? "#2A2830" : "#E2E0DA"}`,
                    background: sel ? "#2A2830" : "#fff",
                    color: sel ? "#fff" : "#7A7880",
                    cursor: "pointer", transition: "all .15s",
                  }}
                >
                  {size}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {hasFilters && (
        <button
          onClick={handleClearAll}
          style={{ fontSize: "12px", color: "#E8242A", fontWeight: 700, cursor: "pointer", padding: "5px 0", background: "none", border: "none" }}
        >
          ✕ Clear All Filters
        </button>
      )}
    </div>
  );

  return (
    <div style={{ display: "flex", alignItems: "flex-start", minHeight: "600px" }}>

      {/* ── Desktop sidebar ── */}
      <aside
        className="hidden lg:block"
        style={{ width: "240px", flexShrink: 0, borderRight: "1px solid #E2E0DA", padding: "28px 22px", position: "sticky", top: "80px", maxHeight: "calc(100vh - 80px)", overflowY: "auto", background: "#fff" }}
      >
        {sidebarContent}
      </aside>

      {/* ── Mobile filter drawer overlay ── */}
      {filterOpen && (
        <div
          style={{ position: "fixed", inset: 0, zIndex: 50, display: "flex" }}
          className="lg:hidden"
        >
          {/* Backdrop */}
          <div
            style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.5)" }}
            onClick={() => setFilterOpen(false)}
          />
          {/* Drawer */}
          <div style={{ position: "relative", width: "280px", background: "#fff", height: "100%", padding: "24px 20px", overflowY: "auto", boxShadow: "4px 0 24px rgba(0,0,0,.15)", zIndex: 51 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
              <span style={{ fontFamily: "var(--font-bebas)", fontSize: "16px", letterSpacing: ".08em", color: "#2A2830" }}>FILTERS</span>
              <button
                onClick={() => setFilterOpen(false)}
                style={{ background: "none", border: "none", cursor: "pointer", fontSize: "20px", color: "#7A7880", padding: "4px", lineHeight: 1 }}
                aria-label="Close filters"
              >
                ✕
              </button>
            </div>
            {sidebarContent}
          </div>
        </div>
      )}

      {/* ── Main content ── */}
      <div className="prod-content-pad" style={{ flex: 1, padding: "24px 28px", minWidth: 0 }}>

        {/* Top bar: count + mobile filter button */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px", flexWrap: "wrap", gap: "10px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            {/* Mobile filter button */}
            <button
              onClick={() => setFilterOpen(true)}
              className="lg:hidden"
              style={{ display: "flex", alignItems: "center", gap: "6px", padding: "8px 14px", border: "1.5px solid #E2E0DA", borderRadius: "6px", fontSize: "13px", fontWeight: 600, color: "#2A2830", background: "#fff", cursor: "pointer" }}
            >
              <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4h18M7 12h10M11 20h2" />
              </svg>
              Filters {hasFilters && "•"}
            </button>
            <span style={{ fontSize: "13px", fontWeight: 700, color: "#7A7880" }}>
              {total} Product{total !== 1 ? "s" : ""}
            </span>
          </div>

          {/* Bulk download toolbar */}
          {selected.size > 0 && (
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <span style={{ fontSize: "12px", color: "#7A7880" }}>{selected.size} selected</span>
              <button
                onClick={handleBulkDownload}
                disabled={bulkDownloading}
                style={{ padding: "7px 16px", background: "#1A5CFF", color: "#fff", borderRadius: "5px", fontSize: "12px", fontWeight: 700, border: "none", cursor: "pointer", opacity: bulkDownloading ? 0.5 : 1 }}
              >
                {bulkDownloading ? "Queuing…" : "Bulk Download"}
              </button>
              <button onClick={() => setSelected(new Set())} style={{ fontSize: "12px", color: "#aaa", background: "none", border: "none", cursor: "pointer" }}>
                Clear
              </button>
            </div>
          )}
        </div>

        {bulkMessage && (
          <div style={{ marginBottom: "16px", background: "rgba(26,92,255,.06)", border: "1px solid rgba(26,92,255,.2)", borderRadius: "6px", padding: "12px 16px", fontSize: "13px", color: "#1A5CFF" }}>
            {bulkMessage}
          </div>
        )}

        {/* Product grid */}
        {initialProducts.length === 0 ? (
          <div style={{ textAlign: "center", padding: "80px 0", color: "#7A7880" }}>
            <div style={{ fontSize: "40px", marginBottom: "12px", opacity: .4 }}>🔍</div>
            <p style={{ fontFamily: "var(--font-bebas)", fontSize: "20px", letterSpacing: ".04em", marginBottom: "6px", color: "#2A2830" }}>No Products Found</p>
            <p style={{ fontSize: "14px" }}>Try adjusting your filters or search term.</p>
            {hasFilters && (
              <button onClick={handleClearAll} style={{ marginTop: "16px", padding: "8px 20px", background: "#E8242A", color: "#fff", borderRadius: "5px", fontSize: "13px", fontWeight: 700, border: "none", cursor: "pointer" }}>
                Clear Filters
              </button>
            )}
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "14px" }} className="prod-grid-responsive">
            {initialProducts.map((product) => {
              const primaryImage = product.primary_image;
              const primaryVariant = product.variants?.[0];
              const price = primaryVariant?.effective_price ?? primaryVariant?.retail_price;
              const variantColors = [...new Set(product.variants?.map(v => v.color).filter(Boolean) as string[])];
              const extraColors = variantColors.length > 5 ? variantColors.length - 5 : 0;

              return (
                <div key={product.id} style={{ position: "relative" }}>
                  {/* Bulk select checkbox */}
                  <input
                    type="checkbox"
                    checked={selected.has(product.id)}
                    onChange={() => toggleSelect(product.id)}
                    onClick={(e) => e.stopPropagation()}
                    style={{ position: "absolute", top: "12px", left: "12px", zIndex: 10, width: "16px", height: "16px", cursor: "pointer" }}
                  />

                  <Link
                    href={`/products/${product.slug}`}
                    style={{ display: "block", background: "#fff", border: "1px solid #E2E0DA", borderRadius: "10px", overflow: "hidden", textDecoration: "none", transition: "all .25s" }}
                    className="prod-card-hover"
                  >
                    {/* Image area */}
                    <div style={{ background: "linear-gradient(135deg,#ede9e3 0%,#e3dfd8 100%)", height: "200px", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", color: "#bbb", fontSize: "12px", fontWeight: 600, position: "relative" }}>
                      {primaryImage ? (
                        <Image
                          src={primaryImage.url_medium_webp ?? primaryImage.url_medium}
                          alt={primaryImage.alt_text ?? product.name}
                          fill
                          sizes="(max-width: 640px) 50vw, 33vw"
                          style={{ objectFit: "cover" }}
                        />
                      ) : (
                        <>
                          <div style={{ fontSize: "44px", opacity: .4, marginBottom: "6px" }}>👕</div>
                          <span style={{ fontSize: "10px", letterSpacing: ".06em", textTransform: "uppercase" }}>No Image</span>
                        </>
                      )}
                      {/* In-stock badge */}
                      <div style={{ position: "absolute", top: "12px", right: "12px", display: "inline-flex", alignItems: "center", gap: "4px", fontSize: "10px", fontWeight: 700, color: "#059669" }}>
                        <span style={{ fontSize: "7px" }}>●</span> In Stock
                      </div>
                    </div>

                    {/* Body */}
                    <div style={{ padding: "14px 16px" }}>
                      <div style={{ fontSize: "10px", color: "#aaa", textTransform: "uppercase", letterSpacing: ".06em", marginBottom: "3px", fontWeight: 600 }}>
                        {[
                          (product as any).fabric,
                          (product as any).product_code,
                          (product as any).weight,
                        ].filter(Boolean).join(" · ") || product.categories?.[0]?.name || "Apparel"}

                      </div>
                      <div style={{ fontFamily: "var(--font-bebas)", fontSize: "16px", letterSpacing: ".02em", marginBottom: "10px", color: "#2A2830", lineHeight: 1.2 }}>
                        {product.name}
                      </div>

                      {/* Color swatches */}
                      {variantColors.length > 0 && (
                        <div style={{ display: "flex", gap: "4px", alignItems: "center", marginBottom: "10px", flexWrap: "wrap" }}>
                          {variantColors.slice(0, 5).map((c) => (
                            <div
                              key={c}
                              title={c}
                              style={{
                                width: "14px", height: "14px", borderRadius: "50%",
                                background: swatchColor(c),
                                border: "1.5px solid rgba(0,0,0,.12)",
                                flexShrink: 0,
                              }}
                            />
                          ))}
                          {extraColors > 0 && (
                            <span style={{ fontSize: "10px", color: "#aaa", fontWeight: 600 }}>+{extraColors}</span>
                          )}
                        </div>
                      )}

                      {/* Price */}
                      {isAuthenticated && price ? (
                        <div style={{ fontFamily: "var(--font-bebas)", fontSize: "18px", color: "#2A2830", lineHeight: 1 }}>
                          ${Number(price).toFixed(2)}
                        </div>
                      ) : (
                        <div style={{ fontSize: "12px", color: "#1A5CFF", fontWeight: 700, display: "flex", alignItems: "center", gap: "5px" }}>
                          🔒 Login for pricing
                        </div>
                      )}
                    </div>
                  </Link>
                </div>
              );
            })}
          </div>
        )}

        {/* Pagination */}
        {pages > 1 && (
          <div style={{ marginTop: "40px", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}>
            {currentPage > 1 && (
              <button
                onClick={() => router.push(buildPageUrl(currentPage - 1))}
                style={{ padding: "9px 18px", fontSize: "13px", border: "1.5px solid #E2E0DA", borderRadius: "6px", background: "#fff", color: "#2A2830", cursor: "pointer", fontWeight: 600 }}
              >
                ← Previous
              </button>
            )}
            <span style={{ fontSize: "13px", color: "#7A7880", fontWeight: 600 }}>
              Page {currentPage} of {pages}
            </span>
            {currentPage < pages && (
              <button
                onClick={() => router.push(buildPageUrl(currentPage + 1))}
                style={{ padding: "9px 18px", fontSize: "13px", border: "1.5px solid #E2E0DA", borderRadius: "6px", background: "#fff", color: "#2A2830", cursor: "pointer", fontWeight: 600 }}
              >
                Next →
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
