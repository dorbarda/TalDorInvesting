import { notFound } from "next/navigation";
import { createServerClient } from "@/lib/supabase/server";
import { TickerHeader } from "@/components/ticker/ticker-header";
import { TickerTabs } from "@/components/ticker/ticker-tabs";
import type {
  Ticker, Writeup, EarningsSummary, Attachment, InvestmentScorecard,
  Kpi, KpiObservation, ValuationMethod,
} from "@/types/database";

export const revalidate = 0;

export default async function TickerPage({ params }: { params: { id: string } }) {
  const supabase = createServerClient();

  const [
    tickerRes, writeupsRes, earningsRes, attachmentsRes, scorecardRes,
    kpisRes, valuationRes,
  ] = await Promise.all([
    supabase.from("tickers").select("*").eq("id", params.id).single(),
    supabase.from("writeups").select("*").eq("ticker_id", params.id).order("version", { ascending: false }),
    supabase.from("earnings_summaries").select("*").eq("ticker_id", params.id).order("earnings_date", { ascending: false }),
    supabase.from("attachments").select("*").eq("ticker_id", params.id).order("created_at", { ascending: false }),
    supabase.from("investment_scorecards").select("*").eq("ticker_id", params.id).maybeSingle(),
    supabase.from("kpis").select("*").eq("ticker_id", params.id).order("display_order", { ascending: true }),
    supabase.from("valuation_methods").select("*").eq("ticker_id", params.id).maybeSingle(),
  ]);

  if (tickerRes.error || !tickerRes.data) notFound();

  const ticker = tickerRes.data as Ticker;
  const kpis = (kpisRes.data ?? []) as Kpi[];

  const observationsRes = kpis.length
    ? await supabase
        .from("kpi_observations")
        .select("*")
        .in("kpi_id", kpis.map((k) => k.id))
        .order("period_sort", { ascending: false })
    : { data: [] as KpiObservation[] };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Sticky header: back + symbol + metrics */}
      <div className="bg-card border-b border-border shrink-0">
        <TickerHeader ticker={ticker} scorecard={scorecardRes.data as InvestmentScorecard | null} />
        {/* Tab bar rendered by TickerTabs sits right below */}
      </div>

      {/* Scrollable content area */}
      <div className="flex-1 overflow-auto">
        <TickerTabs
          ticker={ticker}
          writeups={(writeupsRes.data ?? []) as Writeup[]}
          earnings={(earningsRes.data ?? []) as EarningsSummary[]}
          attachments={(attachmentsRes.data ?? []) as Attachment[]}
          scorecard={scorecardRes.data as InvestmentScorecard | null}
          kpis={kpis}
          kpiObservations={(observationsRes.data ?? []) as KpiObservation[]}
          valuation={valuationRes.data as ValuationMethod | null}
        />
      </div>
    </div>
  );
}
