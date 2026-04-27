"use client";

import { useState, useRef, useEffect } from "react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/utils";
import { Upload, FileText, FileSpreadsheet, Trash2, Download } from "lucide-react";
import type { Attachment } from "@/types/database";

const ACCEPTED = ".pdf,.doc,.docx,.xls,.xlsx";
const BUCKET = "attachments";

function FilePreview({ attachment, signedUrl }: { attachment: Attachment; signedUrl?: string }) {
  const isPdf = attachment.file_type === "application/pdf" || attachment.filename.toLowerCase().endsWith(".pdf");
  const isExcel =
    attachment.file_type.includes("spreadsheet") ||
    attachment.file_type.includes("excel") ||
    /\.(xls|xlsx)$/i.test(attachment.filename);

  if (isPdf && signedUrl) {
    return (
      <iframe
        src={`${signedUrl}#toolbar=0&navpanes=0&scrollbar=0&view=FitH`}
        className="w-full h-full border-0 pointer-events-none"
        title={attachment.filename}
        loading="lazy"
      />
    );
  }

  return (
    <div className="flex flex-col items-center justify-center gap-2 h-full text-muted-foreground">
      {isExcel ? (
        <FileSpreadsheet className="h-14 w-14 opacity-40 text-green-600" />
      ) : (
        <FileText className="h-14 w-14 opacity-40 text-blue-600" />
      )}
      <span className="text-xs font-semibold uppercase tracking-widest opacity-60">
        {attachment.filename.split(".").pop()}
      </span>
    </div>
  );
}

export function AttachmentsTab({ tickerId, initial }: { tickerId: string; initial: Attachment[] }) {
  const [attachments, setAttachments] = useState(initial);
  const [uploading, setUploading] = useState(false);
  const [signedUrls, setSignedUrls] = useState<Record<string, string>>({});
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (attachments.length === 0) return;
    const missing = attachments.filter((a) => !signedUrls[a.id]);
    if (missing.length === 0) return;

    Promise.all(
      missing.map(async (a) => {
        const { data } = await supabase.storage.from(BUCKET).createSignedUrl(a.storage_path, 3600);
        return data?.signedUrl ? ([a.id, data.signedUrl] as const) : null;
      })
    ).then((results) => {
      const next: Record<string, string> = {};
      for (const r of results) if (r) next[r[0]] = r[1];
      setSignedUrls((prev) => ({ ...prev, ...next }));
    });
  }, [attachments]); // eslint-disable-line react-hooks/exhaustive-deps

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);

    // Silently try to create bucket in case it doesn't exist yet
    await supabase.storage.createBucket(BUCKET, { public: false }).catch(() => null);

    const ext = file.name.includes(".") ? file.name.split(".").pop()! : "";
    const safeName = file.name
      .replace(/[^\x00-\x7F]/g, "")   // strip non-ASCII (Hebrew, etc.)
      .replace(/[^a-zA-Z0-9._-]/g, "_") // replace remaining special chars
      .replace(/_+/g, "_")
      .replace(/^_|_$/g, "")
      || `file${ext ? "." + ext : ""}`;
    const storagePath = `${tickerId}/${Date.now()}_${safeName}`;

    const { error: uploadError } = await supabase.storage.from(BUCKET).upload(storagePath, file);

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
    const url = signedUrls[attachment.id];
    if (url) {
      window.open(url, "_blank");
      return;
    }
    const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(attachment.storage_path, 3600);
    if (error || !data?.signedUrl) {
      toast.error("Could not generate download link");
      return;
    }
    window.open(data.signedUrl, "_blank");
  }

  async function handleDelete(attachment: Attachment) {
    const { error: storageError } = await supabase.storage.from(BUCKET).remove([attachment.storage_path]);

    if (storageError) {
      toast.error("Failed to delete file: " + storageError.message);
      return;
    }

    await supabase.from("attachments").delete().eq("id", attachment.id);
    setAttachments((prev) => prev.filter((a) => a.id !== attachment.id));
    setSignedUrls((prev) => {
      const next = { ...prev };
      delete next[attachment.id];
      return next;
    });
    toast.success("Deleted");
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">
          Accepted: PDF, Word, Excel. Files are private and accessible only via signed URLs.
        </p>
        <input ref={inputRef} type="file" accept={ACCEPTED} className="hidden" onChange={handleUpload} />
        <Button size="sm" onClick={() => inputRef.current?.click()} disabled={uploading}>
          <Upload className="h-4 w-4" />
          {uploading ? "Uploading…" : "Upload file"}
        </Button>
      </div>

      {attachments.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-12 text-center text-muted-foreground">
          <Upload className="h-8 w-8 opacity-30" />
          <p className="text-sm">No attachments yet.</p>
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-4">
          {attachments.map((a) => (
            <div
              key={a.id}
              className="group relative border rounded-lg overflow-hidden bg-background shadow-sm hover:shadow-md transition-shadow"
            >
              {/* Preview */}
              <div className="h-52 bg-muted/40 overflow-hidden">
                <FilePreview attachment={a} signedUrl={signedUrls[a.id]} />
              </div>

              {/* Action buttons — visible on hover */}
              <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <Button
                  variant="secondary"
                  size="icon"
                  className="h-7 w-7 shadow"
                  onClick={() => handleDownload(a)}
                  title="Download"
                >
                  <Download className="h-3.5 w-3.5" />
                </Button>
                <Button
                  variant="secondary"
                  size="icon"
                  className="h-7 w-7 shadow text-destructive hover:text-destructive"
                  onClick={() => handleDelete(a)}
                  title="Delete"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>

              {/* Footer */}
              <div className="px-3 py-2 border-t">
                <p className="text-sm font-medium truncate" title={a.filename}>
                  {a.filename}
                </p>
                <p className="text-xs text-muted-foreground">{formatDate(a.created_at)}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
