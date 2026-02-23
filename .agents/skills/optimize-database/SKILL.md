---
name: optimize-database
description: Use when investigating slow queries, analyzing execution plans, or optimizing database performance. Invoke for index design, query rewrites, configuration tuning, partitioning strategies, lock contention resolution.
---

## When to Use This Skill

- Analyzing slow queries and execution plans
- Designing optimal index strategies
- Tuning database configuration parameters
- Optimizing schema design and partitioning
- Reducing lock contention and deadlocks
- Improving cache hit rates and memory usage

## Reference Guide

Load detailed guidance based on context:

| Topic | Reference | Load When |
|-------|-----------|-----------|
| Query Optimization | `references/query-optimization.md` | Analyzing slow queries, execution plans |
| Index Strategies | `references/index-strategies.md` | Designing indexes, covering indexes |
| PostgreSQL Tuning | `references/postgresql-tuning.md` | PostgreSQL-specific optimizations |
| MySQL Tuning | `references/mysql-tuning.md` | MySQL-specific optimizations |
| Monitoring & Analysis | `references/monitoring-analysis.md` | Performance metrics, diagnostics |

## Output Templates

When optimizing database performance, provide:
1. Performance analysis with baseline metrics
2. Identified bottlenecks and root causes
3. Optimization strategy with specific changes
4. Implementation SQL/config changes
5. Validation queries to measure improvement
6. Monitoring recommendations