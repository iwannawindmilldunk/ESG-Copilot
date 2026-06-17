import { NextResponse } from "next/server";

import type { ProjectRole } from "@/types/esg";

export function roleFromRequest(request: Request): ProjectRole {
  const role = request.headers.get("x-esg-role");
  if (role === "viewer" || role === "editor" || role === "admin") return role;
  return "admin";
}

export function requireEditorRole(request: Request): NextResponse | null {
  return roleFromRequest(request) === "viewer"
    ? NextResponse.json({ message: "只读审阅者无权执行该操作。" }, { status: 403 })
    : null;
}

export function requireAdminRole(request: Request): NextResponse | null {
  return roleFromRequest(request) !== "admin"
    ? NextResponse.json({ message: "仅管理员可执行该操作。" }, { status: 403 })
    : null;
}
