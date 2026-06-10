import fs from "node:fs/promises";
import path from "node:path";
import { SpreadsheetFile, Workbook } from "@oai/artifact-tool";

const inputPath = path.resolve("provis_real_link_dd_data.json");
const outputDir = path.resolve("outputs", "provis-real-link-dd");
const outputPath = path.join(outputDir, "PROVIS-real-link-due-diligence-batch3.xlsx");

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
const sheets = [...source.sheets, buildVentureTreeNotes(source)];
const workbook = Workbook.create();

function buildVentureTreeNotes(sourceData) {
  const ventureSheet = sourceData.sheets.find((sheet) => sheet.name === "Venture Trees");
  if (!ventureSheet) {
    return { name: "Venture Tree Notes", rows: [["Entity", "Match Confidence", "Layer", "Evidence / Issue", "URL", "Facts / Notes"]] };
  }

  const [headers, ...records] = ventureSheet.rows;
  const index = Object.fromEntries(headers.map((header, i) => [header, i]));
  const value = (row, header) => row[index[header]] || "";
  const rows = [["Entity", "Match Confidence", "Layer", "Evidence / Issue", "URL", "Facts / Notes"]];

  for (const row of records) {
    const entity = value(row, "Entity");
    const confidence = value(row, "Match Confidence");
    const retained = String(value(row, "All Retained URLs"))
      .split(" | ")
      .filter(Boolean);
    const layer1 = value(row, "Layer 1 Canonical Official") || "Not captured yet";
    const layer2 = value(row, "Layer 2 Institutional") || "Not captured yet";
    const layer3 = value(row, "Layer 3 Independent") || "Not captured yet";
    const additional = retained.filter((url) => ![layer1, layer2, layer3].includes(url));

    rows.push([
      entity,
      confidence,
      "Entity summary",
      "Claim / description",
      "",
      `${value(row, "Claim / Description") || "See evidence rows."} Founders: ${value(row, "Founders") || "Not captured."}`,
    ]);
    rows.push([
      entity,
      confidence,
      "Layer 0",
      "Workbook seed URL",
      value(row, "Workbook Seed URL") || "Not captured yet",
      "Seed or prior workbook source used only as the root, not as final proof when stronger destination pages exist.",
    ]);
    rows.push([
      entity,
      confidence,
      "Layer 1",
      "Canonical official URL",
      layer1,
      value(row, "Claim / Description") || "Official/canonical facts pending.",
    ]);
    rows.push([
      entity,
      confidence,
      "Layer 2",
      "Institutional corroboration",
      layer2,
      value(row, "Programs") || "Program/source affiliation captured where available.",
    ]);
    rows.push([
      entity,
      confidence,
      "Layer 3",
      "Independent corroboration",
      layer3,
      "Outside-domain confirmation captured where available.",
    ]);
    if (additional.length) {
      for (const url of additional) {
        rows.push([
          entity,
          confidence,
          "Layer 4",
          "Public/social/media/additional URL",
          url,
          "Additional retained destination evidence.",
        ]);
      }
    } else {
      rows.push([
        entity,
        confidence,
        "Layer 4",
        "Public/social/media/additional URL",
        "Not captured yet",
        "Add public LinkedIn, YouTube, Instagram, X, podcast, registry, demo, or product evidence when available.",
      ]);
    }
    rows.push([
      entity,
      confidence,
      "Unresolveds",
      value(row, "Tree Status") || "Not set",
      "",
      value(row, "Due Diligence Focus") || "No unresolved note captured.",
    ]);
  }

  return { name: "Venture Tree Notes", rows };
}

for (const sheetSpec of sheets) {
  const sheet = workbook.worksheets.add(sheetSpec.name);
  const rows = rectangular(sheetSpec.rows);
  const rowCount = rows.length;
  const colCount = rows[0].length;
  sheet.getRange(`A1:${colName(colCount)}${rowCount}`).values = rows;
}

await fs.mkdir(outputDir, { recursive: true });

const scan = await workbook.inspect({
  kind: "match",
  searchTerm: "#REF!|#DIV/0!|#VALUE!|#NAME\\?|#N/A|google\\.com/search|linkedin\\.com/search|Bounded query|Next Search Queue|site:linkedin\\.com|site:youtube\\.com|site:instagram\\.com|site:x\\.com",
  options: { useRegex: true, maxResults: 100 },
  summary: "real-link due diligence workbook scan",
});

const previewDir = path.join(outputDir, "previews");
await fs.mkdir(previewDir, { recursive: true });
for (const sheetSpec of sheets) {
  const rows = rectangular(sheetSpec.rows);
  const colCount = rows[0].length;
  const renderRows = Math.min(rows.length, 25);
  const image = await workbook.render({
    sheetName: sheetSpec.name,
    range: `A1:${colName(colCount)}${renderRows}`,
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
