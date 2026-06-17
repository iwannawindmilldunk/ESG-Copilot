export type DocumentCategory =
  | "公司概况"
  | "公司治理"
  | "环境数据"
  | "员工与社会责任"
  | "供应链管理"
  | "合规与风控"
  | "财务/业务数据"
  | "其他";

export type ESGCategory = "E" | "S" | "G";

export type DisclosureStatus = "已覆盖" | "部分覆盖" | "缺失";

export type RiskLevel = "低" | "中" | "高";

export type IndicatorStatus = "已披露" | "部分披露" | "未披露";

export type MaterialityType = "impact" | "financial" | "double" | "regulatory";

export type StandardSourceType = "official-document" | "official-resource-page" | "official-navigator";

export type ParserStatus = "parsed" | "partial" | "unsupported" | "failed";

export type EvidenceLocationType = "page" | "sheet" | "slide" | "paragraph" | "text" | "metadata";

export type ApplicabilityStatus = "适用" | "不适用" | "待判断";

export type ReviewStatus = "待审阅" | "审阅中" | "已确认" | "需补充";

export type ProjectStatus = "draft" | "reviewing" | "exported";

export type ProjectRole = "admin" | "editor" | "viewer";

export type LLMProviderType = "mock" | "openai-compatible";

export interface ClassifiableFile {
  name: string;
  type?: string;
  size: number;
  uploadedAt?: string;
  contentText?: string;
  contentBase64?: string;
}

export interface UploadedFile {
  id: string;
  name: string;
  type: string;
  size: number;
  uploadedAt: string;
  category: DocumentCategory;
  storageBucket?: string;
  storagePath?: string;
}

export interface Standard {
  id: string;
  name: string;
  issuer: string;
  description: string;
  materialityType: MaterialityType;
  groundingNote: string;
  sources: StandardSource[];
}

export interface StandardSource {
  id: string;
  label: string;
  issuer: string;
  sourceType: StandardSourceType;
  officialUrl: string;
  localPath?: string;
  language: "zh-CN" | "en" | "multi";
  publishedDate?: string;
  effectiveDate?: string;
  downloadedAt: string;
  note: string;
}

export interface DisclosureStandardItem {
  id: string;
  standardId: string;
  code: string;
  title: string;
  category: ESGCategory;
  theme: string;
  requirementSummary: string;
  requiredEvidenceTypes: string[];
  suggestedMetrics: string[];
  suggestedDepartments: string[];
  riskLevelIfMissing: RiskLevel;
  sourceReferences?: string[];
}

export interface StandardClause {
  id: string;
  standardId: string;
  standardName: string;
  sourceId?: string;
  sourceLabel?: string;
  clauseNo: string;
  chapter: string;
  topic: string;
  category: ESGCategory;
  requirement: string;
  applicability: string;
  suggestedEvidence: string[];
  suggestedMetrics: string[];
  suggestedDepartments: string[];
  riskLevelIfMissing: RiskLevel;
  sourceReferences: string[];
  sourceLinks: Array<Pick<StandardSource, "label" | "officialUrl" | "localPath">>;
}

export interface UnifiedTopicMapping {
  topicId: string;
  topicName: string;
  category: ESGCategory;
  mappedStandardItemIds: string[];
}

export interface DisclosureChecklistItem {
  id: string;
  topic: string;
  category: ESGCategory;
  standards: {
    standardId: string;
    standardName: string;
    code: string;
    title: string;
    sourceReferences: string[];
    sourceLinks: Array<Pick<StandardSource, "label" | "officialUrl" | "localPath">>;
  }[];
  requirement: string;
  status: DisclosureStatus;
  missingContent: string;
  responsibleDepartment: string;
  riskLevel: RiskLevel;
  suggestedMetrics: string[];
  sourceClauseIds?: string[];
  evidenceFileIds: string[];
  evidenceChunkIds?: string[];
  evidenceSnippets?: EvidenceSnippet[];
  missingEvidenceTypes?: string[];
  applicability?: ApplicabilityStatus;
  reviewStatus?: ReviewStatus;
  reviewNote?: string;
}

export type DisclosureItem = DisclosureChecklistItem;

export interface EvidenceNote {
  fileId: string;
  fileName: string;
  reason: string;
  chunkId?: string;
  locationLabel?: string;
}

export interface EvidenceSnippet {
  chunkId: string;
  fileId: string;
  fileName: string;
  locationLabel: string;
  text: string;
}

export interface EvidenceChunk {
  id: string;
  documentId: string;
  fileId: string;
  fileName: string;
  fileType: string;
  category: DocumentCategory;
  locationType: EvidenceLocationType;
  locationLabel: string;
  text: string;
  tableContext?: string;
  keywords: string[];
  createdAt: string;
}

export interface ParsedDocument {
  id: string;
  fileId: string;
  fileName: string;
  fileType: string;
  category: DocumentCategory;
  parserStatus: ParserStatus;
  parserMessages: string[];
  chunks: EvidenceChunk[];
  metadata?: {
    pageCount?: number;
    sheetNames?: string[];
    slideCount?: number;
    textLength?: number;
  };
}

export interface ChecklistAssessment {
  itemId: string;
  status: DisclosureStatus;
  evidenceFileIds: string[];
  evidenceChunkIds: string[];
  evidenceSnippets: EvidenceSnippet[];
  missingEvidenceTypes: string[];
  gapReason: string;
}

export interface ReportSection {
  id: string;
  title: string;
  content: string;
  relatedDisclosureItems: string[];
  evidenceFileIds: string[];
  evidenceChunkIds?: string[];
  evidenceNotes: EvidenceNote[];
  confidenceLevel: RiskLevel;
}

export interface RiskFinding {
  id: string;
  type: string;
  description: string;
  sectionTitle: string;
  suggestion: string;
  riskLevel: RiskLevel;
}

export interface IndicatorIndex {
  id: string;
  indicator: string;
  category: ESGCategory;
  disclosureLocation: string;
  status: IndicatorStatus;
  notes: string;
}

export interface ReadinessScoreResult {
  totalScore: number;
  eScore: number;
  sScore: number;
  gScore: number;
  coveredCount: number;
  partialCount: number;
  missingCount: number;
  highRiskMissingCount: number;
  recommendedNextMaterials: string[];
}

export interface ESGProjectSnapshot {
  selectedStandardIds: string[];
  uploadedFiles: UploadedFile[];
  parsedDocuments?: ParsedDocument[];
  disclosureChecklist: DisclosureItem[];
  reportDraft: ReportSection[];
  riskFindings: RiskFinding[];
  indicatorIndex: IndicatorIndex[];
  readinessScore?: ReadinessScoreResult;
}

export interface DisclosureTopicTemplate {
  id: string;
  topic: string;
  category: ESGCategory;
  requirement: string;
  responsibleDepartment: string;
  documentCategories: DocumentCategory[];
  keywords: string[];
  missingContent: string;
  defaultRiskLevel: RiskLevel;
}

export interface Company {
  id: string;
  name: string;
  industry?: string;
  stockExchange?: string;
  stockCode?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ReportPeriod {
  id: string;
  year: string;
  startDate: string;
  endDate: string;
}

export interface Project {
  id: string;
  name: string;
  companyId?: string;
  companyName: string;
  reportPeriod: ReportPeriod;
  selectedStandardIds: string[];
  ownerUserId: string;
  members: Array<{
    userId: string;
    role: ProjectRole;
  }>;
  status: ProjectStatus;
  backendMode?: "supabase" | "memory";
  createdAt: string;
  updatedAt: string;
}

export interface LLMGenerationResult<T> {
  provider: LLMProviderType;
  model: string;
  data: T;
  fallbackUsed: boolean;
  warnings: string[];
}

// Future persistence mapping:
// companies -> projects -> uploaded_files -> parsed_documents -> evidence_chunks
// -> disclosure_items -> report_sections -> risk_findings -> indicator_indexes.
// These TypeScript contracts intentionally mirror future PostgreSQL/Supabase table boundaries.
export type FutureProjectRecord = Project;
