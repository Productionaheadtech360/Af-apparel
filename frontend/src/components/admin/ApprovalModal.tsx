"use client";

import { useEffect, useState } from "react";
import { adminService } from "@/services/admin.service";

interface PricingTier { id: string; name: string; discount_percent: number; }
interface ShippingTier { id: string; name: string; }

interface ApprovalModalProps {
  applicationId: string;
  companyName: string;
  onClose: () => void;
  onSuccess: () => void;
}

export function ApprovalModal({ applicationId, companyName, onClose, onSuccess }: ApprovalModalProps) {
  const [pricingTiers, setPricingTiers] = useState<PricingTier[]>([]);
  const [shippingTiers, setShippingTiers] = useState<ShippingTier[]>([]);
  const [pricingTierId, setPricingTierId] = useState("");
  const [shippingTierId, setShippingTierId] = useState("");
  const [notes, setNotes] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      const [pt, st] = await Promise.all([
        adminService.listPricingTiers() as Promise<PricingTier[]>,
        adminService.listShippingTiers() as Promise<ShippingTier[]>,
      ]);
      setPricingTiers(pt);
      setShippingTiers(st);
      if (pt.length > 0) setPricingTierId(pt[0]?.id ?? "");
      if (st.length > 0) setShippingTierId(st[0]?.id ?? "");
    }
    load();
  }, []);

  async function handleApprove(e: React.FormEvent) {
    e.preventDefault();
    if (!pricingTierId || !shippingTierId) return;
    setIsSaving(true);
    setError(null);
    try {
      await adminService.approveApplication(applicationId, {
        pricing_tier_id: pricingTierId,
        shipping_tier_id: shippingTierId,
        notes: notes || undefined,
      });
      onSuccess();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to approve");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-sm">
        <h2 className="text-base font-semibold text-gray-900 mb-1">Approve Application</h2>
        <p className="text-sm text-gray-500 mb-4">{companyName}</p>

        <form onSubmit={handleApprove} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Pricing Tier *</label>
            <select
              required
              value={pricingTierId}
              onChange={(e) => setPricingTierId(e.target.value)}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            >
              <option value="">Select tier…</option>
              {pricingTiers.map((t) => (
                <option key={t.id} value={t.id}>{t.name} ({t.discount_percent}% off)</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Shipping Tier *</label>
            <select
              required
              value={shippingTierId}
              onChange={(e) => setShippingTierId(e.target.value)}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            >
              <option value="">Select tier…</option>
              {shippingTiers.map((t) => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Admin Notes</label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Optional notes for the company"
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <div className="flex gap-3">
            <button type="button" onClick={onClose} className="flex-1 border border-gray-300 rounded-md py-2 text-sm hover:bg-gray-50">
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving || !pricingTierId || !shippingTierId}
              className="flex-1 bg-green-600 text-white rounded-md py-2 text-sm font-medium hover:bg-green-700 disabled:opacity-50"
            >
              {isSaving ? "Approving…" : "Approve"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
