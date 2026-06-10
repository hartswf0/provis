import fs from "node:fs/promises";
import path from "node:path";
import { SpreadsheetFile, Workbook } from "@oai/artifact-tool";

const inputPath = path.resolve("provis_204_expanded_real_link_data.json");
const outputDir = path.resolve("outputs", "provis-204-expanded-real-links");
const outputPath = path.join(outputDir, "PROVIS-204-entity-real-link-expansion.xlsx");

function colName(index) {
  let n = index;
  let name = "";
  while (n > 0) {
    const rem = (n - 1) % 26;
    name = String.fromCharCode(65 + rem) + name;
    n = Math.floor((n - 1) / 26);
  }
  return name;
}

function rectangular(rows) {
  const width = Math.max(...rows.map((row) => row.length));
  return rows.map((row) => {
    const next = row.map((value) => value ?? "");
    while (next.length < width) next.push("");
    return next;
  });
}

function contextSummary(context) {
  return Object.entries(context || {})
    .filter(([, value]) => value)
    .map(([key, value]) => `${key}: ${value}`)
    .join(" | ");
}

const source = JSON.parse(await fs.readFile(inputPath, "utf8"));

const sheets = [
  {
    name: "Summary",
    rows: [
      ["Metric", "Value"],
      ["Total source workbook entities", source.summary.total_entities],
      ["Real destination evidence rows", source.summary.total_evidence_rows],
      ["Entities meeting 10-link target", source.summary.entities_meeting_10],
      ["Entities with zero verified links", source.summary.entities_with_zero],
      ["Entities with 1-3 verified links", source.summary.entities_with_1_to_3],
      ["Entities with 4-9 verified links", source.summary.entities_with_4_to_9],
      ["Interpretation", "10 real links is the target quota, not a license to pad. Rows below target carry explicit gap reasons."],
    ],
  },
  {
    name: "204 Entity Quota",
    rows: [
      [
        "Entity",
        "Entity Type",
        "Verified Link Count",
        "Target Links",
        "Gap To Target",
        "Coverage Status",
        "Gap Reason",
        "Verified URLs",
        "Source Context",
      ],
      ...source.quota.map((row) => [
        row.entity,
        row.entity_type,
        row.current_verified_links,
        row.target_links,
        row.gap_to_target,
        row.coverage_status,
        row.gap_reason,
        row.verified_urls.join(" | "),
        contextSummary(row.context),
      ]),
    ],
  },
  {
    name: "Real Evidence Rows",
    rows: [
      [
        "Entity",
        "Entity Type",
        "URL",
        "Evidence Type",
        "Source Title",
        "Extracted Facts",
        "Matching Fields",
        "Confidence",
        "Source Pass",
        "Unresolved Gap",
      ],
      ...source.evidence_rows.map((row) => [
        row.entity,
        row.entity_type,
        row.url,
        row.evidence_type,
        row.source_title,
        row.extracted_facts,
        row.matching_fields,
        row.confidence,
        row.source_pass,
        row.unresolved_gap,
      ]),
    ],
  },
  {
    name: "Gap Rules",
    rows: [["Rule", "Implementation"], ...source.rules],
  },
  {
    name: "Agent Pass Log",
    rows: [
      ["Pass", "Scope", "Disposition"],
      ["Agent A", "Ventures: The Elephant Room through Misfit Adventure", "Merged verified destination rows; no search-result pages retained."],
      ["Agent B", "Ventures: Pi9eon through Safe Squeeze Headgear", "Merged verified destination rows; sparse student-venture gaps retained."],
      ["Agent C", "Ventures: Subscription Intern through HackATL", "Merged verified destination rows; SanoTOUCH remained unresolved, no fake URL added."],
      ["Agent D", "Exact 21 workbook organizations", "Merged official organization pages and CEI report corroboration."],
      ["Agent E", "Selected public faculty/profile people", "Merged four verified Goizueta faculty profile pages."],
      ["Agent F", "Selected founder/alumni luminary people", "Returned no defensible rows after interruption; no weak same-name rows added."],
    ],
  },
];

const workbook = Workbook.create();
for (const sheetSpec of sheets) {
  const sheet = workbook.worksheets.add(sheetSpec.name);
  const rows = rectangular(sheetSpec.rows);
  const range = `A1:${colName(rows[0].length)}${rows.length}`;
  sheet.getRange(range).values = rows;
}

await fs.mkdir(outputDir, { recursive: true });

const scan = await workbook.inspect({
  kind: "match",
  searchTerm: "#REF!|#DIV/0!|#VALUE!|#NAME\\?|#N/A|google\\.com/search|linkedin\\.com/search|Bounded query|Next Search Queue|site:linkedin\\.com|site:youtube\\.com|site:instagram\\.com|site:x\\.com|arxiv\\.org/abs/2602\\.01634",
  options: { useRegex: true, maxResults: 100 },
  summary: "expanded real-link workbook scan",
});

const previewDir = path.join(outputDir, "previews");
await fs.mkdir(previewDir, { recursive: true });
for (const sheetSpec of sheets) {
  const rows = rectangular(sheetSpec.rows);
  const renderRows = Math.min(rows.length, 25);
  const image = await workbook.render({
    sheetName: sheetSpec.name,
    range: `A1:${colName(rows[0].length)}${renderRows}`,
    scale: 1,
  });
  await fs.writeFile(
    path.join(previewDir, `${sheetSpec.name.replaceAll(/[^A-Za-z0-9]+/g, "-")}.png`),
    Buffer.from(await image.arrayBuffer()),
  );
}

const output = await SpreadsheetFile.exportXlsx(workbook);
await output.save(outputPath);

console.log(JSON.stringify({
  outputPath,
  sheets: sheets.map((sheet) => ({
    sheet: sheet.name,
    rows: sheet.rows.length - 1,
    cols: sheet.rows[0].length,
  })),
  scan: scan.ndjson,
}, null, 2));
