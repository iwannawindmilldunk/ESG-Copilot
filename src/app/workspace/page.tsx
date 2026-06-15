"use client";

import Link from "next/link";
import {
  ArrowLeft,
  BarChart3,
  ClipboardList,
  Database,
  Download,
  FileText,
  Loader2,
  Play,
  RefreshCw,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { useMemo, useState } from "react";

import { DisclosureChecklist } from "@/components/DisclosureChecklist";
import { ExportPanel } from "@/components/ExportPanel";
import { FileUploader } from "@/components/FileUploader";
import { IndicatorIndexTable } from "@/components/IndicatorIndexTable";
import { ReadinessScoreCard } from "@/components/ReadinessScoreCard";
import { ReportDraftViewer } from "@/components/ReportDraftViewer";
import { RiskCheckPanel } from "@/components/RiskCheckPanel";
import { Stepper, type StepDefinition } from "@/components/Stepper";
import { UploadedFileList } from "@/components/UploadedFileList";
import {
  COMPREHENSIVE_STANDARD_ID,
  DISCLOSURE_STANDARDS,
  resolveSelectedStandardIds,
} from "@/lib/esg/standards";
import {
  checkReportRisksApi,
  classifyFilesApi,
  generateDisclosureChecklistApi,
  generateIndicatorIndexApi,
  generateReportDraftApi,
} from "@/lib/apiClient";
import { calculateReadinessScore } from "@/lib/esg/readinessScore";
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
    description: "选择标准并上传或加载示例资料。",
  },
  {
    title: "披露清单",
    description: "按标准映射判断覆盖、缺口和风险。",
  },
  {
    title: "报告初稿",
    description: "生成带证据链和置信度的审慎初稿。",
  },
  {
    title: "风险校验",
    description: "检查夸大表述、证据缺失和数据缺口。",
  },
  {
    title: "导出结果",
    description: "生成指标索引并导出 Markdown / JSON / CSV。",
  },
];

const SAMPLE_FILES: ClassifiableFile[] = [
  {
    name: "2025年度员工培训统计表.xlsx",
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    size: 182_000,
  },
  { name: "董事会治理制度.pdf", type: "application/pdf", size: 324_000 },
  {
    name: "反商业贿赂管理办法.docx",
    type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    size: 146_000,
  },
  {
    name: "2025年度用电用水统计表.xlsx",
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    size: 208_000,
  },
  {
    name: "供应商管理制度.docx",
    type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    size: 130_000,
  },
  {
    name: "公益活动新闻稿.docx",
    type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    size: 96_000,
  },
  {
    name: "安全生产月活动总结.docx",
    type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    size: 118_000,
  },
  {
    name: "客户投诉处理机制.docx",
    type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    size: 112_000,
  },
  { name: "数据安全管理制度.pdf", type: "application/pdf", size: 276_000 },
];

type LoadingAction = "upload" | "demo" | "checklist" | "report" | "risk" | "index" | null;

const materialityLabels = {
  impact: "影响重要性",
  financial: "财务重要性",
  double: "双重重要性",
  regulatory: "监管导向",
} as const;

const standardSelectionOptions = [
  ...DISCLOSURE_STANDARDS,
  {
    id: COMPREHENSIVE_STANDARD_ID,
    name: "综合模式",
    issuer: "系统合并",
    description: "合并国内交易所指引 Lite、GRI Standards Lite 与 ISSB IFRS S1/S2 Lite，按统一议题去重生成清单。",
    materialityType: "double",
  },
] as const;

function StepPanel({
  eyebrow,
  title,
  description,
  actions,
  children,
}: {
  eyebrow: string;
  title: string;
  description: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-lg border border-ink-100 bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-brand-700">{eyebrow}</p>
          <h2 className="mt-2 text-2xl font-semibold text-ink-900">{title}</h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-ink-600">{description}</p>
        </div>
        {actions ? <div className="flex shrink-0 flex-wrap gap-2">{actions}</div> : null}
      </div>
      <div className="mt-5">{children}</div>
    </section>
  );
}

function PrimaryAction({
  children,
  onClick,
  disabled,
  loading,
  disabledReason,
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  loading?: boolean;
  disabledReason?: string;
}) {
  return (
    <div>
      <button
        type="button"
        disabled={disabled || loading}
        onClick={onClick}
        className="inline-flex items-center justify-center gap-2 rounded-lg bg-brand-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-800 disabled:cursor-not-allowed disabled:bg-ink-300"
      >
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
        {children}
      </button>
      {disabled && disabledReason ? <p className="mt-2 max-w-[220px] text-xs leading-5 text-ink-500">{disabledReason}</p> : null}
    </div>
  );
}

function SecondaryAction({
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
      className="inline-flex items-center justify-center gap-2 rounded-lg border border-brand-200 bg-white px-4 py-2.5 text-sm font-semibold text-brand-800 transition hover:bg-brand-50 disabled:cursor-not-allowed disabled:border-ink-100 disabled:text-ink-300"
    >
      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
      {children}
    </button>
  );
}

function SummaryCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
}) {
  return (
    <div className="rounded-lg border border-brand-100 bg-white px-4 py-3 shadow-sm">
      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-ink-500">
        {icon}
        {label}
      </div>
      <p className="mt-2 text-2xl font-semibold text-ink-900">{value}</p>
    </div>
  );
}

function StandardSelector({
  selectedStandardIds,
  onToggle,
}: {
  selectedStandardIds: string[];
  onToggle: (standardId: string) => void;
}) {
  const effectiveStandardIds =
    selectedStandardIds.length > 0 ? resolveSelectedStandardIds(selectedStandardIds) : [];
  const effectiveStandardNames = DISCLOSURE_STANDARDS.filter((standard) => effectiveStandardIds.includes(standard.id))
    .map((standard) => standard.name)
    .join("、");

  return (
    <section className="rounded-lg border border-ink-100 bg-white p-5 shadow-sm">
      <div className="mb-4">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-brand-700">Standard Scope</p>
        <h2 className="mt-2 text-2xl font-semibold text-ink-900">选择披露标准</h2>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-ink-600">
          当前生效标准：{effectiveStandardNames || "尚未选择"}。披露清单将基于所选标准条目映射到统一 ESG 议题。
        </p>
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        {standardSelectionOptions.map((option) => {
          const checked = selectedStandardIds.includes(option.id);

          return (
            <label
              key={option.id}
              className="flex cursor-pointer gap-3 rounded-lg border border-ink-100 bg-[#f7fbf9] p-4 transition hover:border-brand-200 hover:bg-brand-50"
            >
              <input
                type="checkbox"
                checked={checked}
                onChange={() => onToggle(option.id)}
                className="mt-1 h-4 w-4 rounded border-ink-300 text-brand-700 focus:ring-brand-600"
              />
              <span className="min-w-0">
                <span className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-semibold text-ink-900">{option.name}</span>
                  <span className="rounded-full bg-white px-2 py-0.5 text-xs font-medium text-ink-500 ring-1 ring-ink-100">
                    {materialityLabels[option.materialityType]}
                  </span>
                </span>
                <span className="mt-1 block text-xs font-medium text-brand-700">{option.issuer}</span>
                <span className="mt-2 block text-sm leading-6 text-ink-600">{option.description}</span>
              </span>
            </label>
          );
        })}
      </div>
    </section>
  );
}

export default function WorkspacePage() {
  const [currentStep, setCurrentStep] = useState(0);
  const [selectedStandardIds, setSelectedStandardIds] = useState<string[]>(["cn-exchange-lite"]);
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [disclosureChecklist, setDisclosureChecklist] = useState<DisclosureItem[]>([]);
  const [reportDraft, setReportDraft] = useState<ReportSection[]>([]);
  const [riskFindings, setRiskFindings] = useState<RiskFinding[]>([]);
  const [indicatorIndex, setIndicatorIndex] = useState<IndicatorIndex[]>([]);
  const [loadingAction, setLoadingAction] = useState<LoadingAction>(null);
  const [error, setError] = useState<string | null>(null);

  const readinessScore = useMemo(() => calculateReadinessScore(disclosureChecklist), [disclosureChecklist]);
  const effectiveSelectedStandardIds = useMemo(
    () => (selectedStandardIds.length > 0 ? resolveSelectedStandardIds(selectedStandardIds) : []),
    [selectedStandardIds],
  );

  const maxCompletedStep = useMemo(() => {
    if (indicatorIndex.length > 0) return 5;
    if (riskFindings.length > 0) return 4;
    if (reportDraft.length > 0) return 3;
    if (disclosureChecklist.length > 0) return 2;
    if (uploadedFiles.length > 0) return 1;
    return 0;
  }, [disclosureChecklist.length, indicatorIndex.length, reportDraft.length, riskFindings.length, uploadedFiles.length]);

  const snapshot: ESGProjectSnapshot = {
    selectedStandardIds: effectiveSelectedStandardIds,
    uploadedFiles,
    disclosureChecklist,
    reportDraft,
    riskFindings,
    indicatorIndex,
    readinessScore,
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

  function resetDownstream() {
    setDisclosureChecklist([]);
    setReportDraft([]);
    setRiskFindings([]);
    setIndicatorIndex([]);
  }

  function handleToggleStandard(standardId: string) {
    resetDownstream();
    setSelectedStandardIds((prev) => {
      if (standardId === COMPREHENSIVE_STANDARD_ID) {
        return prev.includes(COMPREHENSIVE_STANDARD_ID) ? [] : [COMPREHENSIVE_STANDARD_ID];
      }

      const withoutComprehensive = prev.filter((id) => id !== COMPREHENSIVE_STANDARD_ID);
      return withoutComprehensive.includes(standardId)
        ? withoutComprehensive.filter((id) => id !== standardId)
        : [...withoutComprehensive, standardId];
    });
  }

  async function handleUpload(files: ClassifiableFile[]) {
    await runWithErrorBoundary("upload", async () => {
      const response = await classifyFilesApi(files);
      setUploadedFiles((prev) => [...prev, ...response.files]);
      resetDownstream();
      setCurrentStep(0);
    });
  }

  function handleLoadSampleProject() {
    void runWithErrorBoundary("demo", async () => {
      const now = new Date().toISOString();
      const response = await classifyFilesApi(SAMPLE_FILES.map((file) => ({ ...file, uploadedAt: now })));
      setUploadedFiles(response.files);
      resetDownstream();
      setCurrentStep(0);
    });
  }

  function handleGenerateChecklist() {
    void runWithErrorBoundary("checklist", async () => {
      const response = await generateDisclosureChecklistApi(uploadedFiles, selectedStandardIds);
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
    setSelectedStandardIds(["cn-exchange-lite"]);
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
          <button
            type="button"
            onClick={handleReset}
            className="inline-flex w-fit items-center gap-2 rounded-lg border border-ink-100 bg-white px-3 py-2 text-sm font-semibold text-ink-700 transition hover:border-brand-200 hover:bg-brand-50"
          >
            <RefreshCw className="h-4 w-4" />
            重置项目
          </button>
        </div>
      </header>

      <div className="mx-auto grid max-w-7xl gap-6 px-6 py-8 lg:grid-cols-[300px_1fr] lg:px-8">
        <aside className="lg:sticky lg:top-28 lg:self-start">
          <div className="rounded-lg border border-ink-100 bg-white p-4 shadow-sm">
            <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-ink-900">
              <Database className="h-4 w-4 text-brand-700" />
              工作流步骤
            </div>
            <Stepper steps={steps} currentStep={currentStep} maxCompletedStep={maxCompletedStep} onStepClick={setCurrentStep} />
          </div>
        </aside>

        <section className="min-w-0 space-y-5">
          {error ? (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
          ) : null}

          <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-6">
            <SummaryCard icon={<FileText className="h-3.5 w-3.5 text-brand-700" />} label="文件数" value={uploadedFiles.length} />
            <SummaryCard icon={<Database className="h-3.5 w-3.5 text-brand-700" />} label="标准数" value={effectiveSelectedStandardIds.length} />
            <SummaryCard icon={<ClipboardList className="h-3.5 w-3.5 text-brand-700" />} label="披露项目" value={disclosureChecklist.length} />
            <SummaryCard icon={<BarChart3 className="h-3.5 w-3.5 text-brand-700" />} label="报告章节" value={reportDraft.length} />
            <SummaryCard icon={<ShieldCheck className="h-3.5 w-3.5 text-brand-700" />} label="风险数" value={riskFindings.length} />
            <SummaryCard icon={<Download className="h-3.5 w-3.5 text-brand-700" />} label="准备度评分" value={disclosureChecklist.length > 0 ? readinessScore.totalScore : "-"} />
          </div>

          {currentStep === 0 ? (
            <>
              <StandardSelector selectedStandardIds={selectedStandardIds} onToggle={handleToggleStandard} />
              <StepPanel
                eyebrow="Step 1"
                title="上传资料"
                description="上传 ESG 相关文件，或加载内置示例企业资料。MVP 阶段仅基于文件名和 MIME 类型进行 mock 分类，不会解析文件正文。"
                actions={
                  <SecondaryAction onClick={handleLoadSampleProject} loading={loadingAction === "demo"} disabled={loadingAction !== null}>
                    加载示例企业资料
                  </SecondaryAction>
                }
              >
                <div className="space-y-5">
                  <FileUploader onUpload={handleUpload} disabled={loadingAction !== null} />
                  <UploadedFileList files={uploadedFiles} />
                </div>
              </StepPanel>
            </>
          ) : null}

          {currentStep === 1 ? (
            <StepPanel
              eyebrow="Step 2"
              title="披露清单"
              description="系统根据所选披露标准、统一议题映射和已分类资料，判断 E/S/G 议题覆盖情况、缺失内容、建议指标、责任部门和风险等级。"
              actions={
                <PrimaryAction
                  onClick={handleGenerateChecklist}
                  disabled={uploadedFiles.length === 0 || selectedStandardIds.length === 0}
                  disabledReason={
                    selectedStandardIds.length === 0 ? "请先选择至少一套披露标准。" : "请先上传资料或加载示例企业资料。"
                  }
                  loading={loadingAction === "checklist"}
                >
                  生成披露清单
                </PrimaryAction>
              }
            >
              <div className="space-y-5">
                {disclosureChecklist.length > 0 ? <ReadinessScoreCard score={readinessScore} /> : null}
                <DisclosureChecklist checklist={disclosureChecklist} files={uploadedFiles} />
              </div>
            </StepPanel>
          ) : null}

          {currentStep === 2 ? (
            <StepPanel
              eyebrow="Step 3"
              title="报告初稿"
              description="生成九章 ESG 报告初稿，并为每个章节展示相关统一议题、覆盖标准条目、依据材料和置信度。资料不足时使用审慎表述。"
              actions={
                <PrimaryAction
                  onClick={handleGenerateReport}
                  disabled={disclosureChecklist.length === 0}
                  disabledReason="请先生成披露清单。"
                  loading={loadingAction === "report"}
                >
                  生成报告初稿
                </PrimaryAction>
              }
            >
              <ReportDraftViewer sections={reportDraft} checklist={disclosureChecklist} />
            </StepPanel>
          ) : null}

          {currentStep === 3 ? (
            <StepPanel
              eyebrow="Step 4"
              title="风险校验"
              description="检查夸大表述、证据缺失、量化数据缺失、高风险披露缺口和关键数据一致性提醒。"
              actions={
                <PrimaryAction
                  onClick={handleCheckRisks}
                  disabled={reportDraft.length === 0}
                  disabledReason="请先生成报告初稿。"
                  loading={loadingAction === "risk"}
                >
                  风险校验
                </PrimaryAction>
              }
            >
              <RiskCheckPanel findings={riskFindings} />
            </StepPanel>
          ) : null}

          {currentStep === 4 ? (
            <StepPanel
              eyebrow="Step 5"
              title="导出结果"
              description="生成指标索引表后，可导出 ESG 报告 Markdown、完整项目 JSON、披露清单 CSV、风险校验 CSV 和指标索引 CSV。"
              actions={
                <PrimaryAction
                  onClick={handleGenerateIndicatorIndex}
                  disabled={riskFindings.length === 0}
                  disabledReason="请先完成风险校验。"
                  loading={loadingAction === "index"}
                >
                  生成指标索引表
                </PrimaryAction>
              }
            >
              <div className="space-y-5">
                <IndicatorIndexTable indicators={indicatorIndex} />
                <ExportPanel snapshot={snapshot} />
              </div>
            </StepPanel>
          ) : null}
        </section>
      </div>
    </main>
  );
}
