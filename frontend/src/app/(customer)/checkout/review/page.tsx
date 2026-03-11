"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { formatCurrency } from "@/lib/utils";
import { cartService } from "@/services/cart.service";
import { ordersService } from "@/services/orders.service";
import { useCheckoutStore } from "@/stores/checkout.store";
import { useCartStore } from "@/stores/cart.store";
import type { Cart } from "@/types/order.types";

export default function CheckoutReviewPage() {
  const router = useRouter();
  const {
    addressId,
    shippingAddress,
    poNumber,
    orderNotes,
    paymentIntentId,
    reset,
  } = useCheckoutStore();
  const clearCart = useCartStore((s) => s.clearCart);
  const [isPlacing, setIsPlacing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cart, setCart] = useState<Cart | null>(null);

  // Load cart summary on mount
  useState(() => {
    cartService.getCart().then(setCart).catch(console.error);
  });

  async function handlePlaceOrder() {
    if (!paymentIntentId) {
      setError("Payment not completed. Please go back to the payment step.");
      return;
    }

    setIsPlacing(true);
    setError(null);

    try {
      const order = await ordersService.confirmOrder({
        payment_intent_id: paymentIntentId,
        address_id: addressId ?? undefined,
        shipping_address: shippingAddress ?? undefined,
        po_number: poNumber || undefined,
        order_notes: orderNotes || undefined,
      });

      clearCart();
      reset();
      router.push(`/orders/confirmation/${order.id}`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to place order");
      setIsPlacing(false);
    }
  }

  return (
    <div>
      <h1 className="text-xl font-bold text-gray-900 mb-6">Step 4 — Review Order</h1>

      <div className="space-y-4 mb-6">
        {/* Shipping address summary */}
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-sm font-semibold text-gray-900">Shipping Address</h2>
            <Link href="/checkout/address" className="text-xs text-brand-600 hover:text-brand-700">
              Edit
            </Link>
          </div>
          {shippingAddress ? (
            <p className="text-sm text-gray-600">
              {shippingAddress.line1}{shippingAddress.line2 ? `, ${shippingAddress.line2}` : ""}
              <br />
              {shippingAddress.city}, {shippingAddress.state} {shippingAddress.postal_code}
            </p>
          ) : (
            <p className="text-sm text-gray-500">Saved address #{addressId?.slice(0, 8)}</p>
          )}
        </div>

        {/* Order details summary */}
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-sm font-semibold text-gray-900">Order Details</h2>
            <Link href="/checkout/details" className="text-xs text-brand-600 hover:text-brand-700">
              Edit
            </Link>
          </div>
          <p className="text-sm text-gray-600">
            PO Number: <span className="font-medium">{poNumber || "—"}</span>
          </p>
          {orderNotes && (
            <p className="text-sm text-gray-600 mt-1">Notes: {orderNotes}</p>
          )}
        </div>

        {/* Payment summary */}
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-sm font-semibold text-gray-900">Payment</h2>
            <Link href="/checkout/payment" className="text-xs text-brand-600 hover:text-brand-700">
              Edit
            </Link>
          </div>
          <p className="text-sm text-gray-600">
            {paymentIntentId ? "Payment authorized" : "No payment on file"}
          </p>
        </div>

        {/* Cart items */}
        {cart && (
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <h2 className="text-sm font-semibold text-gray-900 mb-3">
              Items ({cart.item_count})
            </h2>
            <div className="space-y-2">
              {cart.items.map((item) => (
                <div key={item.id} className="flex justify-between text-sm">
                  <span className="text-gray-700">
                    {item.product_name} — {item.color} / {item.size} × {item.quantity}
                  </span>
                  <span className="text-gray-900 font-medium">
                    {formatCurrency(Number(item.line_total))}
                  </span>
                </div>
              ))}
            </div>
            <div className="mt-3 pt-3 border-t border-gray-100 space-y-1 text-sm">
              <div className="flex justify-between text-gray-600">
                <span>Subtotal</span>
                <span>{formatCurrency(Number(cart.subtotal))}</span>
              </div>
              <div className="flex justify-between text-gray-600">
                <span>Shipping</span>
                <span>
                  {formatCurrency(Number(cart.validation?.estimated_shipping ?? 0))}
                </span>
              </div>
              <div className="flex justify-between font-semibold text-gray-900 text-base">
                <span>Total</span>
                <span>
                  {formatCurrency(
                    Number(cart.subtotal) + Number(cart.validation?.estimated_shipping ?? 0)
                  )}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {error && (
        <div className="mb-4 p-3 rounded-md bg-red-50 border border-red-200 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="flex gap-3">
        <button
          onClick={() => router.push("/checkout/payment")}
          className="flex-1 rounded-md border border-gray-300 bg-white text-gray-700 py-3 text-sm font-medium hover:bg-gray-50"
        >
          Back
        </button>
        <button
          onClick={handlePlaceOrder}
          disabled={isPlacing}
          className="flex-1 rounded-md bg-brand-600 text-white py-3 text-sm font-medium hover:bg-brand-700 disabled:opacity-50"
        >
          {isPlacing ? "Placing order…" : "Place Order"}
        </button>
      </div>
    </div>
  );
}
