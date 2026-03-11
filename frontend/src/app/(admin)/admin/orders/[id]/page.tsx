"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { adminService } from "@/services/admin.service";

interface OrderItem {
  id: string;
  sku: string;
  product_name: string;
  color: string | null;
  size: string | null;
  quantity: number;
  unit_price: string;
  line_total: string;
}

interface AdminOrder {
  id: string;
  order_number: string;
  company_name: string;
  company_id: string;
  status: string;
  payment_status: string;
  po_number: string | null;
  order_notes: string | null;
  tracking_number: string | null;
  qb_invoice_id: string | null;
  subtotal: string;
  shipping_cost: string;
  total: string;
  items: OrderItem[];
  created_at: string;
}

const STATUSES = ["pending", "confirmed", "processing", "shipped", "delivered", "cancelled"];

export default function AdminOrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [order, setOrder] = useState<AdminOrder | null>(null);
  const [status, setStatus] = useState("");
  const [tracking, setTracking] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    adminService.getOrder(id).then((d) => {
      const o = d as AdminOrder;
      setOrder(o);
      setStatus(o.status);
      setTracking(o.tracking_number ?? "");
    });
  }, [id]);

  async function handleUpdate(e: React.FormEvent) {
    e.preventDefault();
    setIsSaving(true); setMsg(null);
    try {
      await adminService.updateOrder(id, { status, tracking_number: tracking || undefined });
      setMsg("Order updated");
      setOrder((prev) => prev ? { ...prev, status, tracking_number: tracking || null } : prev);
    } catch { setMsg("Failed to update"); } finally { setIsSaving(false); }
  }

  async function handleSyncQB() {
    setIsSyncing(true); setMsg(null);
    try {
      await adminService.syncOrderToQb(id);
      setMsg("QB sync queued");
    } finally { setIsSyncing(false); }
  }

  if (!order) return <div className="p-6 text-gray-400">Loading…</div>;

  return (
    <div className="p-6 max-w-4xl">
      <button onClick={() => router.back()} className="text-sm text-brand-600 hover:text-brand-800 mb-4 block">← Back to Orders</button>

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900">{order.order_number}</h1>
          <p className="text-sm text-gray-500">{order.company_name} · {new Date(order.created_at).toLocaleDateString()}</p>
        </div>
        <button onClick={handleSyncQB} disabled={isSyncing} className="border border-gray-300 rounded-md px-3 py-1.5 text-sm hover:bg-gray-50 disabled:opacity-50">
          {isSyncing ? "Syncing…" : "Sync to QB"}
        </button>
      </div>

      {msg && <p className="mb-4 text-sm text-green-600">{msg}</p>}

      {/* Update form */}
      <div className="bg-white rounded-lg border border-gray-200 p-4 mb-4">
        <h2 className="text-sm font-semibold text-gray-700 mb-3">Update Order</h2>
        <form onSubmit={handleUpdate} className="flex gap-3 items-end">
          <div>
            <label className="block text-xs text-gray-500 mb-1">Status</label>
            <select value={status} onChange={(e) => setStatus(e.target.value)} className="rounded-md border border-gray-300 px-3 py-2 text-sm">
              {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Tracking #</label>
            <input type="text" value={tracking} onChange={(e) => setTracking(e.target.value)} placeholder="Enter tracking number" className="rounded-md border border-gray-300 px-3 py-2 text-sm" />
          </div>
          <button type="submit" disabled={isSaving} className="bg-brand-600 text-white rounded-md px-4 py-2 text-sm font-medium hover:bg-brand-700 disabled:opacity-50">
            {isSaving ? "Saving…" : "Update"}
          </button>
        </form>
      </div>

      {/* Line items */}
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
                  {(item.color || item.size) && <span className="text-xs text-gray-400 ml-1">{[item.color, item.size].filter(Boolean).join(" / ")}</span>}
                </td>
                <td className="px-4 py-3 text-right">{item.quantity}</td>
                <td className="px-4 py-3 text-right">${Number(item.unit_price).toFixed(2)}</td>
                <td className="px-4 py-3 text-right font-medium">${Number(item.line_total).toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 p-4 text-sm text-right space-y-1">
        <p className="text-gray-500">Subtotal: ${Number(order.subtotal).toFixed(2)}</p>
        <p className="text-gray-500">Shipping: ${Number(order.shipping_cost).toFixed(2)}</p>
        <p className="font-semibold text-gray-900 text-base">Total: ${Number(order.total).toFixed(2)}</p>
        {order.qb_invoice_id && <p className="text-xs text-gray-400">QB Invoice: {order.qb_invoice_id}</p>}
      </div>
    </div>
  );
}
