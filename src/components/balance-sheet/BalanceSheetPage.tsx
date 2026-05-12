"use client";

import { Download, Printer, RefreshCw } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

import { BalanceSheetTable } from "./BalanceSheetTable";
import { AccountActivityModal, type AccountActivityRow } from "@/components/reports/AccountActivityModal";
import { JournalEntryReadOnlyModal } from "@/components/reports/JournalEntryReadOnlyModal";
import { useAppNotifications } from "@/components/providers/AppNotificationsProvider";
import { LoadingBlock } from "@/components/ui/LoadingBlock";

import type { BsRow } from "./types";

import {
  fetchAccountActivity,
  fetchBalanceSheet,
  fetchIncomeStatement,
  getGlSettings,
  getJournalEntry,
  type AccountActivityLineDto,
  type BalanceSheetLineDto,
  type JournalDetailDto,
} from "@/lib/glApi";
import { formatMoney } from "@/lib/format";

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function lineTypeKey(t: string): "asset" | "liability" | "equity" | null {
  const s = t.trim().toLowerCase();
  if (s === "asset") return "asset";
  if (s === "liability") return "liability";
  if (s === "equity") return "equity";
  return null;
}

function buildHierarchicalSection(
  lines: BalanceSheetLineDto[],
  want: "asset" | "liability" | "equity",
): BsRow[] {
  const section = lines.filter((l) => lineTypeKey(l.account_type) === want);
  const byId = new Map(section.map((l) => [l.account_id, l]));
  const childMap = new Map<string, BalanceSheetLineDto[]>();
  const roots: BalanceSheetLineDto[] = [];

  for (const l of section) {
    const pid = l.parent_id;
    if (!pid || !byId.has(pid)) roots.push(l);
    else {
      if (!childMap.has(pid)) childMap.set(pid, []);
      childMap.get(pid)!.push(l);
    }
  }
  for (const arr of childMap.values()) arr.sort((a, b) => a.code.localeCompare(b.code));
  roots.sort((a, b) => a.code.localeCompare(b.code));

  const rolled = new Map<string, number>();
  function rollup(id: string): number {
    const node = byId.get(id);
    if (!node) return 0;
    if (!node.is_group) {
      const v = Number.parseFloat(node.balance) || 0;
      rolled.set(id, v);
      return v;
    }
    let s = 0;
    for (const ch of childMap.get(id) ?? []) {
      s += rollup(ch.account_id);
    }
    rolled.set(id, s);
    return s;
  }
  for (const r of roots) rollup(r.account_id);

  const out: BsRow[] = [];
  function visit(node: BalanceSheetLineDto, depth: number) {
    const rawBal = Number.parseFloat(node.balance) || 0;
    const rolledUp = rolled.get(node.account_id) ?? 0;
    if (!node.is_group && rawBal === 0) return;
    out.push({
      id: node.account_id,
      kind: node.is_group ? "subsection" : "detail",
      label: node.name,
      depth,
      amount: node.is_group ? rolledUp : rawBal,
    });
    if (!node.is_group) return;
    for (const ch of childMap.get(node.account_id) ?? []) visit(ch, depth + 1);
  }
  for (const r of roots) visit(r, 1);
  return out;
}

function firstDayOfCalendarYear(isoDate: string): string {
  const y = isoDate.slice(0, 4);
  return `${y}-01-01`;
}

function buildRows(
  lines: BalanceSheetLineDto[],
  bridgeNetIncome: number,
): {
  rows: BsRow[];
  totalAssets: number;
  totalLiabilities: number;
  totalEquity: number;
} {
  const posting = (want: "asset" | "liability" | "equity") =>
    lines.filter((l) => lineTypeKey(l.account_type) === want && !l.is_group);

  const sum = (xs: BalanceSheetLineDto[]) => xs.reduce((s, x) => s + (Number.parseFloat(x.balance) || 0), 0);
  const assetsPosting = posting("asset");
  const liabsPosting = posting("liability");
  const equityPosting = posting("equity");
  const ta = sum(assetsPosting);
  const tl = sum(liabsPosting);
  const te = sum(equityPosting);
  const bridge = Number.isFinite(bridgeNetIncome) ? bridgeNetIncome : 0;
  const equityReported = te + bridge;

  const rows: BsRow[] = [];
  rows.push({ id: "sec-assets", kind: "section", label: "Assets", depth: 0, amount: null });
  rows.push(...buildHierarchicalSection(lines, "asset"));
  rows.push({ id: "t-assets", kind: "grand_total", label: "Total assets", depth: 0, amount: ta });

  rows.push({ id: "sec-liab", kind: "section", label: "Liabilities", depth: 0, amount: null });
  rows.push(...buildHierarchicalSection(lines, "liability"));
  rows.push({ id: "t-liab", kind: "grand_total", label: "Total liabilities", depth: 0, amount: tl });

  rows.push({ id: "sec-eq", kind: "section", label: "Equity", depth: 0, amount: null });
  rows.push(...buildHierarchicalSection(lines, "equity"));
  if (Math.abs(bridge) >= 0.005) {
    rows.push({
      id: "pl-bridge",
      kind: "pl_bridge",
      label: "Net income (P&L, calendar year-to-date)",
      depth: 1,
      amount: bridge,
    });
  }
  rows.push({ id: "t-eq", kind: "grand_total", label: "Total equity", depth: 0, amount: equityReported });
  rows.push({
    id: "check",
    kind: "check",
    label: "Balance check (assets − liabilities − equity)",
    depth: 0,
    amount: null,
  });

  return { rows, totalAssets: ta, totalLiabilities: tl, totalEquity: equityReported };
}

const ACTIVITY_PAGE = 50;

function mapActivityRow(l: AccountActivityLineDto): AccountActivityRow {
  const dr = Number.parseFloat(l.debit) || 0;
  const cr = Number.parseFloat(l.credit) || 0;
  return {
    lineId: l.line_id,
    journalEntryId: l.journal_entry_id,
    entryDate: l.entry_date,
    reference: l.reference,
    memo: l.memo || l.description,
    debit: dr,
    credit: cr,
  };
}

export function BalanceSheetPage() {
  const { pushToast } = useAppNotifications();
  const [asOfDate, setAsOfDate] = useState(todayIso);
  const [selected, setSelected] = useState<BsRow | null>(null);
  const [ccy, setCcy] = useState("USD");
  const [apiLines, setApiLines] = useState<BalanceSheetLineDto[]>([]);
  const [bridgeNetIncome, setBridgeNetIncome] = useState(0);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const ytdFrom = firstDayOfCalendarYear(asOfDate);
      const [s, lines, pl] = await Promise.all([
        getGlSettings(),
        fetchBalanceSheet(asOfDate),
        fetchIncomeStatement(ytdFrom, asOfDate).catch(() => null),
      ]);
      setCcy(s.functional_currency || "USD");
      setApiLines(lines);
      setBridgeNetIncome(pl ? Number.parseFloat(pl.net_income) || 0 : 0);
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : "Could not load balance sheet");
      setApiLines([]);
      setBridgeNetIncome(0);
    } finally {
      setLoading(false);
    }
  }, [asOfDate]);

  useEffect(() => {
    void load();
  }, [load]);

  const { rows, totalAssets, totalLiabilities, totalEquity } = useMemo(
    () => buildRows(apiLines, bridgeNetIncome),
    [apiLines, bridgeNetIncome],
  );
  const balanceDifference = useMemo(() => totalAssets - totalLiabilities - totalEquity, [totalAssets, totalLiabilities, totalEquity]);

  const displayCurrency: "PKR" | "USD" = ccy === "USD" ? "USD" : "PKR";

  const [activityRows, setActivityRows] = useState<AccountActivityRow[]>([]);
  const [activityLoading, setActivityLoading] = useState(false);
  const [activityLoadingMore, setActivityLoadingMore] = useState(false);
  const [activityHasMore, setActivityHasMore] = useState(false);

  const [journalOpen, setJournalOpen] = useState(false);
  const [journalDetail, setJournalDetail] = useState<JournalDetailDto | null>(null);
  const [journalLoading, setJournalLoading] = useState(false);

  useEffect(() => {
    if (!selected?.id || !UUID_RE.test(selected.id)) {
      setActivityRows([]);
      setActivityHasMore(false);
      return;
    }
    let cancelled = false;
    setActivityLoading(true);
    void fetchAccountActivity({
      accountId: selected.id,
      dateFrom: "2000-01-01",
      dateTo: asOfDate,
      status: "posted",
      limit: ACTIVITY_PAGE,
      offset: 0,
    })
      .then((page) => {
        if (cancelled) return;
        setActivityRows(page.lines.map(mapActivityRow));
        setActivityHasMore(page.lines.length === ACTIVITY_PAGE);
      })
      .catch(() => {
        if (!cancelled) {
          setActivityRows([]);
          setActivityHasMore(false);
        }
      })
      .finally(() => {
        if (!cancelled) setActivityLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [selected, asOfDate]);

  const loadMoreActivity = useCallback(async () => {
    if (!selected?.id || !UUID_RE.test(selected.id)) return;
    if (activityLoadingMore || !activityHasMore) return;
    setActivityLoadingMore(true);
    try {
      const page = await fetchAccountActivity({
        accountId: selected.id,
        dateFrom: "2000-01-01",
        dateTo: asOfDate,
        status: "posted",
        limit: ACTIVITY_PAGE,
        offset: activityRows.length,
      });
      setActivityRows((prev) => [...prev, ...page.lines.map(mapActivityRow)]);
      setActivityHasMore(page.lines.length === ACTIVITY_PAGE);
    } catch {
      pushToast("Could not load more lines.", "error");
    } finally {
      setActivityLoadingMore(false);
    }
  }, [selected, asOfDate, activityRows.length, activityHasMore, activityLoadingMore, pushToast]);

  const openJournal = useCallback((journalId: string) => {
    setJournalOpen(true);
    setJournalLoading(true);
    setJournalDetail(null);
    void getJournalEntry(journalId)
      .then((j) => setJournalDetail(j))
      .catch(() => setJournalDetail(null))
      .finally(() => setJournalLoading(false));
  }, []);

  return (
    <div className="mx-auto max-w-3xl space-y-6 pb-10">
      <header className="flex flex-col gap-4 border-b border-[var(--gs-border)]/80 pb-6 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[var(--gs-text)] sm:text-3xl">Balance Sheet</h1>
          <p className="mt-1 text-sm text-[var(--gs-muted)]">From posted journals (functional currency)</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => pushToast("Export is not available yet.", "info")}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[var(--gs-border)] bg-[var(--gs-card)] text-[var(--gs-text)] shadow-sm hover:bg-[var(--gs-hover)]"
            aria-label="Export"
            title="Export"
          >
            <Download className="h-4 w-4 shrink-0" aria-hidden />
          </button>
          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[var(--gs-border)] bg-[var(--gs-card)] text-[var(--gs-text)] shadow-sm hover:bg-[var(--gs-hover)]"
            aria-label="Print"
            title="Print"
          >
            <Printer className="h-4 w-4 shrink-0" aria-hidden />
          </button>
          <button
            type="button"
            onClick={() => void load()}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-[var(--gs-accent)] text-white shadow-sm hover:bg-[var(--gs-accent-hover)]"
            aria-label="Refresh"
            title="Refresh"
          >
            <RefreshCw className="h-4 w-4 shrink-0" aria-hidden />
          </button>
        </div>
      </header>

      <div className="rounded-2xl border border-[var(--gs-border)] bg-[var(--gs-card)] p-4 shadow-sm sm:p-5">
        <label className="block text-[10px] font-bold uppercase tracking-wide text-[var(--gs-muted)]">As of date</label>
        <input
          type="date"
          value={asOfDate}
          onChange={(e) => setAsOfDate(e.target.value)}
          className="mt-2 max-w-xs rounded-xl border border-[var(--gs-border)] px-3 py-2.5 text-sm outline-none focus:border-[var(--gs-accent)] focus:ring-2 focus:ring-[var(--gs-accent)]/25"
        />
        <p className="mt-2 text-xs text-[var(--gs-muted)]">
          Includes journal lines on or before this date. Currency: <strong>{ccy}</strong>.
        </p>
      </div>

      {loadError ? (
        <div className="rounded-xl border border-[var(--gs-border-strong)] bg-[var(--gs-accent-soft)] px-4 py-3 text-sm text-[var(--gs-text)]">
          {loadError}
        </div>
      ) : null}

      {loading ? (
        <LoadingBlock label="Loading balance sheet…" />
      ) : loadError ? null : (
        <>
          <div className="grid gap-3 rounded-2xl border border-[var(--gs-border)] bg-[var(--gs-hover)]/80 p-4 text-sm sm:grid-cols-3">
            <div>
              <p className="text-[10px] font-bold uppercase text-[var(--gs-muted)]">Total assets</p>
              <p className="mt-1 font-mono font-bold text-[var(--gs-text)]">{formatMoney(totalAssets, ccy)}</p>
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase text-[var(--gs-muted)]">Total liabilities</p>
              <p className="mt-1 font-mono font-bold text-[var(--gs-text)]">{formatMoney(totalLiabilities, ccy)}</p>
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase text-[var(--gs-muted)]">Total equity</p>
              <p className="mt-1 font-mono font-bold text-[var(--gs-text)]">{formatMoney(totalEquity, ccy)}</p>
              {Math.abs(bridgeNetIncome) >= 0.005 ? (
                <p className="mt-1 text-[10px] text-[var(--gs-muted)]">Includes P&amp;L YTD bridge in statement below.</p>
              ) : null}
            </div>
          </div>
          <BalanceSheetTable
            rows={rows}
            balanceDifference={balanceDifference}
            currency={ccy}
            onAccountClick={setSelected}
          />
          {Math.abs(bridgeNetIncome) >= 0.005 ? (
            <p className="text-xs text-[var(--gs-muted)]">
              The &quot;Net income (P&L, calendar year-to-date)&quot; line bridges posted revenue and expense into equity for this view
              only. Formal closing entries in the general ledger are unchanged.
            </p>
          ) : null}
        </>
      )}

      <p className="text-center text-xs text-[var(--gs-muted)]">
        <Link href="/reports?tab=hub" className="font-semibold text-[var(--gs-accent)] hover:underline">
          ← Back to report hub
        </Link>
      </p>

      <AccountActivityModal
        open={!!selected}
        accountTitle={selected?.label ?? null}
        rows={activityRows}
        loading={activityLoading}
        loadingMore={activityLoadingMore}
        hasMore={activityHasMore}
        currency={displayCurrency}
        onClose={() => setSelected(null)}
        onRowClick={(r) => openJournal(r.journalEntryId)}
        onLoadMore={() => void loadMoreActivity()}
      />

      <JournalEntryReadOnlyModal
        open={journalOpen}
        journal={journalDetail}
        loading={journalLoading}
        currency={displayCurrency}
        onClose={() => {
          setJournalOpen(false);
          setJournalDetail(null);
        }}
      />
    </div>
  );
}
