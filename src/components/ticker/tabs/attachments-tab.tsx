"use client";

import { useState, useRef } from "react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/utils";
import { Upload, FileText, Trash2, Download } from "lucide-react";
import type { Attachment } from "@/types/database";

const ACCEPTED = ".pdf,.doc,.docx,.xls,.xlsx";
const BUCKET = "attachments";

function fileIcon(type: string) {
  return <FileText className="h-4 w-4 text-muted-foreground" />;
}

export function AttachmentsTab({ tickerId, initial }: { tickerId: string; initial: Attachment[] }) {
  const [attachments, setAttachments] = useState(initial);
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);

    const storagePath = `${tickerId}/${Date.now()}_${file.name}`;

    const { error: uploadError } = await supabase.storage
      .from(BUCKET)
      .upload(storagePath, file);

    if (uploadError) {
      toast.error("Upload failed: " + uploadError.message);
      setUploading(false);
      return;
    }

    const { data, error: dbError } = await supabase
      .from("attachments")
      .insert({
        ticker_id: tickerId,
        filename: file.name,
        storage_path: storagePath,
        file_type: file.type || "application/octet-stream",
      })
      .select()
      .single();

    if (dbError) {
      toast.error("Failed to save attachment record: " + dbError.message);
      setUploading(false);
      return;
    }

    setAttachments((prev) => [data as Attachment, ...prev]);
    toast.success(`${file.name} uploaded`);
    setUploading(false);
    if (inputRef.current) inputRef.current.value = "";
  }

  async function handleDownload(attachment: Attachment) {
    const { data, error } = await supabase.storage
      .from(BUCKET)
      .createSignedUrl(attachment.storage_path, 3600);

    if (error || !data?.signedUrl) {
      toast.error("Could not generate download link");
      return;
    }

    window.open(data.signedUrl, "_blank");
  }

  async function handleDelete(attachment: Attachment) {
    const { error: storageError } = await supabase.storage
      .from(BUCKET)
      .remove([attachment.storage_path]);

    if (storageError) {
      toast.error("Failed to delete file: " + storageError.message);
      return;
    }

    await supabase.from("attachments").delete().eq("id", attachment.id);
    setAttachments((prev) => prev.filter((a) => a.id !== attachment.id));
    toast.success("Deleted");
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-end">
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPTED}
          className="hidden"
          onChange={handleUpload}
        />
        <Button size="sm" onClick={() => inputRef.current?.click()} disabled={uploading}>
          <Upload className="h-4 w-4" />
          {uploading ? "Uploading…" : "Upload file"}
        </Button>
      </div>

      <p className="text-xs text-muted-foreground -mt-2">
        Accepted: PDF, Word, Excel. Files are private and accessible only via signed URLs.
      </p>

      {attachments.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-12 text-center text-muted-foreground">
          <Upload className="h-8 w-8 opacity-30" />
          <p className="text-sm">No attachments yet.</p>
        </div>
      ) : (
        <div className="flex flex-col divide-y border rounded-lg overflow-hidden">
          {attachments.map((a) => (
            <div key={a.id} className="flex items-center gap-3 px-4 py-3">
              {fileIcon(a.file_type)}
              <span className="flex-1 text-sm font-medium truncate">{a.filename}</span>
              <span className="text-xs text-muted-foreground">{formatDate(a.created_at)}</span>
              <div className="flex gap-1 ml-2">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => handleDownload(a)}
                  title="Download"
                >
                  <Download className="h-3.5 w-3.5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-destructive hover:text-destructive"
                  onClick={() => handleDelete(a)}
                  title="Delete"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
