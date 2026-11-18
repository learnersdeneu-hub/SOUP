// Minimal front-matter parser for content/guides/*.md. It deliberately
// supports only the subset those files use (top-level `key: value` scalars,
// optionally double-quoted, and `key:` followed by `  - item` lists) rather
// than pulling in a full YAML dependency for a handful of editorial fields.
// Anything outside that subset throws, so a malformed file fails the build
// and the guides tests instead of silently publishing with missing metadata.

export type FrontMatterValue = string | string[];
export type FrontMatter = Record<string, FrontMatterValue>;

const FENCE = "---";

function unquote(raw: string) {
  const value = raw.trim();
  if (value.length >= 2 && value.startsWith("\"") && value.endsWith("\"")) {
    return value.slice(1, -1).replace(/\\"/g, "\"");
  }
  return value;
}

export function parseFrontMatter(source: string): { data: FrontMatter; body: string } {
  const lines = source.replace(/\r\n/g, "\n").split("\n");
  if (lines[0]?.trim() !== FENCE) throw new Error("Guide is missing its opening front-matter fence (---).");
  const end = lines.findIndex((line, index) => index > 0 && line.trim() === FENCE);
  if (end === -1) throw new Error("Guide is missing its closing front-matter fence (---).");

  const data: FrontMatter = {};
  let listKey: string | null = null;

  for (const [offset, line] of lines.slice(1, end).entries()) {
    if (!line.trim()) continue;
    const item = line.match(/^\s+-\s+(.*)$/);
    if (item) {
      if (!listKey) throw new Error(`Front-matter line ${offset + 2}: list item without a list key.`);
      (data[listKey] as string[]).push(unquote(item[1]));
      continue;
    }
    const pair = line.match(/^([A-Za-z_][A-Za-z0-9_]*):\s*(.*)$/);
    if (!pair) throw new Error(`Front-matter line ${offset + 2} is not a supported "key: value" line.`);
    const [, key, rawValue] = pair;
    if (rawValue.trim() === "") {
      data[key] = [];
      listKey = key;
    } else {
      data[key] = unquote(rawValue);
      listKey = null;
    }
  }

  return { data, body: lines.slice(end + 1).join("\n").replace(/^\n+/, "") };
}
