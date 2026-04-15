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

// ── Brand logo mapping ─────────────────────────────────────────────────────────
function CardBrandIcon({ brand }: { brand: string }) {
  const b = brand.toLowerCase();

  if (b === "visa") {
    return (
      <svg width="42" height="28" viewBox="0 0 42 28" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect width="42" height="28" rx="4" fill="#1A1F71" />
        <text x="50%" y="62%" dominantBaseline="middle" textAnchor="middle" fill="#fff" fontSize="11" fontWeight="800" fontFamily="Arial,sans-serif" letterSpacing="0.5">VISA</text>
      </svg>
    );
  }
  if (b === "mastercard") {
    return (
      <svg width="42" height="28" viewBox="0 0 42 28" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect width="42" height="28" rx="4" fill="#252525" />
        <circle cx="16" cy="14" r="8" fill="#EB001B" />
        <circle cx="26" cy="14" r="8" fill="#F79E1B" />
        <path d="M21 8.27a8 8 0 010 11.46A8 8 0 0121 8.27z" fill="#FF5F00" />
      </svg>
    );
  }
  if (b === "amex" || b === "american express") {
    return (
      <svg width="42" height="28" viewBox="0 0 42 28" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect width="42" height="28" rx="4" fill="#2E77BC" />
        <text x="50%" y="62%" dominantBaseline="middle" textAnchor="middle" fill="#fff" fontSize="8" fontWeight="800" fontFamily="Arial,sans-serif" letterSpacing="0.5">AMEX</text>
      </svg>
    );
  }
  if (b === "discover") {
    return (
      <svg width="42" height="28" viewBox="0 0 42 28" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect width="42" height="28" rx="4" fill="#fff" stroke="#E2E0DA" />
        <circle cx="28" cy="14" r="8" fill="#F76B20" />
        <text x="10" y="62%" dominantBaseline="middle" fill="#231F20" fontSize="7" fontWeight="800" fontFamily="Arial,sans-serif">DISCOVER</text>
      </svg>
    );
  }

  // Generic card
  return (
    <svg width="42" height="28" viewBox="0 0 42 28" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="42" height="28" rx="4" fill="#F4F3EF" stroke="#E2E0DA" />
      <rect x="6" y="10" width="14" height="8" rx="2" fill="#E2E0DA" />
      <rect x="6" y="20" width="6" height="3" rx="1" fill="#E2E0DA" />
      <rect x="14" y="20" width="6" height="3" rx="1" fill="#E2E0DA" />
    </svg>
  );
}

function brandDisplayName(brand: string): string {
  const b = brand.toLowerCase();
  if (b === "visa") return "Visa";
  if (b === "mastercard") return "Mastercard";
  if (b === "amex" || b === "american express") return "American Express";
  if (b === "discover") return "Discover";
  return brand.charAt(0).toUpperCase() + brand.slice(1);
}

export default function PaymentMethodsPage() {
  const { isAuthenticated, isLoading } = useAuthStore();
  const [methods, setMethods] = useState<PaymentMethod[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [settingDefaultId, setSettingDefaultId] = useState<string | null>(null);
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
    setSettingDefaultId(id);
    setMessage(null);
    try {
      await apiClient.patch(`/api/v1/account/payment-methods/${id}/set-default`, {});
      setMessage({ type: "success", text: "Default payment method updated." });
      await loadMethods();
    } catch {
      setMessage({ type: "error", text: "Failed to update default card." });
    } finally {
      setSettingDefaultId(null);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Remove this saved card?")) return;
    setDeletingId(id);
    setMessage(null);
    try {
      await apiClient.delete(`/api/v1/account/payment-methods/${id}`);
      setMessage({ type: "success", text: "Card removed." });
      await loadMethods();
    } catch {
      setMessage({ type: "error", text: "Failed to remove card." });
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div style={{ maxWidth: "680px" }}>
      {/* Page heading */}
      <div style={{ marginBottom: "24px" }}>
        <h1 style={{ fontFamily: "var(--font-bebas)", fontSize: "28px", letterSpacing: ".04em", color: "#2A2830", lineHeight: 1, marginBottom: "4px" }}>
          Payment Methods
        </h1>
        <p style={{ fontSize: "13px", color: "#7A7880" }}>
          Saved cards are used at checkout. Cards are saved automatically when you complete a purchase.
        </p>
      </div>

      {/* Message banner */}
      {message && (
        <div style={{
          display: "flex", alignItems: "center", gap: "8px",
          padding: "10px 14px", borderRadius: "7px", marginBottom: "16px",
          fontSize: "13px", fontWeight: 600,
          background: message.type === "success" ? "rgba(22,163,74,.08)" : "rgba(220,38,38,.08)",
          border: `1px solid ${message.type === "success" ? "rgba(22,163,74,.25)" : "rgba(220,38,38,.25)"}`,
          color: message.type === "success" ? "#15803d" : "#dc2626",
        }}>
          {message.type === "success" ? (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
          ) : (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>
          )}
          {message.text}
        </div>
      )}

      {loading ? (
        <div style={{ padding: "40px 0", textAlign: "center", color: "#aaa", fontSize: "13px" }}>
          Loading payment methods…
        </div>
      ) : methods.length === 0 ? (
        /* Empty state */
        <div style={{
          textAlign: "center", padding: "48px 24px",
          background: "#fff", border: "1.5px dashed #E2E0DA", borderRadius: "10px",
        }}>
          <div style={{ width: "48px", height: "48px", margin: "0 auto 14px", background: "#F4F3EF", borderRadius: "10px", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#bbb" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
              <rect x="1" y="4" width="22" height="16" rx="2" ry="2" />
              <line x1="1" y1="10" x2="23" y2="10" />
            </svg>
          </div>
          <p style={{ fontSize: "14px", fontWeight: 700, color: "#2A2830", marginBottom: "4px" }}>No saved cards yet</p>
          <p style={{ fontSize: "12px", color: "#aaa" }}>
            Cards are saved automatically when you complete a checkout.
          </p>
        </div>
      ) : (
        /* Card list */
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          {methods.map((method) => (
            <div
              key={method.id}
              style={{
                background: "#fff",
                border: `1.5px solid ${method.is_default ? "#1A5CFF" : "#E2E0DA"}`,
                borderRadius: "10px",
                padding: "16px 20px",
                display: "flex",
                alignItems: "center",
                gap: "16px",
                boxShadow: method.is_default ? "0 2px 8px rgba(26,92,255,.09)" : "0 1px 3px rgba(0,0,0,.04)",
                transition: "border-color .15s, box-shadow .15s",
              }}
            >
              {/* Card brand icon */}
              <div style={{ flexShrink: 0 }}>
                <CardBrandIcon brand={method.brand} />
              </div>

              {/* Card info */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                  <span style={{ fontSize: "14px", fontWeight: 700, color: "#2A2830" }}>
                    {brandDisplayName(method.brand)} •••• {method.last4}
                  </span>
                  {method.is_default && (
                    <span style={{
                      fontSize: "10px", fontWeight: 700, textTransform: "uppercase",
                      letterSpacing: ".08em", padding: "2px 7px", borderRadius: "3px",
                      background: "rgba(26,92,255,.1)", color: "#1A5CFF",
                    }}>
                      Default
                    </span>
                  )}
                </div>
                <div style={{ marginTop: "3px", display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
                  <span style={{ fontSize: "12px", color: "#7A7880" }}>
                    Expires {method.exp_month}/{method.exp_year}
                  </span>
                  {method.name && (
                    <span style={{ fontSize: "12px", color: "#aaa" }}>{method.name}</span>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div style={{ display: "flex", alignItems: "center", gap: "8px", flexShrink: 0 }}>
                {!method.is_default && (
                  <button
                    onClick={() => handleSetDefault(method.id)}
                    disabled={settingDefaultId === method.id}
                    style={{
                      padding: "6px 12px", fontSize: "12px", fontWeight: 600,
                      color: "#1A5CFF", background: "rgba(26,92,255,.07)",
                      border: "1px solid rgba(26,92,255,.2)", borderRadius: "6px",
                      cursor: settingDefaultId === method.id ? "not-allowed" : "pointer",
                      opacity: settingDefaultId === method.id ? 0.5 : 1,
                      transition: "all .15s", whiteSpace: "nowrap",
                    }}
                  >
                    {settingDefaultId === method.id ? "Saving…" : "Set Default"}
                  </button>
                )}
                <button
                  onClick={() => handleDelete(method.id)}
                  disabled={deletingId === method.id}
                  style={{
                    padding: "6px 12px", fontSize: "12px", fontWeight: 600,
                    color: "#dc2626", background: "rgba(220,38,38,.06)",
                    border: "1px solid rgba(220,38,38,.18)", borderRadius: "6px",
                    cursor: deletingId === method.id ? "not-allowed" : "pointer",
                    opacity: deletingId === method.id ? 0.5 : 1,
                    transition: "all .15s",
                  }}
                >
                  {deletingId === method.id ? "Removing…" : "Remove"}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Info note */}
      {!loading && (
        <div style={{
          marginTop: "20px", padding: "12px 16px", borderRadius: "7px",
          background: "#F4F3EF", border: "1px solid #E2E0DA",
          display: "flex", alignItems: "flex-start", gap: "10px",
        }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#7A7880" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: "1px" }}>
            <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          <p style={{ fontSize: "12px", color: "#7A7880", lineHeight: 1.5 }}>
            To add a new card, proceed to checkout and enter your card details. Your card will be saved automatically for future orders.
          </p>
        </div>
      )}
    </div>
  );
}
