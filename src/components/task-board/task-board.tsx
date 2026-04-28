"use client";

import { useMemo } from "react";
import { differenceInDays, parseISO } from "date-fns";
import { BookOpen, Zap, FileText } from "lucide-react";
import type { Ticker } from "@/types/database";
import { TaskColumn } from "./task-column";

export type TaskStatus = "done" | "todo" | "na";

export interface TickerTaskData {
  ticker: Ticker;
  thesis: "done" | "todo";
  writeupCount: number;
  prepForEarnings: TaskStatus;
  daysUntilEarnings: number | null;
  summarizeEarnings: TaskStatus;
}

interface TaskBoardProps {
  tickers: Ticker[];
  writeupCounts: Record<string, number>;
  summaryKeys: string[];
}

export function TaskBoard({ tickers, writeupCounts, summaryKeys }: TaskBoardProps) {
  const summaryKeySet = useMemo(() => new Set(summaryKeys), [summaryKeys]);

  const tasks = useMemo<TickerTaskData[]>(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return tickers.map((ticker) => {
      const writeupCount = writeupCounts[ticker.id] ?? 0;
      const thesis: "done" | "todo" = writeupCount > 0 ? "done" : "todo";

      let prepForEarnings: TaskStatus = "na";
      let daysUntilEarnings: number | null = null;
      if (ticker.next_earnings_date) {
        const earningsDate = parseISO(ticker.next_earnings_date);
        const days = differenceInDays(earningsDate, today);
        if (days >= 0 && days <= 7) {
          daysUntilEarnings = days;
          const key = `${ticker.id}:${ticker.next_earnings_date}`;
          prepForEarnings = summaryKeySet.has(key) ? "done" : "todo";
        }
      }

      let summarizeEarnings: TaskStatus = "na";
      if (ticker.last_earnings_date) {
        const key = `${ticker.id}:${ticker.last_earnings_date}`;
        summarizeEarnings = summaryKeySet.has(key) ? "done" : "todo";
      }

      return { ticker, thesis, writeupCount, prepForEarnings, daysUntilEarnings, summarizeEarnings };
    });
  }, [tickers, writeupCounts, summaryKeySet]);

  const stats = useMemo(() => {
    return tasks.reduce<{ total: number; done: number }>(
      (acc, t: TickerTaskData) => {
        acc.total += 1;
        if (t.thesis === "done") acc.done += 1;
        if (t.prepForEarnings !== "na") {
          acc.total += 1;
          if (t.prepForEarnings === "done") acc.done += 1;
        }
        if (t.summarizeEarnings !== "na") {
          acc.total += 1;
          if (t.summarizeEarnings === "done") acc.done += 1;
        }
        return acc;
      },
      { total: 0, done: 0 }
    );
  }, [tasks]);

  const thesisTasks = tasks;
  const prepTasks = tasks.filter((t: TickerTaskData) => t.prepForEarnings !== "na");
  const summarizeTasks = tasks.filter((t: TickerTaskData) => t.summarizeEarnings !== "na");

  const pct = stats.total > 0 ? Math.round((stats.done / stats.total) * 100) : 0;

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="bg-card border-b border-border px-10 pt-8 pb-6 shrink-0">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-[22px] font-semibold tracking-tight text-foreground">
              Task Board
            </h1>
            <p className="text-[13px] text-muted-foreground mt-1">
              Tasks auto-complete when content is added to a ticker.
            </p>
          </div>
          <div className="text-right shrink-0">
            <div className="text-[24px] font-semibold tabular-nums leading-none">
              {stats.done}
              <span className="text-muted-foreground text-[15px] font-normal">
                {" "}/ {stats.total}
              </span>
            </div>
            <div className="text-[12px] text-muted-foreground mt-0.5">tasks complete</div>
            <div className="mt-2 w-[140px] h-1.5 bg-muted rounded-full overflow-hidden ml-auto">
              <div
                className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Board columns */}
      <div className="flex-1 overflow-hidden flex">
        <TaskColumn
          title="Write Main Thesis"
          icon={BookOpen}
          tasks={thesisTasks}
          taskKey="thesis"
          emptyMessage="No tickers to track."
        />
        <TaskColumn
          title="Prepare for Earnings"
          icon={Zap}
          tasks={prepTasks}
          taskKey="prepForEarnings"
          emptyMessage="No earnings in the next 7 days."
        />
        <TaskColumn
          title="Summarize Earnings"
          icon={FileText}
          tasks={summarizeTasks}
          taskKey="summarizeEarnings"
          emptyMessage="No past earnings to summarize."
        />
      </div>
    </div>
  );
}
