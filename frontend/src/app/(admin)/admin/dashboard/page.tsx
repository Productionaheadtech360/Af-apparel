"use client";

import { useEffect, useState } from "react";
import { apiClient } from "@/lib/api-client";
import Link from "next/link";

interface DashboardData {
  sales_summary: {
    total_orders: number;
    total_revenue: number;
    avg_order_value: number;
  };
  pending_applications: number;
  low_stock_count: number;
  qb_failed_syncs: number;
  recent_orders: {
    id: string;
    order_number: string;
    company_name: string;
    total: number;
    status: string;
    created_at: string;
  }[];
}

export default function AdminDashboard() {
  const [data, setData] = useState<Partial<DashboardData>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.allSettled([
      apiClient.get("/api/v1/admin/reports/sales?period=week"),
      apiClient.get("/api/v1/admin/wholesale-applications?status=pending"),
      apiClient.get("/api/v1/admin/reports/inventory?low_stock_only=true"),
      apiClient.get("/api/v1/admin/quickbooks/status"),
      apiClient.get("/api/v1/admin/orders?page_size=5"),
    ]).then(([salesRes, appsRes, stockRes, qbRes, ordersRes]) => {
      const d: Partial<DashboardData> = {};

      if (salesRes.status === "fulfilled") {
        d.sales_summary = (salesRes.value as any)?.summary;
      }
      if (appsRes.status === "fulfilled") {
        const appList = appsRes.value;
        d.pending_applications = Array.isArray(appList) ? appList.length : 0;
      }
      if (stockRes.status === "fulfilled") {
        const stockList = stockRes.value;
        d.low_stock_count = Array.isArray(stockList) ? stockList.length : 0;
      }
      if (qbRes.status === "fulfilled") {
        d.qb_failed_syncs = (qbRes.value as any)?.failed_syncs?.length ?? 0;
      }
      if (ordersRes.status === "fulfilled") {
        const orders = (ordersRes.value as any)?.items ?? [];
        d.recent_orders = orders.map((o: any) => ({
          id: o.id,
          order_number: o.order_number,
          company_name: o.company?.name ?? o.company_name ?? "—",
          total: o.total,
          status: o.status,
          created_at: o.created_at,
        }));
      }

      setData(d);
    }).finally(() => setLoading(false));
  }, []);

  const statusColors: Record<string, string> = {
    pending: "bg-yellow-100 text-yellow-700",
    confirmed: "bg-blue-100 text-blue-700",
    processing: "bg-indigo-100 text-indigo-700",
    shipped: "bg-purple-100 text-purple-700",
    delivered: "bg-green-100 text-green-700",
    cancelled: "bg-red-100 text-red-700",
  };

  if (loading) {
    return <div className="text-center py-16 text-gray-400">Loading dashboard...</div>;
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-sm text-gray-500 mt-1">Last 7 days overview</p>
      </div>

      {/* Summary widgets */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-gray-200 rounded-lg p-5">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Revenue (7d)</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">
            ${(data.sales_summary?.total_revenue ?? 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}
          </p>
          <p className="text-xs text-gray-400 mt-1">{data.sales_summary?.total_orders ?? 0} orders</p>
        </div>

        <Link
          href="/admin/customers/applications"
          className={`border rounded-lg p-5 transition-shadow hover:shadow-md ${
            (data.pending_applications ?? 0) > 0 ? "bg-amber-50 border-amber-200" : "bg-white border-gray-200"
          }`}
        >
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Pending Applications</p>
          <p className={`text-2xl font-bold mt-1 ${(data.pending_applications ?? 0) > 0 ? "text-amber-700" : "text-gray-900"}`}>
            {data.pending_applications ?? 0}
          </p>
          <p className="text-xs text-gray-400 mt-1">awaiting review</p>
        </Link>

        <Link
          href="/admin/reports/inventory"
          className={`border rounded-lg p-5 transition-shadow hover:shadow-md ${
            (data.low_stock_count ?? 0) > 0 ? "bg-red-50 border-red-200" : "bg-white border-gray-200"
          }`}
        >
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Low Stock SKUs</p>
          <p className={`text-2xl font-bold mt-1 ${(data.low_stock_count ?? 0) > 0 ? "text-red-700" : "text-gray-900"}`}>
            {data.low_stock_count ?? 0}
          </p>
          <p className="text-xs text-gray-400 mt-1">below threshold</p>
        </Link>

        <Link
          href="/admin/settings/quickbooks"
          className={`border rounded-lg p-5 transition-shadow hover:shadow-md ${
            (data.qb_failed_syncs ?? 0) > 0 ? "bg-red-50 border-red-200" : "bg-white border-gray-200"
          }`}
        >
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">QB Sync Failures</p>
          <p className={`text-2xl font-bold mt-1 ${(data.qb_failed_syncs ?? 0) > 0 ? "text-red-700" : "text-gray-900"}`}>
            {data.qb_failed_syncs ?? 0}
          </p>
          <p className="text-xs text-gray-400 mt-1">need attention</p>
        </Link>
      </div>

      {/* Recent Orders */}
      <div className="bg-white border border-gray-200 rounded-lg">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="font-semibold text-gray-900">Recent Orders</h2>
          <Link href="/admin/orders" className="text-sm text-blue-600 hover:underline">
            View all →
          </Link>
        </div>
        {!data.recent_orders || data.recent_orders.length === 0 ? (
          <p className="px-6 py-6 text-sm text-gray-400">No recent orders.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50 text-xs text-gray-500 uppercase">
                <tr>
                  <th className="px-6 py-3 text-left">Order</th>
                  <th className="px-6 py-3 text-left">Company</th>
                  <th className="px-6 py-3 text-right">Total</th>
                  <th className="px-6 py-3 text-left">Status</th>
                  <th className="px-6 py-3 text-left">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {data.recent_orders.map((order) => (
                  <tr key={order.id} className="hover:bg-gray-50">
                    <td className="px-6 py-3">
                      <Link href={`/admin/orders/${order.id}`} className="text-blue-600 hover:underline font-mono text-xs">
                        {order.order_number}
                      </Link>
                    </td>
                    <td className="px-6 py-3">{order.company_name}</td>
                    <td className="px-6 py-3 text-right">${Number(order.total).toFixed(2)}</td>
                    <td className="px-6 py-3">
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${statusColors[order.status] ?? "bg-gray-100 text-gray-600"}`}>
                        {order.status}
                      </span>
                    </td>
                    <td className="px-6 py-3 text-gray-500">
                      {order.created_at ? new Date(order.created_at).toLocaleDateString() : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
