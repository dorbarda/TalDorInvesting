import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { StatusBadge } from "@/components/ticker/status-badge";
import { formatDate } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { computeScorecardTotal } from "@/lib/scorecard";
import type { Ticker, InvestmentScorecard } from "@/types/database";

function MetricChip({
  label,
  value,
  highlight = false,
}: {
  label: string;
  value: string | number | null | undefined;
  highlight?: boolean;
}) {
  return (
    <div className={cn(
      "flex items-center gap-1.5 border rounded-lg px-3.5 py-1.5",
      highlight ? "border-upcoming/50 bg-upcoming/10" : "border-border"
    )}>
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className={cn(
        "font-mono text-[13px] font-medium",
        highlight ? "text-upcoming" : value != null ? "text-foreground" : "text-muted-foreground"
      )}>
        {value ?? "—"}
      </span>
    </div>
  );
}

export function TickerHeader({ ticker, scorecard }: { ticker: Ticker; scorecard: InvestmentScorecard | null }) {
  const nextSoon = ticker.next_earnings_date &&
    new Date(ticker.next_earnings_date) <= new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);
  const total = scorecard ? computeScorecardTotal(scorecard) : null;

  return (
    <div className="px-10 pt-7 pb-0">
      <Link
        href="/dashboard"
        className="inline-flex items-center gap-1.5 text-[13px] text-muted-foreground hover:text-foreground transition-colors mb-4"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Dashboard
      </Link>

      <div className="flex items-center gap-2.5 mb-1">
        <h1 className="font-mono text-[28px] font-semibold tracking-tight">{ticker.symbol}</h1>
        <StatusBadge status={ticker.status} />
      </div>
      <p className="text-[14px] text-muted-foreground mb-5">{ticker.company_name}</p>

      <div className="flex items-center gap-2 flex-wrap mb-5">
        <MetricChip label="Confidence" value={ticker.confidence_score} />
        <MetricChip label="Price" value={ticker.price_score} />
        <MetricChip label="Scorecard" value={total != null ? `${total}/60` : null} />
        <MetricChip label="Last" value={formatDate(ticker.last_earnings_date)} />
        <MetricChip
          label="Next"
          value={formatDate(ticker.next_earnings_date)}
          highlight={!!nextSoon}
        />
      </div>
    </div>
  );
}
