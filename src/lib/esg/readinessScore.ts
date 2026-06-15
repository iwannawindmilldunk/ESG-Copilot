import type { DisclosureItem, ESGCategory, ReadinessScoreResult } from "@/types/esg";

const SCORE_BY_STATUS = {
  已覆盖: 100,
  部分覆盖: 50,
  缺失: 0,
} as const;

function averageScore(items: DisclosureItem[]): number {
  if (items.length === 0) return 0;

  const total = items.reduce((sum, item) => sum + SCORE_BY_STATUS[item.status], 0);
  return Math.round(total / items.length);
}

function categoryScore(checklist: DisclosureItem[], category: ESGCategory): number {
  return averageScore(checklist.filter((item) => item.category === category));
}

function materialSuggestion(item: DisclosureItem): string {
  return `${item.topic}：${item.missingContent || `建议由${item.responsibleDepartment}补充制度、记录或数据台账。`}`;
}

export function calculateReadinessScore(checklist: DisclosureItem[]): ReadinessScoreResult {
  const coveredCount = checklist.filter((item) => item.status === "已覆盖").length;
  const partialCount = checklist.filter((item) => item.status === "部分覆盖").length;
  const missingItems = checklist.filter((item) => item.status === "缺失");
  const highRiskMissingItems = missingItems.filter((item) => item.riskLevel === "高");

  const recommendations = [...highRiskMissingItems, ...missingItems.filter((item) => item.riskLevel !== "高")]
    .map(materialSuggestion)
    .filter((suggestion, index, all) => all.indexOf(suggestion) === index)
    .slice(0, 6);

  return {
    totalScore: averageScore(checklist),
    eScore: categoryScore(checklist, "E"),
    sScore: categoryScore(checklist, "S"),
    gScore: categoryScore(checklist, "G"),
    coveredCount,
    partialCount,
    missingCount: missingItems.length,
    highRiskMissingCount: highRiskMissingItems.length,
    recommendedNextMaterials:
      recommendations.length > 0
        ? recommendations
        : ["当前披露清单暂无缺失项，建议继续补充数据来源、审批记录和证据文件编号。"],
  };
}
