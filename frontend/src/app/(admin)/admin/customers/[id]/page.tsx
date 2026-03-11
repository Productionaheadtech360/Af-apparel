"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { adminService } from "@/services/admin.service";

interface CompanyDetail {
  id: string;
  name: string;
  status: string;
  tax_id: string | null;
  business_type: string | null;
  website: string | null;
  pricing_tier_id: string | null;
  shipping_tier_id: string | null;
  shipping_override_amount: string | null;
  stripe_customer_id: string | null;
  qb_customer_id: string | null;
  created_at: string;
  updated_at: string;
}

interface PricingTier { id: string; name: string; }
interface ShippingTier { id: string; name: string; }

const STATUS_COLORS: Record<string, string> = {
  active: "bg-green-100 text-green-700",
  suspended: "bg-red-100 text-red-700",
  pending: "bg-yellow-100 text-yellow-700",
};

export default function AdminCompanyDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [company, setCompany] = useState<CompanyDetail | null>(null);
  const [pricingTiers, setPricingTiers] = useState<PricingTier[]>([]);
  const [shippingTiers, setShippingTiers] = useState<ShippingTier[]>([]);
  const [editPricingTier, setEditPricingTier] = useState("");
  const [editShippingTier, setEditShippingTier] = useState("");
  const [shippingOverride, setShippingOverride] = useState("");
  const [suspendReason, setSuspendReason] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isSuspending, setIsSuspending] = useState(false);
  const [showSuspendForm, setShowSuspendForm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      const [co, pt, st] = await Promise.all([
        adminService.getCompany(id) as Promise<CompanyDetail>,
        adminService.listPricingTiers() as Promise<PricingTier[]>,
        adminService.listShippingTiers() as Promise<ShippingTier[]>,
      ]);
      setCompany(co);
      setPricingTiers(pt);
      setShippingTiers(st);
      setEditPricingTier(co.pricing_tier_id ?? "");
      setEditShippingTier(co.shipping_tier_id ?? "");
      setShippingOverride(co.shipping_override_amount ?? "");
    }
    load();
  }, [id]);

  async function handleSaveTiers() {
    setIsSaving(true);
    setError(null);
    setSuccessMsg(null);
    try {
      await adminService.updateCompany(id, {
        pricing_tier_id: editPricingTier || null,
        shipping_tier_id: editShippingTier || null,
        shipping_override_amount: shippingOverride ? Number(shippingOverride) : null,
      });
      setSuccessMsg("Company updated");
      const co = await adminService.getCompany(id) as CompanyDetail;
      setCompany(co);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to update");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleSuspend() {
    if (!suspendReason.trim()) return;
    setIsSuspending(true);
    setError(null);
    try {
      await adminService.suspendCompany(id, suspendReason);
      setCompany((c) => c ? { ...c, status: "suspended" } : c);
      setShowSuspendForm(false);
      setSuspendReason("");
      setSuccessMsg("Company suspended");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to suspend");
    } finally {
      setIsSuspending(false);
    }
  }

  async function handleReactivate() {
    setError(null);
    try {
      await adminService.reactivateCompany(id);
      setCompany((c) => c ? { ...c, status: "active" } : c);
      setSuccessMsg("Company reactivated");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to reactivate");
    }
  }

  if (!company) {
    return <div className="p-6 text-gray-400">Loading…</div>;
  }

  return (
    <div className="p-6 max-w-3xl">
      <button
        onClick={() => router.back()}
        className="text-sm text-brand-600 hover:text-brand-800 mb-4 block"
      >
        ← Back to Companies
      </button>

      <div className="flex items-center gap-3 mb-6">
        <h1 className="text-xl font-bold text-gray-900">{company.name}</h1>
        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${STATUS_COLORS[company.status] ?? "bg-gray-100 text-gray-600"}`}>
          {company.status}
        </span>
      </div>

      {error && <p className="mb-4 text-sm text-red-600">{error}</p>}
      {successMsg && <p className="mb-4 text-sm text-green-600">{successMsg}</p>}

      {/* Profile */}
      <div className="bg-white rounded-lg border border-gray-200 p-4 mb-4">
        <h2 className="text-sm font-semibold text-gray-700 mb-3">Profile</h2>
        <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
          <dt className="text-gray-500">Tax ID</dt>
          <dd className="text-gray-900">{company.tax_id ?? "—"}</dd>
          <dt className="text-gray-500">Business Type</dt>
          <dd className="text-gray-900">{company.business_type ?? "—"}</dd>
          <dt className="text-gray-500">Website</dt>
          <dd className="text-gray-900">{company.website ?? "—"}</dd>
          <dt className="text-gray-500">Stripe ID</dt>
          <dd className="font-mono text-xs text-gray-600">{company.stripe_customer_id ?? "—"}</dd>
          <dt className="text-gray-500">QB Customer</dt>
          <dd className="font-mono text-xs text-gray-600">{company.qb_customer_id ?? "—"}</dd>
          <dt className="text-gray-500">Joined</dt>
          <dd className="text-gray-900">{new Date(company.created_at).toLocaleDateString()}</dd>
        </dl>
      </div>

      {/* Tiers */}
      <div className="bg-white rounded-lg border border-gray-200 p-4 mb-4">
        <h2 className="text-sm font-semibold text-gray-700 mb-3">Pricing &amp; Shipping Tiers</h2>
        <div className="space-y-3">
          <div>
            <label className="block text-xs text-gray-500 mb-1">Pricing Tier</label>
            <select
              value={editPricingTier}
              onChange={(e) => setEditPricingTier(e.target.value)}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            >
              <option value="">None</option>
              {pricingTiers.map((t) => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Shipping Tier</label>
            <select
              value={editShippingTier}
              onChange={(e) => setEditShippingTier(e.target.value)}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            >
              <option value="">None</option>
              {shippingTiers.map((t) => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Shipping Override ($)</label>
            <input
              type="number"
              value={shippingOverride}
              onChange={(e) => setShippingOverride(e.target.value)}
              placeholder="Leave blank to use tier brackets"
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>
          <button
            onClick={handleSaveTiers}
            disabled={isSaving}
            className="bg-brand-600 text-white rounded-md px-4 py-2 text-sm font-medium hover:bg-brand-700 disabled:opacity-50"
          >
            {isSaving ? "Saving…" : "Save Changes"}
          </button>
        </div>
      </div>

      {/* Actions */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <h2 className="text-sm font-semibold text-gray-700 mb-3">Account Actions</h2>
        {company.status === "active" ? (
          <>
            {showSuspendForm ? (
              <div className="space-y-2">
                <textarea
                  rows={2}
                  value={suspendReason}
                  onChange={(e) => setSuspendReason(e.target.value)}
                  placeholder="Reason for suspension (required)"
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                />
                <div className="flex gap-2">
                  <button
                    onClick={handleSuspend}
                    disabled={isSuspending || !suspendReason.trim()}
                    className="bg-red-600 text-white rounded-md px-4 py-2 text-sm font-medium hover:bg-red-700 disabled:opacity-50"
                  >
                    {isSuspending ? "Suspending…" : "Confirm Suspend"}
                  </button>
                  <button
                    onClick={() => setShowSuspendForm(false)}
                    className="border border-gray-300 rounded-md px-4 py-2 text-sm hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setShowSuspendForm(true)}
                className="bg-red-50 text-red-700 border border-red-200 rounded-md px-4 py-2 text-sm font-medium hover:bg-red-100"
              >
                Suspend Company
              </button>
            )}
          </>
        ) : (
          <button
            onClick={handleReactivate}
            className="bg-green-50 text-green-700 border border-green-200 rounded-md px-4 py-2 text-sm font-medium hover:bg-green-100"
          >
            Reactivate Company
          </button>
        )}
      </div>
    </div>
  );
}
