import { DISCLOSURE_STANDARDS } from "@/lib/esg/standards";
import type { DisclosureItem, ESGProjectSnapshot, IndicatorIndex, ReportSection, RiskFinding } from "@/types/esg";

const UTF8_BOM = "\ufeff";

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

function disclosureTopicMap(snapshot: ESGProjectSnapshot): Map<string, string> {
  return new Map(snapshot.disclosureChecklist.map((item) => [item.id, item.topic]));
}

function selectedStandardsMarkdown(snapshot: ESGProjectSnapshot): string {
  return (
    DISCLOSURE_STANDARDS.filter((standard) => snapshot.selectedStandardIds.includes(standard.id))
      .map((standard) => `- ${standard.name}（${standard.issuer}）`)
      .join("\n") || "暂无选择标准"
  );
}

function formatChecklistStandardRefs(item: DisclosureItem): string {
  return item.standards.map((standard) => `${standard.code} ${standard.title}`).join(" / ");
}

export function reportToPlainText(reportDraft: ReportSection[]): string {
  return reportDraft
    .map((section) => {
      const notes =
        section.evidenceNotes.length > 0
          ? `\n\n依据材料 / 标准条目\n${section.evidenceNotes.map((note) => `- ${note.fileName}：${note.reason}`).join("\n")}`
          : "";

      return `${section.title}\n\n${section.content}${notes}\n\n置信度：${section.confidenceLevel}`;
    })
    .join("\n\n");
}

export function snapshotToMarkdown(snapshot: ESGProjectSnapshot): string {
  const topicById = disclosureTopicMap(snapshot);
  const files = snapshot.uploadedFiles
    .map((file) => `- ${file.name} (${file.type}, ${formatBytes(file.size)}, ${file.category})`)
    .join("\n");
  const checklist = snapshot.disclosureChecklist
    .map(
      (item) =>
        `| ${item.category} | ${item.topic} | ${formatChecklistStandardRefs(item)} | ${item.status} | ${item.riskLevel} | ${item.suggestedMetrics.join("、")} | ${item.responsibleDepartment} | ${item.evidenceFileIds.join("、") || "暂无匹配"} |`,
    )
    .join("\n");
  const sections = snapshot.reportDraft
    .map((section) => {
      const topics = section.relatedDisclosureItems.map((id) => topicById.get(id) ?? id).join("、") || "无";
      const evidence =
        section.evidenceNotes.length > 0
          ? section.evidenceNotes.map((note) => `- ${note.fileName}：${note.reason}`).join("\n")
          : "- 暂无绑定材料";

      return `## ${section.title}

${section.content}

**相关披露议题**：${topics}

**依据材料 / 标准条目**

${evidence}

**置信度**：${section.confidenceLevel}`;
    })
    .join("\n\n");

  const risks = snapshot.riskFindings
    .map((risk) => `- **${risk.riskLevel} / ${risk.type}** ${risk.sectionTitle}：${risk.description} 建议：${risk.suggestion}`)
    .join("\n");
  const readiness = snapshot.readinessScore
    ? `总分：${snapshot.readinessScore.totalScore} / 100；E：${snapshot.readinessScore.eScore}，S：${snapshot.readinessScore.sScore}，G：${snapshot.readinessScore.gScore}；高风险缺失项：${snapshot.readinessScore.highRiskMissingCount}`
    : "暂无准备度评分。";

  return `# ESG 报告初稿

> 本文件由 MVP mock 工作流生成，正式披露前需进行资料复核、数据校验和合规审阅。

## 选择披露标准

${selectedStandardsMarkdown(snapshot)}

## 上传文件

${files || "暂无上传文件"}

## 披露清单

| 类别 | 统一披露议题 | 对应标准条目 | 状态 | 风险等级 | 建议指标 | 责任部门 | 依据文件 |
| --- | --- | --- | --- | --- | --- | --- | --- |
${checklist || "| - | 暂无 | - | - | - | - | - | - |"}

## 披露准备度评分

${readiness}

${sections || "暂无报告章节。"}

## 风险校验摘要

${risks || "暂无风险校验结果。"}
`;
}

function csvEscape(value: string | number): string {
  const text = String(value ?? "");
  if (/[",\r\n]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }

  return text;
}

function toCsv(rows: Array<Array<string | number>>): string {
  return `${UTF8_BOM}${rows.map((row) => row.map(csvEscape).join(",")).join("\r\n")}`;
}

export function disclosureChecklistToCsv(checklist: DisclosureItem[]): string {
  return toCsv([
    ["类别", "统一披露议题", "对应标准条目", "披露要求", "材料状态", "缺失内容", "建议指标", "责任部门", "风险等级", "依据文件ID"],
    ...checklist.map((item) => [
      item.category,
      item.topic,
      formatChecklistStandardRefs(item),
      item.requirement,
      item.status,
      item.missingContent,
      item.suggestedMetrics.join("、"),
      item.responsibleDepartment,
      item.riskLevel,
      item.evidenceFileIds.join("、"),
    ]),
  ]);
}

export function riskFindingsToCsv(findings: RiskFinding[]): string {
  return toCsv([
    ["风险等级", "风险类型", "涉及章节", "风险描述", "建议修改方式"],
    ...findings.map((finding) => [
      finding.riskLevel,
      finding.type,
      finding.sectionTitle,
      finding.description,
      finding.suggestion,
    ]),
  ]);
}

export function indicatorIndexToCsv(indicators: IndicatorIndex[]): string {
  return toCsv([
    ["类别", "指标", "披露位置", "状态", "备注"],
    ...indicators.map((indicator) => [
      indicator.category,
      indicator.indicator,
      indicator.disclosureLocation,
      indicator.status,
      indicator.notes,
    ]),
  ]);
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
