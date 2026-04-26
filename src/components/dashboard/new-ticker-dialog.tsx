"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase/client";
import { TICKER_STATUSES, STATUS_LABELS, type TickerStatus } from "@/lib/constants";
import type { Ticker } from "@/types/database";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus } from "lucide-react";

export function NewTickerDialog() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    symbol: "",
    company_name: "",
    status: "watching" as TickerStatus,
  });

  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.symbol.trim() || !form.company_name.trim()) return;
    setLoading(true);

    const { data, error } = await supabase
      .from("tickers")
      .insert({
        symbol: form.symbol.trim().toUpperCase(),
        company_name: form.company_name.trim(),
        status: form.status,
      })
      .select()
      .returns<Ticker[]>()
      .single();

    if (error) {
      toast.error("Failed to create ticker: " + error.message);
      setLoading(false);
      return;
    }

    // Kick off earnings fetch in background (production only)
    fetch(`/api/earnings_refresh?symbol=${data.symbol}`, { method: "POST" }).catch(() => null);

    toast.success(`${data.symbol} added`);
    setOpen(false);
    setForm({ symbol: "", company_name: "", status: "watching" });
    setLoading(false);
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus className="h-4 w-4" />
          New Ticker
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Add ticker</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4 mt-2">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="symbol">Symbol</Label>
            <Input
              id="symbol"
              placeholder="AAPL"
              value={form.symbol}
              onChange={(e) => set("symbol", e.target.value)}
              autoFocus
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="company_name">Company name</Label>
            <Input
              id="company_name"
              placeholder="Apple Inc."
              value={form.company_name}
              onChange={(e) => set("company_name", e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="status">Status</Label>
            <Select value={form.status} onValueChange={(v) => set("status", v)}>
              <SelectTrigger id="status">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TICKER_STATUSES.map((s) => (
                  <SelectItem key={s} value={s}>{STATUS_LABELS[s]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button type="submit" disabled={loading} className="mt-1">
            {loading ? "Adding…" : "Add ticker"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
