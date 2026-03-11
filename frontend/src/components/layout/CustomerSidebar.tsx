"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_ITEMS = [
  { href: "/account", label: "Overview" },
  { href: "/account/orders", label: "Orders" },
  { href: "/account/profile", label: "Profile" },
  { href: "/account/addresses", label: "Addresses" },
  { href: "/account/contacts", label: "Contacts" },
  { href: "/account/users", label: "Team" },
  { href: "/account/payment-methods", label: "Payment Methods" },
  { href: "/account/messages", label: "Messages" },
  { href: "/account/statements", label: "Statements" },
  { href: "/account/templates", label: "Order Templates" },
  { href: "/account/inventory", label: "Inventory" },
  { href: "/account/price-list", label: "Price List" },
  { href: "/account/rma", label: "Returns (RMA)" },
];

export function CustomerSidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-52 shrink-0">
      <nav className="space-y-0.5">
        {NAV_ITEMS.map((item) => {
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                active
                  ? "bg-blue-50 text-blue-700"
                  : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
              }`}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
