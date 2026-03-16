// frontend/src/stores/auth.store.ts
/**
 * Zustand auth store — access token held in memory and persisted to
 * sessionStorage (cleared when the browser tab is closed).
 * Refresh token is stored in an httpOnly cookie by the server.
 */
import { create } from "zustand";
import { setAccessToken } from "@/lib/api-client";
import type { UserProfile } from "@/types/user.types";


const SESSION_KEY = "af_session";

interface PersistedSession {
  token: string;
  user: UserProfile;
}

function readSession(): PersistedSession | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    return raw ? (JSON.parse(raw) as PersistedSession) : null;
  } catch {
    return null;
  }
}

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

interface AuthState {
  accessToken: string | null;
  user: UserProfile | null;
  isLoading: boolean;

  // Actions
  setAuth: (token: string, user: UserProfile) => void;
  clearAuth: () => void;
  setLoading: (loading: boolean) => void;
  /** Restore session from sessionStorage on app init. Returns true if a session was found. */
  initAuth: () => boolean;

  // Derived helpers
  isAuthenticated: () => boolean;
  isAdmin: () => boolean;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  accessToken: null,
  user: null,
  isLoading: true,

  setAuth: (token, user) => {
    setAccessToken(token);
    try {
      sessionStorage.setItem(SESSION_KEY, JSON.stringify({ token, user }));
    } catch {}
    set({ accessToken: token, user, isLoading: false });
  },

  clearAuth: () => {
    setAccessToken(null);
    try {
      sessionStorage.removeItem(SESSION_KEY);
    } catch {}
    set({ accessToken: null, user: null, isLoading: false });
  },

  setLoading: (loading) => set({ isLoading: loading }),

  initAuth: () => {
    const session = readSession();
    if (session) {
      // Re-decode JWT so is_admin is always correct, even if stored session predates the fix.
      const payload = decodeJwtPayload(session.token);
      const user = { ...session.user, is_admin: !!payload.is_admin };
      setAccessToken(session.token);
      set({ accessToken: session.token, user, isLoading: false });
      return true;
    }
    // No session in sessionStorage — keep isLoading: true while AuthInitializer tries refresh cookie.
    set({ isLoading: true });
    return false;
  },

  isAuthenticated: () => get().accessToken !== null,
  isAdmin: () => get().user?.is_admin === true,
}));
