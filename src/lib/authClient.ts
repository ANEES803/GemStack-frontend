import { isRoleSlug, type RoleSlug } from "@/lib/roles";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";
const ACCESS_KEY = "gemstack_access_token";
const REFRESH_KEY = "gemstack_refresh_token";

/** Prevents the UI from hanging indefinitely when the API is down or unreachable. */
const FETCH_TIMEOUT_MS = 15_000;

/** Slightly longer for shared authenticated API calls (matches inventory client). */
const API_AUTH_FETCH_TIMEOUT_MS = 20_000;

const LOGIN_PATH = "/login";

function mergeAbortSignals(a: AbortSignal | undefined, b: AbortSignal): AbortSignal {
  if (!a) return b;
  const controller = new AbortController();
  const onAbort = () => controller.abort();
  if (a.aborted || b.aborted) {
    controller.abort();
    return controller.signal;
  }
  a.addEventListener("abort", onAbort, { once: true });
  b.addEventListener("abort", onAbort, { once: true });
  return controller.signal;
}

async function fetchWithTimeout(url: string, init: RequestInit = {}): Promise<Response> {
  const timeoutController = new AbortController();
  const timeoutId = setTimeout(() => timeoutController.abort(), FETCH_TIMEOUT_MS);
  try {
    const signal = mergeAbortSignals(init.signal ?? undefined, timeoutController.signal);
    return await fetch(url, { ...init, signal });
  } finally {
    clearTimeout(timeoutId);
  }
}

async function fetchWithTimeoutMs(url: string, init: RequestInit = {}, timeoutMs: number): Promise<Response> {
  const timeoutController = new AbortController();
  const timeoutId = setTimeout(() => timeoutController.abort(), timeoutMs);
  try {
    const signal = mergeAbortSignals(init.signal ?? undefined, timeoutController.signal);
    return await fetch(url, { ...init, signal });
  } finally {
    clearTimeout(timeoutId);
  }
}

function redirectToLogin(): void {
  if (typeof window === "undefined") return;
  window.location.assign(LOGIN_PATH);
}

export type AuthUser = {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  display_name: string | null;
  role: RoleSlug;
  business_id: string | null;
  must_change_password: boolean;
};

export type LoginResponse = {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
  user: AuthUser;
};

const USER_KEY = "gemstack_user";

type ApiErrorShape = {
  detail?: unknown;
};

function extractApiErrorMessage(body: ApiErrorShape, fallback: string): string {
  const { detail } = body;
  if (typeof detail === "string" && detail.trim()) {
    return detail;
  }
  if (Array.isArray(detail) && detail.length > 0) {
    const first = detail[0] as { msg?: unknown };
    if (typeof first?.msg === "string" && first.msg.trim()) {
      return first.msg;
    }
    return JSON.stringify(detail);
  }
  return fallback;
}

export function getAccessToken(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(ACCESS_KEY);
}

export function getRefreshToken(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(REFRESH_KEY);
}

export function clearAuthTokens(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(ACCESS_KEY);
  window.localStorage.removeItem(REFRESH_KEY);
  window.localStorage.removeItem(USER_KEY);
}

function persistTokens(payload: LoginResponse): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(ACCESS_KEY, payload.access_token);
  window.localStorage.setItem(REFRESH_KEY, payload.refresh_token);
  window.localStorage.setItem(USER_KEY, JSON.stringify(payload.user));
}

export function getStoredUser(): AuthUser | null {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(USER_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as AuthUser;
    return isRoleSlug(parsed.role) ? parsed : null;
  } catch {
    return null;
  }
}

export async function login(email: string, password: string): Promise<LoginResponse> {
  const response = await fetchWithTimeout(`${API_BASE_URL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  if (!response.ok) {
    const body = (await response.json().catch(() => ({}))) as ApiErrorShape;
    throw new Error(extractApiErrorMessage(body, "Failed to login"));
  }
  const data = (await response.json()) as LoginResponse;
  if (!isRoleSlug(data.user.role)) {
    throw new Error("Server returned unsupported role");
  }
  persistTokens(data);
  return data;
}

async function refreshSession(): Promise<string | null> {
  const refreshToken = getRefreshToken();
  if (!refreshToken) return null;
  const response = await fetchWithTimeout(`${API_BASE_URL}/auth/refresh`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refresh_token: refreshToken }),
  });
  if (!response.ok) {
    clearAuthTokens();
    return null;
  }
  const data = (await response.json()) as LoginResponse;
  if (!isRoleSlug(data.user.role)) {
    clearAuthTokens();
    return null;
  }
  persistTokens(data);
  return data.access_token;
}

/**
 * Authenticated fetch for business API routes: Bearer access token, refresh on 401,
 * then redirect to login if the session cannot be recovered.
 */
export async function apiAuthFetch(input: string, init: RequestInit = {}): Promise<Response> {
  if (typeof window === "undefined") {
    throw new Error("Not authenticated");
  }
  const token = getAccessToken();
  if (!token) {
    clearAuthTokens();
    redirectToLogin();
    throw new Error("Session expired. Please sign in again.");
  }

  const headers = new Headers(init.headers);
  const isFormData = typeof FormData !== "undefined" && init.body instanceof FormData;
  if (!headers.has("Content-Type") && init.body !== undefined && !isFormData) {
    headers.set("Content-Type", "application/json");
  }
  headers.set("Authorization", `Bearer ${token}`);

  let response = await fetchWithTimeoutMs(input, { ...init, headers }, API_AUTH_FETCH_TIMEOUT_MS);
  if (response.status === 401) {
    const rotatedAccessToken = await refreshSession();
    if (!rotatedAccessToken) {
      redirectToLogin();
      throw new Error("Session expired. Please sign in again.");
    }
    const retryHeaders = new Headers(init.headers);
    if (!retryHeaders.has("Content-Type") && init.body !== undefined && !isFormData) {
      retryHeaders.set("Content-Type", "application/json");
    }
    retryHeaders.set("Authorization", `Bearer ${rotatedAccessToken}`);
    response = await fetchWithTimeoutMs(input, { ...init, headers: retryHeaders }, API_AUTH_FETCH_TIMEOUT_MS);
  }
  if (response.status === 401) {
    clearAuthTokens();
    redirectToLogin();
    throw new Error("Session expired. Please sign in again.");
  }
  return response;
}

async function authorizedFetch(input: string, init: RequestInit): Promise<Response> {
  return apiAuthFetch(input, init);
}

export async function logout(): Promise<void> {
  const refreshToken = getRefreshToken();
  if (!refreshToken) {
    clearAuthTokens();
    return;
  }

  try {
    await fetchWithTimeout(`${API_BASE_URL}/auth/logout`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh_token: refreshToken }),
    });
  } finally {
    clearAuthTokens();
  }
}

export async function getMe(): Promise<AuthUser> {
  const response = await authorizedFetch(`${API_BASE_URL}/auth/me`, {
    method: "GET",
  });
  if (!response.ok) {
    const body = (await response.json().catch(() => ({}))) as ApiErrorShape;
    throw new Error(extractApiErrorMessage(body, "Failed to fetch user profile"));
  }
  const data = (await response.json()) as AuthUser;
  if (!isRoleSlug(data.role)) {
    throw new Error("Server returned unsupported role");
  }
  if (typeof window !== "undefined") {
    window.localStorage.setItem(USER_KEY, JSON.stringify(data));
  }
  return data;
}

export async function changePassword(currentPassword: string, newPassword: string): Promise<void> {
  const response = await authorizedFetch(`${API_BASE_URL}/auth/change-password`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      current_password: currentPassword,
      new_password: newPassword,
    }),
  });
  if (!response.ok) {
    const body = (await response.json().catch(() => ({}))) as ApiErrorShape;
    throw new Error(extractApiErrorMessage(body, "Failed to change password"));
  }
}

export async function adminResetPassword(userId: string, temporaryPassword: string): Promise<void> {
  const response = await authorizedFetch(`${API_BASE_URL}/admin/users/${userId}/reset-password`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ temporary_password: temporaryPassword }),
  });
  if (!response.ok) {
    const body = (await response.json().catch(() => ({}))) as ApiErrorShape;
    throw new Error(extractApiErrorMessage(body, "Failed to reset password"));
  }
}
