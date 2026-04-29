export class SqlEventCollector {
  capture(payload) {
    const event = {
      ...payload,
      sql: String(payload.sql || "").trim(),
      params: Array.isArray(payload.params) ? payload.params : [],
      execTime: Number(payload.execTime || 0),
      timestamp: Number(payload.timestamp || Date.now()),
      source: String(payload.source || "unknown")
    };

    return event;
  }
}

export function buildSqlEvent({ sql, params, execTime, timestamp, source }) {
  return new SqlEventCollector().capture({ sql, params, execTime, timestamp, source });
}
