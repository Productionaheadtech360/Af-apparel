"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { formatCurrency } from "@/lib/utils";
import { cartService } from "@/services/cart.service";
import { CartSummary } from "@/components/cart/CartSummary";
import { MOQWarning } from "@/components/cart/MOQWarning";
import type { Cart, CartItem } from "@/types/order.types";

export default function CartPage() {
  const router = useRouter();
  const [cart, setCart] = useState<Cart | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [savingTemplate, setSavingTemplate] = useState(false);
  const [templateName, setTemplateName] = useState("");
  const [showTemplateDialog, setShowTemplateDialog] = useState(false);
  const [updatingItemId, setUpdatingItemId] = useState<string | null>(null);

  useEffect(() => {
    cartService.getCart().then(setCart).catch(console.error).finally(() => setIsLoading(false));
  }, []);

  async function handleQuantityChange(itemId: string, quantity: number) {
    if (quantity < 1) return;
    setUpdatingItemId(itemId);
    try {
      const updated = await cartService.updateItem(itemId, quantity);
      setCart(updated);
    } catch (err) {
      console.error(err);
    } finally {
      setUpdatingItemId(null);
    }
  }

  async function handleRemove(itemId: string) {
    setUpdatingItemId(itemId);
    try {
      const updated = await cartService.removeItem(itemId);
      setCart(updated);
    } catch (err) {
      console.error(err);
    } finally {
      setUpdatingItemId(null);
    }
  }

  async function handleSaveTemplate() {
    if (!templateName.trim()) return;
    setSavingTemplate(true);
    try {
      await cartService.saveTemplate(templateName.trim());
      setShowTemplateDialog(false);
      setTemplateName("");
    } catch (err) {
      console.error(err);
    } finally {
      setSavingTemplate(false);
    }
  }

  function getCheckoutDisabledReason(): string | undefined {
    if (!cart) return "Cart is empty";
    if (!cart.items || cart.items.length === 0) return "Cart is empty";
    if (!cart.validation) return undefined;
    const v = cart.validation;
    if (v.moq_violations?.length > 0) {
      return `${v.moq_violations.length} item${v.moq_violations.length !== 1 ? "s" : ""} below minimum order quantity`;
    }
    if (v.mov_violation) {
      return `Minimum order value of ${formatCurrency(Number(v.mov_required))} not met`;
    }
    return undefined;
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-500 text-sm">Loading cart…</p>
      </div>
    );
  }

  const isEmpty = !cart || !cart.items || cart.items.length === 0;
  const disabledReason = getCheckoutDisabledReason();
  const isCheckoutEnabled = !disabledReason;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Shopping Cart</h1>

        {isEmpty ? (
          <div className="text-center py-16">
            <p className="text-gray-500 text-lg">Your cart is empty.</p>
            <Link
              href="/products"
              className="mt-4 inline-block text-sm text-brand-600 hover:text-brand-700 font-medium"
            >
              Browse products
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Items */}
            <div className="lg:col-span-2 space-y-4">
              {/* MOV warning banner */}
              {cart.validation?.mov_violation && (
                <div className="rounded-md bg-red-50 border border-red-200 p-4 text-sm text-red-800">
                  <p className="font-medium">Minimum order value not met</p>
                  <p className="mt-1">
                    Your order total is{" "}
                    <strong>{formatCurrency(Number(cart.validation.mov_current))}</strong>. The
                    minimum order value is{" "}
                    <strong>{formatCurrency(Number(cart.validation.mov_required))}</strong>.
                  </p>
                </div>
              )}

              {cart.items.map((item: CartItem) => (
                <div
                  key={item.id}
                  className="bg-white rounded-lg border border-gray-200 p-4"
                >
                  <div className="flex gap-4">
                    {/* Product image placeholder */}
                    <div className="w-16 h-16 flex-shrink-0 rounded bg-gray-100" />

                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {item.product_name}
                          </p>
                          <p className="text-xs text-gray-500 mt-0.5">
                            {item.color && <span>{item.color}</span>}
                            {item.color && item.size && <span> · </span>}
                            {item.size && <span>{item.size}</span>}
                            {" · "}
                            <span className="font-mono">{item.sku}</span>
                          </p>
                        </div>
                        <button
                          onClick={() => handleRemove(item.id)}
                          disabled={updatingItemId === item.id}
                          className="text-xs text-red-500 hover:text-red-700 flex-shrink-0"
                        >
                          Remove
                        </button>
                      </div>

                      <div className="mt-2 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <label htmlFor={`qty-${item.id}`} className="sr-only">
                            Quantity
                          </label>
                          <input
                            id={`qty-${item.id}`}
                            type="number"
                            min="1"
                            value={item.quantity}
                            onChange={(e) =>
                              handleQuantityChange(item.id, parseInt(e.target.value, 10))
                            }
                            disabled={updatingItemId === item.id}
                            className="w-16 text-center rounded border border-gray-300 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-brand-500"
                          />
                          <span className="text-xs text-gray-500">
                            × {formatCurrency(Number(item.unit_price))}
                          </span>
                        </div>
                        <span className="text-sm font-semibold text-gray-900">
                          {formatCurrency(Number(item.line_total))}
                        </span>
                      </div>

                      {!item.moq_satisfied && (
                        <div className="mt-2">
                          <MOQWarning
                            sku={item.sku}
                            required={item.moq}
                            current={item.quantity}
                          />
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}

              {/* Save as template */}
              <div className="flex justify-end">
                <button
                  onClick={() => setShowTemplateDialog(true)}
                  className="text-sm text-brand-600 hover:text-brand-700 font-medium"
                >
                  Save as Template
                </button>
              </div>
            </div>

            {/* Sidebar */}
            <div>
              <CartSummary
                subtotal={Number(cart.subtotal)}
                estimatedShipping={Number(cart.validation?.estimated_shipping ?? 0)}
                isValid={isCheckoutEnabled}
                onCheckout={() => router.push("/checkout/address")}
                checkoutDisabledReason={disabledReason}
              />
            </div>
          </div>
        )}
      </div>

      {/* Save Template Dialog */}
      {showTemplateDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-sm">
            <h2 className="text-base font-semibold text-gray-900 mb-3">Save as Template</h2>
            <input
              type="text"
              placeholder="Template name"
              value={templateName}
              onChange={(e) => setTemplateName(e.target.value)}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              autoFocus
            />
            <div className="mt-4 flex gap-3 justify-end">
              <button
                onClick={() => setShowTemplateDialog(false)}
                className="text-sm text-gray-600 hover:text-gray-800"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveTemplate}
                disabled={savingTemplate || !templateName.trim()}
                className="rounded-md bg-brand-600 text-white px-4 py-2 text-sm font-medium hover:bg-brand-700 disabled:opacity-50"
              >
                {savingTemplate ? "Saving…" : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
