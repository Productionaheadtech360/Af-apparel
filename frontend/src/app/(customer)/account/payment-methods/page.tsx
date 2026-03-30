"use client";

import { useEffect, useRef, useState } from "react";
import { apiClient } from "@/lib/api-client";
import { useAuthStore } from "@/stores/auth.store";

interface PaymentMethod {
  id: string;
  brand: string;
  last4: string;
  exp_month: string;
  exp_year: string;
  name: string | null;
  billing_address: object | null;
  is_default: boolean;
}

export default function PaymentMethodsPage() {
  const { isAuthenticated, isLoading } = useAuthStore();
  const [methods, setMethods] = useState<PaymentMethod[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const hasLoaded = useRef(false);

  useEffect(() => {
    if (isLoading) return;
    if (!isAuthenticated()) return;
    if (hasLoaded.current) return;
    hasLoaded.current = true;
    loadMethods();
  }, [isLoading]);

  async function loadMethods() {
    setLoading(true);
    try {
      const data = await apiClient.get<PaymentMethod[]>("/api/v1/account/payment-methods");
      setMethods(data);
    } catch {
      setMessage({ type: "error", text: "Failed to load payment methods." });
    } finally {
      setLoading(false);
    }
  }

  async function handleSetDefault(id: string) {
    try {
      await apiClient.patch(`/api/v1/account/payment-methods/${id}/set-default`, {});
      setMessage({ type: "success", text: "Default payment method updated!" });
      await loadMethods();
    } catch {
      setMessage({ type: "error", text: "Failed to update default card." });
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Are you sure you want to remove this card?")) return;
    try {
      await apiClient.delete(`/api/v1/account/payment-methods/${id}`);
      setMessage({ type: "success", text: "Card removed." });
      await loadMethods();
    } catch {
      setMessage({ type: "error", text: "Failed to remove card." });
    }
  }

  if (loading) return <div className="py-12 text-center text-gray-400">Loading...</div>;

  return (
    <div className="space-y-6 max-w-3xl">
      <h1 className="text-2xl font-bold text-gray-900">Payment Methods</h1>

      {message && (
        <div className={`px-4 py-3 rounded-md text-sm font-medium ${
          message.type === "success"
            ? "bg-green-50 text-green-700 border border-green-200"
            : "bg-red-50 text-red-700 border border-red-200"
        }`}>
          {message.text}
        </div>
      )}

      {methods.length === 0 ? (
        <div className="text-center py-12 bg-white border border-gray-200 rounded-lg">
          <svg className="w-12 h-12 text-gray-300 mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
          </svg>
          <p className="text-gray-500 font-medium">No saved cards yet.</p>
          <p className="text-gray-400 text-sm mt-1">
            Cards are automatically saved when you complete a checkout.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {methods.map((method) => (
            <div
              key={method.id}
              className={`bg-white border rounded-lg p-5 flex items-center justify-between ${
                method.is_default ? "border-blue-300 ring-1 ring-blue-200" : "border-gray-200"
              }`}
            >
              <div className="flex items-center gap-4">
                <svg className="w-10 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                </svg>
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-gray-900">
                      {method.brand} •••• {method.last4}
                    </p>
                    {method.is_default && (
                      <span className="bg-blue-100 text-blue-700 text-xs font-medium px-2 py-0.5 rounded-full">
                        Default
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-500">
                    Expires {method.exp_month}/{method.exp_year}
                  </p>
                  {method.name && (
                    <p className="text-xs text-gray-400">{method.name}</p>
                  )}
                </div>
              </div>

              <div className="flex gap-3">
                {!method.is_default && (
                  <button
                    onClick={() => handleSetDefault(method.id)}
                    className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                  >
                    Set Default
                  </button>
                )}
                <button
                  onClick={() => handleDelete(method.id)}
                  className="text-sm text-red-500 hover:text-red-600 font-medium"
                >
                  Remove
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
