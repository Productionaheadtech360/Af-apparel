"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { adminService } from "@/services/admin.service";
import { productsService } from "@/services/products.service";
import { apiClient } from "@/lib/api-client";
import type { Category } from "@/types/product.types";

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

const COLOR_MAP: Record<string, string> = {
  White: "#FFFFFF", Black: "#111111", Grey: "#9CA3AF", "Sport Grey": "#9CA3AF",
  Navy: "#1e3a5f", Red: "#E8242A", Blue: "#1A5CFF", "Light Blue": "#7DD3FC",
  Forest: "#1B4332", Green: "#16a34a", Yellow: "#EAB308", Orange: "#F97316",
  Purple: "#9333EA", Pink: "#EC4899", Brown: "#92400E",
};

interface VariantRow {
  id: string;
  color: string;
  size: string;
  sku: string;
  retail_price: string;
  msrp: string;
}

export default function NewProductPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [pendingImages, setPendingImages] = useState<File[]>([]);
  const [imagePreviewUrls, setImagePreviewUrls] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");

  const [form, setForm] = useState({
    name: "",
    slug: "",
    description: "",
    status: "draft",
    moq: 1,
    product_type: "",
    vendor: "",
    gender: "",
    fabric: "",
    product_code: "",
    weight: "",
    category_id: "",
    tags: [] as string[],
  });

  const [variants, setVariants] = useState<VariantRow[]>([
    { id: crypto.randomUUID(), color: "", size: "", sku: "", retail_price: "", msrp: "" },
  ]);

  useEffect(() => {
    productsService.getCategories().then(cats => setCategories(cats ?? [])).catch(() => {});
  }, []);

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) {
    const { name, value } = e.target;
    setForm(prev => {
      const updated = {
        ...prev,
        [name]: name === "moq" ? Math.max(1, parseInt(value) || 1) : value,
      };
      if (name === "name" && prev.slug === prev.name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "")) {
        updated.slug = value.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
      }
      return updated;
    });
  }

  function addTag() {
    const t = tagInput.trim().replace(/,/g, "");
    if (!t || form.tags.includes(t)) { setTagInput(""); return; }
    setForm(p => ({ ...p, tags: [...p.tags, t] }));
    setTagInput("");
  }

  function removeTag(tag: string) {
    setForm(p => ({ ...p, tags: p.tags.filter(t => t !== tag) }));
  }

  function updateVariant(id: string, field: keyof VariantRow, value: string) {
    setVariants(rows => rows.map(r => r.id === id ? { ...r, [field]: value } : r));
  }

  function addVariantRow() {
    setVariants(rows => [...rows, { id: crypto.randomUUID(), color: "", size: "", sku: "", retail_price: "", msrp: "" }]);
  }

  function removeVariantRow(id: string) {
    setVariants(rows => rows.filter(r => r.id !== id));
  }

  function handleImageSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    setPendingImages(prev => [...prev, ...files]);
    files.forEach(file => {
      const reader = new FileReader();
      reader.onload = ev => {
        setImagePreviewUrls(prev => [...prev, ev.target?.result as string]);
      };
      reader.readAsDataURL(file);
    });
    e.target.value = "";
  }

  function removePendingImage(index: number) {
    setPendingImages(prev => prev.filter((_, i) => i !== index));
    setImagePreviewUrls(prev => prev.filter((_, i) => i !== index));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim() || !form.slug.trim()) return;
    setSaving(true);
    setError(null);

    try {
      const payload: Record<string, unknown> = {
        name: form.name.trim(),
        slug: form.slug.trim(),
        description: form.description || null,
        status: form.status,
        moq: form.moq,
        product_type: form.product_type || null,
        vendor: form.vendor || null,
        gender: form.gender || null,
        fabric: form.fabric || null,
        product_code: form.product_code || null,
        weight: form.weight || null,
        tags: form.tags.length ? form.tags : null,
        category_ids: form.category_id ? [form.category_id] : [],
      };

      const product = await adminService.createProduct(payload) as { id: string; slug: string };

      // Upload images
      for (const file of pendingImages) {
        await adminService.uploadImage(product.id, file).catch(() => {});
      }

      // Create filled variant rows
      const filledVariants = variants.filter(v => v.color.trim() && v.size.trim());
      for (const v of filledVariants) {
        const colorCode = v.color.slice(0, 3).toUpperCase();
        const sizeCode = v.size.toUpperCase();
        const productCode = form.name.split(" ").map(w => w[0] ?? "").join("").toUpperCase();
        const sku = v.sku.trim() || `${productCode}-${colorCode}-${sizeCode}-${Date.now().toString(36).toUpperCase()}`;
        await apiClient.post(`/api/v1/admin/products/${product.id}/variants`, {
          sku,
          color: v.color.trim(),
          size: v.size.trim(),
          retail_price: parseFloat(v.retail_price) || 0,
          ...(v.msrp.trim() ? { msrp: parseFloat(v.msrp) } : {}),
          status: "active",
        }).catch(() => {});
      }

      router.push(`/admin/products/${product.slug}/edit`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to create product");
      setSaving(false);
    }
  }

  return (
    <div style={{ fontFamily: "var(--font-jakarta)" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
        <div>
          <button
            onClick={() => router.push("/admin/products")}
            style={{ background: "none", border: "none", color: "#7A7880", cursor: "pointer", fontSize: "13px", padding: 0, marginBottom: "4px" }}
          >
            ← Products
          </button>
          <h1 style={{ fontFamily: "var(--font-bebas)", fontSize: "28px", color: "#2A2830", letterSpacing: ".02em", lineHeight: 1 }}>
            ADD PRODUCT
          </h1>
        </div>
        <div style={{ display: "flex", gap: "8px" }}>
          <button
            type="button"
            onClick={() => router.push("/admin/products")}
            style={{ padding: "10px 20px", border: "1px solid #E2E0DA", borderRadius: "8px", background: "#fff", fontSize: "13px", fontWeight: 600, cursor: "pointer" }}
          >
            Cancel
          </button>
          <button
            form="new-product-form"
            type="submit"
            disabled={saving || !form.name.trim() || !form.slug.trim()}
            style={{ padding: "10px 24px", background: "#1A5CFF", color: "#fff", border: "none", borderRadius: "8px", fontWeight: 700, cursor: "pointer", opacity: (saving || !form.name.trim() || !form.slug.trim()) ? 0.6 : 1, fontSize: "14px" }}
          >
            {saving ? "Creating…" : "Create Product"}
          </button>
        </div>
      </div>

      {error && (
        <div style={{ background: "rgba(232,36,42,.06)", border: "1px solid #FECACA", borderRadius: "8px", padding: "12px 16px", marginBottom: "16px", fontSize: "13px", color: "#E8242A" }}>
          {error}
        </div>
      )}

      <form id="new-product-form" onSubmit={handleSubmit}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 340px", gap: "16px", alignItems: "start" }}>

          {/* LEFT COLUMN */}
          <div>

            {/* Title & Description */}
            <div style={sectionCard}>
              <div style={{ marginBottom: "18px" }}>
                <label style={labelStyle}>Product Name <span style={{ color: "#E8242A" }}>*</span></label>
                <input
                  name="name"
                  value={form.name}
                  onChange={handleChange}
                  required
                  placeholder="e.g. Classic Cotton T-Shirt"
                  style={{ ...inputStyle, fontSize: "16px", fontWeight: 600 }}
                />
              </div>
              <div style={{ marginBottom: "18px" }}>
                <label style={labelStyle}>URL Slug <span style={{ color: "#E8242A" }}>*</span></label>
                <input
                  name="slug"
                  value={form.slug}
                  onChange={handleChange}
                  required
                  placeholder="e.g. classic-cotton-t-shirt"
                  style={inputStyle}
                />
                <div style={{ fontSize: "11px", color: "#aaa", marginTop: "4px" }}>Auto-generated from name. Must be unique.</div>
              </div>
              <div>
                <label style={labelStyle}>Description</label>
                <textarea
                  name="description"
                  value={form.description}
                  onChange={handleChange}
                  rows={5}
                  placeholder="Describe this product — fabric details, print compatibility, sizing notes…"
                  style={{ ...inputStyle, resize: "vertical" }}
                />
              </div>
            </div>

            {/* Media */}
            <div style={sectionCard}>
              <span style={sectionTitle}>MEDIA</span>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "10px", marginBottom: "8px" }}>
                {imagePreviewUrls.map((url, i) => (
                  <div key={i} style={{ aspectRatio: "1", borderRadius: "8px", overflow: "hidden", border: "1px solid #E2E0DA", position: "relative", background: "#f5f5f5" }}>
                    <img src={url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    <button
                      type="button"
                      onClick={() => removePendingImage(i)}
                      style={{ position: "absolute", top: "4px", right: "4px", background: "rgba(0,0,0,.6)", color: "#fff", border: "none", borderRadius: "50%", width: "22px", height: "22px", cursor: "pointer", fontSize: "11px", display: "flex", alignItems: "center", justifyContent: "center" }}
                    >✕</button>
                    {i === 0 && (
                      <div style={{ position: "absolute", bottom: "4px", left: "4px", background: "#1A5CFF", color: "#fff", fontSize: "9px", fontWeight: 700, padding: "2px 6px", borderRadius: "3px" }}>PRIMARY</div>
                    )}
                  </div>
                ))}
                <div
                  onClick={() => fileInputRef.current?.click()}
                  style={{ aspectRatio: "1", borderRadius: "8px", border: "2px dashed #E2E0DA", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", cursor: "pointer", background: "#FAFAFA", transition: "border-color .2s" }}
                  onMouseEnter={e => (e.currentTarget.style.borderColor = "#1A5CFF")}
                  onMouseLeave={e => (e.currentTarget.style.borderColor = "#E2E0DA")}
                >
                  <span style={{ fontSize: "24px", marginBottom: "4px", color: "#aaa" }}>+</span>
                  <span style={{ fontSize: "11px", color: "#7A7880" }}>Add media</span>
                </div>
                <input ref={fileInputRef} type="file" accept="image/*" multiple style={{ display: "none" }} onChange={handleImageSelect} />
              </div>
              <p style={{ fontSize: "11px", color: "#aaa" }}>Images will be uploaded after the product is created. First image becomes primary.</p>
            </div>

            {/* Variants */}
            <div style={sectionCard}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
                <span style={{ ...sectionTitle, marginBottom: 0 }}>VARIANTS</span>
                <button
                  type="button"
                  onClick={addVariantRow}
                  style={{ padding: "6px 14px", background: "#1A5CFF", color: "#fff", border: "none", borderRadius: "6px", fontSize: "12px", fontWeight: 700, cursor: "pointer" }}
                >
                  + Add Row
                </button>
              </div>
              <p style={{ fontSize: "12px", color: "#7A7880", marginBottom: "12px", marginTop: "-8px" }}>
                Add color/size combinations. You can also add more variants after creation.
              </p>

              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
                  <thead>
                    <tr style={{ background: "#F4F3EF", borderBottom: "1px solid #E2E0DA" }}>
                      {["Color *", "Size *", "SKU (optional)", "Price ($)", "MSRP ($)"].map(h => (
                        <th key={h} style={{ padding: "10px 12px", textAlign: "left", fontSize: "11px", textTransform: "uppercase", letterSpacing: ".06em", color: "#7A7880", fontWeight: 700 }}>{h}</th>
                      ))}
                      <th style={{ width: "40px" }} />
                    </tr>
                  </thead>
                  <tbody>
                    {variants.map((row, i) => (
                      <tr key={row.id} style={{ borderBottom: "1px solid #F4F3EF" }}>
                        <td style={{ padding: "8px 10px" }}>
                          <input
                            value={row.color}
                            onChange={e => updateVariant(row.id, "color", e.target.value)}
                            list="color-list"
                            placeholder="e.g. Navy"
                            style={{ padding: "6px 10px", border: "1px solid #E2E0DA", borderRadius: "5px", fontSize: "12px", width: "130px" }}
                          />
                          <datalist id="color-list">
                            {Object.keys(COLOR_MAP).map(c => <option key={c} value={c} />)}
                          </datalist>
                        </td>
                        <td style={{ padding: "8px 10px" }}>
                          <select
                            value={row.size}
                            onChange={e => updateVariant(row.id, "size", e.target.value)}
                            style={{ padding: "6px 10px", border: "1px solid #E2E0DA", borderRadius: "5px", fontSize: "12px", background: "#fff" }}
                          >
                            <option value="">Select…</option>
                            {["XXS", "XS", "S", "S/M", "M", "M/L", "L", "XL", "2XL", "3XL", "4XL", "5XL", "6XL", "One Size"].map(s => (
                              <option key={s} value={s}>{s}</option>
                            ))}
                          </select>
                        </td>
                        <td style={{ padding: "8px 10px" }}>
                          <input
                            value={row.sku}
                            onChange={e => updateVariant(row.id, "sku", e.target.value)}
                            placeholder="Auto-generated"
                            style={{ padding: "6px 10px", border: "1px solid #E2E0DA", borderRadius: "5px", fontSize: "12px", width: "140px" }}
                          />
                        </td>
                        <td style={{ padding: "8px 10px" }}>
                          <input
                            type="number"
                            value={row.retail_price}
                            onChange={e => updateVariant(row.id, "retail_price", e.target.value)}
                            placeholder="0.00"
                            style={{ padding: "6px 10px", border: "1px solid #E2E0DA", borderRadius: "5px", fontSize: "12px", width: "80px" }}
                          />
                        </td>
                        <td style={{ padding: "8px 10px" }}>
                          <input
                            type="number"
                            value={row.msrp}
                            onChange={e => updateVariant(row.id, "msrp", e.target.value)}
                            placeholder="0.00"
                            style={{ padding: "6px 10px", border: "1px solid #E2E0DA", borderRadius: "5px", fontSize: "12px", width: "80px" }}
                          />
                        </td>
                        <td style={{ padding: "8px 6px", textAlign: "center" }}>
                          {variants.length > 1 && (
                            <button
                              type="button"
                              onClick={() => removeVariantRow(row.id)}
                              style={{ background: "none", border: "none", cursor: "pointer", color: "#E8242A", fontSize: "16px", lineHeight: 1 }}
                            >×</button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p style={{ fontSize: "11px", color: "#aaa", marginTop: "10px" }}>
                Rows with empty Color or Size will be skipped. Leave all empty to skip variants entirely.
              </p>
            </div>

          </div>

          {/* RIGHT SIDEBAR */}
          <div>

            {/* Status */}
            <div style={sectionCard}>
              <span style={sectionTitle}>STATUS</span>
              <select
                name="status"
                value={form.status}
                onChange={handleChange}
                style={{ ...inputStyle, background: "#fff" }}
              >
                <option value="draft">○ Draft</option>
                <option value="active">● Active</option>
              </select>
            </div>

            {/* Product Organization */}
            <div style={sectionCard}>
              <span style={sectionTitle}>PRODUCT ORGANIZATION</span>

              <div style={{ marginBottom: "14px" }}>
                <label style={labelStyle}>Product Type</label>
                <input name="product_type" value={form.product_type} onChange={handleChange} placeholder="e.g. T-Shirt, Hoodie" style={inputStyle} />
              </div>

              <div style={{ marginBottom: "14px" }}>
                <label style={labelStyle}>Vendor</label>
                <input name="vendor" value={form.vendor} onChange={handleChange} placeholder="e.g. AF Apparels" style={inputStyle} />
              </div>

              <div style={{ marginBottom: "14px" }}>
                <label style={labelStyle}>Gender</label>
                <select name="gender" value={form.gender} onChange={handleChange} style={{ ...inputStyle, background: "#fff" }}>
                  <option value="">Select gender…</option>
                  <option value="mens">Men's</option>
                  <option value="womens">Women's</option>
                  <option value="youth">Youth</option>
                  <option value="unisex">Unisex</option>
                </select>
              </div>

              <div style={{ marginBottom: "14px" }}>
                <label style={labelStyle}>Fabric</label>
                <input name="fabric" value={form.fabric} onChange={handleChange} placeholder="e.g. 100% Cotton" style={inputStyle} />
              </div>

              <div style={{ marginBottom: "14px" }}>
                <label style={labelStyle}>Product Code</label>
                <input name="product_code" value={form.product_code} onChange={handleChange} placeholder="e.g. G5000, PC61" style={inputStyle} />
              </div>

              <div style={{ marginBottom: "14px" }}>
                <label style={labelStyle}>Weight</label>
                <input name="weight" value={form.weight} onChange={handleChange} placeholder="e.g. 5.3 oz" style={inputStyle} />
              </div>

              <div style={{ marginBottom: "14px" }}>
                <label style={labelStyle}>Category</label>
                <select name="category_id" value={form.category_id} onChange={handleChange} style={{ ...inputStyle, background: "#fff" }}>
                  <option value="">Select category…</option>
                  {categories.map(cat => (
                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                  ))}
                </select>
              </div>

              <div style={{ marginBottom: "14px" }}>
                <label style={labelStyle}>MOQ (Min. Order Qty)</label>
                <input type="number" name="moq" min={1} value={form.moq} onChange={handleChange} style={{ ...inputStyle, width: "100px" }} />
              </div>

              <div>
                <label style={labelStyle}>Tags</label>
                <div
                  style={{ display: "flex", flexWrap: "wrap", gap: "6px", padding: "10px", border: "1.5px solid #E2E0DA", borderRadius: "8px", minHeight: "44px", cursor: "text" }}
                  onClick={e => (e.currentTarget.querySelector("input") as HTMLInputElement)?.focus()}
                >
                  {form.tags.map(tag => (
                    <span key={tag} style={{ background: "#F4F3EF", padding: "3px 10px", borderRadius: "20px", fontSize: "12px", fontWeight: 600, display: "flex", alignItems: "center", gap: "4px" }}>
                      {tag}
                      <button type="button" onClick={() => removeTag(tag)} style={{ background: "none", border: "none", cursor: "pointer", color: "#aaa", fontSize: "14px", lineHeight: 1, padding: 0 }}>×</button>
                    </span>
                  ))}
                  <input
                    value={tagInput}
                    onChange={e => setTagInput(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === "Enter" || e.key === ",") { e.preventDefault(); addTag(); }
                    }}
                    onBlur={addTag}
                    placeholder={form.tags.length ? "" : "Add tag…"}
                    style={{ border: "none", outline: "none", fontSize: "13px", minWidth: "100px", fontFamily: "var(--font-jakarta)", flexGrow: 1 }}
                  />
                </div>
                <div style={{ fontSize: "11px", color: "#aaa", marginTop: "4px" }}>Press Enter or comma to add</div>
              </div>
            </div>

            <div style={{ background: "#F4F3EF", border: "1px solid #E2E0DA", borderRadius: "10px", padding: "16px" }}>
              <p style={{ fontSize: "12px", color: "#7A7880", margin: 0, lineHeight: 1.6 }}>
                <strong style={{ color: "#2A2830" }}>After creation</strong> you can add care instructions, print guide, size chart, and SEO fields in the edit view.
              </p>
            </div>

          </div>
        </div>
      </form>
    </div>
  );
}
