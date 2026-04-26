"use client";

import type { Editor } from "@tiptap/react";
import { cn } from "@/lib/utils";
import {
  Bold, Italic, Heading1, Heading2, Heading3,
  List, ListOrdered, Link, Code, Quote, Columns2, Square,
} from "lucide-react";

interface ToolbarButtonProps {
  onClick: () => void;
  active?: boolean;
  title: string;
  children: React.ReactNode;
}

function ToolbarButton({ onClick, active, title, children }: ToolbarButtonProps) {
  return (
    <button
      type="button"
      onMouseDown={(e) => {
        e.preventDefault(); // prevent editor losing focus
        onClick();
      }}
      title={title}
      className={cn(
        "flex items-center justify-center h-7 w-7 rounded text-sm transition-colors",
        active
          ? "bg-foreground text-background"
          : "text-muted-foreground hover:text-foreground hover:bg-muted"
      )}
    >
      {children}
    </button>
  );
}

function Divider() {
  return <div className="w-px h-5 bg-border mx-0.5" />;
}

interface EditorToolbarProps {
  editor: Editor | null;
  splitView: boolean;
  onToggleSplit: () => void;
}

export function EditorToolbar({ editor, splitView, onToggleSplit }: EditorToolbarProps) {
  if (!editor) return null;

  function handleLink() {
    const prev = editor!.getAttributes("link").href ?? "";
    const url = window.prompt("URL:", prev);
    if (url === null) return;
    if (url === "") {
      editor!.chain().focus().unsetLink().run();
    } else {
      editor!.chain().focus().setLink({ href: url, target: "_blank" }).run();
    }
  }

  return (
    <div className="flex items-center gap-0.5 flex-wrap border-b px-2 py-1.5 bg-muted/20">
      <ToolbarButton title="Bold (Ctrl+B)" active={editor.isActive("bold")} onClick={() => editor.chain().focus().toggleBold().run()}>
        <Bold className="h-3.5 w-3.5" />
      </ToolbarButton>
      <ToolbarButton title="Italic (Ctrl+I)" active={editor.isActive("italic")} onClick={() => editor.chain().focus().toggleItalic().run()}>
        <Italic className="h-3.5 w-3.5" />
      </ToolbarButton>

      <Divider />

      <ToolbarButton title="Heading 1" active={editor.isActive("heading", { level: 1 })} onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}>
        <Heading1 className="h-3.5 w-3.5" />
      </ToolbarButton>
      <ToolbarButton title="Heading 2" active={editor.isActive("heading", { level: 2 })} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}>
        <Heading2 className="h-3.5 w-3.5" />
      </ToolbarButton>
      <ToolbarButton title="Heading 3" active={editor.isActive("heading", { level: 3 })} onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}>
        <Heading3 className="h-3.5 w-3.5" />
      </ToolbarButton>

      <Divider />

      <ToolbarButton title="Bullet list" active={editor.isActive("bulletList")} onClick={() => editor.chain().focus().toggleBulletList().run()}>
        <List className="h-3.5 w-3.5" />
      </ToolbarButton>
      <ToolbarButton title="Numbered list" active={editor.isActive("orderedList")} onClick={() => editor.chain().focus().toggleOrderedList().run()}>
        <ListOrdered className="h-3.5 w-3.5" />
      </ToolbarButton>

      <Divider />

      <ToolbarButton title="Link" active={editor.isActive("link")} onClick={handleLink}>
        <Link className="h-3.5 w-3.5" />
      </ToolbarButton>
      <ToolbarButton title="Inline code" active={editor.isActive("code")} onClick={() => editor.chain().focus().toggleCode().run()}>
        <Code className="h-3.5 w-3.5" />
      </ToolbarButton>
      <ToolbarButton title="Blockquote" active={editor.isActive("blockquote")} onClick={() => editor.chain().focus().toggleBlockquote().run()}>
        <Quote className="h-3.5 w-3.5" />
      </ToolbarButton>

      <Divider />

      <ToolbarButton title={splitView ? "Single pane" : "Split preview"} active={splitView} onClick={onToggleSplit}>
        {splitView ? <Square className="h-3.5 w-3.5" /> : <Columns2 className="h-3.5 w-3.5" />}
      </ToolbarButton>
    </div>
  );
}
