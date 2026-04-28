"use client";

import { useRouter } from "next/navigation";
import { format, parseISO } from "date-fns";
import { Check, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import type { TickerTaskData } from "./task-board";

type TaskKey = "thesis" | "prepForEarnings" | "summarizeEarnings";

interface TaskCardProps {
  data: TickerTaskData;
  taskKey: TaskKey;
}

export function TaskCard({ data, taskKey }: TaskCardProps) {
  const router = useRouter();
  const { ticker } = data;

  const status = data[taskKey] as "done" | "todo";
  const isDone = status === "done";

  const isUrgent =
    taskKey === "prepForEarnings" && !isDone && (data.daysUntilEarnings ?? 99) <= 2;

  const meta = (() => {
    if (taskKey === "thesis") {
      if (isDone) return `${data.writeupCount} writeup${data.writeupCount !== 1 ? "s" : ""}`;
      return "No writeups yet";
    }
    if (taskKey === "prepForEarnings") {
      const dateStr = ticker.next_earnings_date
        ? format(parseISO(ticker.next_earnings_date), "MMM d")
        : "";
      if (isDone) return `Prep note written · ${dateStr}`;
      const days = data.daysUntilEarnings;
      if (days === 0) return `Earnings today · ${dateStr}`;
      if (days === 1) return `Tomorrow · ${dateStr}`;
      return `${days}d away · ${dateStr}`;
    }
    if (taskKey === "summarizeEarnings") {
      const dateStr = ticker.last_earnings_date
        ? format(parseISO(ticker.last_earnings_date), "MMM d, yyyy")
        : "";
      if (isDone) return `Summary written · ${dateStr}`;
      return `Missing summary · ${dateStr}`;
    }
  })();

  return (
    <button
      onClick={() => router.push(`/ticker/${ticker.id}`)}
      className={cn(
        "w-full text-left rounded-lg border bg-card p-3.5 transition-all duration-150",
        "hover:shadow-sm hover:-translate-y-px active:translate-y-0",
        isDone
          ? "border-l-[3px] border-l-emerald-500/60 opacity-60 hover:opacity-80"
          : isUrgent
          ? "border-l-[3px] border-l-red-500 border-border"
          : "border-l-[3px] border-l-amber-400 border-border"
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-1.5 min-w-0">
          <span className="font-mono font-semibold text-[13px] text-foreground tracking-wide">
            {ticker.symbol}
          </span>
          <span
            className={cn(
              "shrink-0 text-[10px] px-1.5 py-0.5 rounded font-medium",
              ticker.status === "holding"
                ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400"
                : "bg-blue-500/15 text-blue-700 dark:text-blue-400"
            )}
          >
            {ticker.status}
          </span>
        </div>
        <span
          className={cn(
            "shrink-0 flex items-center gap-1 text-[11px] font-medium",
            isDone
              ? "text-emerald-600 dark:text-emerald-400"
              : "text-amber-600 dark:text-amber-400"
          )}
        >
          {isDone ? (
            <>
              <Check className="h-3 w-3" />
              Done
            </>
          ) : (
            <>
              <Clock className="h-3 w-3" />
              Todo
            </>
          )}
        </span>
      </div>

      <p className="mt-1 text-[12px] text-muted-foreground truncate">{ticker.company_name}</p>

      <p
        className={cn(
          "mt-2 text-[11px] font-medium",
          isDone
            ? "text-muted-foreground"
            : isUrgent
            ? "text-red-500 dark:text-red-400"
            : "text-amber-600 dark:text-amber-500"
        )}
      >
        {meta}
      </p>
    </button>
  );
}
