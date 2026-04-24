"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { formatCurrency } from "@/lib/utils";
import type { ProductDetail, ProductVariant } from "@/types/product.types";
import { useAuthStore } from "@/stores/auth.store";
import { apiClient } from "@/lib/api-client";
import { cartService } from "@/services/cart.service";
import { FactoryIcon, ZapIcon, PackageIcon, PaletteIcon } from "@/components/ui/icons";

interface ProductDetailClientProps {
  product: ProductDetail;
}

const COLOR_MAP: Record<string, string> = {
  White: "#FFFFFF", Black: "#111111", Navy: "#1e3a5f", Red: "#E8242A",
  Blue: "#1A5CFF", Royal: "#2251CC", "Royal Blue": "#2251CC",
  Grey: "#9ca3af", Gray: "#9ca3af", "Dark Grey": "#4b5563", "Dark Gray": "#4b5563",
  "Light Grey": "#d1d5db", "Light Gray": "#d1d5db", Charcoal: "#374151",
  "Sport Grey": "#9ca3af", "Heather Grey": "#b0b7c3", "Athletic Heather": "#b0b7c3",
  Heather: "#b0b7c3", "Dark Heather": "#6b7280", Sand: "#e2c89a", Natural: "#f5f0e8",
  Tan: "#c9a96e", Brown: "#78350f", Maroon: "#7f1d1d", Burgundy: "#881337",
  Green: "#166534", Forest: "#1B4332", "Forest Green": "#14532d", "Kelly Green": "#15803d",
  Lime: "#65a30d", Yellow: "#eab308", Gold: "#C9A84C", Mustard: "#D4A843",
  Orange: "#ea580c", Purple: "#7c3aed", Pink: "#ec4899", "Hot Pink": "#db2777",
  Coral: "#f87171", Teal: "#0d9488", Turquoise: "#06b6d4", Mint: "#6ee7b7",
  Olive: "#4d7c0f", Cream: "#fef3c7", Ivory: "#fffff0", "Sky Blue": "#38bdf8",
  Lavender: "#a78bfa", "Light Blue": "#7DD3FC", "Stonewash Blue": "#5b8fa8",
  "Dark Navy": "#0f1f3d", Indigo: "#3730a3", Cardinal: "#7b1520", Crimson: "#9f0712",
  "Carolina Blue": "#56a0d3", "Columbia Blue": "#9bc4e2", Silver: "#c0c0c0",
  "Ash Grey": "#b2b2b2", Ash: "#b2b2b2", Stone: "#a8a29e", Mocha: "#7c5c48",
  Chocolate: "#5c3d2e", Caramel: "#b5651d", Camo: "#78866b",
};

const TABS = ["Description", "Specifications", "Print Guide", "Size Chart", "Reviews"] as const;
type Tab = (typeof TABS)[number];

// ── Reviews Tab ───────────────────────────────────────────────────────────────

interface ReviewData {
  id: string; rating: number; title: string | null; body: string;
  reviewer_name: string; reviewer_company: string | null;
  is_verified: boolean; image_url?: string | null; created_at: string;
}

function StarRow({ rating, size = 14 }: { rating: number; size?: number }) {
  return (
    <div style={{ display: "flex", gap: "2px" }}>
      {[1, 2, 3, 4, 5].map(s => (
        <svg key={s} width={size} height={size} viewBox="0 0 24 24" fill={s <= rating ? "#C9A84C" : "#E2E0DA"}>
          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
        </svg>
      ))}
    </div>
  );
}

function ReviewsTab({ productId, isAuthenticated }: { productId: string; isAuthenticated: boolean }) {
  const [reviews, setReviews] = useState<ReviewData[]>([]);
  const [total, setTotal] = useState(0);
  const [avgRating, setAvgRating] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitMsg, setSubmitMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [form, setForm] = useState({ rating: 5, title: "", body: "", reviewer_name: "", reviewer_company: "" });
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  async function fetchReviews() {
    setLoading(true);
    try {
      const data = await apiClient.get<{ reviews: ReviewData[]; total: number; avg_rating: number }>(
        `/api/v1/products/${productId}/reviews`
      );
      setReviews(data.reviews ?? []);
      setTotal(data.total ?? 0);
      setAvgRating(data.avg_rating ?? 0);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }

  useEffect(() => { fetchReviews(); }, [productId]); // eslint-disable-line

  function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null;
    setImageFile(file);
    if (file) {
      const reader = new FileReader();
      reader.onload = ev => setImagePreview(ev.target?.result as string);
      reader.readAsDataURL(file);
    } else {
      setImagePreview(null);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.reviewer_name.trim() || !form.body.trim()) return;
    setSubmitting(true);
    setSubmitMsg(null);
    try {
      let image_url: string | null = null;

      if (imageFile) {
        const fd = new FormData();
        fd.append("file", imageFile);
        try {
          const uploadRes = await apiClient.postForm<{ url: string }>("/api/v1/reviews/upload-image", fd);
          image_url = uploadRes.url;
        } catch {
          // Image upload failed — submit review without image
        }
      }

      await apiClient.post(`/api/v1/products/${productId}/reviews`, {
        rating: form.rating,
        title: form.title || null,
        body: form.body,
        reviewer_name: form.reviewer_name,
        reviewer_company: form.reviewer_company || null,
        image_url,
      });
      setSubmitMsg({ type: "success", text: "Review submitted! Thank you." });
      setForm({ rating: 5, title: "", body: "", reviewer_name: "", reviewer_company: "" });
      setImageFile(null);
      setImagePreview(null);
      setShowForm(false);
      await fetchReviews();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to submit review.";
      setSubmitMsg({ type: "error", text: msg });
    }
    finally { setSubmitting(false); }
  }

  const inp: React.CSSProperties = { width: "100%", padding: "9px 12px", border: "1.5px solid #E2E0DA", borderRadius: "7px", fontSize: "13px", outline: "none", boxSizing: "border-box", fontFamily: "var(--font-jakarta)" };
  const starCounts = [5, 4, 3, 2, 1].map(s => ({ star: s, count: reviews.filter(r => r.rating === s).length }));

  return (
    <div style={{ maxWidth: "720px" }}>
      {/* Summary bar */}
      {total > 0 && (
        <div style={{ display: "flex", alignItems: "center", gap: "24px", padding: "20px 24px", background: "#F4F3EF", borderRadius: "10px", marginBottom: "24px", border: "1px solid #E2E0DA" }}>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontFamily: "var(--font-bebas)", fontSize: "52px", color: "#2A2830", lineHeight: 1 }}>{avgRating.toFixed(1)}</div>
            <StarRow rating={Math.round(avgRating)} />
            <div style={{ fontSize: "12px", color: "#7A7880", marginTop: "4px" }}>{total} review{total !== 1 ? "s" : ""}</div>
          </div>
          <div style={{ flex: 1 }}>
            {starCounts.map(({ star, count }) => {
              const pct = total > 0 ? Math.round((count / total) * 100) : 0;
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
      )}

      {/* Header row */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
        <div style={{ fontSize: "15px", fontWeight: 700, color: "#2A2830" }}>
          {loading ? "Loading reviews…" : total === 0 ? "No reviews yet" : `${total} Review${total !== 1 ? "s" : ""}`}
        </div>
        {isAuthenticated && !showForm && (
          <button
            onClick={() => setShowForm(true)}
            style={{ padding: "9px 18px", background: "#1A5CFF", color: "#fff", border: "none", borderRadius: "7px", fontSize: "13px", fontWeight: 700, cursor: "pointer" }}
          >
            Write a Review
          </button>
        )}
      </div>

      {/* Submit form — only shown when logged in */}
      {isAuthenticated && showForm && (
        <form onSubmit={handleSubmit} style={{ background: "#F4F3EF", border: "1px solid #E2E0DA", borderRadius: "10px", padding: "20px 22px", marginBottom: "24px" }}>
          <div style={{ fontFamily: "var(--font-bebas)", fontSize: "18px", letterSpacing: ".04em", color: "#2A2830", marginBottom: "16px" }}>YOUR REVIEW</div>

          {/* Star picker */}
          <div style={{ marginBottom: "14px" }}>
            <div style={{ fontSize: "11px", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".06em", color: "#7A7880", marginBottom: "6px" }}>Rating *</div>
            <div style={{ display: "flex", gap: "6px" }}>
              {[1, 2, 3, 4, 5].map(s => (
                <button key={s} type="button" onClick={() => setForm(f => ({ ...f, rating: s }))} style={{ background: "none", border: "none", cursor: "pointer", padding: "2px" }}>
                  <svg width="28" height="28" viewBox="0 0 24 24" fill={s <= form.rating ? "#C9A84C" : "#E2E0DA"} style={{ transition: "fill .1s" }}>
                    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                  </svg>
                </button>
              ))}
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "12px" }}>
            <div>
              <div style={{ fontSize: "11px", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".06em", color: "#7A7880", marginBottom: "4px" }}>Your Name *</div>
              <input style={inp} value={form.reviewer_name} onChange={e => setForm(f => ({ ...f, reviewer_name: e.target.value }))} placeholder="John Smith" required />
            </div>
            <div>
              <div style={{ fontSize: "11px", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".06em", color: "#7A7880", marginBottom: "4px" }}>Company (optional)</div>
              <input style={inp} value={form.reviewer_company} onChange={e => setForm(f => ({ ...f, reviewer_company: e.target.value }))} placeholder="Acme Shirts Co." />
            </div>
          </div>

          <div style={{ marginBottom: "12px" }}>
            <div style={{ fontSize: "11px", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".06em", color: "#7A7880", marginBottom: "4px" }}>Review Title (optional)</div>
            <input style={inp} value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="Great quality blanks" />
          </div>

          <div style={{ marginBottom: "12px" }}>
            <div style={{ fontSize: "11px", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".06em", color: "#7A7880", marginBottom: "4px" }}>Review *</div>
            <textarea style={{ ...inp, minHeight: "100px", resize: "vertical" }} value={form.body} onChange={e => setForm(f => ({ ...f, body: e.target.value }))} placeholder="Share your experience with this product…" required minLength={10} />
          </div>

          {/* Image upload */}
          <div style={{ marginBottom: "16px" }}>
            <div style={{ fontSize: "11px", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".06em", color: "#7A7880", marginBottom: "4px" }}>Photo (optional)</div>
            <label style={{ display: "inline-flex", alignItems: "center", gap: "8px", padding: "8px 14px", border: "1.5px dashed #C9A84C", borderRadius: "7px", cursor: "pointer", fontSize: "13px", color: "#7A7880", fontWeight: 600 }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/></svg>
              {imageFile ? imageFile.name : "Upload a photo"}
              <input type="file" accept="image/*" onChange={handleImageChange} style={{ display: "none" }} />
            </label>
            {imagePreview && (
              <div style={{ marginTop: "10px", display: "flex", alignItems: "center", gap: "12px" }}>
                <img src={imagePreview} alt="Preview" style={{ width: "80px", height: "80px", objectFit: "cover", borderRadius: "6px", border: "1px solid #E2E0DA" }} />
                <button type="button" onClick={() => { setImageFile(null); setImagePreview(null); }} style={{ fontSize: "12px", color: "#E8242A", background: "none", border: "none", cursor: "pointer", fontWeight: 600 }}>Remove</button>
              </div>
            )}
          </div>

          {submitMsg && (
            <div style={{ padding: "10px 14px", borderRadius: "7px", fontSize: "13px", fontWeight: 600, marginBottom: "12px", background: submitMsg.type === "success" ? "rgba(5,150,105,.08)" : "rgba(232,36,42,.08)", color: submitMsg.type === "success" ? "#059669" : "#E8242A" }}>
              {submitMsg.text}
            </div>
          )}

          <div style={{ display: "flex", gap: "10px" }}>
            <button type="button" onClick={() => { setShowForm(false); setImageFile(null); setImagePreview(null); }} style={{ padding: "10px 18px", border: "1.5px solid #E2E0DA", borderRadius: "7px", fontSize: "13px", fontWeight: 600, cursor: "pointer", background: "#fff" }}>
              Cancel
            </button>
            <button type="submit" disabled={submitting || !form.reviewer_name.trim() || form.body.trim().length < 10}
              style={{ padding: "10px 24px", background: "#1A5CFF", color: "#fff", border: "none", borderRadius: "7px", fontSize: "13px", fontWeight: 700, cursor: "pointer", opacity: (!form.reviewer_name.trim() || form.body.trim().length < 10) ? 0.5 : 1 }}>
              {submitting ? "Submitting…" : "Submit Review"}
            </button>
          </div>
        </form>
      )}

      {/* Review list */}
      {!loading && reviews.length === 0 && !showForm && (
        <div style={{ textAlign: "center", padding: "40px", background: "#F4F3EF", borderRadius: "10px", color: "#7A7880" }}>
          <div style={{ fontSize: "32px", marginBottom: "8px" }}>★</div>
          <div style={{ fontSize: "14px", fontWeight: 600, marginBottom: "4px" }}>Be the first to review</div>
          <div style={{ fontSize: "13px" }}>Share your experience with this product.</div>
        </div>
      )}
      <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
        {reviews.map(r => (
          <div key={r.id} style={{ padding: "18px 20px", background: "#fff", border: "1px solid #E2E0DA", borderRadius: "10px" }}>
            {/* Name at top */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <div style={{ width: "32px", height: "32px", borderRadius: "50%", background: "#F4F3EF", border: "1px solid #E2E0DA", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: "13px", color: "#2A2830", flexShrink: 0 }}>
                  {r.reviewer_name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: "13px", color: "#2A2830" }}>
                    {r.reviewer_name}
                    {r.reviewer_company && <span style={{ fontWeight: 400, color: "#7A7880" }}> · {r.reviewer_company}</span>}
                  </div>
                  {r.is_verified && (
                    <span style={{ background: "rgba(5,150,105,.1)", color: "#059669", fontSize: "10px", fontWeight: 700, padding: "1px 5px", borderRadius: "3px" }}>Verified</span>
                  )}
                </div>
              </div>
              <div style={{ fontSize: "11px", color: "#aaa", flexShrink: 0 }}>{new Date(r.created_at).toLocaleDateString()}</div>
            </div>
            {/* Stars + title */}
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: r.title ? "4px" : "8px" }}>
              <StarRow rating={r.rating} size={13} />
            </div>
            {r.title && <div style={{ fontWeight: 700, fontSize: "14px", color: "#2A2830", marginBottom: "6px" }}>{r.title}</div>}
            <p style={{ fontSize: "14px", color: "#2A2830", lineHeight: 1.6, margin: 0, marginBottom: r.image_url ? "10px" : "0" }}>{r.body}</p>
            {r.image_url && (
              <img src={r.image_url} alt="Review photo" style={{ marginTop: "4px", maxWidth: "180px", maxHeight: "180px", objectFit: "cover", borderRadius: "6px", border: "1px solid #E2E0DA" }} />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function groupVariantsByColor(variants: ProductVariant[]) {
  const groups: { color: string; variants: ProductVariant[] }[] = [];
  const seen = new Set<string>();
  for (const v of variants) {
    const color = v.color ?? "Default";
    if (!seen.has(color)) {
      seen.add(color);
      groups.push({ color, variants: variants.filter(x => (x.color ?? "Default") === color) });
    }
  }
  return groups;
}

function imgSrc(img: { url_medium_webp?: string | null; url_medium?: string; url_large_webp?: string | null; url_large?: string; url_thumbnail_webp?: string | null; url_thumbnail?: string }) {
  return img.url_large_webp ?? img.url_large ?? img.url_medium_webp ?? img.url_medium ?? "";
}

function thumbSrc(img: { url_thumbnail_webp?: string | null; url_thumbnail?: string }) {
  return img.url_thumbnail_webp ?? img.url_thumbnail ?? "";
}

// ── Component ─────────────────────────────────────────────────────────────────
export function ProductDetailClient({ product }: ProductDetailClientProps) {
  // ── Image gallery state ────────────────────────────────────────────────────
  const [activeImageIdx, setActiveImageIdx] = useState(0);
  const images = product.images ?? [];

  // ── Order state ────────────────────────────────────────────────────────────
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [selectedColor, setSelectedColor] = useState<string | null>(null);
  const [expandedColors, setExpandedColors] = useState<string[]>(() =>
    groupVariantsByColor(product.variants ?? []).slice(0, 3).map(g => g.color)
  );
  const [showAllColors, setShowAllColors] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [cartMsg, setCartMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // ── Other state ───────────────────────────────────────────────────────────
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated());
  const [assetMsg, setAssetMsg] = useState<string | null>(null);
  const [emailingFlyer, setEmailingFlyer] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>("Description");
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [showImageLibrary, setShowImageLibrary] = useState(false);

  // ── Derived data ──────────────────────────────────────────────────────────
  const primaryVariant = product.variants?.[0];
  const hasFlyer = product.assets?.some((a: any) => a.asset_type === "flyer");
  const colorGroups = useMemo(() => groupVariantsByColor(product.variants ?? []), [product.variants]);
  const uniqueColors = colorGroups.map(g => g.color);
  const uniqueSizes = useMemo(
    () => Array.from(new Set(product.variants?.map(v => v.size).filter(Boolean) ?? [])) as string[],
    [product.variants]
  );

  const displayColorGroups = showAllColors ? colorGroups : colorGroups.slice(0, 4);
  const filteredGroups = showAllColors ? colorGroups : colorGroups.slice(0, 4);

  const totalUnits = useMemo(
    () => Object.values(quantities).reduce((s, q) => s + (q || 0), 0),
    [quantities]
  );
  const pricePerUnit = Number(primaryVariant?.effective_price ?? primaryVariant?.retail_price ?? 0);
  const orderTotal = totalUnits * pricePerUnit;

  function toggleColor(color: string) {
    const isCurrentlyExpanded = expandedColors.includes(color);
    if (!isCurrentlyExpanded) {
      const visibleInAccordion = filteredGroups.some(g => g.color === color);
      if (!visibleInAccordion) {
        setShowAllColors(true);
      }
      // Switch main image to the one matching this color
      const colorLower = color.toLowerCase();
      const matchIdx = images.findIndex(img =>
        img.alt_text?.toLowerCase().includes(colorLower)
      );
      if (matchIdx >= 0) setActiveImageIdx(matchIdx);
    }
    setExpandedColors(prev =>
      prev.includes(color) ? prev.filter(c => c !== color) : [...prev, color]
    );
  }

  function isExpanded(group: { color: string }) {
    return expandedColors.includes(group.color);
  }

  // ── Handlers ──────────────────────────────────────────────────────────────
  function getGuestCart(): Array<{ variant_id: string; quantity: number; product_id: string; product_name: string; slug: string; color: string | null; size: string | null; unit_price: number }> {
    if (typeof window === "undefined") return [];
    try { return JSON.parse(localStorage.getItem("af_guest_cart") || "[]"); } catch { return []; }
  }

  async function handleAddToCart() {
    const items = Object.entries(quantities)
      .filter(([, qty]) => qty > 0)
      .map(([variant_id, quantity]) => ({ variant_id, quantity }));
    if (items.length === 0) return;

    if (!isAuthenticated) {
      const guestCart = getGuestCart();
      for (const { variant_id, quantity } of items) {
        const v = product.variants?.find(x => x.id === variant_id);
        if (!v) continue;
        const idx = guestCart.findIndex(i => i.variant_id === variant_id);
        const entry = { variant_id, quantity, product_id: product.id, product_name: product.name, slug: product.slug, color: v.color, size: v.size, unit_price: Number(v.effective_price ?? v.retail_price) };
        if (idx >= 0) guestCart[idx]!.quantity += quantity;
        else guestCart.push(entry);
      }
      localStorage.setItem("af_guest_cart", JSON.stringify(guestCart));
      setQuantities({});
      setCartMsg({ type: "success", text: `${totalUnits} unit${totalUnits !== 1 ? "s" : ""} added! Log in or create an account to checkout.` });
      setTimeout(() => setCartMsg(null), 6000);
      return;
    }

    setIsSubmitting(true);
    setCartMsg(null);
    try {
      await cartService.addMatrix(product.id, items);
      setQuantities({});
      setCartMsg({ type: "success", text: `${totalUnits} units added to cart!` });
      setTimeout(() => setCartMsg(null), 4000);
    } catch (err) {
      setCartMsg({ type: "error", text: err instanceof Error ? err.message : "Failed to add to cart" });
    } finally {
      setIsSubmitting(false);
    }
  }

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

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div style={{ minHeight: "100vh", background: "#fff", fontFamily: "var(--font-jakarta)" }}>

      {/* Breadcrumb */}
      <div className="pd-breadcrumb" style={{ background: "#F4F3EF", borderBottom: "1px solid #E2E0DA", padding: "12px 32px" }}>
        <div style={{ maxWidth: "1280px", margin: "0 auto", display: "flex", alignItems: "center", gap: "6px", fontSize: "12px", color: "#7A7880", flexWrap: "wrap" }}>
          <Link href="/" style={{ color: "#7A7880", textDecoration: "none" }}>Home</Link>
          <span>/</span>
          <Link href="/products" style={{ color: "#7A7880", textDecoration: "none" }}>Products</Link>
          {product.categories?.[0] && (
            <>
              <span>/</span>
              <Link href={`/products?category=${product.categories[0].slug}`} style={{ color: "#7A7880", textDecoration: "none" }}>
                {product.categories[0].name}
              </Link>
            </>
          )}
          <span>/</span>
          <span style={{ color: "#2A2830", fontWeight: 600 }}>{product.name}</span>
        </div>
      </div>

      {/* Main content */}
      <div className="pd-main-pad" style={{ maxWidth: "1280px", margin: "0 auto", padding: "40px 32px" }}>
        <div className="product-detail-grid" style={{}}>

          {/* ── LEFT: Image Gallery ─────────────────────────────────────── */}
          <div className="pd-image-col" style={{ width: "100%", minWidth: 0 }}>
            {/* Main image */}
            <div style={{ aspectRatio: "1", borderRadius: "12px", overflow: "hidden", background: "#F4F3EF", marginBottom: "12px", border: "1px solid #E2E0DA", position: "relative" }}>
              {images[activeImageIdx] ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={imgSrc(images[activeImageIdx]!)}
                  alt={images[activeImageIdx]!.alt_text ?? product.name}
                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                />
              ) : (
                <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <span style={{ fontSize: "80px", opacity: 0.2 }}>👕</span>
                </div>
              )}
              {/* MOQ badge */}
              {product.moq > 1 && (
                <div style={{ position: "absolute", top: "12px", left: "12px" }}>
                  <span style={{ background: "#111016", color: "#fff", fontSize: "10px", fontWeight: 700, padding: "3px 8px", borderRadius: "4px", textTransform: "uppercase", letterSpacing: ".06em" }}>
                    Min {product.moq} units
                  </span>
                </div>
              )}
            </div>

            {/* Thumbnail slider */}
            {images.length > 1 && (
              <div style={{ position: "relative" }}>
                <div
                  id="thumb-slider"
                  style={{ display: "flex", gap: "8px", overflowX: "auto", paddingBottom: "4px", scrollbarWidth: "thin", scrollbarColor: "#E2E0DA transparent", scrollBehavior: "smooth" }}
                >
                  {images.map((img, i) => (
                    <button
                      key={img.id}
                      onClick={() => setActiveImageIdx(i)}
                      style={{ width: "72px", height: "72px", borderRadius: "8px", overflow: "hidden", cursor: "pointer", flexShrink: 0, border: activeImageIdx === i ? "2px solid #1A5CFF" : "1px solid #E2E0DA", background: "#F4F3EF", transition: "border .15s", padding: 0 }}
                    >
                      {thumbSrc(img) ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={thumbSrc(img)} alt={img.alt_text ?? ""} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                      ) : (
                        <span style={{ fontSize: "20px", opacity: 0.3 }}>👕</span>
                      )}
                    </button>
                  ))}
                </div>
                {images.length > 5 && (
                  <>
                    <button
                      onClick={() => { const el = document.getElementById("thumb-slider"); if (el) el.scrollLeft -= 200; }}
                      style={{ position: "absolute", left: "-12px", top: "50%", transform: "translateY(-50%)", width: "28px", height: "28px", borderRadius: "50%", background: "#fff", border: "1px solid #E2E0DA", cursor: "pointer", fontSize: "14px", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 2px 8px rgba(0,0,0,.1)", zIndex: 1 }}
                    >‹</button>
                    <button
                      onClick={() => { const el = document.getElementById("thumb-slider"); if (el) el.scrollLeft += 200; }}
                      style={{ position: "absolute", right: "-12px", top: "50%", transform: "translateY(-50%)", width: "28px", height: "28px", borderRadius: "50%", background: "#fff", border: "1px solid #E2E0DA", cursor: "pointer", fontSize: "14px", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 2px 8px rgba(0,0,0,.1)", zIndex: 1 }}
                    >›</button>
                  </>
                )}
              </div>
            )}

            {/* Image Library + Email Flyer */}
            <div style={{ display: "flex", gap: "8px", marginTop: "12px" }}>
              {product.images && product.images.length > 0 && (
                <button
                  onClick={() => setShowImageLibrary(true)}
                  style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: "6px", padding: "10px", border: "1px solid #E2E0DA", borderRadius: "8px", fontSize: "12px", fontWeight: 600, color: "#2A2830", background: "#fff", cursor: "pointer" }}
                >
                  <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
                  Image Library
                </button>
              )}
              <button
                onClick={hasFlyer ? handleEmailFlyer : () => setAssetMsg("No flyer available for this product.")}
                disabled={emailingFlyer}
                style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: "6px", padding: "10px", border: "1px solid #E2E0DA", borderRadius: "8px", fontSize: "12px", fontWeight: 600, color: hasFlyer ? "#2A2830" : "#aaa", background: "#fff", cursor: emailingFlyer ? "not-allowed" : "pointer", opacity: emailingFlyer ? 0.5 : 1 }}
              >
                <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                {emailingFlyer ? "Sending…" : "Email Flyer"}
              </button>
            </div>
            {assetMsg && (
              <p style={{ marginTop: "6px", fontSize: "12px", color: assetMsg.startsWith("No flyer") ? "#aaa" : "#1A5CFF", textAlign: "center" }}>{assetMsg}</p>
            )}
          </div>

          {/* ── RIGHT: Product Info ─────────────────────────────────────── */}
          <div>
            {/* Category */}
            {/* Tags + Copy URL + Category */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "12px" }}>
              <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                {(product.tags?.some(t => t.toLowerCase().includes("best seller") || t.toLowerCase().includes("bestseller"))) && (
                  <span style={{ background: "#E8242A", color: "#fff", fontSize: "10px", fontWeight: 700, padding: "3px 8px", borderRadius: "4px", textTransform: "uppercase", letterSpacing: ".06em" }}>Best Seller</span>
                )}
                <span style={{ background: "rgba(5,150,105,.1)", color: "#059669", fontSize: "10px", fontWeight: 700, padding: "3px 8px", borderRadius: "4px", display: "flex", alignItems: "center", gap: "4px" }}>
                  <svg width="7" height="7" viewBox="0 0 7 7"><circle cx="3.5" cy="3.5" r="3.5" fill="#059669"/></svg> In Stock
                </span>
                {(product.tags ?? []).filter(t => !t.toLowerCase().includes("best seller") && !t.toLowerCase().includes("bestseller")).map(tag => (
                  <span key={tag} style={{ background: "#F4F3EF", color: "#7A7880", fontSize: "10px", fontWeight: 700, padding: "3px 8px", borderRadius: "4px", textTransform: "uppercase", letterSpacing: ".06em", border: "1px solid #E2E0DA" }}>
                    {tag}
                  </span>
                ))}
              </div>
              <button
                onClick={() => {
                  if (typeof window !== "undefined") {
                    navigator.clipboard.writeText(window.location.href);
                    setCopiedUrl(true);
                    setTimeout(() => setCopiedUrl(false), 2000);
                  }
                }}
                style={{ background: copiedUrl ? "rgba(5,150,105,.08)" : "none", border: `1px solid ${copiedUrl ? "rgba(5,150,105,.3)" : "#E2E0DA"}`, borderRadius: "6px", padding: "5px 12px", fontSize: "11px", fontWeight: 600, color: copiedUrl ? "#059669" : "#7A7880", cursor: "pointer", transition: "all .2s" }}
              >
                {copiedUrl ? "✓ Copied!" : "Copy URL"}
              </button>
            </div>
            {product.categories?.[0] && (
              <div style={{ fontSize: "11px", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".08em", color: "#7A7880", marginBottom: "8px" }}>
                {product.categories[0].name}
              </div>
            )}

            {/* Title */}
            <h1 style={{ fontFamily: "var(--font-bebas)", fontSize: "clamp(28px,3vw,42px)", color: "#2A2830", letterSpacing: ".02em", lineHeight: 1.1, marginBottom: "16px" }}>
              {product.name}
            </h1>

            <div style={{ fontSize: "12px", color: "#7A7880", marginBottom: "14px", display: "flex", flexWrap: "wrap", gap: "6px", alignItems: "center" }}>
              {product.variants?.[0]?.sku && <span>{product.variants[0].sku}</span>}
              {(product as any).fabric && <><span style={{ color: "#ccc" }}>·</span><span>{(product as any).fabric}</span></>}
              {(product as any).weight && <><span style={{ color: "#ccc" }}>·</span><span>{(product as any).weight}</span></>}
              {uniqueColors.length > 0 && <><span style={{ color: "#ccc" }}>·</span><span>{uniqueColors.length} Colors</span></>}
            </div>

            {/* Stars */}
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "20px" }}>
              <div style={{ display: "flex", gap: "2px" }}>
                {[1, 2, 3, 4, 5].map(s => (
                  <svg key={s} width="14" height="14" viewBox="0 0 24 24" fill={s <= 4 ? "#C9A84C" : "#E2E0DA"}>
                    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                  </svg>
                ))}
              </div>
              <span style={{ fontSize: "12px", color: "#7A7880" }}>4.8 (124 reviews)</span>
            </div>

            {/* Stars wale div ke baad yeh add karo */}
            <div style={{ background: "rgba(26,92,255,.05)", border: "1px solid rgba(26,92,255,.15)", borderRadius: "8px", padding: "12px 16px", marginBottom: "20px", fontSize: "13px", color: "#2A2830", lineHeight: 1.6 }}>
              ✅ <strong>Print-optimized {(product as any).fabric ?? "ring-spun cotton"}.</strong> Tested for DTF transfers, screen printing, and embroidery. Consistent shrinkage below 3%. {uniqueColors.length} colorways.
            </div>

            {/* Pricing */}
            {/* {isAuthenticated ? (
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
              <div style={{ background: "#111016", border: "1px solid rgba(255,255,255,.08)", borderRadius: "10px", padding: "24px", marginBottom: "20px", textAlign: "center" }}>
                <div style={{ fontSize: "24px", marginBottom: "8px" }}>🔒</div>
                <div style={{ fontFamily: "var(--font-bebas)", fontSize: "18px", color: "#fff", letterSpacing: ".04em", marginBottom: "6px" }}>
                  Wholesale Pricing Locked
                </div>
                <p style={{ fontSize: "13px", color: "#555", marginBottom: "16px", lineHeight: 1.5 }}>
                  Log in to your approved wholesale account to see factory-direct pricing and place orders.
                </p>
                <div style={{ display: "flex", gap: "10px", justifyContent: "center" }}>
                  <Link href="/login" style={{ background: "#E8242A", color: "#fff", padding: "10px 20px", borderRadius: "6px", fontSize: "13px", fontWeight: 700, textDecoration: "none", textTransform: "uppercase", letterSpacing: ".06em" }}>
                    Log In
                  </Link>
                  <Link href="/wholesale/register" style={{ background: "transparent", color: "#fff", padding: "10px 20px", borderRadius: "6px", fontSize: "13px", fontWeight: 600, textDecoration: "none", border: "1px solid rgba(255,255,255,.15)" }}>
                    Apply for Access
                  </Link>
                </div>
              </div>
            )} */}

            {/* Pricing block — shown to all users */}
            <div style={{ background: "#F4F3EF", border: "1px solid #E2E0DA", borderRadius: "10px", padding: "20px", marginBottom: "16px" }}>
              <div style={{ fontSize: "11px", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".08em", color: "#7A7880", marginBottom: "8px" }}>
                {isAuthenticated ? "Wholesale Price" : "Retail Price"}
              </div>
              {primaryVariant?.effective_price ? (
                <div style={{ display: "flex", alignItems: "baseline", gap: "10px" }}>
                  <span style={{ fontFamily: "var(--font-bebas)", fontSize: "36px", color: "#E8242A", letterSpacing: ".02em" }}>
                    {formatCurrency(Number(primaryVariant.effective_price))}
                  </span>
                  <span style={{ fontSize: "12px", color: "#7A7880" }}>/ unit</span>
                </div>
              ) : (
                <span style={{ fontFamily: "var(--font-bebas)", fontSize: "28px", color: "#7A7880" }}>Price on request</span>
              )}
              {product.moq > 1 && (
                <p style={{ fontSize: "12px", color: "#7A7880", marginTop: "6px", marginBottom: 0 }}>
                  Minimum order quantity: <strong style={{ color: "#2A2830" }}>{product.moq} units</strong>
                </p>
              )}
            </div>

            {/* Wholesale upsell banner — guests only */}
            {!isAuthenticated && (
              <div style={{ background: "rgba(26,92,255,.05)", border: "1px solid rgba(26,92,255,.2)", borderRadius: "8px", padding: "10px 16px", marginBottom: "20px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px", flexWrap: "wrap" }}>
                <span style={{ fontSize: "13px", color: "#1A5CFF", fontWeight: 600 }}>
                  🏭 Get factory-direct wholesale pricing — apply for a B2B account
                </span>
                <div style={{ display: "flex", gap: "8px", flexShrink: 0 }}>
                  <Link href="/login" style={{ background: "#1A5CFF", color: "#fff", padding: "6px 14px", borderRadius: "5px", fontSize: "12px", fontWeight: 700, textDecoration: "none" }}>Log In</Link>
                  <Link href="/wholesale/register" style={{ background: "none", color: "#1A5CFF", padding: "6px 14px", borderRadius: "5px", fontSize: "12px", fontWeight: 600, textDecoration: "none", border: "1px solid rgba(26,92,255,.3)" }}>Apply</Link>
                </div>
              </div>
            )}

            {/* ── Color + Order section ──────────────────────────────── */}
            {colorGroups.length > 0 && (
              <div style={{ marginBottom: "20px" }}>
                {/* Color selector pills */}
                <div style={{ fontSize: "13px", fontWeight: 700, color: "#2A2830", marginBottom: "12px" }}>
                  Available Colors ({colorGroups.length})
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", marginBottom: "16px" }}>
                  {colorGroups.map(group => {
                    const hex = COLOR_MAP[group.color] ?? "#E2E0DA";
                    const isLight = ["#FFFFFF", "#fffff0", "#fef3c7", "#f5f0e8"].includes(hex);
                    const isSelected = expandedColors.includes(group.color);
                    return (
                      <button
                        key={group.color}
                        onClick={() => toggleColor(group.color)}
                        style={{ display: "flex", alignItems: "center", gap: "6px", padding: "6px 12px", borderRadius: "20px", cursor: "pointer", border: isSelected ? "2px solid #1A5CFF" : "1.5px solid #E2E0DA", background: isSelected ? "rgba(26,92,255,.06)" : "#fff", fontSize: "12px", fontWeight: 600, transition: "all .15s" }}
                      >
                        <div style={{ width: "14px", height: "14px", borderRadius: "50%", background: hex, border: isLight ? "1px solid #E2E0DA" : "none", flexShrink: 0 }} />
                        {group.color}
                      </button>
                    );
                  })}
                </div>

                {/* Order quantities accordion */}
                <div style={{ fontSize: "13px", fontWeight: 700, color: "#2A2830", marginBottom: "12px" }}>
                  Order Quantities
                </div>

                {filteredGroups.map((group, idx) => {
                  const expanded = isExpanded(group);
                  const hex = COLOR_MAP[group.color] ?? "#E2E0DA";
                  const isLight = ["#FFFFFF", "#fffff0", "#fef3c7", "#f5f0e8"].includes(hex);
                  return (
                    <div key={group.color} style={{ border: "1px solid #E2E0DA", borderRadius: "10px", marginBottom: "10px", overflow: "hidden" }}>
                      {/* Accordion header */}
                      <div
                        onClick={() => toggleColor(group.color)}
                        style={{ display: "flex", alignItems: "center", gap: "10px", padding: "12px 16px", cursor: "pointer", background: "#F4F3EF", userSelect: "none" }}
                      >
                        <div style={{ width: "18px", height: "18px", borderRadius: "50%", background: hex, border: isLight ? "1px solid #E2E0DA" : "none", flexShrink: 0 }} />
                        <span style={{ fontWeight: 700, fontSize: "14px", color: "#2A2830" }}>{group.color}</span>
                        <span style={{ fontSize: "12px", color: "#7A7880", marginLeft: "auto" }}>{group.variants.length} sizes</span>
                        <span style={{ fontSize: "11px", color: "#aaa", transition: "transform .2s", transform: expanded ? "rotate(180deg)" : "rotate(0deg)", display: "inline-block" }}>▼</span>
                      </div>

                      {/* Size inputs */}
                      {expanded && (
                        <div style={{ padding: "16px", display: "flex", flexWrap: "wrap", gap: "10px" }}>
                          {group.variants.map(variant => {
                            const qty = quantities[variant.id] ?? 0;
                            return (
                              <div key={variant.id} style={{ textAlign: "center", minWidth: "64px" }}>
                                <div style={{ fontSize: "11px", fontWeight: 700, textTransform: "uppercase", color: "#7A7880", marginBottom: "4px" }}>{variant.size}</div>
                                <div style={{ fontSize: "11px", color: "#aaa", marginBottom: "6px" }}>
                                  ${Number(variant.effective_price ?? variant.retail_price).toFixed(2)}
                                </div>
                                <input
                                  type="number"
                                  min="0"
                                  max={variant.stock_quantity ?? undefined}
                                  value={qty === 0 ? "" : qty}
                                  onChange={e => {
                                    const raw = parseInt(e.target.value, 10) || 0;
                                    const maxStock = variant.stock_quantity ?? 9999;
                                    const val = Math.min(raw, maxStock);
                                    setQuantities(prev => {
                                      if (val <= 0) {
                                        const next = { ...prev };
                                        delete next[variant.id];
                                        return next;
                                      }
                                      return { ...prev, [variant.id]: val };
                                    });
                                  }}
                                  style={{ width: "64px", height: "44px", textAlign: "center", border: qty > 0 ? "2px solid #1A5CFF" : "1.5px solid #E2E0DA", borderRadius: "8px", fontSize: "15px", fontWeight: 700, outline: "none", fontFamily: "var(--font-jakarta)" }}
                                />
                                {(() => {
                                  const stock = variant.stock_quantity ?? 0;
                                  const isUnlimited = stock >= 9999;
                                  const color = isUnlimited || stock > 10 ? "#059669" : stock >= 5 ? "#D97706" : "#E8242A";
                                  return (
                                    <div style={{ fontSize: "10px", fontWeight: 700, marginTop: "4px", textAlign: "center", color }}>
                                      {isUnlimited ? "In Stock" : `${stock} left`}
                                    </div>
                                  );
                                })()}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}

                {/* Show more / fewer */}
                {!selectedColor && colorGroups.length > 4 && (
                  <button
                    onClick={() => setShowAllColors(!showAllColors)}
                    style={{ width: "100%", padding: "10px", border: "1.5px dashed #E2E0DA", borderRadius: "8px", background: "transparent", cursor: "pointer", fontSize: "13px", fontWeight: 600, color: "#7A7880", marginBottom: "12px" }}
                  >
                    {showAllColors ? `▲ Show fewer colors` : `▼ Show ${colorGroups.length - 4} more colors`}
                  </button>
                )}

                {/* Order summary box */}
                <div style={{ background: "#F4F3EF", borderRadius: "10px", padding: "18px 20px", marginBottom: "16px", border: "1px solid #E2E0DA" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "10px" }}>
                    <span style={{ fontSize: "13px", color: "#7A7880", fontWeight: 500 }}>Total Units</span>
                    <span style={{ fontFamily: "var(--font-bebas)", fontSize: "20px", color: "#2A2830" }}>{totalUnits} units</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
                    <span style={{ fontSize: "13px", color: "#7A7880", fontWeight: 500 }}>Price Per Unit</span>
                    <span style={{ fontWeight: 700, fontSize: "15px", color: "#2A2830" }}>${pricePerUnit.toFixed(2)}</span>
                  </div>
                  <div style={{ fontSize: "11px", color: "#aaa", marginBottom: "12px", fontStyle: "italic" }}>
                    {isAuthenticated ? "Tier pricing applies at checkout" : "Retail pricing — log in for wholesale rates"}
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", borderTop: "1px solid #E2E0DA", paddingTop: "12px" }}>
                    <span style={{ fontSize: "14px", fontWeight: 700, color: "#2A2830" }}>Order Total</span>
                    <span style={{ fontFamily: "var(--font-bebas)", fontSize: "24px", color: "#1A5CFF" }}>${orderTotal.toFixed(2)}</span>
                  </div>
                </div>

                {/* {totalUnits > 0 && (
                  <div style={{ background: "#F4F3EF", borderRadius: "10px", padding: "18px 20px", marginBottom: "16px", border: "1px solid #E2E0DA" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "10px" }}>
                      <span style={{ fontSize: "13px", color: "#7A7880", fontWeight: 500 }}>Total Units</span>
                      <span style={{ fontFamily: "var(--font-bebas)", fontSize: "20px", color: "#2A2830" }}>{totalUnits} units</span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
                      <span style={{ fontSize: "13px", color: "#7A7880", fontWeight: 500 }}>Price Per Unit</span>
                      <span style={{ fontWeight: 700, fontSize: "15px", color: "#2A2830" }}>${pricePerUnit.toFixed(2)}</span>
                    </div>
                    <div style={{ fontSize: "11px", color: "#aaa", marginBottom: "12px", fontStyle: "italic" }}>
                      Tier pricing applies at checkout
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", borderTop: "1px solid #E2E0DA", paddingTop: "12px" }}>
                      <span style={{ fontSize: "14px", fontWeight: 700, color: "#2A2830" }}>Order Total</span>
                      <span style={{ fontFamily: "var(--font-bebas)", fontSize: "24px", color: "#1A5CFF" }}>${orderTotal.toFixed(2)}</span>
                    </div>
                  </div>
                )} */}

                {/* Cart message */}
                {cartMsg && (
                  <div style={{ padding: "10px 14px", borderRadius: "8px", fontSize: "13px", fontWeight: 600, marginBottom: "12px", background: cartMsg.type === "success" ? "rgba(5,150,105,.08)" : "rgba(232,36,42,.08)", color: cartMsg.type === "success" ? "#059669" : "#E8242A", border: `1px solid ${cartMsg.type === "success" ? "rgba(5,150,105,.2)" : "rgba(232,36,42,.2)"}` }}>
                    {cartMsg.text}
                  </div>
                )}

                {/* Add to cart button */}
                <button
                  onClick={handleAddToCart}
                  disabled={totalUnits === 0 || isSubmitting}
                  style={{ width: "100%", padding: "16px", background: totalUnits > 0 ? "#E8242A" : "#E2E0DA", color: totalUnits > 0 ? "#fff" : "#aaa", border: "none", borderRadius: "8px", cursor: totalUnits > 0 ? "pointer" : "not-allowed", fontFamily: "var(--font-bebas)", fontSize: "18px", letterSpacing: ".08em", transition: "all .2s", marginBottom: "12px" }}
                >
                  {isSubmitting ? "ADDING TO CART…" : totalUnits > 0 ? `ADD TO CART — ${totalUnits} UNITS` : "SELECT QUANTITIES TO ORDER"}
                </button>
                {!isAuthenticated && totalUnits > 0 && (
                  <p style={{ textAlign: "center", fontSize: "12px", color: "#7A7880", marginBottom: "8px" }}>
                    <Link href="/login" style={{ color: "#1A5CFF", fontWeight: 600, textDecoration: "none" }}>Log in</Link> or <Link href="/register" style={{ color: "#1A5CFF", fontWeight: 600, textDecoration: "none" }}>create an account</Link> to complete your purchase
                  </p>
                )}

                {/* Request quote */}
                <div style={{ textAlign: "center" }}>
                  <a
                    href="/contact"
                    style={{ fontSize: "13px", color: "#7A7880", textDecoration: "none", borderBottom: "1px solid #E2E0DA", paddingBottom: "1px", transition: "color .2s" }}
                    onMouseEnter={e => (e.currentTarget.style.color = "#1A5CFF")}
                    onMouseLeave={e => (e.currentTarget.style.color = "#7A7880")}
                  >
                    Request a Quote for large or custom orders →
                  </a>
                </div>
              </div>
            )}

            {/* Fallback color swatches when product has no variants */}
            {colorGroups.length === 0 && uniqueColors.length > 0 && (
              <div style={{ marginBottom: "16px" }}>
                <div style={{ fontSize: "11px", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".08em", color: "#7A7880", marginBottom: "8px" }}>
                  Available Colors ({uniqueColors.length})
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", marginBottom: "16px" }}>
                  {uniqueColors.map(color => {
                    const hex = COLOR_MAP[color] ?? "#E2E0DA";
                    return (
                      <button
                        key={color}
                        title={color}
                        onClick={() => {
                          const colorLower = color.toLowerCase();
                          const matchIdx = images.findIndex(img => img.alt_text?.toLowerCase().includes(colorLower));
                          if (matchIdx >= 0) setActiveImageIdx(matchIdx);
                        }}
                        style={{ width: "24px", height: "24px", borderRadius: "50%", background: hex, border: ["#FFFFFF", "#fffff0", "#fef3c7", "#f5f0e8"].includes(hex) ? "1px solid #E2E0DA" : "1px solid transparent", cursor: "pointer", padding: 0 }}
                      />
                    );
                  })}
                </div>
              </div>
            )}

            {/* Trust badges */}
            <div className="pd-trust-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", marginBottom: "20px" }}>
              {[
                { icon: <FactoryIcon size={16} color="#2A2830" />, text: "Factory-Direct Pricing" },
                { icon: <ZapIcon size={16} color="#2A2830" />, text: "Same-Day Shipping" },
                { icon: <PackageIcon size={16} color="#2A2830" />, text: "No Order Minimums" },
                { icon: <PaletteIcon size={16} color="#2A2830" />, text: "Print-Optimized Blanks" },
              ].map(item => (
                <div key={item.text} style={{ display: "flex", alignItems: "center", gap: "8px", padding: "10px 12px", background: "#F4F3EF", borderRadius: "6px", border: "1px solid #E2E0DA" }}>
                  {item.icon}
                  <span style={{ fontSize: "11px", fontWeight: 600, color: "#2A2830" }}>{item.text}</span>
                </div>
              ))}
            </div>

            {/* Asset Downloads */}
            {/* {isAuthenticated && (
              <div style={{ borderTop: "1px solid #E2E0DA", paddingTop: "16px" }}>
                <div style={{ fontSize: "11px", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".08em", color: "#7A7880", marginBottom: "10px" }}>
                  Downloads & Assets
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                  {product.images && product.images.length > 0 && (
                    <button onClick={handleDownloadImages} style={{ display: "inline-flex", alignItems: "center", gap: "6px", padding: "8px 14px", border: "1px solid #E2E0DA", borderRadius: "6px", fontSize: "12px", fontWeight: 600, color: "#2A2830", background: "#fff", cursor: "pointer" }}>
                      <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                      Download Images
                    </button>
                  )}
                  {hasFlyer && (
                    <>
                      <button onClick={handleDownloadFlyer} style={{ display: "inline-flex", alignItems: "center", gap: "6px", padding: "8px 14px", border: "1px solid #E2E0DA", borderRadius: "6px", fontSize: "12px", fontWeight: 600, color: "#2A2830", background: "#fff", cursor: "pointer" }}>
                        <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>
                        Download Flyer
                      </button>
                      <button onClick={handleEmailFlyer} disabled={emailingFlyer} style={{ display: "inline-flex", alignItems: "center", gap: "6px", padding: "8px 14px", border: "1px solid #E2E0DA", borderRadius: "6px", fontSize: "12px", fontWeight: 600, color: "#2A2830", background: "#fff", cursor: emailingFlyer ? "not-allowed" : "pointer", opacity: emailingFlyer ? 0.5 : 1 }}>
                        <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                        {emailingFlyer ? "Sending…" : "Email Flyer"}
                      </button>
                    </>
                  )}
                </div>
                {assetMsg && <p style={{ marginTop: "8px", fontSize: "12px", color: "#1A5CFF" }}>{assetMsg}</p>}
              </div>
            )} */}
          </div>
        </div>

        {/* ── Product Tabs ───────────────────────────────────────────────── */}
        <div style={{ marginTop: "40px", borderTop: "1px solid #E2E0DA" }}>
          <div className="pd-tab-bar" style={{ gap: "0", borderBottom: "1px solid #E2E0DA" }}>
            {TABS.map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                style={{ padding: "14px 20px", fontSize: "13px", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".06em", color: activeTab === tab ? "#E8242A" : "#7A7880", background: "none", border: "none", borderBottom: activeTab === tab ? "2px solid #E8242A" : "2px solid transparent", marginBottom: "-1px", cursor: "pointer", whiteSpace: "nowrap", transition: "color .15s" }}
              >
                {tab}
              </button>
            ))}
          </div>

          <div style={{ padding: "32px 0" }}>
            {activeTab === "Description" && (
              <div style={{ maxWidth: "720px" }}>
                {product.description ? (
                  <div
                    style={{ fontSize: "15px", color: "#2A2830", lineHeight: 1.7 }}
                    dangerouslySetInnerHTML={{ __html: product.description }}
                  />
                ) : (
                  <p style={{ fontSize: "15px", color: "#2A2830", lineHeight: 1.7 }}>
                    No description available for this product.
                  </p>
                )}
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
                      ...(((product as any).fabric) ? [{ label: "Fabric", value: (product as any).fabric }] : []),
                      ...(((product as any).weight) ? [{ label: "Weight", value: (product as any).weight }] : []),
                      ...(((product as any).product_code) ? [{ label: "Product Code", value: (product as any).product_code }] : []),
                    ].map(row => (
                      <tr key={row.label} style={{ borderBottom: "1px solid #F4F3EF" }}>
                        <td style={{ padding: "12px 0", color: "#7A7880", fontWeight: 600, width: "40%" }}>{row.label}</td>
                        <td style={{ padding: "12px 0", color: "#2A2830" }}>{row.value}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {(product as any).care_instructions && (
                  <div style={{ marginTop: "20px", padding: "16px", background: "#F4F3EF", borderRadius: "8px", border: "1px solid #E2E0DA" }}>
                    <div style={{ fontSize: "11px", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".07em", color: "#7A7880", marginBottom: "8px" }}>Care Instructions</div>
                    <p style={{ fontSize: "14px", color: "#2A2830", lineHeight: 1.7, margin: 0, whiteSpace: "pre-wrap" }}>{(product as any).care_instructions}</p>
                  </div>
                )}
              </div>
            )}

            {activeTab === "Print Guide" && (
              <div style={{ maxWidth: "720px" }}>
                {(() => {
                  const methods: string[] = ((product as any).print_guide as any)?.methods ?? [];
                  if (methods.length === 0) {
                    return (
                      <div style={{ background: "#F4F3EF", border: "1px solid #E2E0DA", borderRadius: "10px", padding: "32px", textAlign: "center", color: "#aaa", fontSize: "14px" }}>
                        Print compatibility information coming soon.
                      </div>
                    );
                  }
                  return (
                    <div style={{ background: "#F4F3EF", border: "1px solid #E2E0DA", borderRadius: "10px", padding: "24px" }}>
                      <h3 style={{ fontFamily: "var(--font-bebas)", fontSize: "18px", letterSpacing: ".04em", color: "#2A2830", marginBottom: "16px" }}>Print Compatibility</h3>
                      <div className="pd-print-grid" style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: "12px" }}>
                        {methods.map(method => (
                          <div key={method} style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "13px", color: "#2A2830" }}>
                            <span style={{ width: "18px", height: "18px", borderRadius: "50%", background: "#E8242A", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                            </span>
                            {method}
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })()}
              </div>
            )}

            {activeTab === "Size Chart" && (
              <div style={{ overflowX: "auto" }}>
                {(() => {
                  const rows: any[] = ((product as any).size_chart_data as any[]) ?? [];
                  if (rows.length === 0) {
                    return (
                      <div style={{ padding: "32px", textAlign: "center", background: "#F4F3EF", borderRadius: "10px", border: "1px solid #E2E0DA", color: "#aaa", fontSize: "14px" }}>
                        Size chart coming soon.
                      </div>
                    );
                  }
                  return (
                    <table style={{ borderCollapse: "collapse", fontSize: "13px", minWidth: "500px" }}>
                      <thead>
                        <tr style={{ background: "#111016" }}>
                          {["Size", "Chest (in)", "Length (in)", "Sleeve (in)"].map(h => (
                            <th key={h} style={{ padding: "10px 16px", textAlign: "left", color: "#fff", fontFamily: "var(--font-bebas)", letterSpacing: ".06em", fontSize: "13px" }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {rows.map((row: any, i: number) => (
                          <tr key={i} style={{ background: i % 2 === 0 ? "#F4F3EF" : "#fff", borderBottom: "1px solid #E2E0DA" }}>
                            <td style={{ padding: "10px 16px", color: "#2A2830", fontWeight: 700 }}>{row.size ?? "—"}</td>
                            <td style={{ padding: "10px 16px", color: "#2A2830" }}>{row.chest ?? "—"}</td>
                            <td style={{ padding: "10px 16px", color: "#2A2830" }}>{row.length ?? "—"}</td>
                            <td style={{ padding: "10px 16px", color: "#2A2830" }}>{row.sleeve ?? "—"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  );
                })()}
              </div>
            )}

            {activeTab === "Reviews" && (
              <ReviewsTab productId={product.id} isAuthenticated={isAuthenticated} />
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

      {/* ── Image Library Modal ───────────────────────────────────────────── */}
      {showImageLibrary && (
        <div
          style={{ position: "fixed", inset: 0, zIndex: 1000, background: "rgba(0,0,0,.75)", display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" }}
          onClick={() => setShowImageLibrary(false)}
        >
          <div
            style={{ background: "#fff", borderRadius: "12px", maxWidth: "960px", width: "100%", maxHeight: "90vh", overflow: "auto", padding: "28px" }}
            onClick={e => e.stopPropagation()}
          >
            {/* Modal header */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
              <div>
                <h3 style={{ fontFamily: "var(--font-bebas)", fontSize: "22px", letterSpacing: ".04em", color: "#2A2830", margin: 0 }}>
                  Image Library
                </h3>
                <p style={{ fontSize: "12px", color: "#7A7880", margin: "4px 0 0" }}>
                  {product.images!.length} image{product.images!.length !== 1 ? "s" : ""} — click any image to open full size
                </p>
              </div>
              <button
                onClick={() => setShowImageLibrary(false)}
                style={{ width: "32px", height: "32px", borderRadius: "50%", border: "1px solid #E2E0DA", background: "#fff", cursor: "pointer", fontSize: "16px", display: "flex", alignItems: "center", justifyContent: "center", color: "#7A7880" }}
              >
                ✕
              </button>
            </div>

            {/* Image grid */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: "12px" }}>
              {product.images!.map((img, i) => (
                <div key={img.id} style={{ border: "1px solid #E2E0DA", borderRadius: "10px", overflow: "hidden", background: "#F4F3EF" }}>
                  <button
                    onClick={() => { setActiveImageIdx(images.indexOf(img)); setShowImageLibrary(false); }}
                    style={{ display: "block", width: "100%", border: "none", padding: 0, cursor: "pointer", background: "none" }}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={imgSrc(img)}
                      alt={img.alt_text ?? `${product.name} — Image ${i + 1}`}
                      style={{ width: "100%", aspectRatio: "1", objectFit: "cover", display: "block" }}
                    />
                  </button>
                  <div style={{ padding: "8px 10px", display: "flex", gap: "6px" }}>
                    <button
                      onClick={async () => {
                        try {
                          const resp = await fetch(imgSrc(img));
                          const blob = await resp.blob();
                          const url = URL.createObjectURL(blob);
                          const a = document.createElement("a");
                          a.href = url;
                          a.download = `${product.slug}-image-${i + 1}.jpg`;
                          document.body.appendChild(a);
                          a.click();
                          document.body.removeChild(a);
                          URL.revokeObjectURL(url);
                        } catch {
                          window.open(imgSrc(img), "_blank");
                        }
                      }}
                      style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: "5px", padding: "6px 10px", background: "#1A5CFF", color: "#fff", borderRadius: "6px", fontSize: "11px", fontWeight: 700, border: "none", cursor: "pointer" }}
                    >
                      <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                      Download
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
