import type { DisclosureItem, EvidenceSnippet, LLMGenerationResult, LLMProviderType, RiskFinding } from "@/types/esg";

export interface ReportParagraphInput {
  title: string;
  coveredTopics: string[];
  missingTopics: string[];
  evidenceSnippets: EvidenceSnippet[];
  fallbackText: string;
}

function activeProvider(): LLMProviderType {
  if (process.env.ANTHROPIC_API_KEY) return "anthropic";
  if (process.env.OPENAI_API_KEY) return "openai";
  if (process.env.PRIVATE_LLM_ENDPOINT) return "private";
  return "mock";
}

function mockResult<T>(data: T, warnings: string[] = []): LLMGenerationResult<T> {
  const provider = activeProvider();

  return {
    provider,
    model: provider === "mock" ? "rule-template-v1" : `${provider}-adapter-placeholder`,
    data,
    fallbackUsed: provider !== "mock",
    warnings:
      provider === "mock"
        ? warnings
        : [
            `${provider} 环境变量已检测到，但当前 MVP 未启用真实 SDK 调用，已回退到 mock 输出。`,
            ...warnings,
          ],
  };
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

export function suggestRiskRewrite(finding: RiskFinding): LLMGenerationResult<string> {
  return mockResult(
    `建议将相关表述改为“公司已开展相关工作，并将持续完善数据统计、证据留存和审阅机制”，同时补充量化指标、统计口径或第三方证明。原风险：${finding.description}`,
  );
}

export function checklistEvidenceWarning(item: DisclosureItem): LLMGenerationResult<string> {
  const evidenceCount = item.evidenceSnippets?.length ?? 0;

  if (evidenceCount === 0) {
    return mockResult(`“${item.topic}”暂无证据片段支撑，应先补充 ${item.missingContent}`);
  }

  return mockResult(`“${item.topic}”已有 ${evidenceCount} 条证据片段，可进入人工复核。`);
}
