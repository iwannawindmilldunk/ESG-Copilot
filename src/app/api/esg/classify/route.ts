import { NextResponse } from "next/server";

import { classifyFiles } from "@/services/aiService";
import type { ClassifiableFile } from "@/types/esg";

export async function POST(request: Request) {
  const body = (await request.json()) as { files?: ClassifiableFile[] };
  const files = classifyFiles(body.files ?? []);

  return NextResponse.json({ files });
}
