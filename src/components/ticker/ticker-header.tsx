import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { StatusBadge } from "@/components/ticker/status-badge";
import { ScoreBadge } from "@/components/ticker/score-badge";
import { formatDate } from "@/lib/utils";
import type { Ticker } from "@/types/database";

export function TickerHeader({ ticker }: { ticker: Ticker }) {
  return (
    <div className="flex flex-col gap-3">
      <Link
        href="/dashboard"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors w-fit"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Dashboard
      </Link>

      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold font-mono">{ticker.symbol}</h1>
            <StatusBadge status={ticker.status} />
          </div>
          <p className="text-muted-foreground mt-0.5">{ticker.company_name}</p>
        </div>
      </div>

      <div className="flex items-center gap-6 text-sm border rounded-lg px-4 py-3 bg-muted/30 w-fit">
        <div className="flex items-center gap-1.5">
          <span className="text-muted-foreground">Confidence</span>
          <ScoreBadge score={ticker.confidence_score} />
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-muted-foreground">Price</span>
          <ScoreBadge score={ticker.price_score} />
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-muted-foreground">5 Pillars</span>
          <ScoreBadge score={ticker.five_pillars_score} />
        </div>
        <div className="w-px h-4 bg-border" />
        <div className="flex items-center gap-1 text-muted-foreground">
          <span>Last:</span>
          <span className="text-foreground">{formatDate(ticker.last_earnings_date)}</span>
        </div>
        <div className="flex items-center gap-1 text-muted-foreground">
          <span>Next:</span>
          <span className="text-foreground">{formatDate(ticker.next_earnings_date)}</span>
        </div>
      </div>
    </div>
  );
}
