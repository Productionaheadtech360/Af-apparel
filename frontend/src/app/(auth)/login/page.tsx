"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuthStore } from "@/stores/auth.store";
import { authService } from "@/services/auth.service";
import { ApiClientError, setAccessToken } from "@/lib/api-client";

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
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link href="/" className="inline-block">
            <h1 className="text-3xl font-bold text-blue-600">AF Apparels</h1>
          </Link>
          <p className="mt-2 text-gray-600">Sign in to your wholesale account</p>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="rounded-md bg-red-50 border border-red-200 p-3 text-sm text-red-700">
                {error}
              </div>
            )}

            <div>
              <label htmlFor="email" className="label">
                Email address
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input"
              />
            </div>

            <div>
              <div className="flex justify-between items-center mb-1">
                <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                  Password
                </label>
                <Link
                  href="/forgot-password"
                  className="text-sm text-blue-600 hover:text-blue-700"
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
                className="input"
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full btn-primary py-2.5"
            >
              {isSubmitting ? "Signing in…" : "Sign in"}
            </button>
          </form>

          <div className="mt-6 text-center text-sm text-gray-600">
            {"Don't have an account? "}
            <Link href="/wholesale/register" className="text-blue-600 hover:text-blue-700 font-medium">
              Apply for wholesale access
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
