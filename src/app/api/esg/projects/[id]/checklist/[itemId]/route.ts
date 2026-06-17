import { NextResponse } from "next/server";

import { requireEditorRole } from "@/lib/apiAuth";
import { updateChecklistItem } from "@/services/projectStore";
import type { DisclosureItem } from "@/types/esg";

type ProjectChecklistRouteContext = {
  params: Promise<{ id: string; itemId: string }>;
};

export async function PATCH(request: Request, context: ProjectChecklistRouteContext) {
  const forbidden = requireEditorRole(request);
  if (forbidden) return forbidden;

  const { id, itemId } = await context.params;
  const body = (await request.json()) as Partial<DisclosureItem>;
  const storedProject = await updateChecklistItem(id, itemId, body);

  if (!storedProject) {
    return NextResponse.json({ message: "项目或清单项不存在。" }, { status: 404 });
  }

  return NextResponse.json(storedProject);
}
