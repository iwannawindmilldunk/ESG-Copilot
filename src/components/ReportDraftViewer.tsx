import { FileCheck2, Link2 } from "lucide-react";

import { StatusBadge } from "@/components/StatusBadge";
import type { DisclosureItem, ReportSection } from "@/types/esg";

type ReportDraftViewerProps = {
  sections: ReportSection[];
  checklist?: DisclosureItem[];
};

export function ReportDraftViewer({ sections, checklist = [] }: ReportDraftViewerProps) {
  if (sections.length === 0) {
    return (
      <div className="rounded-lg border border-ink-100 bg-white p-5 text-sm text-ink-500">
        报告初稿尚未生成。请先生成披露清单，再点击生成报告初稿。
      </div>
    );
  }

  const topicById = new Map(checklist.map((item) => [item.id, item.topic]));

  return (
    <div className="space-y-4">
      {sections.map((section) => {
        const relatedTopics = section.relatedDisclosureItems.map((id) => topicById.get(id) ?? id);

        return (
          <article key={section.id} className="rounded-lg border border-ink-100 bg-white p-5 shadow-sm">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <h3 className="text-base font-semibold text-ink-900">{section.title}</h3>
              <div className="flex flex-wrap items-center gap-2 text-xs font-medium text-ink-500">
                <span className="inline-flex items-center gap-1">
                  <FileCheck2 className="h-4 w-4 text-brand-600" />
                  议题 {relatedTopics.length} 项 / 材料 {section.evidenceFileIds.length} 份
                </span>
                <StatusBadge value={section.confidenceLevel} />
              </div>
            </div>
            <p className="mt-4 whitespace-pre-wrap text-sm leading-7 text-ink-700">{section.content}</p>

            <div className="mt-5 grid gap-4 border-t border-ink-100 pt-4 lg:grid-cols-[1fr_1.3fr_120px]">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-ink-500">相关披露议题</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {relatedTopics.length > 0 ? (
                    relatedTopics.map((topic) => (
                      <span key={topic} className="rounded-full bg-brand-50 px-2.5 py-1 text-xs font-medium text-brand-800">
                        {topic}
                      </span>
                    ))
                  ) : (
                    <span className="text-sm text-ink-500">暂无直接关联议题</span>
                  )}
                </div>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-ink-500">依据材料 / 标准条目</p>
                <div className="mt-2 space-y-2">
                  {section.evidenceNotes.length > 0 ? (
                    section.evidenceNotes.map((note) => (
                      <div key={`${section.id}-${note.fileId}`} className="text-sm leading-6 text-ink-700">
                        <span className="inline-flex items-center gap-1 font-semibold text-ink-900">
                          <Link2 className="h-3.5 w-3.5 text-brand-600" />
                          {note.fileName}
                        </span>
                        <span className="ml-1 text-ink-600">{note.reason}</span>
                      </div>
                    ))
                  ) : (
                    <span className="text-sm text-ink-500">暂无绑定材料</span>
                  )}
                </div>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-ink-500">置信度</p>
                <div className="mt-2">
                  <StatusBadge value={section.confidenceLevel} />
                </div>
              </div>
            </div>
          </article>
        );
      })}
    </div>
  );
}
