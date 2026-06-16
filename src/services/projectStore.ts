import { generateDisclosureChecklist, generateIndicatorIndex, generateReportDraft } from "@/services/aiService";
import type { ESGProjectSnapshot, ParsedDocument, Project, UploadedFile } from "@/types/esg";

export interface StoredProject {
  project: Project;
  snapshot: ESGProjectSnapshot;
}

const projects = new Map<string, StoredProject>();

function createId(prefix: string): string {
  const random = globalThis.crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2);
  return `${prefix}_${random}`;
}

function nowIso(): string {
  return new Date().toISOString();
}

export function createProject(input: {
  name?: string;
  companyName?: string;
  reportingYear?: string;
  selectedStandardIds?: string[];
  uploadedFiles?: UploadedFile[];
  parsedDocuments?: ParsedDocument[];
}): StoredProject {
  const now = nowIso();
  const year = input.reportingYear ?? String(new Date().getFullYear());
  const project: Project = {
    id: createId("project"),
    name: input.name ?? `${input.companyName ?? "示例企业"} ${year} ESG 报告项目`,
    companyName: input.companyName ?? "示例企业",
    reportPeriod: {
      id: createId("period"),
      year,
      startDate: `${year}-01-01`,
      endDate: `${year}-12-31`,
    },
    selectedStandardIds: input.selectedStandardIds ?? ["cn-exchange-lite"],
    ownerUserId: "local-demo-user",
    members: [{ userId: "local-demo-user", role: "admin" }],
    status: "draft",
    createdAt: now,
    updatedAt: now,
  };

  const snapshot: ESGProjectSnapshot = {
    selectedStandardIds: project.selectedStandardIds,
    uploadedFiles: input.uploadedFiles ?? [],
    parsedDocuments: input.parsedDocuments ?? [],
    disclosureChecklist: [],
    reportDraft: [],
    riskFindings: [],
    indicatorIndex: [],
  };

  const stored = { project, snapshot };
  projects.set(project.id, stored);
  return stored;
}

export function getProject(projectId: string): StoredProject | undefined {
  return projects.get(projectId);
}

export function updateProjectSnapshot(projectId: string, patch: Partial<ESGProjectSnapshot>): StoredProject | undefined {
  const stored = projects.get(projectId);
  if (!stored) return undefined;

  stored.snapshot = {
    ...stored.snapshot,
    ...patch,
  };
  stored.project.updatedAt = nowIso();
  projects.set(projectId, stored);
  return stored;
}

export function generateProjectChecklist(projectId: string): StoredProject | undefined {
  const stored = projects.get(projectId);
  if (!stored) return undefined;

  const checklist = generateDisclosureChecklist(
    stored.snapshot.uploadedFiles,
    stored.snapshot.selectedStandardIds,
    stored.snapshot.parsedDocuments ?? [],
  );

  return updateProjectSnapshot(projectId, {
    disclosureChecklist: checklist,
    reportDraft: [],
    riskFindings: [],
    indicatorIndex: [],
  });
}

export function generateProjectReport(projectId: string): StoredProject | undefined {
  const stored = projects.get(projectId);
  if (!stored) return undefined;

  const reportDraft = generateReportDraft(stored.snapshot.uploadedFiles, stored.snapshot.disclosureChecklist);
  const indicatorIndex = generateIndicatorIndex(reportDraft, stored.snapshot.disclosureChecklist);

  return updateProjectSnapshot(projectId, {
    reportDraft,
    indicatorIndex,
  });
}
