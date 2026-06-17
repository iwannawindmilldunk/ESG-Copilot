import Link from "next/link";
import {
  ArrowRight,
  CheckCircle2,
  FileSearch,
  Files,
  ListChecks,
  ShieldAlert,
  Sparkles,
} from "lucide-react";

const features = [
  {
    title: "上传企业资料，自动识别 ESG 内容",
    description: "支持 PDF、Word、Excel、PPT、TXT、Markdown 等常见材料，生成可追溯 EvidenceChunk。",
    icon: Files,
  },
  {
    title: "自动生成披露清单",
    description: "基于标准条款、统一议题和证据片段判断已覆盖、部分覆盖和缺失。",
    icon: ListChecks,
  },
  {
    title: "生成报告初稿与指标索引",
    description: "按公司概况、环境、社会、治理、关键绩效和指标索引生成审慎的中文初稿。",
    icon: Sparkles,
  },
  {
    title: "识别缺失数据和高风险表述",
    description: "检查夸大表述、缺少量化数据、披露缺口和关键数据一致性风险。",
    icon: ShieldAlert,
  },
  {
    title: "支持证据链追溯",
    description: "报告章节和披露议题保留证据片段、文件位置和标准来源，支持审阅和补证。",
    icon: FileSearch,
  },
];

const workflow = ["上传资料", "生成披露清单", "生成报告初稿", "风险校验", "导出结果"];

export default function Home() {
  return (
    <main className="min-h-screen bg-[#f7fbf9]">
      <section className="border-b border-brand-100 bg-gradient-to-b from-white to-brand-50/70">
        <div className="mx-auto flex min-h-screen max-w-7xl flex-col justify-center px-6 py-16 lg:px-8">
          <div className="max-w-4xl">
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-brand-200 bg-white px-3 py-1 text-sm font-medium text-brand-800">
              <CheckCircle2 className="h-4 w-4" />
              ESG 报告自动化 MVP
            </div>
            <h1 className="max-w-5xl text-4xl font-semibold tracking-normal text-ink-900 sm:text-5xl lg:text-6xl">
              AI ESG 报告生成与合规校验平台
            </h1>
            <p className="mt-6 max-w-3xl text-lg leading-8 text-ink-700">
              面向国内企业、ESG 咨询公司、上市公司和拟上市公司，将资料收集、披露清单、报告初稿、风险校验和指标索引整合为可追踪的结构化工作流。
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/workspace"
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-brand-700 px-5 py-3 text-base font-semibold text-white shadow-soft transition hover:bg-brand-800"
              >
                开始创建 ESG 报告
                <ArrowRight className="h-5 w-5" />
              </Link>
              <a
                href="#features"
                className="inline-flex items-center justify-center rounded-lg border border-brand-200 bg-white px-5 py-3 text-base font-semibold text-brand-800 transition hover:border-brand-300 hover:bg-brand-50"
              >
                查看核心能力
              </a>
            </div>
          </div>

          <div className="mt-12 grid gap-4 rounded-lg border border-brand-100 bg-white p-4 shadow-soft lg:grid-cols-[280px_1fr]">
            <div className="rounded-lg bg-brand-800 p-5 text-white">
              <p className="text-sm text-brand-100">工作流进度</p>
              <div className="mt-5 space-y-3">
                {workflow.map((item, index) => (
                  <div key={item} className="flex items-center gap-3">
                    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white/15 text-sm">
                      {index + 1}
                    </span>
                    <span className="text-sm font-medium">{item}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              <div className="rounded-lg border border-ink-100 p-4">
                <p className="text-sm font-semibold text-ink-900">披露清单</p>
                <p className="mt-2 text-3xl font-semibold text-brand-700">17</p>
                <p className="mt-1 text-sm text-ink-500">内置 E/S/G 议题</p>
              </div>
              <div className="rounded-lg border border-ink-100 p-4">
                <p className="text-sm font-semibold text-ink-900">报告章节</p>
                <p className="mt-2 text-3xl font-semibold text-brand-700">9</p>
                <p className="mt-1 text-sm text-ink-500">中文报告初稿结构</p>
              </div>
              <div className="rounded-lg border border-ink-100 p-4">
                <p className="text-sm font-semibold text-ink-900">导出格式</p>
                <p className="mt-2 text-3xl font-semibold text-brand-700">2+</p>
                <p className="mt-1 text-sm text-ink-500">Word / JSON / Markdown / CSV</p>
              </div>
              <div className="md:col-span-3 rounded-lg border border-ink-100 bg-ink-100/40 p-4">
                <div className="grid gap-3 md:grid-cols-3">
                  {["资料分类", "风险提示", "证据追溯"].map((item) => (
                    <div key={item} className="flex items-center gap-2 text-sm font-medium text-ink-700">
                      <CheckCircle2 className="h-4 w-4 text-brand-600" />
                      {item}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="features" className="mx-auto max-w-7xl px-6 py-16 lg:px-8">
        <div className="mb-8 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-brand-700">Core Features</p>
            <h2 className="mt-3 text-3xl font-semibold text-ink-900">围绕 ESG 报告生产的关键环节</h2>
          </div>
          <p className="max-w-2xl text-sm leading-6 text-ink-600">
            当前版本已打通项目级后端、证据链、Word 导出和 Supabase 持久化 fallback，可继续接入真实客户试点数据。
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {features.map((feature) => {
            const Icon = feature.icon;
            return (
              <article key={feature.title} className="rounded-lg border border-ink-100 bg-white p-5 shadow-sm">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-50 text-brand-700">
                  <Icon className="h-5 w-5" />
                </div>
                <h3 className="mt-4 text-base font-semibold text-ink-900">{feature.title}</h3>
                <p className="mt-2 text-sm leading-6 text-ink-600">{feature.description}</p>
              </article>
            );
          })}
        </div>
      </section>
    </main>
  );
}
