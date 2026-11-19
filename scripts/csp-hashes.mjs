// Calcule les empreintes CSP (sha256) des <script> inline de index.html.
// Usage : node scripts/csp-hashes.mjs dist/index.html > csp-script-hashes
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";

const html = readFileSync(process.argv[2], "utf8");
const hashes = [];
for (const match of html.matchAll(/<script\b(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi)) {
  if (!match[1].trim()) continue;
  hashes.push(`'sha256-${createHash("sha256").update(match[1], "utf8").digest("base64")}'`);
}
process.stdout.write(hashes.join(" "));
