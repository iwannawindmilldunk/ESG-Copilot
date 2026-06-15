import { FileCheck2 } from "lucide-react";

import type { ReportSection } from "@/types/esg";

type ReportDraftViewerProps = {
  sections: ReportSection[];
};

export function ReportDraftViewer({ sections }: ReportDraftViewerProps) {
  if (sections.length === 0) {
    return (
      <div className="rounded-lg border border-ink-100 bg-white p-5 text-sm text-ink-500">
        报告初稿尚未生成。请先生成披露清单，再点击生成报告初稿。
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {sections.map((section) => (
        <article key={section.id} className="rounded-lg border border-ink-100 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <h3 className="text-base font-semibold text-ink-900">{section.title}</h3>
            <div className="flex items-center gap-2 text-xs font-medium text-ink-500">
              <FileCheck2 className="h-4 w-4 text-brand-600" />
              关联议题 {section.relatedDisclosureItems.length} 项 / 证据文件 {section.evidenceFileIds.length} 份
            </div>
          </div>
          <p className="mt-4 whitespace-pre-wrap text-sm leading-7 text-ink-700">{section.content}</p>
          {section.evidenceNotes.length > 0 ? (
            <div className="mt-4 rounded-lg bg-brand-50 px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-brand-700">Evidence Notes</p>
              <ul className="mt-2 space-y-1 text-sm leading-6 text-ink-700">
                {section.evidenceNotes.map((note) => (
                  <li key={note}>{note}</li>
                ))}
              </ul>
            </div>
          ) : null}
        </article>
      ))}
    </div>
  );
}
