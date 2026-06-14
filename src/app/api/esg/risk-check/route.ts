import { NextResponse } from "next/server";

import { checkReportRisks } from "@/services/aiService";
import type { DisclosureItem, ReportSection } from "@/types/esg";

export async function POST(request: Request) {
  const body = (await request.json()) as { reportDraft?: ReportSection[]; checklist?: DisclosureItem[] };
  const riskFindings = checkReportRisks(body.reportDraft ?? [], body.checklist ?? []);

  return NextResponse.json({ riskFindings });
}
