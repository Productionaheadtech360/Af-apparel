"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { productsService } from "@/services/products.service";

interface ProductImageOut {
  url_thumbnail: string;
  url_medium: string;
  url_medium_webp?: string | null;
}

interface ProductItem {
  id: string;
  name: string;
  slug: string;
  base_price?: number;
  primary_image?: ProductImageOut | string | null;
  moq?: number;
  categories?: { name: string }[];
  variants?: { retail_price: number | string }[];
  fabric?: string | null;
  product_code?: string | null;
  weight?: string | null;
}

function imageUrl(img: ProductImageOut | string | null | undefined): string | null {
  if (!img) return null;
  if (typeof img === "string") return img;
  return img.url_medium_webp ?? img.url_medium ?? null;
}

const FALLBACK: ProductItem[] = [
  { id: "1", name: "Classic White T-Shirt", slug: "classic-white-t-shirt", base_price: 8.99, categories: [{ name: "T-Shirts" }] },
  { id: "2", name: "Business Polo Shirt", slug: "business-polo-shirt", base_price: 28.00, categories: [{ name: "Polo Shirts" }] },
  { id: "3", name: "Sport Hoodie", slug: "sport-hoodie", base_price: 32.00, categories: [{ name: "Hoodies" }] },
  { id: "4", name: "Casual Denim Jacket", slug: "casual-denim-jacket", base_price: 65.00, categories: [{ name: "Jackets" }] },
];

const BADGES: Record<number, { label: string; bg: string }> = {
  0: { label: "BEST SELLER", bg: "#E8242A" },
  1: { label: "POPULAR", bg: "#1A5CFF" },
};

export function BestSellers() {
  const [products, setProducts] = useState<ProductItem[]>([]);

  useEffect(() => {
    productsService
      .listProducts({ page_size: 4 })
      .then(res => {
        const items = (res?.items ?? []) as ProductItem[];
        setProducts(items.length > 0 ? items : FALLBACK);
      })
      .catch(() => setProducts(FALLBACK));
  }, []);

  return (
    <section style={{ padding: "80px 0", background: "#fff" }}>
      <div style={{ maxWidth: "1280px", margin: "0 auto", padding: "0 32px" }}>

        {/* Section header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: "40px" }}>
          <div>
            <h2 style={{ fontFamily: "var(--font-bebas)", fontSize: "clamp(32px,3.5vw,48px)", color: "#2A2830", letterSpacing: ".01em", lineHeight: 1, marginBottom: "8px" }}>
              Best Sellers
            </h2>
            <p style={{ fontSize: "14px", color: "#7A7880", margin: 0 }}>
              Most ordered styles by our wholesale customers
            </p>
          </div>
          <Link href="/products" style={{ fontSize: "13px", fontWeight: 700, color: "#1A5CFF", textDecoration: "none", display: "flex", alignItems: "center", gap: "4px" }}>
            View All Products →
          </Link>
        </div>

        {/* Grid */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: "16px" }} className="best-sellers-grid">
          {products.map((product, i) => (
            <Link key={product.id} href={`/products/${product.slug}`} style={{ textDecoration: "none", display: "block" }}>
              <div
                style={{ background: "#fff", border: "1px solid #E2E0DA", borderRadius: "10px", overflow: "hidden", transition: "all .25s" }}
                onMouseEnter={e => {
                  (e.currentTarget as HTMLDivElement).style.boxShadow = "0 8px 30px rgba(0,0,0,.1)";
                  (e.currentTarget as HTMLDivElement).style.transform = "translateY(-2px)";
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLDivElement).style.boxShadow = "none";
                  (e.currentTarget as HTMLDivElement).style.transform = "translateY(0)";
                }}
              >
                {/* Image */}
                <div style={{ height: "220px", background: "linear-gradient(135deg,#f0ede8 0%,#e8e4df 100%)", display: "flex", alignItems: "center", justifyContent: "center", position: "relative", overflow: "hidden" }}>
                  {imageUrl(product.primary_image) ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={imageUrl(product.primary_image)!} alt={product.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  ) : (
                    <svg width="52" height="52" viewBox="0 0 24 24" fill="none" stroke="#2A2830" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.25 }}><path d="M20.38 3.46L16 2a4 4 0 01-8 0L3.62 3.46a2 2 0 00-1.34 2.23l.58 3.57a1 1 0 00.99.84H6v10c0 1.1.9 2 2 2h8a2 2 0 002-2V10h2.15a1 1 0 00.99-.84l.58-3.57a2 2 0 00-1.34-2.23z"/></svg>
                  )}
                  {BADGES[i] && (
                    <div style={{ position: "absolute", top: "12px", left: "12px", background: BADGES[i]!.bg, color: "#fff", fontFamily: "var(--font-bebas)", fontSize: "11px", letterSpacing: ".08em", padding: "4px 10px", borderRadius: "4px" }}>
                      {BADGES[i]!.label}
                    </div>
                  )}
                </div>

                {/* Info */}
                <div style={{ padding: "16px 18px" }}>
                  <div style={{ fontSize: "11px", color: "#7A7880", textTransform: "uppercase", letterSpacing: ".06em", marginBottom: "5px", fontWeight: 600 }}>
                    {[
                      (product as any).fabric,
                      (product as any).product_code,
                      (product as any).weight,
                    ].filter(Boolean).join(" · ") || product.categories?.[0]?.name || "Apparel"}
                  </div>
                  <h4 style={{ fontFamily: "var(--font-bebas)", fontSize: "17px", letterSpacing: ".03em", marginBottom: "8px", color: "#2A2830", lineHeight: 1.2 }}>
                    {product.name}
                  </h4>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div>
                      {(() => {
                        const price = Number(product.base_price) || Number(product.variants?.[0]?.retail_price) || 0;
                        return price > 0 ? (
                          <>
                            <span style={{ fontFamily: "var(--font-bebas)", fontSize: "20px", color: "#1A5CFF" }}>${price.toFixed(2)}</span>
                            <span style={{ fontSize: "11px", color: "#aaa", marginLeft: "4px" }}>/ unit</span>
                          </>
                        ) : (
                          <span style={{ fontSize: "12px", color: "#7A7880", fontWeight: 600 }}>Login for pricing</span>
                        );
                      })()}
                    </div>
                    <div style={{ fontSize: "11px", color: "#7A7880", fontWeight: 600 }}>
                      MOQ: {product.moq ?? 6}
                    </div>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
