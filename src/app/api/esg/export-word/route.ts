import { snapshotToWordBuffer } from "@/services/wordExportService";
import type { ESGProjectSnapshot } from "@/types/esg";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const snapshot = (await request.json()) as ESGProjectSnapshot;
  const buffer = await snapshotToWordBuffer(snapshot);

  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "Content-Disposition": 'attachment; filename="esg-report-workpaper.docx"',
    },
  });
}
