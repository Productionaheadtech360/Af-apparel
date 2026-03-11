import type { ReactNode } from "react";

const STEPS = [
  { label: "Shipping", href: "/checkout/address" },
  { label: "Details", href: "/checkout/details" },
  { label: "Payment", href: "/checkout/payment" },
  { label: "Review", href: "/checkout/review" },
];

interface CheckoutLayoutProps {
  children: ReactNode;
}

export default function CheckoutLayout({ children }: CheckoutLayoutProps) {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
        {/* Progress indicator */}
        <nav className="mb-8">
          <ol className="flex items-center justify-center gap-0">
            {STEPS.map((step, i) => (
              <li key={step.label} className="flex items-center">
                <div className="flex flex-col items-center">
                  <div className="w-8 h-8 rounded-full border-2 border-brand-600 bg-brand-600 text-white flex items-center justify-center text-xs font-bold">
                    {i + 1}
                  </div>
                  <span className="text-xs text-gray-600 mt-1 hidden sm:block">
                    {step.label}
                  </span>
                </div>
                {i < STEPS.length - 1 && (
                  <div className="w-16 sm:w-24 h-0.5 bg-gray-300 mx-1" />
                )}
              </li>
            ))}
          </ol>
        </nav>

        {children}
      </div>
    </div>
  );
}
