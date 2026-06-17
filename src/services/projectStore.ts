import { DISCLOSURE_STANDARDS } from "@/lib/esg/standards";
import { STANDARD_CLAUSES } from "@/lib/esg/standardClauses";
import {
  checkReportRisks,
  classifyFiles,
  generateDisclosureChecklist,
  generateIndicatorIndex,
  generateReportDraftWithLLM,
} from "@/services/aiService";
import { parseUploadedDocuments } from "@/services/documentParserService";
import { ESG_STORAGE_BUCKET, ensureStorageBucket, getSupabaseServiceClient } from "@/services/supabaseServer";
import type {
  ClassifiableFile,
  DisclosureItem,
  ESGProjectSnapshot,
  ParsedDocument,
  Project,
  ProjectRole,
  ProjectStatus,
  UploadedFile,
} from "@/types/esg";

export interface StoredProject {
  project: Project;
  snapshot: ESGProjectSnapshot;
}

type ProjectPatch = Partial<Pick<Project, "name" | "companyName" | "selectedStandardIds" | "status">> & {
  reportingYear?: string;
};

const memoryStore = globalThis as typeof globalThis & {
  __ESG_COPILOT_PROJECTS__?: Map<string, StoredProject>;
};
const projects = memoryStore.__ESG_COPILOT_PROJECTS__ ?? new Map<string, StoredProject>();
memoryStore.__ESG_COPILOT_PROJECTS__ = projects;
const DEFAULT_OWNER_ID = "00000000-0000-0000-0000-000000000000";

function createId(prefix: string): string {
  const random = globalThis.crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2);
  return `${prefix}_${random}`;
}

function nowIso(): string {
  return new Date().toISOString();
}

function yearPeriod(year: string) {
  return {
    id: createId("period"),
    year,
    startDate: `${year}-01-01`,
    endDate: `${year}-12-31`,
  };
}

function createMemoryProject(input: {
  name?: string;
  companyName?: string;
  reportingYear?: string;
  selectedStandardIds?: string[];
  uploadedFiles?: UploadedFile[];
  parsedDocuments?: ParsedDocument[];
}): StoredProject {
  const now = nowIso();
  const year = input.reportingYear ?? String(new Date().getFullYear());
  const project: Project = {
    id: createId("project"),
    name: input.name ?? `${input.companyName ?? "示例企业"} ${year} ESG 报告项目`,
    companyName: input.companyName ?? "示例企业",
    reportPeriod: yearPeriod(year),
    selectedStandardIds: input.selectedStandardIds ?? ["cn-exchange-lite"],
    ownerUserId: DEFAULT_OWNER_ID,
    members: [{ userId: DEFAULT_OWNER_ID, role: "admin" }],
    status: "draft",
    backendMode: "memory",
    createdAt: now,
    updatedAt: now,
  };

  const snapshot: ESGProjectSnapshot = {
    selectedStandardIds: project.selectedStandardIds,
    uploadedFiles: input.uploadedFiles ?? [],
    parsedDocuments: input.parsedDocuments ?? [],
    disclosureChecklist: [],
    reportDraft: [],
    riskFindings: [],
    indicatorIndex: [],
  };

  const stored = { project, snapshot };
  projects.set(project.id, stored);
  return stored;
}

function sourceFileKey(file: Pick<ClassifiableFile, "name" | "size">): string {
  return `${file.name}:${file.size}`;
}

function fileContentBuffer(file: ClassifiableFile): Buffer | null {
  if (file.contentText) return Buffer.from(file.contentText, "utf8");
  if (!file.contentBase64) return null;
  const normalized = file.contentBase64.includes(",") ? file.contentBase64.split(",").at(-1) ?? "" : file.contentBase64;
  return Buffer.from(normalized, "base64");
}

function sanitizePathPart(value: string): string {
  return value.replace(/[\\/:*?"<>|#%{}^~[\]`]/g, "_").slice(0, 120);
}

function mapProjectRow(row: Record<string, unknown>, members: Array<{ userId: string; role: ProjectRole }>): Project {
  const reportYear = String(row.report_year ?? new Date().getFullYear());
  return {
    id: String(row.id),
    companyId: row.company_id ? String(row.company_id) : undefined,
    name: String(row.name),
    companyName: String(row.company_name),
    reportPeriod: {
      id: `period_${row.id}`,
      year: reportYear,
      startDate: String(row.period_start ?? `${reportYear}-01-01`),
      endDate: String(row.period_end ?? `${reportYear}-12-31`),
    },
    selectedStandardIds: Array.isArray(row.selected_standard_ids)
      ? row.selected_standard_ids.map(String)
      : ["cn-exchange-lite"],
    ownerUserId: row.owner_user_id ? String(row.owner_user_id) : DEFAULT_OWNER_ID,
    members,
    status: String(row.status ?? "draft") as ProjectStatus,
    backendMode: "supabase",
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

function emptySnapshot(project: Project): ESGProjectSnapshot {
  return {
    selectedStandardIds: project.selectedStandardIds,
    uploadedFiles: [],
    parsedDocuments: [],
    disclosureChecklist: [],
    reportDraft: [],
    riskFindings: [],
    indicatorIndex: [],
  };
}

async function seedStandardLibrary(): Promise<void> {
  const client = getSupabaseServiceClient();
  if (!client) return;

  await client.from("standard_sources").upsert(
    DISCLOSURE_STANDARDS.flatMap((standard) =>
      standard.sources.map((source) => ({
        id: source.id,
        standard_id: standard.id,
        payload: source,
      })),
    ),
  );

  await client.from("standard_clauses").upsert(
    STANDARD_CLAUSES.map((clause) => ({
      id: clause.id,
      standard_id: clause.standardId,
      source_id: clause.sourceId ?? null,
      category: clause.category,
      clause_no: clause.clauseNo,
      chapter: clause.chapter,
      topic: clause.topic,
      requirement: clause.requirement,
      applicability: clause.applicability,
      suggested_evidence: clause.suggestedEvidence,
      suggested_metrics: clause.suggestedMetrics,
      suggested_departments: clause.suggestedDepartments,
      risk_level_if_missing: clause.riskLevelIfMissing,
      payload: clause,
    })),
  );
}

async function persistGeneratedTables(projectId: string, snapshot: ESGProjectSnapshot): Promise<void> {
  const client = getSupabaseServiceClient();
  if (!client) return;

  await client.from("disclosure_items").delete().eq("project_id", projectId);
  await client.from("report_sections").delete().eq("project_id", projectId);
  await client.from("risk_findings").delete().eq("project_id", projectId);
  await client.from("indicator_indexes").delete().eq("project_id", projectId);

  if (snapshot.disclosureChecklist.length > 0) {
    await client.from("disclosure_items").upsert(
      snapshot.disclosureChecklist.map((item) => ({
        id: item.id,
        project_id: projectId,
        payload: item,
      })),
    );
  }

  if (snapshot.reportDraft.length > 0) {
    await client.from("report_sections").upsert(
      snapshot.reportDraft.map((section) => ({
        id: section.id,
        project_id: projectId,
        payload: section,
      })),
    );
  }

  if (snapshot.riskFindings.length > 0) {
    await client.from("risk_findings").upsert(
      snapshot.riskFindings.map((finding) => ({
        id: finding.id,
        project_id: projectId,
        payload: finding,
      })),
    );
  }

  if (snapshot.indicatorIndex.length > 0) {
    await client.from("indicator_indexes").upsert(
      snapshot.indicatorIndex.map((indicator) => ({
        id: indicator.id,
        project_id: projectId,
        payload: indicator,
      })),
    );
  }
}

async function persistDocuments(projectId: string, snapshot: ESGProjectSnapshot): Promise<void> {
  const client = getSupabaseServiceClient();
  if (!client) return;

  if (snapshot.uploadedFiles.length > 0) {
    await client.from("uploaded_files").upsert(
      snapshot.uploadedFiles.map((file) => ({
        id: file.id,
        project_id: projectId,
        name: file.name,
        file_type: file.type,
        size_bytes: file.size,
        uploaded_at: file.uploadedAt,
        category: file.category,
        storage_bucket: file.storageBucket ?? null,
        storage_path: file.storagePath ?? null,
      })),
    );
  }

  if ((snapshot.parsedDocuments ?? []).length > 0) {
    await client.from("parsed_documents").upsert(
      (snapshot.parsedDocuments ?? []).map((document) => ({
        id: document.id,
        project_id: projectId,
        file_id: document.fileId,
        file_name: document.fileName,
        file_type: document.fileType,
        category: document.category,
        parser_status: document.parserStatus,
        parser_messages: document.parserMessages,
        metadata: document.metadata ?? {},
      })),
    );

    const chunks = (snapshot.parsedDocuments ?? []).flatMap((document) => document.chunks);
    if (chunks.length > 0) {
      await client.from("evidence_chunks").upsert(
        chunks.map((chunk) => ({
          id: chunk.id,
          project_id: projectId,
          document_id: chunk.documentId,
          file_id: chunk.fileId,
          file_name: chunk.fileName,
          file_type: chunk.fileType,
          category: chunk.category,
          location_type: chunk.locationType,
          location_label: chunk.locationLabel,
          chunk_text: chunk.text,
          table_context: chunk.tableContext ?? null,
          keywords: chunk.keywords,
          created_at: chunk.createdAt,
        })),
      );
    }
  }
}

export async function createProject(input: {
  name?: string;
  companyName?: string;
  reportingYear?: string;
  selectedStandardIds?: string[];
  uploadedFiles?: UploadedFile[];
  parsedDocuments?: ParsedDocument[];
}): Promise<StoredProject> {
  const client = getSupabaseServiceClient();
  if (!client) return createMemoryProject(input);

  await seedStandardLibrary();

  const now = nowIso();
  const year = input.reportingYear ?? String(new Date().getFullYear());
  const companyName = input.companyName ?? "示例企业";
  const { data: company, error: companyError } = await client
    .from("companies")
    .insert({ name: companyName })
    .select()
    .single();
  if (companyError) throw companyError;

  const projectSnapshot: ESGProjectSnapshot = {
    selectedStandardIds: input.selectedStandardIds ?? ["cn-exchange-lite"],
    uploadedFiles: input.uploadedFiles ?? [],
    parsedDocuments: input.parsedDocuments ?? [],
    disclosureChecklist: [],
    reportDraft: [],
    riskFindings: [],
    indicatorIndex: [],
  };

  const { data: projectRow, error: projectError } = await client
    .from("projects")
    .insert({
      company_id: company.id,
      name: input.name ?? `${companyName} ${year} ESG 报告项目`,
      company_name: companyName,
      report_year: year,
      period_start: `${year}-01-01`,
      period_end: `${year}-12-31`,
      selected_standard_ids: projectSnapshot.selectedStandardIds,
      owner_user_id: DEFAULT_OWNER_ID,
      status: "draft",
      snapshot_json: projectSnapshot,
      created_at: now,
      updated_at: now,
    })
    .select()
    .single();
  if (projectError) throw projectError;

  await client.from("project_members").insert({
    project_id: projectRow.id,
    user_id: DEFAULT_OWNER_ID,
    role: "admin",
  });

  const project = mapProjectRow(projectRow, [{ userId: DEFAULT_OWNER_ID, role: "admin" }]);
  const stored = { project, snapshot: projectSnapshot };
  await persistDocuments(project.id, stored.snapshot);
  return stored;
}

export async function getProject(projectId: string): Promise<StoredProject | undefined> {
  const client = getSupabaseServiceClient();
  if (!client) return projects.get(projectId);

  const { data: row, error } = await client.from("projects").select("*").eq("id", projectId).maybeSingle();
  if (error) throw error;
  if (!row) return undefined;

  const { data: memberRows } = await client.from("project_members").select("user_id, role").eq("project_id", projectId);
  const members = (memberRows ?? []).map((member) => ({
    userId: member.user_id ? String(member.user_id) : DEFAULT_OWNER_ID,
    role: String(member.role) as ProjectRole,
  }));
  const project = mapProjectRow(row, members.length > 0 ? members : [{ userId: DEFAULT_OWNER_ID, role: "admin" }]);
  const snapshot = (row.snapshot_json && typeof row.snapshot_json === "object" ? row.snapshot_json : emptySnapshot(project)) as ESGProjectSnapshot;

  return { project, snapshot };
}

export async function updateProjectSnapshot(
  projectId: string,
  patch: Partial<ESGProjectSnapshot>,
): Promise<StoredProject | undefined> {
  const stored = await getProject(projectId);
  if (!stored) return undefined;

  const snapshot: ESGProjectSnapshot = {
    ...stored.snapshot,
    ...patch,
  };
  const project: Project = {
    ...stored.project,
    selectedStandardIds: snapshot.selectedStandardIds,
    updatedAt: nowIso(),
  };

  const client = getSupabaseServiceClient();
  if (!client) {
    const memoryStored = { project, snapshot };
    projects.set(projectId, memoryStored);
    return memoryStored;
  }

  await client
    .from("projects")
    .update({
      selected_standard_ids: snapshot.selectedStandardIds,
      snapshot_json: snapshot,
      updated_at: project.updatedAt,
    })
    .eq("id", projectId);
  await persistDocuments(projectId, snapshot);
  await persistGeneratedTables(projectId, snapshot);

  return { project, snapshot };
}

export async function patchProject(projectId: string, patch: ProjectPatch): Promise<StoredProject | undefined> {
  const stored = await getProject(projectId);
  if (!stored) return undefined;

  const selectedStandardIds = patch.selectedStandardIds ?? stored.project.selectedStandardIds;
  const standardsChanged = JSON.stringify(selectedStandardIds) !== JSON.stringify(stored.project.selectedStandardIds);
  const reportPeriod = patch.reportingYear ? yearPeriod(patch.reportingYear) : stored.project.reportPeriod;
  const project: Project = {
    ...stored.project,
    name: patch.name ?? stored.project.name,
    companyName: patch.companyName ?? stored.project.companyName,
    reportPeriod,
    selectedStandardIds,
    status: patch.status ?? stored.project.status,
    updatedAt: nowIso(),
  };
  const snapshot: ESGProjectSnapshot = {
    ...stored.snapshot,
    selectedStandardIds,
    disclosureChecklist: standardsChanged ? [] : stored.snapshot.disclosureChecklist,
    reportDraft: standardsChanged ? [] : stored.snapshot.reportDraft,
    riskFindings: standardsChanged ? [] : stored.snapshot.riskFindings,
    indicatorIndex: standardsChanged ? [] : stored.snapshot.indicatorIndex,
  };

  const client = getSupabaseServiceClient();
  if (!client) {
    const memoryStored = { project, snapshot };
    projects.set(projectId, memoryStored);
    return memoryStored;
  }

  await client
    .from("projects")
    .update({
      name: project.name,
      company_name: project.companyName,
      report_year: project.reportPeriod.year,
      period_start: project.reportPeriod.startDate,
      period_end: project.reportPeriod.endDate,
      selected_standard_ids: selectedStandardIds,
      status: project.status,
      snapshot_json: snapshot,
      updated_at: project.updatedAt,
    })
    .eq("id", projectId);

  return { project, snapshot };
}

export async function attachProjectDocuments(
  projectId: string,
  sourceFiles: ClassifiableFile[],
): Promise<StoredProject | undefined> {
  const stored = await getProject(projectId);
  if (!stored) return undefined;

  const client = getSupabaseServiceClient();
  const files = classifyFiles(sourceFiles);
  const sourceByKey = new Map(sourceFiles.map((file) => [sourceFileKey(file), file]));

  if (client) {
    await ensureStorageBucket(client);
    await Promise.all(
      files.map(async (file) => {
        const source = sourceByKey.get(sourceFileKey(file));
        const content = source ? fileContentBuffer(source) : null;
        if (!content) return;

        const storagePath = `${projectId}/${file.id}/${sanitizePathPart(file.name)}`;
        const { error } = await client.storage.from(ESG_STORAGE_BUCKET).upload(storagePath, content, {
          contentType: source?.type || "application/octet-stream",
          upsert: true,
        });
        if (error) throw error;

        file.storageBucket = ESG_STORAGE_BUCKET;
        file.storagePath = storagePath;
      }),
    );
  }

  const parsedDocuments = await parseUploadedDocuments(files, sourceFiles);
  const snapshot: ESGProjectSnapshot = {
    ...stored.snapshot,
    uploadedFiles: [...stored.snapshot.uploadedFiles, ...files],
    parsedDocuments: [...(stored.snapshot.parsedDocuments ?? []), ...parsedDocuments],
    disclosureChecklist: [],
    reportDraft: [],
    riskFindings: [],
    indicatorIndex: [],
  };

  return updateProjectSnapshot(projectId, snapshot);
}

export async function parseProjectDocument(projectId: string, documentId: string): Promise<StoredProject | undefined> {
  const stored = await getProject(projectId);
  if (!stored) return undefined;

  const document = (stored.snapshot.parsedDocuments ?? []).find((candidate) => candidate.id === documentId);
  if (!document) return stored;

  return updateProjectSnapshot(projectId, {
    parsedDocuments: (stored.snapshot.parsedDocuments ?? []).map((candidate) =>
      candidate.id === documentId ? document : candidate,
    ),
  });
}

export async function updateChecklistItem(
  projectId: string,
  itemId: string,
  patch: Partial<DisclosureItem>,
): Promise<StoredProject | undefined> {
  const stored = await getProject(projectId);
  if (!stored) return undefined;

  const disclosureChecklist = stored.snapshot.disclosureChecklist.map((item) =>
    item.id === itemId
      ? {
          ...item,
          ...patch,
          id: item.id,
          standards: patch.standards ?? item.standards,
        }
      : item,
  );

  return updateProjectSnapshot(projectId, {
    disclosureChecklist,
    reportDraft: [],
    riskFindings: [],
    indicatorIndex: [],
  });
}

export async function generateProjectChecklist(projectId: string): Promise<StoredProject | undefined> {
  const stored = await getProject(projectId);
  if (!stored) return undefined;

  const checklist = generateDisclosureChecklist(
    stored.snapshot.uploadedFiles,
    stored.snapshot.selectedStandardIds,
    stored.snapshot.parsedDocuments ?? [],
  );

  return updateProjectSnapshot(projectId, {
    disclosureChecklist: checklist,
    reportDraft: [],
    riskFindings: [],
    indicatorIndex: [],
  });
}

export async function generateProjectReport(projectId: string): Promise<StoredProject | undefined> {
  const stored = await getProject(projectId);
  if (!stored) return undefined;

  const reportDraft = await generateReportDraftWithLLM(stored.snapshot.uploadedFiles, stored.snapshot.disclosureChecklist);

  return updateProjectSnapshot(projectId, {
    reportDraft,
    riskFindings: [],
    indicatorIndex: [],
  });
}

export async function checkProjectRisks(projectId: string): Promise<StoredProject | undefined> {
  const stored = await getProject(projectId);
  if (!stored) return undefined;

  const riskFindings = checkReportRisks(stored.snapshot.reportDraft, stored.snapshot.disclosureChecklist);

  return updateProjectSnapshot(projectId, {
    riskFindings,
    indicatorIndex: [],
  });
}

export async function generateProjectIndicatorIndex(projectId: string): Promise<StoredProject | undefined> {
  const stored = await getProject(projectId);
  if (!stored) return undefined;

  const indicatorIndex = generateIndicatorIndex(stored.snapshot.reportDraft, stored.snapshot.disclosureChecklist);

  return updateProjectSnapshot(projectId, {
    indicatorIndex,
  });
}
