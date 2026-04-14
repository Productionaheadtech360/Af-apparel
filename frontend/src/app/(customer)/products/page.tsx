export const dynamic = "force-dynamic";

import { Suspense } from "react";
import type { Metadata } from "next";
import { productsService } from "@/services/products.service";
import { ProductListClient } from "./ProductListClient";

export const metadata: Metadata = {
  title: "Products — AF Apparels Wholesale",
  description: "Browse our wholesale apparel catalog",
};

interface PageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function ProductsPage({ searchParams }: PageProps) {
  const params = await searchParams;

  const filters = {
    category: typeof params.category === "string" ? params.category : undefined,
    size: typeof params.size === "string" ? params.size : undefined,
    color: typeof params.color === "string" ? params.color : undefined,
    q: typeof params.q === "string" ? params.q : undefined,
    page: params.page ? Number(params.page) : 1,
    page_size: 24,
    gender: typeof params.gender === "string" ? params.gender : undefined,
    in_stock: params.in_stock === "true" ? true : undefined,
    price_min: params.price_min ? Number(params.price_min) : undefined,
    price_max: params.price_max ? Number(params.price_max) : undefined,
    product_code: typeof params.product_code === "string" ? params.product_code : undefined,
  };

  const [categoriesResult, productsResult] = await Promise.allSettled([
    productsService.getCategories(),
    productsService.listProducts(filters),
  ]);

  const categories = categoriesResult.status === "fulfilled" ? categoriesResult.value : [];
  const productData =
    productsResult.status === "fulfilled"
      ? productsResult.value
      : { items: [], total: 0, page: 1, page_size: 24, pages: 0 };

  const sizes = Array.from(
    new Set(
      productData.items.flatMap((p) =>
        p.variants?.map((v) => v.size).filter(Boolean) ?? []
      )
    )
  ).sort() as string[];

  const colors = Array.from(
    new Set(
      productData.items.flatMap((p) =>
        p.variants?.map((v) => v.color).filter(Boolean) ?? []
      )
    )
  ).sort() as string[];

  return (
    <div style={{ minHeight: "100vh", background: "#fff", fontFamily: "var(--font-jakarta)" }}>
      {/* Banner */}
      <div style={{ background: "#111016", padding: "40px 32px", borderBottom: "1px solid rgba(255,255,255,.06)" }}>
        <div style={{ maxWidth: "1280px", margin: "0 auto" }}>
          <div style={{ fontSize: "12px", color: "#444", fontWeight: 600, textTransform: "uppercase", letterSpacing: ".1em", marginBottom: "6px" }}>Shop</div>
          <h1 style={{ fontFamily: "var(--font-bebas)", fontSize: "clamp(36px,4vw,52px)", color: "#fff", letterSpacing: ".01em", marginBottom: "6px" }}>
            {filters.category
              ? (categories.find(c => c.slug === filters.category)?.name ?? "All Products")
              : "All Products"}
          </h1>
          <p style={{ fontSize: "14px", color: "#555" }}>
            Factory-direct blank apparel for printing companies, retailers, and brands
          </p>
        </div>
      </div>

      {/* ProductListClient owns the full collection layout (sidebar + grid) */}
      <Suspense fallback={
        <div style={{ padding: "40px 32px", textAlign: "center", color: "#aaa", fontSize: "14px" }}>
          Loading products…
        </div>
      }>
        <ProductListClient
          initialProducts={productData.items}
          total={productData.total}
          currentPage={productData.page}
          pages={productData.pages}
          categories={categories}
          sizes={sizes}
          colors={colors}
        />
      </Suspense>
    </div>
  );
}
