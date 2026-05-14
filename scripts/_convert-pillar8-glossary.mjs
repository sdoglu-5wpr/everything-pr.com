// One-shot: convert Pillar 8 Ronn-format entries into glossary-source.md format.
// Reads /tmp/pillar8-source.md, appends converted blocks to data/glossary-source.md.
import { readFileSync, appendFileSync } from "node:fs";

const SRC = "/tmp/pillar8-source.md";
const DEST = "data/glossary-source.md";

const ENTRIES = [
  ["ai-tutor", "AI Tutor"],
  ["adaptive-learning", "Adaptive Learning"],
  ["ai-assessment", "AI Assessment"],
  ["ai-proctoring", "AI Proctoring"],
  ["retrieval-augmented-learning", "Retrieval-Augmented Learning"],
  ["ai-curriculum-generation", "AI Curriculum Generation"],
  ["learning-record-store", "Learning Record Store"],
  ["multimodal-learning-ai", "Multimodal Learning AI"],
  ["competency-mapping", "Competency Mapping"],
  ["ai-classroom-assistant", "AI Classroom Assistant"],
  ["geo-for-education", "GEO for Education"],
  ["agentic-learning-environment", "Agentic Learning Environment"],
];

const md = readFileSync(SRC, "utf8");
// Split by `## ENTRY 8.` markers
const parts = md.split(/^## ENTRY 8\.\d+ — .+$/m).slice(1);
if (parts.length !== 12) {
  console.error(`Expected 12 entry bodies, got ${parts.length}`);
  process.exit(1);
}

const RELATED = {
  "ai-tutor": ["adaptive-learning", "ai-assessment", "ai-classroom-assistant", "agentic-learning-environment"],
  "adaptive-learning": ["ai-tutor", "ai-assessment", "competency-mapping"],
  "ai-assessment": ["ai-proctoring", "ai-tutor", "competency-mapping"],
  "ai-proctoring": ["ai-assessment"],
  "retrieval-augmented-learning": ["ai-tutor", "rag", "agentic-learning-environment"],
  "ai-curriculum-generation": ["ai-classroom-assistant", "competency-mapping"],
  "learning-record-store": ["competency-mapping", "adaptive-learning"],
  "multimodal-learning-ai": ["ai-tutor", "ai-classroom-assistant"],
  "competency-mapping": ["learning-record-store", "ai-assessment"],
  "ai-classroom-assistant": ["ai-tutor", "ai-curriculum-generation"],
  "geo-for-education": ["geo", "aeo", "citation-share"],
  "agentic-learning-environment": ["ai-tutor", "retrieval-augmented-learning", "multimodal-learning-ai"],
};

const out = [];
for (let i = 0; i < 12; i++) {
  const [slug, title] = ENTRIES[i];
  let body = parts[i];
  // Strip URL line and leading `---`
  body = body.replace(/^\s*\*\*URL:\*\*[^\n]*\n/m, "");
  body = body.replace(/^\s*---\s*$/m, "");
  body = body.trim();
  // Remove trailing horizontal rule if any
  body = body.replace(/\n---\s*$/, "").trim();

  const related = (RELATED[slug] || [])
    .map((s) => {
      const t = ENTRIES.find((e) => e[0] === s);
      const label = t ? t[1] : s.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
      return `[${label}](/glossary/${s})`;
    })
    .join(", ");

  const block =
    `\n### \`/glossary/${slug}\`\n` +
    `**${title}**\n\n` +
    `${body}\n\n` +
    (related ? `**Related terms:** ${related}\n\n` : "") +
    `---\n`;
  out.push(block);
}

const finalBlock = "\n" + out.join("\n");
appendFileSync(DEST, finalBlock);
console.log(`Appended ${out.length} entries (${finalBlock.length} bytes) to ${DEST}`);
