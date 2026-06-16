import type { Standard, StandardSource } from "@/types/esg";

export const COMPREHENSIVE_STANDARD_ID = "comprehensive";

export const DISCLOSURE_STANDARDS = [
  {
    id: "cn-exchange-lite",
    name: "沪深北交易所可持续发展报告指引 Lite",
    issuer: "上交所 / 深交所 / 北交所",
    description:
      "基于沪深北交易所可持续发展报告指引原文整理的轻量议题库，覆盖强制/鼓励披露场景下的环境、社会与治理重点议题。",
    materialityType: "regulatory",
    groundingNote: "已下载沪深北交易所官方 DOCX 原文；清单中的 CN 条目按交易所指引的重要议题和环境信息披露要求映射。",
    sources: [
      {
        id: "sse-no14",
        label: "上交所第14号可持续发展报告指引（试行）",
        issuer: "上海证券交易所",
        sourceType: "official-document",
        officialUrl:
          "https://www.sse.com.cn/lawandrules/sselawsrules2025/stocks/mainipo/c/c_20250516_10779150.shtml",
        localPath: "/standards/sse-guideline-no14-sustainability-report-trial.docx",
        language: "zh-CN",
        publishedDate: "2024-04-12",
        effectiveDate: "2024-05-01",
        downloadedAt: "2026-06-16",
        note: "上交所官网现行有效规则页面及附件原文。",
      },
      {
        id: "szse-no17",
        label: "深交所第17号可持续发展报告指引（试行）",
        issuer: "深圳证券交易所",
        sourceType: "official-document",
        officialUrl: "https://www.szse.cn/lawrules/rule/stock/supervision/currency/t20240412_606839.html",
        localPath: "/standards/szse-guideline-no17-sustainability-report-trial.docx",
        language: "zh-CN",
        publishedDate: "2024-04-12",
        effectiveDate: "2024-05-01",
        downloadedAt: "2026-06-16",
        note: "深交所官网通知页附件原文，另保留起草说明 DOCX。",
      },
      {
        id: "bse-no11",
        label: "北交所第11号可持续发展报告指引（试行）",
        issuer: "北京证券交易所",
        sourceType: "official-document",
        officialUrl: "https://www.bse.cn/cxjg_list/200021393.html",
        localPath: "/standards/bse-guideline-no11-sustainability-report-trial.docx",
        language: "zh-CN",
        publishedDate: "2024-04-12",
        effectiveDate: "2024-05-01",
        downloadedAt: "2026-06-16",
        note: "北交所官网公告页及附件原文。",
      },
      {
        id: "szse-no17-notes",
        label: "深交所第17号起草说明",
        issuer: "深圳证券交易所",
        sourceType: "official-document",
        officialUrl: "https://www.szse.cn/lawrules/rule/stock/supervision/currency/t20240412_606839.html",
        localPath: "/standards/szse-guideline-no17-drafting-notes.docx",
        language: "zh-CN",
        publishedDate: "2024-04-12",
        effectiveDate: "2024-05-01",
        downloadedAt: "2026-06-16",
        note: "用于理解规则起草背景，不作为独立披露标准。",
      },
    ],
  },
  {
    id: "gri-lite",
    name: "GRI Standards Lite",
    issuer: "Global Reporting Initiative",
    description: "基于 GRI 官方资源中心中常用主题标准整理的轻量映射，用于影响重要性视角下的披露准备。",
    materialityType: "impact",
    groundingNote:
      "已保存 GRI 官方资源中心和简体中文译本入口快照；资源中心中可定位 GRI 1/2/3、主题标准和 Full set of GRI Standards 的官方资源 ID。",
    sources: [
      {
        id: "gri-resource-center",
        label: "GRI Standards Resource Center",
        issuer: "Global Reporting Initiative",
        sourceType: "official-resource-page",
        officialUrl: "https://www.globalreporting.org/how-to-use-the-gri-standards/resource-center/",
        localPath: "/standards/gri-standards-resource-center.html",
        language: "multi",
        downloadedAt: "2026-06-16",
        note: "官方标准资源中心页面快照；完整 ZIP/PDF 需通过 GRI 官方资源下载流程获取。",
      },
      {
        id: "gri-simplified-chinese",
        label: "GRI Standards Simplified Chinese Translations",
        issuer: "Global Reporting Initiative",
        sourceType: "official-resource-page",
        officialUrl:
          "https://www.globalreporting.org/how-to-use-the-gri-standards/gri-standards-simplified-chinese-translations/",
        localPath: "/standards/gri-standards-simplified-chinese-translations.html",
        language: "zh-CN",
        downloadedAt: "2026-06-16",
        note: "GRI 官方简体中文译本入口页面快照。",
      },
    ],
  },
  {
    id: "issb-lite",
    name: "ISSB IFRS S1/S2 Lite",
    issuer: "International Sustainability Standards Board",
    description: "基于 IFRS S1/S2 核心披露框架整理的轻量映射，突出财务重要性与气候相关披露。",
    materialityType: "financial",
    groundingNote:
      "已保存 IFRS 官方 Sustainability Standards Navigator 页面快照；IFRS S1/S2 原文通过 IFRS 官方导航器访问。",
    sources: [
      {
        id: "ifrs-sustainability-navigator",
        label: "IFRS Sustainability Standards Navigator",
        issuer: "IFRS Foundation / ISSB",
        sourceType: "official-navigator",
        officialUrl: "https://www.ifrs.org/issued-standards/ifrs-sustainability-standards-navigator/",
        localPath: "/standards/ifrs-sustainability-standards-navigator.html",
        language: "en",
        publishedDate: "2023-06-26",
        downloadedAt: "2026-06-16",
        note: "IFRS 官方可持续披露准则导航器页面快照；IFRS S1/S2 原文以官方导航器为准。",
      },
    ],
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

export function getStandardById(standardId: string): Standard | undefined {
  return DISCLOSURE_STANDARDS.find((standard) => standard.id === standardId);
}

export function getStandardSources(standardId: string): StandardSource[] {
  return getStandardById(standardId)?.sources ?? [];
}

export function getStandardSourceLinks(standardId: string): Array<Pick<StandardSource, "label" | "officialUrl" | "localPath">> {
  return getStandardSources(standardId).map((source) => ({
    label: source.label,
    officialUrl: source.officialUrl,
    localPath: source.localPath,
  }));
}
