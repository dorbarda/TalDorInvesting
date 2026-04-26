"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase/client";
import { MarkdownEditor } from "@/components/editor/markdown-editor";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatDate } from "@/lib/utils";
import { ArrowLeft, Plus, BarChart2 } from "lucide-react";
import type { EarningsSummary } from "@/types/database";

type View = "list" | "read" | "write";

export function EarningsTab({ tickerId, initial }: { tickerId: string; initial: EarningsSummary[] }) {
  const router = useRouter();
  const [summaries, setSummaries] = useState(initial);
  const [view, setView] = useState<View>("list");
  const [selected, setSelected] = useState<EarningsSummary | null>(null);
  const [earningsDate, setEarningsDate] = useState("");
  const [dateError, setDateError] = useState(false);

  function openNew() {
    setEarningsDate("");
    setDateError(false);
    setSelected(null);
    setView("write");
  }

  function openEdit(s: EarningsSummary) {
    setEarningsDate(s.earnings_date);
    setDateError(false);
    setSelected(s);
    setView("write");
  }

  function openRead(s: EarningsSummary) {
    setSelected(s);
    setView("read");
  }

  async function handleSave(content: string) {
    if (selected) {
      const { error } = await supabase
        .from("earnings_summaries")
        .update({ content_md: content })
        .eq("id", selected.id);

      if (error) {
        toast.error("Failed to save: " + error.message);
        throw error;
      }
      setSummaries((prev) =>
        prev.map((s) => (s.id === selected.id ? { ...s, content_md: content } : s))
      );
      toast.success("Updated");
    } else {
      if (!earningsDate) {
        setDateError(true);
        throw new Error("Date required");
      }
      const { data, error } = await supabase
        .from("earnings_summaries")
        .insert({ ticker_id: tickerId, earnings_date: earningsDate, content_md: content })
        .select()
        .single();

      if (error) {
        toast.error("Failed to save: " + error.message);
        throw error;
      }
      setSummaries((prev) => [data as EarningsSummary, ...prev]);
      toast.success("Saved");
    }

    setView("list");
    router.refresh();
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
    const draftKey = selected
      ? `draft-earnings-${tickerId}-${selected.id}`
      : `draft-earnings-${tickerId}-new`;

    return (
      <div className="flex flex-col gap-4 max-w-4xl">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => setView("list")}>
            <ArrowLeft className="h-4 w-4" /> Back
          </Button>
          <span className="text-sm text-muted-foreground">
            {selected ? "Edit earnings summary" : "New earnings summary"}
          </span>
        </div>

        {!selected && (
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="earnings_date">Earnings date</Label>
            <Input
              id="earnings_date"
              type="date"
              value={earningsDate}
              onChange={(e) => { setEarningsDate(e.target.value); setDateError(false); }}
              className={`w-44 ${dateError ? "border-destructive" : ""}`}
              autoFocus
            />
            {dateError && <p className="text-xs text-destructive">Date is required</p>}
          </div>
        )}

        {selected && (
          <p className="text-sm text-muted-foreground">
            Earnings date: <strong>{formatDate(selected.earnings_date)}</strong>
          </p>
        )}

        <MarkdownEditor
          initialContent={selected?.content_md ?? ""}
          placeholder="Revenue, EPS, guidance, key takeaways… (Hebrew supported)"
          draftKey={draftKey}
          onSave={handleSave}
          saveLabel="Save summary"
        />
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
              <span className="text-xs text-muted-foreground shrink-0">{formatDate(s.created_at)}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
