import { DISCLOSURE_TOPICS } from "@/data/disclosureTopics";
import type {
  ClassifiableFile,
  DisclosureItem,
  DisclosureStatus,
  DocumentCategory,
  ESGCategory,
  EvidenceNote,
  IndicatorIndex,
  IndicatorStatus,
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
    keywords: ["年报", "财务", "业务", "营收", "收入", "利润", "经营", "客户", "投诉"],
  },
  {
    category: "公司概况",
    keywords: ["公司概况", "公司简介", "企业介绍", "组织架构", "发展历程", "主营业务"],
  },
];

const RISKY_EXPRESSION_ALTERNATIVES: Record<string, string> = {
  行业领先: "公司持续推进相关工作，并将结合量化数据进一步说明进展。",
  全面实现: "公司已开展相关工作，后续将结合目标进展和证据材料持续完善。",
  零排放: "公司持续推进减排管理，具体排放表现以经核实的数据为准。",
  "100%合规": "公司持续完善合规管理，并将结合检查记录和外部证明说明执行情况。",
  全球最佳: "公司将参考行业实践持续优化相关管理措施。",
  显著降低: "相关指标变化情况有待结合统计口径和期间数据进一步确认。",
  完全绿色: "公司持续推进绿色运营，具体成效需结合数据和第三方证明披露。",
  无任何风险: "公司已识别并持续管理相关风险，后续将完善风险评估和应对记录。",
  绝对安全: "公司持续完善安全管理机制，并将结合检查、培训和事件记录披露执行情况。",
  全面覆盖: "公司已覆盖部分相关范围，后续将进一步明确边界和统计口径。",
  标杆企业: "公司将结合行业实践持续提升管理水平。",
  最佳实践: "公司将持续优化相关实践，并以制度、记录和数据支撑披露。",
  显著提升: "相关改善情况有待结合量化数据和统计期间进一步说明。",
};

const REPORT_SECTION_BY_CATEGORY: Record<ESGCategory, string> = {
  E: "4. 环境责任",
  S: "5. 社会责任",
  G: "6. 公司治理",
};

const QUANTITATIVE_VALUE_WITH_UNIT = /\d+(?:\.\d+)?\s*(kWh|tCO2e|m3|千瓦时|吨|立方米|%|万元|元|人次|小时|家|起|次)/i;

type EvidencePurpose =
  | "overview"
  | "governanceStructure"
  | "materiality"
  | "environment"
  | "social"
  | "governance"
  | "kpi"
  | "index"
  | "next";

function createId(prefix: string): string {
  const random = globalThis.crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2);
  return `${prefix}_${random}`;
}

function normalize(value: string): string {
  return value.toLowerCase().replace(/\s+/g, "");
}

function hasKeyword(value: string, keywords: string[]): boolean {
  const normalized = normalize(value);
  return keywords.some((keyword) => normalized.includes(normalize(keyword)));
}

function classifyDocumentCategory(fileName: string): DocumentCategory {
  const matched = CATEGORY_KEYWORDS.find((item) => hasKeyword(fileName, item.keywords));
  return matched?.category ?? "其他";
}

function inferFileType(file: ClassifiableFile): string {
  if (file.type) {
    if (file.type.includes("pdf")) return "PDF";
    if (file.type.includes("word") || file.type.includes("document")) return "Word";
    if (file.type.includes("sheet") || file.type.includes("excel")) return "Excel";
    if (file.type.includes("presentation") || file.type.includes("powerpoint")) return "PPT";
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

function hasCategory(files: UploadedFile[], categories: DocumentCategory[]): boolean {
  return files.some((file) => categories.includes(file.category));
}

function hasTopicKeyword(files: UploadedFile[], keywords: string[]): boolean {
  return files.some((file) => hasKeyword(file.name, keywords));
}

function resolveRisk(status: DisclosureStatus, defaultRiskLevel: RiskLevel): RiskLevel {
  if (status === "已覆盖") return "低";
  if (status === "部分覆盖") return defaultRiskLevel === "高" ? "中" : defaultRiskLevel;
  return defaultRiskLevel;
}

function buildMissingContent(status: DisclosureStatus, missingContent: string): string {
  if (status === "已覆盖") {
    return "暂无明显缺失，建议补充数据口径、审批记录和证据文件编号。";
  }

  if (status === "部分覆盖") {
    return `已有相关材料，但仍需补充：${missingContent}`;
  }

  return missingContent;
}

function itemIds(checklist: DisclosureItem[], category?: ESGCategory): string[] {
  return checklist.filter((item) => !category || item.category === category).map((item) => item.id);
}

function coveredRatio(checklist: DisclosureItem[], category?: ESGCategory): string {
  const scoped = checklist.filter((item) => !category || item.category === category);
  if (scoped.length === 0) return "0/0";

  const covered = scoped.filter((item) => item.status !== "缺失").length;
  return `${covered}/${scoped.length}`;
}

function missingItems(checklist: DisclosureItem[], category?: ESGCategory): DisclosureItem[] {
  return checklist.filter((item) => (!category || item.category === category) && item.status === "缺失");
}

function missingTopicText(checklist: DisclosureItem[], category?: ESGCategory): string {
  const topics = missingItems(checklist, category).map((item) => item.topic);
  return topics.length > 0 ? topics.slice(0, 4).join("、") : "暂无明显缺失议题";
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

function evidenceReason(file: UploadedFile, purpose: EvidencePurpose): string {
  if (purpose === "overview") {
    return file.category === "公司概况"
      ? "文件被分类为公司概况资料，可支撑企业基本情况和组织信息描述。"
      : "文件被分类为财务/业务数据，可作为公司概况中业务边界和运营背景的参考。";
  }

  if (purpose === "environment") {
    return file.category === "环境数据"
      ? "文件被分类为环境数据，可支撑能耗、排放、水资源或环保管理相关描述。"
      : "文件名称或类别涉及环保合规，可支撑环境责任中的合规管理说明。";
  }

  if (purpose === "social") {
    if (file.category === "供应链管理") return "文件被分类为供应链管理资料，可支撑供应商准入、采购或供应链责任描述。";
    if (hasKeyword(file.name, ["客户", "投诉", "质量"])) return "文件名称涉及客户权益或投诉处理，可支撑社会责任中的客户相关议题。";
    return "文件被分类为员工与社会责任资料，可支撑员工、培训、安全生产或公益相关描述。";
  }

  if (purpose === "governance" || purpose === "governanceStructure") {
    if (hasKeyword(file.name, ["数据安全", "隐私", "个人信息"])) {
      return "文件名称涉及数据安全或隐私保护，可支撑治理章节中的数据安全管理说明。";
    }
    if (hasKeyword(file.name, ["反腐败", "反商业贿赂", "廉洁", "贿赂"])) {
      return "文件名称涉及反腐败或廉洁管理，可支撑治理章节中的商业道德与合规说明。";
    }
    return file.category === "公司治理"
      ? "文件被分类为公司治理资料，可支撑董事会治理、治理架构或审阅机制描述。"
      : "文件被分类为合规与风控资料，可支撑合规、内控、风控或举报机制描述。";
  }

  if (purpose === "kpi") {
    return "该文件可作为后续关键绩效指标台账或数据口径核对的候选材料。";
  }

  if (purpose === "index") {
    return "该文件用于核对披露议题的资料覆盖状态和指标索引位置。";
  }

  if (purpose === "next") {
    return "该文件用于识别后续待补充材料和报告完善优先级。";
  }

  return "该文件用于支撑重要性议题覆盖判断和章节证据链追溯。";
}

function matchesEvidencePurpose(file: UploadedFile, purpose: EvidencePurpose): boolean {
  if (purpose === "materiality" || purpose === "index" || purpose === "next") return true;

  if (purpose === "overview") {
    return file.category === "公司概况" || file.category === "财务/业务数据";
  }

  if (purpose === "governanceStructure") {
    return (
      file.category === "公司治理" ||
      (file.category === "合规与风控" && hasKeyword(file.name, ["合规", "风控", "风险", "内控", "审计", "举报", "制度"]))
    );
  }

  if (purpose === "environment") {
    return (
      file.category === "环境数据" ||
      (file.category === "合规与风控" && hasKeyword(file.name, ["环保", "排污", "处罚", "整改", "环境", "排放"]))
    );
  }

  if (purpose === "social") {
    return (
      file.category === "员工与社会责任" ||
      file.category === "供应链管理" ||
      (file.category === "财务/业务数据" && hasKeyword(file.name, ["客户", "投诉", "质量", "公益"])) ||
      (file.category === "合规与风控" && hasKeyword(file.name, ["安全", "职业健康", "隐患", "应急"]))
    );
  }

  if (purpose === "governance") {
    return file.category === "公司治理" || file.category === "合规与风控";
  }

  if (purpose === "kpi") {
    return (
      ["环境数据", "员工与社会责任", "财务/业务数据"].includes(file.category) ||
      file.type.includes("Excel") ||
      file.type.includes("CSV")
    );
  }

  return false;
}

function evidenceNotes(files: UploadedFile[], purpose: EvidencePurpose): EvidenceNote[] {
  return files
    .filter((file) => matchesEvidencePurpose(file, purpose))
    .map((file) => ({
      fileId: file.id,
      fileName: file.name,
      reason: evidenceReason(file, purpose),
    }));
}

function confidenceFor(evidence: EvidenceNote[], relatedDisclosureItems: string[], checklist: DisclosureItem[]): "高" | "中" | "低" {
  if (evidence.length === 0) return "低";

  const relatedItems = checklist.filter((item) => relatedDisclosureItems.includes(item.id));
  if (relatedItems.length === 0) return evidence.length >= 2 ? "高" : "中";

  const missingCount = relatedItems.filter((item) => item.status === "缺失").length;
  const partialCount = relatedItems.filter((item) => item.status === "部分覆盖").length;
  const hasHighRiskMissing = relatedItems.some((item) => item.status === "缺失" && item.riskLevel === "高");

  if (hasHighRiskMissing || missingCount > relatedItems.length / 2) return "低";
  if (missingCount > 0 || partialCount > 0 || evidence.length < 2) return "中";
  return "高";
}

function buildSection(params: {
  id: string;
  title: string;
  content: string;
  relatedDisclosureItems: string[];
  evidence: EvidenceNote[];
  checklist: DisclosureItem[];
}): ReportSection {
  return {
    id: params.id,
    title: params.title,
    content: params.content,
    relatedDisclosureItems: params.relatedDisclosureItems,
    evidenceFileIds: params.evidence.map((item) => item.fileId),
    evidenceNotes: params.evidence,
    confidenceLevel: confidenceFor(params.evidence, params.relatedDisclosureItems, params.checklist),
  };
}

function evidenceSummary(evidence: EvidenceNote[]): string {
  if (evidence.length === 0) {
    return "当前未识别到可直接支撑本章节的资料，公司后续将进一步完善相关数据统计和披露机制。";
  }

  const fileNames = evidence
    .slice(0, 4)
    .map((item) => `《${item.fileName}》`)
    .join("、");
  const suffix = evidence.length > 1 ? "等材料" : "材料";
  return `系统已识别${fileNames}${suffix}，可作为本章节初稿的证据线索。正式披露前仍需核对文件版本、数据口径和审批记录。`;
}

function nextStepAdvice(checklist: DisclosureItem[], lowConfidenceSections: string[]): string {
  const highRiskMissing = checklist.filter((item) => item.status === "缺失" && item.riskLevel === "高");
  const partialItems = checklist.filter((item) => item.status === "部分覆盖");
  const missing = checklist.filter((item) => item.status === "缺失");

  const priorityTopics = highRiskMissing.length > 0 ? highRiskMissing : missing.slice(0, 4);
  const topicAdvice =
    priorityTopics.length > 0
      ? `优先补充${priorityTopics.map((item) => `“${item.topic}”`).join("、")}相关制度、台账或审批记录。`
      : "当前未识别到高风险缺失项，建议继续补充证据文件编号和内部复核记录。";

  const partialAdvice =
    partialItems.length > 0
      ? `对部分覆盖议题，应由责任部门补齐统计口径、数据来源和执行记录，重点关注${partialItems
          .slice(0, 4)
          .map((item) => `“${item.topic}”`)
          .join("、")}。`
      : "对已覆盖议题，建议进一步完善数据来源、审批链路和留痕材料。";

  const confidenceAdvice =
    lowConfidenceSections.length > 0
      ? `低置信度章节包括${lowConfidenceSections.join("、")}，建议在进入正式报告前先完成证据补强。`
      : "当前报告章节均已形成基础证据链，后续重点是审阅措辞与补充量化指标。";

  return `${topicAdvice}\n${partialAdvice}\n${confidenceAdvice}\n公司后续将进一步完善相关数据统计和披露机制，并在正式披露前完成跨部门复核、法务合规审阅和关键数据一致性校验。`;
}

function statusToIndicatorStatus(status: DisclosureStatus): IndicatorStatus {
  if (status === "已覆盖") return "已披露";
  if (status === "部分覆盖") return "部分披露";
  return "未披露";
}

function locationFor(item: DisclosureItem): string {
  return item.status === "缺失" ? "待补充" : REPORT_SECTION_BY_CATEGORY[item.category];
}

function needsQuantitativeData(section: ReportSection, _checklist: DisclosureItem[]): boolean {
  const title = section.title;
  if (["环境责任", "社会责任", "关键绩效表"].some((keyword) => title.includes(keyword))) return true;

  return ["员工培训", "安全生产", "职业健康", "公益"].some((keyword) => title.includes(keyword));
}

function hasQuantitativeData(content: string): boolean {
  return QUANTITATIVE_VALUE_WITH_UNIT.test(content);
}

// Future LLM integration point:
// Replace these mock functions with OpenAI / Anthropic / private model calls.
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

export function generateDisclosureChecklist(files: UploadedFile[]): DisclosureItem[] {
  return DISCLOSURE_TOPICS.map((topic) => {
    const categoryMatched = hasCategory(files, topic.documentCategories);
    const keywordMatched = hasTopicKeyword(files, topic.keywords);
    const status: DisclosureStatus = keywordMatched ? "已覆盖" : categoryMatched ? "部分覆盖" : "缺失";

    return {
      id: topic.id,
      topic: topic.topic,
      category: topic.category,
      requirement: topic.requirement,
      status,
      missingContent: buildMissingContent(status, topic.missingContent),
      responsibleDepartment: topic.responsibleDepartment,
      riskLevel: resolveRisk(status, topic.defaultRiskLevel),
    };
  });
}

export function generateReportDraft(files: UploadedFile[], checklist: DisclosureItem[]): ReportSection[] {
  const summary = categoriesSummary(files);
  const overviewEvidence = evidenceNotes(files, "overview");
  const governanceStructureEvidence = evidenceNotes(files, "governanceStructure");
  const materialityEvidence = evidenceNotes(files, "materiality");
  const environmentEvidence = evidenceNotes(files, "environment");
  const socialEvidence = evidenceNotes(files, "social");
  const governanceEvidence = evidenceNotes(files, "governance");
  const kpiEvidence = evidenceNotes(files, "kpi");
  const indexEvidence = evidenceNotes(files, "index");

  const baseSections = [
    buildSection({
      id: "section-overview",
      title: "1. 公司概况",
      relatedDisclosureItems: [],
      evidence: overviewEvidence,
      checklist,
      content: `本报告初稿基于企业已上传资料生成，当前系统识别的资料覆盖情况为：${summary}。${evidenceSummary(
        overviewEvidence,
      )}由于现阶段尚未真实解析文件正文，本节不对公司业务规模、经营成果、行业地位或外部评级作具体陈述；后续应结合公司简介、组织架构、业务边界和经审阅的公开信息进一步完善。`,
    }),
    buildSection({
      id: "section-governance-structure",
      title: "2. ESG 治理架构",
      relatedDisclosureItems: itemIds(checklist, "G"),
      evidence: governanceStructureEvidence,
      checklist,
      content: `${evidenceSummary(
        governanceStructureEvidence,
      )}公司可在正式报告中说明董事会、管理层及相关职能部门在 ESG 事项中的职责分工、汇报机制和审阅安排。针对${missingTopicText(
        checklist,
        "G",
      )}等尚需完善的内容，建议后续补充制度文件、会议记录、合规培训记录或内部控制材料，避免作出缺少依据的结论性表述。`,
    }),
    buildSection({
      id: "section-materiality",
      title: "3. 重要性议题分析",
      relatedDisclosureItems: checklist.map((item) => item.id),
      evidence: materialityEvidence,
      checklist,
      content: `${evidenceSummary(
        materialityEvidence,
      )}根据当前披露清单，E 类议题覆盖进度为 ${coveredRatio(checklist, "E")}，S 类议题覆盖进度为 ${coveredRatio(
        checklist,
        "S",
      )}，G 类议题覆盖进度为 ${coveredRatio(
        checklist,
        "G",
      )}。该分析仅反映现有资料对议题的支撑程度，不代表正式重要性评估结论。后续建议结合监管要求、利益相关方沟通、经营影响和风险暴露情况，形成可追溯的重要性议题判断过程。`,
    }),
    buildSection({
      id: "section-environment",
      title: "4. 环境责任",
      relatedDisclosureItems: itemIds(checklist, "E"),
      evidence: environmentEvidence,
      checklist,
      content: `${evidenceSummary(
        environmentEvidence,
      )}环境责任章节建议围绕能源使用、水资源管理、温室气体排放、废弃物管理和环保合规展开。当前缺失或待补充的环境议题包括${missingTopicText(
        checklist,
        "E",
      )}。在缺少经核实数据时，报告不应披露未经确认的排放、节能或合规结论；公司后续将进一步完善相关数据统计和披露机制。`,
    }),
    buildSection({
      id: "section-social",
      title: "5. 社会责任",
      relatedDisclosureItems: itemIds(checklist, "S"),
      evidence: socialEvidence,
      checklist,
      content: `${evidenceSummary(
        socialEvidence,
      )}社会责任章节建议覆盖员工权益、培训发展、职业健康与安全、客户权益、供应链管理和社区贡献等议题。当前缺失或待补充的社会责任议题包括${missingTopicText(
        checklist,
        "S",
      )}。对于尚未形成台账或执行记录的事项，应采用审慎表述，并在后续补充员工、培训、安全生产、公益和供应商管理等支撑材料。`,
    }),
    buildSection({
      id: "section-governance",
      title: "6. 公司治理",
      relatedDisclosureItems: itemIds(checklist, "G"),
      evidence: governanceEvidence,
      checklist,
      content: `${evidenceSummary(
        governanceEvidence,
      )}公司治理章节建议说明董事会治理、合规管理、风险管理、反商业贿赂、信息披露以及数据安全与隐私保护等机制。当前缺失或待补充的治理议题包括${missingTopicText(
        checklist,
        "G",
      )}。正式披露前应补充制度版本、执行记录、培训或审阅材料，以提升治理信息的可验证性。`,
    }),
    buildSection({
      id: "section-kpi",
      title: "7. 关键绩效表",
      relatedDisclosureItems: checklist.map((item) => item.id),
      evidence: kpiEvidence,
      checklist,
      content: `${evidenceSummary(
        kpiEvidence,
      )}关键绩效表应按 E、S、G 分类维护指标名称、统计口径、期间范围、数据来源和责任部门。当前 MVP 不编造具体数值，建议后续补充能源使用、温室气体排放、员工人数、培训覆盖、安全生产、客户投诉、供应商管理、公益投入和合规培训等指标，并保留内部复核记录。`,
    }),
    buildSection({
      id: "section-index",
      title: "8. 指标索引表",
      relatedDisclosureItems: checklist.map((item) => item.id),
      evidence: indexEvidence,
      checklist,
      content: `${evidenceSummary(
        indexEvidence,
      )}指标索引表将基于披露清单生成，包含披露议题、所属类别、披露位置、披露状态和备注。对当前显示为缺失或部分覆盖的议题，建议在索引表中标注待补充材料、责任部门和后续复核状态，便于项目管理和审阅追踪。`,
    }),
  ];

  const lowConfidenceSections = baseSections
    .filter((section) => section.confidenceLevel === "低")
    .map((section) => section.title);

  return [
    ...baseSections,
    buildSection({
      id: "section-next",
      title: "9. 下一步提升建议",
      relatedDisclosureItems: checklist.filter((item) => item.status !== "已覆盖").map((item) => item.id),
      evidence: evidenceNotes(files, "next"),
      checklist,
      content: nextStepAdvice(checklist, lowConfidenceSections),
    }),
  ];
}

export function checkReportRisks(reportDraft: ReportSection[], checklist: DisclosureItem[]): RiskFinding[] {
  const findings: RiskFinding[] = [];

  reportDraft.forEach((section) => {
    Object.entries(RISKY_EXPRESSION_ALTERNATIVES).forEach(([expression, alternative]) => {
      if (section.content.includes(expression)) {
        findings.push({
          id: createId("risk"),
          type: "夸大表述风险",
          description: `发现可能缺少量化数据或第三方证明的表述：“${expression}”。`,
          sectionTitle: section.title,
          suggestion: `建议改为更审慎的表达，例如：${alternative}`,
          riskLevel: "高",
        });
      }
    });

    if (section.evidenceFileIds.length === 0) {
      findings.push({
        id: createId("risk"),
        type: "证据缺失风险",
        description: `章节“${section.title}”未绑定支撑材料，可能影响披露可追溯性。`,
        sectionTitle: section.title,
        suggestion: "建议补充相应制度、台账、会议记录、审批记录或业务数据文件；资料不足时应保留“后续将进一步完善”的审慎表述。",
        riskLevel: "中",
      });
    }

    if (needsQuantitativeData(section, checklist) && !hasQuantitativeData(section.content)) {
      findings.push({
        id: createId("risk"),
        type: "量化数据缺失风险",
        description: `章节“${section.title}”尚未包含可识别的数字和单位，建议补充量化指标。`,
        sectionTitle: section.title,
        suggestion: "建议补充指标数值、单位、统计期间、组织边界、数据来源和责任部门；无法确认的数据应标注为待补充。",
        riskLevel: "中",
      });
    }
  });

  checklist
    .filter((item) => item.status === "缺失" && item.riskLevel === "高")
    .forEach((item) => {
      findings.push({
        id: createId("risk"),
        type: "披露缺口风险",
        description: `存在高风险披露缺口：${item.topic}。`,
        sectionTitle: REPORT_SECTION_BY_CATEGORY[item.category],
        suggestion: `建议优先由${item.responsibleDepartment}补充相关材料：${item.missingContent}`,
        riskLevel: "高",
      });
    });

  findings.push({
    id: createId("risk"),
    type: "数据一致性提醒",
    description: "请确认员工人数、能源消耗、公益投入、董事会会议次数等关键数据与年报、财务数据及内部台账保持一致。",
    sectionTitle: "全报告",
    suggestion: "建议建立关键数据交叉核验表，保留数据来源、导出时间、复核人员和审批记录。",
    riskLevel: "低",
  });

  return findings;
}

export function generateIndicatorIndex(reportDraft: ReportSection[], checklist: DisclosureItem[]): IndicatorIndex[] {
  const availableSectionTitles = new Set(reportDraft.map((section) => section.title));

  return checklist.map((item) => {
    const location = locationFor(item);
    const resolvedLocation = location !== "待补充" && availableSectionTitles.has(location) ? location : location;

    return {
      id: createId("indicator"),
      indicator: item.topic,
      category: item.category,
      disclosureLocation: resolvedLocation,
      status: statusToIndicatorStatus(item.status),
      notes:
        item.status === "已覆盖"
          ? "已有相关资料支撑，正式披露前建议补充证据文件编号、数据口径和复核记录。"
          : item.status === "部分覆盖"
            ? item.missingContent
            : `未披露，建议由${item.responsibleDepartment}补充材料。`,
    };
  });
}
