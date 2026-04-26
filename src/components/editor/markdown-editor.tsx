"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import LinkExtension from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import { Markdown } from "tiptap-markdown";
import { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { toast } from "sonner";
import { EditorToolbar } from "@/components/editor/editor-toolbar";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface MarkdownEditorProps {
  initialContent?: string;
  placeholder?: string;
  draftKey: string;
  onSave: (content: string) => Promise<void>;
  saveLabel?: string;
}

export function MarkdownEditor({
  initialContent = "",
  placeholder = "Write here…",
  draftKey,
  onSave,
  saveLabel = "Save",
}: MarkdownEditorProps) {
  const [splitView, setSplitView] = useState(false);
  const [preview, setPreview] = useState(initialContent);
  const [saving, setSaving] = useState(false);
  const [draftBanner, setDraftBanner] = useState(false);
  const contentSet = useRef(false);
  const draftTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const editor = useEditor({
    extensions: [
      StarterKit,
      Markdown.configure({ html: false, tightLists: true }),
      LinkExtension.configure({ openOnClick: false, autolink: true }),
      Placeholder.configure({ placeholder }),
    ],
    editorProps: {
      attributes: {
        class: "outline-none min-h-[400px] px-4 py-3 text-sm leading-relaxed",
        dir: "auto",
      },
    },
    onUpdate({ editor }) {
      const md = editor.storage.markdown.getMarkdown();
      setPreview(md);

      // Auto-save draft every 5s
      if (draftTimer.current) clearTimeout(draftTimer.current);
      draftTimer.current = setTimeout(() => {
        localStorage.setItem(draftKey, md);
      }, 5000);
    },
  });

  // Set initial content + restore draft on mount
  useEffect(() => {
    if (!editor || contentSet.current) return;
    contentSet.current = true;

    const draft = localStorage.getItem(draftKey);
    if (draft && draft !== initialContent) {
      editor.commands.setContent(draft);
      setPreview(draft);
      setDraftBanner(true);
      setTimeout(() => setDraftBanner(false), 4000);
    } else {
      editor.commands.setContent(initialContent);
      setPreview(initialContent);
    }
  }, [editor]); // eslint-disable-line react-hooks/exhaustive-deps

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (draftTimer.current) clearTimeout(draftTimer.current);
    };
  }, []);

  async function handleSave() {
    if (!editor) return;
    setSaving(true);
    const markdown = editor.storage.markdown.getMarkdown();
    try {
      await onSave(markdown);
      localStorage.removeItem(draftKey);
    } catch {
      // error already toasted by caller
    }
    setSaving(false);
  }

  function handleDiscardDraft() {
    localStorage.removeItem(draftKey);
    editor?.commands.setContent(initialContent);
    setPreview(initialContent);
    setDraftBanner(false);
  }

  return (
    <div className="flex flex-col gap-3">
      {draftBanner && (
        <div className="flex items-center gap-3 text-xs bg-amber-50 border border-amber-200 text-amber-800 rounded-md px-3 py-2">
          <span>Draft restored from your last session.</span>
          <button
            className="underline hover:no-underline ml-auto"
            onClick={handleDiscardDraft}
          >
            Discard draft
          </button>
        </div>
      )}

      <div className="border rounded-lg overflow-hidden">
        <EditorToolbar
          editor={editor}
          splitView={splitView}
          onToggleSplit={() => setSplitView((v) => !v)}
        />

        <div className={cn("flex", splitView && "divide-x")}>
          {/* Editor pane */}
          <div className={cn("flex-1 overflow-auto max-h-[600px]")}>
            <EditorContent editor={editor} />
          </div>

          {/* Preview pane */}
          {splitView && (
            <div className="flex-1 overflow-auto max-h-[600px] px-4 py-3 bg-muted/10">
              <p className="text-xs text-muted-foreground mb-3 font-medium uppercase tracking-wide">Preview</p>
              <div className="prose prose-sm max-w-none dark:prose-invert" dir="auto">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{preview}</ReactMarkdown>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center gap-3">
        <Button onClick={handleSave} disabled={saving} size="sm">
          {saving ? "Saving…" : saveLabel}
        </Button>
        <p className="text-xs text-muted-foreground">Draft auto-saves every 5 seconds</p>
      </div>
    </div>
  );
}
