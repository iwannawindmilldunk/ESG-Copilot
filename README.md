# AI ESG 报告生成与合规校验平台 MVP

这是一个基于 **Next.js + React + TypeScript + Tailwind CSS** 的网页 MVP，用于模拟企业 ESG 报告生成、披露清单管理、风险校验和指标索引表生成流程。

当前版本优先实现完整可交互工作流，披露清单已从自定义 mock 规则升级为“标准映射驱动”的多标准 ESG 披露清单生成器。MVP 阶段内置 GRI Lite、国内交易所指引 Lite、ISSB Lite 三套结构化映射，代码结构已预留真实大模型 API、文件解析、完整标准库和数据库持久化接入位置。

## 项目定位

目标用户包括国内企业、ESG 咨询公司、上市公司和拟上市公司。平台希望将 ESG 报告准备过程中重复度较高的工作结构化：

- 上传企业资料并识别资料类别
- 选择披露标准并自动生成 ESG 披露清单
- 自动生成报告初稿
- 自动识别缺失数据和高风险表述
- 自动生成指标索引表
- 支持证据链追溯和后续审阅

## 当前 MVP 功能

- Landing Page：展示产品定位、核心能力和入口按钮
- Workspace 五步流程：
  - Step 1 前：选择披露标准，可选择国内交易所指引 Lite、GRI Standards Lite、ISSB IFRS S1/S2 Lite 或综合模式
  - Step 1：上传 PDF / Word / Excel / PPT / TXT / Markdown 文件，并基于文件名 mock 分类
  - Step 2：基于标准条目、统一议题映射和企业资料覆盖度生成 E/S/G 披露清单
  - Step 3：基于统一议题生成中文 ESG 报告初稿，并在章节中展示覆盖的标准条目
  - Step 4：执行 mock 风险校验
  - Step 5：生成指标索引表，复制正文，下载 JSON / Markdown
- 多标准披露清单能力：
  - 支持多标准选择
  - 支持 GRI Lite
  - 支持国内交易所指引 Lite
  - 支持 ISSB Lite
  - 支持统一议题映射
  - 支持标准条款和企业材料覆盖度检查
- Next.js API Route Handlers：
  - `/api/esg/classify`
  - `/api/esg/disclosure-checklist`
  - `/api/esg/report-draft`
  - `/api/esg/risk-check`
  - `/api/esg/indicator-index`
- `src/services/aiService.ts` 作为未来真实 LLM 接入点
- `src/types/esg.ts` 预留未来 PostgreSQL / Supabase 表边界

## 文件目录结构

```text
.
├── README.md
├── package.json
├── next.config.ts
├── tailwind.config.ts
├── postcss.config.js
├── tsconfig.json
└── src
    ├── app
    │   ├── api/esg
    │   │   ├── classify/route.ts
    │   │   ├── disclosure-checklist/route.ts
    │   │   ├── indicator-index/route.ts
    │   │   ├── report-draft/route.ts
    │   │   └── risk-check/route.ts
    │   ├── globals.css
    │   ├── layout.tsx
    │   ├── page.tsx
    │   └── workspace/page.tsx
    ├── components
    │   ├── DisclosureChecklist.tsx
    │   ├── ExportPanel.tsx
    │   ├── FileUploader.tsx
    │   ├── IndicatorIndexTable.tsx
    │   ├── ReportDraftViewer.tsx
    │   ├── RiskCheckPanel.tsx
    │   ├── StatusBadge.tsx
    │   ├── Stepper.tsx
    │   └── UploadedFileList.tsx
    ├── data
    │   └── disclosureTopics.ts
    ├── lib
    │   ├── esg
    │   │   ├── disclosureStandardItems.ts
    │   │   ├── standards.ts
    │   │   └── topicMappings.ts
    │   ├── apiClient.ts
    │   ├── export.ts
    │   └── utils.ts
    ├── services
    │   └── aiService.ts
    └── types
        └── esg.ts
```

## 安装依赖

```bash
npm install
```

## 启动本地开发

```bash
npm run dev
```

默认访问：

```text
http://localhost:3000
```

## 构建验证

```bash
npm run typecheck
npm run build
```

## 如何接入真实大模型 API

当前规则与模板逻辑集中在：

```text
src/services/aiService.ts
```

保留的函数签名：

```ts
classifyFiles(files)
generateDisclosureChecklist(files, selectedStandardIds)
generateReportDraft(files, checklist)
checkReportRisks(reportDraft, checklist)
generateIndicatorIndex(reportDraft, checklist)
```

后续接入 OpenAI / Anthropic / 私有大模型时，建议保持这些工作流边界不变，在函数内部替换为真实 API 调用：

1. 在 `.env.local` 中配置模型密钥，例如 `OPENAI_API_KEY=...`
2. 在 `aiService.ts` 中增加真实模型客户端
3. 将文件解析后的正文、表格数据和元数据组织为结构化 prompt
4. 要求模型输出严格 JSON，并用 Zod 或其他 schema 校验
5. 保留 mock 分支作为本地开发和演示 fallback

推荐拆分方向：

- `services/fileParserService.ts`：解析 PDF、Word、Excel、PPT
- `services/retrievalService.ts`：证据片段检索和引用
- `services/llmService.ts`：真实 LLM 网关
- `services/esgWorkflowService.ts`：编排分类、清单、报告、风险和导出
- `lib/esg/standards.ts`：维护披露标准元数据
- `lib/esg/disclosureStandardItems.ts`：维护标准条目结构化摘要、证据类型、建议指标和责任部门
- `lib/esg/topicMappings.ts`：维护跨标准统一议题映射，用于综合模式去重

## 未来数据库设计预留

当前类型已按未来持久化边界设计，可映射到 PostgreSQL / Supabase：

- `projects`
- `uploaded_files`
- `disclosure_items`
- `report_sections`
- `risk_findings`
- `indicator_indexes`

建议后续增加：

- 企业维度：`companies`
- 用户与权限：`users`、`roles`、`project_members`
- 证据链：`evidence_chunks`、`document_pages`
- 审阅流：`review_comments`、`approval_logs`

## 后续可扩展功能

- Word/PDF 内容真实解析
- 企业 ESG 数据台账
- 碳排放自动计算
- 权限管理
- 多企业项目管理
- 数据库持久化
- Word/PDF 正式导出
- 中英文双语报告
- ESG 评级差距分析
- 供应链 ESG 问卷自动回复

## 当前实现说明

- 文件不会上传到云端，也不会持久化存储，浏览器只发送文件名、类型、大小和上传时间用于 mock 分类。
- 披露清单不是自定义 ESG 规则库，而是从所选标准条目映射到统一议题后生成；Lite 标准只包含 MVP 演示所需的代表性条目，不等同于完整标准文本。
- 报告初稿不会编造具体 ESG 指标数值，缺失议题会提示后续完善数据统计和管理机制。
- 风险校验为规则模拟，用于展示产品交互和未来真实合规模型接入方式。
