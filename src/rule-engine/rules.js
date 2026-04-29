function hasFunctionInWhere(sql) {
  const lower = String(sql || "").toLowerCase();
  return /\bwhere\b[\s\S]*\b[a-z_]+\s*\(\s*[a-z_][\w.]*\s*\)/i.test(lower);
}

function hasLargeOffset(sql) {
  const match = String(sql || "").match(/\blimit\s+(\d+)\s*,\s*(\d+)/i);
  return match ? Number(match[1]) >= 10000 : false;
}

function hasJoinWithoutIndex(explain) {
  return /join/i.test(String(explain.extra || "")) && /ALL/i.test(explain.type) && Number(explain.rows || 0) > 5000;
}

export function evaluateRules({ sql, explain, tableSchema }) {
  const findings = [];

  if (String(explain.type).toUpperCase() === "ALL") {
    findings.push({
      id: "full-scan",
      severity: "high",
      title: "全表扫描",
      suggestion: "优先为过滤条件字段建立联合索引或覆盖索引",
      evidence: `type = ${explain.type}`
    });
  }

  if (normalizeExtra(explain.extra).includes("filesort") || normalizeExtra(explain.extra).includes("temporary")) {
    findings.push({
      id: "filesort-temp",
      severity: "medium",
      title: "排序或临时表开销",
      suggestion: "检查 ORDER BY / GROUP BY 是否可利用索引顺序，减少 filesort 和 temporary",
      evidence: explain.extra
    });
  }

  if (hasFunctionInWhere(sql)) {
    findings.push({
      id: "function-index",
      severity: "high",
      title: "函数导致索引失效",
      suggestion: "避免在 WHERE 条件中对列做函数运算，改写为范围条件或生成列索引",
      evidence: sql
    });
  }

  if (hasLargeOffset(sql)) {
    findings.push({
      id: "large-offset",
      severity: "medium",
      title: "大分页",
      suggestion: "把 OFFSET 分页改成基于游标的 keyset 分页，避免扫描大量无效行",
      evidence: sql
    });
  }

  if (hasJoinWithoutIndex(explain)) {
    findings.push({
      id: "join-scan",
      severity: "high",
      title: "Join 扫描量偏大",
      suggestion: "检查 Join 键是否有索引，优先让高选择性列参与连接条件",
      evidence: `rows = ${explain.rows}`
    });
  }

  if ((tableSchema?.indexes || []).length === 0 && /where/i.test(sql)) {
    findings.push({
      id: "missing-index",
      severity: "medium",
      title: "缺少表级索引信息",
      suggestion: "采集表结构与索引定义后，再确认过滤字段是否已有可用索引",
      evidence: tableSchema?.table || "unknown"
    });
  }

  return findings;
}

function normalizeExtra(extra) {
  return String(extra || "").toLowerCase();
}
