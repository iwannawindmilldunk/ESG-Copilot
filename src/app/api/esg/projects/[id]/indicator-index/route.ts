import { NextResponse } from "next/server";

import { requireEditorRole } from "@/lib/apiAuth";
import { generateProjectIndicatorIndex } from "@/services/projectStore";

type ProjectRouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(request: Request, context: ProjectRouteContext) {
  const forbidden = requireEditorRole(request);
  if (forbidden) return forbidden;

  const { id } = await context.params;
  const storedProject = await generateProjectIndicatorIndex(id);

  if (!storedProject) {
    return NextResponse.json({ message: "项目不存在或内存数据已重置。" }, { status: 404 });
  }

  return NextResponse.json(storedProject);
}
