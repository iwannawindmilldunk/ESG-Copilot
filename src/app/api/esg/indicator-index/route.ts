import { NextResponse } from "next/server";

import { generateIndicatorIndex } from "@/services/aiService";
import type { DisclosureItem, ReportSection } from "@/types/esg";

export async function POST(request: Request) {
  const body = (await request.json()) as { reportDraft?: ReportSection[]; checklist?: DisclosureItem[] };
  const indicatorIndex = generateIndicatorIndex(body.reportDraft ?? [], body.checklist ?? []);

  return NextResponse.json({ indicatorIndex });
}
