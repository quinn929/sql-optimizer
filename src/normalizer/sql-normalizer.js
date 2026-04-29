function protectInLists(sql) {
  return sql.replace(/\bIN\s*\(([^()]+)\)/gi, () => "IN (?)");
}

function replaceQuotedStrings(sql) {
  return sql.replace(/'(?:''|[^'])*'|"(?:\"\"|[^"])*"/g, "?");
}

function replaceNumbers(sql) {
  return sql.replace(/(?<![\w.])\d+(?:\.\d+)?(?![\w.])/g, "?");
}

function stripComments(sql) {
  return sql
    .replace(/\/\*[\s\S]*?\*\//g, " ")
    .replace(/--.*$/gm, " ")
    .replace(/#.*$/gm, " ");
}

function collapseWhitespace(sql) {
  return sql.replace(/\s+/g, " ").trim();
}

export function normalizeSql(sql) {
  const input = String(sql || "");
  const stripped = stripComments(input);
  const withInLists = protectInLists(stripped);
  const withStrings = replaceQuotedStrings(withInLists);
  const withNumbers = replaceNumbers(withStrings);
  return collapseWhitespace(withNumbers);
}

