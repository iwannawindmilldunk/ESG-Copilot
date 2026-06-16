import { DISCLOSURE_STANDARD_ITEMS } from "@/lib/esg/disclosureStandardItems";
import { getStandardClausesByItemIds } from "@/lib/esg/standardClauses";
import { getStandardName, getStandardSourceLinks, resolveSelectedStandardIds } from "@/lib/esg/standards";
import { TOPIC_MAPPINGS } from "@/lib/esg/topicMappings";
import { flattenEvidenceChunks } from "@/services/documentParserService";
import { summarizeEvidenceSnippets } from "@/services/llmService";
import type {
  ClassifiableFile,
  DisclosureItem,
  DisclosureStandardItem,
  DisclosureStatus,
  DocumentCategory,
  ESGCategory,
  EvidenceChunk,
  EvidenceNote,
  EvidenceSnippet,
  IndicatorIndex,
  IndicatorStatus,
  ParsedDocument,
  ReportSection,
  RiskFinding,
  RiskLevel,
  UploadedFile,
} from "@/types/esg";

const CATEGORY_KEYWORDS: Array<{ category: DocumentCategory; keywords: string[] }> = [
  {
    category: "环境数据",
    keywords: ["用电", "能耗", "碳", "环保", "排放", "环境", "能源", "用水", "废弃物", "危废", "节能"],
  },
  {
    category: "员工与社会责任",
    keywords: ["员工", "培训", "人力", "薪酬", "福利", "社保", "公益", "社区", "职业健康", "安全"],
  },
  {
    category: "供应链管理",
    keywords: ["供应商", "采购", "供应链", "招采", "准入"],
  },
  {
    category: "合规与风控",
    keywords: ["合规", "反腐败", "反商业贿赂", "风控", "风险", "内控", "审计", "举报", "隐私", "数据安全"],
  },
  {
    category: "公司治理",
    keywords: ["董事会", "治理", "股东", "委员会", "独立董事", "章程"],
  },
  {
    category: "财务/业务数据",
    keywords: ["年报", "财务", "业务", "营收", "收入", "利润", "经营", "客户"],
  },
  {
    category: "公司概况",
    keywords: ["公司概况", "公司简介", "企业介绍", "组织架构", "发展历程", "主营业务"],
  },
];

const RISKY_EXPRESSIONS = [
  "行业领先",
  "全面实现",
  "零排放",
  "100%合规",
  "全球最佳",
  "显著降低",
  "完全绿色",
  "无任何风险",
];

const SECTION_BY_CATEGORY = {
  E: "4. 环境责任",
  S: "5. 社会责任",
  G: "6. 公司治理",
} satisfies Record<ESGCategory, string>;

const RISK_RANK: Record<RiskLevel, number> = {
  低: 0,
  中: 1,
  高: 2,
};

function createId(prefix: string): string {
  const random = globalThis.crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2);
  return `${prefix}_${random}`;
}

function normalize(value: string): string {
  return value.toLowerCase().replace(/\s+/g, "");
}

function unique<T>(values: T[]): T[] {
  return Array.from(new Set(values));
}

function classifyDocumentCategory(fileName: string): DocumentCategory {
  const normalized = normalize(fileName);
  const matched = CATEGORY_KEYWORDS.find((item) =>
    item.keywords.some((keyword) => normalized.includes(normalize(keyword))),
  );

  return matched?.category ?? "其他";
}

function inferFileType(file: ClassifiableFile): string {
  if (file.type) {
    if (file.type.includes("pdf")) return "PDF";
    if (file.type.includes("sheet") || file.type.includes("excel")) return "Excel";
    if (file.type.includes("presentation") || file.type.includes("powerpoint")) return "PPT";
    if (file.type.includes("word") || file.type.includes("document")) return "Word";
    if (file.type.includes("markdown")) return "Markdown";
    if (file.type.includes("text")) return "TXT";
  }

  const extension = file.name.split(".").pop()?.toLowerCase();
  const typeMap: Record<string, string> = {
    pdf: "PDF",
    doc: "Word",
    docx: "Word",
    xls: "Excel",
    xlsx: "Excel",
    csv: "Excel/CSV",
    ppt: "PPT",
    pptx: "PPT",
    txt: "TXT",
    md: "Markdown",
  };

  return extension ? typeMap[extension] ?? extension.toUpperCase() : "未知";
}

function maxRiskLevel(items: DisclosureStandardItem[]): RiskLevel {
  return items.reduce<RiskLevel>(
    (highest, item) => (RISK_RANK[item.riskLevelIfMissing] > RISK_RANK[highest] ? item.riskLevelIfMissing : highest),
    "低",
  );
}

function resolveStatus(requiredEvidenceTypes: string[], matchedEvidenceTypes: string[]): DisclosureStatus {
  if (requiredEvidenceTypes.length === 0) return "已覆盖";
  if (matchedEvidenceTypes.length === 0) return "缺失";

  const ratio = matchedEvidenceTypes.length / requiredEvidenceTypes.length;
  return ratio >= 0.67 ? "已覆盖" : "部分覆盖";
}

function buildMissingContent(
  status: DisclosureStatus,
  requiredEvidenceTypes: string[],
  matchedEvidenceTypes: string[],
): string {
  const missingEvidenceTypes = requiredEvidenceTypes.filter((type) => !matchedEvidenceTypes.includes(type));

  if (missingEvidenceTypes.length === 0) {
    return "暂无明显缺失，建议在正式披露前补充数据口径、审批记录和证据编号。";
  }

  const missingText = missingEvidenceTypes.join("、");

  if (status === "部分覆盖") {
    return `已匹配部分资料，仍需补充：${missingText}。`;
  }

  return `缺少支撑材料：${missingText}。`;
}

function shortText(text: string, maxLength = 160): string {
  const normalized = text.replace(/\s+/g, " ").trim();
  return normalized.length > maxLength ? `${normalized.slice(0, maxLength)}...` : normalized;
}

function evidenceSnippetFromChunk(chunk: EvidenceChunk): EvidenceSnippet {
  return {
    chunkId: chunk.id,
    fileId: chunk.fileId,
    fileName: chunk.fileName,
    locationLabel: chunk.locationLabel,
    text: shortText(chunk.text, 180),
  };
}

function evidenceKeywords(topic: string, items: DisclosureStandardItem[]): string[] {
  const raw = [
    topic,
    ...items.flatMap((item) => [
      item.title,
      item.theme,
      item.requirementSummary,
      ...item.suggestedMetrics,
      ...item.requiredEvidenceTypes,
    ]),
  ];

  return unique(
    raw.flatMap((value) =>
      value
        .split(/[，。；、,.;:：/()\s]+/)
        .map((token) => token.trim())
        .filter((token) => token.length >= 2),
    ),
  );
}

function chunkScore(chunk: EvidenceChunk, keywords: string[]): number {
  const normalizedText = normalize(`${chunk.fileName}${chunk.locationLabel}${chunk.text}`);
  const keywordScore = keywords.reduce(
    (score, keyword) => (normalizedText.includes(normalize(keyword)) ? score + 1 : score),
    0,
  );
  const numberScore = /\d/.test(chunk.text) ? 0.5 : 0;
  return keywordScore + numberScore;
}

function assessChecklistCoverage(params: {
  topic: string;
  items: DisclosureStandardItem[];
  files: UploadedFile[];
  parsedDocuments: ParsedDocument[];
}): {
  status: DisclosureStatus;
  evidenceFileIds: string[];
  evidenceChunkIds: string[];
  evidenceSnippets: EvidenceSnippet[];
  missingEvidenceTypes: string[];
  matchedEvidenceTypes: string[];
} {
  const requiredEvidenceTypes = unique(params.items.flatMap((item) => item.requiredEvidenceTypes));
  const chunks = flattenEvidenceChunks(params.parsedDocuments);
  const keywords = evidenceKeywords(params.topic, params.items);
  const candidateChunks = chunks.filter((chunk) => requiredEvidenceTypes.includes(chunk.category));
  const matchedChunks = candidateChunks
    .map((chunk) => ({ chunk, score: chunkScore(chunk, keywords) }))
    .filter(({ score }) => score > 0)
    .sort((left, right) => right.score - left.score)
    .map(({ chunk }) => chunk);

  const categoryFallbackFiles = params.files.filter((file) => requiredEvidenceTypes.includes(file.category));
  const matchedEvidenceTypes = requiredEvidenceTypes.filter((type) => {
    if (matchedChunks.some((chunk) => chunk.category === type)) return true;

    const parsedChunkForType = candidateChunks.some((chunk) => chunk.category === type);
    return !parsedChunkForType && categoryFallbackFiles.some((file) => file.category === type);
  });
  const evidenceFileIds = unique([
    ...matchedChunks.map((chunk) => chunk.fileId),
    ...categoryFallbackFiles
      .filter((file) => matchedEvidenceTypes.includes(file.category))
      .map((file) => file.id),
  ]);
  const evidenceChunkIds = unique(matchedChunks.map((chunk) => chunk.id));

  return {
    status: resolveStatus(requiredEvidenceTypes, matchedEvidenceTypes),
    evidenceFileIds,
    evidenceChunkIds,
    evidenceSnippets: matchedChunks.slice(0, 4).map(evidenceSnippetFromChunk),
    missingEvidenceTypes: requiredEvidenceTypes.filter((type) => !matchedEvidenceTypes.includes(type)),
    matchedEvidenceTypes,
  };
}

function buildRequirementSummary(items: DisclosureStandardItem[]): string {
  return items
    .map((item) => {
      const sourceText = sourceReferencesForItem(item).join("、");
      return `${item.code} ${item.title}：${item.requirementSummary}（来源：${sourceText}）`;
    })
    .join("；");
}

function sourceReferencesForItem(item: DisclosureStandardItem): string[] {
  if (item.sourceReferences?.length) {
    return item.sourceReferences;
  }

  if (item.standardId === "gri-lite") {
    return [`GRI Standards Resource Center：${item.code} ${item.title}`];
  }

  if (item.standardId === "issb-lite") {
    if (item.code.includes("S2") || item.id.includes("climate") || item.id.includes("ghg")) {
      return ["IFRS S2 Climate-related Disclosures"];
    }

    return ["IFRS S1 General Requirements"];
  }

  if (item.standardId === "cn-exchange-lite") {
    if (
      item.id.includes("pollution") ||
      item.id.includes("waste") ||
      item.id.includes("biodiversity") ||
      item.id.includes("environmental") ||
      item.id.includes("energy") ||
      item.id.includes("water") ||
      item.id.includes("circular")
    ) {
      return ["沪深北交易所可持续发展报告指引：环境信息披露相关条款"];
    }

    if (item.id.includes("climate")) {
      return ["沪深北交易所可持续发展报告指引：应对气候变化相关条款"];
    }

    return ["沪深北交易所可持续发展报告指引：可持续发展重要议题相关条款"];
  }

  return [item.code];
}

function formatStandardReference(standard: DisclosureItem["standards"][number]): string {
  if (standard.standardId === "cn-exchange-lite") {
    return `国内交易所：${standard.title}`;
  }

  return `${standard.code} ${standard.title}`;
}

function formatChecklistStandardRefs(item: DisclosureItem): string {
  return item.standards.map(formatStandardReference).join(" / ");
}

function formatChecklistSourceRefs(item: DisclosureItem): string {
  return unique(item.standards.flatMap((standard) => standard.sourceReferences)).join(" / ");
}

function itemIds(checklist: DisclosureItem[], category?: ESGCategory): string[] {
  return checklist.filter((item) => !category || item.category === category).map((item) => item.id);
}

function coveredRatio(checklist: DisclosureItem[], category?: ESGCategory): string {
  const scoped = checklist.filter((item) => !category || item.category === category);
  const covered = scoped.filter((item) => item.status !== "缺失").length;
  return `${covered}/${scoped.length}`;
}

function missingTopics(checklist: DisclosureItem[], category?: ESGCategory): string[] {
  return checklist
    .filter((item) => (!category || item.category === category) && item.status === "缺失")
    .map((item) => item.topic);
}

function categoriesSummary(files: UploadedFile[]): string {
  if (files.length === 0) {
    return "当前尚未上传企业资料，报告内容将以待补充说明为主。";
  }

  const counts = files.reduce<Record<DocumentCategory, number>>(
    (acc, file) => {
      acc[file.category] += 1;
      return acc;
    },
    {
      公司概况: 0,
      公司治理: 0,
      环境数据: 0,
      员工与社会责任: 0,
      供应链管理: 0,
      合规与风控: 0,
      "财务/业务数据": 0,
      其他: 0,
    },
  );

  return Object.entries(counts)
    .filter(([, count]) => count > 0)
    .map(([category, count]) => `${category}${count}份`)
    .join("、");
}

function overviewEvidence(files: UploadedFile[]): string[] {
  return files
    .filter((file) => file.category === "公司概况" || file.category === "财务/业务数据")
    .map((file) => file.id);
}

function evidenceFromItems(items: DisclosureItem[]): string[] {
  return unique(items.flatMap((item) => item.evidenceFileIds));
}

function evidenceChunksFromItems(items: DisclosureItem[]): string[] {
  return unique(items.flatMap((item) => item.evidenceChunkIds ?? []));
}

function evidenceSnippetsFromItems(items: DisclosureItem[]): EvidenceSnippet[] {
  return items.flatMap((item) => item.evidenceSnippets ?? []);
}

function evidenceSummaryFromItems(items: DisclosureItem[]): string {
  const snippets = evidenceSnippetsFromItems(items);
  if (snippets.length === 0) return "";
  return `当前可引用证据摘要：${summarizeEvidenceSnippets(snippets).data}。`;
}

function sectionItems(checklist: DisclosureItem[], category?: ESGCategory): DisclosureItem[] {
  return checklist.filter((item) => !category || item.category === category);
}

function standardNamesFromChecklist(checklist: DisclosureItem[]): string {
  const names = unique(checklist.flatMap((item) => item.standards.map((standard) => standard.standardName)));
  return names.length > 0 ? names.join("、") : "未选择披露标准";
}

function evidenceFileNames(item: DisclosureItem, filesById: Map<string, UploadedFile>): string {
  const names = item.evidenceFileIds.map((fileId) => filesById.get(fileId)?.name ?? fileId);
  return names.length > 0 ? names.join("、") : "暂无匹配文件";
}

function buildEvidenceNotes(items: DisclosureItem[], files: UploadedFile[]): EvidenceNote[] {
  const filesById = new Map(files.map((file) => [file.id, file]));
  const snippetNotes = items.flatMap((item) =>
    (item.evidenceSnippets ?? []).map((snippet) => ({
      fileId: snippet.fileId,
      fileName: snippet.fileName,
      chunkId: snippet.chunkId,
      locationLabel: snippet.locationLabel,
      reason: `证据片段支持议题“${item.topic}”：${snippet.text}`,
    })),
  );

  if (snippetNotes.length > 0) {
    return snippetNotes;
  }

  return items.map((item) => ({
    fileId: item.id,
    fileName: item.topic,
    reason: `覆盖标准：${formatChecklistStandardRefs(item)}；来源引用：${formatChecklistSourceRefs(item)}；材料状态：${item.status}；依据文件：${evidenceFileNames(item, filesById)}`,
  }));
}

function confidenceForItems(items: DisclosureItem[]): RiskLevel {
  if (items.length === 0) return "低";
  if (items.every((item) => item.status === "已覆盖")) return "高";
  if (items.some((item) => item.status !== "缺失")) return "中";
  return "低";
}

function statusToIndicatorStatus(status: DisclosureStatus): IndicatorStatus {
  if (status === "已覆盖") return "已披露";
  if (status === "部分覆盖") return "部分披露";
  return "未披露";
}

function locationFor(item: DisclosureItem): string {
  return item.status === "缺失" ? "待补充" : SECTION_BY_CATEGORY[item.category];
}

// Future LLM integration point:
// Replace these rule-based functions with OpenAI / Anthropic / private model calls.
// Keep the function signatures stable so API routes and UI workflows do not need to change.
export function classifyFiles(files: ClassifiableFile[]): UploadedFile[] {
  const now = new Date().toISOString();

  return files.map((file) => ({
    id: createId("file"),
    name: file.name,
    type: inferFileType(file),
    size: file.size,
    uploadedAt: file.uploadedAt ?? now,
    category: classifyDocumentCategory(file.name),
  }));
}

export function generateDisclosureChecklist(
  files: UploadedFile[],
  selectedStandardIds: string[] = ["cn-exchange-lite"],
  parsedDocuments: ParsedDocument[] = [],
): DisclosureItem[] {
  const effectiveStandardIds = resolveSelectedStandardIds(selectedStandardIds);
  const selectedItemsById = new Map(
    DISCLOSURE_STANDARD_ITEMS.filter((item) => effectiveStandardIds.includes(item.standardId)).map((item) => [
      item.id,
      item,
    ]),
  );

  return TOPIC_MAPPINGS.flatMap((mapping) => {
    const mappedItems = mapping.mappedStandardItemIds
      .map((itemId) => selectedItemsById.get(itemId))
      .filter((item): item is DisclosureStandardItem => Boolean(item));

    if (mappedItems.length === 0) {
      return [];
    }

    const requiredEvidenceTypes = unique(mappedItems.flatMap((item) => item.requiredEvidenceTypes));
    const assessment = assessChecklistCoverage({
      topic: mapping.topicName,
      items: mappedItems,
      files,
      parsedDocuments,
    });
    const clauses = getStandardClausesByItemIds(mappedItems.map((item) => item.id));

    return [
      {
        id: mapping.topicId,
        topic: mapping.topicName,
        category: mapping.category,
        standards: mappedItems.map((item) => ({
          standardId: item.standardId,
          standardName: getStandardName(item.standardId),
          code: item.code,
          title: item.title,
          sourceReferences: sourceReferencesForItem(item),
          sourceLinks: getStandardSourceLinks(item.standardId),
        })),
        requirement: buildRequirementSummary(mappedItems),
        status: assessment.status,
        missingContent: buildMissingContent(assessment.status, requiredEvidenceTypes, assessment.matchedEvidenceTypes),
        responsibleDepartment: unique(mappedItems.flatMap((item) => item.suggestedDepartments)).join(" / "),
        riskLevel: maxRiskLevel(mappedItems),
        suggestedMetrics: unique(mappedItems.flatMap((item) => item.suggestedMetrics)),
        sourceClauseIds: clauses.map((clause) => clause.id),
        evidenceFileIds: assessment.evidenceFileIds,
        evidenceChunkIds: assessment.evidenceChunkIds,
        evidenceSnippets: assessment.evidenceSnippets,
        missingEvidenceTypes: assessment.missingEvidenceTypes,
        applicability: "待判断",
        reviewStatus: assessment.status === "缺失" ? "需补充" : "待审阅",
        reviewNote:
          assessment.evidenceSnippets.length > 0
            ? `已命中 ${assessment.evidenceSnippets.length} 条证据片段，建议人工复核适用性和数据口径。`
            : "暂无正文证据片段，需补充材料或人工标记不适用依据。",
      },
    ];
  });
}

export function generateReportDraft(files: UploadedFile[], checklist: DisclosureItem[]): ReportSection[] {
  const summary = categoriesSummary(files);
  const standardScope = standardNamesFromChecklist(checklist);
  const allItems = sectionItems(checklist);
  const envItems = sectionItems(checklist, "E");
  const socialItems = sectionItems(checklist, "S");
  const governanceItems = sectionItems(checklist, "G");
  const envMissing = missingTopics(checklist, "E");
  const socialMissing = missingTopics(checklist, "S");
  const governanceMissing = missingTopics(checklist, "G");
  const suggestedMetrics = unique(checklist.flatMap((item) => item.suggestedMetrics));

  return [
    {
      id: "section-overview",
      title: "1. 公司概况",
      relatedDisclosureItems: checklist.map((item) => item.id),
      evidenceFileIds: overviewEvidence(files),
      evidenceChunkIds: evidenceChunksFromItems(allItems),
      evidenceNotes: [
        {
          fileId: "standard-scope",
          fileName: "披露标准范围",
          reason: `本次报告初稿基于统一议题清单生成，覆盖标准范围：${standardScope}；来源引用已绑定到官方原文和本地原文入口，正式披露前需逐条复核。`,
        },
      ],
      confidenceLevel: files.length > 0 ? "中" : "低",
      content: `本报告初稿基于企业已上传资料和标准映射驱动的披露清单生成。当前系统识别到的资料覆盖情况为：${summary}。本次标准范围为：${standardScope}。正式披露前，仍需由企业对照官方准则原文确认适用范围、组织边界、报告期间、数据口径和证据编号。`,
    },
    {
      id: "section-governance-structure",
      title: "2. ESG 治理架构",
      relatedDisclosureItems: itemIds(checklist, "G"),
      evidenceFileIds: evidenceFromItems(governanceItems),
      evidenceChunkIds: evidenceChunksFromItems(governanceItems),
      evidenceNotes: buildEvidenceNotes(governanceItems, files),
      confidenceLevel: confidenceForItems(governanceItems),
      content:
        governanceMissing.length > 0
          ? `${evidenceSummaryFromItems(governanceItems)}公司已开始梳理 ESG 治理、合规和风险管理相关材料。针对 ${governanceMissing.slice(0, 3).join("、")} 等议题，后续应补充董事会或管理层职责、汇报机制、风险评估流程和制度执行记录。`
          : `${evidenceSummaryFromItems(governanceItems)}公司已提供治理、合规或风控相关资料，可支持 ESG 治理架构章节的基础披露。建议后续补充董事会审议记录、管理层汇报机制、跨部门协同流程和绩效考核衔接。`,
    },
    {
      id: "section-materiality",
      title: "3. 重要性议题分析",
      relatedDisclosureItems: checklist.map((item) => item.id),
      evidenceFileIds: evidenceFromItems(allItems),
      evidenceChunkIds: evidenceChunksFromItems(allItems),
      evidenceNotes: buildEvidenceNotes(allItems, files),
      confidenceLevel: confidenceForItems(allItems),
      content: `${evidenceSummaryFromItems(allItems)}根据当前披露清单，E 类议题覆盖进度为 ${coveredRatio(checklist, "E")}，S 类议题覆盖进度为 ${coveredRatio(checklist, "S")}，G 类议题覆盖进度为 ${coveredRatio(checklist, "G")}。后续建议结合监管要求、影响重要性、财务重要性和利益相关方关注，对统一议题进行分级排序。`,
    },
    {
      id: "section-environment",
      title: "4. 环境责任",
      relatedDisclosureItems: itemIds(checklist, "E"),
      evidenceFileIds: evidenceFromItems(envItems),
      evidenceChunkIds: evidenceChunksFromItems(envItems),
      evidenceNotes: buildEvidenceNotes(envItems, files),
      confidenceLevel: confidenceForItems(envItems),
      content:
        envMissing.length > 0
          ? `${evidenceSummaryFromItems(envItems)}公司后续应优先补充 ${envMissing.slice(0, 3).join("、")} 等环境议题的证据材料。建议建立能源、水资源、温室气体排放、污染物排放、废弃物和生态保护等指标台账，并明确数据来源、统计边界和复核责任。`
          : `${evidenceSummaryFromItems(envItems)}公司已上传环境相关资料，可作为环境责任章节的基础依据。建议在正式报告中补充能源消耗、温室气体排放、水资源利用、污染物和废弃物处理等量化指标，并说明环境合规和低碳转型措施。`,
    },
    {
      id: "section-social",
      title: "5. 社会责任",
      relatedDisclosureItems: itemIds(checklist, "S"),
      evidenceFileIds: evidenceFromItems(socialItems),
      evidenceChunkIds: evidenceChunksFromItems(socialItems),
      evidenceNotes: buildEvidenceNotes(socialItems, files),
      confidenceLevel: confidenceForItems(socialItems),
      content:
        socialMissing.length > 0
          ? `${evidenceSummaryFromItems(socialItems)}公司已具备部分社会责任披露基础。针对 ${socialMissing.slice(0, 3).join("、")} 等尚未充分覆盖的议题，建议补充员工、职业健康安全、供应链、产品服务、社区贡献等方面的制度、统计数据和执行记录。`
          : `${evidenceSummaryFromItems(socialItems)}公司已上传员工、供应链、产品服务或社会贡献相关资料，可支持社会责任章节的基础披露。建议继续补充员工结构、培训覆盖、工伤事故、供应商评估、客户投诉处理和公益投入等指标。`,
    },
    {
      id: "section-governance",
      title: "6. 公司治理",
      relatedDisclosureItems: itemIds(checklist, "G"),
      evidenceFileIds: evidenceFromItems(governanceItems),
      evidenceChunkIds: evidenceChunksFromItems(governanceItems),
      evidenceNotes: buildEvidenceNotes(governanceItems, files),
      confidenceLevel: confidenceForItems(governanceItems),
      content:
        governanceMissing.length > 0
          ? `${evidenceSummaryFromItems(governanceItems)}公司后续应完善 ${governanceMissing.slice(0, 3).join("、")} 等治理议题的证据链。建议补充治理制度、风险清单、尽职调查记录、反腐败培训、举报处理、数据安全和公平竞争相关材料。`
          : `${evidenceSummaryFromItems(governanceItems)}公司已上传公司治理、合规或风控相关资料，可支持公司治理章节的基础披露。建议在正式报告中说明治理架构、风险管理、反腐败、数据安全、利益相关方沟通和公平竞争机制。`,
    },
    {
      id: "section-kpi",
      title: "7. 关键绩效表",
      relatedDisclosureItems: checklist.map((item) => item.id),
      evidenceFileIds: evidenceFromItems(allItems),
      evidenceChunkIds: evidenceChunksFromItems(allItems),
      evidenceNotes: buildEvidenceNotes(allItems, files),
      confidenceLevel: confidenceForItems(allItems),
      content: `关键绩效表建议按统一议题维护，并与标准条目保持映射。当前建议优先补充的指标包括：${suggestedMetrics.slice(0, 18).join("、") || "暂无建议指标"}。MVP 阶段不会编造具体数值，后续应由责任部门确认统计范围、单位、周期和数据负责人。`,
    },
    {
      id: "section-index",
      title: "8. 指标索引表",
      relatedDisclosureItems: checklist.map((item) => item.id),
      evidenceFileIds: evidenceFromItems(allItems),
      evidenceChunkIds: evidenceChunksFromItems(allItems),
      evidenceNotes: buildEvidenceNotes(allItems, files),
      confidenceLevel: confidenceForItems(allItems),
      content:
        "指标索引表将基于统一披露清单自动生成，包含披露议题、所属类别、关联标准条目、披露位置、材料状态和备注。对当前材料显示为缺失或部分覆盖的议题，建议在索引表中标注待补充资料和责任部门，便于项目管理和审阅追踪。",
    },
    {
      id: "section-next",
      title: "9. 下一步提升建议",
      relatedDisclosureItems: checklist.filter((item) => item.status !== "已覆盖").map((item) => item.id),
      evidenceFileIds: evidenceFromItems(checklist.filter((item) => item.status !== "缺失")),
      evidenceChunkIds: evidenceChunksFromItems(checklist.filter((item) => item.status !== "缺失")),
      evidenceNotes: buildEvidenceNotes(
        checklist.filter((item) => item.status !== "已覆盖"),
        files,
      ),
      confidenceLevel: confidenceForItems(checklist),
      content:
        "建议下一阶段优先建立 ESG 数据台账，按统一议题沉淀数据口径、责任部门、证据文件和复核流程。对于高风险缺失项，应先补齐制度、记录或量化指标，再进入正式报告撰写和法务审阅环节。",
    },
  ];
}

export function checkReportRisks(reportDraft: ReportSection[], checklist: DisclosureItem[]): RiskFinding[] {
  const findings: RiskFinding[] = [];

  reportDraft.forEach((section) => {
    RISKY_EXPRESSIONS.forEach((expression) => {
      if (section.content.includes(expression)) {
        findings.push({
          id: createId("risk"),
          type: "夸大表述",
          description: `发现可能过度承诺或缺少证据支撑的表述：“${expression}”。`,
          sectionTitle: section.title,
          suggestion: "该表述可能缺少量化数据或第三方证明，建议改为更审慎表述。",
          riskLevel: "高",
        });
      }
    });

    if (section.confidenceLevel === "低" && section.relatedDisclosureItems.length > 0) {
      findings.push({
        id: createId("risk"),
        type: "证据链不足",
        description: `${section.title} 的关联议题证据覆盖较弱，报告内容应保持审慎。`,
        sectionTitle: section.title,
        suggestion: "补充制度文件、数据台账、审批记录或外部证明，并在报告中标注证据编号。",
        riskLevel: "中",
      });
    }

    if (section.relatedDisclosureItems.length > 0 && (section.evidenceChunkIds?.length ?? 0) === 0) {
      findings.push({
        id: createId("risk"),
        type: "无证据结论",
        description: `${section.title} 尚未绑定可追溯证据片段，相关结论不应写成确定性事实。`,
        sectionTitle: section.title,
        suggestion: "补充 EvidenceChunk 引用；没有证据时使用“待补充”“后续将完善”等审慎表述。",
        riskLevel: "中",
      });
    }

    if (
      /(数据|指标|排放|能源|用水|员工|投入|金额)/.test(section.content) &&
      !/(统计口径|数据口径|组织边界|报告边界|统计周期|报告期间)/.test(section.content)
    ) {
      findings.push({
        id: createId("risk"),
        type: "数据口径缺失",
        description: `${section.title} 涉及数据或指标，但未明确统计口径、组织边界或报告期间。`,
        sectionTitle: section.title,
        suggestion: "补充数据来源、统计周期、单位、组织边界和责任部门复核记录。",
        riskLevel: "中",
      });
    }
  });

  const environmentSection = reportDraft.find((section) => section.title.includes("环境责任"));
  const hasNumber = /\d/.test(environmentSection?.content ?? "");
  const hasUnit = /(kWh|tCO2e|吨|立方米|m3|%|千瓦时|万元|人次)/i.test(environmentSection?.content ?? "");

  if (!hasNumber || !hasUnit) {
    findings.push({
      id: createId("risk"),
      type: "缺少量化数据",
      description: "环境章节缺少量化数据，建议补充能源、水资源、温室气体排放、污染物排放或废弃物等指标。",
      sectionTitle: environmentSection?.title ?? "4. 环境责任",
      suggestion: "补充指标数值、单位、统计周期、组织边界和数据来源；无法确认的数据应标注为待补充。",
      riskLevel: "中",
    });
  }

  checklist
    .filter((item) => item.status === "缺失" && item.riskLevel === "高")
    .forEach((item) => {
      findings.push({
        id: createId("risk"),
        type: "披露缺口",
        description: `存在高风险披露缺口：${item.topic}。关联标准：${formatChecklistStandardRefs(item)}。来源引用：${formatChecklistSourceRefs(item)}。`,
        sectionTitle: SECTION_BY_CATEGORY[item.category],
        suggestion: `建议优先由 ${item.responsibleDepartment} 补充相关材料。${item.missingContent}`,
        riskLevel: "高",
      });
    });

  checklist
    .filter((item) => item.riskLevel === "高" && (item.evidenceChunkIds?.length ?? 0) === 0)
    .forEach((item) => {
      findings.push({
        id: createId("risk"),
        type: "标准条款遗漏",
        description: `高风险议题“${item.topic}”尚未命中证据片段，可能遗漏标准条款要求。`,
        sectionTitle: SECTION_BY_CATEGORY[item.category],
        suggestion: `请对照 ${formatChecklistSourceRefs(item)} 原文复核适用性，并补充 ${item.missingEvidenceTypes?.join("、") || "制度、数据或执行记录"}。`,
        riskLevel: "高",
      });
    });

  findings.push({
    id: createId("risk"),
    type: "准则适用性复核",
    description: "当前清单已绑定官方准则来源，但 MVP 仍为轻量映射，正式报告需逐条对照原文确认适用性和披露边界。",
    sectionTitle: "全报告",
    suggestion: "优先复核已选标准的官方原文、本地原文文件和企业实际适用范围；对不适用条款应保留不适用判断依据。",
    riskLevel: "低",
  });

  findings.push({
    id: createId("risk"),
    type: "数据一致性",
    description: "请确认员工人数、能源消耗、公益投入等关键数据与年报、财务数据及内部台账保持一致。",
    sectionTitle: "全报告",
    suggestion: "建立关键数据交叉核验表，保留数据来源、导出时间和责任人确认记录。",
    riskLevel: "低",
  });

  return findings;
}

export function generateIndicatorIndex(reportDraft: ReportSection[], checklist: DisclosureItem[]): IndicatorIndex[] {
  const availableSectionTitles = new Set(reportDraft.map((section) => section.title));

  return checklist.map((item) => {
    const location = locationFor(item);
    const resolvedLocation = location !== "待补充" && availableSectionTitles.has(location) ? location : location;
    const standardRefs = formatChecklistStandardRefs(item);
    const sourceRefs = formatChecklistSourceRefs(item);
    const evidenceText =
      (item.evidenceSnippets?.length ?? 0) > 0
        ? `已绑定 ${item.evidenceSnippets?.length ?? 0} 条证据片段。`
        : "暂无证据片段。";

    return {
      id: createId("indicator"),
      indicator: item.topic,
      category: item.category,
      disclosureLocation: resolvedLocation,
      status: statusToIndicatorStatus(item.status),
      notes:
        item.status === "已覆盖"
          ? `关联标准：${standardRefs}。来源引用：${sourceRefs}。${evidenceText}正式披露前建议补充证据编号。`
          : item.status === "部分覆盖"
            ? `关联标准：${standardRefs}。来源引用：${sourceRefs}。${evidenceText}${item.missingContent}`
            : `关联标准：${standardRefs}。来源引用：${sourceRefs}。${evidenceText}未披露，建议由 ${item.responsibleDepartment} 补充材料。`,
    };
  });
}
