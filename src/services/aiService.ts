import { DISCLOSURE_TOPICS, SECTION_BY_CATEGORY } from "@/data/disclosureTopics";
import type {
  ClassifiableFile,
  DisclosureItem,
  DisclosureStatus,
  DocumentCategory,
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

function createId(prefix: string): string {
  const random = globalThis.crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2);
  return `${prefix}_${random}`;
}

function normalize(value: string): string {
  return value.toLowerCase().replace(/\s+/g, "");
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

function getEvidenceFileIds(files: UploadedFile[], categories: DocumentCategory[]): string[] {
  return files.filter((file) => categories.includes(file.category)).map((file) => file.id);
}

function hasTopicKeyword(files: UploadedFile[], keywords: string[]): boolean {
  return files.some((file) => keywords.some((keyword) => normalize(file.name).includes(normalize(keyword))));
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

function itemIds(checklist: DisclosureItem[], category?: "E" | "S" | "G"): string[] {
  return checklist.filter((item) => !category || item.category === category).map((item) => item.id);
}

function coveredRatio(checklist: DisclosureItem[], category?: "E" | "S" | "G"): string {
  const scoped = checklist.filter((item) => !category || item.category === category);
  const covered = scoped.filter((item) => item.status !== "缺失").length;
  return `${covered}/${scoped.length}`;
}

function missingTopics(checklist: DisclosureItem[], category?: "E" | "S" | "G"): string[] {
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

function sectionEvidence(files: UploadedFile[], category: "E" | "S" | "G" | "overview"): string[] {
  if (category === "overview") {
    return files.filter((file) => file.category === "公司概况" || file.category === "财务/业务数据").map((file) => file.id);
  }

  const categoryMap = {
    E: ["环境数据", "合规与风控"],
    S: ["员工与社会责任", "供应链管理", "财务/业务数据"],
    G: ["公司治理", "合规与风控"],
  } satisfies Record<"E" | "S" | "G", DocumentCategory[]>;

  return getEvidenceFileIds(files, categoryMap[category]);
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
  const envMissing = missingTopics(checklist, "E");
  const socialMissing = missingTopics(checklist, "S");
  const governanceMissing = missingTopics(checklist, "G");

  return [
    {
      id: "section-overview",
      title: "1. 公司概况",
      relatedDisclosureItems: [],
      evidenceFileIds: sectionEvidence(files, "overview"),
      content: `本报告初稿基于企业已上传资料生成，当前系统识别到的资料覆盖情况为：${summary}。现阶段文本主要用于形成 ESG 报告框架、披露清单和后续补证路径，涉及定量绩效的数据仍需由企业确认口径后补充。`,
    },
    {
      id: "section-governance-structure",
      title: "2. ESG 治理架构",
      relatedDisclosureItems: itemIds(checklist, "G"),
      evidenceFileIds: sectionEvidence(files, "G"),
      content:
        governanceMissing.length > 0
          ? `公司已开始梳理 ESG 治理与合规管理相关材料。针对${governanceMissing.slice(0, 3).join("、")}等议题，公司后续将进一步完善相关数据统计和管理机制，并明确董事会、管理层及职能部门在 ESG 工作中的职责边界。`
          : "公司已提供公司治理、合规管理或风险管理相关材料，可支持 ESG 治理架构章节的基础披露。建议后续补充董事会审阅记录、ESG 议题汇报机制及跨部门协同流程，以增强证据链完整性。",
    },
    {
      id: "section-materiality",
      title: "3. 重要性议题分析",
      relatedDisclosureItems: checklist.map((item) => item.id),
      evidenceFileIds: files.map((file) => file.id),
      content: `根据当前披露清单，E 类议题覆盖进度为 ${coveredRatio(checklist, "E")}，S 类议题覆盖进度为 ${coveredRatio(checklist, "S")}，G 类议题覆盖进度为 ${coveredRatio(checklist, "G")}。建议后续结合监管要求、同行披露实践、投资者关注和企业经营特点，对议题重要性进行分级，并保留访谈、问卷或会议纪要作为支撑材料。`,
    },
    {
      id: "section-environment",
      title: "4. 环境责任",
      relatedDisclosureItems: itemIds(checklist, "E"),
      evidenceFileIds: sectionEvidence(files, "E"),
      content:
        envMissing.length > 0
          ? `公司后续将进一步完善环境数据统计和管理机制，优先补充${envMissing.slice(0, 3).join("、")}等议题的证据材料。建议建立用电量、用水量、温室气体排放量、废弃物处置等指标台账，并明确数据来源、统计口径和复核责任。`
          : "公司已上传环境相关资料，可作为环境责任章节的基础依据。建议在正式报告中补充用电量（kWh）、用水量（吨）、温室气体排放量（tCO2e）和废弃物处置量等指标，并说明节能降耗、环保合规和污染物管理措施。",
    },
    {
      id: "section-social",
      title: "5. 社会责任",
      relatedDisclosureItems: itemIds(checklist, "S"),
      evidenceFileIds: sectionEvidence(files, "S"),
      content:
        socialMissing.length > 0
          ? `公司已具备部分社会责任披露基础。针对${socialMissing.slice(0, 3).join("、")}等尚未充分覆盖的议题，公司后续将进一步完善相关数据统计和管理机制，补充员工、客户、供应链和社区贡献等方面的证据材料。`
          : "公司已上传员工、供应链或业务相关资料，可支持社会责任章节的基础披露。建议进一步补充员工结构、培训覆盖、职业健康安全、客户权益和供应商管理等指标，并与人力资源、采购及业务系统数据保持一致。",
    },
    {
      id: "section-governance",
      title: "6. 公司治理",
      relatedDisclosureItems: itemIds(checklist, "G"),
      evidenceFileIds: sectionEvidence(files, "G"),
      content:
        governanceMissing.length > 0
          ? `公司后续将进一步完善公司治理与合规风控披露。当前建议优先补充${governanceMissing.slice(0, 3).join("、")}等议题的制度文件、会议记录、培训记录或内控材料，避免在正式报告中作出缺少依据的结论性表述。`
          : "公司已上传公司治理、合规或风控相关资料，可支持公司治理章节的基础披露。建议在正式报告中说明董事会治理、合规培训、风险识别、反腐败管理和数据安全保护等机制，并保留制度版本和执行记录。",
    },
    {
      id: "section-kpi",
      title: "7. 关键绩效表",
      relatedDisclosureItems: checklist.map((item) => item.id),
      evidenceFileIds: files.map((file) => file.id),
      content:
        "关键绩效表建议按 E、S、G 三类分别维护。当前 MVP 阶段暂不编造具体数值，建议企业后续补充能源使用、温室气体排放、员工人数、培训时长、工伤情况、供应商数量、公益投入、合规培训覆盖等指标，并标注统计范围和数据负责人。",
    },
    {
      id: "section-index",
      title: "8. 指标索引表",
      relatedDisclosureItems: checklist.map((item) => item.id),
      evidenceFileIds: files.map((file) => file.id),
      content:
        "指标索引表将基于披露清单自动生成，包含披露议题、所属类别、披露位置、披露状态和备注。对于当前材料显示为缺失或部分覆盖的议题，建议在索引表中标注待补充材料和责任部门，便于项目管理和审阅追踪。",
    },
    {
      id: "section-next",
      title: "9. 下一步提升建议",
      relatedDisclosureItems: checklist.filter((item) => item.status !== "已覆盖").map((item) => item.id),
      evidenceFileIds: [],
      content:
        "建议下一阶段优先建立 ESG 数据台账，明确各议题的数据口径、责任部门、证据文件和复核流程。对于高风险缺失项，应先补齐制度、记录或量化指标，再进入正式报告撰写和法务审阅环节。",
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
  });

  const environmentSection = reportDraft.find((section) => section.title.includes("环境责任"));
  const hasNumber = /\d/.test(environmentSection?.content ?? "");
  const hasUnit = /(kWh|tCO2e|吨|立方米|m3|%|千瓦时|万元|人次)/i.test(environmentSection?.content ?? "");

  if (!hasNumber || !hasUnit) {
    findings.push({
      id: createId("risk"),
      type: "缺少量化数据",
      description: "环境章节缺少量化数据，建议补充用电量、用水量、温室气体排放等指标。",
      sectionTitle: environmentSection?.title ?? "4. 环境责任",
      suggestion: "补充指标数值、单位、统计周期、组织边界和数据来源，无法确认的数据应标注为待补充。",
      riskLevel: "中",
    });
  }

  checklist
    .filter((item) => item.status === "缺失" && item.riskLevel === "高")
    .forEach((item) => {
      findings.push({
        id: createId("risk"),
        type: "披露缺口",
        description: `存在高风险披露缺口：${item.topic}。`,
        sectionTitle: SECTION_BY_CATEGORY[item.category],
        suggestion: `建议优先由${item.responsibleDepartment}补充相关材料：${item.missingContent}`,
        riskLevel: "高",
      });
    });

  findings.push({
    id: createId("risk"),
    type: "数据一致性",
    description: "请确认员工人数、能源消耗、公益投入等关键数据与年报、财务数据保持一致。",
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

    return {
      id: createId("indicator"),
      indicator: item.topic,
      category: item.category,
      disclosureLocation: resolvedLocation,
      status: statusToIndicatorStatus(item.status),
      notes:
        item.status === "已覆盖"
          ? "已有相关资料支撑，正式披露前建议补充证据编号。"
          : item.status === "部分覆盖"
            ? item.missingContent
            : `未披露，建议由${item.responsibleDepartment}补充材料。`,
    };
  });
}
