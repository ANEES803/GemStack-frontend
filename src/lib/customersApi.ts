/**
 * Customer master API (Sales).
 */

import { apiAuthFetch } from "@/lib/authClient";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";

async function parseError(response: Response): Promise<string> {
  const body = (await response.json().catch(() => ({}))) as { detail?: unknown };
  const { detail } = body;
  if (typeof detail === "string" && detail.trim()) return detail;
  if (Array.isArray(detail) && detail.length > 0) {
    const first = detail[0] as { msg?: unknown };
    if (typeof first?.msg === "string") return first.msg;
  }
  return `Request failed (${response.status})`;
}

export type CustomerDto = {
  id: string;
  business_id: string;
  customer_code: string;
  name: string;
  email: string | null;
  phone: string;
  notes: string;
  payment_terms: string;
  opening_balance: string;
  status: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type CustomerUpsertBody = {
  name: string;
  email?: string | null;
  phone?: string | null;
  notes?: string | null;
  customer_code?: string | null;
  payment_terms?: string | null;
  opening_balance?: string | number | null;
  status?: string | null;
};

export async function fetchCustomers(includeInactive = false, signal?: AbortSignal): Promise<CustomerDto[]> {
  const res = await apiAuthFetch(
    `${API_BASE_URL}/customers?include_inactive=${includeInactive ? "true" : "false"}`,
    { method: "GET", signal },
  );
  if (!res.ok) throw new Error(await parseError(res));
  return (await res.json()) as CustomerDto[];
}

export async function createCustomer(body: CustomerUpsertBody, signal?: AbortSignal): Promise<CustomerDto> {
  const res = await apiAuthFetch(`${API_BASE_URL}/customers`, {
    method: "POST",
    body: JSON.stringify(body),
    signal,
  });
  if (!res.ok) throw new Error(await parseError(res));
  return (await res.json()) as CustomerDto;
}

export async function fetchCustomer(customerId: string, signal?: AbortSignal): Promise<CustomerDto> {
  const res = await apiAuthFetch(`${API_BASE_URL}/customers/${customerId}`, { method: "GET", signal });
  if (!res.ok) throw new Error(await parseError(res));
  return (await res.json()) as CustomerDto;
}

export async function updateCustomer(
  customerId: string,
  body: Partial<CustomerUpsertBody> & { is_active?: boolean },
  signal?: AbortSignal,
): Promise<CustomerDto> {
  const res = await apiAuthFetch(`${API_BASE_URL}/customers/${customerId}`, {
    method: "PATCH",
    body: JSON.stringify(body),
    signal,
  });
  if (!res.ok) throw new Error(await parseError(res));
  return (await res.json()) as CustomerDto;
}

export async function archiveCustomer(customerId: string, signal?: AbortSignal): Promise<CustomerDto> {
  const res = await apiAuthFetch(`${API_BASE_URL}/customers/${customerId}/archive`, {
    method: "POST",
    signal,
  });
  if (!res.ok) throw new Error(await parseError(res));
  return (await res.json()) as CustomerDto;
}

export async function deleteCustomer(customerId: string, signal?: AbortSignal): Promise<void> {
  const res = await apiAuthFetch(`${API_BASE_URL}/customers/${customerId}`, { method: "DELETE", signal });
  if (!res.ok) throw new Error(await parseError(res));
}

export type CustomerDisplayRow = {
  id: string;
  customer_code: string;
  name: string;
  email: string;
  phone: string;
  detail: string;
};

/** Map API row to UI list / dropdown shape. */
export function customerDtoToDisplay(c: CustomerDto): CustomerDisplayRow {
  return {
    id: c.id,
    customer_code: c.customer_code,
    name: c.name,
    email: c.email ?? "",
    phone: c.phone,
    detail: c.notes,
  };
}
