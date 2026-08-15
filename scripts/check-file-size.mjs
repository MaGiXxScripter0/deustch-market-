import { readdir, readFile } from "node:fs/promises";
import { extname, resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const includedExtensions = new Set([".ts", ".tsx", ".css", ".sql"]);
const violations = [];

async function visit(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = resolve(directory, entry.name);
    if (entry.isDirectory()) await visit(path);
    else if (includedExtensions.has(extname(entry.name))) {
      const lineCount = (await readFile(path, "utf8")).split(/\r?\n/).length;
      if (lineCount > 500) violations.push({ path: path.slice(root.length + 1), lineCount });
    }
  }
}

await visit(resolve(root, "src"));
await visit(resolve(root, "supabase"));

if (violations.length) {
  for (const violation of violations) {
    console.error(`${violation.path}: ${violation.lineCount} lines`);
  }
  process.exitCode = 1;
} else {
  console.log("All source files are within the 500-line limit.");
}
