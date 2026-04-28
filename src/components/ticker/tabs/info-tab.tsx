"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase/client";
import { TICKER_STATUSES, STATUS_LABELS, type TickerStatus } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Ticker } from "@/types/database";

function ScoreInput({ id, label, value, onChange }: {
  id: string; label: string; value: string; onChange: (v: string) => void;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={id}>{label} <span className="text-muted-foreground font-normal">(1–10)</span></Label>
      <Input
        id={id}
        type="number"
        min={1}
        max={10}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-24"
        placeholder="—"
      />
    </div>
  );
}

export function InfoTab({ ticker }: { ticker: Ticker }) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  async function handleRefreshEarnings() {
    setRefreshing(true);
    try {
      const res = await fetch(`/api/earnings_refresh?symbol=${ticker.symbol}`, { method: "POST" });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      toast.success(data.refreshed > 0 ? "Earnings dates updated" : "No upcoming earnings found");
      router.refresh();
    } catch (e: unknown) {
      toast.error("Refresh failed — earnings fetch only works in production");
    } finally {
      setRefreshing(false);
    }
  }
  const [form, setForm] = useState({
    company_name: ticker.company_name,
    status: ticker.status as TickerStatus,
    confidence_score: ticker.confidence_score?.toString() ?? "",
    price_score: ticker.price_score?.toString() ?? "",
    last_earnings_date: ticker.last_earnings_date ?? "",
    next_earnings_date: ticker.next_earnings_date ?? "",
  });

  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  function parseScore(v: string): number | null {
    const n = parseInt(v, 10);
    return isNaN(n) ? null : Math.min(10, Math.max(1, n));
  }

  async function handleSave() {
    setSaving(true);
    const { error } = await supabase
      .from("tickers")
      .update({
        company_name: form.company_name,
        status: form.status,
        confidence_score: parseScore(form.confidence_score),
        price_score: parseScore(form.price_score),
        last_earnings_date: form.last_earnings_date || null,
        next_earnings_date: form.next_earnings_date || null,
      })
      .eq("id", ticker.id);

    if (error) {
      toast.error("Failed to save: " + error.message);
    } else {
      toast.success("Saved");
      router.refresh();
    }
    setSaving(false);
  }

  return (
    <div className="flex flex-col gap-6 max-w-lg">
      <div className="flex flex-col gap-1.5">
        <Label>Symbol</Label>
        <p className="text-sm font-mono font-semibold text-muted-foreground">{ticker.symbol}</p>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="company_name">Company name</Label>
        <Input
          id="company_name"
          value={form.company_name}
          onChange={(e) => set("company_name", e.target.value)}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="status">Status</Label>
        <Select value={form.status} onValueChange={(v) => set("status", v)}>
          <SelectTrigger id="status" className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {TICKER_STATUSES.map((s) => (
              <SelectItem key={s} value={s}>{STATUS_LABELS[s]}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex gap-4 flex-wrap">
        <ScoreInput id="confidence" label="Confidence" value={form.confidence_score} onChange={(v) => set("confidence_score", v)} />
        <ScoreInput id="price" label="Price" value={form.price_score} onChange={(v) => set("price_score", v)} />
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <Label>Earnings dates</Label>
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefreshEarnings}
            disabled={refreshing}
            className="h-7 text-xs"
          >
            <RefreshCw className={cn("h-3 w-3", refreshing && "animate-spin")} />
            Fetch from yfinance
          </Button>
        </div>
        <div className="flex gap-4 flex-wrap">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="last_earnings" className="text-muted-foreground font-normal">Last</Label>
            <Input
              id="last_earnings"
              type="date"
              value={form.last_earnings_date}
              onChange={(e) => set("last_earnings_date", e.target.value)}
              className="w-44"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="next_earnings" className="text-muted-foreground font-normal">Next</Label>
            <Input
              id="next_earnings"
              type="date"
              value={form.next_earnings_date}
              onChange={(e) => set("next_earnings_date", e.target.value)}
              className="w-44"
            />
          </div>
        </div>
      </div>

      <Button onClick={handleSave} disabled={saving} className="w-fit">
        {saving ? "Saving…" : "Save changes"}
      </Button>
    </div>
  );
}
