# AI ESG 报告生成与合规校验平台 MVP

这是一个基于 **Next.js + React + TypeScript + Tailwind CSS** 的网页 MVP，用于模拟企业 ESG 报告生成、披露清单管理、风险校验和指标索引表生成流程。

当前版本已从“可演示 MVP”推进到客户试点版雏形：披露清单采用“标准条款 + 统一议题 + EvidenceChunk”的证据驱动流程，工作台围绕项目级 API 运行，并提供 Supabase(Postgres/Auth/Storage) 持久化入口、内存 fallback、OpenAI-compatible LLM adapter 和 Word 工作底稿导出。

## 项目定位

目标用户包括国内企业、ESG 咨询公司、上市公司和拟上市公司。平台希望将 ESG 报告准备过程中重复度较高的工作结构化：

- 上传企业资料并识别资料类别
- 选择披露标准并自动生成 ESG 披露清单
- 自动生成报告初稿
- 自动识别缺失数据和高风险表述
- 自动生成指标索引表
- 支持证据链追溯和后续审阅
- 评估 ESG 披露准备度并给出下一步补充材料建议

## 当前 MVP 功能

- Landing Page：展示产品定位、核心能力和入口按钮
- Workspace 五步流程：
  - Step 1 前：选择披露标准，可选择沪深北交易所指引 Lite、GRI Standards Lite、ISSB IFRS S1/S2 Lite 或综合模式，并可直接打开官网原文或本地原文
  - Step 1：创建项目，上传 PDF / Word / Excel / PPT / TXT / Markdown 文件，或加载示例企业资料；系统会生成文件分类和解析证据库
  - Step 2：基于标准条款、统一议题映射和证据片段生成 E/S/G 披露清单，并展示 ESG 披露准备度评分
  - Step 3：基于统一议题生成中文 ESG 报告初稿，按章节展示相关披露议题、覆盖标准条目、证据片段和置信度
  - Step 4：执行增强风险校验，识别夸大表述、无证据结论、数据口径缺失、量化数据缺失、高风险披露缺口和数据一致性提醒
  - Step 5：生成指标索引表，复制正文，导出 Word / Markdown / JSON / CSV
- 多标准披露清单能力：
  - 支持多标准选择
  - 支持 GRI Lite
  - 支持沪深北交易所指引 Lite
  - 支持 ISSB Lite
  - 支持统一议题映射
  - 支持标准来源引用、官方原文链接和企业材料覆盖度检查
- 证据链追溯：
  - 报告章节包含 `evidenceFileIds`、`evidenceNotes` 和 `confidenceLevel`
  - 上传后生成 `ParsedDocument` 与 `EvidenceChunk`，包含文件、位置、文本、表格上下文和关键词
  - 系统根据所选标准条目的 `requiredEvidenceTypes`、正文命中、表格字段和证据片段绑定支撑材料
  - 披露清单、报告证据说明、风险缺口和指标索引均展示来源引用
  - 资料不足时使用“后续将进一步完善相关数据统计和披露机制”等审慎表述
- 文件解析能力：
  - TXT / Markdown / CSV：浏览器直接读取文本
  - DOCX：服务端使用 `mammoth` 提取正文
  - XLSX：服务端使用 `exceljs` 按 Sheet 提取表格文本
  - PPTX：服务端使用 `jszip` 提取幻灯片文本
  - PDF：服务端使用 `pdfjs-dist` 提取文本型 PDF；扫描件/OCR 暂列下一阶段
- 项目级后端：
  - Next.js API Routes 作为轻量后端
  - Supabase 配置存在时写入 Postgres 和 Storage
  - 未配置 Supabase 时自动使用内存 fallback，方便本地演示
  - 支持管理员、编辑者、只读审阅者三类角色的基础接口权限
- 报告章节置信度：
  - 根据章节证据数量、相关披露议题状态和高风险缺失项综合判断为“高 / 中 / 低”
- ESG 披露准备度评分：
  - 已覆盖 = 100，部分覆盖 = 50，缺失 = 0
  - 输出总分、E/S/G 分数、覆盖统计、高风险缺失项和建议补充材料
- 示例项目 Demo：
  - 一键加载员工培训、董事会治理、反商业贿赂、用电用水、供应商、公益、安全生产、客户投诉、数据安全等示例资料
  - 加载后仅自动分类并展示文件，不会自动生成披露清单
- 导出能力：
  - `esg-report-workpaper.docx`
  - `esg-report-draft.md`
  - `esg-project-export.json`
  - `disclosure-checklist.csv`
  - `risk-findings.csv`
  - `indicator-index.csv`
  - CSV 文件包含 UTF-8 BOM，便于 Excel 正确显示中文
- 工作台 UI：
  - 侧边步骤条、状态摘要、每步说明、主操作按钮、结果区域和前置步骤禁用原因提示
  - 保持简洁卡片式 B2B SaaS 风格，主色为深绿色 / 蓝绿色
- Next.js API Route Handlers：
  - `/api/esg/classify`
  - `/api/esg/documents/parse`
  - `/api/esg/disclosure-checklist`
  - `/api/esg/report-draft`
  - `/api/esg/risk-check`
  - `/api/esg/indicator-index`
  - `/api/esg/export-word`
  - `/api/esg/projects`
  - `/api/esg/projects/:id`
  - `/api/esg/projects/:id/documents`
  - `/api/esg/projects/:id/documents/:documentId/parse`
  - `/api/esg/projects/:id/generate-checklist`
  - `/api/esg/projects/:id/checklist/:itemId`
  - `/api/esg/projects/:id/generate-report`
  - `/api/esg/projects/:id/risk-check`
  - `/api/esg/projects/:id/indicator-index`
  - `/api/esg/projects/:id/export-word`
- `src/services/aiService.ts` 作为 ESG 工作流编排层
- `src/services/llmService.ts` 提供 OpenAI-compatible adapter，无 Key 时保留 mock fallback
- `src/services/projectStore.ts` 提供 Supabase 优先、内存 fallback 的项目仓库
- `src/types/esg.ts` 对齐 Supabase 表边界和前端工作流数据结构

## 标准来源与原文

标准来源维护在：

```text
src/lib/esg/standards.ts
```

本地原文/官方页面快照保存在：

```text
public/standards
```

当前已绑定来源：

- 上交所：《上海证券交易所上市公司自律监管指引第14号——可持续发展报告（试行）》
  - 官网：https://www.sse.com.cn/lawandrules/sselawsrules2025/stocks/mainipo/c/c_20250516_10779150.shtml
  - 本地：`/standards/sse-guideline-no14-sustainability-report-trial.docx`
- 深交所：《深圳证券交易所上市公司自律监管指引第17号——可持续发展报告（试行）》
  - 官网：https://www.szse.cn/lawrules/rule/stock/supervision/currency/t20240412_606839.html
  - 本地：`/standards/szse-guideline-no17-sustainability-report-trial.docx`
  - 起草说明：`/standards/szse-guideline-no17-drafting-notes.docx`
- 北交所：《北京证券交易所上市公司持续监管指引第11号——可持续发展报告（试行）》
  - 官网：https://www.bse.cn/cxjg_list/200021393.html
  - 本地：`/standards/bse-guideline-no11-sustainability-report-trial.docx`
- GRI Standards
  - 官网资源中心：https://www.globalreporting.org/how-to-use-the-gri-standards/resource-center/
  - 简体中文译本入口：https://www.globalreporting.org/how-to-use-the-gri-standards/gri-standards-simplified-chinese-translations/
  - 本地页面快照：`/standards/gri-standards-resource-center.html`、`/standards/gri-standards-simplified-chinese-translations.html`
- ISSB IFRS S1/S2
  - 官网导航器：https://www.ifrs.org/issued-standards/ifrs-sustainability-standards-navigator/
  - 本地页面快照：`/standards/ifrs-sustainability-standards-navigator.html`

说明：沪深北交易所标准已下载官方 DOCX 原文。GRI 和 IFRS 官方站点通过资源中心/导航器提供标准访问，当前 MVP 保存官方页面快照和资源入口；如需完整 GRI ZIP 或 IFRS S1/S2 正文文件，可在后续版本接入官方下载流程、账号授权或人工上传标准库。

## 文件目录结构

```text
.
├── README.md
├── package.json
├── next.config.ts
├── tailwind.config.ts
├── postcss.config.js
├── tsconfig.json
├── supabase
│   └── migrations
│       └── 202606170001_esg_copilot_pilot_schema.sql
├── public
│   └── standards
│       ├── bse-guideline-no11-sustainability-report-trial.docx
│       ├── gri-standards-resource-center.html
│       ├── gri-standards-simplified-chinese-translations.html
│       ├── ifrs-sustainability-standards-navigator.html
│       ├── sse-guideline-no14-sustainability-report-trial.docx
│       ├── szse-guideline-no17-drafting-notes.docx
│       └── szse-guideline-no17-sustainability-report-trial.docx
└── src
    ├── app
    │   ├── api/esg
    │   │   ├── classify/route.ts
    │   │   ├── disclosure-checklist/route.ts
    │   │   ├── documents/parse/route.ts
    │   │   ├── export-word/route.ts
    │   │   ├── indicator-index/route.ts
    │   │   ├── projects/route.ts
    │   │   ├── projects/[id]/route.ts
    │   │   ├── projects/[id]/checklist/[itemId]/route.ts
    │   │   ├── projects/[id]/documents/route.ts
    │   │   ├── projects/[id]/documents/[documentId]/parse/route.ts
    │   │   ├── projects/[id]/export-word/route.ts
    │   │   ├── projects/[id]/generate-checklist/route.ts
    │   │   ├── projects/[id]/generate-report/route.ts
    │   │   ├── projects/[id]/indicator-index/route.ts
    │   │   ├── projects/[id]/risk-check/route.ts
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
    │   ├── ParsedEvidencePanel.tsx
    │   ├── ReadinessScoreCard.tsx
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
    │   │   ├── standardClauses.ts
    │   │   ├── standards.ts
    │   │   └── topicMappings.ts
    │   ├── apiClient.ts
    │   ├── apiAuth.ts
    │   ├── esg/readinessScore.ts
    │   ├── export.ts
    │   └── utils.ts
    ├── services
    │   ├── aiService.ts
    │   ├── documentParserService.ts
    │   ├── llmService.ts
    │   ├── projectStore.ts
    │   ├── supabaseServer.ts
    │   └── wordExportService.ts
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

## Supabase 持久化配置

未配置 Supabase 时，项目会自动使用内存 fallback，适合本地演示。客户试点时建议配置：

```bash
NEXT_PUBLIC_SUPABASE_URL=...
SUPABASE_SERVICE_ROLE_KEY=...
SUPABASE_STORAGE_BUCKET=esg-documents
```

初始化数据库：

```bash
supabase db push
```

或在 Supabase SQL Editor 中执行：

```text
supabase/migrations/202606170001_esg_copilot_pilot_schema.sql
```

说明：当前服务端使用 service role 访问数据库和 Storage；RLS 默认只允许 service role 全量操作。前端权限第一版通过项目 API 的角色控制实现，`viewer` 不能上传、编辑、生成或导出。

## 如何接入真实大模型 API

当前 ESG 工作流编排集中在：

```text
src/services/aiService.ts
```

真实模型接入边界集中在：

```text
src/services/llmService.ts
```

保留的工作流函数签名：

```ts
classifyFiles(files)
generateDisclosureChecklist(files, selectedStandardIds, parsedDocuments)
generateReportDraft(files, checklist)
checkReportRisks(reportDraft, checklist)
generateIndicatorIndex(reportDraft, checklist)
```

当前已实现 OpenAI-compatible adapter。配置以下环境变量后，项目级报告生成会优先调用真实模型，失败或未配置时自动回退到 mock 模板：

```bash
OPENAI_API_KEY=...
OPENAI_BASE_URL=https://api.openai.com/v1
OPENAI_MODEL=gpt-4o-mini
```

也可以将 `OPENAI_BASE_URL` 指向 Azure OpenAI、私有网关或国内 OpenAI-compatible 服务。模型输出要求为 JSON，并通过 `zod` 校验；报告生成必须引用 EvidenceChunk，没有证据时只能输出“待补充”或审慎表述。

推荐拆分方向：

- `services/documentParserService.ts`：解析 PDF、Word、Excel、PPT、TXT、Markdown
- `services/retrievalService.ts`：证据片段检索和引用
- `services/llmService.ts`：OpenAI-compatible LLM 网关
- `services/esgWorkflowService.ts`：编排分类、清单、报告、风险和导出
- `lib/esg/standards.ts`：维护披露标准元数据、官网来源和本地原文路径
- `lib/esg/disclosureStandardItems.ts`：维护标准条目结构化摘要、证据类型、建议指标和责任部门
- `lib/esg/topicMappings.ts`：维护跨标准统一议题映射，用于综合模式去重

## 数据库设计

当前 Supabase migration 已包含这些核心表：

- `companies`
- `projects`
- `project_members`
- `standard_sources`
- `standard_clauses`
- `uploaded_files`
- `parsed_documents`
- `evidence_chunks`
- `disclosure_items`
- `report_sections`
- `risk_findings`
- `indicator_indexes`

建议后续增加：

- 用户维度：`users`、企业组织、邀请记录
- 更细证据定位：`document_pages`、OCR 坐标、表格单元格坐标
- 审阅流：`review_comments`、`approval_logs`

## 后续可扩展功能

- 扫描件 PDF OCR 解析
- 企业 ESG 数据台账
- 碳排放自动计算
- 更完整权限管理和企业成员邀请
- 多企业项目看板
- PDF 正式导出
- 中英文双语报告
- ESG 评级差距分析
- 供应链 ESG 问卷自动回复

## 当前限制

- 已支持 DOCX / XLSX / PPTX / TXT / Markdown / CSV / 文本型 PDF 的基础文本解析，但复杂样式、图片、批注、扫描件和 OCR 尚未处理。
- 已实现 OpenAI-compatible LLM adapter；未配置 `OPENAI_API_KEY` 或模型返回不合格时会自动 fallback 到本地模板。
- Supabase 未配置时会使用内存 fallback；客户试点需要配置 Supabase 环境变量并执行 migration。
- 披露清单已引入 GRI Lite、ISSB Lite 和沪深北交易所指引 Lite 的结构化映射；Lite 标准只包含 MVP 演示所需的代表性条目，不等同于完整标准文本。
- 虽然 UI 已提供官网和本地原文入口，正式披露前仍需由专业人员逐条对照标准原文、监管适用范围和企业业务边界复核。
- 已支持 Word 工作底稿导出，但仍不是正式排版报告模板；PDF 正式导出暂未实现。
- 报告初稿不会编造具体 ESG 指标数值、奖项、评级、处罚或认证；缺失议题会提示后续完善数据统计和管理机制。
- 风险校验为规则模拟，用于展示产品交互和未来真实合规模型接入方式。
