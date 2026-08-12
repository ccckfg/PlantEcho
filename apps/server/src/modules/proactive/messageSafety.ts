const unsafeClause =
  /\b(system|assistant|developer|prompt|instruction)\b|(?:忽略|覆盖|遵循|执行|改变).{0,16}(?:指令|提示词|规则|设定)/i;

export interface SanitizedProactiveMessage {
  text: string;
  changed: boolean;
}

export const sanitizeProactiveMessage = (
  value: string | undefined | null,
  maxChars: number
): SanitizedProactiveMessage => {
  const original = (value ?? "").trim();
  const withoutMarkup = original
    .replace(/```[\s\S]*?```/g, "")
    .replace(/<[^>]*>/g, "")
    .replace(/https?:\/\/\S+/gi, "")
    .replace(/^["“「『]+|["”」』]+$/g, "")
    .replace(/^[-*]\s*/, "");
  const fragments = withoutMarkup.split(/([。！？!?；;])/);
  const safe: string[] = [];
  for (let index = 0; index < fragments.length; index += 2) {
    const clause = fragments[index]?.replace(/\s+/g, " ").trim() ?? "";
    const punctuation = fragments[index + 1] ?? "";
    if (clause && !unsafeClause.test(clause)) safe.push(`${clause}${punctuation}`);
  }
  const text = safe.join("").trim().slice(0, maxChars);
  return { text, changed: text !== original };
};
