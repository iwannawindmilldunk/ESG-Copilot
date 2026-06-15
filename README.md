# AI ESG 报告生成与合规校验平台 MVP

这是一个基于 **Next.js + React + TypeScript + Tailwind CSS** 的网页 MVP，用于模拟企业 ESG 报告生成、披露清单管理、风险校验和指标索引表生成流程。

当前版本优先实现完整可交互工作流，AI 能力使用 mock 规则和模板模拟，代码结构已预留真实大模型 API、文件解析和数据库持久化接入位置。

## 项目定位

目标用户包括国内企业、ESG 咨询公司、上市公司和拟上市公司。平台希望将 ESG 报告准备过程中重复度较高的工作结构化：

- 上传企业资料并识别资料类别
- 自动生成 ESG 披露清单
- 自动生成报告初稿
- 自动识别缺失数据和高风险表述
- 自动生成指标索引表
- 支持证据链追溯和后续审阅
- 评估 ESG 披露准备度并给出下一步补充材料建议

## 当前 MVP 功能

- Landing Page：展示产品定位、核心能力和入口按钮
- Workspace 五步流程：
  - Step 1：上传 PDF / Word / Excel / PPT / TXT / Markdown 文件，或加载示例企业资料，并基于文件名 mock 分类
  - Step 2：生成 E/S/G 披露清单，并展示 ESG 披露准备度评分
  - Step 3：生成中文 ESG 报告初稿，按章节展示相关披露议题、依据材料和置信度
  - Step 4：执行增强 mock 风险校验，识别夸大表述、证据缺失、量化数据缺失、高风险披露缺口和数据一致性提醒
  - Step 5：生成指标索引表，复制正文，导出 Markdown / JSON / CSV
- 证据链追溯：
  - 报告章节包含 `evidenceFileIds`、`evidenceNotes` 和 `confidenceLevel`
  - 系统根据文件分类和文件名关键词为环境、社会、治理、供应链、数据安全等内容绑定支撑材料
  - 资料不足时使用“后续将进一步完善相关数据统计和披露机制”等审慎表述
- 报告章节置信度：
  - 根据章节证据数量、相关披露议题状态和高风险缺失项综合判断为“高 / 中 / 低”
- ESG 披露准备度评分：
  - 已覆盖 = 100，部分覆盖 = 50，缺失 = 0
  - 输出总分、E/S/G 分数、覆盖统计、高风险缺失项和建议补充材料
- 示例项目 Demo：
  - 一键加载员工培训、董事会治理、反商业贿赂、用电用水、供应商、公益、安全生产、客户投诉、数据安全等示例资料
  - 加载后仅自动分类并展示文件，不会自动生成披露清单
- 导出能力：
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
    │   ├── ReadinessScoreCard.tsx
    │   ├── ReportDraftViewer.tsx
    │   ├── RiskCheckPanel.tsx
    │   ├── StatusBadge.tsx
    │   ├── Stepper.tsx
    │   └── UploadedFileList.tsx
    ├── data
    │   └── disclosureTopics.ts
    ├── lib
    │   ├── apiClient.ts
    │   ├── esg/readinessScore.ts
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

当前 mock AI 逻辑集中在：

```text
src/services/aiService.ts
```

保留的函数签名：

```ts
classifyFiles(files)
generateDisclosureChecklist(files)
generateReportDraft(files, checklist)
checkReportRisks(reportDraft, checklist)
generateIndicatorIndex(reportDraft, checklist)
```

后续接入 OpenAI / Anthropic / 私有大模型时，建议保持这些函数签名不变，在函数内部替换为真实 API 调用：

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

## 当前限制

- 尚未真实解析文件内容。浏览器只发送文件名、类型、大小和上传时间用于 mock 分类。
- 尚未接入真实大模型 API。报告、风险和索引均由本地规则与模板模拟生成。
- 披露清单仍是 MVP 规则逻辑，尚未引入 GRI / ISSB / 国内交易所标准映射。
- 暂不支持正式 Word/PDF 导出。
- 报告初稿不会编造具体 ESG 指标数值、奖项、评级、处罚或认证；缺失议题会提示后续完善数据统计和管理机制。
- 风险校验为规则模拟，用于展示产品交互和未来真实合规模型接入方式。
