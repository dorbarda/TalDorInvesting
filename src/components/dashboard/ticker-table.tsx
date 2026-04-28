"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  flexRender,
  type ColumnDef,
  type SortingState,
} from "@tanstack/react-table";
import { ArrowUpDown, ArrowUp, ArrowDown, RefreshCw, Trash2, Search, ChevronRight, DollarSign } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase/client";
import { type Ticker } from "@/types/database";
import { StatusBadge } from "@/components/ticker/status-badge";
import { ScoreBadge } from "@/components/ticker/score-badge";
import { NewTickerDialog } from "@/components/dashboard/new-ticker-dialog";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { formatDate } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { TICKER_STATUSES, STATUS_LABELS, type TickerStatus } from "@/lib/constants";

function SortIcon({ isSorted }: { isSorted: false | "asc" | "desc" }) {
  if (!isSorted) return <ArrowUpDown className="ml-1 h-3 w-3 opacity-40" />;
  return isSorted === "asc"
    ? <ArrowUp className="ml-1 h-3 w-3" />
    : <ArrowDown className="ml-1 h-3 w-3" />;
}

const FILTER_OPTIONS = ["all", ...TICKER_STATUSES] as const;

function ScorecardCell({ total }: { total: number | undefined }) {
  if (total == null) return <span className="text-muted-foreground text-sm">—</span>;
  const color = total >= 40 ? "text-emerald-600 font-semibold" : total >= 24 ? "text-amber-600 font-medium" : "text-red-500 font-medium";
  return <span className={cn("text-sm tabular-nums font-mono", color)}>{total}<span className="text-muted-foreground font-normal text-xs">/60</span></span>;
}

function buildColumns(onDelete: (t: Ticker) => void, scorecardTotals: Record<string, number>): ColumnDef<Ticker>[] {
  return [
    {
      accessorKey: "symbol",
      header: "Symbol",
      cell: ({ row }) => (
        <span className="font-mono font-medium text-[13px]">{row.original.symbol}</span>
      ),
    },
    {
      accessorKey: "company_name",
      header: "Company",
      cell: ({ row }) => (
        <span className="text-[14px] max-w-[200px] truncate block">{row.original.company_name}</span>
      ),
    },
    {
      accessorKey: "current_price",
      header: "Current Price",
      cell: ({ row }) => {
        const price = row.original.current_price;
        return price != null ? (
          <span className="font-mono text-[13px] tabular-nums">${price.toFixed(2)}</span>
        ) : (
          <span className="font-mono text-[13px] text-muted-foreground">—</span>
        );
      },
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => <StatusBadge status={row.original.status} />,
    },
    {
      accessorKey: "confidence_score",
      header: "Confidence",
      cell: ({ row }) => <ScoreBadge score={row.original.confidence_score} />,
    },
    {
      accessorKey: "price_score",
      header: "Price",
      cell: ({ row }) => <ScoreBadge score={row.original.price_score} />,
    },
    {
      id: "scorecard",
      header: "Scorecard",
      cell: ({ row }) => <ScorecardCell total={scorecardTotals[row.original.id]} />,
    },
    {
      accessorKey: "last_earnings_date",
      header: "Last Earnings",
      cell: ({ row }) => (
        <span className="font-mono text-[13px] text-muted-foreground">
          {formatDate(row.original.last_earnings_date) ?? "—"}
        </span>
      ),
    },
    {
      accessorKey: "next_earnings_date",
      header: "Next Earnings",
      cell: ({ row }) => {
        const date = row.original.next_earnings_date;
        const soon = date && new Date(date) <= new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);
        return (
          <span className={cn("font-mono text-[13px] inline-flex items-center gap-1.5",
            soon ? "text-upcoming font-medium" : "text-muted-foreground"
          )}>
            {formatDate(date) ?? "—"}
            {soon && (
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-upcoming/15 text-upcoming font-sans">
                soon
              </span>
            )}
          </span>
        );
      },
    },
    {
      id: "actions",
      header: "",
      cell: ({ row }) => (
        <div className="flex items-center justify-end gap-1">
          <button
            onClick={(e) => { e.stopPropagation(); onDelete(row.original); }}
            className="p-1.5 rounded text-muted-foreground opacity-0 group-hover:opacity-100 hover:text-destructive hover:bg-destructive/10 transition-all"
            aria-label="Delete ticker"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
          <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/40" />
        </div>
      ),
    },
  ];
}

interface TickerTableProps {
  tickers: Ticker[];
  scorecardTotals: Record<string, number>;
}

export function TickerTable({ tickers, scorecardTotals }: TickerTableProps) {
  const router = useRouter();
  const [sorting, setSorting] = useState<SortingState>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [refreshing, setRefreshing] = useState(false);
  const [refreshingPrices, setRefreshingPrices] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<Ticker | null>(null);
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    if (!confirmDelete) return;
    setDeleting(true);
    const { error } = await supabase.from("tickers").delete().eq("id", confirmDelete.id);
    setDeleting(false);
    setConfirmDelete(null);
    if (error) {
      toast.error("Failed to delete: " + error.message);
    } else {
      toast.success(`${confirmDelete.symbol} deleted`);
      router.refresh();
    }
  }

  const filtered = useMemo(() => {
    let rows = tickers;
    if (statusFilter !== "all") rows = rows.filter((t) => t.status === statusFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      rows = rows.filter(
        (t) => t.symbol.toLowerCase().includes(q) || t.company_name.toLowerCase().includes(q)
      );
    }
    return rows;
  }, [tickers, search, statusFilter]);

  const columns = useMemo(() => buildColumns(setConfirmDelete, scorecardTotals), [scorecardTotals]);

  const table = useReactTable({
    data: filtered,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
  });

  async function handleRefreshPrices() {
    setRefreshingPrices(true);
    try {
      const res = await fetch("/api/price_refresh", { method: "POST" });
      const data = await res.json();
      toast.success(`Updated prices for ${data.refreshed} tickers`);
      router.refresh();
    } catch {
      toast.error("Failed to refresh prices");
    } finally {
      setRefreshingPrices(false);
    }
  }

  async function handleRefresh() {
    setRefreshing(true);
    try {
      const res = await fetch("/api/earnings_refresh", { method: "POST" });
      const data = await res.json();
      toast.success(`Refreshed earnings dates for ${data.refreshed} tickers`);
      router.refresh();
    } catch {
      toast.error("Failed to refresh earnings dates");
    } finally {
      setRefreshing(false);
    }
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Page header */}
      <div className="bg-card border-b border-border px-10 pt-8 pb-6 shrink-0">
        <h1 className="text-[22px] font-semibold tracking-tight text-foreground">Dashboard</h1>
        <p className="text-[13px] text-muted-foreground mt-1">All investment ideas and holdings</p>
        <div className="flex items-center gap-3 mt-5 flex-wrap">
          {/* Search */}
          <div className="relative w-[260px]">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search symbol or company…"
              className="w-full pl-8 pr-3 py-2 text-[13px] border border-border rounded-lg bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
            />
          </div>
          {/* Status filter pills */}
          <div className="flex gap-1">
            {FILTER_OPTIONS.map((s) => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={cn(
                  "px-3.5 py-[7px] rounded-md border text-xs font-medium transition-colors",
                  statusFilter === s
                    ? "border-primary/40 bg-primary/10 text-primary"
                    : "border-border text-muted-foreground hover:text-foreground"
                )}
              >
                {s === "all" ? "All" : STATUS_LABELS[s as TickerStatus]}
              </button>
            ))}
          </div>
          {/* Actions */}
          <div className="ml-auto flex gap-2">
            <Button variant="outline" size="sm" onClick={handleRefreshPrices} disabled={refreshingPrices}>
              <DollarSign className={cn("h-4 w-4", refreshingPrices && "animate-pulse")} />
              Refresh prices
            </Button>
            <Button variant="outline" size="sm" onClick={handleRefresh} disabled={refreshing}>
              <RefreshCw className={cn("h-4 w-4", refreshing && "animate-spin")} />
              Refresh earnings
            </Button>
            <NewTickerDialog />
          </div>
        </div>
      </div>

      {/* Scrollable table */}
      <div className="flex-1 overflow-auto">
        <table className="w-full text-sm">
          <thead className="border-b border-border bg-background sticky top-0 z-10">
            {table.getHeaderGroups().map((hg) => (
              <tr key={hg.id}>
                {hg.headers.map((header) => (
                  <th
                    key={header.id}
                    className="px-5 py-3 text-left text-[11px] font-semibold tracking-[0.06em] text-muted-foreground uppercase cursor-pointer select-none hover:text-foreground whitespace-nowrap"
                    onClick={header.column.getToggleSortingHandler()}
                  >
                    <span className="inline-flex items-center">
                      {flexRender(header.column.columnDef.header, header.getContext())}
                      <SortIcon isSorted={header.column.getIsSorted()} />
                    </span>
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody className="divide-y divide-border">
            {table.getRowModel().rows.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-5 py-12 text-center text-muted-foreground text-sm">
                  {tickers.length === 0 ? "No tickers yet — add one to get started." : "No results match your filters."}
                </td>
              </tr>
            ) : (
              table.getRowModel().rows.map((row) => (
                <tr
                  key={row.id}
                  className="group hover:bg-muted/40 cursor-pointer transition-colors"
                  onClick={() => router.push(`/ticker/${row.original.id}`)}
                >
                  {row.getVisibleCells().map((cell) => (
                    <td key={cell.id} className="px-5 py-[18px]">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>

        <p className="text-xs text-muted-foreground px-5 py-3">
          {filtered.length} of {tickers.length} tickers
        </p>
      </div>

      {/* Delete confirmation */}
      <Dialog open={!!confirmDelete} onOpenChange={(o) => { if (!o) setConfirmDelete(null); }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete {confirmDelete?.symbol}?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            This will permanently delete <strong>{confirmDelete?.company_name}</strong> and all its writeups, earnings summaries, and attachments.
          </p>
          <div className="flex justify-end gap-2 mt-2">
            <Button variant="outline" size="sm" onClick={() => setConfirmDelete(null)} disabled={deleting}>
              Cancel
            </Button>
            <Button variant="destructive" size="sm" onClick={handleDelete} disabled={deleting}>
              {deleting ? "Deleting…" : "Delete"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
