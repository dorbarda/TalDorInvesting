import { createServerClient } from "@/lib/supabase/server";
import { TaskBoard } from "@/components/task-board/task-board";
import type { Ticker } from "@/types/database";

export const revalidate = 0;

export default async function TaskBoardPage() {
  const supabase = createServerClient();

  const { data: tickers, error } = await supabase
    .from("tickers")
    .select("*")
    .in("status", ["holding", "watching"])
    .order("symbol")
    .returns<Ticker[]>();

  if (error) {
    return (
      <div className="text-destructive text-sm p-10">
        Failed to load tickers: {error.message}
      </div>
    );
  }

  const tickerIds = (tickers ?? []).map((t: Ticker) => t.id);

  const [{ data: writeups }, { data: summaries }] = await Promise.all([
    supabase
      .from("writeups")
      .select("ticker_id")
      .in("ticker_id", tickerIds)
      .returns<{ ticker_id: string }[]>(),
    supabase
      .from("earnings_summaries")
      .select("ticker_id, earnings_date")
      .in("ticker_id", tickerIds)
      .returns<{ ticker_id: string; earnings_date: string }[]>(),
  ]);

  const writeupCounts: Record<string, number> = {};
  (writeups ?? []).forEach((w) => {
    writeupCounts[w.ticker_id] = (writeupCounts[w.ticker_id] ?? 0) + 1;
  });

  const summaryKeys = (summaries ?? []).map(
    (s) => `${s.ticker_id}:${s.earnings_date}`
  );

  return (
    <TaskBoard
      tickers={tickers ?? []}
      writeupCounts={writeupCounts}
      summaryKeys={summaryKeys}
    />
  );
}
