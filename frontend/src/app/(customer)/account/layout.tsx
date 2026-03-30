// frontend/src/app/(customer)/account/layout.tsx
"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuthStore } from "@/stores/auth.store";

const NAV_ITEMS = [
  { href: "/account", label: "Overview" },
  { href: "/account/profile", label: "Account Profile" },
  { href: "/account/change-password", label: "Change Password" },
  { href: "/account/addresses", label: "Address Book" },
  { href: "/account/contacts", label: "Manage Contacts" },
  { href: "/account/users", label: "Manage Users" },
  { href: "/account/resend-emails", label: "Resend Registration Emails" },
  { href: "/account/payment-methods", label: "Manage Payment Methods" },
  { href: "/account/orders", label: "Orders Status" },
  { href: "/account/statements", label: "Statements" },
  { href: "/account/messages", label: "Messages" },
  { href: "/account/inventory", label: "Inventory Listing Report" },
  // { href: "/account/price-list", label: "Price List" },
  { href: "/account/abandoned-carts", label: "Abandoned Carts" },
];

export default function AccountLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { isAuthenticated, isLoading, isAdmin, user } = useAuthStore();
  const redirectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (isLoading) return;

    if (user?.is_admin) {
      router.replace("/admin/dashboard");
      return;
    }

    if (!isAuthenticated()) {
      // Small delay prevents flash-redirect when auth restores from sessionStorage
      // a fraction after the layout first renders.
      redirectTimer.current = setTimeout(() => {
        if (!useAuthStore.getState().isAuthenticated()) {
          router.replace("/login");
        }
      }, 300);
    }

    return () => {
      if (redirectTimer.current) clearTimeout(redirectTimer.current);
    };
  }, [isLoading, user, isAuthenticated, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-500 text-sm">Loading…</div>
      </div>
    );
  }

  if (!isAuthenticated()) return null;

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 flex gap-6">
      {/* Sidebar */}
      <nav className="w-52 flex-shrink-0">
        <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">My Account</h2>
        <ul className="space-y-1">
          {NAV_ITEMS.map((item) => {
            const active = pathname === item.href || (item.href !== "/account" && pathname.startsWith(item.href));
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={`block px-3 py-2 rounded-md text-sm transition-colors ${
                    active
                      ? "bg-blue-50 text-blue-700 font-medium"
                      : "text-gray-700 hover:bg-gray-100 hover:text-gray-900"
                  }`}
                >
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Main content */}
      <main className="flex-1 min-w-0">
        {children}
      </main>
    </div>
  );
}
