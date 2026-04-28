import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { StatusBadge } from "@/components/ticker/status-badge";
import { formatDate } from "@/lib/utils";
import { cn } from "@/lib/utils";
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

function scorecardTotal(sc: InvestmentScorecard): number {
  const p1 = sc.p1_capital_allocation + sc.p1_insider_ownership + sc.p1_investor_relations +
    sc.p1_founder_involvement + sc.p1_ceo_quality;
  const p2 = sc.p2_competitive_moat + sc.p2_pricing_power + sc.p2_reinvestment_runway + sc.p2_balance_sheet;
  const p3 = sc.p3_roic_trend + sc.p3_margin_expansion + sc.p3_visible_catalysts + sc.p3_under_followed;
  const p4 = sc.p4_absolute_valuation + sc.p4_relative_valuation + sc.p4_downside_protection + sc.p4_risk_reward;
  const p5 = sc.p5_accounting_clarity === 0
    ? 0
    : sc.p5_accounting_clarity + sc.p5_capital_structure + sc.p5_debt_structure;
  return p1 + p2 + p3 + p4 + p5;
}

export function TickerHeader({ ticker, scorecard }: { ticker: Ticker; scorecard: InvestmentScorecard | null }) {
  const nextSoon = ticker.next_earnings_date &&
    new Date(ticker.next_earnings_date) <= new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);
  const total = scorecard ? scorecardTotal(scorecard) : null;

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
