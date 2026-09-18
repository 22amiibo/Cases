import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const chunkRoot = join(root, ".next", "static", "chunks");
const markers = [
  {
    class: "activity feedback",
    source: "src/content/activities/alpinefit-exhibit-v3.ts",
    value: "You connected the labor outlier to margin pressure and a focused next cut.",
  },
  {
    class: "evaluation criterion",
    source: "src/content/cases/alpinefit-profitability-v2.ts",
    value: "Connects labor growth to margin pressure",
  },
  {
    class: "completed-case answer",
    source: "src/content/cases/alpinefit-profitability-v2.ts",
    value: "Stabilize staffing in the six high-overtime clubs through faster hiring and targeted retention while tightening overtime controls.",
  },
];

function javascriptFiles(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) return javascriptFiles(path);
    return entry.isFile() && entry.name.endsWith(".js") ? [path] : [];
  });
}

for (const marker of markers) {
  const source = readFileSync(join(root, marker.source), "utf8");
  if (!source.includes(marker.value)) {
    throw new Error(`Answer-secrecy marker is missing from ${marker.source}: ${marker.class}`);
  }
}

if (!existsSync(chunkRoot)) throw new Error("No browser build found. Run npm run build first.");

const chunks = javascriptFiles(chunkRoot);
if (chunks.length === 0) throw new Error("No browser chunks found. Run npm run build first.");

const leaks = [];
for (const chunk of chunks) {
  const body = readFileSync(chunk, "utf8");
  for (const marker of markers) {
    if (body.includes(marker.value)) leaks.push(`${marker.class}: ${chunk}`);
  }
}

if (leaks.length > 0) {
  throw new Error(`Server-only authored material found in browser chunks:\n${leaks.join("\n")}`);
}

console.log(
  `Checked ${chunks.length} browser chunks for ${markers.length} exact server-only authored markers.`,
);
