import fs from "node:fs/promises";
import path from "node:path";
import { SpreadsheetFile, Workbook } from "@oai/artifact-tool";

const inputPath = path.resolve("provis_real_data_only.json");
const outputDir = path.resolve("outputs", "provis-real-data-only");
const outputPath = path.join(outputDir, "PROVIS-real-data-only.xlsx");

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

const source = JSON.parse(await fs.readFile(inputPath, "utf8"));
const workbook = Workbook.create();

for (const sheetSpec of source.sheets) {
  const sheet = workbook.worksheets.add(sheetSpec.name);
  const rows = rectangular(sheetSpec.rows);
  const rowCount = rows.length;
  const colCount = rows[0].length;
  const range = `A1:${colName(colCount)}${rowCount}`;
  sheet.getRange(range).values = rows;
}

await fs.mkdir(outputDir, { recursive: true });

const errors = await workbook.inspect({
  kind: "match",
  searchTerm: "#REF!|#DIV/0!|#VALUE!|#NAME\\?|#N/A|google\\.com/search|linkedin\\.com/search|Bounded query|Next Search Queue",
  options: { useRegex: true, maxResults: 100 },
  summary: "final workbook scan",
});

const previewDir = path.join(outputDir, "previews");
await fs.mkdir(previewDir, { recursive: true });
for (const sheetSpec of source.sheets) {
  const rows = rectangular(sheetSpec.rows);
  const colCount = rows[0].length;
  const renderRows = Math.min(rows.length, 25);
  const renderRange = `A1:${colName(colCount)}${renderRows}`;
  const image = await workbook.render({ sheetName: sheetSpec.name, range: renderRange, scale: 1 });
  await fs.writeFile(
    path.join(previewDir, `${sheetSpec.name.replaceAll(/[^A-Za-z0-9]+/g, "-")}.png`),
    Buffer.from(await image.arrayBuffer()),
  );
}

const output = await SpreadsheetFile.exportXlsx(workbook);
await output.save(outputPath);

console.log(JSON.stringify({
  outputPath,
  sheets: source.meta,
  scan: errors.ndjson,
}, null, 2));
