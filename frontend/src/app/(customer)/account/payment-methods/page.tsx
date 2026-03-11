"use client";

import { useEffect, useState } from "react";
import { accountService } from "@/services/account.service";

interface PaymentMethod {
  id: string;
  brand: string;
  last4: string;
  exp_month: number;
  exp_year: number;
}

export default function AccountPaymentMethodsPage() {
  const [methods, setMethods] = useState<PaymentMethod[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    accountService.getPaymentMethods().then((d) => {
      setMethods(d as PaymentMethod[]);
      setIsLoading(false);
    });
  }, []);

  async function handleRemove(id: string) {
    await accountService.deletePaymentMethod(id);
    setMethods((prev) => prev.filter((m) => m.id !== id));
  }

  return (
    <div>
      <h1 className="text-xl font-bold text-gray-900 mb-4">Payment Methods</h1>
      <p className="text-sm text-gray-500 mb-4">Saved cards are used at checkout. New cards can be added during checkout.</p>

      {isLoading ? (
        <p className="text-sm text-gray-400">Loading…</p>
      ) : methods.length === 0 ? (
        <p className="text-sm text-gray-400">No payment methods saved. Add one at checkout.</p>
      ) : (
        <div className="space-y-2">
          {methods.map((m) => (
            <div key={m.id} className="bg-white rounded-lg border border-gray-200 p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-7 bg-gray-100 rounded flex items-center justify-center">
                  <span className="text-xs font-bold text-gray-600 uppercase">{m.brand}</span>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">•••• {m.last4}</p>
                  <p className="text-xs text-gray-400">Expires {m.exp_month}/{m.exp_year}</p>
                </div>
              </div>
              <button onClick={() => handleRemove(m.id)} className="text-xs text-red-500 hover:text-red-700">Remove</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
