"use client";

import { useState } from "react";
import { Tabs } from "@/components/ui/tabs";
import { WriteupsTab } from "@/components/ticker/tabs/writeups-tab";
import { EarningsTab } from "@/components/ticker/tabs/earnings-tab";
import { AttachmentsTab } from "@/components/ticker/tabs/attachments-tab";
import { InfoTab } from "@/components/ticker/tabs/info-tab";
import { ScorecardTab } from "@/components/ticker/tabs/scorecard-tab";
import { KpisTab } from "@/components/ticker/tabs/kpis-tab";
import type {
  Ticker, Writeup, EarningsSummary, Attachment, InvestmentScorecard,
  Kpi, KpiObservation, ValuationMethod,
} from "@/types/database";

const TABS = [
  { id: "writeups", label: "Writeups" },
  { id: "earnings", label: "Earnings Summaries" },
  { id: "attachments", label: "Attachments" },
  { id: "scorecard", label: "Scorecard" },
  { id: "kpis", label: "KPIs & Valuation" },
  { id: "info", label: "Info" },
];

interface Props {
  ticker: Ticker;
  writeups: Writeup[];
  earnings: EarningsSummary[];
  attachments: Attachment[];
  scorecard: InvestmentScorecard | null;
  kpis: Kpi[];
  kpiObservations: KpiObservation[];
  valuation: ValuationMethod | null;
}

export function TickerTabs({
  ticker, writeups, earnings, attachments, scorecard, kpis, kpiObservations, valuation,
}: Props) {
  const [active, setActive] = useState("writeups");

  return (
    <div className="flex flex-col gap-0">
      <Tabs tabs={TABS} active={active} onChange={setActive} />
      <div className="pt-6">
        {active === "writeups" && <WriteupsTab tickerId={ticker.id} initial={writeups} />}
        {active === "earnings" && <EarningsTab tickerId={ticker.id} initial={earnings} />}
        {active === "attachments" && <AttachmentsTab tickerId={ticker.id} initial={attachments} />}
        {active === "scorecard" && <ScorecardTab tickerId={ticker.id} initial={scorecard} />}
        {active === "kpis" && (
          <KpisTab
            tickerId={ticker.id}
            initialKpis={kpis}
            initialObservations={kpiObservations}
            initialValuation={valuation}
          />
        )}
        {active === "info" && <InfoTab ticker={ticker} />}
      </div>
    </div>
  );
}
