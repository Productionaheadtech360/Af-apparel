// frontend/src/app/(admin)/admin/products/[slug]/edit/page.tsx
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { adminService } from "@/services/admin.service";
import { productsService } from "@/services/products.service";
import { apiClient } from "@/lib/api-client";
import dynamic from "next/dynamic";
import { SearchIcon, TrashIcon } from "@/components/ui/icons";

const RichTextEditor = dynamic(
  () => import("@/components/admin/RichTextEditor").then(m => m.RichTextEditor),
  {
    ssr: false,
    loading: () => (
      <div style={{ border: "1.5px solid #E2E0DA", borderRadius: "8px", padding: "14px 16px", minHeight: "160px", color: "#aaa", fontSize: "14px" }}>
        Loading editor…
      </div>
    ),
  }
);
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

const SIZE_ORDER = ["XXS", "XS", "S", "S/M", "M", "M/L", "L", "XL", "2XL", "3XL", "4XL", "5XL", "6XL", "ONE SIZE"];

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
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState("");
  const [categories, setCategories] = useState<Category[]>([]);
  const [editSEO, setEditSEO] = useState(false);

  // Variant expand state
  const [expandedGroups, setExpandedGroups] = useState<string[]>([]);
  const [expandAll, setExpandAll] = useState(false);

  // Variant local edits: variantId → field overrides
  const [variantEdits, setVariantEdits] = useState<Record<string, Record<string, string>>>({});

  // Bulk apply to all variants
  const [bulkApply, setBulkApply] = useState({ price: "", compare: "", stock: "" });

  async function applyToAllVariants() {
    if (!product) return;
    const updates: Record<string, string> = {};
    if (bulkApply.price.trim()) updates.retail_price = bulkApply.price.trim();
    if (bulkApply.compare.trim()) updates.compare_price = bulkApply.compare.trim();
    if (bulkApply.stock.trim()) updates.stock_quantity = bulkApply.stock.trim();
    if (!Object.keys(updates).length) return;
    await Promise.all(
      product.variants.map(v => adminService.updateVariant(product.id, v.id, updates))
    );
    setBulkApply({ price: "", compare: "", stock: "" });
    await load();
  }

  // Add Variant modal
  const [showAddVariant, setShowAddVariant] = useState(false);
  const [newVariant, setNewVariant] = useState({ color: "", size: "", sku: "", retail_price: "" });
  const [addingVariant, setAddingVariant] = useState(false);

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
    return Object.entries(map).map(([color, variants]) => ({
      color,
      variants: [...variants].sort((a, b) => {
        const ai = SIZE_ORDER.indexOf((a.size ?? "").toUpperCase());
        const bi = SIZE_ORDER.indexOf((b.size ?? "").toUpperCase());
        if (ai === -1 && bi === -1) return (a.size ?? "").localeCompare(b.size ?? "");
        if (ai === -1) return 1;
        if (bi === -1) return -1;
        return ai - bi;
      }),
    }));
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

  async function handleAddVariant() {
    if (!product || !newVariant.color || !newVariant.size) return;
    setAddingVariant(true);
    try {
      const colorCode = newVariant.color.slice(0, 3).toUpperCase();
      const sizeCode = newVariant.size.toUpperCase();
      const productCode = product.name.split(" ").map(w => w[0] ?? "").join("").toUpperCase();
      const sku = newVariant.sku.trim() || `${productCode}-${colorCode}-${sizeCode}-${Date.now().toString(36).toUpperCase()}`;

      const created = await apiClient.post<ProductVariant>(`/api/v1/admin/products/${product.id}/variants`, {
        sku,
        color: newVariant.color,
        size: newVariant.size,
        retail_price: parseFloat(newVariant.retail_price) || 0,
        status: "active",
      });

      setProduct(prev => prev ? { ...prev, variants: [...prev.variants, created] } : prev);
      setNewVariant({ color: "", size: "", sku: "", retail_price: "" });
      setShowAddVariant(false);
      // Auto-expand the new color group
      if (created.color) setExpandedGroups(prev => [...new Set([...prev, created.color!])]);
    } catch (err) {
      alert("Failed to add variant. Check the console for details.");
      console.error(err);
    } finally {
      setAddingVariant(false);
    }
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
        fabric: (product as any).fabric,
        product_code: (product as any).product_code,
        weight: (product as any).weight,
        gender: (product as any).gender,
        care_instructions: (product as any).care_instructions ?? null,
        print_guide: (product as any).print_guide ?? null,
        size_chart_data: (product as any).size_chart_data ?? null,
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

  if (isLoading && !product) {
    return (
      <div style={{ fontFamily: "var(--font-jakarta)", display: "flex", alignItems: "center", justifyContent: "center", height: "300px", color: "#aaa", fontSize: "14px" }}>
        Loading product…
      </div>
    );
  }

  if (!product) {
    return (
      <div style={{ fontFamily: "var(--font-jakarta)", padding: "48px", textAlign: "center" }}>
        <div style={{ marginBottom: "12px" }}><SearchIcon size={32} color="#aaa" /></div>
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
              <RichTextEditor
                value={product.description ?? ""}
                onChange={val => setProduct(p => p ? { ...p, description: val } : p)}
                placeholder="Describe this product — fabric details, print compatibility, sizing notes…"
              />
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
                  onClick={() => setShowAddVariant(true)}
                  style={{ padding: "6px 14px", background: "#1A5CFF", color: "#fff", border: "none", borderRadius: "6px", fontSize: "12px", fontWeight: 700, cursor: "pointer" }}
                >
                  + Add Variant
                </button>
              </div>
            </div>

            {/* Apply to All bar */}
            {groupedVariants.length > 0 && (
              <div style={{ display: "flex", gap: "8px", alignItems: "center", marginBottom: "14px", padding: "12px 14px", background: "#F4F3EF", borderRadius: "8px", flexWrap: "wrap" }}>
                <span style={{ fontSize: "12px", fontWeight: 700, color: "#7A7880", whiteSpace: "nowrap" }}>APPLY TO ALL:</span>
                <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                  <span style={{ fontSize: "12px", color: "#aaa" }}>Price $</span>
                  <input type="number" placeholder="—" value={bulkApply.price} onChange={e => setBulkApply(p => ({ ...p, price: e.target.value }))} style={{ width: "72px", padding: "5px 7px", border: "1px solid #E2E0DA", borderRadius: "5px", fontSize: "12px" }} />
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                  <span style={{ fontSize: "12px", color: "#aaa" }}>Compare $</span>
                  <input type="number" placeholder="—" value={bulkApply.compare} onChange={e => setBulkApply(p => ({ ...p, compare: e.target.value }))} style={{ width: "72px", padding: "5px 7px", border: "1px solid #E2E0DA", borderRadius: "5px", fontSize: "12px" }} />
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                  <span style={{ fontSize: "12px", color: "#aaa" }}>Stock</span>
                  <input type="number" placeholder="—" value={bulkApply.stock} onChange={e => setBulkApply(p => ({ ...p, stock: e.target.value }))} style={{ width: "60px", padding: "5px 7px", border: "1px solid #E2E0DA", borderRadius: "5px", fontSize: "12px" }} />
                </div>
                <button
                  onClick={applyToAllVariants}
                  disabled={!bulkApply.price && !bulkApply.compare && !bulkApply.stock}
                  style={{ padding: "5px 14px", background: "#1A5CFF", color: "#fff", border: "none", borderRadius: "5px", fontSize: "12px", fontWeight: 700, cursor: "pointer", opacity: (!bulkApply.price && !bulkApply.compare && !bulkApply.stock) ? 0.4 : 1 }}
                >
                  Apply
                </button>
              </div>
            )}

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
                              style={{ background: "none", border: "none", cursor: "pointer", color: "#E8242A", padding: "2px 4px", display: "inline-flex" }}
                            ><TrashIcon size={16} color="#E8242A" /></button>
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
              <label style={labelStyle}>Gender</label>
              <select
                value={(product as any).gender ?? ""}
                onChange={e => setProduct(p => p ? { ...p, gender: e.target.value } as any : p)}
                style={{ ...inputStyle, background: "#fff" }}
              >
                <option value="">Select gender…</option>
                <option value="mens">Men's</option>
                <option value="womens">Women's</option>
                <option value="youth">Youth</option>
                <option value="unisex">Unisex</option>
              </select>
            </div>

            <div style={{ marginBottom: "14px" }}>
              <label style={labelStyle}>Fabric</label>
              <input
                value={(product as any).fabric ?? ""}
                onChange={e => setProduct(p => p ? { ...p, fabric: e.target.value } as any : p)}
                placeholder="e.g. 100% Cotton, 50/50 Cotton-Poly"
                style={inputStyle}
              />
            </div>

            <div style={{ marginBottom: "14px" }}>
              <label style={labelStyle}>Product Code</label>
              <input
                value={(product as any).product_code ?? ""}
                onChange={e => setProduct(p => p ? { ...p, product_code: e.target.value } as any : p)}
                placeholder="e.g. G5000, PC61"
                style={inputStyle}
              />
            </div>

            <div style={{ marginBottom: "14px" }}>
              <label style={labelStyle}>Weight</label>
              <input
                value={(product as any).weight ?? ""}
                onChange={e => setProduct(p => p ? { ...p, weight: e.target.value } as any : p)}
                placeholder="e.g. 5.3 oz, 6.1 oz"
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

          {/* Product Tabs Content */}
          <div style={sectionCard}>
            <span style={sectionTitle}>PRODUCT TABS CONTENT</span>
            <p style={{ fontSize: "12px", color: "#7A7880", marginBottom: "20px", marginTop: "-8px" }}>
              This content appears in the Description, Print Guide, and Size Chart tabs on the product page.
            </p>

            {/* Care Instructions */}
            <div style={{ marginBottom: "20px" }}>
              <label style={labelStyle}>Care Instructions</label>
              <textarea
                rows={4}
                value={(product as any).care_instructions ?? ""}
                onChange={e => setProduct(p => p ? { ...p, care_instructions: e.target.value } as any : p)}
                placeholder="e.g. Machine wash cold, tumble dry low, do not bleach…"
                style={{ ...inputStyle, resize: "vertical" }}
              />
              <div style={{ fontSize: "11px", color: "#aaa", marginTop: "3px" }}>Appears in the Specifications tab.</div>
            </div>

            {/* Print Guide */}
            <div style={{ marginBottom: "20px" }}>
              <label style={labelStyle}>Print Guide — Supported Methods</label>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px" }}>
                {["DTF (Direct to Film)", "Screen Printing", "Embroidery", "DTG (Direct to Garment)", "Heat Transfer", "Sublimation", "Vinyl / HTV", "Laser Engraving"].map(method => {
                  const methods: string[] = ((product as any).print_guide as any)?.methods ?? [];
                  const checked = methods.includes(method);
                  return (
                    <label key={method} style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "13px", color: "#2A2830", cursor: "pointer", padding: "6px 10px", border: `1.5px solid ${checked ? "#1A5CFF" : "#E2E0DA"}`, borderRadius: "7px", background: checked ? "rgba(26,92,255,.05)" : "#fff", transition: "all .15s" }}>
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={e => {
                          const cur: string[] = ((product as any).print_guide as any)?.methods ?? [];
                          const next = e.target.checked ? [...cur, method] : cur.filter(m => m !== method);
                          setProduct(p => p ? { ...p, print_guide: { ...((p as any).print_guide ?? {}), methods: next } } as any : p);
                        }}
                        style={{ accentColor: "#1A5CFF" }}
                      />
                      {method}
                    </label>
                  );
                })}
              </div>
              <div style={{ fontSize: "11px", color: "#aaa", marginTop: "6px" }}>Checked methods appear as green ticks in the Print Guide tab.</div>
            </div>

            {/* Size Chart */}
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                <label style={{ ...labelStyle, marginBottom: 0 }}>Size Chart</label>
                <button
                  type="button"
                  onClick={() => {
                    const rows: any[] = ((product as any).size_chart_data as any) ?? [];
                    setProduct(p => p ? { ...p, size_chart_data: [...rows, { size: "", chest: "", length: "", sleeve: "" }] } as any : p);
                  }}
                  style={{ fontSize: "12px", color: "#1A5CFF", fontWeight: 700, background: "none", border: "none", cursor: "pointer", padding: 0 }}
                >
                  + Add Row
                </button>
              </div>

              {(((product as any).size_chart_data as any[]) ?? []).length === 0 ? (
                <div style={{ textAlign: "center", padding: "20px", border: "1.5px dashed #E2E0DA", borderRadius: "8px", color: "#aaa", fontSize: "13px" }}>
                  No size chart rows yet. Click + Add Row to build one.
                </div>
              ) : (
                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
                    <thead>
                      <tr style={{ background: "#F4F3EF" }}>
                        {["Size", "Chest (in)", "Length (in)", "Sleeve (in)", ""].map(h => (
                          <th key={h} style={{ padding: "8px 10px", textAlign: "left", fontSize: "10px", textTransform: "uppercase", letterSpacing: ".06em", color: "#7A7880", fontWeight: 700, whiteSpace: "nowrap" }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {(((product as any).size_chart_data as any[]) ?? []).map((row: any, i: number) => (
                        <tr key={i} style={{ borderBottom: "1px solid #F4F3EF" }}>
                          {(["size", "chest", "length", "sleeve"] as const).map(field => (
                            <td key={field} style={{ padding: "4px 6px" }}>
                              <input
                                value={row[field] ?? ""}
                                onChange={e => {
                                  const rows = [...(((product as any).size_chart_data as any[]) ?? [])];
                                  rows[i] = { ...rows[i], [field]: e.target.value };
                                  setProduct(p => p ? { ...p, size_chart_data: rows } as any : p);
                                }}
                                placeholder={field === "size" ? "XL" : "—"}
                                style={{ width: "100%", padding: "5px 8px", border: "1px solid #E2E0DA", borderRadius: "5px", fontSize: "12px", fontFamily: "var(--font-jakarta)", outline: "none" }}
                              />
                            </td>
                          ))}
                          <td style={{ padding: "4px 6px" }}>
                            <button
                              type="button"
                              onClick={() => {
                                const rows = (((product as any).size_chart_data as any[]) ?? []).filter((_: any, idx: number) => idx !== i);
                                setProduct(p => p ? { ...p, size_chart_data: rows } as any : p);
                              }}
                              style={{ background: "none", border: "none", cursor: "pointer", color: "#E8242A", fontSize: "16px", lineHeight: 1, padding: "0 4px" }}
                            >×</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              <div style={{ fontSize: "11px", color: "#aaa", marginTop: "6px" }}>This table appears in the Size Chart tab on the product page.</div>
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
              style={{ width: "100%", padding: "10px", background: "rgba(232,36,42,.08)", color: "#E8242A", border: "1px solid #FECACA", borderRadius: "8px", fontWeight: 700, cursor: "pointer", fontSize: "13px", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: "6px" }}
            >
              <TrashIcon size={14} color="#E8242A" /> Delete Product
            </button>
          </div>

        </div>
      </div>

      {/* ── Add Variant Modal ──────────────────────────────────────── */}
      {showAddVariant && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.5)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ background: "#fff", borderRadius: "12px", width: "480px", padding: "28px", boxShadow: "0 20px 60px rgba(0,0,0,.2)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
              <h3 style={{ fontFamily: "var(--font-bebas)", fontSize: "22px", color: "#2A2830", letterSpacing: ".04em" }}>ADD VARIANT</h3>
              <button onClick={() => setShowAddVariant(false)} style={{ background: "none", border: "none", fontSize: "20px", cursor: "pointer", color: "#aaa" }}>✕</button>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px", marginBottom: "14px" }}>
              <div>
                <label style={labelStyle}>Color <span style={{ color: "#E8242A" }}>*</span></label>
                <input
                  value={newVariant.color}
                  onChange={e => setNewVariant(v => ({ ...v, color: e.target.value }))}
                  placeholder="e.g. Navy, Black, White"
                  list="color-suggestions"
                  style={inputStyle}
                />
                <datalist id="color-suggestions">
                  {Object.keys(COLOR_MAP).map(c => <option key={c} value={c} />)}
                </datalist>
              </div>
              <div>
                <label style={labelStyle}>Size <span style={{ color: "#E8242A" }}>*</span></label>
                <select
                  value={newVariant.size}
                  onChange={e => setNewVariant(v => ({ ...v, size: e.target.value }))}
                  style={{ ...inputStyle, background: "#fff" }}
                >
                  <option value="">Select size…</option>
                  {["XS", "S", "M", "L", "XL", "2XL", "3XL", "4XL", "One Size"].map(s => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
              <div>
                <label style={labelStyle}>SKU</label>
                <input
                  value={newVariant.sku}
                  onChange={e => setNewVariant(v => ({ ...v, sku: e.target.value }))}
                  placeholder="Auto-generated if empty"
                  style={inputStyle}
                />
              </div>
              <div>
                <label style={labelStyle}>Price ($)</label>
                <input
                  type="number"
                  value={newVariant.retail_price}
                  onChange={e => setNewVariant(v => ({ ...v, retail_price: e.target.value }))}
                  placeholder="0.00"
                  style={inputStyle}
                />
              </div>
            </div>

            <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end", marginTop: "20px" }}>
              <button
                onClick={() => setShowAddVariant(false)}
                style={{ padding: "10px 20px", border: "1px solid #E2E0DA", borderRadius: "8px", background: "#fff", cursor: "pointer", fontWeight: 600, fontSize: "13px" }}
              >
                Cancel
              </button>
              <button
                onClick={handleAddVariant}
                disabled={addingVariant || !newVariant.color || !newVariant.size}
                style={{ padding: "10px 20px", background: "#1A5CFF", color: "#fff", border: "none", borderRadius: "8px", fontWeight: 700, cursor: "pointer", fontSize: "13px", opacity: (addingVariant || !newVariant.color || !newVariant.size) ? 0.6 : 1 }}
              >
                {addingVariant ? "Adding…" : "Add Variant"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
