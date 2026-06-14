import { AlertTriangle, CheckCircle2 } from "lucide-react";

import type { RiskFinding } from "@/types/esg";
import { StatusBadge } from "@/components/StatusBadge";

type RiskCheckPanelProps = {
  findings: RiskFinding[];
};

export function RiskCheckPanel({ findings }: RiskCheckPanelProps) {
  if (findings.length === 0) {
    return (
      <div className="rounded-lg border border-ink-100 bg-white p-5 text-sm text-ink-500">
        风险校验结果尚未生成。生成报告初稿后点击风险校验。
      </div>
    );
  }

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {findings.map((finding) => (
        <article key={finding.id} className="rounded-lg border border-ink-100 bg-white p-5 shadow-sm">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-2">
              {finding.riskLevel === "低" ? (
                <CheckCircle2 className="h-5 w-5 text-brand-600" />
              ) : (
                <AlertTriangle className="h-5 w-5 text-amber-600" />
              )}
              <h3 className="text-sm font-semibold text-ink-900">{finding.type}</h3>
            </div>
            <StatusBadge value={finding.riskLevel} />
          </div>
          <dl className="mt-4 space-y-3 text-sm leading-6">
            <div>
              <dt className="font-semibold text-ink-900">风险描述</dt>
              <dd className="mt-1 text-ink-700">{finding.description}</dd>
            </div>
            <div>
              <dt className="font-semibold text-ink-900">涉及章节</dt>
              <dd className="mt-1 text-ink-700">{finding.sectionTitle}</dd>
            </div>
            <div>
              <dt className="font-semibold text-ink-900">建议修改方式</dt>
              <dd className="mt-1 text-ink-700">{finding.suggestion}</dd>
            </div>
          </dl>
        </article>
      ))}
    </div>
  );
}
