function normalizeExtra(extra) {
  if (!extra) return "";
  return String(extra).replace(/\s+/g, " ").trim();
}

export function analyzeExplainPlan(raw) {
  if (!raw) {
    return {
      type: "unknown",
      rows: 0,
      key: null,
      extra: "",
      cost: 0
    };
  }

  if (Array.isArray(raw)) {
    const row = raw[0] || {};
    return {
      type: row.type || row.access_type || "unknown",
      rows: Number(row.rows || row.rows_examined_per_scan || 0),
      key: row.key || row.used_key || null,
      extra: normalizeExtra(row.extra || row.Extra || row.extra_info || ""),
      cost: Number(row.cost || row.query_cost || row.actual_total_time || 0)
    };
  }

  if (typeof raw === "object") {
    return {
      type: raw.type || raw.access_type || "unknown",
      rows: Number(raw.rows || raw.rows_examined_per_scan || 0),
      key: raw.key || raw.used_key || null,
      extra: normalizeExtra(raw.extra || raw.Extra || raw.extra_info || ""),
      cost: Number(raw.cost || raw.query_cost || raw.actual_total_time || 0)
    };
  }

  const text = String(raw);
  const typeMatch = text.match(/\btype:\s*(\w+)/i) || text.match(/\baccess_type:\s*(\w+)/i);
  const rowsMatch = text.match(/\brows:\s*(\d+)/i) || text.match(/\brows_examined_per_scan:\s*(\d+)/i);
  const keyMatch = text.match(/\bkey:\s*([^\s,]+)/i) || text.match(/\bused_key:\s*([^\s,]+)/i);
  const extraMatch = text.match(/\bextra:\s*(.+)$/im) || text.match(/\bextra_info:\s*(.+)$/im);

  return {
    type: typeMatch ? typeMatch[1] : "unknown",
    rows: rowsMatch ? Number(rowsMatch[1]) : 0,
    key: keyMatch ? keyMatch[1] : null,
    extra: normalizeExtra(extraMatch ? extraMatch[1] : ""),
    cost: 0
  };
}

export function simulateExplain(sql, schema, execTime = 0) {
  const normalized = String(sql || "").toLowerCase();
  const hasWhereId = /\bwhere\b[\s\S]*\bid\s*=\s*\?/i.test(normalized) || /\bwhere\b[\s\S]*\bid\s*=\s*\d+/i.test(normalized);
  const hasIn = /\bin\s*\(\?\)/i.test(normalized);
  const hasLimitOffset = /\blimit\s+\d+\s*,\s*\d+/i.test(normalized);
  const hasOrderBy = /\border\s+by\b/i.test(normalized);
  const hasFunction = /\b\w+\s*\(\s*\w+\s*\)/i.test(normalized) && /\bwhere\b/i.test(normalized);
  const hasIndex = Boolean(schema?.indexes?.length);
  const whereColumnMatch = normalized.match(/\bwhere\b[\s\S]*?\b([a-z_][\w.]*)\s*=\s*(\?|\d+|'[^']*')/i);
  const orderColumnMatch = normalized.match(/\border\s+by\s+([a-z_][\w.]*)/i);

  let type = "ALL";
  let rows = 10000;
  let key = null;
  const extra = [];

  if (hasWhereId || hasIn) {
    type = hasIndex ? "ref" : "ALL";
    rows = hasIndex ? 1 : 5000;
    key = hasIndex ? schema.indexes[0]?.name || null : null;
  }

  if (whereColumnMatch && orderColumnMatch && hasIndex) {
    const whereColumn = whereColumnMatch[1].replace(/`/g, "");
    const orderColumn = orderColumnMatch[1].replace(/`/g, "");
    const matchedIndex = schema.indexes.find((item) => {
      const cols = (item.columns || []).map((column) => String(column).replace(/`/g, "").toLowerCase());
      return cols[0] === whereColumn.toLowerCase() && cols.includes(orderColumn.toLowerCase());
    });
    if (matchedIndex) {
      type = "ref";
      key = matchedIndex.name;
      rows = hasLimitOffset ? 1000 : 50;
    }
  }

  if (hasFunction) {
    type = "ALL";
    rows = Math.max(rows, 8000);
    extra.push("Using where");
  }

  if (hasLimitOffset) {
    rows = Math.max(rows, 1000);
    extra.push("Using filesort");
  }

  if (hasOrderBy && !hasIndex) {
    extra.push("Using temporary");
  }

  return {
    type,
    rows,
    key,
    extra: extra.join("; "),
    cost: Math.round(rows * (type === "ALL" ? 1.5 : 0.3))
  };
}
