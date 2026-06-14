import type { ESGProjectSnapshot, ReportSection } from "@/types/esg";

export function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";

  const units = ["B", "KB", "MB", "GB"];
  const index = Math.floor(Math.log(bytes) / Math.log(1024));
  const value = bytes / 1024 ** index;
  return `${value.toFixed(index === 0 ? 0 : 1)} ${units[index]}`;
}

export function formatDateTime(iso: string): string {
  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

export function reportToPlainText(reportDraft: ReportSection[]): string {
  return reportDraft.map((section) => `${section.title}\n\n${section.content}`).join("\n\n");
}

export function snapshotToMarkdown(snapshot: ESGProjectSnapshot): string {
  const files = snapshot.uploadedFiles
    .map((file) => `- ${file.name} (${file.type}, ${formatBytes(file.size)}, ${file.category})`)
    .join("\n");

  const checklist = snapshot.disclosureChecklist
    .map(
      (item) =>
        `| ${item.category} | ${item.topic} | ${item.status} | ${item.riskLevel} | ${item.responsibleDepartment} |`,
    )
    .join("\n");

  const risks = snapshot.riskFindings
    .map((risk) => `- **${risk.riskLevel} / ${risk.type}** ${risk.sectionTitle}：${risk.description} 建议：${risk.suggestion}`)
    .join("\n");

  const indicators = snapshot.indicatorIndex
    .map(
      (indicator) =>
        `| ${indicator.category} | ${indicator.indicator} | ${indicator.disclosureLocation} | ${indicator.status} | ${indicator.notes} |`,
    )
    .join("\n");

  return `# AI ESG 报告生成结果

## 上传文件

${files || "暂无上传文件"}

## 披露清单

| 类别 | 披露议题 | 状态 | 风险等级 | 责任部门 |
| --- | --- | --- | --- | --- |
${checklist}

## 报告初稿

${reportToPlainText(snapshot.reportDraft)}

## 风险校验

${risks || "暂无风险发现"}

## 指标索引表

| 类别 | 指标 | 披露位置 | 状态 | 备注 |
| --- | --- | --- | --- | --- |
${indicators}
`;
}

export function downloadTextFile(fileName: string, content: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}
