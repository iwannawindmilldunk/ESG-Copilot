import type {
  ClassifiableFile,
  DisclosureItem,
  ESGProjectSnapshot,
  IndicatorIndex,
  ParsedDocument,
  Project,
  ReportSection,
  RiskFinding,
  UploadedFile,
} from "@/types/esg";

export type StoredProjectResponse = {
  project: Project;
  snapshot: ESGProjectSnapshot;
};

async function postJson<TResponse, TPayload>(url: string, payload: TPayload): Promise<TResponse> {
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || "请求失败，请稍后重试。");
  }

  return response.json() as Promise<TResponse>;
}

async function patchJson<TResponse, TPayload>(url: string, payload: TPayload): Promise<TResponse> {
  const response = await fetch(url, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || "请求失败，请稍后重试。");
  }

  return response.json() as Promise<TResponse>;
}

export function classifyFilesApi(files: ClassifiableFile[]) {
  return postJson<{ files: UploadedFile[] }, { files: ClassifiableFile[] }>("/api/esg/classify", { files });
}

export function parseDocumentsApi(files: ClassifiableFile[]) {
  return postJson<
    { files: UploadedFile[]; parsedDocuments: ParsedDocument[] },
    { files: ClassifiableFile[] }
  >("/api/esg/documents/parse", { files });
}

export function generateDisclosureChecklistApi(
  files: UploadedFile[],
  selectedStandardIds: string[],
  parsedDocuments: ParsedDocument[] = [],
) {
  return postJson<
    { checklist: DisclosureItem[] },
    { files: UploadedFile[]; selectedStandardIds: string[]; parsedDocuments: ParsedDocument[] }
  >("/api/esg/disclosure-checklist", {
    files,
    selectedStandardIds,
    parsedDocuments,
  });
}

export function generateReportDraftApi(files: UploadedFile[], checklist: DisclosureItem[]) {
  return postJson<
    { reportDraft: ReportSection[] },
    { files: UploadedFile[]; checklist: DisclosureItem[] }
  >("/api/esg/report-draft", { files, checklist });
}

export function checkReportRisksApi(reportDraft: ReportSection[], checklist: DisclosureItem[]) {
  return postJson<
    { riskFindings: RiskFinding[] },
    { reportDraft: ReportSection[]; checklist: DisclosureItem[] }
  >("/api/esg/risk-check", { reportDraft, checklist });
}

export function generateIndicatorIndexApi(reportDraft: ReportSection[], checklist: DisclosureItem[]) {
  return postJson<
    { indicatorIndex: IndicatorIndex[] },
    { reportDraft: ReportSection[]; checklist: DisclosureItem[] }
  >("/api/esg/indicator-index", { reportDraft, checklist });
}

export function createProjectApi(payload: {
  name?: string;
  companyName?: string;
  reportingYear?: string;
  selectedStandardIds?: string[];
}) {
  return postJson<StoredProjectResponse, typeof payload>("/api/esg/projects", payload);
}

export function updateProjectApi(
  projectId: string,
  payload: {
    name?: string;
    companyName?: string;
    reportingYear?: string;
    selectedStandardIds?: string[];
  },
) {
  return patchJson<StoredProjectResponse, typeof payload>(`/api/esg/projects/${projectId}`, payload);
}

export function attachProjectDocumentsApi(projectId: string, files: ClassifiableFile[]) {
  return postJson<StoredProjectResponse, { files: ClassifiableFile[] }>(`/api/esg/projects/${projectId}/documents`, {
    files,
  });
}

export function generateProjectChecklistApi(projectId: string) {
  return postJson<StoredProjectResponse, Record<string, never>>(`/api/esg/projects/${projectId}/generate-checklist`, {});
}

export function updateProjectChecklistItemApi(projectId: string, itemId: string, patch: Partial<DisclosureItem>) {
  return patchJson<StoredProjectResponse, Partial<DisclosureItem>>(`/api/esg/projects/${projectId}/checklist/${itemId}`, patch);
}

export function generateProjectReportApi(projectId: string) {
  return postJson<StoredProjectResponse, Record<string, never>>(`/api/esg/projects/${projectId}/generate-report`, {});
}

export function checkProjectRisksApi(projectId: string) {
  return postJson<StoredProjectResponse, Record<string, never>>(`/api/esg/projects/${projectId}/risk-check`, {});
}

export function generateProjectIndicatorIndexApi(projectId: string) {
  return postJson<StoredProjectResponse, Record<string, never>>(`/api/esg/projects/${projectId}/indicator-index`, {});
}

export async function exportProjectWordApi(projectId: string): Promise<Blob> {
  const response = await fetch(`/api/esg/projects/${projectId}/export-word`, {
    method: "POST",
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || "Word 导出失败，请稍后重试。");
  }

  return response.blob();
}

export async function exportWordApi(snapshot: ESGProjectSnapshot): Promise<Blob> {
  const response = await fetch("/api/esg/export-word", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(snapshot),
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || "Word 导出失败，请稍后重试。");
  }

  return response.blob();
}
