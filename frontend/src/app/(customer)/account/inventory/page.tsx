"use client";

import { useEffect, useState } from "react";
import { accountService } from "@/services/account.service";
import { useAuthStore } from "@/stores/auth.store";

interface InventoryItem {
  variant_id: string;
  sku: string;
  product_name: string;
  color?: string;
  size?: string;
  quantity: number;
  low_stock_threshold: number;
  warehouse_name?: string;
}

export default function AccountInventoryPage() {
  const { isLoading: authLoading, isAuthenticated } = useAuthStore();
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [stockLevel, setStockLevel] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (authLoading || !isAuthenticated()) return;
    async function load() {
      setIsLoading(true);
      try {
        const data = await accountService.getInventoryReport({
          stock_level: stockLevel || undefined,
        }) as InventoryItem[];
        setItems(data);
      } finally {
        setIsLoading(false);
      }
    }
    load();
  }, [authLoading, stockLevel]);

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold text-gray-900">Inventory Report</h1>
        <select
          value={stockLevel}
          onChange={(e) => setStockLevel(e.target.value)}
          className="rounded-md border border-gray-300 px-3 py-1.5 text-sm"
        >
          <option value="">All stock</option>
          <option value="low">Low stock only</option>
          <option value="out">Out of stock</option>
        </select>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="text-left px-4 py-3 text-gray-600 font-medium">SKU</th>
              <th className="text-left px-4 py-3 text-gray-600 font-medium">Product</th>
              <th className="text-left px-4 py-3 text-gray-600 font-medium">Color / Size</th>
              <th className="text-right px-4 py-3 text-gray-600 font-medium">Qty</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={4} className="py-8 text-center text-gray-400">
                  Loading…
                </td>
              </tr>
            ) : items.length === 0 ? (
              <tr>
                <td colSpan={4} className="py-8 text-center text-gray-400">
                  No inventory data
                </td>
              </tr>
            ) : (
              items.map((item, idx) => (
                <tr
                  key={`${item.variant_id}-${item.sku}-${idx}`}
                  className={`border-b border-gray-100 last:border-0 ${
                    item.quantity <= item.low_stock_threshold ? "bg-red-50" : ""
                  }`}
                >
                  <td className="px-4 py-3 font-mono text-xs text-gray-600">
                    {item.sku}
                  </td>
                  <td className="px-4 py-3 text-gray-700">{item.product_name}</td>
                  <td className="px-4 py-3 text-gray-500">
                    {[item.color, item.size].filter(Boolean).join(" / ") || "—"}
                  </td>
                  <td
                    className={`px-4 py-3 text-right font-semibold ${
                      item.quantity <= item.low_stock_threshold
                        ? "text-red-600"
                        : "text-gray-900"
                    }`}
                  >
                    {item.quantity}
                    {item.quantity <= item.low_stock_threshold && (
                      <span className="ml-1 text-xs font-normal text-red-400">
                        (low)
                      </span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}