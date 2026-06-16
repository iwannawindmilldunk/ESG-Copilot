import {
  AlignmentType,
  Document,
  HeadingLevel,
  Packer,
  Paragraph,
  Table,
  TableCell,
  TableRow,
  TextRun,
  WidthType,
} from "docx";

import type { DisclosureItem, ESGProjectSnapshot, ParsedDocument, ReportSection, RiskFinding } from "@/types/esg";

function text(value: string | number | undefined | null): string {
  return String(value ?? "");
}

function paragraph(value: string, options: { bold?: boolean; heading?: (typeof HeadingLevel)[keyof typeof HeadingLevel] } = {}) {
  return new Paragraph({
    heading: options.heading,
    children: [new TextRun({ text: value, bold: options.bold })],
    spacing: { after: 160 },
  });
}

function tableCell(value: string | number, bold = false): TableCell {
  return new TableCell({
    children: [
      new Paragraph({
        children: [new TextRun({ text: text(value), bold })],
      }),
    ],
  });
}

function table(headers: string[], rows: Array<Array<string | number>>): Table {
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      new TableRow({
        tableHeader: true,
        children: headers.map((header) => tableCell(header, true)),
      }),
      ...rows.map(
        (row) =>
          new TableRow({
            children: row.map((cell) => tableCell(cell)),
          }),
      ),
    ],
  });
}

function checklistRows(checklist: DisclosureItem[]): Array<Array<string | number>> {
  return checklist.map((item) => [
    item.category,
    item.topic,
    item.status,
    item.riskLevel,
    item.responsibleDepartment,
    item.missingEvidenceTypes?.join("、") || item.missingContent,
    item.evidenceSnippets?.map((snippet) => `${snippet.fileName} ${snippet.locationLabel}`).join("；") || "暂无证据片段",
  ]);
}

function reportChildren(sections: ReportSection[]) {
  if (sections.length === 0) return [paragraph("暂无报告初稿。")];

  return sections.flatMap((section) => [
    paragraph(section.title, { heading: HeadingLevel.HEADING_2 }),
    paragraph(section.content),
    paragraph(`置信度：${section.confidenceLevel}`),
    paragraph(
      `证据：${
        section.evidenceNotes.length > 0
          ? section.evidenceNotes
              .map((note) => `${note.fileName}${note.locationLabel ? ` ${note.locationLabel}` : ""}：${note.reason}`)
              .join("；")
          : "暂无证据"
      }`,
    ),
  ]);
}

function riskRows(findings: RiskFinding[]): Array<Array<string | number>> {
  return findings.map((finding) => [
    finding.riskLevel,
    finding.type,
    finding.sectionTitle,
    finding.description,
    finding.suggestion,
  ]);
}

function evidenceRows(parsedDocuments: ParsedDocument[]): Array<Array<string | number>> {
  return parsedDocuments.flatMap((document) =>
    document.chunks.slice(0, 20).map((chunk) => [
      document.fileName,
      chunk.locationLabel,
      chunk.category,
      chunk.text.slice(0, 180),
    ]),
  );
}

export async function snapshotToWordBuffer(snapshot: ESGProjectSnapshot): Promise<Buffer> {
  const children = [
    new Paragraph({
      heading: HeadingLevel.TITLE,
      alignment: AlignmentType.CENTER,
      children: [new TextRun({ text: "ESG 报告初稿与合规校验结果", bold: true })],
      spacing: { after: 260 },
    }),
    paragraph("生成说明", { heading: HeadingLevel.HEADING_1 }),
    paragraph("本文件由 ESG Copilot MVP 生成，正式披露前需由企业、ESG 顾问、法务和审计人员对照准则原文逐条复核。系统不会在缺少证据时编造具体数值。"),
    paragraph("一、报告正文", { heading: HeadingLevel.HEADING_1 }),
    ...reportChildren(snapshot.reportDraft),
    paragraph("二、披露清单", { heading: HeadingLevel.HEADING_1 }),
    table(["类别", "议题", "状态", "风险", "责任部门", "缺口/缺失证据", "证据片段"], checklistRows(snapshot.disclosureChecklist)),
    paragraph("三、风险校验", { heading: HeadingLevel.HEADING_1 }),
    table(["风险等级", "风险类型", "章节", "描述", "建议"], riskRows(snapshot.riskFindings)),
    paragraph("四、指标索引", { heading: HeadingLevel.HEADING_1 }),
    table(
      ["类别", "指标", "披露位置", "状态", "备注"],
      snapshot.indicatorIndex.map((indicator) => [
        indicator.category,
        indicator.indicator,
        indicator.disclosureLocation,
        indicator.status,
        indicator.notes,
      ]),
    ),
    paragraph("五、证据来源附录", { heading: HeadingLevel.HEADING_1 }),
    table(["文件", "位置", "类别", "证据摘录"], evidenceRows(snapshot.parsedDocuments ?? [])),
  ];

  const document = new Document({
    sections: [
      {
        properties: {},
        children,
      },
    ],
  });

  return Packer.toBuffer(document);
}
