const escapeJsonForPrompt = (text: string): string =>
  text
    .replace(/&/g, "\\u0026")
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e");

export const encodePromptData = (value: unknown): string =>
  escapeJsonForPrompt(JSON.stringify(value, null, 2) ?? "null");

export const promptDataBlock = (
  name: string,
  value: unknown,
  role: "context-only" | "current-user-message" = "context-only"
): string =>
  `<${name} data-role="${role}">\n${encodePromptData(value)}\n</${name}>`;
