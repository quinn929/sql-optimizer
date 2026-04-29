# SQL Optimizer

一个可运行的 SQL 性能分析与优化 MVP，面向后端性能治理场景，提供从采集到验证的完整闭环。

## 核心目标

把 SQL 性能治理从“人工排查 + 经验判断”变成“自动采集 + 自动分析 + 自动建议 + 自动验证”。

## 解决的问题

- 慢 SQL 分散在代码、日志和数据库里，排查成本高
- 同类 SQL 参数不同，难以自动聚合
- 传统 EXPLAIN 结果需要人工解读，门槛高
- 优化建议依赖个人经验，缺少统一规则和可验证结论

## 功能清单

- SQL 采集
- SQL 归一化
- 慢 SQL 聚合
- 数据库元数据采集
- 执行计划解析
- 规则引擎
- AI 优化建议
- 优化验证
- HTTP API

## 运行

```bash
cd sql-optimizer
npm run demo
```

启动 API：

```bash
npm run serve
```

## Demo 输出

运行样例后会得到：

- 原始 SQL
- 归一化 SQL
- 聚合统计结果
- 规则命中列表
- AI 结构化建议
- 优化前后 EXPLAIN 对比

## 输入事件结构

```json
{
  "sql": "SELECT * FROM user WHERE id = 123",
  "params": ["123"],
  "execTime": 320,
  "timestamp": 1710000000,
  "source": "UserMapper.selectById"
}
```

## 架构

```text
MyBatis/JPA 拦截器
        ↓
SQL 采集
        ↓
SQL 归一化
        ↓
慢 SQL 聚合
        ↓
表结构 / 索引解析
        ↓
EXPLAIN 分析
        ↓
规则引擎
        ↓
AI 建议
        ↓
优化验证
        ↓
结果存储 / API 查询
```

## 目录

- `collector/`: SQL 采集
- `normalizer/`: SQL 归一化
- `analyzer/`: EXPLAIN 解析与模拟
- `metadata/`: 表结构与索引解析
- `rule-engine/`: 规则识别与建议
- `ai-engine/`: AI 建议生成
- `storage/`: 本地持久化
- `verify/`: 优化验证
- `api/`: HTTP 接口
- `java/`: MyBatis 拦截器参考实现
- `examples/`: 样例输入

## 规则样例

- `type = ALL` 时提示全表扫描
- `WHERE` 中出现函数调用时提示索引失效
- `LIMIT 10000, 10` 提示大分页优化
- `filesort` / `temporary` 提示排序优化

## 输出格式

AI 结果采用结构化 JSON，便于后续接入前端、告警系统或自动化工单：

```json
{
  "problem": "...",
  "solution": "...",
  "optimized_sql": "...",
  "index_sql": "...",
  "impact": "..."
}
```

## 说明

当前仓库提供的是可执行 MVP 和适配层：

- MyBatis 侧可以把拦截到的 SQL 事件送入 `collector`
- `java/MyBatisSqlInterceptor.java` 提供了可直接移植到 Java 后端的采集实现
- MySQL 侧可以替换 `analyzer` 的模拟执行计划为真实 `EXPLAIN ANALYZE`
- AI 侧可以替换为任意 OpenAI 兼容模型

## 后续增强

- 接入 Redis 去重
- 替换为真实数据库存储
- 接入 MySQL `EXPLAIN ANALYZE`
- 接入 OpenAI / 兼容模型
- 增加 Web UI 和慢 SQL 看板
