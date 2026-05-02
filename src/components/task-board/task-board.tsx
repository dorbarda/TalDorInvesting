"use client";

import { useMemo, useState } from "react";
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

const COLUMNS = [
  { id: "thesis", title: "Write Main Thesis", icon: BookOpen, emptyMessage: "No tickers to track." },
  { id: "prepForEarnings", title: "Prepare for Earnings", icon: Zap, emptyMessage: "No earnings in the next 7 days." },
  { id: "summarizeEarnings", title: "Summarize Earnings", icon: FileText, emptyMessage: "No past earnings to summarize." },
] as const;

type ColumnId = typeof COLUMNS[number]["id"];

export function TaskBoard({ tickers, writeupCounts, summaryKeys }: TaskBoardProps) {
  const [activeTab, setActiveTab] = useState<ColumnId>("thesis");

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

  const columnTasks: Record<ColumnId, TickerTaskData[]> = {
    thesis: thesisTasks,
    prepForEarnings: prepTasks,
    summarizeEarnings: summarizeTasks,
  };

  const pct = stats.total > 0 ? Math.round((stats.done / stats.total) * 100) : 0;

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="bg-card border-b border-border px-4 sm:px-6 lg:px-10 pt-5 sm:pt-8 pb-4 sm:pb-6 shrink-0">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-[18px] sm:text-[22px] font-semibold tracking-tight text-foreground">
              Task Board
            </h1>
            <p className="text-[12px] sm:text-[13px] text-muted-foreground mt-1">
              Tasks auto-complete when content is added to a ticker.
            </p>
          </div>
          <div className="text-right shrink-0">
            <div className="text-[20px] sm:text-[24px] font-semibold tabular-nums leading-none">
              {stats.done}
              <span className="text-muted-foreground text-[13px] sm:text-[15px] font-normal">
                {" "}/ {stats.total}
              </span>
            </div>
            <div className="text-[11px] sm:text-[12px] text-muted-foreground mt-0.5">tasks complete</div>
            <div className="mt-2 w-[100px] sm:w-[140px] h-1.5 bg-muted rounded-full overflow-hidden ml-auto">
              <div
                className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        </div>

        {/* Mobile tabs */}
        <div className="flex lg:hidden mt-4 gap-1 border-b border-border -mx-4 sm:-mx-6 px-4 sm:px-6">
          {COLUMNS.map(({ id, title, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={`flex items-center gap-1.5 px-3 py-2 text-[12px] font-medium border-b-2 transition-colors whitespace-nowrap -mb-px ${
                activeTab === id
                  ? "border-foreground text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              <Icon className="h-3.5 w-3.5 shrink-0" />
              <span className="hidden sm:inline">{title}</span>
              <span className="sm:hidden">
                {id === "thesis" ? "Thesis" : id === "prepForEarnings" ? "Earnings" : "Summary"}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Desktop: 3 columns */}
      <div className="hidden lg:flex flex-1 overflow-hidden">
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

      {/* Mobile/tablet: single active column */}
      <div className="flex lg:hidden flex-1 overflow-hidden">
        {COLUMNS.map(({ id, title, icon, emptyMessage }) =>
          activeTab === id ? (
            <TaskColumn
              key={id}
              title={title}
              icon={icon}
              tasks={columnTasks[id]}
              taskKey={id}
              emptyMessage={emptyMessage}
            />
          ) : null
        )}
      </div>
    </div>
  );
}
