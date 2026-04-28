"use client";

import { useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ChevronDown, ChevronRight } from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { InvestmentScorecard } from "@/types/database";

// ─── Types ──────────────────────────────────────────────────────────────────

type ScorecardFields = Omit<InvestmentScorecard, "id" | "ticker_id" | "created_at" | "updated_at">;

const DEFAULT_SCORECARD: ScorecardFields = {
  p1_capital_allocation: 0, p1_insider_ownership: 0, p1_investor_relations: 0,
  p1_founder_involvement: 0, p1_ceo_quality: 0, p1_notes: "",
  p2_competitive_moat: 0, p2_pricing_power: 0, p2_reinvestment_runway: 0,
  p2_balance_sheet: 0, p2_notes: "",
  p3_roic_trend: 0, p3_margin_expansion: 0, p3_visible_catalysts: 0,
  p3_under_followed: 0, p3_notes: "",
  p4_absolute_valuation: 0, p4_relative_valuation: 0, p4_downside_protection: 0,
  p4_risk_reward: 0, p4_notes: "",
  p5_accounting_clarity: 0, p5_capital_structure: 0, p5_debt_structure: 0,
  p5_notes: "",
};

// ─── Score helpers ──────────────────────────────────────────────────────────

function p1Score(s: ScorecardFields) {
  return s.p1_capital_allocation + s.p1_insider_ownership + s.p1_investor_relations +
    s.p1_founder_involvement + s.p1_ceo_quality;
}
function p2Score(s: ScorecardFields) {
  return s.p2_competitive_moat + s.p2_pricing_power + s.p2_reinvestment_runway + s.p2_balance_sheet;
}
function p3Score(s: ScorecardFields) {
  return s.p3_roic_trend + s.p3_margin_expansion + s.p3_visible_catalysts + s.p3_under_followed;
}
function p4Score(s: ScorecardFields) {
  return s.p4_absolute_valuation + s.p4_relative_valuation + s.p4_downside_protection + s.p4_risk_reward;
}
function p5Score(s: ScorecardFields) {
  // Knockout: if accounting clarity = 0, entire pillar = 0
  if (s.p5_accounting_clarity === 0) return 0;
  return s.p5_accounting_clarity + s.p5_capital_structure + s.p5_debt_structure;
}
function totalScore(s: ScorecardFields) {
  return p1Score(s) + p2Score(s) + p3Score(s) + p4Score(s) + p5Score(s);
}

// ─── Sub-components ─────────────────────────────────────────────────────────

function ScoreButtons({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <div className="flex gap-1">
      {[0, 1, 2, 3].map((n) => (
        <button
          key={n}
          onClick={() => onChange(n)}
          className={cn(
            "w-8 h-8 rounded text-[13px] font-medium transition-colors border",
            value === n
              ? "bg-primary text-primary-foreground border-primary"
              : "bg-background text-muted-foreground border-border hover:border-foreground/40 hover:text-foreground"
          )}
        >
          {n}
        </button>
      ))}
    </div>
  );
}

function Criterion({
  label,
  description,
  value,
  onChange,
  knockout,
}: {
  label: string;
  description: string;
  value: number;
  onChange: (v: number) => void;
  knockout?: boolean;
}) {
  return (
    <div className="flex items-start gap-4 py-3 border-b border-border/50 last:border-0">
      <div className="flex-1 min-w-0">
        <p className="text-[13px] font-medium text-foreground leading-snug">
          {label}
          {knockout && (
            <span className="ml-1.5 text-[11px] font-semibold text-amber-600 dark:text-amber-400 uppercase tracking-wide">
              Knockout
            </span>
          )}
        </p>
        <p className="text-[12px] text-muted-foreground mt-0.5 leading-snug">{description}</p>
      </div>
      <ScoreButtons value={value} onChange={onChange} />
    </div>
  );
}

function PillarSection({
  title,
  score,
  max,
  notes,
  onNotesChange,
  children,
  warning,
}: {
  title: string;
  score: number;
  max: number;
  notes: string;
  onNotesChange: (v: string) => void;
  children: ReactNode;
  warning?: string;
}) {
  const [open, setOpen] = useState(true);
  const pct = max > 0 ? score / max : 0;
  const barColor = pct >= 0.67 ? "bg-emerald-500" : pct >= 0.34 ? "bg-amber-500" : "bg-red-400";

  return (
    <div className="border border-border rounded-lg overflow-hidden">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-5 py-3.5 hover:bg-accent/40 transition-colors"
      >
        <div className="flex items-center gap-3">
          {open ? (
            <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
          ) : (
            <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
          )}
          <span className="text-[14px] font-semibold">{title}</span>
          {warning && (
            <span className="text-[11px] font-semibold text-amber-600 dark:text-amber-400 uppercase tracking-wide">
              {warning}
            </span>
          )}
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <div className="w-20 h-1.5 rounded-full bg-border">
            <div
              className={cn("h-full rounded-full transition-all", barColor)}
              style={{ width: `${pct * 100}%` }}
            />
          </div>
          <span className="text-[13px] font-mono font-semibold w-12 text-right">
            {score}
            <span className="text-muted-foreground font-normal">/{max}</span>
          </span>
        </div>
      </button>

      {open && (
        <div className="px-5 pb-4 border-t border-border/50">
          <div className="mt-1">{children}</div>
          <div className="mt-4">
            <p className="text-[12px] text-muted-foreground mb-1.5 font-medium uppercase tracking-wide">
              Notes / Thesis
            </p>
            <textarea
              value={notes}
              onChange={(e) => onNotesChange(e.target.value)}
              placeholder="Add thesis notes for this pillar…"
              rows={3}
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-[13px] text-foreground placeholder:text-muted-foreground resize-none focus:outline-none focus:ring-1 focus:ring-ring"
            />
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main component ─────────────────────────────────────────────────────────

export function ScorecardTab({
  tickerId,
  initial,
}: {
  tickerId: string;
  initial: InvestmentScorecard | null;
}) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [scorecard, setScorecard] = useState<ScorecardFields>(
    initial
      ? (({ id, ticker_id, created_at, updated_at, ...rest }) => rest)(initial)
      : DEFAULT_SCORECARD
  );

  const set = <K extends keyof ScorecardFields>(key: K, value: ScorecardFields[K]) =>
    setScorecard((s) => ({ ...s, [key]: value }));

  const total = totalScore(scorecard);
  const p5knocked = scorecard.p5_accounting_clarity === 0;
  const updatedAt = initial?.updated_at
    ? new Date(initial.updated_at).toLocaleDateString("en-US", {
        year: "numeric", month: "short", day: "numeric",
      })
    : null;

  async function handleSave() {
    setSaving(true);
    const { error } = await supabase
      .from("investment_scorecards")
      .upsert({ ticker_id: tickerId, ...scorecard }, { onConflict: "ticker_id" });

    if (error) {
      toast.error("Failed to save: " + error.message);
    } else {
      toast.success("Scorecard saved");
      router.refresh();
    }
    setSaving(false);
  }

  return (
    <div className="flex flex-col gap-6 max-w-2xl px-10 pb-10">
      {/* Total score banner */}
      <div className="flex items-center justify-between rounded-xl border border-border bg-card px-6 py-5">
        <div>
          <p className="text-[12px] text-muted-foreground uppercase tracking-wide font-medium mb-0.5">
            Total Score
          </p>
          <div className="flex items-baseline gap-1.5">
            <span className="text-4xl font-mono font-bold">{total}</span>
            <span className="text-lg text-muted-foreground font-mono">/60</span>
          </div>
          {updatedAt && (
            <p className="text-[11px] text-muted-foreground mt-1">Last updated {updatedAt}</p>
          )}
        </div>
        <div className="flex flex-col gap-1.5 items-end">
          {(["p1", "p2", "p3", "p4", "p5"] as const).map((p, i) => {
            const scores = [p1Score, p2Score, p3Score, p4Score, p5Score];
            const maxes = [15, 12, 12, 12, 9];
            const s = scores[i](scorecard);
            const m = maxes[i];
            return (
              <div key={p} className="flex items-center gap-2">
                <span className="text-[11px] text-muted-foreground w-4">{`P${i + 1}`}</span>
                <div className="w-28 h-1.5 rounded-full bg-border">
                  <div
                    className={cn(
                      "h-full rounded-full",
                      s / m >= 0.67 ? "bg-emerald-500" : s / m >= 0.34 ? "bg-amber-500" : "bg-red-400"
                    )}
                    style={{ width: `${(s / m) * 100}%` }}
                  />
                </div>
                <span className="text-[11px] font-mono text-muted-foreground w-8 text-right">
                  {s}/{m}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Pillar 1 */}
      <PillarSection
        title="1. Management Quality"
        score={p1Score(scorecard)}
        max={15}
        notes={scorecard.p1_notes}
        onNotesChange={(v) => set("p1_notes", v)}
      >
        <Criterion
          label="Capital allocation track record"
          description="ROIC trend vs cost of capital, acquisition history"
          value={scorecard.p1_capital_allocation}
          onChange={(v) => set("p1_capital_allocation", v)}
        />
        <Criterion
          label="Insider ownership & alignment"
          description=">5% ownership, open market buys, comp tied to price not revenue"
          value={scorecard.p1_insider_ownership}
          onChange={(v) => set("p1_insider_ownership", v)}
        />
        <Criterion
          label="Investor relations quality"
          description="Discusses mistakes, uses ROIC not adjusted EBITDA, has investor letters"
          value={scorecard.p1_investor_relations}
          onChange={(v) => set("p1_investor_relations", v)}
        />
        <Criterion
          label="Founder involvement"
          description="Still CEO, board member, still holds shares"
          value={scorecard.p1_founder_involvement}
          onChange={(v) => set("p1_founder_involvement", v)}
        />
        <Criterion
          label="CEO capital allocator quality"
          description="Trustworthy, vision-driven, long-term focus not quarterly"
          value={scorecard.p1_ceo_quality}
          onChange={(v) => set("p1_ceo_quality", v)}
        />
      </PillarSection>

      {/* Pillar 2 */}
      <PillarSection
        title="2. Business Quality"
        score={p2Score(scorecard)}
        max={12}
        notes={scorecard.p2_notes}
        onNotesChange={(v) => set("p2_notes", v)}
      >
        <Criterion
          label="Competitive moat"
          description="Regulation, switching costs, niche dominance — must be articulable"
          value={scorecard.p2_competitive_moat}
          onChange={(v) => set("p2_competitive_moat", v)}
        />
        <Criterion
          label="Pricing power"
          description="Gross margin stability, cost pass-through without churn"
          value={scorecard.p2_pricing_power}
          onChange={(v) => set("p2_pricing_power", v)}
        />
        <Criterion
          label="Reinvestment runway"
          description="High-ROIC reinvestment options, TAM size and growth"
          value={scorecard.p2_reinvestment_runway}
          onChange={(v) => set("p2_reinvestment_runway", v)}
        />
        <Criterion
          label="Balance sheet health"
          description="Low debt/EBITDA, positive FCF, no equity dilution dependency"
          value={scorecard.p2_balance_sheet}
          onChange={(v) => set("p2_balance_sheet", v)}
        />
      </PillarSection>

      {/* Pillar 3 */}
      <PillarSection
        title="3. Growing Business Fundamentals"
        score={p3Score(scorecard)}
        max={12}
        notes={scorecard.p3_notes}
        onNotesChange={(v) => set("p3_notes", v)}
      >
        <Criterion
          label="ROIC trend"
          description="Target >15%; entry when still below normal but trajectory is up — score 3 if growing"
          value={scorecard.p3_roic_trend}
          onChange={(v) => set("p3_roic_trend", v)}
        />
        <Criterion
          label="Margin expansion thesis"
          description="Clear explanation of why margins will expand"
          value={scorecard.p3_margin_expansion}
          onChange={(v) => set("p3_margin_expansion", v)}
        />
        <Criterion
          label="Visible catalysts"
          description="New products, contracts, management changes, industry tailwinds"
          value={scorecard.p3_visible_catalysts}
          onChange={(v) => set("p3_visible_catalysts", v)}
        />
        <Criterion
          label="Under-followed / misunderstood"
          description="No analyst coverage, post-spinoff, post-merger complexity"
          value={scorecard.p3_under_followed}
          onChange={(v) => set("p3_under_followed", v)}
        />
      </PillarSection>

      {/* Pillar 4 */}
      <PillarSection
        title="4. Valuation"
        score={p4Score(scorecard)}
        max={12}
        notes={scorecard.p4_notes}
        onNotesChange={(v) => set("p4_notes", v)}
      >
        <Criterion
          label="Absolute valuation"
          description="EV/EBIT or P/FCF preferred, looking for <15x"
          value={scorecard.p4_absolute_valuation}
          onChange={(v) => set("p4_absolute_valuation", v)}
        />
        <Criterion
          label="Relative valuation"
          description="vs itself historically, vs peers — cheaper and why"
          value={scorecard.p4_relative_valuation}
          onChange={(v) => set("p4_relative_valuation", v)}
        />
        <Criterion
          label="Downside protection"
          description="Floor from assets or acquisition value — score 3 only if floor is very clear"
          value={scorecard.p4_downside_protection}
          onChange={(v) => set("p4_downside_protection", v)}
        />
        <Criterion
          label="Risk/reward ratio"
          description="Score 3 only if base case vs bear case is >3:1"
          value={scorecard.p4_risk_reward}
          onChange={(v) => set("p4_risk_reward", v)}
        />
      </PillarSection>

      {/* Pillar 5 */}
      <PillarSection
        title="5. Business Simplicity"
        score={p5Score(scorecard)}
        max={9}
        notes={scorecard.p5_notes}
        onNotesChange={(v) => set("p5_notes", v)}
        warning={p5knocked ? "Knockout — Pillar score zeroed" : undefined}
      >
        <Criterion
          label="Accounting clarity"
          description="GAAP net income reconciles cleanly to operating cash flow"
          value={scorecard.p5_accounting_clarity}
          onChange={(v) => set("p5_accounting_clarity", v)}
          knockout
        />
        <Criterion
          label="Capital structure simplicity"
          description="Single share class preferred; warrants/converts/large options pool = red flag"
          value={scorecard.p5_capital_structure}
          onChange={(v) => set("p5_capital_structure", v)}
        />
        <Criterion
          label="Debt structure readability"
          description="Vanilla debt preferred; PIK interest, covenant-lite, off-balance-sheet = red flags"
          value={scorecard.p5_debt_structure}
          onChange={(v) => set("p5_debt_structure", v)}
        />
      </PillarSection>

      <Button onClick={handleSave} disabled={saving} className="w-fit">
        {saving ? "Saving…" : "Save scorecard"}
      </Button>
    </div>
  );
}
