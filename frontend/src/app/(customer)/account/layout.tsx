import Link from "next/link";

const NAV_ITEMS = [
  { href: "/account", label: "Overview" },
  { href: "/account/orders", label: "Orders" },
  { href: "/account/profile", label: "Profile" },
  { href: "/account/addresses", label: "Addresses" },
  { href: "/account/contacts", label: "Contacts" },
  { href: "/account/users", label: "Users" },
  { href: "/account/payment-methods", label: "Payment Methods" },
  { href: "/account/statements", label: "Statements" },
  { href: "/account/messages", label: "Messages" },
  { href: "/account/inventory", label: "Inventory Report" },
  { href: "/account/price-list", label: "Price List" },
];

export default function AccountLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="max-w-6xl mx-auto px-4 py-8 flex gap-6">
      {/* Sidebar */}
      <nav className="w-52 flex-shrink-0">
        <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">My Account</h2>
        <ul className="space-y-1">
          {NAV_ITEMS.map((item) => (
            <li key={item.href}>
              <Link
                href={item.href}
                className="block px-3 py-2 rounded-md text-sm text-gray-700 hover:bg-gray-100 hover:text-gray-900"
              >
                {item.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      {/* Main content */}
      <main className="flex-1 min-w-0">
        {children}
      </main>
    </div>
  );
}
