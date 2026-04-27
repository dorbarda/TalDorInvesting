"use client";

import { useState, useEffect } from "react";
import { RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

// ─── Types ────────────────────────────────────────────────────────────────────

interface IndexData {
  symbol: string;
  value: number;
  change_1d: number | null;
  change_1w: number | null;
  ytd: number | null;
}

interface SectorData {
  name: string;
  change_1d: number | null;
  change_1w: number | null;
}

interface MacroItem {
  label: string;
  value: string;
  change_1w: number | null;
}

interface BreadthData {
  sectorsUp: number;
  sectorsDown: number;
  bestSector: string | null;
  bestChange: number | null;
  worstSector: string | null;
  worstChange: number | null;
}

interface MarketData {
  indices: IndexData[];
  sectors: SectorData[];
  macro: {
    rates: MacroItem[];
    commodities: MacroItem[];
    fx: MacroItem[];
    crypto: MacroItem[];
  };
  breadth: BreadthData;
  asOf: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function sectorBg(change: number | null): string {
  if (change === null) return "oklch(60% 0.01 0)";
  if (change >  1.5)  return "oklch(36% 0.19 145)";
  if (change >  0.5)  return "oklch(42% 0.15 145)";
  if (change >  0)    return "oklch(48% 0.10 145)";
  if (change > -0.5)  return "oklch(48% 0.10 25)";
  if (change > -1)    return "oklch(42% 0.15 25)";
  return "oklch(36% 0.19 25)";
}

function ChangeTag({
  change,
  size = 13,
}: {
  change: number | null | undefined;
  size?: number;
}) {
  if (change === null || change === undefined) {
    return <span className="text-muted-foreground font-mono" style={{ fontSize: size }}>—</span>;
  }
  const pos = change >= 0;
  return (
    <span
      className="font-mono font-medium"
      style={{
        fontSize: size,
        color: pos ? "oklch(50% 0.18 145)" : "oklch(52% 0.18 25)",
      }}
    >
      {pos ? "+" : ""}
      {change.toFixed(2)}%
    </span>
  );
}

function MacroGroup({ title, items }: { title: string; items: MacroItem[] }) {
  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden">
      <div className="px-[18px] py-[13px] border-b border-border">
        <span className="text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
          {title}
        </span>
      </div>
      {items.map((item, i) => (
        <div
          key={item.label}
          className={cn(
            "flex items-center justify-between px-[18px] py-[13px]",
            i < items.length - 1 && "border-b border-border"
          )}
        >
          <span className="text-[13px] text-muted-foreground">{item.label}</span>
          <div className="flex items-center gap-2.5">
            <span className="font-mono text-[13px] font-medium text-foreground">
              {item.value}
            </span>
            <ChangeTag change={item.change_1w} size={11} />
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function MarketOverview() {
  const [data, setData] = useState<MarketData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function fetchData() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/market_overview");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setData(await res.json());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to fetch market data");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchData();
  }, []);

  const maxAbs = data
    ? Math.max(...data.sectors.map((s) => Math.abs(s.change_1w ?? 0)), 0.1)
    : 1;

  const totalSectors =
    (data?.breadth.sectorsUp ?? 0) + (data?.breadth.sectorsDown ?? 0);

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* ── Header ── */}
      <div className="bg-card border-b border-border px-10 pt-8 pb-6 shrink-0">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-[22px] font-semibold tracking-tight text-foreground">
              Market Overview
            </h1>
            <p className="text-[13px] text-muted-foreground mt-1">
              {loading
                ? "Fetching data…"
                : error
                ? `Error: ${error}`
                : `${data?.asOf} · Live via yfinance`}
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={fetchData}
            disabled={loading}
          >
            <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
            Refresh
          </Button>
        </div>
      </div>

      {/* ── Scrollable content ── */}
      <div className="flex-1 overflow-auto px-10 py-8">
        {loading && !data ? (
          <div className="flex items-center justify-center h-64 text-muted-foreground text-sm">
            Loading market data…
          </div>
        ) : (
          <div className="flex flex-col gap-8">

            {/* ── Index cards ── */}
            <div className="grid grid-cols-5 gap-3">
              {(data?.indices ?? []).map((idx) => (
                <div
                  key={idx.symbol}
                  className="bg-card border border-border rounded-xl px-5 pt-5 pb-4"
                >
                  <div className="text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground mb-2.5">
                    {idx.symbol}
                  </div>
                  <div className="font-mono text-[22px] font-semibold tracking-tight text-foreground mb-2.5">
                    {idx.symbol === "VIX"
                      ? idx.value.toFixed(2)
                      : idx.value.toLocaleString("en-US", {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                  </div>
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-muted-foreground w-6">1D</span>
                      <ChangeTag change={idx.change_1d} size={11} />
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-muted-foreground w-6">1W</span>
                      <ChangeTag change={idx.change_1w} size={11} />
                    </div>
                    {idx.ytd !== null && (
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-muted-foreground w-6">YTD</span>
                        <ChangeTag change={idx.ytd} size={11} />
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* ── Sector heatmap + 1W summary ── */}
            <div
              className="grid gap-5 items-start"
              style={{ gridTemplateColumns: "1fr 300px" }}
            >
              {/* Heatmap */}
              <div>
                <div className="flex items-center justify-between mb-3.5">
                  <span className="text-[13px] font-semibold text-foreground">
                    S&amp;P 500 Sectors · 1 Week
                  </span>
                  <div className="flex gap-3 text-[11px] text-muted-foreground">
                    <span className="flex items-center gap-1.5">
                      <span
                        className="w-2 h-2 rounded-[2px] inline-block"
                        style={{ background: "oklch(42% 0.15 145)" }}
                      />
                      Gain
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span
                        className="w-2 h-2 rounded-[2px] inline-block"
                        style={{ background: "oklch(42% 0.15 25)" }}
                      />
                      Loss
                    </span>
                  </div>
                </div>
                <div className="grid grid-cols-4 gap-2">
                  {[...(data?.sectors ?? [])]
                    .sort(
                      (a, b) => (b.change_1w ?? -999) - (a.change_1w ?? -999)
                    )
                    .map((s) => {
                      const intensity =
                        0.72 +
                        (Math.abs(s.change_1w ?? 0) / maxAbs) * 0.28;
                      return (
                        <div
                          key={s.name}
                          className="rounded-lg p-3.5"
                          style={{
                            background: sectorBg(s.change_1w),
                            transform: `scale(${intensity})`,
                            transformOrigin: "center",
                          }}
                        >
                          <div className="text-[11px] font-semibold mb-1.5 text-white/70">
                            {s.name}
                          </div>
                          <div className="font-mono text-[17px] font-semibold text-white">
                            {s.change_1w !== null
                              ? `${s.change_1w >= 0 ? "+" : ""}${s.change_1w.toFixed(2)}%`
                              : "—"}
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>

              {/* 1W Sector Summary */}
              <div className="bg-card border border-border rounded-xl overflow-hidden">
                <div className="px-[18px] py-[13px] border-b border-border">
                  <span className="text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                    1-Week Sector Summary
                  </span>
                </div>
                <div className="px-[18px] py-5 flex flex-col gap-5">
                  {/* Up / Down bar */}
                  <div>
                    <div className="flex justify-between mb-2">
                      <span
                        className="text-[12px] font-medium"
                        style={{ color: "oklch(50% 0.15 145)" }}
                      >
                        ▲ {data?.breadth.sectorsUp ?? 0} Up
                      </span>
                      <span
                        className="text-[12px] font-medium"
                        style={{ color: "oklch(50% 0.15 25)" }}
                      >
                        {data?.breadth.sectorsDown ?? 0} Down ▼
                      </span>
                    </div>
                    <div className="h-1.5 rounded-full bg-border overflow-hidden">
                      <div
                        className="h-full rounded-full"
                        style={{
                          width:
                            totalSectors > 0
                              ? `${((data?.breadth.sectorsUp ?? 0) / totalSectors) * 100}%`
                              : "50%",
                          background: "oklch(50% 0.15 145)",
                        }}
                      />
                    </div>
                  </div>

                  {/* Best */}
                  <div className="flex justify-between items-center">
                    <span className="text-[13px] text-muted-foreground">
                      Best sector
                    </span>
                    <div className="text-right">
                      <div className="text-[12px] font-medium text-foreground">
                        {data?.breadth.bestSector ?? "—"}
                      </div>
                      <ChangeTag change={data?.breadth.bestChange ?? null} size={12} />
                    </div>
                  </div>

                  {/* Worst */}
                  <div className="flex justify-between items-center">
                    <span className="text-[13px] text-muted-foreground">
                      Worst sector
                    </span>
                    <div className="text-right">
                      <div className="text-[12px] font-medium text-foreground">
                        {data?.breadth.worstSector ?? "—"}
                      </div>
                      <ChangeTag change={data?.breadth.worstChange ?? null} size={12} />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* ── Macro grid ── */}
            <div>
              <div className="mb-3.5">
                <span className="text-[13px] font-semibold text-foreground">
                  Macro Indicators · 1 Week
                </span>
              </div>
              <div className="grid grid-cols-4 gap-3">
                <MacroGroup title="Rates"       items={data?.macro.rates       ?? []} />
                <MacroGroup title="Commodities" items={data?.macro.commodities ?? []} />
                <MacroGroup title="FX"          items={data?.macro.fx          ?? []} />
                <MacroGroup title="Crypto"      items={data?.macro.crypto      ?? []} />
              </div>
            </div>

          </div>
        )}
      </div>
    </div>
  );
}
