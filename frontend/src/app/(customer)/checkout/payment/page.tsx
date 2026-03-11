"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { loadStripe } from "@stripe/stripe-js";
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements,
} from "@stripe/react-stripe-js";
import { STRIPE_PUBLIC_KEY } from "@/lib/constants";
import { ordersService } from "@/services/orders.service";
import { useCheckoutStore } from "@/stores/checkout.store";

const stripePromise = loadStripe(STRIPE_PUBLIC_KEY);

function PaymentForm() {
  const stripe = useStripe();
  const elements = useElements();
  const router = useRouter();
  const { setPaymentIntent } = useCheckoutStore();
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!stripe || !elements) return;

    setIsProcessing(true);
    setError(null);

    const { error: confirmError, paymentIntent } = await stripe.confirmPayment({
      elements,
      confirmParams: { return_url: `${window.location.origin}/checkout/review` },
      redirect: "if_required",
    });

    if (confirmError) {
      setError(confirmError.message ?? "Payment failed");
      setIsProcessing(false);
      return;
    }

    if (paymentIntent?.status === "requires_confirmation" || paymentIntent?.status === "succeeded") {
      setPaymentIntent(paymentIntent.id, "");
      router.push("/checkout/review");
    }

    setIsProcessing(false);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <PaymentElement />
      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="flex gap-3 mt-4">
        <button
          type="button"
          onClick={() => router.push("/checkout/details")}
          className="flex-1 rounded-md border border-gray-300 bg-white text-gray-700 py-3 text-sm font-medium hover:bg-gray-50"
        >
          Back
        </button>
        <button
          type="submit"
          disabled={isProcessing || !stripe}
          className="flex-1 rounded-md bg-brand-600 text-white py-3 text-sm font-medium hover:bg-brand-700 disabled:opacity-50"
        >
          {isProcessing ? "Processing…" : "Continue to Review"}
        </button>
      </div>
    </form>
  );
}

export default function CheckoutPaymentPage() {
  const router = useRouter();
  const { clientSecret, setPaymentIntent } = useCheckoutStore();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (clientSecret) {
      setLoading(false);
      return;
    }
    ordersService
      .createPaymentIntent()
      .then((res) => {
        setPaymentIntent(res.payment_intent_id, res.client_secret);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message ?? "Failed to initialize payment");
        setLoading(false);
      });
  }, [clientSecret, setPaymentIntent]);

  if (loading) {
    return (
      <div className="text-center py-8 text-gray-500 text-sm">
        Initializing payment…
      </div>
    );
  }

  if (error || !clientSecret) {
    return (
      <div className="text-center py-8">
        <p className="text-sm text-red-600 mb-4">{error ?? "Payment setup failed"}</p>
        <button
          onClick={() => router.push("/cart")}
          className="text-sm text-brand-600 hover:text-brand-700"
        >
          Return to cart
        </button>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-xl font-bold text-gray-900 mb-6">Step 3 — Payment</h1>
      <div className="bg-white rounded-lg border border-gray-200 p-5">
        <Elements
          stripe={stripePromise}
          options={{ clientSecret, appearance: { theme: "stripe" } }}
        >
          <PaymentForm />
        </Elements>
      </div>
    </div>
  );
}
