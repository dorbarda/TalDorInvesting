"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  startOfMonth, endOfMonth, startOfWeek, endOfWeek,
  eachDayOfInterval, format, isSameMonth, isToday,
  addMonths, subMonths, parseISO,
} from "date-fns";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Ticker } from "@/types/database";
import { type TickerStatus } from "@/lib/constants";

const CAL_COLORS: Record<TickerStatus, string> = {
  holding:  "bg-emerald-600 hover:bg-emerald-700 text-white",
  watching: "bg-blue-600 hover:bg-blue-700 text-white",
  passed:   "bg-gray-400 hover:bg-gray-500 text-white",
  exited:   "bg-amber-500 hover:bg-amber-600 text-white",
};

const DOT_COLORS: Record<TickerStatus, string> = {
  holding:  "bg-emerald-600",
  watching: "bg-blue-600",
  passed:   "bg-gray-400",
  exited:   "bg-amber-500",
};

const STATUSES: TickerStatus[] = ["holding", "watching", "passed", "exited"];
const STATUS_LABELS: Record<TickerStatus, string> = {
  holding: "Holding", watching: "Watching", passed: "Passed", exited: "Exited",
};
const HEADERS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function EarningsCalendar({ tickers }: { tickers: Ticker[] }) {
  const router = useRouter();
  const [month, setMonth] = useState(new Date());
  const [statusFilter, setStatusFilter] = useState<TickerStatus | "all">("all");

  const visible = useMemo(
    () => statusFilter === "all" ? tickers : tickers.filter((t) => t.status === statusFilter),
    [tickers, statusFilter]
  );

  const eventsByDate = useMemo(() => {
    const map = new Map<string, Ticker[]>();
    visible.forEach((t) => {
      if (!t.next_earnings_date) return;
      const arr = map.get(t.next_earnings_date) ?? [];
      arr.push(t);
      map.set(t.next_earnings_date, arr);
    });
    return map;
  }, [visible]);

  const days = useMemo(() => {
    const ms = startOfMonth(month);
    const me = endOfMonth(month);
    return eachDayOfInterval({
      start: startOfWeek(ms, { weekStartsOn: 0 }),
      end: endOfWeek(me, { weekStartsOn: 0 }),
    });
  }, [month]);

  const today = format(new Date(), "yyyy-MM-dd");

  const upcoming = useMemo(
    () =>
      visible
        .filter((t) => t.next_earnings_date && t.next_earnings_date >= today)
        .sort((a, b) => (a.next_earnings_date ?? "").localeCompare(b.next_earnings_date ?? "")),
    [visible, today]
  );

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Page header */}
      <div className="bg-card border-b border-border px-10 pt-8 pb-6 shrink-0">
        <h1 className="text-[22px] font-semibold tracking-tight text-foreground">Earnings Calendar</h1>
        <p className="text-[13px] text-muted-foreground mt-1">
          Click any event to open the ticker.
        </p>
        <div className="flex items-center gap-4 mt-5 flex-wrap">
          {/* Month navigation */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setMonth((m) => subMonths(m, 1))}
              className="w-[30px] h-[30px] flex items-center justify-center rounded-md border border-border text-foreground hover:bg-muted transition-colors"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="min-w-[130px] text-center font-semibold text-[15px] select-none">
              {format(month, "MMMM yyyy")}
            </span>
            <button
              onClick={() => setMonth((m) => addMonths(m, 1))}
              className="w-[30px] h-[30px] flex items-center justify-center rounded-md border border-border text-foreground hover:bg-muted transition-colors"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
            <button
              onClick={() => setMonth(new Date())}
              className="px-3 py-1.5 text-xs text-muted-foreground border border-border rounded-md hover:text-foreground transition-colors"
            >
              Today
            </button>
          </div>

          {/* Legend + filter */}
          <div className="ml-auto flex items-center gap-5">
            <div className="flex items-center gap-4">
              {STATUSES.map((s) => (
                <span key={s} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <span className={cn("h-2 w-2 rounded-full", DOT_COLORS[s])} />
                  {STATUS_LABELS[s]}
                </span>
              ))}
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as TickerStatus | "all")}
              className="px-2.5 py-1.5 text-xs border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
            >
              <option value="all">All statuses</option>
              {STATUSES.map((s) => (
                <option key={s} value={s}>{STATUS_LABELS[s]}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Scrollable calendar */}
      <div className="flex-1 overflow-auto px-6 pb-6">
        {/* Day headers */}
        <div className="grid grid-cols-7 border-b border-border">
          {HEADERS.map((d) => (
            <div key={d} className="py-3 text-center text-[11px] font-semibold tracking-[0.06em] uppercase text-muted-foreground">
              {d}
            </div>
          ))}
        </div>

        {/* Day cells */}
        <div className="grid grid-cols-7">
          {days.map((day, i) => {
            const key = format(day, "yyyy-MM-dd");
            const events = eventsByDate.get(key) ?? [];
            const inMonth = isSameMonth(day, month);
            const todayCell = isToday(day);
            const lastCol = (i + 1) % 7 === 0;

            return (
              <div
                key={key}
                className={cn(
                  "min-h-[100px] p-2 border-b border-border flex flex-col gap-1",
                  !lastCol && "border-r border-border",
                  inMonth ? "bg-card" : "bg-background"
                )}
              >
                <div className="flex justify-center mb-1">
                  <span className={cn(
                    "h-[26px] w-[26px] flex items-center justify-center rounded-full text-[13px] select-none",
                    todayCell
                      ? "bg-foreground text-background font-semibold"
                      : inMonth
                      ? "text-foreground"
                      : "text-muted-foreground/40"
                  )}>
                    {format(day, "d")}
                  </span>
                </div>
                <div className="flex flex-col gap-0.5">
                  {events.map((t) => (
                    <button
                      key={t.id}
                      onClick={() => router.push(`/ticker/${t.id}`)}
                      title={`${t.symbol} — ${t.company_name}`}
                      className={cn(
                        "w-full text-left px-2 py-0.5 rounded text-[12px] font-medium truncate font-mono tracking-wide transition-colors",
                        CAL_COLORS[t.status]
                      )}
                    >
                      {t.symbol}
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {/* Upcoming list */}
        {upcoming.length > 0 && (
          <div className="mt-6 flex flex-col gap-1">
            <h3 className="text-xs font-semibold uppercase tracking-[0.06em] text-muted-foreground mb-2">
              Upcoming earnings
            </h3>
            {upcoming.map((t) => (
              <button
                key={t.id}
                onClick={() => router.push(`/ticker/${t.id}`)}
                className="flex items-center gap-3 text-sm hover:bg-muted/50 rounded-md px-2 py-1.5 transition-colors text-left w-full"
              >
                <span className={cn("h-2 w-2 rounded-full shrink-0", DOT_COLORS[t.status])} />
                <span className="font-mono font-medium w-16 text-[13px]">{t.symbol}</span>
                <span className="text-muted-foreground flex-1 truncate text-[13px]">{t.company_name}</span>
                <span className="text-muted-foreground tabular-nums text-xs shrink-0 font-mono">
                  {format(parseISO(t.next_earnings_date!), "MMM d, yyyy")}
                </span>
              </button>
            ))}
          </div>
        )}

        {upcoming.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-6">
            No upcoming earnings dates.
          </p>
        )}
      </div>
    </div>
  );
}
