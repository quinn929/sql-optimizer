import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = fileURLToPath(new URL("../../data/", import.meta.url));
const storeFile = join(rootDir, "sql-analysis.json");

async function ensureStore() {
  await mkdir(dirname(storeFile), { recursive: true });
  try {
    await readFile(storeFile, "utf8");
  } catch {
    await writeFile(storeFile, "[]", "utf8");
  }
}

async function loadRecords() {
  await ensureStore();
  const raw = await readFile(storeFile, "utf8");
  return JSON.parse(raw || "[]");
}

async function saveRecords(records) {
  await ensureStore();
  await writeFile(storeFile, JSON.stringify(records, null, 2), "utf8");
}

export async function aggregateByNormalizedSql(records) {
  const map = new Map();
  for (const record of records) {
    const key = record.normalized_sql || record.normalizedSql || "";
    if (!map.has(key)) {
      map.set(key, { normalized_sql: key, count: 0, total_time: 0, max_time: 0 });
    }
    const bucket = map.get(key);
    bucket.count += 1;
    bucket.total_time += Number(record.execTime || record.exec_time || 0);
    bucket.max_time = Math.max(bucket.max_time, Number(record.execTime || record.exec_time || 0));
  }

  return [...map.values()].map((item) => ({
    normalized_sql: item.normalized_sql,
    count: item.count,
    avgTime: item.count > 0 ? Math.round(item.total_time / item.count) : 0,
    maxTime: item.max_time
  }));
}

export class SqlAnalysisStore {
  async append(record) {
    const records = await loadRecords();
    records.push({
      id: records.length + 1,
      created_at: new Date().toISOString(),
      ...record
    });
    await saveRecords(records);
    return records[records.length - 1];
  }

  async aggregateBySql(normalizedSql, previewExecTime = null) {
    const records = await this.list();
    const match = records
      .filter((record) => record.normalized_sql === normalizedSql)
      .map((record) => ({ ...record }));
    if (previewExecTime !== null) {
      match.push({ normalized_sql: normalizedSql, execTime: previewExecTime });
    }
    const grouped = await aggregateByNormalizedSql(match);
    return grouped[0] || {
      normalized_sql: normalizedSql,
      count: 0,
      avgTime: 0,
      maxTime: 0
    };
  }

  async list() {
    return loadRecords();
  }

  async summary() {
    const records = await this.list();
    const aggregated = await aggregateByNormalizedSql(records);
    const triggered = aggregated.filter((item) => item.avgTime > 200 || item.count > 100);
    return {
      total: records.length,
      aggregated,
      triggered
    };
  }
}
