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
import { ArrowLeft, Plus, FileText } from "lucide-react";
import type { Writeup } from "@/types/database";

type View = "list" | "read" | "write";

export function WriteupsTab({ tickerId, initial }: { tickerId: string; initial: Writeup[] }) {
  const router = useRouter();
  const [writeups, setWriteups] = useState(initial);
  const [view, setView] = useState<View>("list");
  const [selected, setSelected] = useState<Writeup | null>(null);
  const [title, setTitle] = useState("");
  const [titleError, setTitleError] = useState(false);

  function openNew() {
    setTitle("");
    setTitleError(false);
    setSelected(null);
    setView("write");
  }

  function openEdit(w: Writeup) {
    setTitle(w.title);
    setTitleError(false);
    setSelected(w);
    setView("write");
  }

  function openRead(w: Writeup) {
    setSelected(w);
    setView("read");
  }

  async function handleSave(content: string) {
    if (!title.trim()) {
      setTitleError(true);
      throw new Error("Title required");
    }
    setTitleError(false);

    const { data, error } = await supabase
      .from("writeups")
      .insert({ ticker_id: tickerId, title: title.trim(), content_md: content })
      .select()
      .single();

    if (error) {
      toast.error("Failed to save: " + error.message);
      throw error;
    }

    setWriteups((prev) => [data as Writeup, ...prev]);
    toast.success(`Saved as v${(data as Writeup).version}`);
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
          <span className="text-xs text-muted-foreground">
            v{selected.version} · {formatDate(selected.created_at)}
          </span>
          <Button variant="outline" size="sm" className="ml-auto" onClick={() => openEdit(selected)}>
            Edit (new version)
          </Button>
        </div>
        <h2 className="text-lg font-semibold">{selected.title}</h2>
        <div className="prose prose-sm max-w-none dark:prose-invert" dir="auto">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{selected.content_md}</ReactMarkdown>
        </div>
      </div>
    );
  }

  if (view === "write") {
    const draftKey = selected
      ? `draft-writeup-${tickerId}-from-${selected.id}`
      : `draft-writeup-${tickerId}-new`;

    return (
      <div className="flex flex-col gap-4 max-w-4xl">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => setView("list")}>
            <ArrowLeft className="h-4 w-4" /> Back
          </Button>
          <span className="text-sm text-muted-foreground">
            {selected
              ? `Editing from v${selected.version} — saves as new version`
              : "New writeup"}
          </span>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="title">Title</Label>
          <Input
            id="title"
            placeholder="Research notes, Q3 update…"
            value={title}
            onChange={(e) => { setTitle(e.target.value); setTitleError(false); }}
            className={titleError ? "border-destructive" : ""}
            autoFocus
          />
          {titleError && <p className="text-xs text-destructive">Title is required</p>}
        </div>

        <MarkdownEditor
          initialContent={selected?.content_md ?? ""}
          placeholder="Write your analysis here… (Hebrew supported)"
          draftKey={draftKey}
          onSave={handleSave}
          saveLabel="Save writeup"
        />
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
