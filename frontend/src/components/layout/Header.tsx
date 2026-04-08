"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/stores/auth.store";
import { authService } from "@/services/auth.service";
import { apiClient } from "@/lib/api-client";
import { AnnouncementBar } from "@/components/layout/AnnouncementBar";

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
      // ignore
    }
    clearAuth();
    setCartCount(0);
    router.push("/login");
  }

  return (
    <>
      <AnnouncementBar />

      {/* Main header */}
      <header style={{ background: "#080808", borderBottom: "1px solid rgba(255,255,255,.06)" }} className="sticky top-0 z-40">
        <div style={{ maxWidth: "1280px", margin: "0 auto", padding: "0 32px", display: "flex", alignItems: "center", justifyContent: "space-between", height: "68px", gap: "24px" }}>

          {/* Logo */}
<Link href="/" style={{ display: "flex", alignItems: "center", textDecoration: "none" }}>
  <img 
    src="/Af-apparel logo.jpeg" 
    alt="AF Apparels Logo" 
    style={{ height: "48px", width: "auto", objectFit: "contain" }} 
  />
</Link>

          {/* Desktop Nav */}
          <nav className="hidden md:flex" style={{ gap: "4px", alignItems: "center" }}>
            {isAdmin() ? (
              <Link href="/admin/dashboard" style={{ color: "#888", fontSize: "13px", fontWeight: 600, textDecoration: "none", letterSpacing: ".04em", padding: "8px 14px", borderRadius: "4px", transition: "all .2s", textTransform: "uppercase" }}
                onMouseEnter={e => { (e.target as HTMLAnchorElement).style.color="#fff"; (e.target as HTMLAnchorElement).style.background="rgba(255,255,255,.06)"; }}
                onMouseLeave={e => { (e.target as HTMLAnchorElement).style.color="#888"; (e.target as HTMLAnchorElement).style.background="transparent"; }}>
                Admin Panel
              </Link>
            ) : (
              <>
                <Link href="/products" style={{ color: "#888", fontSize: "13px", fontWeight: 600, textDecoration: "none", letterSpacing: ".04em", padding: "8px 14px", borderRadius: "4px", transition: "all .2s", textTransform: "uppercase" }}>
                  Shop All
                </Link>
                {isAuthenticated() && (
                  <>
                    <Link href="/quick-order" style={{ color: "#888", fontSize: "13px", fontWeight: 600, textDecoration: "none", letterSpacing: ".04em", padding: "8px 14px", borderRadius: "4px", transition: "all .2s", textTransform: "uppercase" }}>
                      Quick Order
                    </Link>
                    <Link href="/account" style={{ color: "#888", fontSize: "13px", fontWeight: 600, textDecoration: "none", letterSpacing: ".04em", padding: "8px 14px", borderRadius: "4px", transition: "all .2s", textTransform: "uppercase" }}>
                      My Account
                    </Link>
                  </>
                )}
              </>
            )}
          </nav>

          {/* Right Actions */}
          <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
            {/* Cart */}
            {isAuthenticated() && !isAdmin() && (
              <Link href="/cart" style={{ position: "relative", background: "transparent", border: "1.5px solid #2a2a2a", color: "#888", padding: "9px 14px", borderRadius: "5px", cursor: "pointer", fontSize: "18px", transition: "all .2s", display: "flex", alignItems: "center" }}>
                🛒
                {cartCount > 0 && (
                  <span style={{ position: "absolute", top: "-6px", right: "-6px", background: "#E8242A", color: "#fff", fontSize: "9px", fontWeight: 800, width: "18px", height: "18px", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    {cartCount > 9 ? "9+" : cartCount}
                  </span>
                )}
              </Link>
            )}

            <div className="hidden md:flex" style={{ gap: "10px", alignItems: "center" }}>
              {isAuthenticated() ? (
                <>
                  <span style={{ fontSize: "13px", color: "#888" }}>
                    {user?.first_name}
                    {isAdmin() && <span style={{ marginLeft: "6px", fontSize: "10px", background: "rgba(26,92,255,.2)", color: "#6B9FFF", padding: "2px 8px", borderRadius: "4px", fontWeight: 700 }}>Admin</span>}
                  </span>
                  <button
                    onClick={handleLogout}
                    style={{ background: "transparent", color: "#e8242a", padding: "10px 18px", fontSize: "13px", border: "1.5px solid #e8242a", borderRadius: "5px", cursor: "pointer", fontWeight: 700, transition: "all .2s" }}
                  >
                    Sign out
                  </button>
                </>
              ) : (
                <>
                  <Link href="/login" style={{ background: "transparent", color: "#2d8cff", padding: "10px 18px", fontSize: "13px", border: "1.5px solid #2d8cff", borderRadius: "5px", fontWeight: 700, textDecoration: "none", transition: "all .2s" }}>
                    Log In
                  </Link>
                  <Link href="/wholesale/register" style={{ background: "#E8242A", color: "#fff", padding: "10px 22px", fontSize: "13px", borderRadius: "5px", fontWeight: 700, textDecoration: "none", transition: "all .2s", border: "none" }}>
                    Apply Now
                  </Link>
                </>
              )}
            </div>

            {/* Mobile hamburger */}
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="md:hidden"
              style={{ padding: "6px", color: "#888", background: "transparent", border: "1.5px solid #2a2a2a", borderRadius: "5px", cursor: "pointer" }}
              aria-label="Toggle menu"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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
          <div style={{ background: "#111016", borderTop: "1px solid rgba(255,255,255,.06)", padding: "12px 20px" }} className="md:hidden">
            {isAdmin() ? (
              <Link href="/admin/dashboard" onClick={() => setMenuOpen(false)} style={{ display: "block", padding: "10px 0", color: "#888", fontSize: "13px", fontWeight: 600, textDecoration: "none", textTransform: "uppercase", letterSpacing: ".04em" }}>
                Admin Panel
              </Link>
            ) : (
              <>
                <Link href="/products" onClick={() => setMenuOpen(false)} style={{ display: "block", padding: "10px 0", color: "#888", fontSize: "13px", fontWeight: 600, textDecoration: "none", textTransform: "uppercase", letterSpacing: ".04em", borderBottom: "1px solid rgba(255,255,255,.06)" }}>
                  Shop All
                </Link>
                {isAuthenticated() && (
                  <>
                    <Link href="/quick-order" onClick={() => setMenuOpen(false)} style={{ display: "block", padding: "10px 0", color: "#888", fontSize: "13px", fontWeight: 600, textDecoration: "none", textTransform: "uppercase", letterSpacing: ".04em", borderBottom: "1px solid rgba(255,255,255,.06)" }}>
                      Quick Order
                    </Link>
                    <Link href="/account" onClick={() => setMenuOpen(false)} style={{ display: "block", padding: "10px 0", color: "#888", fontSize: "13px", fontWeight: 600, textDecoration: "none", textTransform: "uppercase", letterSpacing: ".04em", borderBottom: "1px solid rgba(255,255,255,.06)" }}>
                      My Account
                    </Link>
                    <Link href="/cart" onClick={() => setMenuOpen(false)} style={{ display: "block", padding: "10px 0", color: "#888", fontSize: "13px", fontWeight: 600, textDecoration: "none", textTransform: "uppercase", letterSpacing: ".04em", borderBottom: "1px solid rgba(255,255,255,.06)" }}>
                      Cart {cartCount > 0 && `(${cartCount})`}
                    </Link>
                  </>
                )}
                {!isAuthenticated() && (
                  <>
                    <Link href="/wholesale/register" onClick={() => setMenuOpen(false)} style={{ display: "block", padding: "10px 0", color: "#2d8cff", fontSize: "13px", fontWeight: 600, textDecoration: "none", textTransform: "uppercase", letterSpacing: ".04em", borderBottom: "1px solid rgba(255,255,255,.06)" }}>
                      Apply for Wholesale
                    </Link>
                    <Link href="/login" onClick={() => setMenuOpen(false)} style={{ display: "block", padding: "10px 0", color: "#2d8cff", fontSize: "13px", fontWeight: 700, textDecoration: "none", textTransform: "uppercase", letterSpacing: ".04em" }}>
                      Log In
                    </Link>
                  </>
                )}
              </>
            )}
            {isAuthenticated() && (
              <button onClick={handleLogout} style={{ display: "block", width: "100%", textAlign: "left", padding: "10px 0", color: "#888", fontSize: "13px", fontWeight: 600, background: "transparent", border: "none", cursor: "pointer", textTransform: "uppercase", letterSpacing: ".04em", borderTop: "1px solid rgba(255,255,255,.06)" }}>
                Sign out
              </button>
            )}
          </div>
        )}
      </header>
    </>
  );
}
