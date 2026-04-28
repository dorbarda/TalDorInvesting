import type { InvestmentScorecard } from "@/types/database";

export function computeScorecardTotal(sc: InvestmentScorecard): number {
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
