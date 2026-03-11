import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "AF Apparels B2B Wholesale",
  description: "Wholesale apparel ordering platform",
};

// T210: Sentry frontend initialization
// Import via instrumentation hook (Next.js 15 pattern)
// Sentry init is done in instrumentation.ts (server) and instrumentation.client.ts (client)

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="antialiased text-gray-900 bg-gray-50">{children}</body>
    </html>
  );
}
