"use client";

import { useEffect, useState } from "react";
import { apiClient } from "@/lib/api-client";

interface Collection {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  product_count?: number;
  is_active: boolean;
}

const thStyle: React.CSSProperties = {
  padding: "12px 16px", textAlign: "left", fontSize: "11px",
  textTransform: "uppercase", letterSpacing: ".06em", color: "#7A7880", fontWeight: 700,
};

export default function CollectionsPage() {
  const [collections, setCollections] = useState<Collection[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  async function load() {
    setIsLoading(true);
    try {
      const res = await apiClient.get<Collection[]>("/api/v1/categories");
      setCollections(res ?? []);
    } catch {
      setCollections([]);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  return (
    <div style={{ fontFamily: "var(--font-jakarta)" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
        <div>
          <h1 style={{ fontFamily: "var(--font-bebas)", fontSize: "32px", color: "#2A2830", letterSpacing: ".02em", lineHeight: 1 }}>COLLECTIONS</h1>
          <p style={{ fontSize: "13px", color: "#7A7880", marginTop: "4px" }}>Organize products into collections · {collections.length} categories</p>
        </div>
        <button
          style={{ background: "#1A5CFF", color: "#fff", border: "none", padding: "10px 20px", borderRadius: "8px", fontWeight: 700, cursor: "pointer", fontSize: "14px" }}
          onClick={() => alert("Create collection — coming soon")}
        >
          + Create Collection
        </button>
      </div>

      {/* Table */}
      <div style={{ background: "#fff", border: "1px solid #E2E0DA", borderRadius: "10px", overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: "#F4F3EF", borderBottom: "2px solid #E2E0DA" }}>
              {["Collection", "Slug", "Status", "Actions"].map(h => (
                <th key={h} style={thStyle}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={4} style={{ padding: "48px", textAlign: "center", color: "#aaa", fontSize: "14px" }}>Loading…</td></tr>
            ) : collections.length === 0 ? (
              <tr>
                <td colSpan={4} style={{ padding: "60px", textAlign: "center" }}>
                  <div style={{ fontSize: "32px", marginBottom: "10px" }}>🗂️</div>
                  <div style={{ fontSize: "14px", color: "#aaa", fontWeight: 600 }}>No collections yet</div>
                  <div style={{ fontSize: "12px", color: "#bbb", marginTop: "4px" }}>Collections let you group products for easier browsing</div>
                </td>
              </tr>
            ) : collections.map(cat => (
              <tr
                key={cat.id}
                style={{ borderBottom: "1px solid #F4F3EF" }}
                onMouseEnter={e => (e.currentTarget.style.background = "#FAFAFA")}
                onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
              >
                <td style={{ padding: "14px 16px" }}>
                  <div style={{ fontWeight: 700, fontSize: "14px", color: "#2A2830" }}>{cat.name}</div>
                  {cat.description && (
                    <div style={{ fontSize: "12px", color: "#aaa", marginTop: "2px" }}>{cat.description}</div>
                  )}
                </td>
                <td style={{ padding: "14px 16px" }}>
                  <span style={{ fontSize: "12px", color: "#7A7880", fontFamily: "monospace", background: "#F4F3EF", padding: "2px 8px", borderRadius: "4px" }}>
                    {cat.slug}
                  </span>
                </td>
                <td style={{ padding: "14px 16px" }}>
                  <span style={{
                    padding: "3px 10px", borderRadius: "20px", fontSize: "11px", fontWeight: 700,
                    background: cat.is_active ? "rgba(5,150,105,.1)" : "rgba(156,163,175,.15)",
                    color: cat.is_active ? "#059669" : "#9CA3AF",
                  }}>
                    {cat.is_active ? "● Active" : "○ Inactive"}
                  </span>
                </td>
                <td style={{ padding: "14px 16px" }}>
                  <div style={{ display: "flex", gap: "8px" }}>
                    <button
                      style={{ padding: "6px 14px", border: "1px solid #E2E0DA", borderRadius: "6px", background: "#fff", fontSize: "12px", fontWeight: 600, cursor: "pointer", color: "#2A2830" }}
                      onClick={() => alert(`Edit "${cat.name}" — coming soon`)}
                    >
                      Edit
                    </button>
                    <button
                      style={{ padding: "6px 14px", border: "1px solid #FECACA", borderRadius: "6px", background: "#fff", fontSize: "12px", fontWeight: 600, cursor: "pointer", color: "#E8242A" }}
                      onClick={() => alert(`Delete "${cat.name}" — coming soon`)}
                    >
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
