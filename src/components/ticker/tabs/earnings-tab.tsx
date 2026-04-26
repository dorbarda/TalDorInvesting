"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { formatDate } from "@/lib/utils";
import { ArrowLeft, Plus, BarChart2 } from "lucide-react";
import type { EarningsSummary } from "@/types/database";

type View = "list" | "read" | "write";

export function EarningsTab({ tickerId, initial }: { tickerId: string; initial: EarningsSummary[] }) {
  const router = useRouter();
  const [summaries, setSummaries] = useState(initial);
  const [view, setView] = useState<View>("list");
  const [selected, setSelected] = useState<EarningsSummary | null>(null);
  const [form, setForm] = useState({ earnings_date: "", content: "" });
  const [saving, setSaving] = useState(false);

  function openNew() {
    setForm({ earnings_date: "", content: "" });
    setSelected(null);
    setView("write");
  }

  function openEdit(s: EarningsSummary) {
    setForm({ earnings_date: s.earnings_date, content: s.content_md });
    setSelected(s);
    setView("write");
  }

  function openRead(s: EarningsSummary) {
    setSelected(s);
    setView("read");
  }

  async function handleSave() {
    if (!form.earnings_date) {
      toast.error("Earnings date is required");
      return;
    }
    setSaving(true);

    if (selected) {
      // Update existing
      const { error } = await supabase
        .from("earnings_summaries")
        .update({ content_md: form.content })
        .eq("id", selected.id);

      if (error) {
        toast.error("Failed to save: " + error.message);
        setSaving(false);
        return;
      }
      setSummaries((prev) =>
        prev.map((s) => (s.id === selected.id ? { ...s, content_md: form.content } : s))
      );
      toast.success("Updated");
    } else {
      // Create new
      const { data, error } = await supabase
        .from("earnings_summaries")
        .insert({ ticker_id: tickerId, earnings_date: form.earnings_date, content_md: form.content })
        .select()
        .single();

      if (error) {
        toast.error("Failed to save: " + error.message);
        setSaving(false);
        return;
      }
      setSummaries((prev) => [data as EarningsSummary, ...prev]);
      toast.success("Saved");
    }

    setView("list");
    router.refresh();
    setSaving(false);
  }

  if (view === "read" && selected) {
    return (
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => setView("list")}>
            <ArrowLeft className="h-4 w-4" /> Back
          </Button>
          <Button variant="outline" size="sm" className="ml-auto" onClick={() => openEdit(selected)}>
            Edit
          </Button>
        </div>
        <h2 className="text-lg font-semibold">Earnings — {formatDate(selected.earnings_date)}</h2>
        <div className="prose prose-sm max-w-none dark:prose-invert" dir="auto">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{selected.content_md}</ReactMarkdown>
        </div>
      </div>
    );
  }

  if (view === "write") {
    return (
      <div className="flex flex-col gap-4 max-w-2xl">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => setView("list")}>
            <ArrowLeft className="h-4 w-4" /> Back
          </Button>
          <span className="text-sm text-muted-foreground">
            {selected ? "Edit summary" : "New earnings summary"}
          </span>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="earnings_date">Earnings date</Label>
          <Input
            id="earnings_date"
            type="date"
            value={form.earnings_date}
            onChange={(e) => setForm((f) => ({ ...f, earnings_date: e.target.value }))}
            disabled={!!selected}
            className="w-44"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="content">Notes (Markdown)</Label>
          <Textarea
            id="content"
            placeholder="Revenue, EPS, guidance, key takeaways…"
            value={form.content}
            onChange={(e) => setForm((f) => ({ ...f, content: e.target.value }))}
            className="min-h-[400px] font-mono text-sm resize-y"
            dir="auto"
          />
        </div>
        <Button onClick={handleSave} disabled={saving} className="w-fit">
          {saving ? "Saving…" : "Save"}
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-end">
        <Button size="sm" onClick={openNew}>
          <Plus className="h-4 w-4" /> New summary
        </Button>
      </div>

      {summaries.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-12 text-center text-muted-foreground">
          <BarChart2 className="h-8 w-8 opacity-30" />
          <p className="text-sm">No earnings summaries yet.</p>
        </div>
      ) : (
        <div className="flex flex-col divide-y border rounded-lg overflow-hidden">
          {summaries.map((s) => (
            <button
              key={s.id}
              onClick={() => openRead(s)}
              className="flex items-center gap-3 px-4 py-3 text-left hover:bg-muted/40 transition-colors"
            >
              <span className="flex-1 text-sm font-medium">{formatDate(s.earnings_date)}</span>
              <span className="text-xs text-muted-foreground line-clamp-1 max-w-xs">
                {s.content_md.slice(0, 80) || "No content"}
              </span>
              <span className="text-xs text-muted-foreground">{formatDate(s.created_at)}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
