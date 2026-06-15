"use client";

import { Check, Copy, Download } from "lucide-react";
import { useState } from "react";

import {
  disclosureChecklistToCsv,
  downloadTextFile,
  indicatorIndexToCsv,
  reportToPlainText,
  riskFindingsToCsv,
  snapshotToMarkdown,
} from "@/lib/export";
import type { ESGProjectSnapshot } from "@/types/esg";

type ExportPanelProps = {
  snapshot: ESGProjectSnapshot;
};

export function ExportPanel({ snapshot }: ExportPanelProps) {
  const [copied, setCopied] = useState(false);
  const hasReport = snapshot.reportDraft.length > 0;
  const hasChecklist = snapshot.disclosureChecklist.length > 0;
  const hasRisks = snapshot.riskFindings.length > 0;
  const hasIndicatorIndex = snapshot.indicatorIndex.length > 0;
  const hasProjectData =
    snapshot.uploadedFiles.length > 0 || hasChecklist || hasReport || hasRisks || hasIndicatorIndex;

  async function copyReport() {
    if (!hasReport) return;

    await navigator.clipboard.writeText(reportToPlainText(snapshot.reportDraft));
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  }

  function downloadJson() {
    downloadTextFile("esg-project-export.json", JSON.stringify(snapshot, null, 2), "application/json;charset=utf-8");
  }

  function downloadMarkdown() {
    downloadTextFile("esg-report-draft.md", snapshotToMarkdown(snapshot), "text/markdown;charset=utf-8");
  }

  function downloadChecklistCsv() {
    downloadTextFile("disclosure-checklist.csv", disclosureChecklistToCsv(snapshot.disclosureChecklist), "text/csv;charset=utf-8");
  }

  function downloadRiskCsv() {
    downloadTextFile("risk-findings.csv", riskFindingsToCsv(snapshot.riskFindings), "text/csv;charset=utf-8");
  }

  function downloadIndicatorCsv() {
    downloadTextFile("indicator-index.csv", indicatorIndexToCsv(snapshot.indicatorIndex), "text/csv;charset=utf-8");
  }

  return (
    <div className="rounded-lg border border-ink-100 bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h3 className="text-base font-semibold text-ink-900">导出结果</h3>
          <p className="mt-1 text-sm text-ink-600">支持 Markdown、完整项目 JSON 和三类 CSV 导出，CSV 已包含 UTF-8 BOM。</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={copyReport}
            disabled={!hasReport}
            className="inline-flex items-center gap-2 rounded-lg border border-brand-200 bg-white px-3 py-2 text-sm font-semibold text-brand-800 transition hover:bg-brand-50 disabled:cursor-not-allowed disabled:border-ink-100 disabled:text-ink-300"
          >
            {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            {copied ? "已复制" : "复制报告正文"}
          </button>
          <button
            type="button"
            onClick={downloadMarkdown}
            disabled={!hasReport}
            className="inline-flex items-center gap-2 rounded-lg border border-brand-200 bg-white px-3 py-2 text-sm font-semibold text-brand-800 transition hover:bg-brand-50 disabled:cursor-not-allowed disabled:border-ink-100 disabled:text-ink-300"
          >
            <Download className="h-4 w-4" />
            ESG 报告 Markdown
          </button>
          <button
            type="button"
            onClick={downloadJson}
            disabled={!hasProjectData}
            className="inline-flex items-center gap-2 rounded-lg border border-brand-200 bg-white px-3 py-2 text-sm font-semibold text-brand-800 transition hover:bg-brand-50 disabled:cursor-not-allowed disabled:border-ink-100 disabled:text-ink-300"
          >
            <Download className="h-4 w-4" />
            完整项目 JSON
          </button>
          <button
            type="button"
            onClick={downloadChecklistCsv}
            disabled={!hasChecklist}
            className="inline-flex items-center gap-2 rounded-lg border border-brand-200 bg-white px-3 py-2 text-sm font-semibold text-brand-800 transition hover:bg-brand-50 disabled:cursor-not-allowed disabled:border-ink-100 disabled:text-ink-300"
          >
            <Download className="h-4 w-4" />
            披露清单 CSV
          </button>
          <button
            type="button"
            onClick={downloadRiskCsv}
            disabled={!hasRisks}
            className="inline-flex items-center gap-2 rounded-lg border border-brand-200 bg-white px-3 py-2 text-sm font-semibold text-brand-800 transition hover:bg-brand-50 disabled:cursor-not-allowed disabled:border-ink-100 disabled:text-ink-300"
          >
            <Download className="h-4 w-4" />
            风险校验 CSV
          </button>
          <button
            type="button"
            onClick={downloadIndicatorCsv}
            disabled={!hasIndicatorIndex}
            className="inline-flex items-center gap-2 rounded-lg bg-brand-700 px-3 py-2 text-sm font-semibold text-white transition hover:bg-brand-800 disabled:cursor-not-allowed disabled:bg-ink-300"
          >
            <Download className="h-4 w-4" />
            指标索引 CSV
          </button>
        </div>
      </div>
    </div>
  );
}
