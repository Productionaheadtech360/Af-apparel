"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { accountService } from "@/services/account.service";

interface OrderItem {
  id: string;
  sku: string;
  product_name: string;
  color: string | null;
  size: string | null;
  quantity: number;
  unit_price: string;
  total: string;
}

interface Order {
  id: string;
  order_number: string;
  status: string;
  payment_status: string;
  total: string;
  subtotal: string;
  shipping_cost: string;
  po_number: string | null;
  order_notes: string | null;
  tracking_number: string | null;
  created_at: string;
  items: OrderItem[];
}

export default function OrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [order, setOrder] = useState<Order | null>(null);
  const [isReordering, setIsReordering] = useState(false);

  useEffect(() => {
    async function load() {
      const data = await accountService.getOrder(id) as Order;
      setOrder(data);
    }
    load();
  }, [id]);

  async function handleReorder() {
    setIsReordering(true);
    try {
      await accountService.reorder(id);
      router.push("/cart");
    } finally {
      setIsReordering(false);
    }
  }

  if (!order) return <div className="text-gray-400">Loading…</div>;

  return (
    <div>
      <button onClick={() => router.back()} className="text-sm text-brand-600 hover:text-brand-800 mb-4 block">
        ← Back to Orders
      </button>

      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-xl font-bold text-gray-900">{order.order_number}</h1>
          <p className="text-sm text-gray-500">{new Date(order.created_at).toLocaleDateString()}</p>
        </div>
        <button
          onClick={handleReorder}
          disabled={isReordering}
          className="bg-brand-600 text-white rounded-md px-4 py-2 text-sm font-medium hover:bg-brand-700 disabled:opacity-50"
        >
          {isReordering ? "Adding…" : "Reorder"}
        </button>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <p className="text-xs text-gray-500 mb-1">Status</p>
          <p className="text-sm font-medium capitalize">{order.status}</p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <p className="text-xs text-gray-500 mb-1">Payment</p>
          <p className="text-sm font-medium capitalize">{order.payment_status}</p>
        </div>
        {order.po_number && (
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <p className="text-xs text-gray-500 mb-1">PO Number</p>
            <p className="text-sm font-medium">{order.po_number}</p>
          </div>
        )}
        {order.tracking_number && (
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <p className="text-xs text-gray-500 mb-1">Tracking</p>
            <p className="text-sm font-medium font-mono">{order.tracking_number}</p>
          </div>
        )}
      </div>

      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden mb-4">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="text-left px-4 py-3 text-gray-600 font-medium">SKU</th>
              <th className="text-left px-4 py-3 text-gray-600 font-medium">Product</th>
              <th className="text-right px-4 py-3 text-gray-600 font-medium">Qty</th>
              <th className="text-right px-4 py-3 text-gray-600 font-medium">Unit Price</th>
              <th className="text-right px-4 py-3 text-gray-600 font-medium">Total</th>
            </tr>
          </thead>
          <tbody>
            {order.items.map((item) => (
              <tr key={item.id} className="border-b border-gray-100 last:border-0">
                <td className="px-4 py-3 font-mono text-xs text-gray-600">{item.sku}</td>
                <td className="px-4 py-3 text-gray-700">
                  {item.product_name}
                  {(item.color || item.size) && (
                    <span className="text-gray-400 text-xs ml-1">
                      {[item.color, item.size].filter(Boolean).join(" / ")}
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 text-right text-gray-700">{item.quantity}</td>
                <td className="px-4 py-3 text-right text-gray-700">${Number(item.unit_price).toFixed(2)}</td>
                <td className="px-4 py-3 text-right font-medium text-gray-900">${Number(item.total).toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 p-4 text-sm text-right space-y-1">
        <p className="text-gray-500">Subtotal: <span className="text-gray-900">${Number(order.subtotal).toFixed(2)}</span></p>
        <p className="text-gray-500">Shipping: <span className="text-gray-900">${Number(order.shipping_cost).toFixed(2)}</span></p>
        <p className="font-semibold text-gray-900 text-base">Total: ${Number(order.total).toFixed(2)}</p>
      </div>
    </div>
  );
}
