// frontend/src/app/(auth)/login/page.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuthStore } from "@/stores/auth.store";
import { authService } from "@/services/auth.service";
import { ApiClientError, setAccessToken } from "@/lib/api-client";
import { FactoryIcon, ZapIcon, CreditCardIcon } from "@/components/ui/icons";

function decodeJwtPayload(token: string): Record<string, unknown> {
  try {
    const part = token.split(".")[1];
    if (!part) return {};
    const base64 = part.replace(/-/g, "+").replace(/_/g, "/");
    return JSON.parse(atob(base64));
  } catch {
    return {};
  }
}

export default function LoginPage() {
  const router = useRouter();
  const { setAuth } = useAuthStore();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const tokens = await authService.login({ email, password });

      // Set token in memory BEFORE calling getProfile so the request is authenticated
      setAccessToken(tokens.access_token);

      const profile = await authService.getProfile();

      // JWT payload contains is_admin since backend embeds it as a claim
      const payload = decodeJwtPayload(tokens.access_token);
      const fullProfile = { ...profile, is_admin: !!payload.is_admin };

      setAuth(tokens.access_token, fullProfile);

      if (fullProfile.is_admin) {
        router.push("/admin/dashboard");
      } else {
        router.push("/account");
      }
    } catch (err) {
      if (err instanceof ApiClientError) {
        if (err.code === "ACCOUNT_SUSPENDED") {
          setError("Your account has been suspended. Please contact support.");
        } else if (err.code === "UNAUTHORIZED") {
          // Show the exact backend message — covers wrong password, pending, and rejected cases
          setError(err.message || "Invalid email or password. Please try again.");
        } else {
          setError("Invalid email or password. Please try again.");
        }
      } else {
        setError("An unexpected error occurred. Please try again.");
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div style={{ minHeight: "100vh", background: "#080808", fontFamily: "var(--font-jakarta)", display: "flex", flexDirection: "column" }}>
      {/* Top bar */}
      {/* <div style={{ padding: "24px 32px", borderBottom: "1px solid rgba(255,255,255,.06)" }}>
        <Link href="/" style={{ display: "inline-flex", alignItems: "center", textDecoration: "none" }}>
          <img src="/Af-apparel logo.jpeg" alt="AF Apparels Logo" style={{ height: "50px", width: "auto", objectFit: "contain" }} />
        </Link>
      </div> */}

      {/* Main */}
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: "40px 16px" }}>
        <div style={{ width: "100%", maxWidth: "420px" }}>
          {/* Heading */}
          <div style={{ textAlign: "center", marginBottom: "32px" }}>
            <h1 style={{ fontFamily: "var(--font-bebas)", fontSize: "clamp(28px,4vw,40px)", color: "#fff", letterSpacing: ".02em", lineHeight: 1, marginBottom: "8px" }}>
              Sign In
            </h1>
            <p style={{ fontSize: "15px", color: "#d3d0d0", fontWeight: 500 }}>
              Access your wholesale account
            </p>
          </div>

          {/* Card */}
          <div style={{ background: "#111016", border: "1px solid rgba(255,255,255,.08)", borderRadius: "12px", padding: "36px" }}>
            <form onSubmit={handleSubmit}>
              {error && (
                <div style={{ background: "rgba(232,36,42,.12)", border: "1px solid rgba(232,36,42,.3)", borderRadius: "6px", padding: "12px 14px", fontSize: "13px", color: "#f87171", marginBottom: "20px" }}>
                  {error}
                </div>
              )}

              <div style={{ marginBottom: "18px" }}>
                <label
                  htmlFor="email"
                  style={{ display: "block", fontSize: "11px", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".07em", color: "#7A7880", marginBottom: "6px" }}
                >
                  Email Address
                </label>
                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@company.com"
                  style={{
                    width: "100%",
                    background: "#1E1D24",
                    border: "1px solid rgba(255,255,255,.1)",
                    borderRadius: "6px",
                    padding: "10px 14px",
                    fontSize: "14px",
                    color: "#fff",
                    outline: "none",
                    boxSizing: "border-box",
                    transition: "border-color .2s",
                  }}
                />
              </div>

              <div style={{ marginBottom: "24px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                  <label
                    htmlFor="password"
                    style={{ fontSize: "11px", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".07em", color: "#7A7880" }}
                  >
                    Password
                  </label>
                  <Link
                    href="/forgot-password"
                    style={{ fontSize: "12px", color: "#1A5CFF", textDecoration: "none", fontWeight: 600 }}
                  >
                    Forgot password?
                  </Link>
                </div>
                <input
                  id="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  style={{
                    width: "100%",
                    background: "#1E1D24",
                    border: "1px solid rgba(255,255,255,.1)",
                    borderRadius: "6px",
                    padding: "10px 14px",
                    fontSize: "14px",
                    color: "#fff",
                    outline: "none",
                    boxSizing: "border-box",
                    transition: "border-color .2s",
                  }}
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                style={{
                  width: "100%",
                  background: isSubmitting ? "#555" : "#E8242A",
                  color: "#fff",
                  padding: "13px",
                  fontSize: "14px",
                  fontWeight: 700,
                  borderRadius: "6px",
                  border: "none",
                  cursor: isSubmitting ? "not-allowed" : "pointer",
                  textTransform: "uppercase",
                  letterSpacing: ".06em",
                  transition: "background .2s",
                }}
              >
                {isSubmitting ? "Signing in…" : "Sign In →"}
              </button>
            </form>

            <div style={{ marginTop: "20px", paddingTop: "20px", borderTop: "1px solid rgba(255,255,255,.06)", textAlign: "center", fontSize: "13px", color: "#aaa" }}>
              {"Don't have an account? "}
              <Link
                href="/wholesale/register"
                style={{ color: "#1A5CFF", fontWeight: 700, textDecoration: "none" }}
              >
                Apply for Wholesale Access
              </Link>
            </div>
          </div>

          {/* Benefits */}
          <div style={{ marginTop: "28px", display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "12px" }}>
            {[
              { icon: <FactoryIcon size={20} color="#aaa" />, text: "Factory-Direct" },
              { icon: <ZapIcon size={20} color="#aaa" />, text: "Same-Day Ship" },
              { icon: <CreditCardIcon size={20} color="#aaa" />, text: "NET 30 Terms" },
            ].map((item) => (
              <div key={item.text} style={{ textAlign: "center", padding: "12px 8px", background: "#111016", border: "1px solid rgba(255,255,255,.06)", borderRadius: "8px" }}>
                <div style={{ marginBottom: "4px", display: "flex", justifyContent: "center" }}>{item.icon}</div>
                <div style={{ fontSize: "11px", fontWeight: 700, color: "#aaa", textTransform: "uppercase", letterSpacing: ".06em" }}>{item.text}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div style={{ padding: "20px 32px", borderTop: "1px solid rgba(255,255,255,.06)", textAlign: "center", fontSize: "12px", color: "#888" }}>
        © {new Date().getFullYear()} AF Apparels · Dallas, TX ·{" "}
        <a href="tel:+12142727213" style={{ color: "#aaa", textDecoration: "none" }}>(214) 272-7213</a>
      </div>
    </div>
  );
}
