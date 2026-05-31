import { apiAuthFetch } from "@/lib/authClient";
import type { AccessLevel } from "@/lib/permissions";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";

export type PermissionModule = {
  key: string;
  label: string;
  sort_order: number;
};

export type RoleRecord = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  is_system: boolean;
  is_active: boolean;
  business_id: string | null;
  permissions: Record<string, AccessLevel>;
  user_count: number;
};

export type RoleListResponse = {
  items: RoleRecord[];
  modules: PermissionModule[];
};

export type AdminUserRecord = {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  display_name: string | null;
  role_id: string | null;
  role_slug: string | null;
  role_name: string | null;
  is_active: boolean;
  must_change_password: boolean;
  last_login_at: string | null;
};

async function parseError(response: Response, fallback: string): Promise<never> {
  const body = (await response.json().catch(() => ({}))) as { detail?: unknown };
  const detail = body.detail;
  if (typeof detail === "string") throw new Error(detail);
  throw new Error(fallback);
}

export async function fetchRoles(): Promise<RoleListResponse> {
  const response = await apiAuthFetch(`${API_BASE_URL}/admin/roles`);
  if (!response.ok) await parseError(response, "Failed to load roles");
  return (await response.json()) as RoleListResponse;
}

export async function createRole(payload: {
  name: string;
  description?: string | null;
  slug?: string;
  permissions: Record<string, AccessLevel>;
}): Promise<RoleRecord> {
  const response = await apiAuthFetch(`${API_BASE_URL}/admin/roles`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
  if (!response.ok) await parseError(response, "Failed to create role");
  return (await response.json()) as RoleRecord;
}

export async function updateRole(
  roleId: string,
  payload: {
    name?: string;
    description?: string | null;
    permissions?: Record<string, AccessLevel>;
    is_active?: boolean;
  },
): Promise<RoleRecord> {
  const response = await apiAuthFetch(`${API_BASE_URL}/admin/roles/${roleId}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
  if (!response.ok) await parseError(response, "Failed to update role");
  return (await response.json()) as RoleRecord;
}

export async function cloneRole(roleId: string, name: string, description?: string | null): Promise<RoleRecord> {
  const response = await apiAuthFetch(`${API_BASE_URL}/admin/roles/${roleId}/clone`, {
    method: "POST",
    body: JSON.stringify({ name, description }),
  });
  if (!response.ok) await parseError(response, "Failed to clone role");
  return (await response.json()) as RoleRecord;
}

export async function deactivateRole(roleId: string): Promise<void> {
  const response = await apiAuthFetch(`${API_BASE_URL}/admin/roles/${roleId}`, { method: "DELETE" });
  if (!response.ok) await parseError(response, "Failed to deactivate role");
}

export async function fetchAdminUsers(): Promise<AdminUserRecord[]> {
  const response = await apiAuthFetch(`${API_BASE_URL}/admin/users`);
  if (!response.ok) await parseError(response, "Failed to load users");
  const data = (await response.json()) as { items: AdminUserRecord[] };
  return data.items;
}

export async function createAdminUser(payload: {
  email: string;
  first_name: string;
  last_name?: string | null;
  role_id: string;
  temporary_password: string;
  is_active?: boolean;
}): Promise<AdminUserRecord> {
  const response = await apiAuthFetch(`${API_BASE_URL}/admin/users`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
  if (!response.ok) await parseError(response, "Failed to create user");
  return (await response.json()) as AdminUserRecord;
}

export async function updateAdminUser(
  userId: string,
  payload: {
    first_name?: string;
    last_name?: string | null;
    role_id?: string;
    is_active?: boolean;
  },
): Promise<AdminUserRecord> {
  const response = await apiAuthFetch(`${API_BASE_URL}/admin/users/${userId}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
  if (!response.ok) await parseError(response, "Failed to update user");
  return (await response.json()) as AdminUserRecord;
}

export async function revokeUserSessions(userId: string): Promise<void> {
  const response = await apiAuthFetch(`${API_BASE_URL}/admin/users/${userId}/revoke-sessions`, { method: "POST" });
  if (!response.ok) await parseError(response, "Failed to revoke sessions");
}

export function generateTempPassword(length = 12): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$";
  let out = "";
  for (let i = 0; i < length; i += 1) {
    out += chars[Math.floor(Math.random() * chars.length)];
  }
  return out;
}
