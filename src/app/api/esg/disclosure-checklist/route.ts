import { NextResponse } from "next/server";

import { generateDisclosureChecklist } from "@/services/aiService";
import type { UploadedFile } from "@/types/esg";

export async function POST(request: Request) {
  const body = (await request.json()) as { files?: UploadedFile[]; selectedStandardIds?: string[] };
  const checklist = generateDisclosureChecklist(body.files ?? [], body.selectedStandardIds ?? []);

  return NextResponse.json({ checklist });
}
