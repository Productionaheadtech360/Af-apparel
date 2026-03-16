import Link from "next/link";
import { Header } from "@/components/layout/Header";
import { productsService } from "@/services/products.service";

export default async function HomePage() {
  // Fetch categories for the category grid (SSR — uses internal Docker hostname)
  let categories: { id: string; name: string; slug: string }[] = [];
  try {
    categories = await productsService.getCategories();
  } catch {
    // Backend unreachable from SSR — show empty grid gracefully
  }

  return (
    <>
      <Header />
      <main>
        {/* ── Hero ─────────────────────────────────────────────────────── */}
        <section className="bg-gradient-to-br from-blue-600 to-blue-800 text-white py-24">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 text-center">
            <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight leading-tight">
              AF Apparels
              <span className="block text-blue-200 text-2xl sm:text-3xl mt-2 font-normal">
                B2B Wholesale Platform
              </span>
            </h1>
            <p className="mt-6 text-lg text-blue-100 max-w-2xl mx-auto">
              Premium wholesale apparel for retailers and distributors. Tiered pricing,
              bulk ordering, and real-time inventory — all in one place.
            </p>
            <div className="mt-10 flex flex-wrap justify-center gap-4">
              <Link
                href="/products"
                className="px-8 py-3 bg-white text-blue-700 rounded-lg font-semibold hover:bg-blue-50 transition-colors shadow-sm"
              >
                Browse Products
              </Link>
              <Link
                href="/wholesale/register"
                className="px-8 py-3 bg-blue-500 text-white rounded-lg font-semibold hover:bg-blue-400 border border-blue-400 transition-colors"
              >
                Apply for Wholesale Account
              </Link>
            </div>
          </div>
        </section>

        {/* ── Stats bar ─────────────────────────────────────────────────── */}
        <section className="bg-blue-700 text-white py-6">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 grid grid-cols-2 sm:grid-cols-4 gap-6 text-center">
            {[
              { value: "23+", label: "Products" },
              { value: "284+", label: "Variants" },
              { value: "3", label: "Pricing Tiers" },
              { value: "3", label: "Warehouses" },
            ].map((stat) => (
              <div key={stat.label}>
                <p className="text-2xl font-bold">{stat.value}</p>
                <p className="text-sm text-blue-200 mt-0.5">{stat.label}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── Categories ───────────────────────────────────────────────── */}
        {categories.length > 0 && (
          <section className="py-16 bg-white">
            <div className="max-w-7xl mx-auto px-4 sm:px-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-8">Shop by Category</h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
                {categories.map((cat, i) => {
                  const colors = [
                    "bg-blue-50 hover:bg-blue-100 text-blue-800",
                    "bg-indigo-50 hover:bg-indigo-100 text-indigo-800",
                    "bg-violet-50 hover:bg-violet-100 text-violet-800",
                    "bg-sky-50 hover:bg-sky-100 text-sky-800",
                    "bg-slate-50 hover:bg-slate-100 text-slate-800",
                  ];
                  const color = colors[i % colors.length];
                  return (
                    <Link
                      key={cat.id}
                      href={`/products?category=${cat.slug}`}
                      className={`rounded-xl p-5 text-center font-semibold text-sm transition-colors ${color}`}
                    >
                      {cat.name}
                    </Link>
                  );
                })}
              </div>
            </div>
          </section>
        )}

        {/* ── Features ─────────────────────────────────────────────────── */}
        <section className="py-16 bg-gray-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6">
            <h2 className="text-2xl font-bold text-gray-900 text-center mb-12">
              Built for Wholesale Buyers
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {[
                {
                  icon: "💰",
                  title: "Tiered Pricing",
                  description:
                    "Bronze (15%), Silver (25%), and Gold (35%) discount tiers. The more you buy, the more you save.",
                },
                {
                  icon: "📦",
                  title: "Bulk Ordering",
                  description:
                    "Order across all colors and sizes in one go with our variant matrix. No more tedious line-by-line ordering.",
                },
                {
                  icon: "📊",
                  title: "Account Management",
                  description:
                    "Track orders, manage multiple buyers, download price lists, and view real-time inventory levels.",
                },
              ].map((feature) => (
                <div key={feature.title} className="card text-center">
                  <div className="text-4xl mb-4">{feature.icon}</div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">{feature.title}</h3>
                  <p className="text-sm text-gray-600 leading-relaxed">{feature.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── CTA ──────────────────────────────────────────────────────── */}
        <section className="py-16 bg-blue-600">
          <div className="max-w-2xl mx-auto px-4 sm:px-6 text-center text-white">
            <h2 className="text-2xl font-bold">Ready to get started?</h2>
            <p className="mt-3 text-blue-100">
              Apply for a wholesale account today and start ordering at wholesale prices.
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-4">
              <Link
                href="/wholesale/register"
                className="px-8 py-3 bg-white text-blue-700 rounded-lg font-semibold hover:bg-blue-50 transition-colors"
              >
                Apply Now
              </Link>
              <Link
                href="/login"
                className="px-8 py-3 border border-white text-white rounded-lg font-semibold hover:bg-blue-500 transition-colors"
              >
                Sign In
              </Link>
            </div>
          </div>
        </section>

        {/* ── Footer ───────────────────────────────────────────────────── */}
        <footer className="bg-gray-900 text-gray-400 py-8">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row justify-between items-center gap-4 text-sm">
            <span className="text-white font-semibold">AF Apparels</span>
            <span>© {new Date().getFullYear()} AF Apparels. B2B Wholesale Platform.</span>
          </div>
        </footer>
      </main>
    </>
  );
}
