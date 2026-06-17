import { NextResponse } from "next/server";

import { requireEditorRole } from "@/lib/apiAuth";
import { getProject, patchProject } from "@/services/projectStore";
import { snapshotToWordBuffer } from "@/services/wordExportService";

export const runtime = "nodejs";

type ProjectRouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(_request: Request, context: ProjectRouteContext) {
  const forbidden = requireEditorRole(_request);
  if (forbidden) return forbidden;

  const { id } = await context.params;
  const storedProject = await getProject(id);

  if (!storedProject) {
    return NextResponse.json({ message: "项目不存在或内存数据已重置。" }, { status: 404 });
  }

  const buffer = await snapshotToWordBuffer(storedProject.snapshot);
  await patchProject(id, { status: "exported" });

  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "Content-Disposition": `attachment; filename="${storedProject.project.id}.docx"`,
    },
  });
}
