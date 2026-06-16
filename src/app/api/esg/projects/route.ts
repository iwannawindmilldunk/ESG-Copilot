import { NextResponse } from "next/server";

import { createProject } from "@/services/projectStore";
import type { ParsedDocument, UploadedFile } from "@/types/esg";

export async function POST(request: Request) {
  const body = (await request.json()) as {
    name?: string;
    companyName?: string;
    reportingYear?: string;
    selectedStandardIds?: string[];
    uploadedFiles?: UploadedFile[];
    parsedDocuments?: ParsedDocument[];
  };
  const storedProject = createProject(body);

  return NextResponse.json(storedProject);
}
