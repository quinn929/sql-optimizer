export function parseTableSchema({ table, ddl = "", indexes = [] }) {
  const columns = [];
  const indexDefs = [];
  const ddlLines = String(ddl || "").split("\n");

  for (const line of ddlLines) {
    const columnMatch = line.match(/^\s*`([^`]+)`\s+([a-zA-Z0-9()]+)(.*)$/);
    if (columnMatch && !/^(primary key|key|unique key|constraint)/i.test(columnMatch[1])) {
      columns.push({
        name: columnMatch[1],
        type: columnMatch[2],
        raw: line.trim()
      });
      continue;
    }

    const primaryMatch = line.match(/primary key\s*\(([^)]+)\)/i);
    if (primaryMatch) {
      indexDefs.push({
        name: "PRIMARY",
        columns: primaryMatch[1].replace(/`/g, "").split(/\s*,\s*/),
        type: "PRIMARY"
      });
      continue;
    }

    const keyMatch = line.match(/(?:unique\s+)?key\s+`([^`]+)`\s*\(([^)]+)\)/i);
    if (keyMatch) {
      indexDefs.push({
        name: keyMatch[1],
        columns: keyMatch[2].replace(/`/g, "").split(/\s*,\s*/),
        type: line.match(/unique\s+key/i) ? "UNIQUE" : "INDEX"
      });
    }
  }

  return {
    table,
    columns,
    indexes: indexes.length > 0 ? indexes : indexDefs
  };
}

export function detectTablesInSql(sql) {
  const text = String(sql || "");
  const tables = [];
  const fromMatch = text.match(/\bfrom\s+([`"]?)([a-zA-Z0-9_.]+)\1/gi) || [];
  const joinMatch = text.match(/\bjoin\s+([`"]?)([a-zA-Z0-9_.]+)\1/gi) || [];

  for (const segment of [...fromMatch, ...joinMatch]) {
    const nameMatch = segment.match(/\b(from|join)\s+([`"]?)([a-zA-Z0-9_.]+)\2/i);
    if (nameMatch) {
      tables.push(nameMatch[3]);
    }
  }

  return [...new Set(tables)];
}

