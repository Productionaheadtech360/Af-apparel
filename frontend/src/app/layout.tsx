import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "@/components/providers/Providers";

export const metadata: Metadata = {
  title: "AF Apparels B2B Wholesale",
  description: "Wholesale apparel ordering platform",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="antialiased text-gray-900 bg-gray-50 font-sans">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
