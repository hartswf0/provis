import fs from "node:fs/promises";
import path from "node:path";
import { FileBlob, SpreadsheetFile } from "@oai/artifact-tool";

const sourceWorkbook = "/Users/gaia/Downloads/PROVIS-PUBLIC-LINK-REGISTER (1).xlsx";
const expandedWorkbook = path.resolve("outputs", "provis-204-expanded-real-links", "PROVIS-204-entity-real-link-expansion.xlsx");
const ventureJsonPath = path.resolve("outputs", "provis-venture-json", "PROVIS-21-venture-records.json");
const outputDir = path.resolve("outputs", "provis-mobile-index");
const dataPath = path.join(outputDir, "provis-index-data.json");
const htmlPath = path.join(outputDir, "index.html");

function clean(value) {
  if (value == null) return "";
  return String(value).trim();
}

function slug(value) {
  return clean(value).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

function safeJson(value) {
  return JSON.stringify(value).replaceAll("</", "<\\/");
}

function rowsToObjects(rows) {
  const [headers, ...data] = rows;
  return data
    .filter((row) => row.some((cell) => clean(cell)))
    .map((row) => Object.fromEntries(headers.map((header, index) => [clean(header), clean(row[index])])));
}

async function sheetRows(workbookPath, sheetName) {
  const input = await FileBlob.load(workbookPath);
  const workbook = await SpreadsheetFile.importXlsx(input);
  const sheet = workbook.worksheets.getItem(sheetName);
  const usedRange = sheet.getUsedRange();
  return usedRange.values;
}

function normalizeSourceType(type) {
  const t = clean(type).toLowerCase();
  if (t.includes("official")) return "official";
  if (t.includes("press") || t.includes("podcast")) return "independent";
  if (t.includes("program") || t.includes("university") || t.includes("institution") || t.includes("roster")) return "institutional";
  if (t.includes("github") || t.includes("docs") || t.includes("product")) return "artifact";
  return "source";
}

const [peopleRows, ventureRows, orgRows, quotaRows, evidenceRows, ventureRecordsRaw] = await Promise.all([
  sheetRows(sourceWorkbook, "People (162)"),
  sheetRows(sourceWorkbook, "Ventures (21)"),
  sheetRows(sourceWorkbook, "Organizations (21)"),
  sheetRows(expandedWorkbook, "204 Entity Quota"),
  sheetRows(expandedWorkbook, "Real Evidence Rows"),
  fs.readFile(ventureJsonPath, "utf8").then(JSON.parse),
]);

const people = rowsToObjects(peopleRows).map((row) => {
  const name = `${row["First name"]} ${row["Last name"]}`.trim();
  return {
    id: `person-${slug(name)}`,
    entity_type: "Person",
    name,
    role_type: row["Role type"],
    role_detail: row["Role detail"],
    venture_program: row["Venture / program"],
    class_year: row["Class year"],
    registry: row.Registry,
    verification_status: row["Verification status"],
    seed_url: row["Evidence URL (raw, fetched 2026-06-09)"],
    secondary_url: row["Secondary evidence URL"],
    notes: row["Notes / reconciliation flags"],
  };
});

const ventures = rowsToObjects(ventureRows).map((row) => ({
  id: `venture-${slug(row.Venture)}`,
  entity_type: "Venture",
  name: row.Venture,
  description: row.Description,
  sector: row.Sector,
  affiliation_evidence: row["Affiliation evidence (as printed)"],
  named_founders: row["Named founders"],
  programs: row.Programs,
  verification_status: row["Verification status"],
  seed_url: row["Evidence URL (raw)"],
}));

const organizations = rowsToObjects(orgRows).map((row) => ({
  id: `org-${slug(row.Organization)}`,
  entity_type: "Organization",
  name: row.Organization,
  type: row.Type,
  geography: row.Geography,
  relationship_to_cei: row["Relationship to CEI (as sourced)"],
  partner_type: row["Partner type"],
  verification_status: row["Verification status"],
  official_website: row["Official website (raw)"],
  evidence_url: row["Evidence URL (raw)"],
}));

const quota = rowsToObjects(quotaRows).map((row) => ({
  entity: row.Entity,
  entity_type: row["Entity Type"],
  verified_link_count: Number(row["Verified Link Count"] || 0),
  target_links: Number(row["Target Links"] || 10),
  gap_to_target: Number(row["Gap To Target"] || 0),
  coverage_status: row["Coverage Status"],
  gap_reason: row["Gap Reason"],
  verified_urls: row["Verified URLs"] ? row["Verified URLs"].split(" | ").filter(Boolean) : [],
  source_context: row["Source Context"],
}));

const evidence = rowsToObjects(evidenceRows).map((row, index) => ({
  id: `evidence-${index + 1}`,
  entity: row.Entity,
  entity_type: row["Entity Type"],
  url: row.URL,
  evidence_type: row["Evidence Type"],
  source_group: normalizeSourceType(row["Evidence Type"]),
  source_title: row["Source Title"],
  extracted_facts: row["Extracted Facts"],
  matching_fields: row["Matching Fields"],
  confidence: row.Confidence,
  source_pass: row["Source Pass"],
  unresolved_gap: row["Unresolved Gap"],
}));

const ventureRecords = ventureRecordsRaw.records.map((record) => record.provis_record);
const ventureRecordByName = Object.fromEntries(ventureRecords.map((record) => [record.target.name, record]));
const quotaByName = Object.fromEntries(quota.map((row) => [row.entity, row]));
const evidenceByEntity = Object.groupBy(evidence, (row) => row.entity);

const ventureIndex = ventures.map((venture) => {
  const record = ventureRecordByName[venture.name];
  const q = quotaByName[venture.name];
  return {
    ...venture,
    verified_link_count: q?.verified_link_count || 0,
    gap_to_target: q?.gap_to_target ?? 10,
    coverage_status: q?.coverage_status || "Not expanded",
    gap_reason: q?.gap_reason || "",
    evidence_rows: evidenceByEntity[venture.name] || [],
    record_status: record?.target.record_status || "",
    record_confidence: record?.target.confidence || "",
    strongest_bear_case: record?.venture_diagnosis?.strongest_bear_case || "",
    salvageable_truth: record?.venture_diagnosis?.salvageable_truth || "",
    problems: record?.venture_problem_list || [],
    risks: record?.risk_forms || [],
    uncertainties: record?.uncertainty_forms || [],
    source_base: record?.source_base || [],
    source_gap_report: {
      verified_links_found: `${q?.verified_link_count || 0}/10`,
      missing_layers: record?.venture_diagnosis?.next_probe || [],
    },
  };
});

const founderIndex = people.map((person) => ({
  ...person,
  linked_ventures: ventures.filter((venture) => clean(venture.named_founders).includes(person.name)).map((venture) => venture.name),
  evidence_rows: evidenceByEntity[person.name] || [],
  quota: quotaByName[person.name] || null,
}));

const organizationIndex = organizations.map((org) => ({
  ...org,
  evidence_rows: evidenceByEntity[org.name] || [],
  quota: quotaByName[org.name] || null,
}));

const summary = {
  generated_at: "2026-06-10",
  source_workbook: sourceWorkbook,
  people_count: people.length,
  venture_count: ventures.length,
  organization_count: organizations.length,
  quota_entity_count: quota.length,
  evidence_count: evidence.length,
  venture_records_count: ventureRecords.length,
  entities_meeting_10_links: quota.filter((row) => row.verified_link_count >= 10).length,
  highest_coverage: quota
    .toSorted((a, b) => b.verified_link_count - a.verified_link_count || a.entity.localeCompare(b.entity))
    .slice(0, 10)
    .map((row) => ({ entity: row.entity, type: row.entity_type, links: row.verified_link_count })),
};

const protocol = {
  title: "PROVIS v0.2",
  subtitle: "Founder Cross-Link Due Diligence / Public-Link Register Engine",
  mantra: [
    "Do not make a startup card. Make a venture problem record.",
    "Do not trust the pitch. Bind the claim.",
    "Do not infer the founder. Prove the relationship.",
    "Do not hide missing links. Name the source gap.",
    "Do not collect private dirt. Stay public, professional, bounded, and traceable.",
  ],
  core_law: [
    "No claim without a source.",
    "No founder-startup relationship without source-backed evidence.",
    "No search page counts as final evidence; capture destination pages only.",
    "No padding with near-duplicate links.",
    "No uncertainty collapsed into fact.",
    "No private, sensitive, protected, login-gated, paywalled, or unrelated personal data collected.",
  ],
  workbook_tabs: [
    "Summary",
    "Entity Index",
    "Venture Case Files",
    "Founder Cross-Link Profiles",
    "Relationship Edges",
    "Evidence Base",
    "Claims Register",
    "SOAPP Fits",
    "Venture Problem List",
    "Contradictions",
    "Risk Register",
    "Source Gap Report",
    "Critique Genomes",
    "Search and Probe Log",
    "Safety Rejections",
  ],
};

const data = {
  summary,
  protocol,
  ventures: ventureIndex,
  founders: founderIndex,
  organizations: organizationIndex,
  quota,
  evidence,
  venture_records: ventureRecords,
};

const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
  <title>PROVIS Mobile Index</title>
  <style>
    :root {
      color-scheme: light;
      --bg: #f7f8fb;
      --panel: #ffffff;
      --ink: #15181f;
      --muted: #5a6475;
      --line: #d8deea;
      --accent: #1457d9;
      --accent-soft: #e8efff;
      --risk: #b42318;
      --warn: #a15c00;
      --ok: #087443;
      --shadow: 0 1px 3px rgba(20, 25, 36, 0.08);
      font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      background: var(--bg);
      color: var(--ink);
      line-height: 1.45;
    }
    a { color: var(--accent); text-decoration: none; overflow-wrap: anywhere; }
    a:hover { text-decoration: underline; }
    .shell { max-width: 1180px; margin: 0 auto; padding: 16px; }
    header {
      padding: 18px 0 14px;
      display: grid;
      gap: 10px;
    }
    h1 { margin: 0; font-size: clamp(1.55rem, 4vw, 2.55rem); line-height: 1.05; letter-spacing: 0; }
    h2 { margin: 0; font-size: 1.05rem; }
    h3 { margin: 0; font-size: .98rem; }
    p { margin: 0; }
    .sub { color: var(--muted); max-width: 78ch; }
    .toolbar {
      position: sticky;
      top: 0;
      z-index: 10;
      background: rgba(247, 248, 251, 0.96);
      backdrop-filter: blur(10px);
      padding: 10px 0;
      border-bottom: 1px solid var(--line);
      display: grid;
      gap: 10px;
    }
    .search {
      width: 100%;
      min-height: 44px;
      border: 1px solid var(--line);
      border-radius: 8px;
      padding: 0 12px;
      font-size: 16px;
      background: #fff;
      color: var(--ink);
    }
    .tabs {
      display: flex;
      overflow-x: auto;
      gap: 8px;
      padding-bottom: 2px;
      scrollbar-width: thin;
    }
    .tab {
      border: 1px solid var(--line);
      background: #fff;
      color: var(--ink);
      border-radius: 8px;
      padding: 9px 12px;
      font-size: .92rem;
      white-space: nowrap;
      min-height: 40px;
    }
    .tab[aria-selected="true"] {
      background: var(--accent);
      color: #fff;
      border-color: var(--accent);
    }
    .metrics {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 10px;
      margin: 14px 0;
    }
    .metric, .card, .detail, .protocol {
      background: var(--panel);
      border: 1px solid var(--line);
      border-radius: 8px;
      box-shadow: var(--shadow);
    }
    .metric { padding: 12px; }
    .metric .num { font-size: 1.4rem; font-weight: 750; }
    .metric .label { color: var(--muted); font-size: .82rem; }
    .grid {
      display: grid;
      grid-template-columns: minmax(0, 1fr);
      gap: 12px;
      margin: 14px 0 32px;
    }
    .card {
      padding: 13px;
      display: grid;
      gap: 10px;
    }
    .card-head {
      display: flex;
      justify-content: space-between;
      align-items: start;
      gap: 10px;
    }
    .card-title { font-weight: 750; font-size: 1.02rem; }
    .pill-row { display: flex; flex-wrap: wrap; gap: 6px; }
    .pill {
      display: inline-flex;
      align-items: center;
      min-height: 26px;
      border-radius: 999px;
      background: var(--accent-soft);
      color: #123a86;
      padding: 4px 8px;
      font-size: .78rem;
      font-weight: 650;
    }
    .pill.warn { background: #fff4df; color: var(--warn); }
    .pill.risk { background: #ffebe8; color: var(--risk); }
    .pill.ok { background: #e8f7ee; color: var(--ok); }
    .muted { color: var(--muted); }
    .small { font-size: .86rem; }
    .clamp {
      display: -webkit-box;
      -webkit-line-clamp: 3;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }
    details {
      border-top: 1px solid var(--line);
      padding-top: 8px;
    }
    summary {
      cursor: pointer;
      min-height: 34px;
      display: flex;
      align-items: center;
      color: var(--accent);
      font-weight: 700;
    }
    .list { display: grid; gap: 8px; padding: 4px 0 0; }
    .evidence-item {
      border-left: 3px solid var(--line);
      padding-left: 9px;
      display: grid;
      gap: 3px;
    }
    .protocol {
      padding: 14px;
      display: grid;
      gap: 14px;
    }
    .protocol ol, .protocol ul { margin: 0; padding-left: 20px; }
    .protocol li { margin: 4px 0; }
    .empty {
      padding: 22px;
      text-align: center;
      color: var(--muted);
      border: 1px dashed var(--line);
      border-radius: 8px;
      background: #fff;
    }
    @media (min-width: 760px) {
      .shell { padding: 22px; }
      .toolbar { grid-template-columns: 320px 1fr; align-items: center; }
      .metrics { grid-template-columns: repeat(6, minmax(0, 1fr)); }
      .grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
    }
    @media (min-width: 1040px) {
      .grid { grid-template-columns: repeat(3, minmax(0, 1fr)); }
    }
  </style>
</head>
<body>
  <div class="shell">
    <header>
      <h1>PROVIS Mobile Index</h1>
      <p class="sub">Problem-oriented venture records with source-bound evidence, founder edges, gaps, risks, and critique prompts. Built from the public-link register and expanded PROVIS evidence outputs.</p>
    </header>
    <section class="metrics" id="metrics"></section>
    <nav class="toolbar" aria-label="Index controls">
      <input id="search" class="search" type="search" placeholder="Search ventures, founders, sources, risks..." />
      <div class="tabs" role="tablist">
        <button class="tab" data-view="ventures" aria-selected="true">Ventures</button>
        <button class="tab" data-view="founders">Founders</button>
        <button class="tab" data-view="organizations">Organizations</button>
        <button class="tab" data-view="evidence">Evidence</button>
        <button class="tab" data-view="problems">Problems</button>
        <button class="tab" data-view="protocol">Protocol</button>
      </div>
    </nav>
    <main id="content"></main>
  </div>
  <script id="provis-data" type="application/json">${safeJson(data)}</script>
  <script>
    const DATA = JSON.parse(document.getElementById("provis-data").textContent);
    const state = { view: "ventures", query: "" };
    const content = document.getElementById("content");
    const search = document.getElementById("search");
    const tabs = [...document.querySelectorAll(".tab")];

    function esc(value) {
      return String(value ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
    }
    function link(url, label = url) {
      return url ? '<a href="' + esc(url) + '" target="_blank" rel="noopener noreferrer">' + esc(label) + '</a>' : "";
    }
    function includesQuery(item) {
      if (!state.query) return true;
      return JSON.stringify(item).toLowerCase().includes(state.query.toLowerCase());
    }
    function countPill(count, target = 10) {
      const cls = count >= target ? "ok" : count >= 4 ? "warn" : "risk";
      return '<span class="pill ' + cls + '">' + count + '/' + target + ' links</span>';
    }
    function metric(label, value) {
      return '<div class="metric"><div class="num">' + esc(value) + '</div><div class="label">' + esc(label) + '</div></div>';
    }
    function renderMetrics() {
      const s = DATA.summary;
      document.getElementById("metrics").innerHTML = [
        metric("People", s.people_count),
        metric("Ventures", s.venture_count),
        metric("Organizations", s.organization_count),
        metric("Evidence Rows", s.evidence_count),
        metric("PROVIS Records", s.venture_records_count),
        metric("10-Link Complete", s.entities_meeting_10_links),
      ].join("");
    }
    function renderVentures() {
      const rows = DATA.ventures.filter(includesQuery);
      content.innerHTML = rows.length ? '<section class="grid">' + rows.map(v => {
        const evidence = (v.evidence_rows || []).slice(0, 5).map(e =>
          '<div class="evidence-item small">' + link(e.url, e.source_title || e.evidence_type) +
          '<div class="muted">' + esc(e.evidence_type) + ' · ' + esc(e.confidence) + '</div></div>'
        ).join("");
        const problems = (v.problems || []).slice(0, 5).map(p =>
          '<div class="evidence-item small"><strong>' + esc(p.title) + '</strong><div class="muted">' + esc(p.problem_type) + ' · ' + esc(p.severity) + '</div></div>'
        ).join("");
        return '<article class="card">' +
          '<div class="card-head"><div><div class="card-title">' + esc(v.name) + '</div><div class="muted small">' + esc(v.sector || v.record_status) + '</div></div>' + countPill(v.verified_link_count) + '</div>' +
          '<p class="small clamp">' + esc(v.description || v.strongest_bear_case) + '</p>' +
          '<div class="pill-row"><span class="pill">' + esc(v.record_status || "status unknown") + '</span><span class="pill">' + esc(v.record_confidence || "confidence unknown") + '</span></div>' +
          '<details><summary>Evidence</summary><div class="list">' + (evidence || '<div class="muted small">No evidence rows.</div>') + '</div></details>' +
          '<details><summary>Problems</summary><div class="list">' + (problems || '<div class="muted small">No problems recorded.</div>') + '</div></details>' +
          '<details><summary>Bear case</summary><p class="small">' + esc(v.strongest_bear_case || "No critique generated.") + '</p></details>' +
          '</article>';
      }).join("") + '</section>' : '<div class="empty">No matching ventures.</div>';
    }
    function renderFounders() {
      const rows = DATA.founders.filter(includesQuery);
      content.innerHTML = rows.length ? '<section class="grid">' + rows.map(f => (
        '<article class="card">' +
        '<div class="card-head"><div><div class="card-title">' + esc(f.name) + '</div><div class="muted small">' + esc(f.role_type) + '</div></div>' +
        '<span class="pill">' + esc(f.class_year || "no class") + '</span></div>' +
        '<p class="small clamp">' + esc(f.role_detail || f.venture_program) + '</p>' +
        '<div class="pill-row">' + (f.linked_ventures || []).map(v => '<span class="pill">' + esc(v) + '</span>').join("") + '</div>' +
        '<details><summary>Evidence links</summary><div class="list small">' +
        (f.seed_url ? '<div>' + link(f.seed_url, "Seed evidence") + '</div>' : '') +
        (f.secondary_url ? '<div>' + link(f.secondary_url, "Secondary evidence") + '</div>' : '') +
        '<div class="muted">Next probe: public professional profile, company team page, GitHub, YouTube, publications, patents, or speaker page.</div>' +
        '</div></details></article>'
      )).join("") + '</section>' : '<div class="empty">No matching founders.</div>';
    }
    function renderOrganizations() {
      const rows = DATA.organizations.filter(includesQuery);
      content.innerHTML = rows.length ? '<section class="grid">' + rows.map(o => (
        '<article class="card"><div class="card-head"><div><div class="card-title">' + esc(o.name) + '</div><div class="muted small">' + esc(o.type) + '</div></div>' +
        countPill(o.quota?.verified_link_count || 0) + '</div>' +
        '<p class="small">' + esc(o.relationship_to_cei || o.geography) + '</p>' +
        '<div class="list small">' + (o.official_website ? '<div>' + link(o.official_website, "Official website") + '</div>' : '') +
        (o.evidence_url ? '<div>' + link(o.evidence_url, "Evidence URL") + '</div>' : '') + '</div></article>'
      )).join("") + '</section>' : '<div class="empty">No matching organizations.</div>';
    }
    function renderEvidence() {
      const rows = DATA.evidence.filter(includesQuery);
      content.innerHTML = rows.length ? '<section class="grid">' + rows.map(e => (
        '<article class="card"><div class="card-head"><div><div class="card-title">' + esc(e.entity) + '</div><div class="muted small">' + esc(e.entity_type) + ' · ' + esc(e.evidence_type) + '</div></div>' +
        '<span class="pill">' + esc(e.confidence || "confidence") + '</span></div>' +
        '<p class="small">' + link(e.url, e.source_title || e.url) + '</p>' +
        '<p class="small clamp">' + esc(e.extracted_facts) + '</p></article>'
      )).join("") + '</section>' : '<div class="empty">No matching evidence.</div>';
    }
    function renderProblems() {
      const problems = DATA.ventures.flatMap(v => (v.problems || []).map(p => ({ venture: v.name, ...p }))).filter(includesQuery);
      content.innerHTML = problems.length ? '<section class="grid">' + problems.map(p => (
        '<article class="card"><div class="card-head"><div><div class="card-title">' + esc(p.venture) + '</div><div class="muted small">' + esc(p.problem_type) + '</div></div>' +
        '<span class="pill risk">' + esc(p.severity || "severity") + '</span></div>' +
        '<h3>' + esc(p.title) + '</h3>' +
        '<p class="small clamp">' + esc(p.why_it_matters || p.working_diagnosis || "") + '</p>' +
        '<details><summary>Next probe</summary><ul class="small">' + (p.next_probe || []).map(x => '<li>' + esc(x) + '</li>').join("") + '</ul></details></article>'
      )).join("") + '</section>' : '<div class="empty">No matching problems.</div>';
    }
    function renderProtocol() {
      content.innerHTML = '<section class="protocol">' +
        '<div><h2>' + esc(DATA.protocol.title) + '</h2><p class="muted">' + esc(DATA.protocol.subtitle) + '</p></div>' +
        '<div><h3>Core Law</h3><ul>' + DATA.protocol.core_law.map(x => '<li>' + esc(x) + '</li>').join("") + '</ul></div>' +
        '<div><h3>Operating Mantra</h3><ul>' + DATA.protocol.mantra.map(x => '<li>' + esc(x) + '</li>').join("") + '</ul></div>' +
        '<div><h3>Workbook Architecture</h3><ol>' + DATA.protocol.workbook_tabs.map(x => '<li>' + esc(x) + '</li>').join("") + '</ol></div>' +
        '</section>';
    }
    function render() {
      tabs.forEach(tab => tab.setAttribute("aria-selected", String(tab.dataset.view === state.view)));
      if (state.view === "ventures") renderVentures();
      if (state.view === "founders") renderFounders();
      if (state.view === "organizations") renderOrganizations();
      if (state.view === "evidence") renderEvidence();
      if (state.view === "problems") renderProblems();
      if (state.view === "protocol") renderProtocol();
    }
    tabs.forEach(tab => tab.addEventListener("click", () => { state.view = tab.dataset.view; render(); }));
    search.addEventListener("input", () => { state.query = search.value.trim(); render(); });
    renderMetrics();
    render();
  </script>
</body>
</html>`;

const cockpitHtml = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
  <title>PROVIS Case Cockpit</title>
  <style>
    :root {
      color-scheme: light;
      --bg: #FFFFFF;
      --fg: #000000;
      --border: #000000;
      font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    }
    * { box-sizing: border-box; }
    html { background: var(--bg); color: var(--fg); }
    body {
      margin: 0;
      background: var(--bg);
      color: var(--fg);
      font-size: 16px;
      line-height: 1.35;
      letter-spacing: 0;
    }
    button, input, select, textarea {
      font: inherit;
      color: var(--fg);
      background: var(--bg);
      border: 1px solid var(--border);
      border-radius: 0;
      min-height: 44px;
    }
    button {
      cursor: pointer;
      text-align: left;
      padding: 10px;
      font-weight: 800;
      text-transform: uppercase;
    }
    button:focus-visible, a:focus-visible, select:focus-visible, textarea:focus-visible, input:focus-visible {
      outline: 3px solid var(--fg);
      outline-offset: 2px;
    }
    a { color: var(--fg); text-decoration: underline; text-decoration-thickness: 2px; }
    .topbar, .bottombar {
      position: fixed;
      left: 0;
      right: 0;
      z-index: 10;
      background: var(--bg);
      color: var(--fg);
      border-color: var(--border);
      border-style: solid;
    }
    .topbar {
      top: 0;
      display: grid;
      grid-template-columns: 1fr 1.4fr 1fr;
      border-width: 0 0 2px;
      min-height: 56px;
    }
    .topbar button, .topbar div {
      border: 0;
      border-right: 1px solid var(--border);
      display: flex;
      align-items: center;
      justify-content: center;
      min-width: 0;
      padding: 8px;
      text-align: center;
      font-size: 12px;
      line-height: 1.1;
      font-weight: 900;
      overflow-wrap: anywhere;
    }
    .topbar button:last-child { border-right: 0; }
    .bottombar {
      bottom: 0;
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      border-width: 2px 0 0;
      padding-bottom: env(safe-area-inset-bottom);
    }
    .bottombar button {
      min-height: 58px;
      border: 0;
      border-right: 1px solid var(--border);
      text-align: center;
      font-size: 12px;
    }
    .bottombar button:last-child { border-right: 0; }
    main {
      width: min(100%, 560px);
      margin: 0 auto;
      padding: 68px 10px 88px;
    }
    .zone { margin: 0 0 12px; }
    .box, .card, .drawer, .fieldbox {
      background: var(--bg);
      color: var(--fg);
      border: 2px solid var(--border);
      border-radius: 0;
    }
    .box { padding: 12px; }
    .card { display: block; width: 100%; padding: 10px; margin: 8px 0; text-transform: none; font-weight: 400; }
    .card[aria-current="true"], .selected { outline: 3px solid var(--fg); outline-offset: 0; }
    .section-label {
      margin: 0 0 8px;
      font-size: 12px;
      font-weight: 900;
      text-transform: uppercase;
      border-bottom: 2px solid var(--border);
      padding-bottom: 6px;
    }
    h1, h2, h3, p { margin: 0; }
    h1 { font-size: 25px; line-height: 1; overflow-wrap: anywhere; }
    h2 { font-size: 18px; line-height: 1.15; overflow-wrap: anywhere; }
    h3 { font-size: 16px; line-height: 1.15; overflow-wrap: anywhere; }
    .plain { margin-top: 8px; overflow-wrap: anywhere; }
    .small { font-size: 13px; line-height: 1.3; }
    .micro { font-size: 11px; line-height: 1.2; text-transform: uppercase; font-weight: 900; }
    .stack { display: grid; gap: 8px; }
    .chips { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 10px; }
    .chip {
      border: 1px solid var(--border);
      padding: 5px 7px;
      font-size: 12px;
      line-height: 1.1;
      font-weight: 900;
      text-transform: uppercase;
      background: var(--bg);
      color: var(--fg);
    }
    .row { display: flex; gap: 8px; align-items: flex-start; justify-content: space-between; }
    .row > * { min-width: 0; }
    .meta-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 8px;
      margin-top: 10px;
    }
    .fieldbox { padding: 8px; min-height: 56px; overflow-wrap: anywhere; }
    .fieldbox b { display: block; font-size: 11px; text-transform: uppercase; }
    .drawer input, .drawer select, .drawer textarea {
      width: 100%;
      margin: 5px 0 10px;
      padding: 9px;
    }
    .drawer textarea { min-height: 82px; resize: vertical; }
    .list { list-style: none; margin: 8px 0 0; padding: 0; display: grid; gap: 6px; }
    .list li { border-left: 5px solid var(--border); padding: 4px 0 4px 8px; overflow-wrap: anywhere; }
    .filterbar { display: flex; overflow-x: auto; gap: 6px; padding: 2px 0 8px; }
    .filterbar button { flex: 0 0 auto; min-height: 38px; padding: 8px; font-size: 12px; }
    .source-card { text-transform: none; }
    .source-card .url { display: block; margin-top: 6px; word-break: break-all; }
    .source-card[data-hidden="true"] { display: none; }
    .trace-item { border-top: 1px solid var(--border); padding: 7px 0; }
    .top-select {
      width: 100%;
      margin-top: 10px;
      padding: 10px;
      font-weight: 800;
    }
    .open-row { display: grid; grid-template-columns: 1fr; gap: 8px; margin-top: 10px; }
    @media (min-width: 700px) {
      main { border-left: 2px solid var(--border); border-right: 2px solid var(--border); }
    }
  </style>
</head>
<body>
  <header class="topbar" aria-label="PROVIS mobile top bar">
    <div>PROVIS</div>
    <div id="topCase">VENTURE CASE</div>
    <button id="quickcheckTop" type="button">Quickcheck</button>
  </header>

  <main>
    <section id="caseHeader" class="zone"></section>
    <section id="problemSpine" class="zone"></section>
    <section id="activeWorkspace" class="zone"></section>
    <section id="sourceTray" class="zone"></section>
    <section id="traceStrip" class="zone"></section>
  </main>

  <nav class="bottombar" aria-label="PROVIS primitive actions">
    <button id="captureAction" type="button">Capture</button>
    <button id="bindAction" type="button">Bind</button>
    <button id="problemAction" type="button">Problem</button>
    <button id="probeAction" type="button">Probe</button>
  </nav>

  <script id="provis-data" type="application/json">${safeJson(data)}</script>
  <script>
    const DATA = JSON.parse(document.getElementById("provis-data").textContent);
    const defaultIndex = Math.max(0, DATA.ventures.findIndex((v) => v.name === "Doorstep.ai"));
    const state = {
      ventureIndex: defaultIndex,
      active: { type: "problem", index: 0 },
      sourceFilter: "all"
    };
    const topCase = document.getElementById("topCase");
    const caseHeader = document.getElementById("caseHeader");
    const problemSpine = document.getElementById("problemSpine");
    const activeWorkspace = document.getElementById("activeWorkspace");
    const sourceTray = document.getElementById("sourceTray");
    const traceStrip = document.getElementById("traceStrip");

    function esc(value) {
      return String(value ?? "").replace(/[&<>"']/g, (char) => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
      }[char]));
    }
    function arr(value) {
      if (Array.isArray(value)) return value.filter(Boolean);
      if (!value) return [];
      return [value];
    }
    function currentVenture() {
      return DATA.ventures[state.ventureIndex] || DATA.ventures[0] || {};
    }
    function currentRecord() {
      const venture = currentVenture();
      return DATA.venture_records.find((record) => record.target && record.target.name === venture.name) || {};
    }
    function sources() {
      const record = currentRecord();
      return arr(record.source_base).length ? arr(record.source_base) : arr(currentVenture().source_base);
    }
    function evidenceById(id) {
      return sources().find((source) => source.evidence_id === id || source.id === id) || null;
    }
    function bindingByEvidence(id) {
      return arr(currentRecord().evidence_bindings).find((binding) => binding.evidence_id === id) || null;
    }
    function chips(items) {
      return '<div class="chips">' + items.map((item) => '<span class="chip">' + esc(item) + '</span>').join("") + '</div>';
    }
    function list(items) {
      const values = arr(items);
      return values.length ? '<ul class="list">' + values.map((item) => '<li>' + esc(item) + '</li>').join("") + '</ul>' : '<p class="plain small">No public record captured in this layer.</p>';
    }
    function sourceLinks(ids) {
      const links = arr(ids).map((id) => {
        const source = evidenceById(id);
        if (!source) return '<li>' + esc(id) + '</li>';
        return '<li><button type="button" class="inlineSource" data-source-id="' + esc(source.evidence_id) + '">' + esc(source.evidence_id + " · " + (source.title || source.source_type || source.url)) + '</button></li>';
      });
      return links.length ? '<ul class="list">' + links.join("") + '</ul>' : '<p class="plain small">No evidence link attached.</p>';
    }
    function setActive(type, index) {
      state.active = { type, index };
      render();
      activeWorkspace.scrollIntoView({ behavior: "smooth", block: "start" });
    }
    function statusLabel(value) {
      return value || "unknown";
    }
    function renderCaseHeader() {
      const venture = currentVenture();
      const record = currentRecord();
      topCase.textContent = venture.name || "VENTURE CASE";
      const linkCount = Number(venture.verified_link_count || sources().length || 0);
      const options = DATA.ventures.map((item, index) => '<option value="' + index + '"' + (index === state.ventureIndex ? " selected" : "") + '>' + esc(item.name) + ' · ' + esc(item.verified_link_count || 0) + '/10</option>').join("");
      caseHeader.innerHTML =
        '<div class="box">' +
          '<p class="section-label">Case Header</p>' +
          '<h1>' + esc(venture.name || record.target?.name || "Unnamed venture") + '</h1>' +
          '<p class="plain">' + esc(venture.description || record.target?.one_line_summary || "No one-line claim captured.") + '</p>' +
          chips([
            "status: " + statusLabel(venture.record_status || record.target?.record_status),
            "confidence: " + statusLabel(venture.record_confidence || record.target?.confidence),
            "links: " + linkCount + "/10",
            "private data: false"
          ]) +
          '<select id="caseSelect" class="top-select" aria-label="Switch venture case">' + options + '</select>' +
        '</div>';
      document.getElementById("caseSelect").addEventListener("change", (event) => {
        state.ventureIndex = Number(event.target.value);
        state.active = { type: "problem", index: 0 };
        render();
      });
    }
    function renderProblemSpine() {
      const record = currentRecord();
      const problems = arr(record.venture_problem_list).length ? arr(record.venture_problem_list) : arr(currentVenture().problems);
      problemSpine.innerHTML =
        '<div class="box">' +
          '<p class="section-label">Venture Problem Spine</p>' +
          (problems.length ? problems.map((problem, index) =>
            '<button type="button" class="card problemCard" data-index="' + index + '" aria-current="' + String(state.active.type === "problem" && state.active.index === index) + '">' +
              '<div class="row"><span class="micro">' + esc(problem.problem_id || "PROBLEM_" + (index + 1)) + '</span><span class="chip">' + esc(problem.severity || "severity") + '</span></div>' +
              '<h3 class="plain">' + esc(problem.title || "Untitled problem") + '</h3>' +
              chips(["state: " + statusLabel(problem.state || problem.current_state), "confidence: " + statusLabel(problem.confidence), "sources: " + arr(problem.evidence_links).length]) +
              '<p class="plain small"><b>Next probe:</b> ' + esc(arr(problem.next_probe)[0] || "Name the next source layer.") + '</p>' +
            '</button>'
          ).join("") : '<p class="plain">No problem list captured for this venture.</p>') +
        '</div>';
      problemSpine.querySelectorAll(".problemCard").forEach((button) => {
        button.addEventListener("click", () => setActive("problem", Number(button.dataset.index)));
      });
    }
    function renderProblem(problem) {
      return '<div class="box">' +
        '<p class="section-label">Active Bound Object · Venture_Problem_Form</p>' +
        '<h2>' + esc(problem.title || "Problem") + '</h2>' +
        '<div class="meta-grid">' +
          '<div class="fieldbox"><b>Type</b>' + esc(problem.problem_type || "problem") + '</div>' +
          '<div class="fieldbox"><b>State</b>' + esc(problem.state || problem.current_state || "unknown") + '</div>' +
          '<div class="fieldbox"><b>Confidence</b>' + esc(problem.confidence || "unknown") + '</div>' +
          '<div class="fieldbox"><b>Severity</b>' + esc(problem.severity || "unknown") + '</div>' +
        '</div>' +
        '<h3 class="plain">What Supports It</h3>' + sourceLinks(problem.evidence_links) +
        '<h3 class="plain">Why It Matters</h3><p class="plain small">' + esc(problem.why_it_matters || problem.working_diagnosis || "No assessment captured.") + '</p>' +
        '<h3 class="plain">What Is Missing</h3>' + list(problem.next_probe) +
      '</div>';
    }
    function renderEvidence(source) {
      const binding = source ? bindingByEvidence(source.evidence_id) : null;
      if (!source) return '<div class="box"><p class="section-label">Evidence_Form</p><p>No source selected.</p></div>';
      return '<div class="box">' +
        '<p class="section-label">Active Bound Object · Evidence_Form</p>' +
        '<h2>' + esc(source.title || source.url || "Evidence") + '</h2>' +
        '<div class="meta-grid">' +
          '<div class="fieldbox"><b>Source Type</b>' + esc(source.source_type || "unknown") + '</div>' +
          '<div class="fieldbox"><b>Evidence Level</b>' + esc(source.evidence_level || "unknown") + '</div>' +
          '<div class="fieldbox"><b>Publisher</b>' + esc(source.publisher || "unknown") + '</div>' +
          '<div class="fieldbox"><b>Privacy</b>' + esc(source.privacy_status || "public") + '</div>' +
        '</div>' +
        '<p class="plain small">' + esc(source.summary || source.extracted_facts || "No extracted facts captured.") + '</p>' +
        '<h3 class="plain">What It Supports</h3>' + list(binding?.supports || source.summary) +
        '<h3 class="plain">What It Does Not Establish</h3>' + list(binding?.does_not_establish) +
        '<div class="open-row"><a class="card source-card" href="' + esc(source.url) + '" target="_blank" rel="noreferrer">Open public source: ' + esc(source.url) + '</a></div>' +
      '</div>';
    }
    function renderRelationship(edge) {
      if (!edge) return '<div class="box"><p class="section-label">Relationship_Edge</p><p>No relationship edge captured.</p></div>';
      return '<div class="box">' +
        '<p class="section-label">Active Bound Object · Relationship_Edge</p>' +
        '<h2>' + esc(edge.subject || "Subject") + '</h2>' +
        '<p class="plain">' + esc(edge.predicate || "predicate") + ' → ' + esc(edge.object || "object") + '</p>' +
        chips(["state: " + statusLabel(edge.state), "confidence: " + statusLabel(edge.confidence), "sources: " + arr(edge.evidence_links).length]) +
        '<h3 class="plain">Evidence</h3>' + sourceLinks(edge.evidence_links) +
        '<h3 class="plain">What It Supports</h3>' + list(edge.what_it_supports || (edge.subject && edge.object ? edge.subject + " is publicly linked to " + edge.object + " through this predicate." : "")) +
        '<h3 class="plain">What It Does Not Establish</h3>' + list(edge.what_it_does_not_support || ["Does not establish revenue, customer adoption, technical validity, or current operating status unless separately sourced."]) +
      '</div>';
    }
    function renderClaim(claim) {
      if (!claim) return '<div class="box"><p class="section-label">Claim_Form</p><p>No claim selected.</p></div>';
      return '<div class="box">' +
        '<p class="section-label">Active Bound Object · Claim_Form</p>' +
        '<h2>' + esc(claim.claim_type || "Claim") + '</h2>' +
        '<p class="plain small">' + esc(claim.claim_text || "No claim text captured.") + '</p>' +
        '<div class="meta-grid">' +
          '<div class="fieldbox"><b>Support</b>' + esc(claim.support_status || "unknown") + '</div>' +
          '<div class="fieldbox"><b>Confidence</b>' + esc(claim.confidence ?? "unknown") + '</div>' +
        '</div>' +
        '<h3 class="plain">Evidence</h3>' + sourceLinks(claim.evidence_links) +
        '<h3 class="plain">Required Verification</h3>' + list(claim.required_verification) +
      '</div>';
    }
    function renderFounder(founder) {
      if (!founder) return '<div class="box"><p class="section-label">Founder_Cross_Link_Record</p><p>No named founder captured.</p></div>';
      return '<div class="box">' +
        '<p class="section-label">Active Bound Object · Founder_Cross_Link_Record</p>' +
        '<h2>' + esc(founder.name || "Founder") + '</h2>' +
        '<p class="plain">Linked venture: ' + esc(currentVenture().name) + '</p>' +
        chips(["identity: " + statusLabel(founder.identity_confidence), "relationship: " + statusLabel(founder.relationship_confidence)]) +
        '<h3 class="plain">Public Profile Evidence</h3>' + sourceLinks(founder.source_links) +
        '<h3 class="plain">Ambiguity Flags</h3>' + list(founder.ambiguity_flags) +
        '<h3 class="plain">Next Probe</h3>' + list(["Find official bio, company team page, public LinkedIn destination profile, GitHub, YouTube, podcast, publication, patent, or speaker page tied to the same public professional identity."]) +
      '</div>';
    }
    function renderQuickcheck() {
      const quick = currentRecord().quickcheck || {};
      const entries = Object.entries(quick);
      return '<div class="box">' +
        '<p class="section-label">Quickcheck Panel</p>' +
        '<h2>' + (entries.every(([, value]) => Boolean(value)) ? "PROVIS_COMPLIANT" : "PROVIS_NONCOMPLIANT") + '</h2>' +
        '<div class="stack">' + (entries.length ? entries.map(([key, value]) =>
          '<button type="button" class="card">' + esc(value ? "PASS" : "FAIL") + ' · ' + esc(key.replaceAll("_", " ")) + '</button>'
        ).join("") : '<p>No quickcheck captured.</p>') + '</div>' +
      '</div>';
    }
    function renderCaptureDrawer() {
      const firstSource = sources()[0] || {};
      return '<div class="drawer box">' +
        '<p class="section-label">Capture_Source Drawer</p>' +
        '<label class="micro">URL</label><input value="' + esc(firstSource.url || "") + '" />' +
        '<label class="micro">Source Type</label><input value="' + esc(firstSource.source_type || "") + '" />' +
        '<label class="micro">Evidence Level L0-L5</label><input value="' + esc(firstSource.evidence_level || "") + '" />' +
        '<label class="micro">What this source supports</label><textarea>' + esc(firstSource.summary || "") + '</textarea>' +
        '<label class="micro">What this source does not establish</label><textarea>Does not establish revenue, customer adoption, current founder role, security, scale, or technical validity unless directly stated.</textarea>' +
        '<label class="micro">Privacy status</label><input value="' + esc(firstSource.privacy_status || "public") + '" />' +
        '<button type="button">Capture Source</button>' +
        '<p class="plain small"><b>Guard:</b> search result URLs, login-gated pages, paywalled pages, private posts, and sensitive personal data are rejected as final evidence.</p>' +
      '</div>';
    }
    function renderProbeDrawer() {
      const venture = currentVenture();
      const gaps = arr(venture.source_gap_report?.missing_layers);
      const problems = arr(currentRecord().venture_problem_list);
      const probes = problems.flatMap((problem) => arr(problem.next_probe));
      return '<div class="box">' +
        '<p class="section-label">Next_Probe Drawer</p>' +
        '<h2>Source Gap Report</h2>' +
        '<p class="plain">' + esc(venture.source_gap_report?.verified_links_found || ("Verified links found: " + (venture.verified_link_count || sources().length || 0) + "/10")) + '</p>' +
        '<h3 class="plain">Missing Layers</h3>' + list(gaps) +
        '<h3 class="plain">Next Probes</h3>' + list(probes) +
      '</div>';
    }
    function renderSafety() {
      const safety = currentRecord().safety_boundary || {};
      return '<div class="box">' +
        '<p class="section-label">Safety Boundary Panel</p>' +
        '<h2>Private data collected: ' + esc(String(Boolean(safety.private_data_collected))) + '</h2>' +
        '<h3 class="plain">Forbidden Data Rejected</h3>' + list(safety.forbidden_data_rejected) +
        '<h3 class="plain">Notes</h3>' + list(safety.notes) +
      '</div>';
    }
    function renderBindPanel() {
      const record = currentRecord();
      const binding = arr(record.evidence_bindings)[0];
      const source = binding ? evidenceById(binding.evidence_id) : sources()[0];
      return '<div class="box">' +
        '<p class="section-label">Bind_Evidence Drawer</p>' +
        '<h2>' + esc(binding?.target_form || currentVenture().name || "Target form") + '</h2>' +
        '<h3 class="plain">Source</h3>' +
        '<p class="plain small">' + esc(source?.title || source?.url || "No source selected.") + '</p>' +
        '<h3 class="plain">What It Supports</h3>' + list(binding?.supports || source?.summary) +
        '<h3 class="plain">What It Does Not Establish</h3>' + list(binding?.does_not_establish || ["Does not establish revenue, customer adoption, current founder role, security, scale, or technical validity unless directly stated."]) +
        (source?.url ? '<div class="open-row"><a class="card source-card" href="' + esc(source.url) + '" target="_blank" rel="noreferrer">Open public source: ' + esc(source.url) + '</a></div>' : '') +
      '</div>';
    }
    function renderActiveWorkspace() {
      const record = currentRecord();
      const problems = arr(record.venture_problem_list).length ? arr(record.venture_problem_list) : arr(currentVenture().problems);
      const type = state.active.type;
      let html = "";
      if (type === "problem") html = renderProblem(problems[state.active.index] || problems[0] || {});
      if (type === "evidence") html = renderEvidence(sources()[state.active.index] || sources()[0]);
      if (type === "relationship") html = renderRelationship(arr(record.relationship_forms)[state.active.index] || arr(record.relationship_forms)[0]);
      if (type === "claim") html = renderClaim(arr(record.claim_forms)[state.active.index] || arr(record.claim_forms)[0]);
      if (type === "founder") html = renderFounder(arr(record.entity_forms?.founders)[state.active.index] || arr(record.entity_forms?.founders)[0]);
      if (type === "quickcheck") html = renderQuickcheck();
      if (type === "capture") html = renderCaptureDrawer();
      if (type === "bind") html = renderBindPanel();
      if (type === "probe") html = renderProbeDrawer();
      if (type === "safety") html = renderSafety();
      activeWorkspace.innerHTML = html || renderProblem({});
      activeWorkspace.querySelectorAll(".inlineSource").forEach((button) => {
        button.addEventListener("click", () => {
          const sourceIndex = sources().findIndex((source) => source.evidence_id === button.dataset.sourceId);
          setActive("evidence", Math.max(0, sourceIndex));
        });
      });
    }
    function renderFounderAndEdges() {
      const record = currentRecord();
      const founders = arr(record.entity_forms?.founders);
      const edges = arr(record.relationship_forms);
      const claims = arr(record.claim_forms).slice(0, 8);
      return '<p class="section-label">Founder / Edge / Claim Cards</p>' +
        '<div class="stack">' +
          (founders.length ? founders.map((founder, index) =>
            '<button type="button" class="card founderCard" data-index="' + index + '"><h3>' + esc(founder.name) + '</h3>' +
            '<p class="small">linked venture: ' + esc(currentVenture().name) + '</p>' +
            chips(["identity: " + statusLabel(founder.identity_confidence), "relationship: " + statusLabel(founder.relationship_confidence)]) + '</button>'
          ).join("") : '<p class="small">No named founder entity captured.</p>') +
          (edges.length ? edges.map((edge, index) =>
            '<button type="button" class="card edgeCard" data-index="' + index + '"><h3>' + esc(edge.subject) + '</h3>' +
            '<p class="small">' + esc(edge.predicate) + ' → ' + esc(edge.object) + '</p>' +
            chips(["state: " + statusLabel(edge.state), "sources: " + arr(edge.evidence_links).length]) + '</button>'
          ).join("") : '<p class="small">No relationship edge captured.</p>') +
          (claims.length ? claims.map((claim, index) =>
            '<button type="button" class="card claimCard" data-index="' + index + '"><h3>' + esc(claim.claim_type || "claim") + '</h3>' +
            '<p class="small">' + esc(claim.claim_text || "").slice(0, 180) + '</p>' +
            chips(["support: " + statusLabel(claim.support_status), "sources: " + arr(claim.evidence_links).length]) + '</button>'
          ).join("") : '<p class="small">No claim forms captured.</p>') +
        '</div>';
    }
    function renderSourceGapCard() {
      const venture = currentVenture();
      const gaps = arr(venture.source_gap_report?.missing_layers);
      return '<button type="button" class="card" id="sourceGapCard">' +
        '<p class="section-label">Source Gap Report</p>' +
        '<h3>' + esc(venture.source_gap_report?.verified_links_found || ("Verified links found: " + (venture.verified_link_count || sources().length || 0) + "/10")) + '</h3>' +
        list(gaps) +
      '</button>';
    }
    function renderSourceTray() {
      const levels = ["all", "L0", "L1", "L2", "L3", "L4", "L5"];
      const sourceHtml = sources().map((source, index) => {
        const level = source.evidence_level || "";
        const hidden = state.sourceFilter !== "all" && !level.startsWith(state.sourceFilter);
        return '<button type="button" class="card source-card sourceCard" data-index="' + index + '" data-hidden="' + String(hidden) + '">' +
          '<div class="row"><span class="micro">' + esc(source.evidence_id || "source") + '</span><span class="chip">' + esc(level || "level") + '</span></div>' +
          '<h3 class="plain">' + esc(source.title || source.url) + '</h3>' +
          '<p class="small">' + esc(source.source_type || "source") + ' · ' + esc(source.publisher || "") + '</p>' +
          '<span class="url small">' + esc(source.url || "") + '</span>' +
        '</button>';
      }).join("");
      sourceTray.innerHTML =
        '<div class="box">' +
          '<p class="section-label">Evidence Base Pull-Up Tray</p>' +
          '<div class="filterbar">' + levels.map((level) => '<button type="button" class="filterButton" data-level="' + level + '" aria-current="' + String(state.sourceFilter === level) + '">' + esc(level) + '</button>').join("") + '</div>' +
          renderSourceGapCard() +
          renderFounderAndEdges() +
          '<div class="stack">' + (sourceHtml || '<p>No evidence sources captured.</p>') + '</div>' +
        '</div>';
      sourceTray.querySelectorAll(".filterButton").forEach((button) => {
        button.addEventListener("click", () => {
          state.sourceFilter = button.dataset.level;
          renderSourceTray();
        });
      });
      sourceTray.querySelectorAll(".sourceCard").forEach((button) => {
        button.addEventListener("click", () => setActive("evidence", Number(button.dataset.index)));
      });
      sourceTray.querySelectorAll(".founderCard").forEach((button) => {
        button.addEventListener("click", () => setActive("founder", Number(button.dataset.index)));
      });
      sourceTray.querySelectorAll(".edgeCard").forEach((button) => {
        button.addEventListener("click", () => setActive("relationship", Number(button.dataset.index)));
      });
      sourceTray.querySelectorAll(".claimCard").forEach((button) => {
        button.addEventListener("click", () => setActive("claim", Number(button.dataset.index)));
      });
      const sourceGapCard = document.getElementById("sourceGapCard");
      if (sourceGapCard) sourceGapCard.addEventListener("click", () => setActive("probe", 0));
    }
    function renderTraceStrip() {
      const trace = arr(currentRecord().provenance_trace).slice(0, 12);
      traceStrip.innerHTML =
        '<div class="box">' +
          '<p class="section-label">Provenance Trace Strip</p>' +
          (trace.length ? trace.map((item) =>
            '<div class="trace-item small"><b>' + esc(item.action || "TRACE") + '</b> · ' + esc(item.timestamp || "") + '<br />' +
            esc(item.source || item.reason || "") + '</div>'
          ).join("") : '<p class="small">No trace captured.</p>') +
          '<button type="button" id="safetyButton" class="card">Open Safety Boundary</button>' +
        '</div>';
      document.getElementById("safetyButton").addEventListener("click", () => setActive("safety", 0));
    }
    function render() {
      renderCaseHeader();
      renderProblemSpine();
      renderActiveWorkspace();
      renderSourceTray();
      renderTraceStrip();
    }
    document.getElementById("quickcheckTop").addEventListener("click", () => setActive("quickcheck", 0));
    document.getElementById("captureAction").addEventListener("click", () => setActive("capture", 0));
    document.getElementById("bindAction").addEventListener("click", () => setActive("bind", 0));
    document.getElementById("problemAction").addEventListener("click", () => setActive("problem", 0));
    document.getElementById("probeAction").addEventListener("click", () => setActive("probe", 0));
    render();
  </script>
</body>
</html>`;

const operatorHtml = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
  <title>PROVIS Operator Cockpit</title>
  <style>
    :root {
      color-scheme: light;
      --bg: #FFFFFF;
      --fg: #000000;
      --border: #000000;
      font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    }
    * { box-sizing: border-box; }
    html, body { margin: 0; background: var(--bg); color: var(--fg); }
    body { font-size: 15px; line-height: 1.32; letter-spacing: 0; }
    button, input {
      font: inherit;
      color: var(--fg);
      background: var(--bg);
      border: 1px solid var(--border);
      border-radius: 0;
    }
    button { cursor: pointer; }
    a { color: var(--fg); text-decoration: underline; text-decoration-thickness: 2px; }
    .topbar, .command-rail {
      position: fixed;
      left: 0;
      right: 0;
      z-index: 20;
      background: var(--bg);
      border-color: var(--border);
      border-style: solid;
    }
    .topbar {
      top: 0;
      min-height: 54px;
      border-width: 0 0 2px;
      display: grid;
      grid-template-columns: 1fr 1.1fr .8fr .8fr;
    }
    .topbar button, .topbar div {
      min-width: 0;
      border: 0;
      border-right: 1px solid var(--border);
      padding: 6px;
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      text-align: center;
      font-size: 10px;
      line-height: 1.1;
      font-weight: 900;
      text-transform: uppercase;
      overflow-wrap: anywhere;
    }
    .topbar div:last-child { border-right: 0; }
    .metric { font-size: 15px; margin-top: 2px; }
    .command-rail {
      bottom: 0;
      border-width: 2px 0 0;
      padding: 0 0 env(safe-area-inset-bottom);
      display: flex;
      overflow-x: auto;
    }
    .command-rail button {
      flex: 0 0 auto;
      min-width: 92px;
      min-height: 56px;
      border-width: 0 1px 0 0;
      font-size: 11px;
      font-weight: 900;
      text-transform: uppercase;
    }
    main {
      width: min(100%, 760px);
      margin: 0 auto;
      padding: 64px 10px 76px;
    }
    .zone {
      border: 2px solid var(--border);
      margin: 0 0 10px;
      background: var(--bg);
    }
    .zone-head {
      border-bottom: 2px solid var(--border);
      padding: 8px 10px;
      font-size: 11px;
      font-weight: 900;
      text-transform: uppercase;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
    }
    .zone-body { padding: 10px; }
    h1, h2, h3, p { margin: 0; }
    h1 { font-size: 21px; line-height: 1.05; overflow-wrap: anywhere; }
    h2 { font-size: 17px; line-height: 1.12; overflow-wrap: anywhere; }
    h3 { font-size: 15px; line-height: 1.14; overflow-wrap: anywhere; }
    .small { font-size: 12px; line-height: 1.25; }
    .micro { font-size: 10px; text-transform: uppercase; font-weight: 900; }
    .plain { margin-top: 7px; overflow-wrap: anywhere; }
    .state-strip {
      display: flex;
      gap: 6px;
      overflow-x: auto;
      padding: 8px 0;
      margin-bottom: 8px;
    }
    .chip {
      flex: 0 0 auto;
      border: 1px solid var(--border);
      padding: 6px 8px;
      font-size: 11px;
      line-height: 1.1;
      font-weight: 900;
      text-transform: uppercase;
      background: var(--bg);
    }
    .target-tools {
      display: grid;
      grid-template-columns: 1fr auto auto;
      gap: 6px;
      margin-bottom: 8px;
    }
    .target-tools input { min-width: 0; min-height: 42px; padding: 8px; }
    .target-tools button { min-height: 42px; padding: 8px; font-weight: 900; text-transform: uppercase; }
    .target-index { display: grid; gap: 6px; }
    .target-index.grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
    .target-row {
      width: 100%;
      min-height: 48px;
      padding: 8px;
      text-align: left;
      border: 1px solid var(--border);
      background: var(--bg);
      color: var(--fg);
    }
    .target-row[aria-current="true"], .turn.selected { outline: 3px solid var(--fg); outline-offset: -3px; }
    .target-main { display: flex; justify-content: space-between; gap: 8px; align-items: flex-start; }
    .target-name { font-weight: 900; overflow-wrap: anywhere; }
    .target-meta { margin-top: 3px; display: flex; gap: 6px; flex-wrap: wrap; }
    .target-meta span { border: 1px solid var(--border); padding: 2px 4px; font-size: 10px; font-weight: 900; text-transform: uppercase; }
    .mission-thread { display: grid; gap: 7px; }
    .turn {
      border: 1px solid var(--border);
      padding: 9px;
      background: var(--bg);
    }
    .turn-head {
      display: flex;
      justify-content: space-between;
      gap: 8px;
      font-size: 10px;
      text-transform: uppercase;
      font-weight: 900;
      border-bottom: 1px solid var(--border);
      padding-bottom: 5px;
      margin-bottom: 6px;
    }
    .kv { display: grid; grid-template-columns: 78px 1fr; gap: 5px 8px; }
    .kv dt { font-size: 10px; font-weight: 900; text-transform: uppercase; }
    .kv dd { margin: 0; overflow-wrap: anywhere; }
    .problem-list { display: grid; gap: 6px; }
    .problem {
      width: 100%;
      min-height: 44px;
      border: 1px solid var(--border);
      padding: 8px;
      text-align: left;
      background: var(--bg);
    }
    .problem h3 { margin-bottom: 4px; }
    .evidence-drawer {
      position: fixed;
      left: 0;
      right: 0;
      bottom: 58px;
      z-index: 18;
      max-height: 66vh;
      overflow: auto;
      background: var(--bg);
      border-top: 2px solid var(--border);
      transform: translateY(105%);
      transition: transform 160ms linear;
    }
    .evidence-drawer.open { transform: translateY(0); }
    .drawer-inner { width: min(100%, 760px); margin: 0 auto; padding: 10px; }
    .evidence-list { display: grid; gap: 7px; }
    .source {
      border: 1px solid var(--border);
      padding: 8px;
      word-break: break-word;
    }
    .source.selected { outline: 3px solid var(--fg); outline-offset: -3px; }
    .source-actions {
      display: grid;
      grid-template-columns: 1fr auto;
      gap: 6px;
      align-items: center;
      margin-top: 8px;
    }
    .source-actions button { min-height: 38px; font-size: 11px; font-weight: 900; text-transform: uppercase; }
    @media (max-width: 430px) {
      .topbar { grid-template-columns: .9fr 1fr .7fr .7fr; }
      .metric { font-size: 13px; }
      .target-index.grid { grid-template-columns: 1fr; }
      .kv { grid-template-columns: 64px 1fr; }
    }
  </style>
</head>
<body>
  <header class="topbar" aria-label="PROVIS operator status">
    <button type="button" id="missionJump"><span>Mission</span><span class="metric">PROVIS</span></button>
    <button type="button" id="targetJump"><span>Target</span><span class="metric" id="topTarget">-</span></button>
    <div><span>Verified Sources</span><span class="metric" id="topSources">0/10</span></div>
    <div><span>Open Problems</span><span class="metric" id="topProblems">0</span></div>
  </header>

  <main>
    <section class="zone" id="targetZone">
      <div class="zone-head"><span>Target Index</span><span id="targetCount">0 ventures</span></div>
      <div class="zone-body">
        <div class="target-tools">
          <input id="targetSearch" type="search" placeholder="Find venture, founder, source" />
          <button type="button" id="listMode">List</button>
          <button type="button" id="gridMode">Grid</button>
        </div>
        <div id="targetIndex" class="target-index"></div>
      </div>
    </section>

    <section class="zone" id="missionZone">
      <div class="zone-head"><span>Mission Thread</span><span>claim / source / confidence / problem / next probe</span></div>
      <div class="zone-body">
        <div id="stateStrip" class="state-strip"></div>
        <div id="missionThread" class="mission-thread"></div>
      </div>
    </section>

    <section class="zone" id="problemZone">
      <div class="zone-head"><span>Problem Ledger</span><span>unresolved only</span></div>
      <div class="zone-body">
        <div id="problemLedger" class="problem-list"></div>
      </div>
    </section>
  </main>

  <section id="evidenceDrawer" class="evidence-drawer" aria-hidden="true">
    <div class="drawer-inner">
      <div class="zone-head"><span>Evidence Drawer</span><button type="button" id="closeEvidence">Close</button></div>
      <div id="evidenceList" class="evidence-list"></div>
    </div>
  </section>

  <nav class="command-rail" aria-label="Operator commands">
    <button type="button" data-command="dispatch">Dispatch</button>
    <button type="button" data-command="inspect">Inspect</button>
    <button type="button" data-command="verify">Verify</button>
    <button type="button" data-command="reject">Reject</button>
    <button type="button" data-command="fork">Fork</button>
    <button type="button" data-command="merge">Merge</button>
    <button type="button" data-command="export">Export</button>
  </nav>

  <script id="provis-data" type="application/json">${safeJson(data)}</script>
  <script>
    const DATA = JSON.parse(document.getElementById("provis-data").textContent);
    const state = {
      targetIndex: Math.max(0, DATA.ventures.findIndex((venture) => venture.name === "Doorstep.ai")),
      viewMode: "list",
      query: "",
      focus: "dispatch",
      selectedProblem: 0,
      selectedSource: 0,
      drawerOpen: false
    };
    const els = {
      topTarget: document.getElementById("topTarget"),
      topSources: document.getElementById("topSources"),
      topProblems: document.getElementById("topProblems"),
      targetCount: document.getElementById("targetCount"),
      targetIndex: document.getElementById("targetIndex"),
      targetSearch: document.getElementById("targetSearch"),
      stateStrip: document.getElementById("stateStrip"),
      missionThread: document.getElementById("missionThread"),
      problemLedger: document.getElementById("problemLedger"),
      evidenceDrawer: document.getElementById("evidenceDrawer"),
      evidenceList: document.getElementById("evidenceList")
    };

    function esc(value) {
      return String(value ?? "").replace(/[&<>"']/g, (char) => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
      }[char]));
    }
    function arr(value) {
      if (Array.isArray(value)) return value.filter(Boolean);
      if (!value) return [];
      return [value];
    }
    function venture() {
      return DATA.ventures[state.targetIndex] || DATA.ventures[0] || {};
    }
    function record() {
      const name = venture().name;
      return DATA.venture_records.find((item) => item.target && item.target.name === name) || {};
    }
    function sources() {
      const rec = record();
      return arr(rec.source_base).length ? arr(rec.source_base) : arr(venture().source_base);
    }
    function problems() {
      const rec = record();
      return arr(rec.venture_problem_list).filter((problem) => !/resolved|verified|exported/i.test(problem.state || problem.current_state || ""));
    }
    function claims() {
      return arr(record().claim_forms);
    }
    function founders() {
      return arr(record().entity_forms?.founders);
    }
    function relationships() {
      return arr(record().relationship_forms);
    }
    function topProbe(problem) {
      return arr(problem?.next_probe)[0] || arr(record().venture_diagnosis?.next_probe)[0] || "Find the next public destination source.";
    }
    function sourceById(id) {
      return sources().find((source) => source.evidence_id === id || source.id === id) || null;
    }
    function bindingBySource(id) {
      return arr(record().evidence_bindings).find((binding) => binding.evidence_id === id) || null;
    }
    function sourceLink(source, label) {
      if (!source || !source.url) return "No source attached.";
      return '<a href="' + esc(source.url) + '" target="_blank" rel="noreferrer">' + esc(label || source.title || source.url) + '</a>';
    }
    function chip(label) {
      return '<span class="chip">' + esc(label) + '</span>';
    }
    function renderTop() {
      const v = venture();
      const openProblems = problems();
      els.topTarget.textContent = v.name || "-";
      els.topSources.textContent = String(v.verified_link_count || sources().length || 0) + "/10";
      els.topProblems.textContent = String(openProblems.length);
    }
    function targetMatches(v) {
      const q = state.query.toLowerCase();
      if (!q) return true;
      return [v.name, v.description, v.sector, v.named_founders, v.programs, v.seed_url].some((value) => String(value || "").toLowerCase().includes(q));
    }
    function renderTargets() {
      const rows = DATA.ventures.map((v, index) => ({ v, index })).filter(({ v }) => targetMatches(v));
      els.targetCount.textContent = rows.length + " shown";
      els.targetIndex.className = "target-index " + state.viewMode;
      els.targetIndex.innerHTML = rows.map(({ v, index }) => {
        const rec = DATA.venture_records.find((item) => item.target && item.target.name === v.name) || {};
        const countProblems = arr(rec.venture_problem_list).length || arr(v.problems).length;
        return '<button type="button" class="target-row" data-index="' + index + '" aria-current="' + String(index === state.targetIndex) + '">' +
          '<div class="target-main"><span class="target-name">' + esc(v.name) + '</span><span class="micro">' + esc(v.verified_link_count || 0) + '/10</span></div>' +
          '<p class="small plain">' + esc(v.description || "No claim captured.") + '</p>' +
          '<div class="target-meta"><span>' + esc(v.sector || "sector unknown") + '</span><span>' + countProblems + ' problems</span><span>' + esc(v.record_confidence || rec.target?.confidence || "confidence") + '</span></div>' +
        '</button>';
      }).join("") || '<p class="small">No matching targets.</p>';
      els.targetIndex.querySelectorAll(".target-row").forEach((button) => {
        button.addEventListener("click", () => {
          state.targetIndex = Number(button.dataset.index);
          state.selectedProblem = 0;
          state.selectedSource = 0;
          state.focus = "dispatch";
          render();
          document.getElementById("missionZone").scrollIntoView({ behavior: "smooth", block: "start" });
        });
      });
    }
    function renderStateStrip() {
      const rec = record();
      const sourceCount = sources().length;
      const claimCount = claims().length;
      const edge = relationships()[0];
      const issueCount = problems().length;
      const safety = rec.safety_boundary || {};
      const agents = [
        "Scout " + (sourceCount ? sourceCount + " sources" : "searching"),
        "Extractor " + (claimCount ? claimCount + " claims" : "waiting"),
        "Verifier " + (edge ? edge.state : "waiting"),
        "Critic " + (issueCount ? issueCount + " problems" : "clear"),
        "Guard private=" + String(Boolean(safety.private_data_collected))
      ];
      els.stateStrip.innerHTML = agents.map(chip).join("");
    }
    function message(agent, label, fields, selected) {
      return '<article class="turn' + (selected ? " selected" : "") + '">' +
        '<div class="turn-head"><span>' + esc(agent) + '</span><span>' + esc(label) + '</span></div>' +
        '<dl class="kv">' + fields.map(([key, value]) => '<dt>' + esc(key) + '</dt><dd>' + value + '</dd>').join("") + '</dl>' +
      '</article>';
    }
    function renderThread() {
      const v = venture();
      const rec = record();
      const openProblems = problems();
      const selectedProblem = openProblems[state.selectedProblem] || openProblems[0] || {};
      const source = sources()[state.selectedSource] || sources()[0];
      const claim = claims()[0];
      const edge = relationships()[0];
      const safety = rec.safety_boundary || {};
      const base = [
        message("Operator", "mission", [
          ["claim", esc(v.description || rec.target?.one_line_summary || "No one-line claim captured.")],
          ["source", sourceLink(source, source?.evidence_id || "first source")],
          ["confidence", esc(v.record_confidence || rec.target?.confidence || "unknown")],
          ["problem", esc(selectedProblem.title || "No open problem captured.")],
          ["next probe", esc(topProbe(selectedProblem))]
        ], state.focus === "dispatch"),
        message("Source Scout", "source", [
          ["claim", esc(source?.summary || "No source summary captured.")],
          ["source", sourceLink(source)],
          ["confidence", esc(source?.evidence_level || source?.reliability_score || "unknown")],
          ["problem", esc(selectedProblem.problem_type || "source quality")],
          ["next probe", esc(topProbe(selectedProblem))]
        ], state.focus === "inspect"),
        message("Founder Linker", "edge", [
          ["claim", esc(edge ? edge.subject + " " + edge.predicate + " " + edge.object : "No founder edge captured.")],
          ["source", edge ? esc(arr(edge.evidence_links).join(", ")) : "No evidence ids."],
          ["confidence", esc(edge?.confidence || "unknown")],
          ["problem", esc(openProblems.find((p) => /founder/i.test(p.problem_type || p.title || ""))?.title || "Founder relationship must stay evidence-bound.")],
          ["next probe", esc(topProbe(openProblems.find((p) => /founder/i.test(p.problem_type || p.title || ""))))]
        ], state.focus === "verify"),
        message("Claim Extractor", "claim", [
          ["claim", esc(claim?.claim_text || "No claim selected.")],
          ["source", claim ? esc(arr(claim.evidence_links).join(", ")) : "No evidence ids."],
          ["confidence", esc(claim?.support_status || claim?.confidence || "unknown")],
          ["problem", esc(selectedProblem.title || "No open problem captured.")],
          ["next probe", esc(arr(claim?.required_verification)[0] || topProbe(selectedProblem))]
        ], state.focus === "fork"),
        message("Boundary Guard", "boundary", [
          ["claim", "Professional public evidence only."],
          ["source", "Private data is not an evidence source."],
          ["confidence", esc(Boolean(safety.private_data_collected) ? "blocked" : "clean")],
          ["problem", esc(arr(safety.forbidden_data_rejected).join(", ") || "No forbidden data captured.")],
          ["next probe", "Use public destination pages only."]
        ], state.focus === "reject")
      ];
      if (state.focus === "merge") {
        const trace = arr(rec.provenance_trace).slice(0, 5).map((item) => (item.action || "TRACE") + " " + (item.source || item.reason || "")).join(" | ");
        base.push(message("Evidence Binder", "trace", [
          ["claim", "Current case can be exported as a source-bound record."],
          ["source", esc(trace || "No trace captured.")],
          ["confidence", esc(rec.target?.confidence || v.record_confidence || "unknown")],
          ["problem", esc(openProblems.length + " open problems remain.")],
          ["next probe", esc(topProbe(selectedProblem))]
        ], true));
      }
      els.missionThread.innerHTML = base.join("");
    }
    function renderProblems() {
      const openProblems = problems();
      els.problemLedger.innerHTML = openProblems.map((problem, index) =>
        '<button type="button" class="problem" data-index="' + index + '" aria-current="' + String(index === state.selectedProblem) + '">' +
          '<h3>' + esc(problem.title || "Open problem") + '</h3>' +
          '<p class="small">' + esc(problem.problem_type || "problem") + ' · ' + esc(problem.state || "unresolved") + ' · ' + esc(problem.severity || "severity unknown") + '</p>' +
          '<p class="small plain">' + esc(topProbe(problem)) + '</p>' +
        '</button>'
      ).join("") || '<p class="small">No unresolved problem captured for this target.</p>';
      els.problemLedger.querySelectorAll(".problem").forEach((button) => {
        button.addEventListener("click", () => {
          state.selectedProblem = Number(button.dataset.index);
          state.focus = "dispatch";
          render();
        });
      });
    }
    function renderEvidenceDrawer() {
      const rec = record();
      els.evidenceDrawer.classList.toggle("open", state.drawerOpen);
      els.evidenceDrawer.setAttribute("aria-hidden", String(!state.drawerOpen));
      els.evidenceList.innerHTML = sources().map((source, index) => {
        const binding = bindingBySource(source.evidence_id) || {};
        const trace = arr(rec.provenance_trace).find((item) => item.source === source.evidence_id);
        return '<article class="source' + (index === state.selectedSource ? " selected" : "") + '">' +
          '<div class="turn-head"><span>' + esc(source.evidence_id || "source") + '</span><span>' + esc(source.evidence_level || "level") + '</span></div>' +
          '<dl class="kv">' +
            '<dt>url</dt><dd>' + sourceLink(source, source.url) + '</dd>' +
            '<dt>type</dt><dd>' + esc(source.source_type || "unknown") + '</dd>' +
            '<dt>excerpt</dt><dd>' + esc(source.summary || "No excerpt captured.") + '</dd>' +
            '<dt>claim</dt><dd>' + esc(arr(binding.supports)[0] || arr(claims().find((claim) => arr(claim.evidence_links).includes(source.evidence_id))?.claim_text)[0] || "No linked claim shown.") + '</dd>' +
            '<dt>confidence</dt><dd>' + esc(binding.confidence_change || source.reliability_score || "unknown") + '</dd>' +
            '<dt>trace</dt><dd>' + esc(trace ? (trace.action + " " + trace.timestamp) : "Captured in source base.") + '</dd>' +
          '</dl>' +
          '<div class="source-actions"><span class="small">' + esc(source.publisher || "") + '</span><button type="button" data-source-index="' + index + '">Use</button></div>' +
        '</article>';
      }).join("") || '<p class="small">No evidence captured.</p>';
      els.evidenceList.querySelectorAll("[data-source-index]").forEach((button) => {
        button.addEventListener("click", () => {
          state.selectedSource = Number(button.dataset.sourceIndex);
          state.focus = "inspect";
          render();
        });
      });
    }
    function exportCurrent() {
      const payload = JSON.stringify(record(), null, 2);
      const blob = new Blob([payload + "\\n"], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = (venture().name || "provis-target").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") + "-provis-record.json";
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    }
    function runCommand(command) {
      if (command === "export") {
        exportCurrent();
        return;
      }
      state.focus = command;
      if (command === "inspect") state.drawerOpen = true;
      if (command === "dispatch") state.drawerOpen = false;
      if (command === "verify") state.drawerOpen = true;
      if (command === "reject") state.drawerOpen = false;
      if (command === "fork") state.viewMode = "grid";
      if (command === "merge") state.drawerOpen = true;
      render();
    }
    function render() {
      renderTop();
      renderTargets();
      renderStateStrip();
      renderThread();
      renderProblems();
      renderEvidenceDrawer();
    }
    document.getElementById("missionJump").addEventListener("click", () => document.getElementById("missionZone").scrollIntoView({ behavior: "smooth", block: "start" }));
    document.getElementById("targetJump").addEventListener("click", () => document.getElementById("targetZone").scrollIntoView({ behavior: "smooth", block: "start" }));
    document.getElementById("listMode").addEventListener("click", () => { state.viewMode = "list"; renderTargets(); });
    document.getElementById("gridMode").addEventListener("click", () => { state.viewMode = "grid"; renderTargets(); });
    document.getElementById("closeEvidence").addEventListener("click", () => { state.drawerOpen = false; renderEvidenceDrawer(); });
    els.targetSearch.addEventListener("input", () => { state.query = els.targetSearch.value.trim(); renderTargets(); });
    document.querySelectorAll("[data-command]").forEach((button) => button.addEventListener("click", () => runCommand(button.dataset.command)));
    render();
  </script>
</body>
</html>`;

const xanaduHtml = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
  <title>PROVIS Case Matrix</title>
  <style>
    :root {
      color-scheme: light;
      --bg: #FFFFFF;
      --fg: #000000;
      --line: #000000;
      --thin: 1px solid var(--line);
      --thick: 2px solid var(--line);
      font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    }
    * { box-sizing: border-box; }
    html, body { margin: 0; background: var(--bg); color: var(--fg); }
    body { font-size: 14px; line-height: 1.24; letter-spacing: 0; }
    button, input, select {
      font: inherit;
      color: var(--fg);
      background: var(--bg);
      border: var(--thin);
      border-radius: 0;
    }
    button { cursor: pointer; }
    a { color: var(--fg); text-decoration: underline; text-decoration-thickness: 2px; text-underline-offset: 2px; }
    .top {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      z-index: 20;
      background: var(--bg);
      border-bottom: var(--thick);
      display: grid;
      grid-template-columns: 72px 1fr 72px 72px;
      min-height: 48px;
    }
    .top > * {
      min-width: 0;
      border-right: var(--thin);
      padding: 5px 6px;
      display: grid;
      align-content: center;
      text-align: center;
      font-size: 10px;
      font-weight: 900;
      text-transform: uppercase;
      overflow-wrap: anywhere;
    }
    .top > *:last-child { border-right: 0; }
    .top b { display: block; font-size: 14px; line-height: 1.05; }
    .app {
      width: min(100%, 1180px);
      margin: 0 auto;
      padding: 56px 8px 58px;
      display: grid;
      gap: 8px;
    }
    .tools {
      display: grid;
      grid-template-columns: 1fr 92px 92px;
      gap: 6px;
    }
    .tools input, .tools select, .tools button { min-height: 40px; padding: 7px; font-weight: 800; }
    .panel {
      border: var(--thick);
      background: var(--bg);
      min-width: 0;
    }
    .head {
      border-bottom: var(--thick);
      padding: 6px 8px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 8px;
      font-size: 10px;
      font-weight: 900;
      text-transform: uppercase;
    }
    .body { padding: 7px; }
    .case-layout {
      display: grid;
      grid-template-columns: minmax(300px, 1fr) minmax(300px, 1.25fr);
      gap: 8px;
      align-items: start;
    }
    .matrix {
      display: grid;
      gap: 2px;
      max-height: 66vh;
      overflow: auto;
    }
    .row {
      display: grid;
      grid-template-columns: minmax(118px, 1.2fr) 52px 52px 64px;
      gap: 0;
      min-height: 38px;
      border: var(--thin);
      background: var(--bg);
      color: var(--fg);
      padding: 0;
      text-align: left;
    }
    .row > span {
      min-width: 0;
      border-right: var(--thin);
      padding: 5px 6px;
      overflow-wrap: anywhere;
    }
    .row > span:last-child { border-right: 0; }
    .row[aria-current="true"], .item[aria-current="true"], .peer[aria-current="true"] {
      outline: 3px solid var(--fg);
      outline-offset: -3px;
    }
    .name { font-weight: 900; }
    .small { font-size: 12px; line-height: 1.22; }
    .micro { font-size: 10px; line-height: 1.08; text-transform: uppercase; font-weight: 900; }
    h1, h2, h3, p { margin: 0; }
    h1 { font-size: 22px; line-height: 1.02; overflow-wrap: anywhere; }
    h2 { font-size: 16px; line-height: 1.08; overflow-wrap: anywhere; }
    h3 { font-size: 14px; line-height: 1.1; overflow-wrap: anywhere; }
    .claim { margin-top: 6px; overflow-wrap: anywhere; }
    .facts {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      border-top: var(--thin);
      border-left: var(--thin);
      margin-top: 8px;
    }
    .fact {
      border-right: var(--thin);
      border-bottom: var(--thin);
      min-height: 44px;
      padding: 5px;
      overflow-wrap: anywhere;
    }
    .fact b { display: block; font-size: 10px; text-transform: uppercase; }
    .xlinks {
      display: flex;
      flex-wrap: wrap;
      gap: 4px;
      margin-top: 7px;
    }
    .xlink {
      border: var(--thin);
      padding: 4px 6px;
      font-size: 11px;
      font-weight: 900;
      text-transform: uppercase;
      background: var(--bg);
      max-width: 100%;
      overflow-wrap: anywhere;
    }
    .peer-band {
      display: grid;
      grid-template-columns: repeat(4, minmax(0, 1fr));
      gap: 5px;
    }
    .peer {
      min-height: 74px;
      border: var(--thin);
      padding: 6px;
      text-align: left;
      background: var(--bg);
      color: var(--fg);
    }
    .lens-grid {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 5px;
    }
    .item {
      border: var(--thin);
      padding: 7px;
      min-width: 0;
      background: var(--bg);
      color: var(--fg);
      text-align: left;
      overflow-wrap: anywhere;
    }
    .item h3 { margin-bottom: 4px; }
    .item dl {
      display: grid;
      grid-template-columns: 70px 1fr;
      gap: 3px 6px;
      margin: 6px 0 0;
    }
    .item dt { font-size: 10px; font-weight: 900; text-transform: uppercase; }
    .item dd { margin: 0; min-width: 0; overflow-wrap: anywhere; }
    .reader {
      border-top: var(--thick);
      margin-top: 7px;
      padding-top: 7px;
    }
    .reader dl {
      display: grid;
      grid-template-columns: 82px 1fr;
      gap: 4px 8px;
      margin: 0;
    }
    .reader dt { font-size: 10px; font-weight: 900; text-transform: uppercase; }
    .reader dd { margin: 0; min-width: 0; overflow-wrap: anywhere; }
    .bottom {
      position: fixed;
      bottom: 0;
      left: 0;
      right: 0;
      z-index: 20;
      background: var(--bg);
      border-top: var(--thick);
      display: grid;
      grid-template-columns: repeat(7, 1fr);
      padding-bottom: env(safe-area-inset-bottom);
    }
    .bottom button {
      min-height: 48px;
      border: 0;
      border-right: var(--thin);
      font-size: 10px;
      font-weight: 900;
      text-transform: uppercase;
    }
    .bottom button:last-child { border-right: 0; }
    .bottom button[aria-current="true"] { text-decoration: underline; text-decoration-thickness: 3px; text-underline-offset: 4px; }
    @media (max-width: 760px) {
      .case-layout { grid-template-columns: 1fr; }
      .matrix { max-height: 42vh; }
      .facts { grid-template-columns: repeat(2, 1fr); }
      .peer-band { grid-template-columns: repeat(2, minmax(0, 1fr)); }
      .lens-grid { grid-template-columns: 1fr; }
      .tools { grid-template-columns: 1fr 76px 76px; }
      .row { grid-template-columns: minmax(120px, 1fr) 42px 42px 54px; }
    }
    @media (max-width: 430px) {
      .top { grid-template-columns: 54px 1fr 56px 56px; }
      .top b { font-size: 12px; }
      .bottom button { font-size: 9px; min-height: 46px; }
    }
  </style>
</head>
<body>
  <header class="top">
    <div>PROVIS<b>Matrix</b></div>
    <div id="topName">Target<b>-</b></div>
    <div>Sources<b id="topSources">0</b></div>
    <div>Open<b id="topProblems">0</b></div>
  </header>

  <main class="app">
    <section class="tools">
      <input id="search" type="search" placeholder="Search ventures, founders, sources, sectors" />
      <select id="sort">
        <option value="links">Links</option>
        <option value="problems">Problems</option>
        <option value="name">Name</option>
      </select>
      <button id="toggle">Grid</button>
    </section>

    <section class="case-layout">
      <section class="panel">
        <div class="head"><span>Case Matrix</span><span id="count">0</span></div>
        <div class="body">
          <div id="matrix" class="matrix"></div>
        </div>
      </section>

      <section class="panel">
        <div class="head"><span>Selected Record</span><span id="status">-</span></div>
        <div class="body">
          <article id="record"></article>
          <div class="reader" id="reader"></div>
        </div>
      </section>
    </section>

    <section class="panel">
      <div class="head"><span>Compare Band</span><span>similar / high coverage / same field</span></div>
      <div class="body">
        <div id="peers" class="peer-band"></div>
      </div>
    </section>

    <section class="panel">
      <div class="head"><span id="lensTitle">Evidence</span><span>ontology lens</span></div>
      <div class="body">
        <div id="lens" class="lens-grid"></div>
      </div>
    </section>
  </main>

  <nav class="bottom" aria-label="PROVIS ontology lenses">
    <button data-lens="evidence" aria-current="true">Evidence</button>
    <button data-lens="claims">Claims</button>
    <button data-lens="edges">Edges</button>
    <button data-lens="problems">Problems</button>
    <button data-lens="risks">Risks</button>
    <button data-lens="gaps">Gaps</button>
    <button data-lens="trace">Trace</button>
  </nav>

  <script id="provis-data" type="application/json">${safeJson(data)}</script>
  <script>
    const DATA = JSON.parse(document.getElementById("provis-data").textContent);
    const state = {
      selected: Math.max(0, DATA.ventures.findIndex((v) => v.name === "Doorstep.ai")),
      lens: "evidence",
      query: "",
      sort: "links",
      grid: false,
      reader: null
    };
    const els = {
      topName: document.getElementById("topName"),
      topSources: document.getElementById("topSources"),
      topProblems: document.getElementById("topProblems"),
      status: document.getElementById("status"),
      search: document.getElementById("search"),
      sort: document.getElementById("sort"),
      toggle: document.getElementById("toggle"),
      count: document.getElementById("count"),
      matrix: document.getElementById("matrix"),
      record: document.getElementById("record"),
      reader: document.getElementById("reader"),
      peers: document.getElementById("peers"),
      lensTitle: document.getElementById("lensTitle"),
      lens: document.getElementById("lens")
    };
    function esc(value) {
      return String(value ?? "").replace(/[&<>"']/g, (char) => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
      }[char]));
    }
    function arr(value) {
      if (Array.isArray(value)) return value.filter(Boolean);
      if (!value) return [];
      return [value];
    }
    function venture(index = state.selected) {
      return DATA.ventures[index] || DATA.ventures[0] || {};
    }
    function rec(index = state.selected) {
      const name = venture(index).name;
      return DATA.venture_records.find((item) => item.target && item.target.name === name) || {};
    }
    function sources(index = state.selected) {
      return arr(rec(index).source_base).length ? arr(rec(index).source_base) : arr(venture(index).source_base);
    }
    function problems(index = state.selected) {
      return arr(rec(index).venture_problem_list).length ? arr(rec(index).venture_problem_list) : arr(venture(index).problems);
    }
    function claims() { return arr(rec().claim_forms); }
    function edges() { return arr(rec().relationship_forms); }
    function risks() { return arr(rec().risk_forms); }
    function gaps() { return arr(venture().source_gap_report?.missing_layers); }
    function trace() { return arr(rec().provenance_trace); }
    function sourceById(id) {
      return sources().find((source) => source.evidence_id === id || source.id === id) || null;
    }
    function evidenceLink(idOrSource) {
      const source = typeof idOrSource === "string" ? sourceById(idOrSource) : idOrSource;
      if (!source) return esc(idOrSource || "missing source");
      return '<a href="' + esc(source.url) + '" target="_blank" rel="noreferrer">' + esc(source.evidence_id || source.title || source.url) + '</a>';
    }
    function item(title, body, meta, action) {
      return '<button type="button" class="item" ' + (action || "") + '>' +
        '<h3>' + esc(title || "Untitled") + '</h3>' +
        '<p class="small">' + body + '</p>' +
        (meta ? '<dl>' + meta.map(([k, v]) => '<dt>' + esc(k) + '</dt><dd>' + v + '</dd>').join("") + '</dl>' : '') +
      '</button>';
    }
    function filteredRows() {
      const q = state.query.toLowerCase();
      const rows = DATA.ventures.map((v, index) => ({ v, index, r: rec(index), p: problems(index), s: sources(index) })).filter(({ v, r, p, s }) => {
        if (!q) return true;
        return [v.name, v.description, v.sector, v.named_founders, v.programs, v.seed_url, r.target?.one_line_summary, p.map(x => x.title).join(" "), s.map(x => x.title + " " + x.url).join(" ")].some((value) => String(value || "").toLowerCase().includes(q));
      });
      rows.sort((a, b) => {
        if (state.sort === "name") return a.v.name.localeCompare(b.v.name);
        if (state.sort === "problems") return b.p.length - a.p.length || a.v.name.localeCompare(b.v.name);
        return Number(b.v.verified_link_count || b.s.length || 0) - Number(a.v.verified_link_count || a.s.length || 0) || a.v.name.localeCompare(b.v.name);
      });
      return rows;
    }
    function renderMatrix() {
      const rows = filteredRows();
      els.count.textContent = rows.length + "/" + DATA.ventures.length;
      els.matrix.style.gridTemplateColumns = state.grid ? "repeat(2, minmax(0, 1fr))" : "1fr";
      els.matrix.innerHTML = rows.map(({ v, index, r, p, s }) =>
        '<button type="button" class="row" data-index="' + index + '" aria-current="' + String(index === state.selected) + '">' +
          '<span><span class="name">' + esc(v.name) + '</span><br><span class="small">' + esc(v.sector || "sector unknown") + '</span></span>' +
          '<span class="micro">' + esc(v.verified_link_count || s.length || 0) + '/10<br>src</span>' +
          '<span class="micro">' + p.length + '<br>prob</span>' +
          '<span class="micro">' + esc(v.record_confidence || r.target?.confidence || "-") + '</span>' +
        '</button>'
      ).join("") || '<p class="small">No matches.</p>';
      els.matrix.querySelectorAll("[data-index]").forEach((button) => button.addEventListener("click", () => {
        state.selected = Number(button.dataset.index);
        state.reader = null;
        render();
      }));
    }
    function renderRecord() {
      const v = venture();
      const r = rec();
      const ps = problems();
      const ss = sources();
      els.topName.innerHTML = 'Target<b>' + esc(v.name || "-") + '</b>';
      els.topSources.textContent = String(v.verified_link_count || ss.length || 0);
      els.topProblems.textContent = String(ps.length);
      els.status.textContent = (v.record_status || r.target?.record_status || "unknown") + " / " + (v.record_confidence || r.target?.confidence || "unknown");
      const founderNames = arr(r.entity_forms?.founders).map((f) => f.name).join(", ") || v.named_founders || "unverified";
      els.record.innerHTML =
        '<h1>' + esc(v.name || r.target?.name || "Untitled") + '</h1>' +
        '<p class="claim">' + esc(v.description || r.target?.one_line_summary || "No one-line claim.") + '</p>' +
        '<div class="facts">' +
          '<div class="fact"><b>founders</b>' + esc(founderNames) + '</div>' +
          '<div class="fact"><b>sector</b>' + esc(v.sector || "unknown") + '</div>' +
          '<div class="fact"><b>sources</b>' + esc(v.verified_link_count || ss.length || 0) + '/10</div>' +
          '<div class="fact"><b>problems</b>' + ps.length + '</div>' +
        '</div>' +
        '<div class="xlinks">' +
          arr(r.entity_forms?.founders).map((f) => '<button class="xlink" data-filter="' + esc(f.name) + '">' + esc(f.name) + '</button>').join("") +
          ps.slice(0, 4).map((p) => '<button class="xlink" data-lens="problems">' + esc(p.problem_type || p.title) + '</button>').join("") +
          ss.slice(0, 4).map((s, i) => '<button class="xlink" data-source="' + i + '">' + esc(s.evidence_level || s.source_type || "source") + '</button>').join("") +
        '</div>';
      els.record.querySelectorAll("[data-filter]").forEach((button) => button.addEventListener("click", () => {
        state.query = button.dataset.filter;
        els.search.value = state.query;
        renderMatrix();
      }));
      els.record.querySelectorAll("[data-lens]").forEach((button) => button.addEventListener("click", () => {
        state.lens = button.dataset.lens;
        renderLens();
      }));
      els.record.querySelectorAll("[data-source]").forEach((button) => button.addEventListener("click", () => {
        state.reader = { type: "source", index: Number(button.dataset.source) };
        state.lens = "evidence";
        renderLens();
        renderReader();
      }));
      renderReader();
    }
    function peerScore(row) {
      const v = venture();
      const sector = String(v.sector || "").split("/")[0].trim().toLowerCase();
      const rowSector = String(row.v.sector || "").toLowerCase();
      const sameSector = sector && rowSector.includes(sector) ? 10 : 0;
      return sameSector + Number(row.v.verified_link_count || row.s.length || 0) - Math.abs(problems().length - row.p.length);
    }
    function renderPeers() {
      const rows = DATA.ventures.map((v, index) => ({ v, index, p: problems(index), s: sources(index) }))
        .filter((row) => row.index !== state.selected)
        .sort((a, b) => peerScore(b) - peerScore(a))
        .slice(0, 4);
      els.peers.innerHTML = rows.map((row) =>
        '<button type="button" class="peer" data-index="' + row.index + '">' +
          '<h3>' + esc(row.v.name) + '</h3>' +
          '<p class="small">' + esc(row.v.sector || "sector unknown") + '</p>' +
          '<p class="micro">' + esc(row.v.verified_link_count || row.s.length || 0) + '/10 sources · ' + row.p.length + ' problems</p>' +
        '</button>'
      ).join("");
      els.peers.querySelectorAll("[data-index]").forEach((button) => button.addEventListener("click", () => {
        state.selected = Number(button.dataset.index);
        state.reader = null;
        render();
      }));
    }
    function setReader(type, index) {
      state.reader = { type, index };
      renderReader();
    }
    function renderReader() {
      let html = '<p class="micro">Select an ontology row to read its bound details.</p>';
      if (state.reader?.type === "source") {
        const s = sources()[state.reader.index];
        const binding = arr(rec().evidence_bindings).find((b) => b.evidence_id === s?.evidence_id) || {};
        html = '<dl>' +
          '<dt>source</dt><dd>' + evidenceLink(s) + '</dd>' +
          '<dt>type</dt><dd>' + esc(s?.source_type || "") + '</dd>' +
          '<dt>level</dt><dd>' + esc(s?.evidence_level || "") + '</dd>' +
          '<dt>excerpt</dt><dd>' + esc(s?.summary || "") + '</dd>' +
          '<dt>supports</dt><dd>' + esc(arr(binding.supports).join(" | ") || "No binding text.") + '</dd>' +
          '<dt>does not</dt><dd>' + esc(arr(binding.does_not_establish).join(" | ") || "No limitation captured.") + '</dd>' +
        '</dl>';
      }
      if (state.reader?.type === "problem") {
        const p = problems()[state.reader.index];
        html = '<dl>' +
          '<dt>problem</dt><dd>' + esc(p?.title || "") + '</dd>' +
          '<dt>state</dt><dd>' + esc(p?.state || "") + '</dd>' +
          '<dt>why</dt><dd>' + esc(p?.why_it_matters || "") + '</dd>' +
          '<dt>sources</dt><dd>' + arr(p?.evidence_links).map(evidenceLink).join(" ") + '</dd>' +
          '<dt>next</dt><dd>' + esc(arr(p?.next_probe).join(" | ")) + '</dd>' +
        '</dl>';
      }
      els.reader.innerHTML = html;
    }
    function renderLens() {
      const title = state.lens.charAt(0).toUpperCase() + state.lens.slice(1);
      els.lensTitle.textContent = title;
      document.querySelectorAll(".bottom button").forEach((button) => button.setAttribute("aria-current", String(button.dataset.lens === state.lens)));
      let html = "";
      if (state.lens === "evidence") {
        html = sources().map((s, i) => item(s.title || s.url, esc(s.summary || ""), [
          ["url", evidenceLink(s)],
          ["type", esc(s.source_type || "")],
          ["level", esc(s.evidence_level || "")],
          ["trace", esc(s.captured_at || "")]
        ], 'data-reader="source" data-index="' + i + '"')).join("");
      }
      if (state.lens === "claims") {
        html = claims().map((c) => item(c.claim_type || "claim", esc(c.claim_text || ""), [
          ["support", esc(c.support_status || "")],
          ["conf", esc(c.confidence ?? "")],
          ["sources", arr(c.evidence_links).map(evidenceLink).join(" ")]
        ])).join("");
      }
      if (state.lens === "edges") {
        html = edges().map((e) => item(e.subject + " → " + e.object, esc(e.predicate || ""), [
          ["state", esc(e.state || "")],
          ["conf", esc(e.confidence || "")],
          ["sources", arr(e.evidence_links).map(evidenceLink).join(" ")]
        ])).join("");
      }
      if (state.lens === "problems") {
        html = problems().map((p, i) => item(p.title, esc(p.why_it_matters || ""), [
          ["type", esc(p.problem_type || "")],
          ["state", esc(p.state || "")],
          ["next", esc(arr(p.next_probe)[0] || "")]
        ], 'data-reader="problem" data-index="' + i + '"')).join("");
      }
      if (state.lens === "risks") {
        html = risks().map((r) => item(r.title, esc(r.explanation || ""), [
          ["type", esc(r.risk_type || "")],
          ["sev", esc(r.severity || "")],
          ["sources", arr(r.evidence_links).map(evidenceLink).join(" ")]
        ])).join("");
      }
      if (state.lens === "gaps") {
        const gapRows = gaps().length ? gaps() : arr(rec().venture_diagnosis?.next_probe);
        html = gapRows.map((g, i) => item("Gap " + (i + 1), esc(g), [
          ["case", esc(venture().name)],
          ["links", esc(venture().source_gap_report?.verified_links_found || ((venture().verified_link_count || sources().length || 0) + "/10"))]
        ])).join("");
      }
      if (state.lens === "trace") {
        html = trace().map((t) => item(t.action || "TRACE", esc(t.reason || t.source || ""), [
          ["actor", esc(t.actor || "")],
          ["time", esc(t.timestamp || "")],
          ["state", esc((t.prior_state || "") + " → " + (t.new_state || ""))]
        ])).join("");
      }
      els.lens.innerHTML = html || '<p class="small">No records in this lens.</p>';
      els.lens.querySelectorAll("[data-reader]").forEach((button) => button.addEventListener("click", () => setReader(button.dataset.reader, Number(button.dataset.index))));
    }
    function render() {
      renderMatrix();
      renderRecord();
      renderPeers();
      renderLens();
    }
    els.search.addEventListener("input", () => {
      state.query = els.search.value.trim();
      renderMatrix();
    });
    els.sort.addEventListener("change", () => {
      state.sort = els.sort.value;
      renderMatrix();
    });
    els.toggle.addEventListener("click", () => {
      state.grid = !state.grid;
      els.toggle.textContent = state.grid ? "List" : "Grid";
      renderMatrix();
    });
    document.querySelectorAll(".bottom button").forEach((button) => button.addEventListener("click", () => {
      state.lens = button.dataset.lens;
      state.reader = null;
      renderLens();
      renderReader();
      document.querySelector(".panel:last-of-type").scrollIntoView({ behavior: "smooth", block: "start" });
    }));
    render();
  </script>
</body>
</html>`;

await fs.mkdir(outputDir, { recursive: true });
await fs.writeFile(dataPath, `${JSON.stringify(data, null, 2)}\n`);
await fs.writeFile(htmlPath, xanaduHtml);

console.log(JSON.stringify({
  htmlPath,
  dataPath,
  summary,
}, null, 2));
