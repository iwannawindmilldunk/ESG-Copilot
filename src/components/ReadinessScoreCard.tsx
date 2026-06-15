import { AlertTriangle, Gauge, ListChecks } from "lucide-react";

import type { ReadinessScoreResult } from "@/types/esg";

type ReadinessScoreCardProps = {
  score: ReadinessScoreResult;
};

function ScoreBar({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <div className="flex items-center justify-between text-xs font-semibold text-ink-600">
        <span>{label}</span>
        <span>{value}</span>
      </div>
      <div className="mt-2 h-2 rounded-full bg-ink-100">
        <div className="h-2 rounded-full bg-brand-600" style={{ width: `${Math.max(0, Math.min(value, 100))}%` }} />
      </div>
    </div>
  );
}

export function ReadinessScoreCard({ score }: ReadinessScoreCardProps) {
  return (
    <div className="rounded-lg border border-ink-100 bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="flex items-center gap-2 text-sm font-semibold text-brand-800">
            <Gauge className="h-4 w-4" />
            ESG 披露准备度
          </div>
          <div className="mt-3 flex items-end gap-2">
            <span className="text-4xl font-semibold text-ink-900">{score.totalScore}</span>
            <span className="pb-1 text-sm font-medium text-ink-500">/ 100</span>
          </div>
          <p className="mt-2 text-sm leading-6 text-ink-600">
            已覆盖 {score.coveredCount} 项，部分覆盖 {score.partialCount} 项，缺失 {score.missingCount} 项。
          </p>
        </div>

        <div className="grid min-w-0 flex-1 gap-3 md:grid-cols-3 lg:max-w-xl">
          <ScoreBar label="E 环境" value={score.eScore} />
          <ScoreBar label="S 社会" value={score.sScore} />
          <ScoreBar label="G 治理" value={score.gScore} />
        </div>
      </div>

      <div className="mt-5 grid gap-4 border-t border-ink-100 pt-4 lg:grid-cols-[220px_1fr]">
        <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
          <div className="flex items-center gap-2 font-semibold">
            <AlertTriangle className="h-4 w-4" />
            高风险缺失项
          </div>
          <p className="mt-2 text-2xl font-semibold">{score.highRiskMissingCount}</p>
        </div>

        <div>
          <div className="flex items-center gap-2 text-sm font-semibold text-ink-900">
            <ListChecks className="h-4 w-4 text-brand-700" />
            建议补充材料
          </div>
          <ul className="mt-3 grid gap-2 text-sm leading-6 text-ink-700 md:grid-cols-2">
            {score.recommendedNextMaterials.map((material) => (
              <li key={material} className="rounded-lg bg-brand-50 px-3 py-2">
                {material}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
