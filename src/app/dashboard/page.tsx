import { createServerClient } from "@/lib/supabase/server";
import { TickerTable } from "@/components/dashboard/ticker-table";
import { computeScorecardTotal } from "@/lib/scorecard";
import type { Ticker, InvestmentScorecard } from "@/types/database";

export const revalidate = 0;

export default async function DashboardPage() {
  const supabase = createServerClient();

  const [tickersRes, scorecardsRes] = await Promise.all([
    supabase.from("tickers").select("*").order("created_at", { ascending: false }).returns<Ticker[]>(),
    supabase.from("investment_scorecards").select("*").returns<InvestmentScorecard[]>(),
  ]);

  if (tickersRes.error) {
    return (
      <div className="text-destructive text-sm p-10">
        Failed to load tickers: {tickersRes.error.message}
      </div>
    );
  }

  const scorecardTotals: Record<string, number> = {};
  for (const sc of (scorecardsRes.data ?? []) as InvestmentScorecard[]) {
    scorecardTotals[sc.ticker_id] = computeScorecardTotal(sc);
  }

  return <TickerTable tickers={tickersRes.data ?? []} scorecardTotals={scorecardTotals} />;
}
