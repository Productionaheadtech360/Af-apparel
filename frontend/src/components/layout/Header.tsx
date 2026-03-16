"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/stores/auth.store";
import { authService } from "@/services/auth.service";
import { apiClient } from "@/lib/api-client";

export function Header() {
  const { user, isAuthenticated, isAdmin, clearAuth, isLoading } = useAuthStore();
  const [cartCount, setCartCount] = useState(0);
  const [menuOpen, setMenuOpen] = useState(false);
  const router = useRouter();

  useEffect(() => {
    if (isLoading || !user || user.is_admin) return;
    apiClient
      .get<{ items: { quantity: number }[] }>("/api/v1/cart")
      .then((r) => {
        const items = r?.items ?? [];
        setCartCount(items.reduce((sum, i) => sum + i.quantity, 0));
      })
      .catch(() => {});
  }, [isLoading, user]);

  async function handleLogout() {
    try {
      await authService.logout();
    } catch {
      // ignore — clear client state regardless
    }
    clearAuth();
    setCartCount(0);
    router.push("/login");
  }

  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        {/* Logo */}
        <Link href="/" className="font-bold text-blue-600 text-xl shrink-0">
          AF Apparels
        </Link>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-6 text-sm flex-1">
          {isAdmin() ? (
            <Link href="/admin/dashboard" className="text-gray-600 hover:text-gray-900 font-medium">
              Admin Panel
            </Link>
          ) : (
            <>
              <Link href="/products" className="text-gray-600 hover:text-gray-900">
                Products
              </Link>
              {isAuthenticated() && (
                <>
                  <Link href="/quick-order" className="text-gray-600 hover:text-gray-900">
                    Quick Order
                  </Link>
                  <Link href="/account" className="text-gray-600 hover:text-gray-900">
                    My Account
                  </Link>
                </>
              )}
              {!isAuthenticated() && (
                <Link href="/wholesale/register" className="text-gray-600 hover:text-gray-900">
                  Apply for Wholesale
                </Link>
              )}
            </>
          )}
        </nav>

        {/* Right actions */}
        <div className="flex items-center gap-3">
          {/* Cart — customer only */}
          {isAuthenticated() && !isAdmin() && (
            <Link href="/cart" className="relative text-gray-600 hover:text-gray-900 p-1">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"
                />
              </svg>
              {cartCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 bg-blue-600 text-white text-xs font-bold w-4 h-4 flex items-center justify-center rounded-full">
                  {cartCount > 9 ? "9+" : cartCount}
                </span>
              )}
            </Link>
          )}

          {/* Auth buttons */}
          {isAuthenticated() ? (
            <div className="flex items-center gap-3">
              <span className="text-sm text-gray-700 hidden sm:block">
                {user?.first_name}
                {isAdmin() && (
                  <span className="ml-1 text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded font-medium">
                    Admin
                  </span>
                )}
              </span>
              <button
                onClick={handleLogout}
                className="text-sm text-gray-500 hover:text-gray-900 border border-gray-200 rounded-md px-3 py-1.5 hover:bg-gray-50 transition-colors"
              >
                Sign out
              </button>
            </div>
          ) : (
            <Link
              href="/login"
              className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 transition-colors"
            >
              Sign in
            </Link>
          )}

          {/* Mobile hamburger */}
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="md:hidden p-1.5 text-gray-600 hover:text-gray-900"
            aria-label="Toggle menu"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              {menuOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="md:hidden border-t border-gray-100 bg-white px-4 py-3 space-y-1">
          {isAdmin() ? (
            <Link href="/admin/dashboard" onClick={() => setMenuOpen(false)} className="block py-2 text-sm text-gray-700 hover:text-blue-600">
              Admin Panel
            </Link>
          ) : (
            <>
              <Link href="/products" onClick={() => setMenuOpen(false)} className="block py-2 text-sm text-gray-700 hover:text-blue-600">
                Products
              </Link>
              {isAuthenticated() && (
                <>
                  <Link href="/quick-order" onClick={() => setMenuOpen(false)} className="block py-2 text-sm text-gray-700 hover:text-blue-600">
                    Quick Order
                  </Link>
                  <Link href="/account" onClick={() => setMenuOpen(false)} className="block py-2 text-sm text-gray-700 hover:text-blue-600">
                    My Account
                  </Link>
                  <Link href="/cart" onClick={() => setMenuOpen(false)} className="block py-2 text-sm text-gray-700 hover:text-blue-600">
                    Cart {cartCount > 0 && `(${cartCount})`}
                  </Link>
                </>
              )}
              {!isAuthenticated() && (
                <>
                  <Link href="/wholesale/register" onClick={() => setMenuOpen(false)} className="block py-2 text-sm text-gray-700 hover:text-blue-600">
                    Apply for Wholesale
                  </Link>
                  <Link href="/login" onClick={() => setMenuOpen(false)} className="block py-2 text-sm font-medium text-blue-600">
                    Sign in
                  </Link>
                </>
              )}
            </>
          )}
          {isAuthenticated() && (
            <button onClick={handleLogout} className="block w-full text-left py-2 text-sm text-gray-500 hover:text-gray-900">
              Sign out
            </button>
          )}
        </div>
      )}
    </header>
  );
}
