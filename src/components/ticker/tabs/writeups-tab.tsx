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
import { ArrowLeft, Plus, FileText } from "lucide-react";
import type { Writeup } from "@/types/database";

type View = "list" | "read" | "write";

export function WriteupsTab({ tickerId, initial }: { tickerId: string; initial: Writeup[] }) {
  const router = useRouter();
  const [writeups, setWriteups] = useState(initial);
  const [view, setView] = useState<View>("list");
  const [selected, setSelected] = useState<Writeup | null>(null);
  const [form, setForm] = useState({ title: "", content: "" });
  const [saving, setSaving] = useState(false);

  function openNew() {
    setForm({ title: "", content: "" });
    setSelected(null);
    setView("write");
  }

  function openEdit(w: Writeup) {
    setForm({ title: w.title, content: w.content_md });
    setSelected(w);
    setView("write");
  }

  function openRead(w: Writeup) {
    setSelected(w);
    setView("read");
  }

  async function handleSave() {
    if (!form.title.trim()) {
      toast.error("Title is required");
      return;
    }
    setSaving(true);

    const { data, error } = await supabase
      .from("writeups")
      .insert({ ticker_id: tickerId, title: form.title, content_md: form.content })
      .select()
      .single();

    if (error) {
      toast.error("Failed to save: " + error.message);
      setSaving(false);
      return;
    }

    setWriteups((prev) => [data as Writeup, ...prev]);
    toast.success(`Saved as v${(data as Writeup).version}`);
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
          <span className="text-xs text-muted-foreground">v{selected.version} · {formatDate(selected.created_at)}</span>
          <Button variant="outline" size="sm" className="ml-auto" onClick={() => openEdit(selected)}>
            Edit (new version)
          </Button>
        </div>
        <h2 className="text-lg font-semibold">{selected.title}</h2>
        <div
          className="prose prose-sm max-w-none dark:prose-invert"
          dir="auto"
        >
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
            {selected ? `Editing from v${selected.version} — saves as new version` : "New writeup"}
          </span>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="title">Title</Label>
          <Input
            id="title"
            placeholder="Research notes, Q3 update…"
            value={form.title}
            onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
            autoFocus
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="content">Content (Markdown)</Label>
          <Textarea
            id="content"
            placeholder="Write your analysis here…"
            value={form.content}
            onChange={(e) => setForm((f) => ({ ...f, content: e.target.value }))}
            className="min-h-[400px] font-mono text-sm resize-y"
            dir="auto"
          />
          <p className="text-xs text-muted-foreground">
            The editor upgrades to split-view with toolbar in step 6.
          </p>
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
          <Plus className="h-4 w-4" /> New writeup
        </Button>
      </div>

      {writeups.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-12 text-center text-muted-foreground">
          <FileText className="h-8 w-8 opacity-30" />
          <p className="text-sm">No writeups yet.</p>
        </div>
      ) : (
        <div className="flex flex-col divide-y border rounded-lg overflow-hidden">
          {writeups.map((w) => (
            <button
              key={w.id}
              onClick={() => openRead(w)}
              className="flex items-center gap-3 px-4 py-3 text-left hover:bg-muted/40 transition-colors"
            >
              <span className="text-xs font-mono text-muted-foreground w-8">v{w.version}</span>
              <span className="flex-1 text-sm font-medium">{w.title}</span>
              <span className="text-xs text-muted-foreground">{formatDate(w.created_at)}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
