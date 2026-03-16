"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { formatCurrency } from "@/lib/utils";
import type { ProductDetail } from "@/types/product.types";
import { useAuthStore } from "@/stores/auth.store";
import { VariantMatrix } from "@/components/products/VariantMatrix";
import { apiClient } from "@/lib/api-client";

interface ProductDetailClientProps {
  product: ProductDetail;
}

export function ProductDetailClient({ product }: ProductDetailClientProps) {
  const [activeImage, setActiveImage] = useState(
    product.images?.find((i) => i.is_primary) ?? product.images?.[0]
  );
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated());
  const [assetMsg, setAssetMsg] = useState<string | null>(null);
  const [emailingFlyer, setEmailingFlyer] = useState(false);

  const primaryVariant = product.variants?.[0];

  const hasFlyer = product.assets?.some((a: any) => a.asset_type === "flyer");

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

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Breadcrumb */}
        <nav className="text-sm text-gray-500 mb-6">
          <Link href="/products" className="hover:text-brand-600">
            Products
          </Link>
          {product.categories?.[0] && (
            <>
              <span className="mx-2">/</span>
              <Link
                href={`/products?category=${product.categories[0].slug}`}
                className="hover:text-brand-600"
              >
                {product.categories[0].name}
              </Link>
            </>
          )}
          <span className="mx-2">/</span>
          <span className="text-gray-900">{product.name}</span>
        </nav>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
          {/* Image gallery */}
          <div>
            <div className="relative aspect-square rounded-lg overflow-hidden bg-gray-100 mb-3">
              {activeImage ? (
                <Image
                  src={activeImage.url_large_webp ?? activeImage.url_large}
                  alt={activeImage.alt_text ?? product.name}
                  fill
                  sizes="(max-width: 1024px) 100vw, 50vw"
                  className="object-cover"
                  priority
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-300">
                  No image
                </div>
              )}
            </div>
            {product.images && product.images.length > 1 && (
              <div className="flex gap-2 overflow-x-auto pb-1">
                {product.images.map((img) => (
                  <button
                    key={img.id}
                    onClick={() => setActiveImage(img)}
                    className={`relative flex-shrink-0 w-16 h-16 rounded border-2 overflow-hidden transition-colors ${
                      activeImage?.id === img.id
                        ? "border-brand-500"
                        : "border-gray-200 hover:border-gray-400"
                    }`}
                  >
                    <Image
                      src={img.url_thumbnail_webp ?? img.url_thumbnail}
                      alt={img.alt_text ?? ""}
                      fill
                      sizes="64px"
                      className="object-cover"
                    />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Product info */}
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{product.name}</h1>

            {/* Price */}
            <div className="mt-3 flex items-baseline gap-3">
              {isAuthenticated && primaryVariant?.effective_price ? (
                <>
                  <span className="text-2xl font-bold text-brand-700">
                    {formatCurrency(Number(primaryVariant.effective_price))}
                  </span>
                  {primaryVariant.effective_price !== primaryVariant.retail_price && (
                    <span className="text-base text-gray-400 line-through">
                      {formatCurrency(Number(primaryVariant.retail_price))}
                    </span>
                  )}
                </>
              ) : (
                <div className="text-sm text-gray-500 bg-gray-50 border border-gray-200 rounded px-3 py-2">
                  <Link href="/login" className="text-brand-600 hover:underline font-medium">
                    Log in
                  </Link>{" "}
                  to see wholesale pricing
                </div>
              )}
            </div>

            {/* MOQ */}
            {product.moq > 1 && (
              <p className="mt-2 text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded px-3 py-1.5 inline-block">
                Minimum order: {product.moq} units
              </p>
            )}

            {/* Description */}
            {product.description && (
              <div className="mt-4 prose prose-sm text-gray-600 max-w-none">
                <p>{product.description}</p>
              </div>
            )}

            {/* Variant availability table */}
            {product.variants && product.variants.length > 0 && (
              <div className="mt-6">
                <h2 className="text-sm font-semibold text-gray-900 mb-2">
                  Availability
                </h2>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm border-collapse">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className="text-left py-2 pr-4 text-gray-600 font-medium">SKU</th>
                        <th className="text-left py-2 pr-4 text-gray-600 font-medium">Color</th>
                        <th className="text-left py-2 pr-4 text-gray-600 font-medium">Size</th>
                        <th className="text-right py-2 text-gray-600 font-medium">Stock</th>
                      </tr>
                    </thead>
                    <tbody>
                      {product.variants.map((v) => (
                        <tr key={v.id} className="border-b border-gray-100 last:border-0">
                          <td className="py-2 pr-4 font-mono text-xs text-gray-500">
                            {v.sku}
                          </td>
                          <td className="py-2 pr-4 text-gray-700">{v.color ?? "—"}</td>
                          <td className="py-2 pr-4 text-gray-700">{v.size ?? "—"}</td>
                          <td className="py-2 text-right">
                            {(v.stock_quantity ?? 0) > 0 ? (
                              <span className="text-green-600 font-medium">
                                {v.stock_quantity}
                              </span>
                            ) : (
                              <span className="text-red-500">Out of stock</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Variant Matrix — bulk order entry */}
            {isAuthenticated && product.variants && product.variants.length > 0 && (
              <VariantMatrix
                productId={product.id}
                variants={product.variants}
                moq={product.moq}
              />
            )}

            {/* Asset Downloads — T204 */}
            {isAuthenticated && (
              <div className="mt-6 pt-6 border-t border-gray-200">
                <h2 className="text-sm font-semibold text-gray-700 mb-3">Downloads & Assets</h2>
                <div className="flex flex-wrap gap-2">
                  {product.images && product.images.length > 0 && (
                    <button
                      onClick={handleDownloadImages}
                      className="inline-flex items-center gap-1.5 px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-700 hover:bg-gray-50"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                      </svg>
                      Download Images
                    </button>
                  )}
                  {hasFlyer && (
                    <>
                      <button
                        onClick={handleDownloadFlyer}
                        className="inline-flex items-center gap-1.5 px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-700 hover:bg-gray-50"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                        </svg>
                        Download Flyer
                      </button>
                      <button
                        onClick={handleEmailFlyer}
                        disabled={emailingFlyer}
                        className="inline-flex items-center gap-1.5 px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                        </svg>
                        {emailingFlyer ? "Sending..." : "Email Flyer"}
                      </button>
                    </>
                  )}
                </div>
                {assetMsg && (
                  <p className="mt-2 text-sm text-blue-700">{assetMsg}</p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
