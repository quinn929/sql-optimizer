export function verifyOptimization({ before, after, optimizedSql }) {
  const beforeRows = Number(before?.rows || 0);
  const afterRows = Number(after?.rows || 0);
  const beforeCost = Number(before?.cost || 0);
  const afterCost = Number(after?.cost || 0);

  return {
    optimizedSql,
    before: {
      type: before?.type || "unknown",
      rows: beforeRows,
      cost: beforeCost,
      extra: before?.extra || ""
    },
    after: {
      type: after?.type || "unknown",
      rows: afterRows,
      cost: afterCost,
      extra: after?.extra || ""
    },
    delta: {
      rows: afterRows - beforeRows,
      cost: afterCost - beforeCost,
      rowsReduced: beforeRows > 0 ? Math.round(((beforeRows - afterRows) / beforeRows) * 100) : 0,
      costReduced: beforeCost > 0 ? Math.round(((beforeCost - afterCost) / beforeCost) * 100) : 0
    }
  };
}

