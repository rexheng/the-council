/**
 * Must be imported before any module that constructs Anthropic clients.
 * ES modules hoist imports, but sibling imports run in source order — this file runs first.
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = import.meta.dirname ?? dirname(fileURLToPath(import.meta.url));

function loadEnvSilent(path: string) {
  try {
    const content = readFileSync(path, "utf-8");
    for (const line of content.split("\n")) {
      const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
      if (match) {
        const k = match[1];
        const v = match[2].trim();
        if (k && !process.env[k]) process.env[k] = v;
      }
    }
  } catch {
    // .env file not found — expected in some setups
  }
}

loadEnvSilent(join(__dirname, "../../.env"));
loadEnvSilent(join(__dirname, "../.env"));
