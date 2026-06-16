import type { DisclosureItem, UploadedFile } from "@/types/esg";
import { StatusBadge } from "@/components/StatusBadge";
import { Download, ExternalLink } from "lucide-react";

type DisclosureChecklistProps = {
  checklist: DisclosureItem[];
  files: UploadedFile[];
};

function formatStandardReference(standard: DisclosureItem["standards"][number]): string {
  if (standard.standardId === "cn-exchange-lite") {
    return `国内交易所：${standard.title}`;
  }

  return `${standard.code} ${standard.title}`;
}

function unique(values: string[]): string[] {
  return Array.from(new Set(values));
}

function uniqueSourceLinks(item: DisclosureItem): Array<DisclosureItem["standards"][number]["sourceLinks"][number]> {
  const byKey = new Map<string, DisclosureItem["standards"][number]["sourceLinks"][number]>();

  item.standards.flatMap((standard) => standard.sourceLinks).forEach((link) => {
    byKey.set(`${link.label}-${link.officialUrl}-${link.localPath ?? ""}`, link);
  });

  return Array.from(byKey.values());
}

export function DisclosureChecklist({ checklist, files }: DisclosureChecklistProps) {
  if (checklist.length === 0) {
    return (
      <div className="rounded-lg border border-ink-100 bg-white p-5 text-sm text-ink-500">
        披露清单尚未生成。选择披露标准并上传文件后，系统会按统一议题映射判断标准条目覆盖状态。
      </div>
    );
  }

  const filesById = new Map(files.map((file) => [file.id, file]));

  return (
    <div className="table-scroll overflow-x-auto rounded-lg border border-ink-100 bg-white">
      <table className="min-w-[1880px] divide-y divide-ink-100">
        <thead className="bg-ink-100/60">
          <tr>
            <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-ink-600">统一披露议题</th>
            <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-ink-600">类别</th>
            <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-ink-600">对应标准</th>
            <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-ink-600">对应条款/编号</th>
            <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-ink-600">来源/原文</th>
            <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-ink-600">披露要求摘要</th>
            <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-ink-600">材料状态</th>
            <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-ink-600">缺失内容</th>
            <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-ink-600">建议指标</th>
            <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-ink-600">建议责任部门</th>
            <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-ink-600">风险</th>
            <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-ink-600">依据文件</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-ink-100">
          {checklist.map((item) => {
            const evidenceFiles = item.evidenceFileIds.map((fileId) => filesById.get(fileId)?.name ?? fileId);
            const standardRefs = item.standards.map(formatStandardReference);
            const standardCodes = unique(item.standards.map((standard) => standard.code));
            const sourceReferences = unique(item.standards.flatMap((standard) => standard.sourceReferences));
            const sourceLinks = uniqueSourceLinks(item);
            const evidenceSnippets = item.evidenceSnippets ?? [];
            const missingEvidenceTypes = item.missingEvidenceTypes ?? [];

            return (
              <tr key={item.id} className="align-top">
                <td className="w-56 px-4 py-4 text-sm font-semibold text-ink-900">{item.topic}</td>
                <td className="px-4 py-4">
                  <StatusBadge value={item.category} />
                </td>
                <td className="w-72 px-4 py-4 text-sm leading-6 text-ink-700">{standardRefs.join(" / ")}</td>
                <td className="w-44 px-4 py-4 text-sm leading-6 text-ink-700">{standardCodes.join("；")}</td>
                <td className="w-80 px-4 py-4 text-sm leading-6 text-ink-700">
                  <div className="space-y-2">
                    <p>{sourceReferences.join("；")}</p>
                    <div className="flex flex-wrap gap-2">
                      {sourceLinks.map((link) => (
                        <span key={`${link.label}-${link.officialUrl}-${link.localPath ?? ""}`} className="inline-flex gap-1">
                          <a
                            href={link.officialUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 rounded-md border border-brand-200 px-2 py-0.5 text-xs font-semibold text-brand-800 hover:bg-brand-50"
                          >
                            <ExternalLink className="h-3 w-3" />
                            官网
                          </a>
                          {link.localPath ? (
                            <a
                              href={link.localPath}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1 rounded-md border border-ink-100 px-2 py-0.5 text-xs font-semibold text-ink-700 hover:bg-ink-100"
                            >
                              <Download className="h-3 w-3" />
                              原文
                            </a>
                          ) : null}
                        </span>
                      ))}
                    </div>
                  </div>
                </td>
                <td className="w-96 px-4 py-4 text-sm leading-6 text-ink-700">{item.requirement}</td>
                <td className="px-4 py-4">
                  <StatusBadge value={item.status} />
                </td>
                <td className="w-72 px-4 py-4 text-sm leading-6 text-ink-700">{item.missingContent}</td>
                <td className="w-64 px-4 py-4 text-sm leading-6 text-ink-700">{item.suggestedMetrics.join("、")}</td>
                <td className="w-56 px-4 py-4 text-sm leading-6 text-ink-700">{item.responsibleDepartment}</td>
                <td className="px-4 py-4">
                  <StatusBadge value={item.riskLevel} />
                </td>
                <td className="w-64 px-4 py-4 text-sm leading-6 text-ink-700">
                  <div className="space-y-2">
                    <p>{evidenceFiles.length > 0 ? evidenceFiles.join("、") : "暂无匹配"}</p>
                    {evidenceSnippets.length > 0 ? (
                      <div className="space-y-1">
                        {evidenceSnippets.slice(0, 2).map((snippet) => (
                          <p key={snippet.chunkId} className="rounded-md bg-brand-50 px-2 py-1 text-xs leading-5 text-brand-900">
                            {snippet.fileName} / {snippet.locationLabel}：{snippet.text}
                          </p>
                        ))}
                      </div>
                    ) : null}
                    {missingEvidenceTypes.length > 0 ? (
                      <p className="text-xs text-amber-700">缺失证据类型：{missingEvidenceTypes.join("、")}</p>
                    ) : null}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
