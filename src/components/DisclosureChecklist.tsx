import type { DisclosureItem } from "@/types/esg";
import { StatusBadge } from "@/components/StatusBadge";

type DisclosureChecklistProps = {
  checklist: DisclosureItem[];
};

export function DisclosureChecklist({ checklist }: DisclosureChecklistProps) {
  if (checklist.length === 0) {
    return (
      <div className="rounded-lg border border-ink-100 bg-white p-5 text-sm text-ink-500">
        披露清单尚未生成。上传文件后点击生成，系统会根据资料类别 mock 判断议题覆盖状态。
      </div>
    );
  }

  return (
    <div className="table-scroll overflow-x-auto rounded-lg border border-ink-100 bg-white">
      <table className="min-w-[1080px] divide-y divide-ink-100">
        <thead className="bg-ink-100/60">
          <tr>
            <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-ink-600">披露议题</th>
            <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-ink-600">类别</th>
            <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-ink-600">披露要求</th>
            <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-ink-600">材料状态</th>
            <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-ink-600">缺失内容</th>
            <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-ink-600">责任部门</th>
            <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-ink-600">风险</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-ink-100">
          {checklist.map((item) => (
            <tr key={item.id} className="align-top">
              <td className="w-52 px-4 py-4 text-sm font-semibold text-ink-900">{item.topic}</td>
              <td className="px-4 py-4">
                <StatusBadge value={item.category} />
              </td>
              <td className="w-72 px-4 py-4 text-sm leading-6 text-ink-700">{item.requirement}</td>
              <td className="px-4 py-4">
                <StatusBadge value={item.status} />
              </td>
              <td className="w-80 px-4 py-4 text-sm leading-6 text-ink-700">{item.missingContent}</td>
              <td className="w-48 px-4 py-4 text-sm leading-6 text-ink-700">{item.responsibleDepartment}</td>
              <td className="px-4 py-4">
                <StatusBadge value={item.riskLevel} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
