"use client";

import { useState, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { formatCurrency } from "@/lib/utils";
import { productsService } from "@/services/products.service";
import { cartService } from "@/services/cart.service";
import type { ProductListItem, ProductDetail, ProductVariant } from "@/types/product.types";

// ─── Size ordering ────────────────────────────────────────────────────────────
const SIZE_ORDER = ["XS", "S", "M", "L", "XL", "2XL", "3XL", "4XL", "5XL"];
function sortSizes(sizes: string[]): string[] {
  return [...sizes].sort((a, b) => {
    const ia = SIZE_ORDER.indexOf(a);
    const ib = SIZE_ORDER.indexOf(b);
    if (ia === -1 && ib === -1) return a.localeCompare(b);
    if (ia === -1) return 1;
    if (ib === -1) return -1;
    return ia - ib;
  });
}

// ─── Row state ────────────────────────────────────────────────────────────────
interface QuickOrderRow {
  id: string;
  searchQuery: string;
  selectedProduct: ProductListItem | null;
  productDetail: ProductDetail | null;
  showDropdown: boolean;
  searchResults: ProductListItem[];
  selectedColor: string;
  quantities: Record<string, number>;
  isSearching: boolean;
  isLoadingDetail: boolean;
  checked: boolean;
}

function makeRow(): QuickOrderRow {
  return {
    id: Math.random().toString(36).slice(2),
    searchQuery: "",
    selectedProduct: null,
    productDetail: null,
    showDropdown: false,
    searchResults: [],
    selectedColor: "",
    quantities: {},
    isSearching: false,
    isLoadingDetail: false,
    checked: false,
  };
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function QuickOrderPage() {
  const [rows, setRows] = useState<QuickOrderRow[]>([makeRow(), makeRow(), makeRow()]);
  const [isAddingToCart, setIsAddingToCart] = useState(false);
  const [cartMsg, setCartMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const searchTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  // ── Row helpers ──────────────────────────────────────────────────────────
  function updateRow(id: string, updates: Partial<QuickOrderRow>) {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...updates } : r)));
  }

  function getRowColors(row: QuickOrderRow): string[] {
    if (!row.productDetail) return [];
    return Array.from(
      new Set(row.productDetail.variants.map((v) => v.color).filter(Boolean))
    ) as string[];
  }

  function getRowSizes(row: QuickOrderRow): string[] {
    if (!row.productDetail || !row.selectedColor) return [];
    return sortSizes(
      Array.from(
        new Set(
          row.productDetail.variants
            .filter((v) => v.color === row.selectedColor && v.size)
            .map((v) => v.size!)
        )
      )
    );
  }

  function getVariant(row: QuickOrderRow, size: string): ProductVariant | undefined {
    return row.productDetail?.variants.find(
      (v) => v.color === row.selectedColor && v.size === size
    );
  }

  function getRowTotals(row: QuickOrderRow): { units: number; price: number } {
    let units = 0;
    let price = 0;
    for (const size of getRowSizes(row)) {
      const qty = row.quantities[size] ?? 0;
      if (qty > 0) {
        const v = getVariant(row, size);
        units += qty;
        price += qty * parseFloat(v?.effective_price ?? v?.retail_price ?? "0");
      }
    }
    return { units, price };
  }

  // ── Search ───────────────────────────────────────────────────────────────
  function handleSearchChange(rowId: string, value: string) {
    updateRow(rowId, {
      searchQuery: value,
      selectedProduct: null,
      productDetail: null,
      selectedColor: "",
      quantities: {},
      showDropdown: false,
    });

    if (searchTimers.current[rowId]) clearTimeout(searchTimers.current[rowId]);

    if (value.length < 2) {
      updateRow(rowId, { searchResults: [] });
      return;
    }

    updateRow(rowId, { isSearching: true });
    searchTimers.current[rowId] = setTimeout(async () => {
      try {
        const result = await productsService.listProducts({ q: value, page_size: 10 });
        setRows((prev) =>
          prev.map((r) =>
            r.id === rowId
              ? { ...r, searchResults: result.items, showDropdown: true, isSearching: false }
              : r
          )
        );
      } catch {
        setRows((prev) =>
          prev.map((r) => (r.id === rowId ? { ...r, searchResults: [], isSearching: false } : r))
        );
      }
    }, 300);
  }

  async function handleSelectProduct(rowId: string, product: ProductListItem) {
    updateRow(rowId, {
      selectedProduct: product,
      searchQuery: product.name,
      showDropdown: false,
      searchResults: [],
      isLoadingDetail: true,
      selectedColor: "",
      quantities: {},
    });
    try {
      const detail = await productsService.getProductBySlug(product.slug);
      const colors = Array.from(
        new Set(detail.variants.map((v) => v.color).filter(Boolean))
      ) as string[];
      setRows((prev) =>
        prev.map((r) =>
          r.id === rowId
            ? { ...r, productDetail: detail, selectedColor: colors[0] ?? "", isLoadingDetail: false }
            : r
        )
      );
    } catch {
      setRows((prev) =>
        prev.map((r) => (r.id === rowId ? { ...r, isLoadingDetail: false } : r))
      );
    }
  }

  function handleQtyChange(rowId: string, size: string, value: string) {
    const qty = parseInt(value, 10);
    setRows((prev) =>
      prev.map((r) =>
        r.id === rowId
          ? { ...r, quantities: { ...r.quantities, [size]: isNaN(qty) || qty < 0 ? 0 : qty } }
          : r
      )
    );
  }

  // ── Add to cart ──────────────────────────────────────────────────────────
  async function handleAddToCart() {
    const activeRows = rows.filter((r) => r.productDetail && getRowTotals(r).units > 0);
    if (activeRows.length === 0) {
      setCartMsg({ type: "error", text: "Enter quantities in at least one row before adding to cart." });
      setTimeout(() => setCartMsg(null), 4000);
      return;
    }

    setIsAddingToCart(true);
    setCartMsg(null);
    let added = 0;
    let errors = 0;

    for (const row of activeRows) {
      const items = getRowSizes(row)
        .filter((size) => (row.quantities[size] ?? 0) > 0)
        .flatMap((size) => {
          const v = getVariant(row, size);
          const qty = row.quantities[size];
          if (!v || !qty) return [];
          return [{ variant_id: v.id, quantity: qty }];
        });

      if (items.length > 0) {
        try {
          await cartService.addMatrix(row.productDetail!.id, items);
          added++;
        } catch {
          errors++;
        }
      }
    }

    setIsAddingToCart(false);
    if (errors > 0) {
      setCartMsg({ type: "error", text: `${errors} product${errors !== 1 ? "s" : ""} failed to add.` });
    } else {
      setCartMsg({ type: "success", text: `${added} product${added !== 1 ? "s" : ""} added to cart.` });
    }
    setTimeout(() => setCartMsg(null), 5000);
  }

  // ── Row actions ──────────────────────────────────────────────────────────
  function deleteRow(id: string) {
    setRows((prev) => (prev.length === 1 ? [makeRow()] : prev.filter((r) => r.id !== id)));
  }

  function copyRow(id: string) {
    setRows((prev) => {
      const idx = prev.findIndex((r) => r.id === id);
      if (idx === -1) return prev;
      const src = prev[idx]!;
      const copy: QuickOrderRow = {
        searchQuery: src.searchQuery,
        selectedProduct: src.selectedProduct,
        productDetail: src.productDetail,
        showDropdown: false,
        searchResults: src.searchResults,
        selectedColor: src.selectedColor,
        isSearching: false,
        isLoadingDetail: false,
        id: Math.random().toString(36).slice(2),
        quantities: { ...src.quantities },
        checked: false,
      };
      return [...prev.slice(0, idx + 1), copy, ...prev.slice(idx + 1)];
    });
  }

  function deleteChecked() {
    setRows((prev) => {
      const remaining = prev.filter((r) => !r.checked);
      return remaining.length > 0 ? remaining : [makeRow()];
    });
  }

  const checkedCount = rows.filter((r) => r.checked).length;
  const grandTotals = rows.reduce(
    (acc, r) => {
      const t = getRowTotals(r);
      return { units: acc.units + t.units, price: acc.price + t.price };
    },
    { units: 0, price: 0 }
  );

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <div
      style={{ minHeight: "100vh", background: "#F4F3EF", fontFamily: "var(--font-jakarta)" }}
      onClick={() => setRows((prev) => prev.map((r) => ({ ...r, showDropdown: false })))}
    >
      {/* ── Page header ── */}
      <div
        style={{
          background: "#111016",
          padding: "28px 32px",
          borderBottom: "1px solid rgba(255,255,255,.06)",
        }}
      >
        <div
          style={{
            maxWidth: "1400px",
            margin: "0 auto",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: "12px",
          }}
        >
          <div>
            <div
              style={{
                fontSize: "11px",
                color: "#444",
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: ".1em",
                marginBottom: "4px",
              }}
            >
              Wholesale
            </div>
            <h1
              style={{
                fontFamily: "var(--font-bebas)",
                fontSize: "clamp(28px,3vw,40px)",
                color: "#fff",
                letterSpacing: ".02em",
                lineHeight: 1,
              }}
            >
              Quick Order
            </h1>
            <p style={{ fontSize: "13px", color: "#555", marginTop: "6px" }}>
              Search by style name or SKU, pick a color, enter quantities by size.
            </p>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
            {grandTotals.units > 0 && (
              <div
                style={{
                  fontSize: "13px",
                  color: "#888",
                  padding: "8px 14px",
                  background: "rgba(255,255,255,.05)",
                  borderRadius: "6px",
                  border: "1px solid rgba(255,255,255,.08)",
                }}
              >
                <span style={{ fontWeight: 700, color: "#fff" }}>{grandTotals.units}</span> units
                {" · "}
                <span style={{ fontWeight: 700, color: "#C9A84C" }}>
                  {formatCurrency(grandTotals.price)}
                </span>
              </div>
            )}
            <AddToCartBtn
              onClick={handleAddToCart}
              loading={isAddingToCart}
              disabled={grandTotals.units === 0}
            />
          </div>
        </div>
      </div>

      {/* ── Body ── */}
      <div style={{ maxWidth: "1400px", margin: "0 auto", padding: "24px 16px" }}>
        {/* Status message */}
        {cartMsg && (
          <div
            style={{
              padding: "12px 16px",
              borderRadius: "8px",
              fontSize: "13px",
              fontWeight: 600,
              marginBottom: "16px",
              display: "flex",
              alignItems: "center",
              gap: "10px",
              background:
                cartMsg.type === "success" ? "rgba(22,163,74,.1)" : "rgba(220,38,38,.1)",
              border: `1px solid ${
                cartMsg.type === "success" ? "rgba(22,163,74,.3)" : "rgba(220,38,38,.3)"
              }`,
              color: cartMsg.type === "success" ? "#16a34a" : "#dc2626",
            }}
          >
            {cartMsg.type === "success" ? "✓" : "✕"} {cartMsg.text}
            {cartMsg.type === "success" && (
              <Link
                href="/cart"
                style={{
                  marginLeft: "auto",
                  color: "#1A5CFF",
                  textDecoration: "none",
                  fontWeight: 700,
                  fontSize: "13px",
                }}
              >
                View Cart →
              </Link>
            )}
          </div>
        )}

        {/* Toolbar */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "10px",
            marginBottom: "10px",
            flexWrap: "wrap",
          }}
        >
          <span style={{ fontSize: "12px", color: "#7A7880" }}>
            {rows.length} style{rows.length !== 1 ? "s" : ""}
          </span>
          {checkedCount > 0 && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                deleteChecked();
              }}
              style={{
                padding: "6px 12px",
                fontSize: "12px",
                fontWeight: 700,
                color: "#dc2626",
                background: "rgba(220,38,38,.08)",
                border: "1px solid rgba(220,38,38,.2)",
                borderRadius: "5px",
                cursor: "pointer",
                textTransform: "uppercase",
                letterSpacing: ".05em",
              }}
            >
              Remove selected ({checkedCount})
            </button>
          )}
          <div style={{ marginLeft: "auto", display: "flex", gap: "16px", alignItems: "center" }}>
            <Link
              href="/products"
              style={{ fontSize: "12px", color: "#1A5CFF", textDecoration: "none", fontWeight: 600 }}
            >
              Browse Catalog →
            </Link>
            <Link
              href="/cart"
              style={{ fontSize: "12px", color: "#1A5CFF", textDecoration: "none", fontWeight: 600 }}
            >
              View Cart
            </Link>
          </div>
        </div>

        {/* Row list */}
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          {rows.map((row, rowIdx) => {
            const colors = getRowColors(row);
            const sizes = getRowSizes(row);
            const { units, price } = getRowTotals(row);

            return (
              <div
                key={row.id}
                onClick={(e) => e.stopPropagation()}
                style={{
                  background: "#fff",
                  borderRadius: "10px",
                  border: `1px solid ${row.checked ? "#1A5CFF" : "#E2E0DA"}`,
                  overflow: "visible",
                  boxShadow: row.checked ? "0 0 0 2px rgba(26,92,255,.1)" : "none",
                  transition: "border-color .15s, box-shadow .15s",
                }}
              >
                {/* ── Top bar: search + color ── */}
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "10px",
                    padding: "12px 14px",
                    borderBottom: sizes.length > 0 ? "1px solid #F4F3EF" : "none",
                    flexWrap: "wrap",
                  }}
                >
                  {/* Checkbox */}
                  <input
                    type="checkbox"
                    checked={row.checked}
                    onChange={(e) => updateRow(row.id, { checked: e.target.checked })}
                    style={{
                      width: "15px",
                      height: "15px",
                      cursor: "pointer",
                      flexShrink: 0,
                      accentColor: "#1A5CFF",
                    }}
                  />

                  {/* Row number */}
                  <span
                    style={{
                      fontSize: "11px",
                      fontWeight: 700,
                      color: "#bbb",
                      minWidth: "16px",
                      flexShrink: 0,
                    }}
                  >
                    {rowIdx + 1}
                  </span>

                  {/* Search field */}
                  <div style={{ position: "relative", flex: "1 1 220px", minWidth: "180px" }}>
                    <div style={{ position: "relative" }}>
                      <svg
                        width="13"
                        height="13"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="#7A7880"
                        strokeWidth={2.5}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        style={{
                          position: "absolute",
                          left: "10px",
                          top: "50%",
                          transform: "translateY(-50%)",
                          pointerEvents: "none",
                        }}
                      >
                        <circle cx="11" cy="11" r="8" />
                        <line x1="21" y1="21" x2="16.65" y2="16.65" />
                      </svg>
                      <input
                        type="text"
                        value={row.searchQuery}
                        onChange={(e) => handleSearchChange(row.id, e.target.value)}
                        onBlur={() =>
                          setTimeout(() => updateRow(row.id, { showDropdown: false }), 150)
                        }
                        onFocus={() => {
                          if (row.searchResults.length > 0 && !row.selectedProduct)
                            updateRow(row.id, { showDropdown: true });
                        }}
                        placeholder="Style # or product name…"
                        style={{
                          width: "100%",
                          padding: "8px 30px 8px 30px",
                          fontSize: "13px",
                          border: "1px solid #E2E0DA",
                          borderRadius: "6px",
                          outline: "none",
                          boxSizing: "border-box",
                          background: row.selectedProduct ? "#F8F7F5" : "#fff",
                          color: "#2A2830",
                        }}
                      />
                      {(row.isSearching || row.isLoadingDetail) && (
                        <svg
                          width="14"
                          height="14"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke={row.isLoadingDetail ? "#1A5CFF" : "#7A7880"}
                          strokeWidth={2.5}
                          style={{
                            position: "absolute",
                            right: "10px",
                            top: "50%",
                            transform: "translateY(-50%)",
                            animation: "spin 1s linear infinite",
                          }}
                        >
                          <path d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" opacity={0.25} />
                          <path d="M21 12a9 9 0 00-9-9" />
                        </svg>
                      )}
                    </div>

                    {/* Autocomplete dropdown */}
                    {row.showDropdown && (
                      <div
                        style={{
                          position: "absolute",
                          top: "calc(100% + 4px)",
                          left: 0,
                          right: 0,
                          background: "#fff",
                          border: "1px solid #E2E0DA",
                          borderRadius: "8px",
                          boxShadow: "0 8px 24px rgba(0,0,0,.12)",
                          zIndex: 200,
                          overflow: "hidden",
                          maxHeight: "300px",
                          overflowY: "auto",
                        }}
                      >
                        {row.searchResults.length > 0 ? (
                          row.searchResults.map((product) => {
                            const img = product.primary_image;
                            const unitPrice =
                              product.variants[0]?.effective_price ??
                              product.variants[0]?.retail_price;
                            return (
                              <button
                                key={product.id}
                                onMouseDown={(e) => {
                                  e.preventDefault();
                                  handleSelectProduct(row.id, product);
                                }}
                                style={{
                                  width: "100%",
                                  display: "flex",
                                  alignItems: "center",
                                  gap: "10px",
                                  padding: "10px 12px",
                                  background: "none",
                                  border: "none",
                                  borderBottom: "1px solid #F4F3EF",
                                  cursor: "pointer",
                                  textAlign: "left",
                                  transition: "background .1s",
                                }}
                                onMouseEnter={(e) =>
                                  ((e.currentTarget as HTMLButtonElement).style.background = "#F4F3EF")
                                }
                                onMouseLeave={(e) =>
                                  ((e.currentTarget as HTMLButtonElement).style.background = "none")
                                }
                              >
                                <div
                                  style={{
                                    width: "40px",
                                    height: "40px",
                                    flexShrink: 0,
                                    borderRadius: "5px",
                                    overflow: "hidden",
                                    background: "#F4F3EF",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                  }}
                                >
                                  {img ? (
                                    <Image
                                      src={img.url_thumbnail_webp ?? img.url_thumbnail}
                                      alt={img.alt_text ?? product.name}
                                      width={40}
                                      height={40}
                                      style={{ objectFit: "cover" }}
                                    />
                                  ) : (
                                    <span style={{ fontSize: "18px" }}>👕</span>
                                  )}
                                </div>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                  <div
                                    style={{
                                      fontSize: "13px",
                                      fontWeight: 700,
                                      color: "#2A2830",
                                      overflow: "hidden",
                                      textOverflow: "ellipsis",
                                      whiteSpace: "nowrap",
                                    }}
                                  >
                                    {product.name}
                                  </div>
                                  <div style={{ fontSize: "11px", color: "#7A7880" }}>
                                    {product.variants[0]?.sku ?? product.slug}
                                    {product.categories[0] && (
                                      <span style={{ marginLeft: "6px" }}>
                                        · {product.categories[0].name}
                                      </span>
                                    )}
                                  </div>
                                </div>
                                {unitPrice && (
                                  <div
                                    style={{
                                      fontSize: "13px",
                                      fontWeight: 700,
                                      color: "#E8242A",
                                      flexShrink: 0,
                                    }}
                                  >
                                    {formatCurrency(parseFloat(unitPrice))}
                                  </div>
                                )}
                              </button>
                            );
                          })
                        ) : (
                          <div
                            style={{
                              padding: "16px",
                              fontSize: "13px",
                              color: "#7A7880",
                              textAlign: "center",
                            }}
                          >
                            No products found for &quot;{row.searchQuery}&quot;
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Product thumbnail (after selection) */}
                  {row.selectedProduct?.primary_image && (
                    <div
                      style={{
                        width: "34px",
                        height: "34px",
                        flexShrink: 0,
                        borderRadius: "5px",
                        overflow: "hidden",
                      }}
                    >
                      <Image
                        src={
                          row.selectedProduct.primary_image.url_thumbnail_webp ??
                          row.selectedProduct.primary_image.url_thumbnail
                        }
                        alt={row.selectedProduct.name}
                        width={34}
                        height={34}
                        style={{ objectFit: "cover" }}
                      />
                    </div>
                  )}

                  {/* Color dropdown */}
                  {colors.length > 0 && (
                    <select
                      value={row.selectedColor}
                      onChange={(e) =>
                        updateRow(row.id, { selectedColor: e.target.value, quantities: {} })
                      }
                      style={{
                        flex: "0 1 160px",
                        minWidth: "120px",
                        padding: "8px 10px",
                        fontSize: "13px",
                        border: "1px solid #E2E0DA",
                        borderRadius: "6px",
                        outline: "none",
                        background: "#fff",
                        color: "#2A2830",
                        cursor: "pointer",
                      }}
                    >
                      {colors.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                  )}

                  {/* Row actions */}
                  <div
                    style={{ display: "flex", gap: "4px", marginLeft: "auto", flexShrink: 0 }}
                  >
                    <ActionBtn
                      title="Duplicate row"
                      onClick={() => copyRow(row.id)}
                      icon={
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                          <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                          <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
                        </svg>
                      }
                    />
                    <ActionBtn
                      title="Remove row"
                      onClick={() => deleteRow(row.id)}
                      danger
                      icon={
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="3 6 5 6 21 6" />
                          <path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6" />
                          <path d="M10 11v6M14 11v6" />
                          <path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2" />
                        </svg>
                      }
                    />
                  </div>
                </div>

                {/* ── Size quantity grid ── */}
                {sizes.length > 0 && (
                  <div style={{ padding: "10px 14px 14px", overflowX: "auto" }}>
                    <table style={{ borderCollapse: "collapse", fontSize: "13px" }}>
                      <thead>
                        <tr>
                          {sizes.map((size) => {
                            const v = getVariant(row, size);
                            const unitPrice = v?.effective_price ?? v?.retail_price;
                            return (
                              <th
                                key={size}
                                style={{ padding: "0 4px 6px", textAlign: "center", minWidth: "58px" }}
                              >
                                <div
                                  style={{
                                    fontFamily: "var(--font-bebas)",
                                    fontSize: "14px",
                                    color: "#2A2830",
                                    letterSpacing: ".06em",
                                  }}
                                >
                                  {size}
                                </div>
                                {unitPrice && (
                                  <div
                                    style={{
                                      fontSize: "10px",
                                      color: "#7A7880",
                                      fontWeight: 400,
                                    }}
                                  >
                                    {formatCurrency(parseFloat(unitPrice))}
                                  </div>
                                )}
                              </th>
                            );
                          })}
                          {/* Total column */}
                          <th
                            style={{
                              padding: "0 4px 6px",
                              textAlign: "right",
                              minWidth: "90px",
                              paddingLeft: "16px",
                              borderLeft: "1px solid #F4F3EF",
                            }}
                          >
                            <div
                              style={{
                                fontFamily: "var(--font-bebas)",
                                fontSize: "14px",
                                color: "#2A2830",
                                letterSpacing: ".06em",
                              }}
                            >
                              Total
                            </div>
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          {sizes.map((size) => {
                            const qty = row.quantities[size] ?? 0;
                            return (
                              <td
                                key={size}
                                style={{ padding: "0 4px", textAlign: "center" }}
                              >
                                <input
                                  type="number"
                                  min={0}
                                  value={qty === 0 ? "" : qty}
                                  onChange={(e) =>
                                    handleQtyChange(row.id, size, e.target.value)
                                  }
                                  placeholder="0"
                                  style={{
                                    width: "52px",
                                    padding: "7px 4px",
                                    textAlign: "center",
                                    fontSize: "14px",
                                    fontWeight: 600,
                                    border: qty > 0 ? "1.5px solid #1A5CFF" : "1px solid #E2E0DA",
                                    borderRadius: "5px",
                                    outline: "none",
                                    background:
                                      qty > 0 ? "rgba(26,92,255,.04)" : "#fff",
                                    color: "#2A2830",
                                    transition: "border-color .15s",
                                    MozAppearance: "textfield",
                                  }}
                                />
                              </td>
                            );
                          })}
                          {/* Total */}
                          <td
                            style={{
                              padding: "0 4px 0 16px",
                              textAlign: "right",
                              borderLeft: "1px solid #F4F3EF",
                              verticalAlign: "middle",
                            }}
                          >
                            {units > 0 ? (
                              <div>
                                <div
                                  style={{
                                    fontWeight: 700,
                                    fontSize: "15px",
                                    color: "#2A2830",
                                  }}
                                >
                                  {units}{" "}
                                  <span
                                    style={{
                                      fontSize: "10px",
                                      color: "#7A7880",
                                      fontWeight: 400,
                                    }}
                                  >
                                    units
                                  </span>
                                </div>
                                <div
                                  style={{
                                    fontWeight: 700,
                                    fontSize: "13px",
                                    color: "#E8242A",
                                  }}
                                >
                                  {formatCurrency(price)}
                                </div>
                              </div>
                            ) : (
                              <span style={{ fontSize: "12px", color: "#ddd" }}>—</span>
                            )}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                )}

                {/* Row hint */}
                {!row.selectedProduct && !row.isLoadingDetail && (
                  <div
                    style={{
                      padding: "8px 14px 12px 42px",
                      fontSize: "12px",
                      color: "#bbb",
                    }}
                  >
                    Search for a style above
                  </div>
                )}
                {row.isLoadingDetail && (
                  <div
                    style={{
                      padding: "8px 14px 12px 42px",
                      fontSize: "12px",
                      color: "#7A7880",
                    }}
                  >
                    Loading product details…
                  </div>
                )}
                {row.selectedProduct && !row.isLoadingDetail && sizes.length === 0 && colors.length > 0 && (
                  <div
                    style={{
                      padding: "8px 14px 12px 42px",
                      fontSize: "12px",
                      color: "#7A7880",
                    }}
                  >
                    Select a color to see sizes
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* ── Footer actions ── */}
        <div
          style={{
            marginTop: "10px",
            display: "flex",
            gap: "10px",
            alignItems: "center",
            flexWrap: "wrap",
          }}
        >
          <button
            onClick={() => setRows((prev) => [...prev, makeRow()])}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              padding: "10px 18px",
              background: "#fff",
              border: "1.5px dashed #E2E0DA",
              borderRadius: "8px",
              fontSize: "13px",
              fontWeight: 700,
              color: "#7A7880",
              cursor: "pointer",
              textTransform: "uppercase",
              letterSpacing: ".05em",
              transition: "all .2s",
            }}
            onMouseEnter={(e) => {
              const b = e.currentTarget as HTMLButtonElement;
              b.style.borderColor = "#1A5CFF";
              b.style.color = "#1A5CFF";
            }}
            onMouseLeave={(e) => {
              const b = e.currentTarget as HTMLButtonElement;
              b.style.borderColor = "#E2E0DA";
              b.style.color = "#7A7880";
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            Add Style
          </button>

          {grandTotals.units > 0 && (
            <>
              <div style={{ flex: 1 }} />
              <div
                style={{ fontSize: "14px", fontWeight: 700, color: "#2A2830" }}
              >
                {grandTotals.units} units &nbsp;·&nbsp;{" "}
                <span style={{ color: "#E8242A" }}>{formatCurrency(grandTotals.price)}</span>
              </div>
              <AddToCartBtn
                onClick={handleAddToCart}
                loading={isAddingToCart}
                disabled={false}
              />
            </>
          )}
        </div>

        {/* ── Help bar ── */}
        <div
          style={{
            marginTop: "28px",
            padding: "16px 20px",
            background: "#fff",
            borderRadius: "10px",
            border: "1px solid #E2E0DA",
            display: "flex",
            gap: "20px",
            flexWrap: "wrap",
            alignItems: "center",
          }}
        >
          <div style={{ fontSize: "12px", color: "#7A7880", lineHeight: 1.5 }}>
            <strong style={{ color: "#2A2830" }}>Tip:</strong> Type min. 2 characters to
            search. Select a color then enter per-size quantities. All rows are added
            together when you click &ldquo;Add to Shopping Box&rdquo;.
          </div>
          <div style={{ marginLeft: "auto", display: "flex", gap: "16px", flexWrap: "wrap" }}>
            {[
              { label: "Browse Catalog", href: "/products" },
              { label: "Order History", href: "/account/orders" },
              { label: "Addresses", href: "/account/addresses" },
            ].map((link) => (
              <Link
                key={link.href}
                href={link.href}
                style={{
                  fontSize: "12px",
                  color: "#1A5CFF",
                  textDecoration: "none",
                  fontWeight: 600,
                }}
              >
                {link.label}
              </Link>
            ))}
          </div>
        </div>
      </div>

      <style>{`
        @keyframes spin { to { transform: translateY(-50%) rotate(360deg); } }
        input[type=number]::-webkit-inner-spin-button,
        input[type=number]::-webkit-outer-spin-button { -webkit-appearance: none; }
      `}</style>
    </div>
  );
}

// ─── Small reusable sub-components ────────────────────────────────────────────
function AddToCartBtn({
  onClick,
  loading,
  disabled,
}: {
  onClick: () => void;
  loading: boolean;
  disabled: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={loading || disabled}
      style={{
        background: disabled ? "#ccc" : "#1A5CFF",
        color: disabled ? "#888" : "#fff",
        padding: "11px 22px",
        fontSize: "13px",
        fontWeight: 700,
        borderRadius: "6px",
        border: "none",
        cursor: disabled || loading ? "not-allowed" : "pointer",
        textTransform: "uppercase",
        letterSpacing: ".06em",
        transition: "background .2s",
        whiteSpace: "nowrap",
      }}
    >
      {loading ? "Adding…" : "Add to Shopping Box"}
    </button>
  );
}

function ActionBtn({
  title,
  onClick,
  icon,
  danger = false,
}: {
  title: string;
  onClick: () => void;
  icon: React.ReactNode;
  danger?: boolean;
}) {
  const [hovered, setHovered] = useState(false);
  return (
    <button
      title={title}
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        padding: "7px 9px",
        background: hovered ? (danger ? "rgba(220,38,38,.06)" : "#F4F3EF") : "none",
        border: `1px solid ${
          hovered
            ? danger
              ? "rgba(220,38,38,.25)"
              : "#ccc"
            : "#E2E0DA"
        }`,
        borderRadius: "5px",
        cursor: "pointer",
        color: hovered && danger ? "#dc2626" : "#7A7880",
        transition: "all .15s",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {icon}
    </button>
  );
}
