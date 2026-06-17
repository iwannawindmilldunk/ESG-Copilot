import { z } from "zod";

import type { DisclosureItem, EvidenceSnippet, LLMGenerationResult, RiskFinding } from "@/types/esg";

export interface ReportParagraphInput {
  title: string;
  coveredTopics: string[];
  missingTopics: string[];
  evidenceSnippets: EvidenceSnippet[];
  fallbackText: string;
}

const paragraphSchema = z.object({
  content: z.string().min(20).max(1200),
});

const summarySchema = z.object({
  summary: z.string().min(1).max(800),
});

const rewriteSchema = z.object({
  suggestion: z.string().min(10).max(800),
});

function modelName(): string {
  return process.env.OPENAI_MODEL || "gpt-4o-mini";
}

function openAIBaseUrl(): string {
  return (process.env.OPENAI_BASE_URL || "https://api.openai.com/v1").replace(/\/$/, "");
}

function isOpenAICompatibleConfigured(): boolean {
  return Boolean(process.env.OPENAI_API_KEY);
}

function mockResult<T>(data: T, warnings: string[] = []): LLMGenerationResult<T> {
  return {
    provider: "mock",
    model: "rule-template-v1",
    data,
    fallbackUsed: false,
    warnings,
  };
}

function fallbackFromError<T>(data: T, error: unknown): LLMGenerationResult<T> {
  const message = error instanceof Error ? error.message : "未知模型调用错误";
  return {
    provider: "openai-compatible",
    model: modelName(),
    data,
    fallbackUsed: true,
    warnings: [`真实模型调用失败，已回退到 mock 输出：${message}`],
  };
}

async function callOpenAIJson<T>(
  schema: z.ZodType<T>,
  prompt: {
    system: string;
    user: string;
  },
  fallback: T,
): Promise<LLMGenerationResult<T>> {
  if (!isOpenAICompatibleConfigured()) {
    return mockResult(fallback);
  }

  try {
    const response = await fetch(`${openAIBaseUrl()}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: modelName(),
        temperature: 0.2,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: prompt.system },
          { role: "user", content: prompt.user },
        ],
      }),
    });

    if (!response.ok) {
      throw new Error(await response.text());
    }

    const payload = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const content = payload.choices?.[0]?.message?.content;
    if (!content) {
      throw new Error("模型未返回 JSON 内容。");
    }

    return {
      provider: "openai-compatible",
      model: modelName(),
      data: schema.parse(JSON.parse(content)),
      fallbackUsed: false,
      warnings: [],
    };
  } catch (error) {
    return fallbackFromError(fallback, error);
  }
}

export function summarizeEvidenceSnippets(snippets: EvidenceSnippet[]): LLMGenerationResult<string> {
  if (snippets.length === 0) {
    return mockResult("暂无可引用证据片段。");
  }

  const summary = snippets
    .slice(0, 3)
    .map((snippet) => `${snippet.fileName} ${snippet.locationLabel}：${snippet.text.slice(0, 80)}`)
    .join("；");

  return mockResult(summary);
}

export async function summarizeEvidenceSnippetsWithLLM(snippets: EvidenceSnippet[]): Promise<LLMGenerationResult<string>> {
  const fallback = summarizeEvidenceSnippets(snippets).data;

  const result = await callOpenAIJson(
    summarySchema,
    {
      system:
        "你是 ESG 报告证据归纳助手。只能基于用户提供的证据片段归纳，不得编造数字、奖项、评级、认证或处罚结论。输出 JSON：{\"summary\":\"...\"}。",
      user: JSON.stringify({ evidenceSnippets: snippets.slice(0, 8) }),
    },
    { summary: fallback },
  );

  return {
    ...result,
    data: result.data.summary,
  };
}

export function generateEvidenceBoundParagraph(input: ReportParagraphInput): LLMGenerationResult<string> {
  if (input.evidenceSnippets.length === 0) {
    return mockResult(input.fallbackText, ["未找到证据片段，报告段落保持待补充和审慎表述。"]);
  }

  const evidenceSummary = summarizeEvidenceSnippets(input.evidenceSnippets).data;
  const coveredText = input.coveredTopics.length > 0 ? input.coveredTopics.slice(0, 4).join("、") : "相关议题";
  const missingText =
    input.missingTopics.length > 0
      ? `针对 ${input.missingTopics.slice(0, 3).join("、")}，公司后续将进一步完善相关数据统计和管理机制。`
      : "正式披露前，仍建议补充数据口径、统计边界和内部复核记录。";

  return mockResult(
    `${input.title} 可引用的材料显示，公司已围绕 ${coveredText} 建立基础披露依据。证据摘要：${evidenceSummary}。${missingText}`,
  );
}

export async function generateEvidenceBoundParagraphWithLLM(
  input: ReportParagraphInput,
): Promise<LLMGenerationResult<string>> {
  const fallback = generateEvidenceBoundParagraph(input).data;

  if (input.evidenceSnippets.length === 0) {
    return mockResult(fallback, ["未找到证据片段，报告段落保持待补充和审慎表述。"]);
  }

  const result = await callOpenAIJson(
    paragraphSchema,
    {
      system:
        "你是审慎的 ESG 报告撰写助手。必须只基于证据片段写中文段落；缺少证据时写待补充；不得编造具体数值、认证、评级、处罚、行业领先或绝对化结论。输出 JSON：{\"content\":\"...\"}。",
      user: JSON.stringify(input),
    },
    { content: fallback },
  );

  return {
    ...result,
    data: result.data.content,
  };
}

export function suggestRiskRewrite(finding: RiskFinding): LLMGenerationResult<string> {
  return mockResult(
    `建议将相关表述改为“公司已开展相关工作，并将持续完善数据统计、证据留存和审阅机制”，同时补充量化指标、统计口径或第三方证明。原风险：${finding.description}`,
  );
}

export async function suggestRiskRewriteWithLLM(finding: RiskFinding): Promise<LLMGenerationResult<string>> {
  const fallback = suggestRiskRewrite(finding).data;
  const result = await callOpenAIJson(
    rewriteSchema,
    {
      system:
        "你是 ESG 合规审阅助手。请给出更审慎、可落地的中文修改建议，不得新增未经证明的事实。输出 JSON：{\"suggestion\":\"...\"}。",
      user: JSON.stringify(finding),
    },
    { suggestion: fallback },
  );

  return {
    ...result,
    data: result.data.suggestion,
  };
}

export function checklistEvidenceWarning(item: DisclosureItem): LLMGenerationResult<string> {
  const evidenceCount = item.evidenceSnippets?.length ?? 0;

  if (evidenceCount === 0) {
    return mockResult(`“${item.topic}”暂无证据片段支撑，应先补充 ${item.missingContent}`);
  }

  return mockResult(`“${item.topic}”已有 ${evidenceCount} 条证据片段，可进入人工复核。`);
}
