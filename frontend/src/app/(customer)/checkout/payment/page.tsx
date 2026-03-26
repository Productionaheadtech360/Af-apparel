"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { QBPaymentForm } from "@/components/checkout/QBPaymentForm";
import { useCheckoutStore } from "@/stores/checkout.store";
import { useAuthStore } from "@/stores/auth.store";
import { apiClient } from "@/lib/api-client";

interface SavedCard {
  id: string;
  brand: string;
  last4: string;
  exp_month: string;
  exp_year: string;
  name: string | null;
  is_default: boolean;
}

export default function CheckoutPaymentPage() {
  const router = useRouter();
  const { setQbToken, setSavedCardId } = useCheckoutStore();
  const { isAuthenticated, isLoading } = useAuthStore();

  const [savedCards, setSavedCards] = useState<SavedCard[]>([]);
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const [showNewCardForm, setShowNewCardForm] = useState(false);
  const [loadingCards, setLoadingCards] = useState(true);

  useEffect(() => {
    if (isLoading) return;
    if (!isAuthenticated()) return;

    apiClient
      .get<SavedCard[]>("/api/v1/account/payment-methods")
      .then((cards) => {
        setSavedCards(cards);
        if (cards.length > 0) {
          const def = cards.find((c) => c.is_default) ?? cards[0];
          setSelectedCardId(def.id);
          setShowNewCardForm(false);
        } else {
          setShowNewCardForm(true);
        }
      })
      .catch(() => setShowNewCardForm(true))
      .finally(() => setLoadingCards(false));
  }, [isLoading, isAuthenticated]);

  function handleToken(token: string) {
    setQbToken(token);
    router.push("/checkout/review");
  }

  function handleUseSavedCard() {
    if (!selectedCardId) return;
    setSavedCardId(selectedCardId);
    router.push("/checkout/review");
  }

  if (loadingCards) {
    return (
      <div>
        <h1 className="text-xl font-bold text-gray-900 mb-6">Step 3 — Payment</h1>
        <div className="py-12 text-center text-gray-400">Loading payment methods…</div>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-xl font-bold text-gray-900 mb-6">Step 3 — Payment</h1>

      <div className="bg-white rounded-lg border border-gray-200 p-5 space-y-4">
        {/* Saved cards */}
        {savedCards.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm font-medium text-gray-700">Saved Payment Methods</p>

            {savedCards.map((card) => (
              <label
                key={card.id}
                className={`flex items-center gap-3 p-4 rounded-lg border cursor-pointer transition-colors ${
                  selectedCardId === card.id && !showNewCardForm
                    ? "border-blue-500 bg-blue-50"
                    : "border-gray-200 bg-white hover:border-gray-300"
                }`}
              >
                <input
                  type="radio"
                  name="payment"
                  value={card.id}
                  checked={selectedCardId === card.id && !showNewCardForm}
                  onChange={() => {
                    setSelectedCardId(card.id);
                    setShowNewCardForm(false);
                  }}
                  className="accent-blue-600"
                />
                <div className="flex items-center gap-3 flex-1">
                  <svg className="w-8 h-6 text-gray-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                  </svg>
                  <div>
                    <p className="font-medium text-gray-900 text-sm">
                      {card.brand} •••• {card.last4}
                      {card.is_default && (
                        <span className="ml-2 text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
                          Default
                        </span>
                      )}
                    </p>
                    <p className="text-xs text-gray-500">Expires {card.exp_month}/{card.exp_year}</p>
                  </div>
                </div>
              </label>
            ))}

            {/* Use a new card option */}
            <label
              className={`flex items-center gap-3 p-4 rounded-lg border cursor-pointer transition-colors ${
                showNewCardForm
                  ? "border-blue-500 bg-blue-50"
                  : "border-gray-200 bg-white hover:border-gray-300"
              }`}
            >
              <input
                type="radio"
                name="payment"
                checked={showNewCardForm}
                onChange={() => {
                  setShowNewCardForm(true);
                  setSelectedCardId(null);
                }}
                className="accent-blue-600"
              />
              <span className="text-sm font-medium text-gray-700">+ Use a new card</span>
            </label>
          </div>
        )}

        {/* New card form — submitting this form calls POST /checkout/tokenize */}
        {showNewCardForm && (
          <div className={savedCards.length > 0 ? "border-t border-gray-100 pt-4" : ""}>
            <QBPaymentForm
              onToken={handleToken}
              onBack={
                savedCards.length > 0
                  ? () => { setShowNewCardForm(false); setSelectedCardId(savedCards.find(c => c.is_default)?.id ?? savedCards[0]?.id ?? null); }
                  : () => router.push("/checkout/details")
              }
            />
          </div>
        )}

        {/* Continue with saved card — only shown when a saved card is selected (not new card form) */}
        {!showNewCardForm && selectedCardId && (
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={() => router.push("/checkout/details")}
              className="flex-1 rounded-md border border-gray-300 bg-white text-gray-700 py-3 text-sm font-medium hover:bg-gray-50"
            >
              Back
            </button>
            <button
              type="button"
              onClick={handleUseSavedCard}
              className="flex-1 rounded-md bg-brand-600 text-white py-3 text-sm font-medium hover:bg-brand-700"
            >
              Continue to Review
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
