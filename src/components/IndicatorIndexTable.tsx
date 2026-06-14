import type { IndicatorIndex } from "@/types/esg";
import { StatusBadge } from "@/components/StatusBadge";

type IndicatorIndexTableProps = {
  indicators: IndicatorIndex[];
};

export function IndicatorIndexTable({ indicators }: IndicatorIndexTableProps) {
  if (indicators.length === 0) {
    return (
      <div className="rounded-lg border border-ink-100 bg-white p-5 text-sm text-ink-500">
        指标索引表尚未生成。报告初稿完成后点击生成指标索引表。
      </div>
    );
  }

  return (
    <div className="table-scroll overflow-x-auto rounded-lg border border-ink-100 bg-white">
      <table className="min-w-[920px] divide-y divide-ink-100">
        <thead className="bg-ink-100/60">
          <tr>
            <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-ink-600">指标</th>
            <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-ink-600">类别</th>
            <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-ink-600">披露位置</th>
            <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-ink-600">状态</th>
            <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-ink-600">备注</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-ink-100">
          {indicators.map((indicator) => (
            <tr key={indicator.id} className="align-top">
              <td className="w-64 px-4 py-4 text-sm font-semibold text-ink-900">{indicator.indicator}</td>
              <td className="px-4 py-4">
                <StatusBadge value={indicator.category} />
              </td>
              <td className="w-48 px-4 py-4 text-sm text-ink-700">{indicator.disclosureLocation}</td>
              <td className="px-4 py-4">
                <StatusBadge value={indicator.status} />
              </td>
              <td className="w-[420px] px-4 py-4 text-sm leading-6 text-ink-700">{indicator.notes}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
