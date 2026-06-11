import type { QueryParam } from "../types.js";

export const bindPostgresParams = (sql: string): string => {
  let index = 0;
  let inSingleQuote = false;
  let inDoubleQuote = false;

  return [...sql].map((char, offset, chars) => {
    const previous = offset > 0 ? chars[offset - 1] : "";
    if (char === "'" && previous !== "\\" && !inDoubleQuote) {
      inSingleQuote = !inSingleQuote;
      return char;
    }
    if (char === '"' && previous !== "\\" && !inSingleQuote) {
      inDoubleQuote = !inDoubleQuote;
      return char;
    }
    if (char === "?" && !inSingleQuote && !inDoubleQuote) {
      index += 1;
      return `$${index}`;
    }
    return char;
  }).join("");
};

export const normalizeParams = (params: QueryParam[]): QueryParam[] =>
  params.map((value) => typeof value === "boolean" ? Number(value) : value);

export const vectorLiteral = (embedding: number[]): string =>
  `[${embedding.map((value) => Number.isFinite(value) ? value : 0).join(",")}]`;
