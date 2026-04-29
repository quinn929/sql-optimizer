import { readFile } from "node:fs/promises";
import { createServer } from "./api/http-server.js";
import { SqlAnalysisStore } from "./storage/sql-analysis-store.js";
import { SqlEventCollector } from "./collector/mybatis-interceptor.js";
import { createOptimizer } from "./orchestrator.js";

async function loadSampleEvent() {
  const raw = await readFile(new URL("../examples/sample-event.json", import.meta.url), "utf8");
  return JSON.parse(raw);
}

async function runDemo() {
  const store = new SqlAnalysisStore();
  const optimizer = createOptimizer({ store });
  const collector = new SqlEventCollector();
  const event = await loadSampleEvent();
  const collected = collector.capture(event);
  const result = await optimizer.analyze(collected);

  console.log("=== SQL Optimizer Demo ===");
  console.log(`Source: ${result.event.source}`);
  console.log(`Raw SQL: ${result.event.sql}`);
  console.log(`Normalized SQL: ${result.normalizedSql}`);
  console.log(`Aggregate: count=${result.aggregate.count}, avg=${result.aggregate.avgTime}ms, max=${result.aggregate.maxTime}ms`);
  console.log("");
  console.log("Rules:");
  for (const item of result.ruleFindings) {
    console.log(`- [${item.severity}] ${item.title}: ${item.suggestion}`);
  }
  console.log("");
  console.log("AI Result:");
  console.log(JSON.stringify(result.ai, null, 2));
  console.log("");
  console.log("Verification:");
  console.log(JSON.stringify(result.verification, null, 2));
}

async function main() {
  const args = process.argv.slice(2);
  if (args.includes("--serve")) {
    const store = new SqlAnalysisStore();
    const optimizer = createOptimizer({ store });
    const server = createServer({ optimizer, store });
    const port = Number(process.env.PORT || 3008);
    const host = process.env.HOST || "127.0.0.1";
    server.on("error", (error) => {
      console.error(error.message);
      process.exit(1);
    });
    server.listen(port, host, () => {
      console.log(`SQL Optimizer API listening on http://localhost:${port}`);
    });
    return;
  }

  if (args.includes("--sample") || args.length === 0) {
    await runDemo();
    return;
  }

  const customSql = args.join(" ").trim();
  const store = new SqlAnalysisStore();
  const optimizer = createOptimizer({ store });
  const collector = new SqlEventCollector();
  const event = collector.capture({
    sql: customSql,
    params: [],
    execTime: 0,
    timestamp: Date.now(),
    source: "CLI.input"
  });
  const result = await optimizer.analyze(event);
  console.log(JSON.stringify(result, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
