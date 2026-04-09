"use client";

import { useRef, useState } from "react";
import { adminService } from "@/services/admin.service";
import { ApiClientError } from "@/lib/api-client";

// ── CSV template ──────────────────────────────────────────────────────────────
const SAMPLE_CSV = `name,category,description,base_price,moq,vendor,product_type,colors,sizes,status
Classic Tee,T-Shirts,Premium cotton blank tee,8.99,6,Gildan,Blank,White;Black;Red;Navy,XS;S;M;L;XL;2XL,active
Sport Polo,Polo Shirts,Performance polo shirt,24.99,12,Port Authority,Polo,White;Black;Navy;Royal,S;M;L;XL;2XL,active
Heavy Hoodie,Hoodies,Midweight pullover hoodie,28.00,6,Gildan,Hoodie,White;Black;Charcoal;Navy,S;M;L;XL;2XL,draft`;

// ── CSV parser (handles quoted fields with commas) ────────────────────────────
function parseCsv(text: string): Record<string, string>[] {
  const lines = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n").trim().split("\n");
  if (lines.length < 2) return [];

  const headers = parseRow(lines[0]!);
  const rows: Record<string, string>[] = [];

  for (let i = 1; i < lines.length; i++) {
    const line = (lines[i] ?? "").trim();
    if (!line) continue;
    const values = parseRow(line);
    const row: Record<string, string> = {};
    headers.forEach((h, idx) => {
      row[h.trim()] = (values[idx] ?? "").trim();
    });
    rows.push(row);
  }
  return rows;
}

function parseRow(line: string): string[] {
  const result: string[] = [];
  let inQuotes = false;
  let current = "";
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') { current += '"'; i++; }
      else { inQuotes = !inQuotes; }
    } else if (ch === "," && !inQuotes) {
      result.push(current);
      current = "";
    } else {
      current += ch;
    }
  }
  result.push(current);
  return result;
}

// ── Types ─────────────────────────────────────────────────────────────────────
interface PreviewRow {
  name: string;
  category: string;
  description: string;
  base_price: number;
  moq: number;
  vendor: string;
  product_type: string;
  colors: string[];
  sizes: string[];
  status: string;
  _raw: Record<string, string>;
}

interface ImportResult {
  success: number;
  failed: number;
  created: string[];
  errors: string[];
}

type Step = "upload" | "preview" | "importing" | "done";

interface Props {
  onClose: () => void;
  onSuccess: () => void;
}

// ── Component ─────────────────────────────────────────────────────────────────
export function ImportProductsModal({ onClose, onSuccess }: Props) {
  const [step, setStep] = useState<Step>("upload");
  const [dragOver, setDragOver] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [rows, setRows] = useState<PreviewRow[]>([]);
  const [result, setResult] = useState<ImportResult>({ success: 0, failed: 0, created: [], errors: [] });
  const [importProgress, setImportProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── Template download ───────────────────────────────────────────────────────
  function downloadTemplate() {
    const blob = new Blob([SAMPLE_CSV], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "af-apparel-import-template.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  // ── File handling ───────────────────────────────────────────────────────────
  function handleFile(f: File) {
    setFile(f);
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const parsed = parseCsv(text);
      const preview: PreviewRow[] = parsed.map(row => ({
        name: row["name"] ?? "",
        category: row["category"] ?? "",
        description: row["description"] ?? "",
        base_price: parseFloat(row["base_price"] ?? "0") || 0,
        moq: parseInt(row["moq"] ?? "6", 10) || 6,
        vendor: row["vendor"] ?? "",
        product_type: row["product_type"] ?? "",
        colors: (row["colors"] ?? "").split(";").map(s => s.trim()).filter(Boolean),
        sizes: (row["sizes"] ?? "").split(";").map(s => s.trim()).filter(Boolean),
        status: row["status"] ?? "draft",
        _raw: row,
      })).filter(r => r.name);
      setRows(preview);
      setStep("preview");
    };
    reader.readAsText(f);
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files[0];
    if (f && f.name.endsWith(".csv")) handleFile(f);
  }

  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (f) handleFile(f);
  }

  // ── Import ──────────────────────────────────────────────────────────────────
  function generateSlug(name: string): string {
    const base = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    const suffix = Date.now().toString().slice(-5);
    return `${base}-${suffix}`;
  }

  async function runImport() {
    setStep("importing");
    setImportProgress(0);
    const res: ImportResult = { success: 0, failed: 0, created: [], errors: [] };

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i]!;
      setImportProgress(Math.round(((i + 0.5) / rows.length) * 100));
      try {
        // ProductCreate schema: name, slug, description, moq, status, product_type, vendor, tags, category_ids
        // base_price is NOT in ProductCreate — pricing lives on variants (retail_price)
        const product = await adminService.createProduct({
          name: row.name,
          slug: generateSlug(row.name),
          description: row.description || undefined,
          moq: row.moq,
          vendor: row.vendor || undefined,
          product_type: row.product_type || undefined,
          status: row.status || "draft",
          category_ids: [],
        });

        // Generate variants if colors + sizes provided
        // BulkGenerateRequest: colors, sizes, base_retail_price (required)
        if (product && (product as { id?: string }).id && row.colors.length > 0 && row.sizes.length > 0) {
          const productId = (product as { id: string }).id;
          await adminService.bulkGenerateVariants(productId, {
            colors: row.colors,
            sizes: row.sizes,
            base_retail_price: row.base_price,
          }).catch(() => {/* non-fatal */});
        }

        res.success++;
        res.created.push(row.name);
      } catch (err) {
        res.failed++;
        let msg = "Unknown error";
        if (err instanceof ApiClientError) {
          msg = `[${err.status}] ${err.message}`;
        } else if (err instanceof Error) {
          msg = err.message;
        }
        res.errors.push(`${row.name}: ${msg}`);
      }
      setImportProgress(Math.round(((i + 1) / rows.length) * 100));
    }

    setResult(res);
    setStep("done");
    if (res.success > 0) onSuccess();
  }

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.55)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: "16px" }}>
      <div style={{ background: "#fff", borderRadius: "14px", width: "100%", maxWidth: "860px", maxHeight: "90vh", overflow: "hidden", display: "flex", flexDirection: "column", boxShadow: "0 24px 72px rgba(0,0,0,.25)" }}>

        {/* Header */}
        <div style={{ padding: "20px 24px", borderBottom: "1px solid #E2E0DA", display: "flex", justifyContent: "space-between", alignItems: "center", flexShrink: 0 }}>
          <div>
            <h2 style={{ fontFamily: "var(--font-bebas)", fontSize: "26px", color: "#2A2830", letterSpacing: ".04em", lineHeight: 1 }}>
              📥 IMPORT PRODUCTS
            </h2>
            <p style={{ fontSize: "12px", color: "#7A7880", margin: "4px 0 0" }}>
              Upload a CSV to bulk-create products with variants
            </p>
          </div>
          {step !== "importing" && (
            <button onClick={onClose} style={{ background: "none", border: "none", fontSize: "22px", cursor: "pointer", color: "#aaa", lineHeight: 1 }}>✕</button>
          )}
        </div>

        {/* Step indicator */}
        <div style={{ padding: "14px 24px", borderBottom: "1px solid #F4F3EF", display: "flex", gap: "8px", alignItems: "center", flexShrink: 0 }}>
          {(["upload", "preview", "importing", "done"] as Step[]).map((s, idx) => {
            const labels: Record<Step, string> = { upload: "1. Upload", preview: "2. Preview", importing: "3. Importing", done: "4. Done" };
            const active = s === step;
            const past = ["upload", "preview", "importing", "done"].indexOf(s) < ["upload", "preview", "importing", "done"].indexOf(step);
            return (
              <div key={s} style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <span style={{ fontSize: "12px", fontWeight: 700, color: active ? "#1A5CFF" : past ? "#059669" : "#bbb", letterSpacing: ".04em" }}>
                  {past ? "✓ " : ""}{labels[s]}
                </span>
                {idx < 3 && <span style={{ color: "#ddd", fontSize: "14px" }}>›</span>}
              </div>
            );
          })}
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflow: "auto", padding: "24px" }}>

          {/* STEP 1: Upload */}
          {step === "upload" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
              {/* Template download */}
              <div style={{ background: "#F4F3EF", borderRadius: "10px", padding: "16px 20px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: "13px", color: "#2A2830", marginBottom: "4px" }}>Download CSV Template</div>
                  <div style={{ fontSize: "12px", color: "#7A7880" }}>Use our template to format your data correctly</div>
                </div>
                <button
                  onClick={downloadTemplate}
                  style={{ padding: "8px 16px", background: "#fff", border: "1.5px solid #1A5CFF", color: "#1A5CFF", borderRadius: "6px", fontSize: "12px", fontWeight: 700, cursor: "pointer" }}
                >
                  ↓ Template
                </button>
              </div>

              {/* Column guide */}
              <div style={{ border: "1px solid #E2E0DA", borderRadius: "10px", overflow: "hidden" }}>
                <div style={{ padding: "12px 16px", background: "#F4F3EF", borderBottom: "1px solid #E2E0DA" }}>
                  <span style={{ fontSize: "12px", fontWeight: 700, color: "#7A7880", textTransform: "uppercase", letterSpacing: ".06em" }}>Required Columns</span>
                </div>
                <div style={{ padding: "12px 16px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px 24px" }}>
                  {[
                    ["name", "Product name (required)"],
                    ["category", "Category name"],
                    ["base_price", "Price per unit (e.g. 8.99)"],
                    ["moq", "Min order quantity (default: 6)"],
                    ["colors", "Semicolon-separated (e.g. White;Black)"],
                    ["sizes", "Semicolon-separated (e.g. S;M;L;XL)"],
                    ["vendor", "Brand/manufacturer"],
                    ["status", "active, draft, or archived"],
                  ].map(([col, desc]) => (
                    <div key={col} style={{ display: "flex", gap: "8px", alignItems: "flex-start" }}>
                      <code style={{ background: "#EEF2FF", color: "#1A5CFF", padding: "2px 6px", borderRadius: "4px", fontSize: "11px", fontWeight: 700, flexShrink: 0 }}>{col}</code>
                      <span style={{ fontSize: "12px", color: "#7A7880" }}>{desc}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Drop zone */}
              <div
                onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={onDrop}
                onClick={() => fileInputRef.current?.click()}
                style={{
                  border: `2px dashed ${dragOver ? "#1A5CFF" : "#D1CEC8"}`,
                  borderRadius: "12px",
                  padding: "48px 24px",
                  textAlign: "center",
                  cursor: "pointer",
                  background: dragOver ? "rgba(26,92,255,.04)" : "#FAFAFA",
                  transition: "all .2s",
                }}
              >
                <div style={{ fontSize: "36px", marginBottom: "12px" }}>📂</div>
                <div style={{ fontWeight: 700, fontSize: "14px", color: "#2A2830", marginBottom: "6px" }}>
                  {dragOver ? "Drop it!" : "Drag & drop your CSV here"}
                </div>
                <div style={{ fontSize: "12px", color: "#7A7880", marginBottom: "16px" }}>or click to browse</div>
                <button
                  style={{ padding: "8px 20px", background: "#1A5CFF", color: "#fff", border: "none", borderRadius: "6px", fontSize: "13px", fontWeight: 700, cursor: "pointer" }}
                  onClick={e => { e.stopPropagation(); fileInputRef.current?.click(); }}
                >
                  Browse CSV
                </button>
                <input ref={fileInputRef} type="file" accept=".csv" style={{ display: "none" }} onChange={onFileChange} />
              </div>
            </div>
          )}

          {/* STEP 2: Preview */}
          {step === "preview" && (
            <div>
              <div style={{ marginBottom: "14px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <span style={{ fontWeight: 700, fontSize: "14px", color: "#2A2830" }}>{rows.length} products ready to import</span>
                  <span style={{ marginLeft: "8px", fontSize: "12px", color: "#7A7880" }}>from {file?.name}</span>
                </div>
                <button
                  onClick={() => { setFile(null); setRows([]); setStep("upload"); }}
                  style={{ padding: "6px 12px", border: "1px solid #E2E0DA", borderRadius: "6px", background: "#fff", fontSize: "12px", fontWeight: 600, cursor: "pointer", color: "#7A7880" }}
                >
                  ← Change File
                </button>
              </div>

              <div style={{ border: "1px solid #E2E0DA", borderRadius: "10px", overflow: "hidden" }}>
                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px" }}>
                    <thead>
                      <tr style={{ background: "#F4F3EF", borderBottom: "2px solid #E2E0DA" }}>
                        {["Name", "Category", "Price", "MOQ", "Colors", "Sizes", "Status"].map(h => (
                          <th key={h} style={{ padding: "10px 12px", textAlign: "left", fontWeight: 700, color: "#7A7880", textTransform: "uppercase", letterSpacing: ".05em", whiteSpace: "nowrap" }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((row, i) => (
                        <tr key={i} style={{ borderBottom: "1px solid #F4F3EF" }}>
                          <td style={{ padding: "10px 12px", fontWeight: 600, color: "#2A2830" }}>{row.name || <span style={{ color: "#E8242A" }}>Missing!</span>}</td>
                          <td style={{ padding: "10px 12px", color: "#7A7880" }}>{row.category || "—"}</td>
                          <td style={{ padding: "10px 12px", color: "#2A2830" }}>${row.base_price.toFixed(2)}</td>
                          <td style={{ padding: "10px 12px", color: "#2A2830" }}>{row.moq}</td>
                          <td style={{ padding: "10px 12px" }}>
                            <div style={{ display: "flex", gap: "3px", flexWrap: "wrap" }}>
                              {row.colors.length > 0
                                ? row.colors.slice(0, 4).map(c => (
                                  <span key={c} style={{ background: "#EEF2FF", color: "#1A5CFF", padding: "2px 6px", borderRadius: "3px", fontSize: "10px", fontWeight: 600 }}>{c}</span>
                                ))
                                : <span style={{ color: "#bbb" }}>—</span>}
                              {row.colors.length > 4 && <span style={{ color: "#7A7880", fontSize: "10px" }}>+{row.colors.length - 4}</span>}
                            </div>
                          </td>
                          <td style={{ padding: "10px 12px", color: "#7A7880" }}>
                            {row.sizes.length > 0 ? row.sizes.join(", ") : "—"}
                          </td>
                          <td style={{ padding: "10px 12px" }}>
                            <span style={{
                              padding: "3px 8px", borderRadius: "12px", fontSize: "10px", fontWeight: 700,
                              background: row.status === "active" ? "rgba(5,150,105,.1)" : "rgba(156,163,175,.15)",
                              color: row.status === "active" ? "#059669" : "#9CA3AF",
                            }}>
                              {row.status || "draft"}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: Importing */}
          {step === "importing" && (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "48px 24px", textAlign: "center" }}>
              <div style={{ width: "56px", height: "56px", border: "4px solid #EEF2FF", borderTop: "4px solid #1A5CFF", borderRadius: "50%", animation: "spin 1s linear infinite", marginBottom: "24px" }} />
              <div style={{ fontWeight: 700, fontSize: "16px", color: "#2A2830", marginBottom: "8px" }}>
                Importing products…
              </div>
              <div style={{ fontSize: "13px", color: "#7A7880", marginBottom: "20px" }}>
                {importProgress}% complete · Do not close this window
              </div>
              <div style={{ width: "100%", maxWidth: "360px", background: "#F4F3EF", borderRadius: "8px", height: "8px", overflow: "hidden" }}>
                <div style={{ height: "100%", background: "#1A5CFF", width: `${importProgress}%`, transition: "width .3s", borderRadius: "8px" }} />
              </div>
            </div>
          )}

          {/* STEP 4: Done */}
          {step === "done" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
              {/* Summary */}
              <div style={{ display: "flex", gap: "12px" }}>
                <div style={{ flex: 1, background: "rgba(5,150,105,.08)", border: "1px solid rgba(5,150,105,.2)", borderRadius: "10px", padding: "16px 20px", textAlign: "center" }}>
                  <div style={{ fontFamily: "var(--font-bebas)", fontSize: "36px", color: "#059669", lineHeight: 1 }}>{result.success}</div>
                  <div style={{ fontSize: "12px", fontWeight: 700, color: "#059669", marginTop: "4px" }}>Successfully Imported</div>
                </div>
                {result.failed > 0 && (
                  <div style={{ flex: 1, background: "rgba(232,36,42,.08)", border: "1px solid rgba(232,36,42,.2)", borderRadius: "10px", padding: "16px 20px", textAlign: "center" }}>
                    <div style={{ fontFamily: "var(--font-bebas)", fontSize: "36px", color: "#E8242A", lineHeight: 1 }}>{result.failed}</div>
                    <div style={{ fontSize: "12px", fontWeight: 700, color: "#E8242A", marginTop: "4px" }}>Failed</div>
                  </div>
                )}
              </div>

              {/* Created products */}
              {result.created.length > 0 && (
                <div style={{ border: "1px solid #E2E0DA", borderRadius: "10px", overflow: "hidden" }}>
                  <div style={{ padding: "10px 14px", background: "#F4F3EF", borderBottom: "1px solid #E2E0DA" }}>
                    <span style={{ fontSize: "11px", fontWeight: 700, color: "#7A7880", textTransform: "uppercase", letterSpacing: ".06em" }}>Created Products</span>
                  </div>
                  <div style={{ padding: "12px 14px", display: "flex", flexWrap: "wrap", gap: "6px" }}>
                    {result.created.map(name => (
                      <span key={name} style={{ background: "rgba(5,150,105,.1)", color: "#059669", padding: "4px 10px", borderRadius: "20px", fontSize: "12px", fontWeight: 600 }}>
                        ✓ {name}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Errors */}
              {result.errors.length > 0 && (
                <div style={{ border: "1px solid rgba(232,36,42,.2)", borderRadius: "10px", overflow: "hidden" }}>
                  <div style={{ padding: "10px 14px", background: "rgba(232,36,42,.06)", borderBottom: "1px solid rgba(232,36,42,.15)" }}>
                    <span style={{ fontSize: "11px", fontWeight: 700, color: "#E8242A", textTransform: "uppercase", letterSpacing: ".06em" }}>Errors</span>
                  </div>
                  <div style={{ padding: "12px 14px", display: "flex", flexDirection: "column", gap: "4px" }}>
                    {result.errors.map((err, i) => (
                      <div key={i} style={{ fontSize: "12px", color: "#E8242A" }}>• {err}</div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding: "16px 24px", borderTop: "1px solid #E2E0DA", display: "flex", gap: "10px", justifyContent: "flex-end", flexShrink: 0 }}>
          {step === "upload" && (
            <button onClick={onClose} style={{ padding: "10px 20px", border: "1px solid #E2E0DA", borderRadius: "6px", background: "#fff", cursor: "pointer", fontWeight: 600, fontSize: "13px" }}>
              Cancel
            </button>
          )}
          {step === "preview" && (
            <>
              <button onClick={() => setStep("upload")} style={{ padding: "10px 20px", border: "1px solid #E2E0DA", borderRadius: "6px", background: "#fff", cursor: "pointer", fontWeight: 600, fontSize: "13px" }}>
                Back
              </button>
              <button
                onClick={runImport}
                disabled={rows.length === 0}
                style={{ padding: "10px 24px", background: rows.length === 0 ? "#E2E0DA" : "#1A5CFF", color: "#fff", border: "none", borderRadius: "6px", cursor: rows.length === 0 ? "not-allowed" : "pointer", fontWeight: 700, fontSize: "13px" }}
              >
                Import {rows.length} Product{rows.length !== 1 ? "s" : ""}
              </button>
            </>
          )}
          {step === "done" && (
            <button
              onClick={onClose}
              style={{ padding: "10px 24px", background: "#1A5CFF", color: "#fff", border: "none", borderRadius: "6px", cursor: "pointer", fontWeight: 700, fontSize: "13px" }}
            >
              Done
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
