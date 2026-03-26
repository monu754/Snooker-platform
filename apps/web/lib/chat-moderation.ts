import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const moduleDir = path.dirname(fileURLToPath(import.meta.url));
const abusiveWordsPath = path.join(moduleDir, "chat-abusive-words.txt");

const abusiveWords = fs
  .readFileSync(abusiveWordsPath, "utf8")
  .split(/\r?\n/)
  .map((line) => line.trim().toLowerCase())
  .filter(Boolean);

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

const abusiveWordPatterns = abusiveWords.map((word) => ({
  word,
  pattern: new RegExp(
    `(^|[^a-z0-9])(${escapeRegex(word)
      .replace(/\\\*/g, "[a-z]*")
      .replace(/[aeios]/gi, (char) => `[${char}${char === "a" ? "4@*" : char === "e" ? "3*" : char === "i" ? "1!*" : char === "o" ? "0*" : "5$*"}]`)
      .replace(/u/gi, "[uuv*]")
      .replace(/l/gi, "[l1i]")
      .replace(/g/gi, "[g69]")
      .replace(/t/gi, "[t7+]")})(?=[^a-z0-9]|$)`,
    "gi",
  ),
}));

export function sanitizeChatText(text: string) {
  return abusiveWordPatterns.reduce(
    (next, entry) => next.replace(entry.pattern, (_match, prefix) => `${prefix}****`),
    text,
  );
}

export function getAbusiveWords() {
  return [...abusiveWords];
}
