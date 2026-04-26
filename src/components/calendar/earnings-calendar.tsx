"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  startOfMonth, endOfMonth, startOfWeek, endOfWeek,
  eachDayOfInterval, format, isSameMonth, isToday,
  addMonths, subMonths, parseISO,
} from "date-fns";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { Ticker } from "@/types/database";
import { type TickerStatus } from "@/lib/constants";

const PILL_COLORS: Record<TickerStatus, string> = {
  holding: "bg-emerald-500 text-white hover:bg-emerald-600",
  watching: "bg-blue-500 text-white hover:bg-blue-600",
  passed: "bg-slate-400 text-white hover:bg-slate-500",
  exited: "bg-amber-500 text-white hover:bg-amber-600",
};

const DOT_COLORS: Record<TickerStatus, string> = {
  holding: "bg-emerald-500",
  watching: "bg-blue-500",
  passed: "bg-slate-400",
  exited: "bg-amber-500",
};

const HEADERS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const STATUSES: TickerStatus[] = ["holding", "watching", "passed", "exited"];

export function EarningsCalendar({ tickers }: { tickers: Ticker[] }) {
  const router = useRouter();
  const [month, setMonth] = useState(new Date());
  const [holdingOnly, setHoldingOnly] = useState(false);

  const visible = useMemo(
    () => (holdingOnly ? tickers.filter((t) => t.status === "holding") : tickers),
    [tickers, holdingOnly]
  );

  // Map "YYYY-MM-DD" → Ticker[]
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
    <div className="flex flex-col gap-5">
      {/* Controls */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-1">
          <Button variant="outline" size="icon" onClick={() => setMonth((m) => subMonths(m, 1))}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-base font-semibold w-44 text-center select-none">
            {format(month, "MMMM yyyy")}
          </span>
          <Button variant="outline" size="icon" onClick={() => setMonth((m) => addMonths(m, 1))}>
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" className="ml-1 text-muted-foreground" onClick={() => setMonth(new Date())}>
            Today
          </Button>
        </div>

        <div className="flex items-center gap-4">
          {/* Legend */}
          <div className="flex items-center gap-3">
            {STATUSES.map((s) => (
              <div key={s} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <span className={cn("h-2 w-2 rounded-sm", DOT_COLORS[s])} />
                <span className="capitalize">{s}</span>
              </div>
            ))}
          </div>

          <Button
            variant={holdingOnly ? "default" : "outline"}
            size="sm"
            onClick={() => setHoldingOnly((v) => !v)}
          >
            {holdingOnly ? "Holding only" : "All statuses"}
          </Button>
        </div>
      </div>

      {/* Calendar grid */}
      <div className="border rounded-lg overflow-hidden">
        {/* Day headers */}
        <div className="grid grid-cols-7 border-b bg-muted/30">
          {HEADERS.map((d) => (
            <div key={d} className="py-2 text-xs font-medium text-muted-foreground text-center">
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
                  "min-h-[96px] p-1.5 border-b flex flex-col gap-1",
                  !lastCol && "border-r",
                  !inMonth && "bg-muted/10"
                )}
              >
                <span
                  className={cn(
                    "h-6 w-6 flex items-center justify-center rounded-full text-xs font-medium self-start",
                    todayCell
                      ? "bg-foreground text-background"
                      : inMonth
                      ? "text-foreground"
                      : "text-muted-foreground/40"
                  )}
                >
                  {format(day, "d")}
                </span>

                <div className="flex flex-col gap-0.5 overflow-hidden">
                  {events.map((t) => (
                    <button
                      key={t.id}
                      onClick={() => router.push(`/ticker/${t.id}`)}
                      title={`${t.symbol} — ${t.company_name}`}
                      className={cn(
                        "text-left px-1.5 py-0.5 rounded text-xs font-semibold truncate transition-colors",
                        PILL_COLORS[t.status]
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
      </div>

      {/* Upcoming list */}
      {upcoming.length > 0 && (
        <div className="flex flex-col gap-1">
          <h3 className="text-sm font-medium text-muted-foreground mb-1">Upcoming earnings</h3>
          {upcoming.map((t) => (
            <button
              key={t.id}
              onClick={() => router.push(`/ticker/${t.id}`)}
              className="flex items-center gap-3 text-sm hover:bg-muted/50 rounded-md px-2 py-1.5 transition-colors text-left w-full"
            >
              <span className={cn("h-2 w-2 rounded-full shrink-0", DOT_COLORS[t.status])} />
              <span className="font-mono font-semibold w-16">{t.symbol}</span>
              <span className="text-muted-foreground flex-1 truncate">{t.company_name}</span>
              <span className="text-muted-foreground tabular-nums text-xs shrink-0">
                {format(parseISO(t.next_earnings_date!), "MMM d, yyyy")}
              </span>
            </button>
          ))}
        </div>
      )}

      {upcoming.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-4">
          No upcoming earnings dates.{" "}
          {tickers.some((t) => !t.next_earnings_date) && (
            <span>Use the dashboard Refresh button to fetch them.</span>
          )}
        </p>
      )}
    </div>
  );
}
