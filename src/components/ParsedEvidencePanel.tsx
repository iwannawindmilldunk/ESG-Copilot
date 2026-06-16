import { FileSearch } from "lucide-react";

import type { ParsedDocument } from "@/types/esg";

type ParsedEvidencePanelProps = {
  parsedDocuments: ParsedDocument[];
};

const parserStatusLabel = {
  parsed: "已解析",
  partial: "部分解析",
  unsupported: "待接入",
  failed: "解析失败",
} as const;

export function ParsedEvidencePanel({ parsedDocuments }: ParsedEvidencePanelProps) {
  if (parsedDocuments.length === 0) {
    return null;
  }

  return (
    <div className="rounded-lg border border-ink-100 bg-white p-5 shadow-sm">
      <div className="flex items-center gap-2">
        <FileSearch className="h-4 w-4 text-brand-700" />
        <h3 className="text-sm font-semibold text-ink-900">解析证据库</h3>
      </div>
      <p className="mt-2 text-sm leading-6 text-ink-600">
        系统已将可解析资料切分为 EvidenceChunk。后续清单覆盖判断、报告初稿和 Word 导出都会引用这些片段。
      </p>
      <div className="mt-4 grid gap-3">
        {parsedDocuments.map((document) => (
          <article key={document.id} className="rounded-lg border border-ink-100 bg-[#f7fbf9] p-4">
            <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
              <div>
                <h4 className="text-sm font-semibold text-ink-900">{document.fileName}</h4>
                <p className="mt-1 text-xs text-ink-500">
                  {document.category} / {parserStatusLabel[document.parserStatus]} / {document.chunks.length} 个证据片段
                </p>
              </div>
              <p className="max-w-xl text-xs leading-5 text-ink-500">{document.parserMessages.join("；")}</p>
            </div>
            {document.chunks.length > 0 ? (
              <div className="mt-3 grid gap-2 md:grid-cols-2">
                {document.chunks.slice(0, 4).map((chunk) => (
                  <div key={chunk.id} className="rounded-md bg-white p-3 ring-1 ring-ink-100">
                    <p className="text-xs font-semibold text-brand-800">{chunk.locationLabel}</p>
                    <p className="mt-1 line-clamp-3 text-xs leading-5 text-ink-600">{chunk.text}</p>
                  </div>
                ))}
              </div>
            ) : null}
          </article>
        ))}
      </div>
    </div>
  );
}
