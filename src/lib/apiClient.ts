import type {
  ClassifiableFile,
  DisclosureItem,
  IndicatorIndex,
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

export function generateDisclosureChecklistApi(files: UploadedFile[]) {
  return postJson<{ checklist: DisclosureItem[] }, { files: UploadedFile[] }>("/api/esg/disclosure-checklist", {
    files,
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
