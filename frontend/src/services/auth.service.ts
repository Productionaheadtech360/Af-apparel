/**
 * Auth service — wraps all authentication API calls.
 */
import { apiClient } from "@/lib/api-client";
import type { AuthTokens, UserProfile } from "@/types/user.types";

export interface RegisterWholesalePayload {
  company_name: string;
  tax_id?: string;
  business_type: string;
  website?: string;
  expected_monthly_volume?: string;
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  password: string;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface WholesaleApplicationResponse {
  id: string;
  company_name: string;
  status: string;
  created_at: string;
}

export const authService = {
  /** Log in and receive an access token. Refresh token is set as httpOnly cookie. */
  async login(payload: LoginPayload): Promise<AuthTokens> {
    return apiClient.post<AuthTokens>("/api/v1/login", payload, { skipAuth: true });
  },

  /** Log out — blacklist access token and clear refresh cookie. */
  async logout(): Promise<void> {
    return apiClient.post<void>("/api/v1/logout");
  },

  /** Submit a wholesale registration application. */
  async registerWholesale(payload: RegisterWholesalePayload): Promise<WholesaleApplicationResponse> {
    return apiClient.post<WholesaleApplicationResponse>(
      "/api/v1/register-wholesale",
      payload,
      { skipAuth: true }
    );
  },

  /** Refresh the access token using the httpOnly refresh cookie. */
  async refreshToken(): Promise<AuthTokens> {
    return apiClient.post<AuthTokens>("/api/v1/refresh", undefined, { skipAuth: true });
  },

  /** Send a password reset email. Always resolves (no enumeration). */
  async forgotPassword(email: string): Promise<void> {
    return apiClient.post<void>("/api/v1/forgot-password", { email }, { skipAuth: true });
  },

  /** Reset password using token from email. */
  async resetPassword(token: string, newPassword: string): Promise<void> {
    return apiClient.post<void>(
      "/api/v1/reset-password",
      { token, new_password: newPassword },
      { skipAuth: true }
    );
  },

  /** Get the current user's profile (requires valid access token). */
  async getProfile(): Promise<UserProfile> {
    return apiClient.get<UserProfile>("/api/v1/account/profile");
  },
};
