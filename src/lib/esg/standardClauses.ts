import { DISCLOSURE_STANDARD_ITEMS } from "@/lib/esg/disclosureStandardItems";
import { getStandardName, getStandardSourceLinks, getStandardSources } from "@/lib/esg/standards";
import type { DisclosureStandardItem, StandardClause } from "@/types/esg";

function sourceIdForItem(item: DisclosureStandardItem): string | undefined {
  const sources = getStandardSources(item.standardId);

  if (sources.length === 0) {
    return undefined;
  }

  if (item.standardId === "cn-exchange-lite") {
    return "sse-no14";
  }

  return sources[0]?.id;
}

function sourceLabelForItem(item: DisclosureStandardItem): string | undefined {
  const sourceId = sourceIdForItem(item);
  return getStandardSources(item.standardId).find((source) => source.id === sourceId)?.label;
}

function chapterForItem(item: DisclosureStandardItem): string {
  if (item.standardId === "cn-exchange-lite") {
    return item.category === "E" ? "环境信息披露" : item.category === "S" ? "社会信息披露" : "治理信息披露";
  }

  if (item.standardId === "gri-lite") {
    return `GRI ${item.code.replace("GRI ", "")} 主题标准`;
  }

  if (item.standardId === "issb-lite") {
    return item.code.includes("S2") ? "IFRS S2 气候相关披露" : "IFRS S1 一般要求";
  }

  return item.theme;
}

export const STANDARD_CLAUSES: StandardClause[] = DISCLOSURE_STANDARD_ITEMS.map((item) => ({
  id: `clause-${item.id}`,
  standardId: item.standardId,
  standardName: getStandardName(item.standardId),
  sourceId: sourceIdForItem(item),
  sourceLabel: sourceLabelForItem(item),
  clauseNo: item.code,
  chapter: chapterForItem(item),
  topic: item.title,
  category: item.category,
  requirement: item.requirementSummary,
  applicability: "默认适用于已选择该披露标准且企业存在相关业务、运营、价值链或风险暴露的场景；正式披露前需人工判断适用/不适用。",
  suggestedEvidence: item.requiredEvidenceTypes,
  suggestedMetrics: item.suggestedMetrics,
  suggestedDepartments: item.suggestedDepartments,
  riskLevelIfMissing: item.riskLevelIfMissing,
  sourceReferences: item.sourceReferences ?? [`${item.code} ${item.title}`],
  sourceLinks: getStandardSourceLinks(item.standardId),
}));

export function getStandardClausesByItemIds(itemIds: string[]): StandardClause[] {
  const clauseIds = new Set(itemIds.map((itemId) => `clause-${itemId}`));
  return STANDARD_CLAUSES.filter((clause) => clauseIds.has(clause.id));
}

export function getStandardClauseById(clauseId: string): StandardClause | undefined {
  return STANDARD_CLAUSES.find((clause) => clause.id === clauseId);
}
