"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiClient } from "@/lib/api-client";
import { useCheckoutStore } from "@/stores/checkout.store";

interface Address {
  id: string;
  label?: string;
  line1: string;
  line2?: string;
  city: string;
  state: string;
  postal_code: string;
  country: string;
  is_default: boolean;
}

export default function CheckoutAddressPage() {
  const router = useRouter();
  const { setAddressId, setShippingAddress } = useCheckoutStore();
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [addingNew, setAddingNew] = useState(false);
  const [form, setForm] = useState({
    line1: "", line2: "", city: "", state: "", postal_code: "", country: "US",
  });

  useEffect(() => {
    apiClient.get<Address[]>("/account/addresses").then((addrs) => {
      setAddresses(addrs);
      const def = addrs.find((a) => a.is_default);
      if (def) setSelectedId(def.id);
      else if (addrs.length === 0) setAddingNew(true);
    });
  }, []);

  function handleContinue() {
    if (addingNew) {
      setShippingAddress(form);
      setAddressId(null);
    } else if (selectedId) {
      setAddressId(selectedId);
      setShippingAddress(null);
    }
    router.push("/checkout/details");
  }

  return (
    <div>
      <h1 className="text-xl font-bold text-gray-900 mb-6">Step 1 — Shipping Address</h1>

      {addresses.length > 0 && !addingNew && (
        <div className="space-y-3 mb-4">
          {addresses.map((addr) => (
            <label
              key={addr.id}
              className={`flex items-start gap-3 p-4 rounded-lg border cursor-pointer transition-colors ${
                selectedId === addr.id
                  ? "border-brand-500 bg-brand-50"
                  : "border-gray-200 bg-white hover:border-gray-300"
              }`}
            >
              <input
                type="radio"
                name="address"
                value={addr.id}
                checked={selectedId === addr.id}
                onChange={() => setSelectedId(addr.id)}
                className="mt-1"
              />
              <div className="text-sm text-gray-700">
                {addr.label && <p className="font-medium">{addr.label}</p>}
                <p>{addr.line1}{addr.line2 ? `, ${addr.line2}` : ""}</p>
                <p>{addr.city}, {addr.state} {addr.postal_code}, {addr.country}</p>
              </div>
            </label>
          ))}
          <button
            onClick={() => setAddingNew(true)}
            className="text-sm text-brand-600 hover:text-brand-700 font-medium"
          >
            + Add new address
          </button>
        </div>
      )}

      {addingNew && (
        <div className="bg-white rounded-lg border border-gray-200 p-5 mb-4 space-y-3">
          <h2 className="text-sm font-semibold text-gray-900">New Address</h2>
          {(["line1", "line2", "city", "state", "postal_code"] as const).map((field) => (
            <div key={field}>
              <label className="block text-sm font-medium text-gray-700 mb-1 capitalize">
                {field.replace("_", " ")}
                {field !== "line2" && <span className="text-red-500"> *</span>}
              </label>
              <input
                type="text"
                value={form[field]}
                onChange={(e) => setForm((p) => ({ ...p, [field]: e.target.value }))}
                required={field !== "line2"}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>
          ))}
          {addresses.length > 0 && (
            <button
              onClick={() => setAddingNew(false)}
              className="text-sm text-gray-500 hover:text-gray-700"
            >
              Cancel
            </button>
          )}
        </div>
      )}

      <button
        onClick={handleContinue}
        disabled={!addingNew && !selectedId}
        className="w-full rounded-md bg-brand-600 text-white py-3 text-sm font-medium hover:bg-brand-700 disabled:opacity-50"
      >
        Continue to Order Details
      </button>
    </div>
  );
}
