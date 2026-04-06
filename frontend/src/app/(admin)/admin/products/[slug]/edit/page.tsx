"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { adminService } from "@/services/admin.service";
import { productsService } from "@/services/products.service";
import type { Category, ProductDetail, ProductVariant } from "@/types/product.types";

// ── Style constants ────────────────────────────────────────────────────────
const labelStyle: React.CSSProperties = {
  fontSize: "11px", fontWeight: 700, textTransform: "uppercase",
  letterSpacing: ".08em", color: "#7A7880", marginBottom: "6px", display: "block",
};
const inputStyle: React.CSSProperties = {
  width: "100%", padding: "10px 14px", border: "1.5px solid #E2E0DA", borderRadius: "8px",
  fontSize: "14px", fontFamily: "var(--font-jakarta)", outline: "none", boxSizing: "border-box",
};
const sectionCard: React.CSSProperties = {
  background: "#fff", border: "1px solid #E2E0DA", borderRadius: "10px",
  padding: "24px", marginBottom: "16px",
};
const sectionTitle: React.CSSProperties = {
  fontFamily: "var(--font-bebas)", fontSize: "16px", letterSpacing: ".08em",
  color: "#2A2830", marginBottom: "16px", display: "block",
};
const thStyle: React.CSSProperties = {
  padding: "10px 16px", textAlign: "left", fontSize: "11px", textTransform: "uppercase",
  letterSpacing: ".06em", color: "#7A7880", fontWeight: 700,
};

const COLOR_MAP: Record<string, string> = {
  White: "#FFFFFF", Black: "#111111", Grey: "#9CA3AF", "Sport Grey": "#9CA3AF",
  Navy: "#1e3a5f", Red: "#E8242A", Blue: "#1A5CFF", "Light Blue": "#7DD3FC",
  "Stonewash Blue": "#5b8fa8", Forest: "#1B4332", Green: "#16a34a",
  Yellow: "#EAB308", Orange: "#F97316", Purple: "#9333EA", Pink: "#EC4899",
  Brown: "#92400E",
};

interface VariantGroup {
  color: string;
  variants: ProductVariant[];
}

export default function AdminProductEditPage() {
  const { slug } = useParams<{ slug: string }>();
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [product, setProduct] = useState<ProductDetail | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState("");
  const [categories, setCategories] = useState<Category[]>([]);
  const [editSEO, setEditSEO] = useState(false);

  // Variant expand state
  const [expandedGroups, setExpandedGroups] = useState<string[]>([]);
  const [expandAll, setExpandAll] = useState(false);

  // Variant local edits: variantId → field overrides
  const [variantEdits, setVariantEdits] = useState<Record<string, Record<string, string>>>({});

  async function load() {
    setIsLoading(true);
    setLoadError(null);
    try {
      const [p, cats] = await Promise.all([
        adminService.getProduct(slug),
        productsService.getCategories().catch(() => [] as Category[]),
      ]);
      if (!p) {
        setLoadError("Product not returned by API");
        return;
      }
      setProduct(p);
      setCategories(cats ?? []);
      if (p.variants?.length) {
        const firstColor = p.variants[0]?.color ?? "No Color";
        setExpandedGroups([firstColor]);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setLoadError(msg);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => { load(); }, [slug]); // eslint-disable-line

  const groupedVariants = useMemo<VariantGroup[]>(() => {
    if (!product?.variants) return [];
    const map: Record<string, ProductVariant[]> = {};
    product.variants.forEach(v => {
      const color = v.color ?? "No Color";
      if (!map[color]) map[color] = [];
      map[color].push(v);
    });
    return Object.entries(map).map(([color, variants]) => ({ color, variants }));
  }, [product?.variants]);

  function toggleGroup(color: string) {
    setExpandedGroups(prev =>
      prev.includes(color) ? prev.filter(c => c !== color) : [...prev, color]
    );
  }

  function updateVariantEdit(id: string, field: string, value: string) {
    setVariantEdits(prev => ({ ...prev, [id]: { ...(prev[id] ?? {}), [field]: value } }));
  }

  function getVariantValue(v: ProductVariant, field: keyof ProductVariant): string {
    const edit = variantEdits[v.id]?.[field];
    if (edit !== undefined) return edit;
    const val = v[field];
    return val == null ? "" : String(val);
  }

  async function saveVariant(variantId: string) {
    if (!product || !variantEdits[variantId]) return;
    await adminService.updateVariant(product.id, variantId, variantEdits[variantId]);
  }

  async function handleDeleteVariant(variantId: string) {
    if (!product) return;
    if (!confirm("Mark this variant as discontinued?")) return;
    await adminService.deleteVariant(product.id, variantId);
    setProduct(prev => prev ? {
      ...prev,
      variants: prev.variants.filter(v => v.id !== variantId),
    } : prev);
  }

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    if (!product || !e.target.files?.length) return;
    const file = e.target.files[0]!;
    await adminService.uploadImage(product.id, file);
    await load();
    e.target.value = "";
  }

  async function handleDeleteImage(imageId: string) {
    if (!product) return;
    await adminService.deleteImage(product.id, imageId);
    setProduct(prev => prev ? {
      ...prev,
      images: prev.images.filter(img => img.id !== imageId),
    } : prev);
  }

  async function handleSave() {
    if (!product) return;
    setIsSaving(true);
    setSaveMsg("");
    try {
      // Save all dirty variant edits in parallel
      const variantSaves = Object.keys(variantEdits).map(vid => saveVariant(vid));
      // Save product fields
      const productSave = adminService.updateProduct(product.id, {
        name: product.name,
        description: product.description,
        status: product.status,
        moq: product.moq,
        meta_title: product.meta_title,
        meta_description: product.meta_description,
        product_type: product.product_type,
        vendor: product.vendor,
        tags: product.tags,
        category_ids: product.categories.map(c => c.id),
      });
      await Promise.all([...variantSaves, productSave]);
      setVariantEdits({});
      setSaveMsg("Saved!");
      await load();
    } finally {
      setIsSaving(false);
      setTimeout(() => setSaveMsg(""), 2500);
    }
  }

  function addTag(tag: string) {
    const trimmed = tag.trim();
    if (!trimmed || !product) return;
    setProduct(p => p ? { ...p, tags: [...(p.tags ?? []), trimmed] } : p);
  }

  function removeTag(tag: string) {
    if (!product) return;
    setProduct(p => p ? { ...p, tags: (p.tags ?? []).filter(t => t !== tag) } : p);
  }

  if (isLoading) {
    return (
      <div style={{ fontFamily: "var(--font-jakarta)", display: "flex", alignItems: "center", justifyContent: "center", height: "300px", color: "#aaa", fontSize: "14px" }}>
        Loading product…
      </div>
    );
  }

  if (!product) {
    return (
      <div style={{ fontFamily: "var(--font-jakarta)", padding: "48px", textAlign: "center" }}>
        <div style={{ fontSize: "32px", marginBottom: "12px" }}>🔍</div>
        <div style={{ fontSize: "16px", color: "#2A2830", fontWeight: 600 }}>
          {loadError ? "Error loading product" : "Product not found"}
        </div>
        {loadError && (
          <div style={{ marginTop: "8px", fontSize: "13px", color: "#E8242A", background: "rgba(232,36,42,.06)", padding: "10px 16px", borderRadius: "8px", display: "inline-block", maxWidth: "480px" }}>
            {loadError}
          </div>
        )}
        <div style={{ marginTop: "16px", display: "flex", gap: "10px", justifyContent: "center" }}>
          <button
            onClick={() => load()}
            style={{ padding: "10px 20px", background: "#F4F3EF", color: "#2A2830", border: "1px solid #E2E0DA", borderRadius: "8px", cursor: "pointer", fontWeight: 600 }}
          >
            Retry
          </button>
          <button
            onClick={() => router.push("/admin/products")}
            style={{ padding: "10px 20px", background: "#1A5CFF", color: "#fff", border: "none", borderRadius: "8px", cursor: "pointer", fontWeight: 600 }}
          >
            Back to Products
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ fontFamily: "var(--font-jakarta)" }}>
      {/* Top Bar */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
        <div>
          <button
            onClick={() => router.push("/admin/products")}
            style={{ background: "none", border: "none", color: "#7A7880", cursor: "pointer", fontSize: "13px", padding: 0, display: "flex", alignItems: "center", gap: "4px", marginBottom: "4px" }}
          >
            ← Products
          </button>
          <h1 style={{ fontFamily: "var(--font-bebas)", fontSize: "28px", color: "#2A2830", letterSpacing: ".02em", lineHeight: 1 }}>
            {product.name}
          </h1>
        </div>
        <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
          {saveMsg && <span style={{ color: "#059669", fontSize: "13px", fontWeight: 600 }}>{saveMsg}</span>}
          <button
            onClick={() => router.push(`/products/${product.slug}`)}
            style={{ padding: "10px 14px", border: "1px solid #E2E0DA", borderRadius: "8px", background: "#fff", fontSize: "13px", cursor: "pointer", fontWeight: 600 }}
          >
            👁 Preview
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving}
            style={{ padding: "10px 24px", background: "#1A5CFF", color: "#fff", border: "none", borderRadius: "8px", fontWeight: 700, cursor: isSaving ? "not-allowed" : "pointer", opacity: isSaving ? 0.7 : 1, fontSize: "14px" }}
          >
            {isSaving ? "Saving…" : "Save"}
          </button>
        </div>
      </div>

      {/* 2-column layout */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 340px", gap: "16px", alignItems: "start" }}>

        {/* ── LEFT COLUMN ────────────────────────────────────────────────── */}
        <div>

          {/* Title & Description */}
          <div style={sectionCard}>
            <div style={{ marginBottom: "18px" }}>
              <label style={labelStyle}>Title <span style={{ color: "#E8242A" }}>*</span></label>
              <input
                value={product.name}
                onChange={e => setProduct(p => p ? { ...p, name: e.target.value } : p)}
                style={{ ...inputStyle, fontSize: "16px", fontWeight: 600 }}
              />
            </div>
            <div>
              <label style={labelStyle}>Description</label>
              <textarea
                value={product.description ?? ""}
                onChange={e => setProduct(p => p ? { ...p, description: e.target.value } : p)}
                rows={6}
                style={{ ...inputStyle, resize: "vertical", lineHeight: 1.6 }}
              />
              <div style={{ fontSize: "11px", color: "#aaa", marginTop: "4px" }}>
                {product.description?.length ?? 0} characters
              </div>
            </div>
          </div>

          {/* Media */}
          <div style={sectionCard}>
            <span style={sectionTitle}>MEDIA</span>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "10px", marginBottom: "8px" }}>
              {product.images?.map((img, i) => (
                <div key={img.id} style={{ aspectRatio: "1", borderRadius: "8px", overflow: "hidden", border: "1px solid #E2E0DA", position: "relative", background: "#f5f5f5" }}>
                  <img src={img.url_medium} alt={img.alt_text ?? product.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  <button
                    onClick={() => handleDeleteImage(img.id)}
                    style={{ position: "absolute", top: "4px", right: "4px", background: "rgba(0,0,0,.6)", color: "#fff", border: "none", borderRadius: "50%", width: "22px", height: "22px", cursor: "pointer", fontSize: "11px", lineHeight: 1, display: "flex", alignItems: "center", justifyContent: "center" }}
                  >✕</button>
                  {i === 0 && (
                    <div style={{ position: "absolute", bottom: "4px", left: "4px", background: "#1A5CFF", color: "#fff", fontSize: "9px", fontWeight: 700, padding: "2px 6px", borderRadius: "3px" }}>PRIMARY</div>
                  )}
                </div>
              ))}

              {/* Upload tile */}
              <div
                onClick={() => fileInputRef.current?.click()}
                style={{ aspectRatio: "1", borderRadius: "8px", border: "2px dashed #E2E0DA", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", cursor: "pointer", background: "#FAFAFA", transition: "border-color .2s" }}
                onMouseEnter={e => (e.currentTarget.style.borderColor = "#1A5CFF")}
                onMouseLeave={e => (e.currentTarget.style.borderColor = "#E2E0DA")}
              >
                <span style={{ fontSize: "24px", marginBottom: "4px", color: "#aaa" }}>+</span>
                <span style={{ fontSize: "11px", color: "#7A7880" }}>Add media</span>
              </div>
              <input ref={fileInputRef} type="file" accept="image/*" multiple style={{ display: "none" }} onChange={handleImageUpload} />
            </div>
            {product.images?.length === 0 && (
              <p style={{ fontSize: "12px", color: "#aaa", textAlign: "center", padding: "8px 0" }}>
                No images yet. Click + to upload.
              </p>
            )}
          </div>

          {/* Variants */}
          <div style={sectionCard}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
              <span style={{ ...sectionTitle, marginBottom: 0 }}>VARIANTS</span>
              <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                <button
                  onClick={() => setExpandAll(v => !v)}
                  style={{ padding: "6px 14px", border: "1px solid #E2E0DA", borderRadius: "6px", fontSize: "12px", fontWeight: 600, cursor: "pointer", background: "#fff" }}
                >
                  {expandAll ? "Collapse All" : "Expand All"}
                </button>
                <button
                  onClick={() => router.push(`/admin/products/${slug}/edit#variants`)}
                  style={{ padding: "6px 14px", background: "#1A5CFF", color: "#fff", border: "none", borderRadius: "6px", fontSize: "12px", fontWeight: 700, cursor: "pointer" }}
                >
                  + Add Variant
                </button>
              </div>
            </div>

            {groupedVariants.length === 0 ? (
              <div style={{ padding: "32px", textAlign: "center", color: "#aaa", fontSize: "13px" }}>
                No variants yet. Use the bulk generate tool to create color/size variants.
              </div>
            ) : groupedVariants.map(group => (
              <div key={group.color} style={{ border: "1px solid #E2E0DA", borderRadius: "8px", marginBottom: "10px", overflow: "hidden" }}>
                {/* Color header */}
                <div
                  onClick={() => toggleGroup(group.color)}
                  style={{ display: "flex", alignItems: "center", gap: "12px", padding: "12px 16px", cursor: "pointer", background: "#F4F3EF", userSelect: "none" }}
                >
                  <div style={{ width: "20px", height: "20px", borderRadius: "50%", background: COLOR_MAP[group.color] ?? "#888", border: "1.5px solid rgba(0,0,0,.1)", flexShrink: 0 }} />
                  <span style={{ fontWeight: 700, fontSize: "14px", color: "#2A2830" }}>{group.color}</span>
                  <span style={{ fontSize: "12px", color: "#7A7880" }}>({group.variants.length} sizes)</span>
                  <span style={{ marginLeft: "auto", fontSize: "12px", color: "#7A7880" }}>
                    Stock: {group.variants.reduce((s, v) => s + (v.stock_quantity ?? 0), 0)} units
                  </span>
                  <span style={{ fontSize: "12px", color: "#aaa", transform: (expandAll || expandedGroups.includes(group.color)) ? "rotate(180deg)" : "rotate(0)", transition: "transform .2s", display: "inline-block" }}>▼</span>
                </div>

                {/* Variants table */}
                {(expandAll || expandedGroups.includes(group.color)) && (
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
                    <thead>
                      <tr style={{ borderBottom: "1px solid #E2E0DA", background: "#FAFAFA" }}>
                        {["Size", "SKU", "Price", "Compare Price", "Stock", ""].map(h => (
                          <th key={h} style={thStyle}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {group.variants.map(variant => (
                        <tr key={variant.id} style={{ borderBottom: "1px solid #F4F3EF" }}>
                          <td style={{ padding: "10px 16px", fontWeight: 700, fontSize: "13px" }}>{variant.size ?? "—"}</td>
                          <td style={{ padding: "10px 16px" }}>
                            <input
                              value={getVariantValue(variant, "sku")}
                              onChange={e => updateVariantEdit(variant.id, "sku", e.target.value)}
                              onBlur={() => saveVariant(variant.id)}
                              style={{ padding: "6px 10px", border: "1px solid #E2E0DA", borderRadius: "5px", fontSize: "12px", width: "130px" }}
                            />
                          </td>
                          <td style={{ padding: "10px 16px" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                              <span style={{ color: "#aaa", fontSize: "13px" }}>$</span>
                              <input
                                type="number"
                                value={getVariantValue(variant, "retail_price")}
                                onChange={e => updateVariantEdit(variant.id, "retail_price", e.target.value)}
                                onBlur={() => saveVariant(variant.id)}
                                style={{ padding: "6px 8px", border: "1px solid #E2E0DA", borderRadius: "5px", fontSize: "12px", width: "80px" }}
                              />
                            </div>
                          </td>
                          <td style={{ padding: "10px 16px" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                              <span style={{ color: "#aaa", fontSize: "13px" }}>$</span>
                              <input
                                type="number"
                                value={getVariantValue(variant, "compare_price")}
                                onChange={e => updateVariantEdit(variant.id, "compare_price", e.target.value)}
                                onBlur={() => saveVariant(variant.id)}
                                placeholder="0.00"
                                style={{ padding: "6px 8px", border: "1px solid #E2E0DA", borderRadius: "5px", fontSize: "12px", width: "80px" }}
                              />
                            </div>
                          </td>
                          <td style={{ padding: "10px 16px" }}>
                            <input
                              type="number"
                              value={getVariantValue(variant, "stock_quantity")}
                              onChange={e => updateVariantEdit(variant.id, "stock_quantity", e.target.value)}
                              onBlur={() => saveVariant(variant.id)}
                              style={{ padding: "6px 8px", border: "1px solid #E2E0DA", borderRadius: "5px", fontSize: "12px", width: "70px", textAlign: "center" }}
                            />
                          </td>
                          <td style={{ padding: "10px 16px" }}>
                            <button
                              onClick={() => handleDeleteVariant(variant.id)}
                              style={{ background: "none", border: "none", cursor: "pointer", color: "#E8242A", fontSize: "16px", padding: "2px 4px" }}
                            >🗑</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            ))}
          </div>

        </div>

        {/* ── RIGHT SIDEBAR ──────────────────────────────────────────────── */}
        <div>

          {/* Status Card */}
          <div style={sectionCard}>
            <span style={sectionTitle}>STATUS</span>
            <select
              value={product.status}
              onChange={e => setProduct(p => p ? { ...p, status: e.target.value as ProductDetail["status"] } : p)}
              style={{ ...inputStyle, background: "#fff" }}
            >
              <option value="active">● Active</option>
              <option value="draft">○ Draft</option>
              <option value="archived">✕ Archived</option>
            </select>
            <div style={{ marginTop: "12px", display: "flex", gap: "8px" }}>
              <button
                onClick={handleSave}
                disabled={isSaving}
                style={{ flex: 1, padding: "10px", background: "#1A5CFF", color: "#fff", border: "none", borderRadius: "8px", fontWeight: 700, cursor: "pointer", fontSize: "14px", opacity: isSaving ? 0.7 : 1 }}
              >
                {isSaving ? "Saving…" : "Save"}
              </button>
              <button
                onClick={() => router.push(`/products/${product.slug}`)}
                style={{ padding: "10px 14px", border: "1px solid #E2E0DA", borderRadius: "8px", background: "#fff", cursor: "pointer", fontSize: "13px" }}
              >
                👁
              </button>
            </div>
          </div>

          {/* Product Organization */}
          <div style={sectionCard}>
            <span style={sectionTitle}>PRODUCT ORGANIZATION</span>

            <div style={{ marginBottom: "14px" }}>
              <label style={labelStyle}>Product Type</label>
              <input
                value={product.product_type ?? ""}
                onChange={e => setProduct(p => p ? { ...p, product_type: e.target.value } : p)}
                placeholder="e.g. T-Shirt, Hoodie"
                style={inputStyle}
              />
            </div>

            <div style={{ marginBottom: "14px" }}>
              <label style={labelStyle}>Vendor</label>
              <input
                value={product.vendor ?? ""}
                onChange={e => setProduct(p => p ? { ...p, vendor: e.target.value } : p)}
                placeholder="e.g. AF Apparels"
                style={inputStyle}
              />
            </div>

            <div style={{ marginBottom: "14px" }}>
              <label style={labelStyle}>Category</label>
              <select
                value={product.categories?.[0]?.id ?? ""}
                onChange={e => {
                  const cat = categories.find(c => c.id === e.target.value);
                  setProduct(p => p ? { ...p, categories: cat ? [cat] : [] } : p);
                }}
                style={{ ...inputStyle, background: "#fff" }}
              >
                <option value="">Select category…</option>
                {categories.map(cat => (
                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                ))}
              </select>
            </div>

            <div style={{ marginBottom: "14px" }}>
              <label style={labelStyle}>MOQ</label>
              <input
                type="number"
                min={1}
                value={product.moq}
                onChange={e => setProduct(p => p ? { ...p, moq: Number(e.target.value) || 1 } : p)}
                style={{ ...inputStyle, width: "100px" }}
              />
            </div>

            <div>
              <label style={labelStyle}>Tags</label>
              <div
                style={{ display: "flex", flexWrap: "wrap", gap: "6px", padding: "10px", border: "1.5px solid #E2E0DA", borderRadius: "8px", minHeight: "44px", cursor: "text" }}
                onClick={e => (e.currentTarget.querySelector("input") as HTMLInputElement)?.focus()}
              >
                {(product.tags ?? []).map(tag => (
                  <span key={tag} style={{ background: "#F4F3EF", padding: "3px 10px", borderRadius: "20px", fontSize: "12px", fontWeight: 600, display: "flex", alignItems: "center", gap: "4px" }}>
                    {tag}
                    <button
                      onClick={() => removeTag(tag)}
                      style={{ background: "none", border: "none", cursor: "pointer", color: "#aaa", fontSize: "14px", lineHeight: 1, padding: 0 }}
                    >×</button>
                  </span>
                ))}
                <input
                  placeholder={product.tags?.length ? "" : "Add tag…"}
                  onKeyDown={e => {
                    if (e.key === "Enter" || e.key === ",") {
                      e.preventDefault();
                      addTag(e.currentTarget.value.replace(",", "").trim());
                      e.currentTarget.value = "";
                    }
                  }}
                  style={{ border: "none", outline: "none", fontSize: "13px", minWidth: "100px", fontFamily: "var(--font-jakarta)", flexGrow: 1 }}
                />
              </div>
              <div style={{ fontSize: "11px", color: "#aaa", marginTop: "4px" }}>Press Enter or comma to add</div>
            </div>
          </div>

          {/* SEO */}
          <div style={sectionCard}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
              <span style={{ ...sectionTitle, marginBottom: 0 }}>SEARCH ENGINE LISTING</span>
              <button
                onClick={() => setEditSEO(v => !v)}
                style={{ fontSize: "12px", color: "#1A5CFF", fontWeight: 700, background: "none", border: "none", cursor: "pointer" }}
              >
                {editSEO ? "Preview" : "Edit"}
              </button>
            </div>

            {editSEO ? (
              <div>
                <div style={{ marginBottom: "12px" }}>
                  <label style={labelStyle}>SEO Title</label>
                  <input
                    value={product.meta_title ?? product.name ?? ""}
                    onChange={e => setProduct(p => p ? { ...p, meta_title: e.target.value } : p)}
                    style={inputStyle}
                  />
                  <div style={{ fontSize: "11px", marginTop: "3px", color: (product.meta_title ?? product.name ?? "").length > 60 ? "#E8242A" : "#aaa" }}>
                    {(product.meta_title ?? product.name ?? "").length}/60 characters
                  </div>
                </div>
                <div>
                  <label style={labelStyle}>Meta Description</label>
                  <textarea
                    value={product.meta_description ?? ""}
                    onChange={e => setProduct(p => p ? { ...p, meta_description: e.target.value } : p)}
                    rows={3}
                    style={{ ...inputStyle, resize: "vertical" }}
                  />
                  <div style={{ fontSize: "11px", marginTop: "3px", color: (product.meta_description ?? "").length > 160 ? "#E8242A" : "#aaa" }}>
                    {(product.meta_description ?? "").length}/160 characters
                  </div>
                </div>
              </div>
            ) : (
              <div style={{ border: "1px solid #E2E0DA", borderRadius: "8px", padding: "14px 16px", background: "#FAFAFA" }}>
                <div style={{ fontSize: "11px", color: "#059669", marginBottom: "3px" }}>
                  af-apparel.com/products/{product.slug}
                </div>
                <div style={{ fontSize: "16px", color: "#1a0dab", marginBottom: "4px", fontWeight: 400 }}>
                  {product.meta_title ?? product.name}
                </div>
                <div style={{ fontSize: "13px", color: "#545454", lineHeight: 1.5 }}>
                  {product.meta_description ?? product.description?.slice(0, 160) ?? "No description"}
                </div>
              </div>
            )}
          </div>

          {/* Danger Zone */}
          <div style={{ background: "#fff", border: "1px solid #FECACA", borderRadius: "10px", padding: "20px" }}>
            <span style={{ ...sectionTitle, color: "#E8242A", marginBottom: "12px" }}>DANGER ZONE</span>
            <button
              onClick={async () => {
                if (!product || !confirm(`Delete "${product.name}"? This cannot be undone.`)) return;
                await adminService.deleteProduct(product.id);
                router.push("/admin/products");
              }}
              style={{ width: "100%", padding: "10px", background: "rgba(232,36,42,.08)", color: "#E8242A", border: "1px solid #FECACA", borderRadius: "8px", fontWeight: 700, cursor: "pointer", fontSize: "13px" }}
            >
              🗑 Delete Product
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}
