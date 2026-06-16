import { NextResponse } from "next/server";

import { generateProjectReport } from "@/services/projectStore";

type ProjectRouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(_request: Request, context: ProjectRouteContext) {
  const { id } = await context.params;
  const storedProject = generateProjectReport(id);

  if (!storedProject) {
    return NextResponse.json({ message: "项目不存在或内存数据已重置。" }, { status: 404 });
  }

  return NextResponse.json(storedProject);
}
