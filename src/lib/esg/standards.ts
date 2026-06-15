import type { Standard } from "@/types/esg";

export const COMPREHENSIVE_STANDARD_ID = "comprehensive";

export const DISCLOSURE_STANDARDS = [
  {
    id: "cn-exchange-lite",
    name: "国内交易所指引 Lite",
    issuer: "国内证券交易所",
    description: "面向境内上市公司 ESG 披露场景的轻量议题库，覆盖环境、社会与治理重点议题。",
    materialityType: "regulatory",
  },
  {
    id: "gri-lite",
    name: "GRI Standards Lite",
    issuer: "Global Reporting Initiative",
    description: "基于 GRI 常用主题标准抽取的轻量映射，用于影响重要性视角下的披露准备。",
    materialityType: "impact",
  },
  {
    id: "issb-lite",
    name: "ISSB IFRS S1/S2 Lite",
    issuer: "International Sustainability Standards Board",
    description: "基于 IFRS S1/S2 核心披露框架整理的轻量映射，突出财务重要性与气候相关披露。",
    materialityType: "financial",
  },
] satisfies Standard[];

export const ALL_STANDARD_IDS = DISCLOSURE_STANDARDS.map((standard) => standard.id);

export function resolveSelectedStandardIds(selectedStandardIds: string[] = ["cn-exchange-lite"]): string[] {
  const requested = selectedStandardIds.length > 0 ? selectedStandardIds : ["cn-exchange-lite"];

  if (requested.includes(COMPREHENSIVE_STANDARD_ID)) {
    return ALL_STANDARD_IDS;
  }

  const validIds = new Set(ALL_STANDARD_IDS);
  const resolved = requested.filter((id) => validIds.has(id));

  return resolved.length > 0 ? Array.from(new Set(resolved)) : ["cn-exchange-lite"];
}

export function getStandardName(standardId: string): string {
  return DISCLOSURE_STANDARDS.find((standard) => standard.id === standardId)?.name ?? standardId;
}
