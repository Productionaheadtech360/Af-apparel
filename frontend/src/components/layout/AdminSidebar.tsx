"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";

const SECTION_HEAD: React.CSSProperties = {
  fontSize: "10px", fontWeight: 700, textTransform: "uppercase",
  letterSpacing: ".12em", color: "#bbb", padding: "14px 12px 5px",
};

const NAV_LINK_BASE: React.CSSProperties = {
  display: "flex", alignItems: "center", gap: "10px",
  padding: "9px 12px", borderRadius: "7px", textDecoration: "none",
  fontSize: "13px", fontWeight: 600, transition: "all .15s", cursor: "pointer",
};

const SUB_LINK_BASE: React.CSSProperties = {
  display: "block", padding: "7px 12px", borderRadius: "6px",
  textDecoration: "none", fontSize: "13px", fontWeight: 500,
  marginBottom: "1px", transition: "all .15s",
  borderLeft: "2px solid #E2E0DA",
};

export function AdminSidebar() {
  const pathname = usePathname();
  const isOrdersActive = pathname.startsWith("/admin/orders") || pathname === "/admin/abandoned-carts";
  const isProductsActive = pathname.startsWith("/admin/products") || pathname.startsWith("/admin/inventory");
  const isCustomersActive = pathname.startsWith("/admin/customers");
  const [ordersOpen, setOrdersOpen] = useState(isOrdersActive);
  const [productsOpen, setProductsOpen] = useState(isProductsActive);
  const [customersOpen, setCustomersOpen] = useState(isCustomersActive);

  useEffect(() => { if (isOrdersActive) setOrdersOpen(true); }, [isOrdersActive]);
  useEffect(() => { if (isProductsActive) setProductsOpen(true); }, [isProductsActive]);
  useEffect(() => { if (isCustomersActive) setCustomersOpen(true); }, [isCustomersActive]);

  function NavLink({ href, label, icon }: { href: string; label: string; icon: string }) {
    const active = pathname === href || (href !== "/admin" && pathname.startsWith(href + "/"));
    return (
      <Link href={href} style={{
        ...NAV_LINK_BASE,
        background: active ? "rgba(26,92,255,.08)" : "transparent",
        color: active ? "#1A5CFF" : "#555",
      }}
        onMouseEnter={e => { if (!active) (e.currentTarget as HTMLElement).style.background = "#F4F3EF"; }}
        onMouseLeave={e => { if (!active) (e.currentTarget as HTMLElement).style.background = "transparent"; }}
      >
        <span style={{ fontSize: "15px", flexShrink: 0 }}>{icon}</span>
        <span>{label}</span>
      </Link>
    );
  }

  function SubLink({ href, label }: { href: string; label: string }) {
    const active = pathname === href;
    return (
      <Link href={href} style={{
        ...SUB_LINK_BASE,
        background: active ? "rgba(26,92,255,.06)" : "transparent",
        color: active ? "#1A5CFF" : "#7A7880",
        borderLeftColor: active ? "#1A5CFF" : "#E2E0DA",
        fontWeight: active ? 700 : 500,
      }}
        onMouseEnter={e => { if (!active) (e.currentTarget as HTMLElement).style.background = "#F4F3EF"; }}
        onMouseLeave={e => { if (!active) (e.currentTarget as HTMLElement).style.background = "transparent"; }}
      >
        {label}
      </Link>
    );
  }

  return (
    <aside style={{ width: "220px", flexShrink: 0, borderRight: "1px solid #E2E0DA", background: "#fff", minHeight: "calc(100vh - 68px)", padding: "8px 10px 32px" }}>

      {/* ── OVERVIEW ── */}
      <div style={SECTION_HEAD}>Overview</div>
      <NavLink href="/admin/dashboard" label="Dashboard" icon="📊" />

      {/* ── ORDERS ── */}
      <div style={SECTION_HEAD}>Orders</div>

      {/* Orders dropdown trigger */}
      <div
        onClick={() => setOrdersOpen(!ordersOpen)}
        style={{
          ...NAV_LINK_BASE,
          justifyContent: "space-between",
          background: isOrdersActive ? "rgba(26,92,255,.08)" : "transparent",
          color: isOrdersActive ? "#1A5CFF" : "#555",
          userSelect: "none",
        }}
        onMouseEnter={e => { if (!isOrdersActive) (e.currentTarget as HTMLElement).style.background = "#F4F3EF"; }}
        onMouseLeave={e => { if (!isOrdersActive) (e.currentTarget as HTMLElement).style.background = isOrdersActive ? "rgba(26,92,255,.08)" : "transparent"; }}
      >
        <span style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <span style={{ fontSize: "15px" }}>📦</span>
          <span>Orders</span>
        </span>
        <span style={{ fontSize: "10px", color: "#aaa", transition: "transform .2s", transform: ordersOpen ? "rotate(180deg)" : "rotate(0deg)", display: "inline-block" }}>▼</span>
      </div>

      {ordersOpen && (
        <div style={{ paddingLeft: "18px", marginTop: "3px", marginBottom: "3px" }}>
          <SubLink href="/admin/orders" label="All Orders" />
          <SubLink href="/admin/orders/drafts" label="Drafts" />
          <SubLink href="/admin/orders/shipping-labels" label="Shipping Labels" />
          <SubLink href="/admin/abandoned-carts" label="Abandoned Checkouts" />
        </div>
      )}

      <NavLink href="/admin/returns" label="Returns (RMA)" icon="↩️" />

      {/* ── CUSTOMERS ── */}
      <div style={SECTION_HEAD}>Customers</div>

      {/* Customers dropdown */}
      <div
        onClick={() => setCustomersOpen(!customersOpen)}
        style={{
          ...NAV_LINK_BASE,
          justifyContent: "space-between",
          background: isCustomersActive ? "rgba(26,92,255,.08)" : "transparent",
          color: isCustomersActive ? "#1A5CFF" : "#555",
          userSelect: "none",
        }}
        onMouseEnter={e => { if (!isCustomersActive) (e.currentTarget as HTMLElement).style.background = "#F4F3EF"; }}
        onMouseLeave={e => { if (!isCustomersActive) (e.currentTarget as HTMLElement).style.background = isCustomersActive ? "rgba(26,92,255,.08)" : "transparent"; }}
      >
        <span style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <span style={{ fontSize: "15px" }}>🏢</span>
          <span>Customers</span>
        </span>
        <span style={{ fontSize: "10px", color: "#aaa", transition: "transform .2s", transform: customersOpen ? "rotate(180deg)" : "rotate(0deg)", display: "inline-block" }}>▼</span>
      </div>

      {customersOpen && (
        <div style={{ paddingLeft: "18px", marginTop: "3px", marginBottom: "3px" }}>
          <SubLink href="/admin/customers" label="All Customers" />
          <SubLink href="/admin/customers/applications" label="Applications" />
          <SubLink href="/admin/customers/tiers" label="Pricing Tiers" />
        </div>
      )}

      {/* ── CATALOG ── */}
      <div style={SECTION_HEAD}>Catalog</div>

      {/* Products dropdown */}
      <div
        onClick={() => setProductsOpen(!productsOpen)}
        style={{
          ...NAV_LINK_BASE,
          justifyContent: "space-between",
          background: isProductsActive ? "rgba(26,92,255,.08)" : "transparent",
          color: isProductsActive ? "#1A5CFF" : "#555",
          userSelect: "none",
        }}
        onMouseEnter={e => { if (!isProductsActive) (e.currentTarget as HTMLElement).style.background = "#F4F3EF"; }}
        onMouseLeave={e => { if (!isProductsActive) (e.currentTarget as HTMLElement).style.background = isProductsActive ? "rgba(26,92,255,.08)" : "transparent"; }}
      >
        <span style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <span style={{ fontSize: "15px" }}>👕</span>
          <span>Products</span>
        </span>
        <span style={{ fontSize: "10px", color: "#aaa", transition: "transform .2s", transform: productsOpen ? "rotate(180deg)" : "rotate(0deg)", display: "inline-block" }}>▼</span>
      </div>

      {productsOpen && (
        <div style={{ paddingLeft: "18px", marginTop: "3px", marginBottom: "3px" }}>
          <SubLink href="/admin/products" label="All Products" />
          <SubLink href="/admin/products/collections" label="Collections" />
          <SubLink href="/admin/inventory" label="Inventory" />
          <SubLink href="/admin/products/purchase-orders" label="Purchase Orders" />
        </div>
      )}

      {/* ── SETTINGS ── */}
      <div style={SECTION_HEAD}>Settings</div>
      <NavLink href="/admin/settings" label="Settings" icon="⚙️" />
      <NavLink href="/admin/settings/quickbooks" label="QuickBooks" icon="📒" />
      <NavLink href="/admin/settings/audit-log" label="Audit Log" icon="🔍" />
    </aside>
  );
}
