"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { adminService } from "@/services/admin.service";

interface AdminOrder {
  id: string;
  order_number: string;
  company_name: string;
  status: string;
  payment_status: string;
  po_number: string | null;
  total: string;
  item_count: number;
  created_at: string;
}

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-700",
  confirmed: "bg-blue-100 text-blue-700",
  shipped: "bg-purple-100 text-purple-700",
  delivered: "bg-green-100 text-green-700",
  cancelled: "bg-red-100 text-red-700",
};

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [total, setTotal] = useState(0);
  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const PAGE_SIZE = 50;

  async function load() {
    setIsLoading(true);
    try {
      const data = await adminService.listOrders({ q: q || undefined, status: statusFilter || undefined, page }) as { items: AdminOrder[]; total: number };
      setOrders(data.items ?? []);
      setTotal(data.total ?? 0);
    } finally { setIsLoading(false); }
  }

  useEffect(() => { load(); }, [q, statusFilter, page]);

  async function handleExport() {
    const url = `/api/v1/admin/orders/export-csv${q ? `?q=${encodeURIComponent(q)}` : ""}`;
    window.open(url, "_blank");
  }

  const pages = Math.ceil(total / PAGE_SIZE);

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-gray-900">Orders</h1>
        <div className="flex gap-2">
          <span className="text-sm text-gray-500 self-center">{total} total</span>
          <button onClick={handleExport} className="border border-gray-300 rounded-md px-3 py-1.5 text-sm hover:bg-gray-50">Export CSV</button>
        </div>
      </div>

      <div className="flex gap-3 mb-4">
        <input type="text" value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} placeholder="Search order # or PO…" className="rounded-md border border-gray-300 px-3 py-2 text-sm w-64" />
        <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }} className="rounded-md border border-gray-300 px-3 py-2 text-sm">
          <option value="">All statuses</option>
          <option value="pending">Pending</option>
          <option value="confirmed">Confirmed</option>
          <option value="shipped">Shipped</option>
          <option value="delivered">Delivered</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="text-left px-4 py-3 text-gray-600 font-medium">Order #</th>
              <th className="text-left px-4 py-3 text-gray-600 font-medium">Company</th>
              <th className="text-left px-4 py-3 text-gray-600 font-medium">Status</th>
              <th className="text-left px-4 py-3 text-gray-600 font-medium">PO#</th>
              <th className="text-right px-4 py-3 text-gray-600 font-medium">Total</th>
              <th className="text-left px-4 py-3 text-gray-600 font-medium">Date</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {isLoading && orders.length === 0 ? (
              <tr><td colSpan={8} style={{ padding: "40px", textAlign: "center", color: "#bbb", fontSize: "14px" }}>Loading…</td></tr>
            ) : orders.length === 0 ? (
              <tr><td colSpan={7} className="py-8 text-center text-gray-400">No orders found</td></tr>
            ) : orders.map((o) => (
              <tr key={o.id} className="border-b border-gray-100 last:border-0 hover:bg-gray-50">
                <td className="px-4 py-3 font-mono text-xs font-medium text-gray-800">{o.order_number}</td>
                <td className="px-4 py-3 text-gray-700">{o.company_name}</td>
                <td className="px-4 py-3">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${STATUS_COLORS[o.status] ?? "bg-gray-100 text-gray-600"}`}>
                    {o.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-gray-500">{o.po_number ?? "—"}</td>
                <td className="px-4 py-3 text-right text-gray-700">${Number(o.total).toFixed(2)}</td>
                <td className="px-4 py-3 text-gray-500">{new Date(o.created_at).toLocaleDateString()}</td>
                <td className="px-4 py-3">
                  <Link href={`/admin/orders/${o.id}`} className="text-xs text-brand-600 hover:text-brand-800">View</Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {pages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-4">
          <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="px-3 py-1 text-sm border border-gray-300 rounded disabled:opacity-40 hover:bg-gray-50">Prev</button>
          <span className="text-sm text-gray-600">{page} / {pages}</span>
          <button onClick={() => setPage((p) => Math.min(pages, p + 1))} disabled={page === pages} className="px-3 py-1 text-sm border border-gray-300 rounded disabled:opacity-40 hover:bg-gray-50">Next</button>
        </div>
      )}
    </div>
  );
}
