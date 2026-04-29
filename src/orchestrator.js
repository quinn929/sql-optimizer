import { normalizeSql } from "./normalizer/sql-normalizer.js";
import { aggregateByNormalizedSql } from "./storage/sql-analysis-store.js";
import { analyzeExplainPlan, simulateExplain } from "./analyzer/explain-parser.js";
import { parseTableSchema, detectTablesInSql } from "./metadata/schema-parser.js";
import { evaluateRules } from "./rule-engine/rules.js";
import { generateAiAdvice } from "./ai-engine/index.js";
import { verifyOptimization } from "./verify/verify.js";

export function createOptimizer({ store, dbAdapter } = {}) {
  return {
    async analyze(event) {
      const normalizedSql = normalizeSql(event.sql);
      const schema = event.tableSchema || parseTableSchema({
        table: detectTablesInSql(event.sql)[0] || "unknown",
        ddl: event.ddl || "",
        indexes: event.indexes || []
      });

      const aggregate = await store.aggregateBySql(normalizedSql, event.execTime);
      const explainBefore = dbAdapter?.explain
        ? await dbAdapter.explain(event.sql)
        : simulateExplain(event.sql, schema, event.execTime);
      const explain = analyzeExplainPlan(explainBefore);
      const ruleFindings = evaluateRules({
        sql: event.sql,
        normalizedSql,
        execTime: event.execTime,
        explain,
        tableSchema: schema
      });
      const ai = generateAiAdvice({
        sql: event.sql,
        execTime: event.execTime,
        explain,
        tableSchema: schema,
        ruleFindings
      });
      const optimizedExplainRaw = dbAdapter?.explain
        ? await dbAdapter.explain(ai.optimized_sql || event.sql)
        : simulateExplain(ai.optimized_sql || event.sql, schema, Math.max(20, Math.round(event.execTime * 0.55)));
      const verification = verifyOptimization({
        before: explain,
        after: analyzeExplainPlan(optimizedExplainRaw),
        optimizedSql: ai.optimized_sql || event.sql
      });

      await store.append({
        ...event,
        normalized_sql: normalizedSql,
        aggregate,
        explain_before: explain,
        rule_findings: ruleFindings,
        ai_result: ai,
        verification
      });

      return {
        event,
        normalizedSql,
        aggregate,
        explain,
        ruleFindings,
        ai,
        verification,
        schema
      };
    }
  };
}
