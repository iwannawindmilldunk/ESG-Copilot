import JSZip from "jszip";
import ExcelJS from "exceljs";

import type {
  ClassifiableFile,
  DocumentCategory,
  EvidenceChunk,
  EvidenceLocationType,
  ParsedDocument,
  ParserStatus,
  UploadedFile,
} from "@/types/esg";

const MAX_CHUNK_LENGTH = 900;

const KEYWORD_BY_CATEGORY: Record<DocumentCategory, string[]> = {
  公司概况: ["公司", "主营业务", "组织架构", "发展历程", "战略", "业务"],
  公司治理: ["董事会", "治理", "股东", "委员会", "独立董事", "章程", "监督"],
  环境数据: ["能源", "用电", "用水", "碳", "温室气体", "排放", "废弃物", "环保", "节能"],
  员工与社会责任: ["员工", "培训", "薪酬", "福利", "安全", "公益", "社区", "职业健康"],
  供应链管理: ["供应商", "采购", "供应链", "准入", "评估", "整改"],
  合规与风控: ["合规", "风控", "风险", "反腐败", "举报", "内控", "审计", "隐私", "数据安全"],
  "财务/业务数据": ["收入", "营收", "利润", "财务", "经营", "客户", "研发", "投入"],
  其他: [],
};

function createId(prefix: string): string {
  const random = globalThis.crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2);
  return `${prefix}_${random}`;
}

function normalizeFileExtension(fileName: string): string {
  return fileName.split(".").pop()?.toLowerCase() ?? "";
}

function sourceFileKey(file: Pick<ClassifiableFile, "name" | "size">): string {
  return `${file.name}:${file.size}`;
}

function bufferFromBase64(contentBase64?: string): Buffer | null {
  if (!contentBase64) return null;
  const normalized = contentBase64.includes(",") ? contentBase64.split(",").at(-1) ?? "" : contentBase64;
  return Buffer.from(normalized, "base64");
}

function stripXml(value: string): string {
  return value
    .replace(/<a:t[^>]*>/g, " ")
    .replace(/<\/a:t>/g, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

function cleanText(text: string): string {
  return text.replace(/\u0000/g, "").replace(/\r\n/g, "\n").replace(/[ \t]+/g, " ").trim();
}

function splitText(text: string): string[] {
  const cleaned = cleanText(text);
  if (!cleaned) return [];

  const paragraphs = cleaned
    .split(/\n{2,}|\n(?=\S)/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);
  const source = paragraphs.length > 0 ? paragraphs : [cleaned];
  const chunks: string[] = [];

  source.forEach((paragraph) => {
    if (paragraph.length <= MAX_CHUNK_LENGTH) {
      chunks.push(paragraph);
      return;
    }

    for (let index = 0; index < paragraph.length; index += MAX_CHUNK_LENGTH) {
      chunks.push(paragraph.slice(index, index + MAX_CHUNK_LENGTH));
    }
  });

  return chunks;
}

function keywordsForText(text: string, category: DocumentCategory): string[] {
  const baseKeywords = KEYWORD_BY_CATEGORY[category];
  return baseKeywords.filter((keyword) => text.includes(keyword));
}

function makeChunk(params: {
  documentId: string;
  file: UploadedFile;
  locationType: EvidenceLocationType;
  locationLabel: string;
  text: string;
  tableContext?: string;
}): EvidenceChunk {
  return {
    id: createId("chunk"),
    documentId: params.documentId,
    fileId: params.file.id,
    fileName: params.file.name,
    fileType: params.file.type,
    category: params.file.category,
    locationType: params.locationType,
    locationLabel: params.locationLabel,
    text: cleanText(params.text),
    tableContext: params.tableContext,
    keywords: keywordsForText(params.text, params.file.category),
    createdAt: new Date().toISOString(),
  };
}

function makeTextChunks(documentId: string, file: UploadedFile, text: string, locationPrefix = "段落"): EvidenceChunk[] {
  return splitText(text).map((chunkText, index) =>
    makeChunk({
      documentId,
      file,
      locationType: "paragraph",
      locationLabel: `${locationPrefix} ${index + 1}`,
      text: chunkText,
    }),
  );
}

function makeFallbackDocument(file: UploadedFile, status: ParserStatus, message: string): ParsedDocument {
  const documentId = createId("doc");
  const chunk = makeChunk({
    documentId,
    file,
    locationType: "metadata",
    locationLabel: "文件元数据",
    text: `${file.name}；资料类别：${file.category}；文件类型：${file.type}。${message}`,
  });

  return {
    id: documentId,
    fileId: file.id,
    fileName: file.name,
    fileType: file.type,
    category: file.category,
    parserStatus: status,
    parserMessages: [message],
    chunks: [chunk],
    metadata: { textLength: chunk.text.length },
  };
}

async function parseDocx(documentId: string, file: UploadedFile, buffer: Buffer): Promise<ParsedDocument> {
  const mammoth = await import("mammoth");
  const result = await mammoth.extractRawText({ buffer });
  const chunks = makeTextChunks(documentId, file, result.value, "段落");

  return {
    id: documentId,
    fileId: file.id,
    fileName: file.name,
    fileType: file.type,
    category: file.category,
    parserStatus: chunks.length > 0 ? "parsed" : "partial",
    parserMessages:
      result.messages.length > 0
        ? result.messages.map((message) => message.message)
        : ["DOCX 正文已提取，复杂样式和批注未纳入 MVP 解析。"],
    chunks,
    metadata: { textLength: result.value.length },
  };
}

function cellToText(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") return String(value);
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  if (typeof value === "object") {
    const record = value as Record<string, unknown>;
    if (typeof record.text === "string") return record.text;
    if (Array.isArray(record.richText)) {
      return record.richText
        .map((item) => (typeof item === "object" && item && "text" in item ? String((item as { text?: unknown }).text ?? "") : ""))
        .join("");
    }
    if ("result" in record) return cellToText(record.result);
    if ("formula" in record) return cellToText(record.formula);
  }

  return String(value);
}

async function parseSpreadsheet(documentId: string, file: UploadedFile, buffer: Buffer): Promise<ParsedDocument> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer as unknown as ExcelJS.Buffer);
  const sheetNames = workbook.worksheets.map((worksheet) => worksheet.name);
  const chunks = workbook.worksheets.flatMap((worksheet) => {
    const rows: string[] = [];

    worksheet.eachRow({ includeEmpty: false }, (row) => {
      const values = Array.isArray(row.values) ? row.values.slice(1) : Object.values(row.values);
      const text = values.map(cellToText).filter((cell) => cell.trim() !== "").join("\t");
      if (text) rows.push(text);
    });

    return splitText(rows.join("\n")).map((chunkText, index) =>
      makeChunk({
        documentId,
        file,
        locationType: "sheet",
        locationLabel: `${worksheet.name}${index > 0 ? ` / 片段 ${index + 1}` : ""}`,
        text: chunkText,
        tableContext: worksheet.name,
      }),
    );
  });

  return {
    id: documentId,
    fileId: file.id,
    fileName: file.name,
    fileType: file.type,
    category: file.category,
    parserStatus: chunks.length > 0 ? "parsed" : "partial",
    parserMessages: ["XLSX 表格已按 Sheet 提取为文本证据片段，公式和单元格样式未纳入 MVP 解析。"],
    chunks,
    metadata: { sheetNames, textLength: chunks.reduce((total, chunk) => total + chunk.text.length, 0) },
  };
}

async function parsePptx(documentId: string, file: UploadedFile, buffer: Buffer): Promise<ParsedDocument> {
  const zip = await JSZip.loadAsync(buffer);
  const slideNames = Object.keys(zip.files)
    .filter((name) => /^ppt\/slides\/slide\d+\.xml$/.test(name))
    .sort((left, right) => left.localeCompare(right, undefined, { numeric: true }));

  const chunks: EvidenceChunk[] = [];

  for (const [index, slideName] of slideNames.entries()) {
    const xml = await zip.file(slideName)?.async("string");
    const text = xml ? stripXml(xml) : "";
    splitText(text).forEach((chunkText, chunkIndex) => {
      chunks.push(
        makeChunk({
          documentId,
          file,
          locationType: "slide",
          locationLabel: `幻灯片 ${index + 1}${chunkIndex > 0 ? ` / 片段 ${chunkIndex + 1}` : ""}`,
          text: chunkText,
        }),
      );
    });
  }

  return {
    id: documentId,
    fileId: file.id,
    fileName: file.name,
    fileType: file.type,
    category: file.category,
    parserStatus: chunks.length > 0 ? "parsed" : "partial",
    parserMessages: ["PPTX 已提取幻灯片文本，图片、图表和备注页未纳入 MVP 解析。"],
    chunks,
    metadata: { slideCount: slideNames.length, textLength: chunks.reduce((total, chunk) => total + chunk.text.length, 0) },
  };
}

async function parsePdf(documentId: string, file: UploadedFile, buffer: Buffer): Promise<ParsedDocument> {
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const loadingTask = pdfjs.getDocument({
    data: new Uint8Array(buffer),
    useSystemFonts: true,
  });
  const pdf = await loadingTask.promise;
  const chunks: EvidenceChunk[] = [];

  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
    const page = await pdf.getPage(pageNumber);
    const textContent = await page.getTextContent();
    const text = textContent.items
      .map((item) => ("str" in item ? item.str : ""))
      .filter(Boolean)
      .join(" ");

    splitText(text).forEach((chunkText, chunkIndex) => {
      chunks.push(
        makeChunk({
          documentId,
          file,
          locationType: "page",
          locationLabel: `第 ${pageNumber} 页${chunkIndex > 0 ? ` / 片段 ${chunkIndex + 1}` : ""}`,
          text: chunkText,
        }),
      );
    });
  }

  return {
    id: documentId,
    fileId: file.id,
    fileName: file.name,
    fileType: file.type,
    category: file.category,
    parserStatus: chunks.length > 0 ? "parsed" : "partial",
    parserMessages:
      chunks.length > 0
        ? ["PDF 已按页提取文本证据片段；扫描件和图片文字需后续接入 OCR。"]
        : ["PDF 未提取到可用文本，可能是扫描件或图片型 PDF，需后续接入 OCR。"],
    chunks:
      chunks.length > 0
        ? chunks
        : [
            makeChunk({
              documentId,
              file,
              locationType: "metadata",
              locationLabel: "PDF 元数据",
              text: `${file.name}；资料类别：${file.category}；未提取到文本，建议补充可复制文本 PDF 或 OCR 结果。`,
            }),
          ],
    metadata: { pageCount: pdf.numPages, textLength: chunks.reduce((total, chunk) => total + chunk.text.length, 0) },
  };
}

function parsePlainText(documentId: string, file: UploadedFile, text: string, message = "文本内容已提取。"): ParsedDocument {
  const chunks = makeTextChunks(documentId, file, text, "段落");

  return {
    id: documentId,
    fileId: file.id,
    fileName: file.name,
    fileType: file.type,
    category: file.category,
    parserStatus: chunks.length > 0 ? "parsed" : "partial",
    parserMessages: [message],
    chunks,
    metadata: { textLength: text.length },
  };
}

async function parseSingleDocument(file: UploadedFile, source?: ClassifiableFile): Promise<ParsedDocument> {
  const documentId = createId("doc");
  const extension = normalizeFileExtension(file.name);
  const buffer = bufferFromBase64(source?.contentBase64);

  if (source?.contentText) {
    return parsePlainText(documentId, file, source.contentText, "浏览器已读取文件文本内容，并生成证据片段。");
  }

  if (!buffer) {
    return makeFallbackDocument(file, "partial", "浏览器未提供文件正文，系统仅记录文件元数据和分类结果。");
  }

  try {
    if (extension === "docx") {
      return await parseDocx(documentId, file, buffer);
    }

    if (["xlsx", "xls", "csv"].includes(extension)) {
      return await parseSpreadsheet(documentId, file, buffer);
    }

    if (extension === "pptx") {
      return await parsePptx(documentId, file, buffer);
    }

    if (["txt", "md"].includes(extension)) {
      return parsePlainText(documentId, file, buffer.toString("utf8"));
    }

    if (extension === "pdf") {
      return await parsePdf(documentId, file, buffer);
    }

    return makeFallbackDocument(file, "unsupported", "该文件类型暂未支持正文解析，已保留元数据作为证据入口。");
  } catch (error) {
    const message = error instanceof Error ? error.message : "未知解析错误";
    return makeFallbackDocument(file, "failed", `文件解析失败：${message}`);
  }
}

export async function parseUploadedDocuments(
  uploadedFiles: UploadedFile[],
  sourceFiles: ClassifiableFile[],
): Promise<ParsedDocument[]> {
  const sourceByKey = new Map(sourceFiles.map((file) => [sourceFileKey(file), file]));

  return Promise.all(
    uploadedFiles.map((uploadedFile) => parseSingleDocument(uploadedFile, sourceByKey.get(sourceFileKey(uploadedFile)))),
  );
}

export function flattenEvidenceChunks(parsedDocuments: ParsedDocument[] = []): EvidenceChunk[] {
  return parsedDocuments.flatMap((document) => document.chunks);
}
