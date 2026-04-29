# SQL Optimizer

一个可运行的 SQL 性能分析与优化 MVP，覆盖：

- SQL 采集
- SQL 归一化
- 慢 SQL 聚合
- 数据库元数据采集
- 执行计划解析
- 规则引擎
- AI 优化建议
- 优化验证
- HTTP API

## 目标

把 SQL 性能治理从“人工经验”变成“自动采集 + 自动分析 + 自动建议 + 自动验证”的闭环。

## 运行

```bash
cd sql-optimizer
npm run demo
```

启动 API：

```bash
npm run serve
```

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

## 核心模块

- `collector/`: 采集 SQL 事件
- `normalizer/`: SQL 归一化
- `analyzer/`: EXPLAIN 解析与模拟
- `metadata/`: 表结构与索引解析
- `rule-engine/`: 规则识别与建议
- `ai-engine/`: AI 建议生成
- `storage/`: 本地持久化
- `api/`: HTTP 接口
- `java/`: MyBatis 拦截器参考实现

## 说明

当前仓库提供的是可执行 MVP 和适配层：

- MyBatis 侧可以把拦截到的 SQL 事件送入 `collector`
- `java/MyBatisSqlInterceptor.java` 提供了可直接移植到 Java 后端的采集实现
- MySQL 侧可以替换 `analyzer` 的模拟执行计划为真实 `EXPLAIN ANALYZE`
- AI 侧可以替换为任意 OpenAI 兼容模型
