import type { AccessLevel } from "@/lib/permissions";

/**
 * Browser: default `/gemstack-api` (Next.js rewrite → 127.0.0.1:8000).
 * Override with NEXT_PUBLIC_API_BASE_URL in .env if needed.
 */
function resolveApiBaseUrl(): string {
  if (typeof window !== "undefined") {
    return process.env.NEXT_PUBLIC_API_BASE_URL ?? "/gemstack-api";
  }
  return process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://127.0.0.1:8000";
}

const API_BASE_URL = resolveApiBaseUrl();
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

function fetchFailureMessage(url: string, err: unknown, timeoutMs: number): string {
  if (err instanceof DOMException && err.name === "AbortError") {
    return `Could not reach the API at ${url} within ${Math.round(timeoutMs / 1000)}s. Is the backend running on port 8000? (uvicorn app.main:app --reload)`;
  }
  if (err instanceof TypeError) {
    return `Network error talking to ${url}. Start GemStack-Backend (uvicorn) and check NEXT_PUBLIC_API_BASE_URL in .env.`;
  }
  if (err instanceof Error && err.message.toLowerCase().includes("abort")) {
    return `Request to ${url} was cancelled or timed out. Confirm only one backend is listening on port 8000.`;
  }
  return err instanceof Error ? err.message : "Request failed";
}

async function fetchWithTimeout(url: string, init: RequestInit = {}): Promise<Response> {
  const timeoutController = new AbortController();
  const timeoutId = setTimeout(() => timeoutController.abort("timeout"), FETCH_TIMEOUT_MS);
  try {
    const signal = mergeAbortSignals(init.signal ?? undefined, timeoutController.signal);
    return await fetch(url, { ...init, signal });
  } catch (err) {
    throw new Error(fetchFailureMessage(url, err, FETCH_TIMEOUT_MS));
  } finally {
    clearTimeout(timeoutId);
  }
}

async function fetchWithTimeoutMs(url: string, init: RequestInit = {}, timeoutMs: number): Promise<Response> {
  const timeoutController = new AbortController();
  const timeoutId = setTimeout(() => timeoutController.abort("timeout"), timeoutMs);
  try {
    const signal = mergeAbortSignals(init.signal ?? undefined, timeoutController.signal);
    return await fetch(url, { ...init, signal });
  } catch (err) {
    throw new Error(fetchFailureMessage(url, err, timeoutMs));
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
  avatar_url: string | null;
  phone: string | null;
  is_active: boolean;
  created_at: string | null;
  last_login_at: string | null;
  role: string;
  role_id: string | null;
  role_name: string | null;
  is_system_role: boolean;
  business_id: string | null;
  must_change_password: boolean;
  permissions: Record<string, AccessLevel>;
};

export type UpdateMePayload = {
  first_name?: string | null;
  last_name?: string | null;
  display_name?: string | null;
  phone?: string | null;
};

/** Map stored avatar paths (including legacy Supabase public URLs) to a loadable img src. */
function resolveAvatarPath(avatarUrl: string): string {
  const trimmed = avatarUrl.trim();
  if (trimmed.startsWith("/auth/avatars/") || trimmed.startsWith("/media/avatars/")) {
    return trimmed;
  }
  const publicMarker = "/storage/v1/object/public/avatars/";
  const publicIdx = trimmed.indexOf(publicMarker);
  if (publicIdx >= 0) {
    const objectPath = trimmed.slice(publicIdx + publicMarker.length).split("?")[0] ?? "";
    if (objectPath) return `/auth/avatars/${objectPath}`;
  }
  const privateMarker = "/storage/v1/object/avatars/";
  const privateIdx = trimmed.indexOf(privateMarker);
  if (privateIdx >= 0) {
    const objectPath = trimmed.slice(privateIdx + privateMarker.length).split("?")[0] ?? "";
    if (objectPath) return `/auth/avatars/${objectPath}`;
  }
  return trimmed;
}

/** Resolve avatar URL for img src (proxied through API when bucket is private). */
export function avatarSrc(avatarUrl: string | null | undefined): string | null {
  if (!avatarUrl?.trim()) return null;
  const trimmed = avatarUrl.trim();
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    const resolved = resolveAvatarPath(trimmed);
    if (resolved !== trimmed) {
      const base = API_BASE_URL.replace(/\/$/, "");
      return `${base}${resolved}`;
    }
    return trimmed;
  }
  const base = API_BASE_URL.replace(/\/$/, "");
  const path = resolveAvatarPath(trimmed);
  return `${base}${path.startsWith("/") ? path : `/${path}`}`;
}

export function displayName(user: Pick<AuthUser, "display_name" | "first_name" | "last_name" | "email">): string {
  if (user.display_name?.trim()) return user.display_name.trim();
  const parts = [user.first_name, user.last_name].filter(Boolean);
  if (parts.length) return parts.join(" ");
  return user.email.split("@")[0] ?? "User";
}

export function userInitials(user: Pick<AuthUser, "display_name" | "first_name" | "last_name" | "email">): string {
  const name = displayName(user);
  const bits = name.split(/\s+/).filter(Boolean);
  if (bits.length >= 2) return `${bits[0]![0] ?? ""}${bits[1]![0] ?? ""}`.toUpperCase();
  return (name.slice(0, 2) || "GS").toUpperCase();
}

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

function normalizeAuthUser(raw: Partial<AuthUser> & { role: string }): AuthUser {
  return {
    id: raw.id ?? "",
    email: raw.email ?? "",
    first_name: raw.first_name ?? null,
    last_name: raw.last_name ?? null,
    display_name: raw.display_name ?? null,
    avatar_url: raw.avatar_url ?? null,
    phone: raw.phone ?? null,
    is_active: raw.is_active ?? true,
    created_at: raw.created_at ?? null,
    last_login_at: raw.last_login_at ?? null,
    role: raw.role,
    role_id: raw.role_id ?? null,
    role_name: raw.role_name ?? null,
    is_system_role: raw.is_system_role ?? false,
    business_id: raw.business_id ?? null,
    must_change_password: raw.must_change_password ?? false,
    permissions: (raw.permissions ?? {}) as Record<string, AccessLevel>,
  };
}

export function getStoredUser(): AuthUser | null {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(USER_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<AuthUser> & { role?: string };
    if (!parsed.role || !parsed.id) return null;
    return normalizeAuthUser(parsed as Partial<AuthUser> & { role: string });
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
  const user = normalizeAuthUser(data.user);
  persistTokens({ ...data, user });
  return { ...data, user };
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
  const user = normalizeAuthUser(data.user);
  persistTokens({ ...data, user });
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
  const raw = (await response.json()) as Partial<AuthUser> & { role: string };
  const data = normalizeAuthUser(raw);
  if (typeof window !== "undefined") {
    window.localStorage.setItem(USER_KEY, JSON.stringify(data));
  }
  return data;
}

export async function changePassword(currentPassword: string, newPassword: string): Promise<AuthUser> {
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
  return getMe();
}

export async function updateMe(payload: UpdateMePayload): Promise<AuthUser> {
  const response = await authorizedFetch(`${API_BASE_URL}/auth/me`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    const body = (await response.json().catch(() => ({}))) as ApiErrorShape;
    throw new Error(extractApiErrorMessage(body, "Failed to update profile"));
  }
  const raw = (await response.json()) as Partial<AuthUser> & { role: string };
  const data = normalizeAuthUser(raw);
  if (typeof window !== "undefined") {
    window.localStorage.setItem(USER_KEY, JSON.stringify(data));
  }
  return data;
}

export async function uploadAvatar(file: File): Promise<AuthUser> {
  const url = `${API_BASE_URL}/auth/me/avatar`;
  if (typeof window !== "undefined") {
    console.info("[uploadAvatar] POST", url, file.name, file.size);
  }
  const form = new FormData();
  form.append("file", file);
  const response = await authorizedFetch(url, {
    method: "POST",
    body: form,
  });
  if (!response.ok) {
    const body = (await response.json().catch(() => ({}))) as ApiErrorShape;
    throw new Error(extractApiErrorMessage(body, "Failed to upload avatar"));
  }
  const raw = (await response.json()) as Partial<AuthUser> & { role: string };
  const data = normalizeAuthUser(raw);
  if (typeof window !== "undefined") {
    window.localStorage.setItem(USER_KEY, JSON.stringify(data));
  }
  return data;
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
