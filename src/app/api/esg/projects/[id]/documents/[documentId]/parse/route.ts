import { NextResponse } from "next/server";

import { requireEditorRole } from "@/lib/apiAuth";
import { parseProjectDocument } from "@/services/projectStore";

export const runtime = "nodejs";

type ProjectDocumentRouteContext = {
  params: Promise<{ id: string; documentId: string }>;
};

export async function POST(_request: Request, context: ProjectDocumentRouteContext) {
  const forbidden = requireEditorRole(_request);
  if (forbidden) return forbidden;

  const { id, documentId } = await context.params;
  const storedProject = await parseProjectDocument(id, documentId);

  if (!storedProject) {
    return NextResponse.json({ message: "项目或文档不存在。" }, { status: 404 });
  }

  return NextResponse.json(storedProject);
}
