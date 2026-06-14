"use client";

import Link from "next/link";
import { ArrowLeft, ArrowRight, Database, Loader2, Play, RefreshCw } from "lucide-react";
import { useMemo, useState } from "react";

import { DisclosureChecklist } from "@/components/DisclosureChecklist";
import { ExportPanel } from "@/components/ExportPanel";
import { FileUploader } from "@/components/FileUploader";
import { IndicatorIndexTable } from "@/components/IndicatorIndexTable";
import { ReportDraftViewer } from "@/components/ReportDraftViewer";
import { RiskCheckPanel } from "@/components/RiskCheckPanel";
import { Stepper, type StepDefinition } from "@/components/Stepper";
import { UploadedFileList } from "@/components/UploadedFileList";
import {
  checkReportRisksApi,
  classifyFilesApi,
  generateDisclosureChecklistApi,
  generateIndicatorIndexApi,
  generateReportDraftApi,
} from "@/lib/apiClient";
import type {
  ClassifiableFile,
  DisclosureItem,
  ESGProjectSnapshot,
  IndicatorIndex,
  ReportSection,
  RiskFinding,
  UploadedFile,
} from "@/types/esg";

const steps: StepDefinition[] = [
  {
    title: "上传资料",
    description: "上传文件并自动识别资料类别",
  },
  {
    title: "生成披露清单",
    description: "判断 ESG 议题覆盖与缺口",
  },
  {
    title: "生成报告初稿",
    description: "按章节输出审慎报告文本",
  },
  {
    title: "风险校验",
    description: "检查夸大表述、缺口和一致性",
  },
  {
    title: "导出结果",
    description: "生成指标索引并导出文件",
  },
];

type LoadingAction = "upload" | "checklist" | "report" | "risk" | "index" | null;

function SectionHeader({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description: string;
}) {
  return (
    <div className="mb-5">
      <p className="text-sm font-semibold uppercase tracking-[0.16em] text-brand-700">{eyebrow}</p>
      <h2 className="mt-2 text-2xl font-semibold text-ink-900">{title}</h2>
      <p className="mt-2 max-w-3xl text-sm leading-6 text-ink-600">{description}</p>
    </div>
  );
}

function PrimaryAction({
  children,
  onClick,
  disabled,
  loading,
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  loading?: boolean;
}) {
  return (
    <button
      type="button"
      disabled={disabled || loading}
      onClick={onClick}
      className="inline-flex items-center justify-center gap-2 rounded-lg bg-brand-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-800 disabled:cursor-not-allowed disabled:bg-ink-300"
    >
      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
      {children}
    </button>
  );
}

export default function WorkspacePage() {
  const [currentStep, setCurrentStep] = useState(0);
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [disclosureChecklist, setDisclosureChecklist] = useState<DisclosureItem[]>([]);
  const [reportDraft, setReportDraft] = useState<ReportSection[]>([]);
  const [riskFindings, setRiskFindings] = useState<RiskFinding[]>([]);
  const [indicatorIndex, setIndicatorIndex] = useState<IndicatorIndex[]>([]);
  const [loadingAction, setLoadingAction] = useState<LoadingAction>(null);
  const [error, setError] = useState<string | null>(null);

  const maxUnlockedStep = useMemo(() => {
    if (riskFindings.length > 0 || indicatorIndex.length > 0) return 4;
    if (reportDraft.length > 0) return 3;
    if (disclosureChecklist.length > 0) return 2;
    if (uploadedFiles.length > 0) return 1;
    return 0;
  }, [disclosureChecklist.length, indicatorIndex.length, reportDraft.length, riskFindings.length, uploadedFiles.length]);

  const snapshot: ESGProjectSnapshot = {
    uploadedFiles,
    disclosureChecklist,
    reportDraft,
    riskFindings,
    indicatorIndex,
  };

  async function runWithErrorBoundary(action: LoadingAction, callback: () => Promise<void>) {
    setError(null);
    setLoadingAction(action);
    try {
      await callback();
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "操作失败，请稍后重试。");
    } finally {
      setLoadingAction(null);
    }
  }

  async function handleUpload(files: ClassifiableFile[]) {
    await runWithErrorBoundary("upload", async () => {
      const response = await classifyFilesApi(files);
      setUploadedFiles((prev) => [...prev, ...response.files]);
      setDisclosureChecklist([]);
      setReportDraft([]);
      setRiskFindings([]);
      setIndicatorIndex([]);
      setCurrentStep(1);
    });
  }

  function handleGenerateChecklist() {
    void runWithErrorBoundary("checklist", async () => {
      const response = await generateDisclosureChecklistApi(uploadedFiles);
      setDisclosureChecklist(response.checklist);
      setReportDraft([]);
      setRiskFindings([]);
      setIndicatorIndex([]);
      setCurrentStep(1);
    });
  }

  function handleGenerateReport() {
    void runWithErrorBoundary("report", async () => {
      const response = await generateReportDraftApi(uploadedFiles, disclosureChecklist);
      setReportDraft(response.reportDraft);
      setRiskFindings([]);
      setIndicatorIndex([]);
      setCurrentStep(2);
    });
  }

  function handleCheckRisks() {
    void runWithErrorBoundary("risk", async () => {
      const response = await checkReportRisksApi(reportDraft, disclosureChecklist);
      setRiskFindings(response.riskFindings);
      setIndicatorIndex([]);
      setCurrentStep(3);
    });
  }

  function handleGenerateIndicatorIndex() {
    void runWithErrorBoundary("index", async () => {
      const response = await generateIndicatorIndexApi(reportDraft, disclosureChecklist);
      setIndicatorIndex(response.indicatorIndex);
      setCurrentStep(4);
    });
  }

  function handleReset() {
    setUploadedFiles([]);
    setDisclosureChecklist([]);
    setReportDraft([]);
    setRiskFindings([]);
    setIndicatorIndex([]);
    setError(null);
    setCurrentStep(0);
  }

  return (
    <main className="min-h-screen bg-[#f7fbf9]">
      <header className="sticky top-0 z-20 border-b border-brand-100 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-6 py-4 lg:flex-row lg:items-center lg:justify-between lg:px-8">
          <div>
            <Link href="/" className="inline-flex items-center gap-2 text-sm font-semibold text-brand-700 hover:text-brand-900">
              <ArrowLeft className="h-4 w-4" />
              返回首页
            </Link>
            <h1 className="mt-2 text-xl font-semibold text-ink-900">AI ESG 报告工作台</h1>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-sm text-ink-600">
            <span className="rounded-full bg-brand-50 px-3 py-1 font-medium text-brand-800">
              文件 {uploadedFiles.length}
            </span>
            <span className="rounded-full bg-brand-50 px-3 py-1 font-medium text-brand-800">
              清单 {disclosureChecklist.length}
            </span>
            <span className="rounded-full bg-brand-50 px-3 py-1 font-medium text-brand-800">
              风险 {riskFindings.length}
            </span>
            <button
              type="button"
              onClick={handleReset}
              className="inline-flex items-center gap-2 rounded-lg border border-ink-100 bg-white px-3 py-1.5 font-semibold text-ink-700 transition hover:border-brand-200 hover:bg-brand-50"
            >
              <RefreshCw className="h-4 w-4" />
              重置
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-7xl gap-6 px-6 py-8 lg:grid-cols-[300px_1fr] lg:px-8">
        <aside className="lg:sticky lg:top-28 lg:self-start">
          <div className="rounded-lg border border-ink-100 bg-white p-4 shadow-sm">
            <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-ink-900">
              <Database className="h-4 w-4 text-brand-700" />
              工作流步骤
            </div>
            <Stepper
              steps={steps}
              currentStep={currentStep}
              maxCompletedStep={maxUnlockedStep}
              onStepClick={setCurrentStep}
            />
          </div>
        </aside>

        <section className="min-w-0">
          {error ? (
            <div className="mb-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
          ) : null}

          {currentStep === 0 ? (
            <div>
              <SectionHeader
                eyebrow="Step 1"
                title="上传资料"
                description="MVP 阶段不会真实解析文件正文，而是基于文件名和 MIME 类型完成 mock 分类。后续可替换为 PDF/Word/Excel 解析与向量检索。"
              />
              <div className="space-y-5">
                <FileUploader onUpload={handleUpload} disabled={loadingAction === "upload"} />
                <UploadedFileList files={uploadedFiles} />
              </div>
            </div>
          ) : null}

          {currentStep === 1 ? (
            <div>
              <SectionHeader
                eyebrow="Step 2"
                title="生成 ESG 披露清单"
                description="系统根据上传文件的资料类别，生成 E/S/G 议题覆盖判断、缺失内容、责任部门和风险等级。"
              />
              <div className="mb-5 flex flex-wrap items-center gap-3">
                <PrimaryAction
                  onClick={handleGenerateChecklist}
                  disabled={uploadedFiles.length === 0}
                  loading={loadingAction === "checklist"}
                >
                  生成披露清单
                </PrimaryAction>
                <button
                  type="button"
                  onClick={() => setCurrentStep(0)}
                  className="inline-flex items-center justify-center rounded-lg border border-ink-100 bg-white px-4 py-2.5 text-sm font-semibold text-ink-700 transition hover:border-brand-200 hover:bg-brand-50"
                >
                  继续上传资料
                </button>
              </div>
              <DisclosureChecklist checklist={disclosureChecklist} />
            </div>
          ) : null}

          {currentStep === 2 ? (
            <div>
              <SectionHeader
                eyebrow="Step 3"
                title="生成报告初稿"
                description="报告以模板、资料类别和披露状态为依据生成，缺失议题会保留审慎表述，不编造具体数据。"
              />
              <div className="mb-5 flex flex-wrap items-center gap-3">
                <PrimaryAction
                  onClick={handleGenerateReport}
                  disabled={disclosureChecklist.length === 0}
                  loading={loadingAction === "report"}
                >
                  生成报告初稿
                </PrimaryAction>
                <button
                  type="button"
                  onClick={() => setCurrentStep(1)}
                  className="inline-flex items-center gap-2 rounded-lg border border-ink-100 bg-white px-4 py-2.5 text-sm font-semibold text-ink-700 transition hover:border-brand-200 hover:bg-brand-50"
                >
                  查看披露清单
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>
              <ReportDraftViewer sections={reportDraft} />
            </div>
          ) : null}

          {currentStep === 3 ? (
            <div>
              <SectionHeader
                eyebrow="Step 4"
                title="风险校验"
                description="mock 风险检查会识别夸大表述、环境章节量化数据缺口、高风险披露缺口和关键数据一致性提示。"
              />
              <div className="mb-5 flex flex-wrap items-center gap-3">
                <PrimaryAction
                  onClick={handleCheckRisks}
                  disabled={reportDraft.length === 0}
                  loading={loadingAction === "risk"}
                >
                  风险校验
                </PrimaryAction>
                <button
                  type="button"
                  disabled={riskFindings.length === 0}
                  onClick={() => setCurrentStep(4)}
                  className="inline-flex items-center gap-2 rounded-lg border border-ink-100 bg-white px-4 py-2.5 text-sm font-semibold text-ink-700 transition hover:border-brand-200 hover:bg-brand-50 disabled:cursor-not-allowed disabled:text-ink-300"
                >
                  前往导出
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>
              <RiskCheckPanel findings={riskFindings} />
            </div>
          ) : null}

          {currentStep === 4 ? (
            <div>
              <SectionHeader
                eyebrow="Step 5"
                title="导出结果"
                description="生成指标索引表后，可复制报告正文，或下载包含上传文件、清单、报告、风险和索引的 JSON / Markdown 文件。"
              />
              <div className="mb-5 flex flex-wrap items-center gap-3">
                <PrimaryAction
                  onClick={handleGenerateIndicatorIndex}
                  disabled={reportDraft.length === 0}
                  loading={loadingAction === "index"}
                >
                  生成指标索引表
                </PrimaryAction>
                <button
                  type="button"
                  onClick={() => setCurrentStep(3)}
                  className="inline-flex items-center justify-center rounded-lg border border-ink-100 bg-white px-4 py-2.5 text-sm font-semibold text-ink-700 transition hover:border-brand-200 hover:bg-brand-50"
                >
                  返回风险校验
                </button>
              </div>
              <div className="space-y-5">
                <IndicatorIndexTable indicators={indicatorIndex} />
                <ExportPanel snapshot={snapshot} />
              </div>
            </div>
          ) : null}
        </section>
      </div>
    </main>
  );
}
