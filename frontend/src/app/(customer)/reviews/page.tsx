"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface Review {
  id: string;
  product_id: string;
  rating: number;
  title: string | null;
  body: string;
  reviewer_name: string;
  reviewer_company: string | null;
  is_verified: boolean;
  created_at: string;
  product_name?: string;
  product_slug?: string;
}

function StarRow({ rating }: { rating: number }) {
  return (
    <div style={{ display: "flex", gap: "2px" }}>
      {[1, 2, 3, 4, 5].map(s => (
        <svg key={s} width="13" height="13" viewBox="0 0 24 24" fill={s <= rating ? "#C9A84C" : "#E2E0DA"}>
          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
        </svg>
      ))}
    </div>
  );
}

export default function ReviewsPage() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Fetch recent reviews from all products via the admin/public API
    // We'll hit the products endpoint to get all products and then fetch their reviews
    // For now, use a simple approach: store a global reviews list endpoint
    fetch("/api/v1/reviews/recent?page_size=50")
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data?.reviews) setReviews(data.reviews);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div style={{ minHeight: "100vh", background: "#F4F3EF", fontFamily: "var(--font-jakarta)" }}>
      {/* Hero */}
      <div style={{ background: "#080808", padding: "48px 32px 40px" }}>
        <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
          <div style={{ fontSize: "11px", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".12em", color: "#555", marginBottom: "6px" }}>Wholesale Community</div>
          <h1 style={{ fontFamily: "var(--font-bebas)", fontSize: "clamp(32px,5vw,56px)", color: "#fff", letterSpacing: ".02em", lineHeight: 1, marginBottom: "12px" }}>
            Customer Reviews
          </h1>
          <p style={{ fontSize: "15px", color: "#d3d0d0", fontWeight: 500, maxWidth: "520px" }}>
            Real feedback from our wholesale customers. Find a product you love and share your experience.
          </p>
        </div>
      </div>

      <div style={{ maxWidth: "1200px", margin: "0 auto", padding: "40px 32px" }}>
        {loading ? (
          <div style={{ textAlign: "center", padding: "60px", color: "#aaa" }}>Loading reviews…</div>
        ) : reviews.length === 0 ? (
          <div style={{ textAlign: "center", padding: "60px", background: "#fff", borderRadius: "12px", border: "1px solid #E2E0DA" }}>
            <div style={{ fontSize: "48px", marginBottom: "12px" }}>★</div>
            <div style={{ fontSize: "18px", fontWeight: 700, color: "#2A2830", marginBottom: "8px" }}>No reviews yet</div>
            <p style={{ color: "#7A7880", marginBottom: "24px" }}>Be the first to review a product you&apos;ve ordered.</p>
            <Link href="/products" style={{ background: "#1A5CFF", color: "#fff", padding: "12px 24px", borderRadius: "8px", fontWeight: 700, textDecoration: "none", fontSize: "14px" }}>
              Browse Products
            </Link>
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))", gap: "16px" }}>
            {reviews.map(r => (
              <div key={r.id} style={{ background: "#fff", border: "1px solid #E2E0DA", borderRadius: "12px", padding: "20px 22px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "10px" }}>
                  <div>
                    <StarRow rating={r.rating} />
                    {r.title && <div style={{ fontWeight: 700, fontSize: "14px", color: "#2A2830", marginTop: "4px" }}>{r.title}</div>}
                  </div>
                  <div style={{ fontSize: "11px", color: "#aaa" }}>{new Date(r.created_at).toLocaleDateString()}</div>
                </div>
                <p style={{ fontSize: "14px", color: "#2A2830", lineHeight: 1.65, marginBottom: "12px" }}>{r.body}</p>
                {r.product_slug && (
                  <Link href={`/products/${r.product_slug}`} style={{ fontSize: "12px", color: "#1A5CFF", fontWeight: 600, textDecoration: "none" }}>
                    → {r.product_name ?? "View Product"}
                  </Link>
                )}
                <div style={{ fontSize: "12px", color: "#7A7880", marginTop: "8px", display: "flex", alignItems: "center", gap: "6px" }}>
                  — {r.reviewer_name}{r.reviewer_company ? `, ${r.reviewer_company}` : ""}
                  {r.is_verified && <span style={{ background: "rgba(5,150,105,.1)", color: "#059669", fontSize: "10px", fontWeight: 700, padding: "1px 5px", borderRadius: "3px" }}>Verified</span>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
