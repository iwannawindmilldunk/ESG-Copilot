"use client";

import { ChangeEvent, DragEvent, useRef, useState } from "react";
import { FileUp, Loader2 } from "lucide-react";

import type { ClassifiableFile } from "@/types/esg";
import { cn } from "@/lib/utils";

type FileUploaderProps = {
  onUpload: (files: ClassifiableFile[]) => Promise<void>;
  disabled?: boolean;
};

const ACCEPTED_FILE_TYPES = ".pdf,.doc,.docx,.xls,.xlsx,.csv,.ppt,.pptx,.txt,.md";

function toClassifiableFiles(files: FileList | File[]): ClassifiableFile[] {
  return Array.from(files).map((file) => ({
    name: file.name,
    type: file.type,
    size: file.size,
    uploadedAt: new Date().toISOString(),
  }));
}

export function FileUploader({ onUpload, disabled = false }: FileUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);

  async function handleFiles(files: FileList | File[]) {
    const payload = toClassifiableFiles(files);
    if (payload.length === 0) return;

    setUploading(true);
    try {
      await onUpload(payload);
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  function handleInputChange(event: ChangeEvent<HTMLInputElement>) {
    if (event.target.files) {
      void handleFiles(event.target.files);
    }
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setDragging(false);
    if (disabled || uploading) return;
    void handleFiles(event.dataTransfer.files);
  }

  return (
    <div
      onDragOver={(event) => {
        event.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
      className={cn(
        "rounded-lg border border-dashed bg-white p-8 text-center transition",
        dragging ? "border-brand-500 bg-brand-50" : "border-brand-200",
        disabled && "opacity-60",
      )}
    >
      <input
        ref={inputRef}
        type="file"
        multiple
        accept={ACCEPTED_FILE_TYPES}
        className="hidden"
        onChange={handleInputChange}
        disabled={disabled || uploading}
      />
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-lg bg-brand-50 text-brand-700">
        {uploading ? <Loader2 className="h-6 w-6 animate-spin" /> : <FileUp className="h-6 w-6" />}
      </div>
      <h3 className="mt-4 text-base font-semibold text-ink-900">上传企业 ESG 相关资料</h3>
      <p className="mt-2 text-sm leading-6 text-ink-600">拖拽文件到此处，或选择 PDF、Word、Excel、PPT、TXT、Markdown 文件。</p>
      <button
        type="button"
        disabled={disabled || uploading}
        onClick={() => inputRef.current?.click()}
        className="mt-5 inline-flex items-center justify-center rounded-lg bg-brand-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-800 disabled:cursor-not-allowed disabled:bg-ink-300"
      >
        {uploading ? "识别中..." : "选择文件"}
      </button>
    </div>
  );
}
