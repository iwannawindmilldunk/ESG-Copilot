import type {
  ClassifiableFile,
  DisclosureItem,
  ESGProjectSnapshot,
  IndicatorIndex,
  ParsedDocument,
  ReportSection,
  RiskFinding,
  UploadedFile,
} from "@/types/esg";

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
