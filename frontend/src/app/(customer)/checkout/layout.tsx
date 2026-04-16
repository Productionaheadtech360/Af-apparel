"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";

const STEPS = [
  { label: "Shipping", href: "/checkout/address", step: 1 },
  { label: "Payment", href: "/checkout/payment", step: 2 },
  { label: "Review", href: "/checkout/review", step: 3 },
  { label: "Confirmed", href: "/checkout/confirmed", step: 4 },
];

function getActiveStep(pathname: string): number {
  if (pathname.includes("/checkout/confirmed")) return 4;
  if (pathname.includes("/checkout/review")) return 3;
  if (pathname.includes("/checkout/payment")) return 2;
  return 1;
}

interface CheckoutLayoutProps {
  children: ReactNode;
}

export default function CheckoutLayout({ children }: CheckoutLayoutProps) {
  const pathname = usePathname();
  const activeStep = getActiveStep(pathname);

  return (
    <div style={{ minHeight: "100vh", background: "#F4F3EF", fontFamily: "var(--font-jakarta)" }}>
      {/* Page header */}
      <div style={{ background: "#080808", borderBottom: "1px solid rgba(255,255,255,.06)", padding: "18px 32px 16px" }}>
        <div style={{ maxWidth: "680px", margin: "0 auto" }}>
          <div style={{ fontSize: "10px", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".14em", color: "#555", marginBottom: "4px" }}>AF Apparels</div>
          <h1 style={{ fontFamily: "var(--font-bebas)", fontSize: "clamp(22px,3vw,34px)", color: "#fff", letterSpacing: ".03em", lineHeight: 1 }}>
            Checkout
          </h1>
        </div>
      </div>

      {/* Step indicator */}
      <div style={{ background: "#fff", borderBottom: "1px solid #E2E0DA", padding: "0 32px" }}>
        <div style={{ maxWidth: "680px", margin: "0 auto", display: "flex", alignItems: "center" }}>
          {STEPS.map((step, i) => {
            const isActive = activeStep === step.step;
            const isDone = activeStep > step.step;
            return (
              <div key={step.href} style={{ display: "flex", alignItems: "center", flex: i < STEPS.length - 1 ? 1 : undefined }}>
                <div style={{ display: "flex", alignItems: "center", gap: "6px", padding: "14px 0", whiteSpace: "nowrap" }}>
                  {/* Bubble */}
                  <div style={{
                    width: "24px", height: "24px", borderRadius: "50%", flexShrink: 0,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    background: isDone ? "#059669" : isActive ? "#E8242A" : "#E2E0DA",
                    color: (isDone || isActive) ? "#fff" : "#aaa",
                    fontSize: "11px", fontWeight: 800,
                  }}>
                    {isDone ? (
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    ) : step.step}
                  </div>
                  <span style={{ fontSize: "12px", fontWeight: isActive ? 700 : 500, color: isActive ? "#2A2830" : isDone ? "#7A7880" : "#aaa" }}>
                    {step.label}
                  </span>
                </div>
                {/* Connector */}
                {i < STEPS.length - 1 && (
                  <div style={{ flex: 1, height: "1.5px", background: isDone ? "#059669" : "#E2E0DA", margin: "0 6px" }} />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Content */}
      <div style={{ maxWidth: "680px", margin: "0 auto", padding: "32px 24px 60px" }}>
        {children}
      </div>
    </div>
  );
}
