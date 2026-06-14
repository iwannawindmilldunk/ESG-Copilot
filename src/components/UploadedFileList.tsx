import { FileText } from "lucide-react";

import { formatBytes, formatDateTime } from "@/lib/export";
import type { UploadedFile } from "@/types/esg";

type UploadedFileListProps = {
  files: UploadedFile[];
};

export function UploadedFileList({ files }: UploadedFileListProps) {
  if (files.length === 0) {
    return (
      <div className="rounded-lg border border-ink-100 bg-white p-5 text-sm text-ink-500">
        暂无上传文件。上传后系统会自动显示文件类型、大小、上传时间和资料类别。
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-lg border border-ink-100 bg-white">
      <div className="border-b border-ink-100 px-4 py-3">
        <h3 className="text-sm font-semibold text-ink-900">已上传文件</h3>
      </div>
      <div className="divide-y divide-ink-100">
        {files.map((file) => (
          <div key={file.id} className="grid gap-3 px-4 py-4 md:grid-cols-[1.5fr_120px_120px_160px_150px] md:items-center">
            <div className="flex min-w-0 items-center gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-700">
                <FileText className="h-5 w-5" />
              </span>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-ink-900">{file.name}</p>
                <p className="mt-1 text-xs text-ink-500">ID: {file.id.slice(0, 14)}</p>
              </div>
            </div>
            <div className="text-sm text-ink-700">{file.type}</div>
            <div className="text-sm text-ink-700">{formatBytes(file.size)}</div>
            <div className="text-sm text-ink-700">{formatDateTime(file.uploadedAt)}</div>
            <div className="text-sm font-semibold text-brand-800">{file.category}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
