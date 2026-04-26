import { notFound } from "next/navigation";
import { createServerClient } from "@/lib/supabase/server";
import { TickerHeader } from "@/components/ticker/ticker-header";
import { TickerTabs } from "@/components/ticker/ticker-tabs";
import type { Ticker, Writeup, EarningsSummary, Attachment } from "@/types/database";

export const revalidate = 0;

export default async function TickerPage({ params }: { params: { id: string } }) {
  const supabase = createServerClient();

  const [tickerRes, writeupsRes, earningsRes, attachmentsRes] = await Promise.all([
    supabase.from("tickers").select("*").eq("id", params.id).single(),
    supabase.from("writeups").select("*").eq("ticker_id", params.id).order("version", { ascending: false }),
    supabase.from("earnings_summaries").select("*").eq("ticker_id", params.id).order("earnings_date", { ascending: false }),
    supabase.from("attachments").select("*").eq("ticker_id", params.id).order("created_at", { ascending: false }),
  ]);

  if (tickerRes.error || !tickerRes.data) notFound();

  return (
    <div className="flex flex-col gap-6">
      <TickerHeader ticker={tickerRes.data as Ticker} />
      <TickerTabs
        ticker={tickerRes.data as Ticker}
        writeups={(writeupsRes.data ?? []) as Writeup[]}
        earnings={(earningsRes.data ?? []) as EarningsSummary[]}
        attachments={(attachmentsRes.data ?? []) as Attachment[]}
      />
    </div>
  );
}
