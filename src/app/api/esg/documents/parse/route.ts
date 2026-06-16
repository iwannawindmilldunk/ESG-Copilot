import { NextResponse } from "next/server";

import { classifyFiles } from "@/services/aiService";
import { parseUploadedDocuments } from "@/services/documentParserService";
import type { ClassifiableFile } from "@/types/esg";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const body = (await request.json()) as { files?: ClassifiableFile[] };
  const sourceFiles = body.files ?? [];
  const files = classifyFiles(sourceFiles);
  const parsedDocuments = await parseUploadedDocuments(files, sourceFiles);

  return NextResponse.json({ files, parsedDocuments });
}
