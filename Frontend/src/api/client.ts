import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

const BASE = "/api";

// ── Token management ──────────────────────────────────────────────────────────

export function getToken(): string | null {
  return localStorage.getItem("nextbase_token");
}

export function setToken(token: string) {
  localStorage.setItem("nextbase_token", token);
}

export function clearToken() {
  localStorage.removeItem("nextbase_token");
}

function authHeaders(): HeadersInit {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}`, "Content-Type": "application/json" } : { "Content-Type": "application/json" };
}

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: { ...authHeaders(), ...(init?.headers || {}) },
  });
  if (res.status === 401 && path !== "/auth/login") {
    clearToken();
    window.location.href = "/login";
    throw new Error("Session expired. Please log in again.");
  }
  if (!res.ok) {
    let err: any;
    try { err = await res.json(); } catch { err = { message: res.statusText }; }
    throw new Error(err?.message || res.statusText);
  }
  return res.json();
}

// ── Auth ──────────────────────────────────────────────────────────────────────

export async function login(username: string, password: string): Promise<{ token: string; user: { username: string } }> {
  const data = await apiFetch<{ token: string; user: { username: string } }>("/auth/login", {
    method: "POST",
    body: JSON.stringify({ username, password }),
  });
  setToken(data.token);
  return data;
}

export async function getMe(): Promise<{ user: { username: string } }> {
  return apiFetch("/auth/me");
}

export async function getAuthConfig(): Promise<{ username: string }> {
  return apiFetch("/auth/config");
}

// ── Health ────────────────────────────────────────────────────────────────────

export function useHealthCheck() {
  return useQuery({
    queryKey: ["health"],
    queryFn: () => apiFetch<{ status: string }>("/health"),
    refetchInterval: 30000,
    retry: false,
  });
}

// ── DB Overview ───────────────────────────────────────────────────────────────

export function useGetDbOverview() {
  return useQuery({
    queryKey: getGetDbOverviewQueryKey(),
    queryFn: () => apiFetch<{ activeConnections: number; databaseSize: string; tableCount: number }>("/db/overview"),
    refetchInterval: 10000,
  });
}

export function getGetDbOverviewQueryKey() { return ["db-overview"]; }

// ── Throughput ────────────────────────────────────────────────────────────────

export function useGetDbThroughput() {
  return useQuery({
    queryKey: getGetDbThroughputQueryKey(),
    queryFn: () => apiFetch<{ dataPoints: { timestamp: number; queries: number; inserts: number; updates: number; deletes: number }[] }>("/db/throughput"),
    refetchInterval: 5000,
  });
}

export function getGetDbThroughputQueryKey() { return ["db-throughput"]; }

// ── Activity ──────────────────────────────────────────────────────────────────

export function useGetDbActivity() {
  return useQuery({
    queryKey: getGetDbActivityQueryKey(),
    queryFn: () => apiFetch<{ activities: { pid: number; state: string; query: string; startedAt: string; duration: string }[] }>("/db/activity"),
    refetchInterval: 5000,
  });
}

export function getGetDbActivityQueryKey() { return ["db-activity"]; }

// ── Tables list ───────────────────────────────────────────────────────────────

export function useGetDbTables() {
  return useQuery({
    queryKey: getGetDbTablesQueryKey(),
    queryFn: () => apiFetch<{ tables: { tableName: string; rowCount: number; totalSize: string }[] }>("/db/tables-extended"),
    refetchInterval: 15000,
  });
}

export function getGetDbTablesQueryKey() { return ["db-tables-extended"]; }

// ── Table names only ──────────────────────────────────────────────────────────

export function useGetTableNames() {
  return useQuery({
    queryKey: ["db-table-names"],
    queryFn: () => apiFetch<{ table_name: string }[]>("/db/tables"),
  });
}

// ── Table schema ──────────────────────────────────────────────────────────────

export function useGetTableDetails(name: string | null) {
  return useQuery({
    queryKey: ["db-table", name],
    queryFn: () => apiFetch<{ columns: any[]; constraints: any[] }>(`/db/tables/${name}`),
    enabled: !!name,
  });
}

// ── Table data ────────────────────────────────────────────────────────────────

export function useGetTableData(name: string | null, params?: { limit?: number; offset?: number; sortColumn?: string; sortOrder?: string }) {
  return useQuery({
    queryKey: ["db-table-data", name, params],
    queryFn: () => {
      const q = new URLSearchParams();
      if (params?.limit) q.set("limit", String(params.limit));
      if (params?.offset) q.set("offset", String(params.offset));
      if (params?.sortColumn) q.set("sortColumn", params.sortColumn);
      if (params?.sortOrder) q.set("sortOrder", params.sortOrder);
      return apiFetch<{ data: any[]; totalCount: number; fields: any[] }>(`/db/tables/${name}/data?${q}`);
    },
    enabled: !!name,
  });
}

// ── Schema visualizer ─────────────────────────────────────────────────────────

export function useGetSchema() {
  return useQuery({
    queryKey: ["db-schema"],
    queryFn: () => apiFetch<{ tables: any[]; relations: any[] }>("/db/schema"),
  });
}

// ── DB Stats ──────────────────────────────────────────────────────────────────

export function useGetDbStats() {
  return useQuery({
    queryKey: ["db-stats"],
    queryFn: () => apiFetch<{ totalTables: number; totalRows: number; dbSize: string; dbSizeBytes: number; activeConnections: number; throughput: any[] }>("/db/stats"),
    refetchInterval: 5000,
  });
}

// ── SQL Query ─────────────────────────────────────────────────────────────────

export async function runSqlQuery(sql: string): Promise<{ rows: any[]; fields: any[]; rowCount: number; duration: number }> {
  return apiFetch("/query/run", {
    method: "POST",
    body: JSON.stringify({ sql }),
  });
}

// ── Create table ──────────────────────────────────────────────────────────────

export async function createTable(tableName: string, columns: any[]): Promise<void> {
  return apiFetch("/db/tables", {
    method: "POST",
    body: JSON.stringify({ tableName, columns }),
  });
}

// ── Drop table ────────────────────────────────────────────────────────────────

export async function dropTable(tableName: string): Promise<void> {
  return apiFetch(`/db/tables/${tableName}`, { method: "DELETE" });
}

// ── Rename table ──────────────────────────────────────────────────────────────

export async function renameTable(oldName: string, newName: string): Promise<void> {
  return apiFetch(`/db/tables/${oldName}/rename`, {
    method: "PATCH",
    body: JSON.stringify({ newName }),
  });
}

// ── Duplicate table ───────────────────────────────────────────────────────────

export async function duplicateTable(tableName: string): Promise<{ newTableName: string }> {
  return apiFetch(`/db/tables/${tableName}/duplicate`, { method: "POST" });
}

// ── Insert row ────────────────────────────────────────────────────────────────

export async function insertRow(tableName: string, row: Record<string, any>): Promise<any> {
  return apiFetch(`/db/tables/${tableName}/rows`, {
    method: "POST",
    body: JSON.stringify(row),
  });
}

// ── Update row ────────────────────────────────────────────────────────────────

export async function updateRow(tableName: string, selection: Record<string, any>, updates: Record<string, any>): Promise<any> {
  return apiFetch(`/db/tables/${tableName}/rows`, {
    method: "PATCH",
    body: JSON.stringify({ selection, updates }),
  });
}

// ── Delete row ────────────────────────────────────────────────────────────────

export async function deleteRow(tableName: string, selection: Record<string, any>): Promise<void> {
  return apiFetch(`/db/tables/${tableName}/rows`, {
    method: "DELETE",
    body: JSON.stringify(selection),
  });
}

// ── Add column ────────────────────────────────────────────────────────────────

export async function addColumn(tableName: string, columnName: string, dataType: string, defaultValue?: string, isNullable?: boolean): Promise<void> {
  return apiFetch(`/db/tables/${tableName}/columns`, {
    method: "POST",
    body: JSON.stringify({ columnName, dataType, defaultValue, isNullable }),
  });
}

// ── Drop column ───────────────────────────────────────────────────────────────

export async function dropColumn(tableName: string, columnName: string): Promise<void> {
  return apiFetch(`/db/tables/${tableName}/columns/${columnName}`, { method: "DELETE" });
}

// ── Backups ───────────────────────────────────────────────────────────────────

export type Backup = {
  id: string;
  filename: string;
  label: string;
  time: string;
  size: string;
  sizeBytes: number;
};

export function useGetBackups() {
  return useQuery({
    queryKey: ["admin-backups"],
    queryFn: () => apiFetch<Backup[]>("/admin/backups"),
    refetchInterval: 30000,
  });
}

export async function createBackup(): Promise<Backup> {
  return apiFetch("/admin/backup", { method: "POST" });
}

export function getBackupDownloadUrl(id: string): string {
  return `/api/admin/backups/${id}/download`;
}

export async function deleteBackup(id: string): Promise<void> {
  return apiFetch(`/admin/backups/${id}`, { method: "DELETE" });
}

export async function restoreSql(sql: string): Promise<{ executed: number; errors: string[] }> {
  return apiFetch("/admin/restore", {
    method: "POST",
    body: JSON.stringify({ sql }),
  });
}

// ── DB Controls ───────────────────────────────────────────────────────────────

export async function pauseDatabase(): Promise<{ paused: boolean; message: string }> {
  return apiFetch("/admin/db/pause", { method: "POST" });
}

export async function resumeDatabase(): Promise<{ paused: boolean; message: string }> {
  return apiFetch("/admin/db/resume", { method: "POST" });
}

export async function resetDatabase(): Promise<{ message: string; dropped: number }> {
  return apiFetch("/admin/db/reset", { method: "POST" });
}

// ── Connection config from postgres.yml ───────────────────────────────────────

export type ConnectionConfig = {
  user: string;
  db: string;
  containerName: string;
  poolerContainer: string;
  directPort: number;
  poolerPort: number;
  serverIp: string;
  directLocal: string;
  poolerLocal: string;
  directPublic: string;
  poolerPublic: string;
  exposed: boolean;
};

export function useGetConnectionConfig() {
  return useQuery({
    queryKey: ["admin-connection-config"],
    queryFn: () => apiFetch<ConnectionConfig>("/admin/connection"),
    refetchInterval: 5000,
  });
}

// ── Expose / Unexpose public TCP proxy ────────────────────────────────────────

export type ExposeResult = {
  exposed: boolean;
  serverIp?: string;
  directPublicPort?: number;
  poolerPublicPort?: number;
  directPublic?: string;
  poolerPublic?: string;
  mode?: 'docker' | 'docker-config-updated' | 'tcp-proxy';
  note?: string;
  dockerRunning?: boolean;
};

export async function exposeDatabase(): Promise<ExposeResult> {
  return apiFetch("/admin/expose", { method: "POST" });
}

export async function unexposeDatabase(): Promise<{ exposed: boolean }> {
  return apiFetch("/admin/unexpose", { method: "POST" });
}
