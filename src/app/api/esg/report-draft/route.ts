import { NextResponse } from "next/server";

import { generateReportDraft } from "@/services/aiService";
import type { DisclosureItem, UploadedFile } from "@/types/esg";

export async function POST(request: Request) {
  const body = (await request.json()) as { files?: UploadedFile[]; checklist?: DisclosureItem[] };
  const reportDraft = generateReportDraft(body.files ?? [], body.checklist ?? []);

  return NextResponse.json({ reportDraft });
}
