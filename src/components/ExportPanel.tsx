"use client";

import { Check, Copy, Download } from "lucide-react";
import { useState } from "react";

import { downloadTextFile, reportToPlainText, snapshotToMarkdown } from "@/lib/export";
import type { ESGProjectSnapshot } from "@/types/esg";

type ExportPanelProps = {
  snapshot: ESGProjectSnapshot;
};

export function ExportPanel({ snapshot }: ExportPanelProps) {
  const [copied, setCopied] = useState(false);
  const hasReport = snapshot.reportDraft.length > 0;

  async function copyReport() {
    if (!hasReport) return;

    await navigator.clipboard.writeText(reportToPlainText(snapshot.reportDraft));
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  }

  function downloadJson() {
    downloadTextFile("esg-report-result.json", JSON.stringify(snapshot, null, 2), "application/json;charset=utf-8");
  }

  function downloadMarkdown() {
    downloadTextFile("esg-report-draft.md", snapshotToMarkdown(snapshot), "text/markdown;charset=utf-8");
  }

  return (
    <div className="rounded-lg border border-ink-100 bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h3 className="text-base font-semibold text-ink-900">导出结果</h3>
          <p className="mt-1 text-sm text-ink-600">支持复制报告正文、下载 JSON 和 Markdown，JSON 会包含完整工作流结果。</p>
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
            下载 Markdown
          </button>
          <button
            type="button"
            onClick={downloadJson}
            disabled={!hasReport}
            className="inline-flex items-center gap-2 rounded-lg bg-brand-700 px-3 py-2 text-sm font-semibold text-white transition hover:bg-brand-800 disabled:cursor-not-allowed disabled:bg-ink-300"
          >
            <Download className="h-4 w-4" />
            下载 JSON
          </button>
        </div>
      </div>
    </div>
  );
}
