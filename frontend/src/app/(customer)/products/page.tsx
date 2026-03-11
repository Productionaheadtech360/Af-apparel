import { Suspense } from "react";
import type { Metadata } from "next";
import { productsService } from "@/services/products.service";
import { ProductCard } from "@/components/products/ProductCard";
import { FilterSidebar } from "@/components/products/FilterSidebar";
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

  // Extract unique sizes and colors from current result set
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
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Products</h1>
          <p className="mt-1 text-sm text-gray-500">
            {productData.total} product{productData.total !== 1 ? "s" : ""}
          </p>
        </div>

        <div className="flex gap-8">
          <Suspense fallback={null}>
            <FilterSidebar categories={categories} sizes={sizes} colors={colors} />
          </Suspense>

          <div className="flex-1 min-w-0">
            {/* Mobile filter button + search */}
            <ProductListClient
              initialProducts={productData.items}
              total={productData.total}
              currentPage={productData.page}
              pages={productData.pages}
              categories={categories}
              sizes={sizes}
              colors={colors}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
