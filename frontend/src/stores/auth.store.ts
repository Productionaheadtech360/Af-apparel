/**
 * Zustand auth store — access token held in memory (never localStorage).
 * Refresh token is stored in an httpOnly cookie by the server.
 */
import { create } from "zustand";
import { setAccessToken } from "@/lib/api-client";
import type { UserProfile } from "@/types/user.types";

interface AuthState {
  accessToken: string | null;
  user: UserProfile | null;
  isLoading: boolean;

  // Actions
  setAuth: (token: string, user: UserProfile) => void;
  clearAuth: () => void;
  setLoading: (loading: boolean) => void;

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
    set({ accessToken: token, user, isLoading: false });
  },

  clearAuth: () => {
    setAccessToken(null);
    set({ accessToken: null, user: null, isLoading: false });
  },

  setLoading: (loading) => set({ isLoading: loading }),

  isAuthenticated: () => get().accessToken !== null,
  isAdmin: () => get().user?.is_admin === true,
}));
