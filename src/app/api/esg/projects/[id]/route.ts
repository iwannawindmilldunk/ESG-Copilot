import { NextResponse } from "next/server";

import { requireEditorRole } from "@/lib/apiAuth";
import { getProject, patchProject } from "@/services/projectStore";
import type { ProjectStatus } from "@/types/esg";

type ProjectRouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(_request: Request, context: ProjectRouteContext) {
  const { id } = await context.params;
  const storedProject = await getProject(id);

  if (!storedProject) {
    return NextResponse.json({ message: "项目不存在或内存数据已重置。" }, { status: 404 });
  }

  return NextResponse.json(storedProject);
}

export async function PATCH(request: Request, context: ProjectRouteContext) {
  const forbidden = requireEditorRole(request);
  if (forbidden) return forbidden;

  const { id } = await context.params;
  const body = (await request.json()) as {
    name?: string;
    companyName?: string;
    reportingYear?: string;
    selectedStandardIds?: string[];
    status?: ProjectStatus;
  };
  const storedProject = await patchProject(id, body);

  if (!storedProject) {
    return NextResponse.json({ message: "项目不存在或内存数据已重置。" }, { status: 404 });
  }

  return NextResponse.json(storedProject);
}
