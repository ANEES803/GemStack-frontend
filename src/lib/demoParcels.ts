export type DemoParcelRow = {
  code: string;
  lot: string;
  grade: string;
  carats: number;
  caratsDisplay: string;
  fep: string;
  status: string;
  dateIso: string;
};

const STORAGE_KEY = "gemstack-demo-parcels-added";

export function appendDemoParcel(row: DemoParcelRow): void {
  if (typeof window === "undefined") return;
  try {
    const prev = JSON.parse(sessionStorage.getItem(STORAGE_KEY) || "[]") as DemoParcelRow[];
    if (!Array.isArray(prev)) {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify([row]));
      return;
    }
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify([row, ...prev]));
  } catch {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify([row]));
  }
}

export function loadAddedParcels(): DemoParcelRow[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as DemoParcelRow[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}
