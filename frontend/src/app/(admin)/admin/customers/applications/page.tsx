"use client";

import { useEffect, useState } from "react";
import { adminService } from "@/services/admin.service";
import { ApprovalModal } from "@/components/admin/ApprovalModal";

interface Application {
  id: string;
  company_name: string;
  contact_name: string;
  contact_email: string;
  business_type: string | null;
  tax_id: string | null;
  website: string | null;
  status: string;
  created_at: string;
  notes: string | null;
}

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-700",
  approved: "bg-green-100 text-green-700",
  rejected: "bg-red-100 text-red-700",
};

export default function AdminApplicationsPage() {
  const [applications, setApplications] = useState<Application[]>([]);
  const [statusFilter, setStatusFilter] = useState("pending");
  const [isLoading, setIsLoading] = useState(true);
  const [approveTarget, setApproveTarget] = useState<Application | null>(null);
  const [rejectTarget, setRejectTarget] = useState<Application | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [isRejecting, setIsRejecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setIsLoading(true);
    try {
      const data = await adminService.listApplications(statusFilter || undefined) as Application[];
      setApplications(data);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => { load(); }, [statusFilter]);

  async function handleReject() {
    if (!rejectTarget || !rejectReason.trim()) return;
    setIsRejecting(true);
    setError(null);
    try {
      await adminService.rejectApplication(rejectTarget.id, rejectReason);
      setRejectTarget(null);
      setRejectReason("");
      load();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to reject");
    } finally {
      setIsRejecting(false);
    }
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-gray-900">Wholesale Applications</h1>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
        >
          <option value="">All</option>
          <option value="pending">Pending</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
        </select>
      </div>

      {error && <p className="mb-4 text-sm text-red-600">{error}</p>}

      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="text-left px-4 py-3 text-gray-600 font-medium">Company</th>
              <th className="text-left px-4 py-3 text-gray-600 font-medium">Contact</th>
              <th className="text-left px-4 py-3 text-gray-600 font-medium">Business Type</th>
              <th className="text-left px-4 py-3 text-gray-600 font-medium">Status</th>
              <th className="text-left px-4 py-3 text-gray-600 font-medium">Submitted</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={6} className="py-8 text-center text-gray-400">Loading…</td></tr>
            ) : applications.length === 0 ? (
              <tr><td colSpan={6} className="py-8 text-center text-gray-400">No applications</td></tr>
            ) : (
              applications.map((app) => (
                <tr key={app.id} className="border-b border-gray-100 last:border-0 hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <p className="font-medium text-gray-900">{app.company_name}</p>
                    {app.website && <p className="text-xs text-gray-400">{app.website}</p>}
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-gray-700">{app.contact_name}</p>
                    <p className="text-xs text-gray-400">{app.contact_email}</p>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{app.business_type ?? "—"}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${STATUS_COLORS[app.status] ?? "bg-gray-100 text-gray-600"}`}>
                      {app.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-500">{new Date(app.created_at).toLocaleDateString()}</td>
                  <td className="px-4 py-3">
                    {app.status === "pending" && (
                      <div className="flex gap-2">
                        <button
                          onClick={() => setApproveTarget(app)}
                          className="text-xs text-green-700 hover:text-green-900 font-medium"
                        >
                          Approve
                        </button>
                        <button
                          onClick={() => setRejectTarget(app)}
                          className="text-xs text-red-600 hover:text-red-800 font-medium"
                        >
                          Reject
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Approval modal */}
      {approveTarget && (
        <ApprovalModal
          applicationId={approveTarget.id}
          companyName={approveTarget.company_name}
          onClose={() => setApproveTarget(null)}
          onSuccess={() => { setApproveTarget(null); load(); }}
        />
      )}

      {/* Inline reject dialog */}
      {rejectTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-sm">
            <h2 className="text-base font-semibold text-gray-900 mb-1">Reject Application</h2>
            <p className="text-sm text-gray-500 mb-4">{rejectTarget.company_name}</p>
            <textarea
              rows={3}
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Reason for rejection (required)"
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500 mb-4"
            />
            {error && <p className="text-sm text-red-600 mb-2">{error}</p>}
            <div className="flex gap-3">
              <button onClick={() => { setRejectTarget(null); setRejectReason(""); }} className="flex-1 border border-gray-300 rounded-md py-2 text-sm hover:bg-gray-50">
                Cancel
              </button>
              <button
                onClick={handleReject}
                disabled={isRejecting || !rejectReason.trim()}
                className="flex-1 bg-red-600 text-white rounded-md py-2 text-sm font-medium hover:bg-red-700 disabled:opacity-50"
              >
                {isRejecting ? "Rejecting…" : "Reject"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
