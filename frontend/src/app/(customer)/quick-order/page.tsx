"use client";

import { useState } from "react";
import { cartService } from "@/services/cart.service";
import { SkuInput } from "@/components/cart/SkuInput";
import { SkuValidationResults } from "@/components/cart/SkuValidationResults";

interface ValidationItem {
  sku: string;
  quantity: number;
  status: string;
  product_name?: string | null;
  available_quantity?: number | null;
}

interface QuickOrderResult {
  valid: ValidationItem[];
  invalid: ValidationItem[];
  insufficient_stock: ValidationItem[];
  added_to_cart: number;
}

export default function QuickOrderPage() {
  const [result, setResult] = useState<QuickOrderResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(items: { sku: string; quantity: number }[]) {
    setIsLoading(true);
    setError(null);
    setResult(null);
    try {
      const data = await cartService.quickOrder(items) as QuickOrderResult;
      setResult(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Order validation failed");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-2">Quick Order</h1>
      <p className="text-sm text-gray-500 mb-6">
        Enter SKU and quantity pairs to quickly add items to your cart. Format: <code className="bg-gray-100 px-1 rounded">SKU, Qty</code> — one per line.
      </p>

      <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
        <SkuInput onSubmit={handleSubmit} isLoading={isLoading} />
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-4">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {result && (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="text-base font-semibold text-gray-900 mb-4">
            Results — {result.added_to_cart} item{result.added_to_cart !== 1 ? "s" : ""} added to cart
          </h2>
          <SkuValidationResults result={result} />
          {result.added_to_cart > 0 && (
            <div className="mt-4">
              <a href="/cart" className="inline-block bg-brand-600 text-white rounded-md px-4 py-2 text-sm font-medium hover:bg-brand-700">
                View Cart →
              </a>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
