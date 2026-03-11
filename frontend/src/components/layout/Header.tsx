"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useAuthStore } from "@/stores/auth.store";
import { apiClient } from "@/lib/api-client";

export function Header() {
  const { user, isAuthenticated, logout } = useAuthStore();
  const [cartCount, setCartCount] = useState(0);

  useEffect(() => {
    if (isAuthenticated()) {
      apiClient.get("/cart").then((r: any) => {
        const items: any[] = r.data?.items ?? [];
        setCartCount(items.reduce((sum, i) => sum + i.quantity, 0));
      }).catch(() => {});
    }
  }, [isAuthenticated]);

  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 font-bold text-gray-900 text-lg shrink-0">
          AF Apparels
        </Link>

        {/* Nav links */}
        <nav className="hidden md:flex items-center gap-6 text-sm">
          <Link href="/products" className="text-gray-600 hover:text-gray-900">Products</Link>
          <Link href="/quick-order" className="text-gray-600 hover:text-gray-900">Quick Order</Link>
          {isAuthenticated() && (
            <Link href="/account" className="text-gray-600 hover:text-gray-900">My Account</Link>
          )}
        </nav>

        {/* Right actions */}
        <div className="flex items-center gap-4">
          {/* Cart */}
          {isAuthenticated() && (
            <Link href="/cart" className="relative text-gray-600 hover:text-gray-900">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              {cartCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-blue-600 text-white text-xs font-bold w-4 h-4 flex items-center justify-center rounded-full">
                  {cartCount > 9 ? "9+" : cartCount}
                </span>
              )}
            </Link>
          )}

          {/* User menu */}
          {isAuthenticated() ? (
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-700 hidden sm:block">
                {user?.first_name}
              </span>
              <button
                onClick={logout}
                className="text-sm text-gray-500 hover:text-gray-900"
              >
                Sign out
              </button>
            </div>
          ) : (
            <Link
              href="/login"
              className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700"
            >
              Sign in
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
