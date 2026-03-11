"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { adminService } from "@/services/admin.service";

interface CompanyRow {
  id: string;
  name: string;
  status: string;
  pricing_tier_id: string | null;
  shipping_tier_id: string | null;
  order_count: number;
  total_spend: string;
  created_at: string;
}

const STATUS_COLORS: Record<string, string> = {
  active: "bg-green-100 text-green-700",
  suspended: "bg-red-100 text-red-700",
  pending: "bg-yellow-100 text-yellow-700",
};

export default function AdminCustomersPage() {
  const [companies, setCompanies] = useState<CompanyRow[]>([]);
  const [total, setTotal] = useState(0);
  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const PAGE_SIZE = 50;

  async function load() {
    setIsLoading(true);
    try {
      const data = await adminService.listCompanies({
        q: q || undefined,
        status: statusFilter || undefined,
        page,
        page_size: PAGE_SIZE,
      }) as { items: CompanyRow[]; total: number };
      setCompanies(data.items);
      setTotal(data.total);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => { load(); }, [q, statusFilter, page]);

  const pages = Math.ceil(total / PAGE_SIZE);

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-gray-900">Companies</h1>
        <span className="text-sm text-gray-500">{total} total</span>
      </div>

      <div className="flex gap-3 mb-4">
        <input
          type="text"
          placeholder="Search by name…"
          value={q}
          onChange={(e) => { setQ(e.target.value); setPage(1); }}
          className="rounded-md border border-gray-300 px-3 py-2 text-sm w-64 focus:outline-none focus:ring-2 focus:ring-brand-500"
        />
        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
          className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
        >
          <option value="">All statuses</option>
          <option value="active">Active</option>
          <option value="suspended">Suspended</option>
          <option value="pending">Pending</option>
        </select>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="text-left px-4 py-3 text-gray-600 font-medium">Company</th>
              <th className="text-left px-4 py-3 text-gray-600 font-medium">Status</th>
              <th className="text-right px-4 py-3 text-gray-600 font-medium">Orders</th>
              <th className="text-right px-4 py-3 text-gray-600 font-medium">Total Spend</th>
              <th className="text-left px-4 py-3 text-gray-600 font-medium">Joined</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={6} className="py-8 text-center text-gray-400">Loading…</td></tr>
            ) : companies.length === 0 ? (
              <tr><td colSpan={6} className="py-8 text-center text-gray-400">No companies found</td></tr>
            ) : (
              companies.map((co) => (
                <tr key={co.id} className="border-b border-gray-100 last:border-0 hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">{co.name}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${STATUS_COLORS[co.status] ?? "bg-gray-100 text-gray-600"}`}>
                      {co.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right text-gray-700">{co.order_count}</td>
                  <td className="px-4 py-3 text-right text-gray-700">${Number(co.total_spend).toFixed(2)}</td>
                  <td className="px-4 py-3 text-gray-500">{new Date(co.created_at).toLocaleDateString()}</td>
                  <td className="px-4 py-3">
                    <Link href={`/admin/customers/${co.id}`} className="text-xs text-brand-600 hover:text-brand-800">
                      View
                    </Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {pages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-4">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-3 py-1 text-sm border border-gray-300 rounded disabled:opacity-40 hover:bg-gray-50"
          >
            Prev
          </button>
          <span className="text-sm text-gray-600">{page} / {pages}</span>
          <button
            onClick={() => setPage((p) => Math.min(pages, p + 1))}
            disabled={page === pages}
            className="px-3 py-1 text-sm border border-gray-300 rounded disabled:opacity-40 hover:bg-gray-50"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
