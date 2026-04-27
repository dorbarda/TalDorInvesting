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
import { ArrowUpDown, ArrowUp, ArrowDown, RefreshCw, DollarSign } from "lucide-react";
import { toast } from "sonner";
import { type Ticker } from "@/types/database";
import { StatusBadge } from "@/components/ticker/status-badge";
import { ScoreBadge } from "@/components/ticker/score-badge";
import { TickerFilters } from "@/components/dashboard/ticker-filters";
import { NewTickerDialog } from "@/components/dashboard/new-ticker-dialog";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/utils";
import { cn } from "@/lib/utils";

function SortIcon({ isSorted }: { isSorted: false | "asc" | "desc" }) {
  if (!isSorted) return <ArrowUpDown className="ml-1 h-3 w-3 opacity-40" />;
  return isSorted === "asc"
    ? <ArrowUp className="ml-1 h-3 w-3" />
    : <ArrowDown className="ml-1 h-3 w-3" />;
}

const columns: ColumnDef<Ticker>[] = [
  {
    accessorKey: "symbol",
    header: "Symbol",
    cell: ({ row }) => (
      <span className="font-mono font-semibold text-sm">{row.original.symbol}</span>
    ),
  },
  {
    accessorKey: "company_name",
    header: "Company",
    cell: ({ row }) => (
      <span className="text-sm max-w-[200px] truncate block">{row.original.company_name}</span>
    ),
  },
  {
    accessorKey: "current_price",
    header: "Current Price",
    cell: ({ row }) => {
      const price = row.original.current_price;
      return price != null ? (
        <span className="text-sm font-mono tabular-nums">${price.toFixed(2)}</span>
      ) : (
        <span className="text-sm text-muted-foreground">—</span>
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
    accessorKey: "five_pillars_score",
    header: "5 Pillars",
    cell: ({ row }) => <ScoreBadge score={row.original.five_pillars_score} />,
  },
  {
    accessorKey: "last_earnings_date",
    header: "Last Earnings",
    cell: ({ row }) => (
      <span className="text-sm text-muted-foreground tabular-nums">{formatDate(row.original.last_earnings_date)}</span>
    ),
  },
  {
    accessorKey: "next_earnings_date",
    header: "Next Earnings",
    cell: ({ row }) => {
      const date = row.original.next_earnings_date;
      const isUpcoming = date && new Date(date) <= new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
      return (
        <span className={cn("text-sm tabular-nums", isUpcoming ? "text-amber-600 font-medium" : "text-muted-foreground")}>
          {formatDate(date)}
        </span>
      );
    },
  },
];

interface TickerTableProps {
  tickers: Ticker[];
}

export function TickerTable({ tickers }: TickerTableProps) {
  const router = useRouter();
  const [sorting, setSorting] = useState<SortingState>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [refreshing, setRefreshing] = useState(false);
  const [refreshingPrices, setRefreshingPrices] = useState(false);

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
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <TickerFilters
          search={search}
          status={statusFilter}
          onSearchChange={setSearch}
          onStatusChange={setStatusFilter}
        />
        <div className="flex gap-2">
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

      <div className="rounded-md border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="border-b bg-muted/40">
            {table.getHeaderGroups().map((hg) => (
              <tr key={hg.id}>
                {hg.headers.map((header) => (
                  <th
                    key={header.id}
                    className="px-3 py-2.5 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide cursor-pointer select-none hover:text-foreground"
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
          <tbody className="divide-y">
            {table.getRowModel().rows.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-3 py-10 text-center text-muted-foreground text-sm">
                  {tickers.length === 0 ? "No tickers yet — add one to get started." : "No results match your filters."}
                </td>
              </tr>
            ) : (
              table.getRowModel().rows.map((row) => (
                <tr
                  key={row.id}
                  className="hover:bg-muted/30 cursor-pointer transition-colors"
                  onClick={() => router.push(`/ticker/${row.original.id}`)}
                >
                  {row.getVisibleCells().map((cell) => (
                    <td key={cell.id} className="px-3 py-2.5">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-muted-foreground">
        {filtered.length} of {tickers.length} tickers
      </p>
    </div>
  );
}
