"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ProductCard } from "@/components/products/ProductCard";
import { FilterSidebar } from "@/components/products/FilterSidebar";
import { apiClient } from "@/lib/api-client";
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
  const [filterOpen, setFilterOpen] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkDownloading, setBulkDownloading] = useState(false);
  const [bulkMessage, setBulkMessage] = useState<string | null>(null);

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function selectAll() {
    setSelected(new Set(initialProducts.map((p) => p.id)));
  }

  function clearSelection() {
    setSelected(new Set());
  }

  async function handleBulkDownload() {
    if (selected.size === 0) return;
    setBulkDownloading(true);
    setBulkMessage(null);
    try {
      const res: any = await apiClient.post("/products/bulk-download", {
        product_ids: Array.from(selected),
      });
      const taskId = res.data?.task_id;
      setBulkMessage(
        `ZIP generation queued (task: ${taskId?.slice(0, 8)}…). Check back in a moment.`
      );
    } catch {
      setBulkMessage("Failed to queue bulk download.");
    } finally {
      setBulkDownloading(false);
    }
  }

  function buildUrl(page: number) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", String(page));
    return `/products?${params.toString()}`;
  }

  return (
    <>
      {/* Bulk selection toolbar */}
      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={selected.size === initialProducts.length && initialProducts.length > 0}
            onChange={(e) => (e.target.checked ? selectAll() : clearSelection())}
          />
          Select all
        </label>
        {selected.size > 0 && (
          <>
            <span className="text-sm text-gray-500">{selected.size} selected</span>
            <button
              onClick={handleBulkDownload}
              disabled={bulkDownloading}
              className="px-3 py-1.5 bg-blue-600 text-white rounded text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
            >
              {bulkDownloading ? "Queuing…" : "Bulk Download"}
            </button>
            <button
              onClick={clearSelection}
              className="text-sm text-gray-400 hover:text-gray-600"
            >
              Clear
            </button>
          </>
        )}
      </div>

      {bulkMessage && (
        <div className="mb-4 bg-blue-50 border border-blue-200 rounded p-3 text-sm text-blue-800">
          {bulkMessage}
        </div>
      )}

      {/* Mobile filter + search bar */}
      <div className="flex items-center gap-3 mb-4 lg:hidden">
        <button
          onClick={() => setFilterOpen(true)}
          className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-md text-sm text-gray-700 bg-white hover:bg-gray-50"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4h18M7 12h10M11 20h2" />
          </svg>
          Filters
        </button>
      </div>

      {/* Mobile filter slide-in */}
      <FilterSidebar
        categories={categories}
        sizes={sizes}
        colors={colors}
        isOpen={filterOpen}
        onClose={() => setFilterOpen(false)}
      />

      {/* Product grid */}
      {initialProducts.length === 0 ? (
        <div className="text-center py-16 text-gray-500">
          <p className="text-lg font-medium">No products found</p>
          <p className="text-sm mt-1">Try adjusting your filters or search term.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-4">
          {initialProducts.map((product) => (
            <div key={product.id} className="relative">
              <input
                type="checkbox"
                checked={selected.has(product.id)}
                onChange={() => toggleSelect(product.id)}
                className="absolute top-2 left-2 z-10 w-4 h-4 cursor-pointer"
                onClick={(e) => e.stopPropagation()}
              />
              <ProductCard product={product} />
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {pages > 1 && (
        <div className="mt-8 flex items-center justify-center gap-2">
          {currentPage > 1 && (
            <button
              onClick={() => router.push(buildUrl(currentPage - 1))}
              className="px-4 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Previous
            </button>
          )}
          <span className="text-sm text-gray-600">
            Page {currentPage} of {pages}
          </span>
          {currentPage < pages && (
            <button
              onClick={() => router.push(buildUrl(currentPage + 1))}
              className="px-4 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Next
            </button>
          )}
        </div>
      )}
    </>
  );
}
