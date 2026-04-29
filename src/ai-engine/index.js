function pickPrimaryProblem(ruleFindings, explain) {
  if (ruleFindings.length > 0) {
    return ruleFindings[0].title;
  }
  if (String(explain.type).toUpperCase() === "ALL") return "全表扫描";
  return "SQL 执行路径存在可优化空间";
}

function buildOptimizedSql(sql, ruleFindings) {
  const text = String(sql || "");

  if (ruleFindings.some((item) => item.id === "large-offset")) {
    const rewritten = text.replace(
      /limit\s+(\d+)\s*,\s*(\d+)/i,
      "LIMIT ? /* use keyset pagination */"
    );
    return rewritten.includes("/* use keyset pagination */")
      ? rewritten.replace(
          /order\s+by\s+([a-z_][\w.]*)\s+desc/i,
          "ORDER BY $1 DESC /* cursor pagination */"
        )
      : rewritten;
  }

  if (ruleFindings.some((item) => item.id === "function-index")) {
    return text.replace(/where\s+([a-z_]+\s*\(\s*[a-z_][\w.]*\s*\))\s*=\s*\?/i, "WHERE /* rewrite function predicate */");
  }

  return text;
}

function buildIndexSql(sql, ruleFindings, tableSchema) {
  const table = tableSchema?.table || "your_table";
  if (ruleFindings.some((item) => item.id === "full-scan" || item.id === "join-scan")) {
    return `-- example index suggestion for ${table}\nCREATE INDEX idx_${table}_filter ON ${table} (filter_column);`;
  }
  return "";
}

export function generateAiAdvice({ sql, execTime, explain, tableSchema, ruleFindings }) {
  const problem = pickPrimaryProblem(ruleFindings, explain);
  const solutionParts = [];
  if (ruleFindings.length > 0) {
    for (const item of ruleFindings.slice(0, 3)) {
      solutionParts.push(item.suggestion);
    }
  } else {
    solutionParts.push("检查过滤条件、索引命中情况和排序方式，优先减少全表扫描与 filesort。");
  }

  const optimized_sql = buildOptimizedSql(sql, ruleFindings);
  const index_sql = buildIndexSql(sql, ruleFindings, tableSchema);

  return {
    problem,
    solution: solutionParts.join("；"),
    optimized_sql,
    index_sql,
    impact: execTime > 0 ? `预计可降低执行耗时，当前 SQL 耗时 ${execTime}ms` : "预计可降低扫描行数与 CPU 消耗"
  };
}
