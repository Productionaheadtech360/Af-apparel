"use client";

import { useEffect, useState } from "react";
import { adminService } from "@/services/admin.service";
import { StockAdjustmentModal } from "@/components/admin/StockAdjustmentModal";

interface InventoryRow {
  variant_id: string;
  sku: string;
  color?: string;
  size?: string;
  warehouse_id: string;
  warehouse_name: string;
  quantity: number;
  low_stock_threshold: number;
}

export default function AdminInventoryPage() {
  const [rows, setRows] = useState<InventoryRow[]>([]);
  const [lowStockOnly, setLowStockOnly] = useState(false);
  const [adjustTarget, setAdjustTarget] = useState<InventoryRow | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  async function load() {
    setIsLoading(true);
    try {
      const data = await adminService.listInventory({ low_stock_only: lowStockOnly }) as InventoryRow[];
      setRows(data);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => { load(); }, [lowStockOnly]);

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-gray-900">Inventory</h1>
        <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
          <input
            type="checkbox"
            checked={lowStockOnly}
            onChange={(e) => setLowStockOnly(e.target.checked)}
          />
          Low stock only
        </label>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="text-left px-4 py-3 text-gray-600 font-medium">SKU</th>
              <th className="text-left px-4 py-3 text-gray-600 font-medium">Color</th>
              <th className="text-left px-4 py-3 text-gray-600 font-medium">Size</th>
              <th className="text-left px-4 py-3 text-gray-600 font-medium">Warehouse</th>
              <th className="text-right px-4 py-3 text-gray-600 font-medium">Qty</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {isLoading && rows.length === 0 ? (
              <tr><td colSpan={8} style={{ padding: "40px", textAlign: "center", color: "#bbb", fontSize: "14px" }}>Loading…</td></tr>
            ) : rows.length === 0 ? (
              <tr><td colSpan={6} className="py-8 text-center text-gray-400">No inventory records</td></tr>
            ) : (
              rows.map((row, i) => (
                <tr key={i} className={`border-b border-gray-100 last:border-0 ${row.quantity <= row.low_stock_threshold ? "bg-red-50" : ""}`}>
                  <td className="px-4 py-3 font-mono text-xs text-gray-600">{row.sku}</td>
                  <td className="px-4 py-3 text-gray-700">{row.color ?? "—"}</td>
                  <td className="px-4 py-3 text-gray-700">{row.size ?? "—"}</td>
                  <td className="px-4 py-3 text-gray-600">{row.warehouse_name}</td>
                  <td className={`px-4 py-3 text-right font-semibold ${row.quantity <= row.low_stock_threshold ? "text-red-600" : "text-gray-900"}`}>
                    {row.quantity}
                    {row.quantity <= row.low_stock_threshold && (
                      <span className="ml-1 text-xs font-normal text-red-400">(low)</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => setAdjustTarget(row)}
                      className="text-xs text-brand-600 hover:text-brand-800"
                    >
                      Adjust
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {adjustTarget && (
        <StockAdjustmentModal
          sku={adjustTarget.sku}
          currentQty={adjustTarget.quantity}
          variantId={adjustTarget.variant_id}
          warehouseId={adjustTarget.warehouse_id}
          onClose={() => setAdjustTarget(null)}
          onSuccess={() => { setAdjustTarget(null); load(); }}
        />
      )}
    </div>
  );
}
