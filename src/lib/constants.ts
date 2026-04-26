export const TICKER_STATUSES = ["holding", "watching", "passed", "exited"] as const;
export type TickerStatus = (typeof TICKER_STATUSES)[number];

export const STATUS_LABELS: Record<TickerStatus, string> = {
  holding: "Holding",
  watching: "Watching",
  passed: "Passed",
  exited: "Exited",
};

export const STATUS_COLORS: Record<TickerStatus, string> = {
  holding: "bg-emerald-100 text-emerald-800",
  watching: "bg-blue-100 text-blue-800",
  passed: "bg-slate-100 text-slate-600",
  exited: "bg-amber-100 text-amber-800",
};
