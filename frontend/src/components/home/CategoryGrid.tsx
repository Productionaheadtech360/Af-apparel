import Link from "next/link";

const categoryIcons: Record<string, string> = {
  "t-shirts": "👕",
  "hoodies": "🧥",
  "sweatshirts": "🧶",
  "polo-shirts": "👔",
  "dress-shirts": "👔",
  "jackets": "🧥",
};

const categoryDescriptions: Record<string, string> = {
  "t-shirts": "Ring-spun & CVC blends. DTF and screen print optimized.",
  "hoodies": "80/20 cotton-poly fleece. Pullover and zip-up styles.",
  "sweatshirts": "Classic crewneck fleece. Heavy-weight, print-friendly.",
  "polo-shirts": "CVC performance fabric. Corporate and retail ready.",
  "dress-shirts": "Easy-care blends. Slim-fit for uniform programs.",
  "jackets": "Denim and outerwear. Great for promotional programs.",
};

const fallbackCategories = [
  { slug: "t-shirts", name: "T-Shirts" },
  { slug: "hoodies", name: "Hoodies" },
  { slug: "sweatshirts", name: "Sweatshirts" },
  { slug: "polo-shirts", name: "Polos" },
  { slug: "dress-shirts", name: "Dress Shirts" },
  { slug: "jackets", name: "Jackets" },
];

interface Category {
  id: string;
  name: string;
  slug: string;
  image_url?: string | null;
}

interface CategoryGridProps {
  categories: Category[];
}

export default function CategoryGrid({ categories }: CategoryGridProps) {
  const items = categories.length > 0 ? categories : fallbackCategories.map(c => ({ ...c, id: c.slug }));

  return (
    <section style={{ padding: "80px 0", background: "#F4F3EF" }}>
      <div style={{ maxWidth: "1280px", margin: "0 auto", padding: "0 32px" }}>
        <div style={{ marginBottom: "44px" }}>
          <h2 style={{ fontFamily: "var(--font-bebas)", fontSize: "clamp(32px,3.5vw,48px)", color: "#2A2830", letterSpacing: ".01em", lineHeight: 1, marginBottom: "10px" }}>Shop by Category</h2>
          <p style={{ fontSize: "14px", color: "#7A7880" }}>Browse our full range of print-ready blank apparel</p>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: "16px" }} className="cat-grid-responsive">
          {items.map((cat) => (
            <Link key={cat.id} href={`/products?category=${cat.slug}`}
              style={{ background: "#fff", border: "1px solid #E2E0DA", borderRadius: "10px", overflow: "hidden", cursor: "pointer", transition: "all .25s", textDecoration: "none", display: "block" }}
              className="cat-card-hover">
              <div style={{ height: "180px", display: "flex", alignItems: "center", justifyContent: "center", background: "linear-gradient(135deg,#f0ede8 0%,#e8e4df 100%)", position: "relative" }}>
                {/* ✅ image_url hai to image dikhao, warna emoji */}
                {(cat as any).image_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={(cat as any).image_url}
                    alt={cat.name}
                    style={{ width: "100%", height: "100%", objectFit: "cover", position: "absolute", inset: 0 }}
                  />
                ) : (
                  <span style={{ fontSize: "52px", opacity: .35 }}>{categoryIcons[cat.slug] ?? "👕"}</span>
                )}
              </div>
              <div style={{ padding: "20px 22px" }}>
                <h4 style={{ fontFamily: "var(--font-bebas)", fontSize: "18px", letterSpacing: ".03em", marginBottom: "5px", color: "#2A2830" }}>{cat.name}</h4>
                <p style={{ fontSize: "13px", color: "#7A7880", marginBottom: "12px", lineHeight: 1.5 }}>{categoryDescriptions[cat.slug] ?? "Premium print-ready blanks."}</p>
                <div style={{ fontSize: "13px", fontWeight: 700, color: "#1A5CFF", display: "flex", alignItems: "center", gap: "6px" }}>Shop {cat.name} →</div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
