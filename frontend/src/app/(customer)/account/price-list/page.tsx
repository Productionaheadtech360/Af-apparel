"use client";

import { useState } from "react";
import { accountService } from "@/services/account.service";

interface PriceListRequest {
  id: string;
  status: string;
  file_url: string | null;
  format: string;
  created_at: string;
}

export default function AccountPriceListPage() {
  const [requests, setRequests] = useState<PriceListRequest[]>([]);
  const [isRequesting, setIsRequesting] = useState(false);
  const [pollingId, setPollingId] = useState<string | null>(null);

  async function handleRequest(format: "pdf" | "excel") {
    setIsRequesting(true);
    try {
      const req = await accountService.requestPriceList(format) as PriceListRequest;
      setRequests((prev) => [req, ...prev]);
      setPollingId(req.id);
      // Poll until done
      const interval = setInterval(async () => {
        const updated = await accountService.getPriceListStatus(req.id) as PriceListRequest;
        setRequests((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
        if (updated.status === "completed" || updated.status === "failed") {
          clearInterval(interval);
          setPollingId(null);
        }
      }, 3000);
    } finally { setIsRequesting(false); }
  }

  return (
    <div>
      <h1 className="text-xl font-bold text-gray-900 mb-4">Price List</h1>
      <p className="text-sm text-gray-500 mb-6">Download your personalized price list with your tier pricing applied.</p>

      <div className="flex gap-3 mb-6">
        <button
          onClick={() => handleRequest("pdf")}
          disabled={isRequesting || !!pollingId}
          className="bg-brand-600 text-white rounded-md px-4 py-2 text-sm font-medium hover:bg-brand-700 disabled:opacity-50"
        >
          Generate PDF
        </button>
        <button
          onClick={() => handleRequest("excel")}
          disabled={isRequesting || !!pollingId}
          className="border border-brand-300 text-brand-700 rounded-md px-4 py-2 text-sm font-medium hover:bg-brand-50 disabled:opacity-50"
        >
          Generate Excel
        </button>
        {pollingId && <span className="text-sm text-gray-400 self-center">Generating…</span>}
      </div>

      {requests.length > 0 && (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 text-gray-600 font-medium">Format</th>
                <th className="text-left px-4 py-3 text-gray-600 font-medium">Status</th>
                <th className="text-left px-4 py-3 text-gray-600 font-medium">Date</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {requests.map((r) => (
                <tr key={r.id} className="border-b border-gray-100 last:border-0">
                  <td className="px-4 py-3 text-gray-700 uppercase text-xs font-medium">{r.format}</td>
                  <td className="px-4 py-3 text-gray-600 capitalize">{r.status}</td>
                  <td className="px-4 py-3 text-gray-500">{new Date(r.created_at).toLocaleString()}</td>
                  <td className="px-4 py-3">
                    {r.file_url && (
                      <a href={r.file_url} target="_blank" rel="noreferrer" className="text-xs text-brand-600 hover:text-brand-800 font-medium">
                        Download
                      </a>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
