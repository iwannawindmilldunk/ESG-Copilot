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

export interface ClassifiableFile {
  name: string;
  type?: string;
  size: number;
  uploadedAt?: string;
}

export interface UploadedFile {
  id: string;
  name: string;
  type: string;
  size: number;
  uploadedAt: string;
  category: DocumentCategory;
}

export interface DisclosureItem {
  id: string;
  topic: string;
  category: ESGCategory;
  requirement: string;
  status: DisclosureStatus;
  missingContent: string;
  responsibleDepartment: string;
  riskLevel: RiskLevel;
}

export interface EvidenceNote {
  fileId: string;
  fileName: string;
  reason: string;
}

export interface ReportSection {
  id: string;
  title: string;
  content: string;
  relatedDisclosureItems: string[];
  evidenceFileIds: string[];
  evidenceNotes: EvidenceNote[];
  confidenceLevel: "高" | "中" | "低";
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
  uploadedFiles: UploadedFile[];
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

// Future persistence mapping:
// projects -> uploaded_files -> disclosure_items -> report_sections -> risk_findings -> indicator_indexes.
// These TypeScript contracts intentionally mirror future PostgreSQL/Supabase table boundaries.
export interface FutureProjectRecord {
  id: string;
  companyName: string;
  reportingYear: string;
  ownerUserId: string;
  status: "draft" | "reviewing" | "exported";
  createdAt: string;
  updatedAt: string;
}
