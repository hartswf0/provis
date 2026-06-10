import fs from "node:fs/promises";
import path from "node:path";

const cwd = process.cwd();
const outDir = path.join(cwd, "outputs/provis-product-stack");
const entities = JSON.parse(await fs.readFile(path.join(outDir, "provis-204-casedex.json"), "utf8"));

const agents = [
  { id: "SCOUT", name: "Scout", role: "Public Surface Area Explorer", purpose: "Find public destination URLs and report source packets.", output: "source_packet" },
  { id: "GUARD", name: "Guard", role: "Boundary Enforcer", purpose: "Block private, paywalled, login-gated, doxxing, or illegitimate capture.", output: "BOUNDARY_FORM" },
  { id: "BINDER", name: "Binder", role: "Evidence Attacher", purpose: "Bind source, supports, does-not-establish, confidence, and trace.", output: "evidence_row" },
  { id: "LINKER", name: "Linker", role: "Graph Wanderer", purpose: "Test relationship edges without name-similarity shortcuts.", output: "EDGE_FORM" },
  { id: "CRITIC", name: "Critic", role: "Gap and Contradiction Spotter", purpose: "Turn evidence gaps and contradictions into problems and probes.", output: "PROBLEM_FORM" },
  { id: "SAGAN", name: "Sagan", role: "Cosmic Skeptic", purpose: "Downgrade overclaimed AI, deeptech, or miracle-product claims until proof appears.", output: "RISK_FORM" },
  { id: "MENCIUS", name: "Mencius", role: "Moral-Pressure Reader", purpose: "Map customer harm, privacy, labor, governance, and downside pressure.", output: "RISK_FORM" },
  { id: "MEITNER", name: "Meitner", role: "Hidden-Cause Detector", purpose: "Find hidden actors, buried causal chains, and prestige laundering.", output: "RISK_FORM" },
  { id: "ARCHIMEDES", name: "Archimedes", role: "First-Principles Tester", purpose: "Reduce business claims to the minimum proof test.", output: "Minimal_Test" },
  { id: "HEISENBERG", name: "Heisenberg", role: "Uncertainty Mapper", purpose: "Fork ambiguous records instead of forcing certainty.", output: "CONTRADICTION_FORM" },
  { id: "COMPILER", name: "Compiler", role: "Case-File Closer", purpose: "Package verified forms, edges, fits, problems, and traces into a case file.", output: "case_file" }
];

function safeJson(value) {
  return JSON.stringify(value).replace(/[<>&]/g, (char) => ({ "<": "\\u003c", ">": "\\u003e", "&": "\\u0026" }[char]));
}

const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>PROVIS Glass Loop - Actual Casedex</title>
<style>
:root{
  --page:#fbfaf7;
  --card:#fff;
  --ink:#090b0f;
  --muted:#646b73;
  --line:#d8d3ca;
  --line2:#b9b1a5;
  --soft:#f1eee8;
  --good:#e6f5ea;
  --warn:#fff4dc;
  --bad:#fff0ed;
  --blue:#eaf2ff;
  --shadow:0 16px 48px rgba(15,23,42,.12);
}
*{box-sizing:border-box;-webkit-tap-highlight-color:transparent}
html,body{margin:0;background:var(--page);color:var(--ink);font:15px/1.34 -apple-system,BlinkMacSystemFont,"SF Pro Text","Inter","Segoe UI",system-ui,sans-serif}
body{padding-bottom:calc(118px + env(safe-area-inset-bottom))}
button,input{font:inherit;color:inherit}
button{cursor:pointer;background:transparent;border:0}
a{color:inherit}
.app{max-width:440px;min-height:100svh;margin:0 auto;background:#fbfaf7}
.top{position:sticky;top:0;z-index:30;height:54px;display:grid;grid-template-columns:78px 1fr 44px;align-items:center;padding:0 11px;background:rgba(251,250,247,.96);border-bottom:1px solid var(--line);backdrop-filter:blur(14px)}
.brand{font-weight:950;letter-spacing:.04em}
.caseTitle{text-align:center;min-width:0}
.caseTitle strong{display:block;font-size:13px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.caseTitle span{display:block;color:var(--muted);font-size:10px;font-weight:850;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.topIcon{height:38px;border-radius:12px;font-size:21px;font-weight:900}
.view{padding:12px;animation:enter .16s ease both}
@keyframes enter{from{opacity:0;transform:translateY(7px)}to{opacity:1;transform:none}}
.card{background:var(--card);border:1px solid var(--line);border-radius:20px;box-shadow:0 1px 4px rgba(15,23,42,.04)}
.block{padding:13px}
.section{margin-top:12px}
.sectionHead{display:flex;align-items:center;justify-content:space-between;margin:0 2px 7px}
.sectionHead h2{margin:0;font-size:13px}
.sectionHead button{font-size:11px;font-weight:950;text-decoration:underline;text-underline-offset:3px}
.label{display:block;margin-bottom:7px;color:var(--muted);font-size:10px;font-weight:950;text-transform:uppercase;letter-spacing:.08em}
.muted{color:var(--muted)}
.entity{display:grid;grid-template-columns:52px 1fr auto;gap:10px;align-items:center}
.avatar{width:50px;height:50px;border:1px solid var(--line);border-radius:15px;background:var(--blue);display:grid;place-items:center;font-size:16px;font-weight:950}
.avatar.Person{background:#fff7e7}.avatar.Venture{background:#e9f7ee}.avatar.Organization{background:#f0ecfb}
.avatar.small{width:40px;height:40px;border-radius:13px;font-size:12px}.avatar.tiny{width:30px;height:30px;border-radius:10px;font-size:10px}
.entity h1{margin:0;font-size:20px;line-height:1.05;letter-spacing:-.025em}
.entity p{margin:4px 0 0;color:var(--muted);font-size:12px}
.chips{display:flex;gap:5px;flex-wrap:wrap;margin-top:7px}
.pill{display:inline-flex;align-items:center;min-height:22px;padding:2px 7px;border:1px solid var(--line);border-radius:7px;background:#fff;font-size:10px;font-weight:900;white-space:nowrap}
.pill.good{background:var(--good)}.pill.warn{background:var(--warn)}.pill.bad{background:var(--bad)}
.openBtn{min-height:38px;padding:0 10px;border:1px solid var(--line2);border-radius:12px;background:#fff;font-size:11px;font-weight:950}
.heroMetrics{display:grid;grid-template-columns:repeat(4,1fr);border-top:1px solid var(--line);margin-top:11px}
.metric{padding:9px 5px;border-right:1px solid var(--line);text-align:center}.metric:last-child{border-right:0}
.metric span{display:block;color:var(--muted);font-size:9px;font-weight:950;text-transform:uppercase}.metric strong{display:block;margin-top:3px;font-size:14px}
.question h2{margin:0;font-size:23px;line-height:1.12;letter-spacing:-.03em}
.hyper{padding:0;text-decoration:underline;text-decoration-thickness:1.4px;text-underline-offset:3px;font-weight:850}
.edgeLine{display:flex;align-items:center;gap:7px;flex-wrap:wrap;margin-top:11px;font-size:13px}
.edgeBox{border:1px solid var(--line);border-radius:10px;background:#fff;padding:8px 9px;font-weight:850}
.arrow{color:var(--muted);font-weight:950}
.stageGrid{display:grid;grid-template-columns:repeat(3,1fr);gap:8px}
.stage{min-height:64px;border:1px solid var(--line);border-radius:14px;background:#fff;padding:9px 7px;text-align:left}
.stage.active{background:#000;color:#fff;border-color:#000}.stage b{display:block;font-size:10px;text-transform:uppercase}.stage span{display:block;margin-top:5px;font-size:11px;opacity:.82}
.packetTop{display:grid;grid-template-columns:38px 1fr auto;gap:10px;align-items:center}
.packetIcon{width:38px;height:38px;border:1px solid var(--line);border-radius:13px;background:var(--good);display:grid;place-items:center;font-weight:950}
.packetTop strong{display:block;font-size:13px}.packetTop span{display:block;margin-top:3px;color:var(--muted);font-size:11px}
.split{display:grid;border-top:1px solid var(--line);margin-top:11px}
.split div{padding:10px 0;border-top:1px solid var(--line)}.split div:first-child{border-top:0}
.split h3{margin:0 0 5px;color:var(--muted);font-size:10px;text-transform:uppercase}.split p{margin:0;font-size:12px;overflow-wrap:anywhere}
.mapMini{display:grid;gap:8px}
.mapRow{display:flex;align-items:center;justify-content:center;gap:6px;flex-wrap:wrap}
.node{border:1px solid var(--line);border-radius:11px;background:#fff;padding:8px 10px;font-size:12px;font-weight:850}
.node.center{background:#000;color:#fff;border-color:#000}
.fact{border-top:1px solid var(--line);margin-top:11px}
.factrow{display:grid;grid-template-columns:104px 1fr;gap:10px;border-bottom:1px solid var(--line);padding:9px 0}
.factrow b{font-size:10px;text-transform:uppercase;color:var(--muted)}.factrow span{font-size:13px;overflow-wrap:anywhere}
.list{display:grid;gap:8px}
.row{min-height:66px;padding:10px;display:grid;grid-template-columns:40px 1fr auto;gap:9px;align-items:center;text-align:left}
.row strong{display:block;font-size:13px}.row span{display:block;margin-top:3px;color:var(--muted);font-size:11px;overflow-wrap:anywhere}
.source{padding:10px}.source strong{display:block;font-size:13px}.source span{display:block;margin-top:3px;color:var(--muted);font-size:11px;overflow-wrap:anywhere}.source a{display:block;margin-top:6px;color:#203860;font-size:11px;overflow-wrap:anywhere}
.threadMsg{padding:11px;display:grid;grid-template-columns:44px 1fr auto;gap:9px;text-align:left;align-items:start}.threadMsg+.threadMsg{border-top:1px solid var(--line)}
.role{width:40px;height:40px;border:1px solid var(--line);border-radius:13px;background:#fff;display:grid;place-items:center;font-size:10px;font-weight:950}
.threadMsg h3{margin:0;font-size:13px}.threadMsg p{margin:4px 0 0;color:var(--muted);font-size:12px}
.composer{display:grid;grid-template-columns:1fr 40px;gap:8px;margin-top:12px}
.composer input{min-height:42px;border:1px solid var(--line);border-radius:14px;background:#fff;padding:0 12px}.composer button{border-radius:999px;background:#000;color:#fff;font-weight:950}
.moveGrid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}
.moveCard{min-height:94px;padding:12px;border:1px solid var(--line);border-radius:16px;background:#fff;text-align:left}
.moveCard strong{display:block;font-size:15px}.moveCard span{display:block;margin-top:5px;color:var(--muted);font-size:11px}
.cmdBar{position:fixed;left:0;right:0;bottom:calc(54px + env(safe-area-inset-bottom));z-index:35;max-width:440px;margin:0 auto;display:grid;grid-template-columns:repeat(3,1fr);gap:8px;padding:9px 12px;background:rgba(251,250,247,.97);border-top:1px solid var(--line);backdrop-filter:blur(14px)}
.cmdBar button{min-height:44px;border:1px solid var(--line2);border-radius:14px;background:#fff;font-weight:950}.cmdBar button.primary{background:#000;color:#fff;border-color:#000}
.nav{position:fixed;left:0;right:0;bottom:0;z-index:36;max-width:440px;margin:0 auto;height:calc(54px + env(safe-area-inset-bottom));padding-bottom:env(safe-area-inset-bottom);display:grid;grid-template-columns:repeat(3,1fr);background:rgba(255,255,255,.97);border-top:1px solid var(--line);backdrop-filter:blur(14px)}
.nav button{font-size:10px;font-weight:900;color:var(--muted)}.nav button.active{color:#000;background:#f4f1eb}
.sheet{position:fixed;left:0;right:0;bottom:0;z-index:80;max-width:440px;margin:0 auto;transform:translateY(110%);transition:transform .2s ease;background:#fff;border:1px solid var(--line);border-radius:26px 26px 0 0;box-shadow:var(--shadow);padding:10px 14px calc(16px + env(safe-area-inset-bottom));max-height:83svh;overflow:auto}
.sheet.open{transform:translateY(0)}.grab{width:44px;height:5px;border-radius:999px;background:#d0ccc4;margin:0 auto 12px}.sheet h2{margin:0 44px 10px 0;font-size:18px}.close{position:absolute;top:12px;right:14px;width:36px;height:36px;border:1px solid var(--line);border-radius:12px;background:#fff;font-weight:950}
.searchInput{width:100%;min-height:42px;border:1px solid var(--line);border-radius:14px;background:#fff;padding:0 12px;margin-bottom:9px;outline:none}
.toast{position:fixed;left:12px;right:12px;bottom:calc(122px + env(safe-area-inset-bottom));z-index:90;max-width:416px;margin:0 auto;display:none;background:#000;color:#fff;border-radius:16px;padding:12px 14px;font-weight:850;box-shadow:var(--shadow)}.toast.show{display:block;animation:enter .14s ease both}
@media(min-width:760px){.app,.nav,.cmdBar,.sheet{border-left:1px solid var(--line);border-right:1px solid var(--line)}.split{grid-template-columns:1fr 1fr}.split div{border-top:0;border-left:1px solid var(--line);padding:10px}.split div:first-child{border-left:0}.sheet{border-radius:26px;bottom:18px}}
</style>
</head>
<body>
<div class="app">
  <header class="top">
    <button id="selectBtn" class="brand" type="button">PROVIS</button>
    <div class="caseTitle"><strong id="caseTitle">Casedex Loop</strong><span id="caseSub">one question - one edge - one packet</span></div>
    <button id="more" class="topIcon" type="button" aria-label="Open trace">...</button>
  </header>
  <main id="view" class="view"></main>
  <div class="cmdBar">
    <button id="verify" class="primary" type="button">VERIFY</button>
    <button id="probe" type="button">PROBE</button>
    <button id="link" type="button">LINK</button>
  </div>
  <nav class="nav">
    <button data-mode="case" class="active" type="button">CASE</button>
    <button data-mode="thread" type="button">THREAD</button>
    <button data-mode="move" type="button">MOVE</button>
  </nav>
  <section id="sheet" class="sheet">
    <div class="grab"></div>
    <button id="closeSheet" class="close" type="button">x</button>
    <h2 id="sheetTitle">Drawer</h2>
    <div id="sheetBody"></div>
  </section>
  <div id="toast" class="toast"></div>
</div>
<script id="entity-data" type="application/json">${safeJson(entities)}</script>
<script id="agent-data" type="application/json">${safeJson(agents)}</script>
<script>
const ENTITIES = JSON.parse(document.getElementById("entity-data").textContent);
const AGENTS = JSON.parse(document.getElementById("agent-data").textContent);
const state = { mode: "case", selected: 0, q: "", edgeStatus: {}, moves: [] };
const view = document.getElementById("view");
const caseTitle = document.getElementById("caseTitle");
const caseSub = document.getElementById("caseSub");
const sheet = document.getElementById("sheet");
const sheetTitle = document.getElementById("sheetTitle");
const sheetBody = document.getElementById("sheetBody");
const toast = document.getElementById("toast");

function esc(value){
  return String(value == null ? "" : value).replace(/[&<>"']/g, function(char){
    return {"&":"&amp;","<":"&lt;",">":"&gt;","\\"":"&quot;","'":"&#39;"}[char];
  });
}
function selected(){ return ENTITIES[state.selected] || ENTITIES[0]; }
function rows(entity){ return Array.isArray(entity.evidence_rows) ? entity.evidence_rows : []; }
function initials(name){
  const parts = String(name || "P").split(/\\s+/).filter(Boolean);
  return (parts.length ? parts.slice(0, 2).map(function(part){ return part[0]; }).join("") : "P").toUpperCase();
}
function evidenceLevel(entity){
  const count = Number(entity.verified_link_count || entity.evidence_count || 0);
  if(count >= 8) return "L4";
  if(count >= 5) return "L3";
  if(count >= 2) return "L2";
  if(count >= 1) return "L1";
  return "L0";
}
function stateLabel(entity){
  const forced = state.edgeStatus[entity.id];
  if(forced) return forced;
  if(Number(entity.verified_link_count || 0) >= Number(entity.target_links || 10)) return "supported";
  if(Number(entity.verified_link_count || 0) > 0) return "ambiguous";
  return "unresolved";
}
function pillClass(entity){
  const current = stateLabel(entity);
  if(current === "supported" || current === "verified") return "good";
  if(current === "ambiguous" || current === "reviewing") return "warn";
  return "bad";
}
function sourceText(entity, key){
  const text = entity.source_context || "";
  const match = text.match(new RegExp(key + ":\\\\s*([^|]+)", "i"));
  return match ? match[1].trim() : "";
}
function predicateFor(entity){
  const text = ((entity.role || "") + " " + (entity.source_context || "") + " " + (entity.group_label || "")).toLowerCase();
  if(entity.entity_type === "Venture") return "documented_by";
  if(entity.entity_type === "Organization") return "hosts";
  if(/founder|co-founder|cofounder/.test(text)) return "founder_of";
  if(/investor|fund|capital|venture partner/.test(text)) return "investor_in";
  if(/mentor|advisor/.test(text)) return "advisor_to";
  if(/fellow|student|staff|faculty|director|professor|lecturer|program/.test(text)) return "affiliated_with";
  return "associated_with";
}
function objectFor(entity){
  return sourceText(entity, "venture_program") ||
    sourceText(entity, "registry") ||
    sourceText(entity, "programs") ||
    sourceText(entity, "venture") ||
    entity.source_title ||
    entity.group_label ||
    "PROVIS Casedex";
}
function currentEdge(entity){
  return {
    id: "EDGE-" + (entity.tile_id || entity.id || "000"),
    subject: entity.entity,
    predicate: predicateFor(entity),
    object: objectFor(entity),
    state: stateLabel(entity),
    evidenceCount: rows(entity).length || Number(entity.evidence_count || 0),
    doesNotEstablish: entity.gap_reason || "Does not establish equity, control, operating status, revenue, customer traction, or technical validity unless the source explicitly states it.",
    nextProbe: entity.probe || "Find additional public destination sources without padding or private data."
  };
}
function currentPacket(entity){
  const edge = currentEdge(entity);
  const first = rows(entity)[0] || {};
  const support = first.extracted_facts || entity.source_context || entity.coverage_status || "Public evidence exists for this Casedex entity.";
  const limit = first.unresolved_gap || edge.doesNotEstablish;
  return {
    id: "PKT-" + (entity.tile_id || entity.id || "000"),
    source: first.source_title || entity.source_title || entity.source_url || "Casedex source",
    sourceType: first.evidence_type || entity.source_type || "public_source",
    level: evidenceLevel(entity),
    claim: entity.coverage_status || entity.problem || "Entity has public-source evidence in PROVIS.",
    supports: support,
    doesNotEstablish: limit,
    gap: entity.gap_reason || entity.problem || "Source gap remains.",
    trace: "Scout -> Guard -> Binder -> Linker -> Critic"
  };
}
function sourceList(entity){
  const out = rows(entity).map(function(row){
    return {
      title: row.source_title || row.url || "Evidence source",
      kind: row.evidence_type || row.source_group || entity.source_type || "public_source",
      url: row.url,
      level: evidenceLevel(entity),
      supports: row.extracted_facts,
      limit: row.unresolved_gap
    };
  });
  if(out.length) return out;
  return (entity.verified_urls || []).map(function(url, index){
    return { title: "Verified URL " + (index + 1), kind: entity.source_type || "public_source", url: url, level: evidenceLevel(entity), supports: entity.coverage_status, limit: entity.gap_reason };
  });
}
function problemList(entity){
  const edge = currentEdge(entity);
  const gap = Number(entity.gap_to_target || 0);
  const problems = [];
  if(gap > 0) problems.push({ id: "P1", title: entity.problem || "Source coverage below target", severity: gap > 7 ? "High" : "Medium", text: entity.gap_reason || "Verified links remain below target." });
  if(edge.predicate === "founder_of" || /founder/i.test(entity.role || entity.source_context || "")) problems.push({ id: "P2", title: "Founder relationship needs source-bound edge", severity: "High", text: "No founder relationship should be promoted from proximity, same-name match, or ecosystem association alone." });
  if(entity.entity_type === "Venture") problems.push({ id: "P3", title: "Venture claim needs artifact proof", severity: "Medium", text: "Product, customer, revenue, security, or technical claims need stronger public artifacts." });
  if(!problems.length) problems.push({ id: "P1", title: "No active source gap detected", severity: "Low", text: "Keep trace and avoid adding padding links." });
  return problems.slice(0, 4);
}
function relatedEntities(entity){
  const urls = new Set((entity.verified_urls || []).filter(Boolean));
  const shared = ENTITIES.filter(function(candidate){
    return candidate !== entity && (candidate.verified_urls || []).some(function(url){ return urls.has(url); });
  });
  const sameGroup = ENTITIES.filter(function(candidate){ return candidate !== entity && candidate.group === entity.group; });
  const combined = shared.concat(sameGroup);
  return combined.filter(function(candidate, index){ return combined.indexOf(candidate) === index; }).slice(0, 10);
}
function filteredEntities(){
  const q = state.q.trim().toLowerCase();
  if(!q) return ENTITIES;
  return ENTITIES.filter(function(entity){
    return [
      entity.tile_id,
      entity.entity,
      entity.entity_type,
      entity.role,
      entity.group_label,
      entity.coverage_status,
      entity.gap_reason,
      entity.probe
    ].join(" ").toLowerCase().includes(q);
  });
}
function entityPills(entity){
  return '<span class="pill ' + pillClass(entity) + '">' + esc(stateLabel(entity)) + '</span><span class="pill">' + esc(evidenceLevel(entity)) + '</span><span class="pill">' + esc(entity.verified_link_count || 0) + '/' + esc(entity.target_links || 10) + '</span>';
}
function entityCard(entity){
  const problems = problemList(entity).filter(function(problem){ return problem.severity !== "Low"; }).length;
  return '<section class="card block"><div class="entity"><button class="avatar ' + esc(entity.entity_type) + '" data-open="select" type="button">' + esc(initials(entity.entity)) + '</button><div><h1><button class="hyper" data-open="entity" type="button">' + esc(entity.entity) + '</button></h1><p>' + esc(entity.role || entity.entity_type) + '</p><div class="chips">' + entityPills(entity) + '</div></div><button class="openBtn" data-open="select" type="button">204</button></div><div class="heroMetrics"><div class="metric"><span>Evidence</span><strong>' + esc(entity.verified_link_count || 0) + '</strong></div><div class="metric"><span>Gaps</span><strong>' + esc(entity.gap_to_target || 0) + '</strong></div><div class="metric"><span>Problems</span><strong>' + problems + '</strong></div><div class="metric"><span>Edges</span><strong>' + relatedEntities(entity).length + '</strong></div></div></section>';
}
function sourceHref(item){
  if(/^https?:/i.test(item.url || "")) return '<a href="' + esc(item.url) + '" target="_blank" rel="noreferrer">' + esc(item.url) + '</a>';
  return '<span>' + esc(item.url || "No source URL") + '</span>';
}
function setHeader(label){
  const entity = selected();
  caseTitle.textContent = entity.entity;
  caseSub.textContent = label + " - " + ENTITIES.length + " entities";
}
function renderCase(){
  const entity = selected();
  const edge = currentEdge(entity);
  const packet = currentPacket(entity);
  const rel = relatedEntities(entity).slice(0, 4);
  setHeader("case loop");
  view.innerHTML =
    entityCard(entity) +
    '<section class="card block question section"><span class="label">Current question</span><h2>Is <button class="hyper" data-open="entity" type="button">' + esc(edge.subject) + '</button> <button class="hyper" data-open="edge" type="button">' + esc(edge.predicate) + '</button> <button class="hyper" data-open="edge" type="button">' + esc(edge.object) + '</button>?</h2><div class="edgeLine"><button class="edgeBox" data-open="entity" type="button">' + esc(edge.subject) + '</button><span class="arrow">-&gt;</span><button class="edgeBox" data-open="edge" type="button">' + esc(edge.predicate) + '</button><span class="arrow">-&gt;</span><button class="edgeBox" data-open="edge" type="button">' + esc(edge.object) + '</button></div></section>' +
    '<section class="section"><div class="stageGrid"><button class="stage active" data-open="sources" type="button"><b>Capture</b><span>Scout + Guard</span></button><button class="stage active" data-open="packet" type="button"><b>Bind</b><span>Binder + Linker</span></button><button class="stage" data-open="problems" type="button"><b>Judge</b><span>Critic</span></button></div></section>' +
    '<section class="section"><div class="sectionHead"><h2>Agent packet</h2><button data-open="packet" type="button">Open</button></div><button class="card block" data-open="packet" type="button" style="width:100%;text-align:left"><div class="packetTop"><div class="packetIcon">PK</div><div><strong>' + esc(packet.id) + ': ' + esc(packet.claim) + '</strong><span>Critic: ' + esc(packet.gap) + '</span></div><span class="pill warn">' + esc(packet.level) + '</span></div></button></section>' +
    '<section class="section"><div class="sectionHead"><h2>Local links</h2><button data-open="edge" type="button">Edge</button></div><div class="card block mapMini"><div class="mapRow"><button class="node center" data-open="entity" type="button">' + esc(edge.subject) + '</button><span class="arrow">-&gt; ' + esc(edge.predicate) + ' -&gt;</span><button class="node" data-open="edge" type="button">' + esc(edge.object) + '</button></div><div class="mapRow">' + rel.map(function(item){ return '<button class="node" data-select="' + ENTITIES.indexOf(item) + '" type="button">' + esc(item.entity) + '</button>'; }).join("") + '</div></div></section>' +
    '<section class="section"><div class="sectionHead"><h2>Next move</h2><button data-open="trace" type="button">Trace</button></div><button class="card block" data-open="probe" type="button" style="width:100%;text-align:left"><span class="label">Recommended</span><strong>' + esc(edge.nextProbe) + '</strong><p class="muted">State remains ' + esc(edge.state) + ' until better evidence closes the gap.</p></button></section>';
}
function renderThread(){
  const entity = selected();
  const edge = currentEdge(entity);
  const packet = currentPacket(entity);
  const sources = sourceList(entity);
  const problems = problemList(entity);
  setHeader("thread");
  const messages = [
    ["Scout", "Found " + sources.length + " public source candidates for " + entity.entity + "."],
    ["Guard", "Private data stays out. Login-gated or unsafe sources are not final evidence."],
    ["Binder", "Bound packet " + packet.id + ": supports known public context; limit preserved."],
    ["Linker", "Edge under review: " + edge.subject + " -> " + edge.predicate + " -> " + edge.object + "."],
    ["Critic", problems[0].title + ". Next probe: " + edge.nextProbe],
    ["Compiler", edge.state === "supported" ? "Case can move toward export after Quickcheck." : "Not export ready. Preserve SOURCE_GAP and continue probe."]
  ];
  view.innerHTML =
    entityCard(entity) +
    '<section class="card block question section"><span class="label">Thread question</span><h2>Verify the current edge?</h2></section>' +
    '<section class="card section">' + messages.map(function(message){
      const key = message[0] === "Scout" ? "sources" : message[0] === "Binder" ? "packet" : message[0] === "Linker" ? "edge" : message[0] === "Critic" ? "problems" : "trace";
      return '<button class="threadMsg" data-open="' + key + '" type="button" style="width:100%"><div class="role">' + esc(message[0].slice(0, 2).toUpperCase()) + '</div><div><h3>' + esc(message[0]) + '</h3><p>' + esc(message[1]) + '</p></div><span class="pill">' + esc(key) + '</span></button>';
    }).join("") + '</section><div class="composer"><input placeholder="Ask agents..." aria-label="Ask agents"><button data-action="probe" type="button">-&gt;</button></div>';
}
function renderMove(){
  const entity = selected();
  const edge = currentEdge(entity);
  const packet = currentPacket(entity);
  const problems = problemList(entity);
  setHeader("move");
  view.innerHTML =
    entityCard(entity) +
    '<section class="card block section question"><span class="label">Decision</span><h2>Edge under review</h2><div class="fact"><div class="factrow"><b>State</b><span>' + esc(edge.state) + '</span></div><div class="factrow"><b>Evidence</b><span><button class="hyper" data-open="packet" type="button">' + esc(packet.level) + ' + ' + esc(edge.evidenceCount) + ' evidence rows</button></span></div><div class="factrow"><b>Problem</b><span><button class="hyper" data-open="problems" type="button">' + esc(problems[0].title) + '</button></span></div><div class="factrow"><b>Recommended</b><span><button class="hyper" data-open="probe" type="button">' + esc(Number(entity.gap_to_target || 0) > 0 ? "probe" : "verify") + '</button></span></div></div></section>' +
    '<section class="section"><div class="sectionHead"><h2>Legal moves</h2><button data-open="trace" type="button">Trace</button></div><div class="moveGrid"><button class="moveCard" data-action="verify" type="button"><strong>Verify</strong><span>Accept only source-bound facts.</span></button><button class="moveCard" data-action="probe" type="button"><strong>Probe</strong><span>Ask Scout for missing public proof.</span></button><button class="moveCard" data-action="link" type="button"><strong>Link</strong><span>Open edge review.</span></button><button class="moveCard" data-action="reject" type="button"><strong>Reject</strong><span>Mark invalid or blocked.</span></button><button class="moveCard" data-action="fork" type="button"><strong>Fork</strong><span>Split ambiguous identity or edge.</span></button><button class="moveCard" data-action="export" type="button"><strong>Export</strong><span>Run Compiler gate.</span></button></div></section>' +
    '<section class="card block section"><span class="label">Trace preview</span><strong>If PROBE is chosen</strong><p class="muted">Create a trace, keep the state ambiguous, and assign Scout to find public destination evidence.</p></section>';
}
function render(){
  document.querySelectorAll("[data-mode]").forEach(function(button){ button.classList.toggle("active", button.dataset.mode === state.mode); });
  if(state.mode === "case") renderCase();
  if(state.mode === "thread") renderThread();
  if(state.mode === "move") renderMove();
}
function showToast(message){
  toast.textContent = message;
  toast.classList.add("show");
  setTimeout(function(){ toast.classList.remove("show"); }, 1800);
}
function openDrawer(type){
  const entity = selected();
  const edge = currentEdge(entity);
  const packet = currentPacket(entity);
  sheetBody.className = "";
  if(type === "select"){
    const items = filteredEntities().slice(0, 80).map(function(item){
      return '<button class="row card" data-select="' + ENTITIES.indexOf(item) + '" type="button"><div class="avatar small ' + esc(item.entity_type) + '">' + esc(initials(item.entity)) + '</div><div><strong>' + esc(item.entity) + '</strong><span>' + esc(item.role || item.entity_type) + '</span></div><span class="pill">' + esc(evidenceLevel(item)) + '</span></button>';
    }).join("");
    sheetTitle.textContent = "204 Entity Casedex";
    sheetBody.innerHTML = '<input class="searchInput" value="' + esc(state.q) + '" placeholder="Search people, ventures, orgs, problems..." data-search><div class="list">' + items + '</div>';
  }
  if(type === "entity"){
    sheetTitle.textContent = "Entity";
    sheetBody.innerHTML = entityCard(entity) + '<section class="card block section"><div class="fact"><div class="factrow"><b>Type</b><span>' + esc(entity.entity_type) + '</span></div><div class="factrow"><b>Role</b><span>' + esc(entity.role || "Unknown") + '</span></div><div class="factrow"><b>Group</b><span>' + esc(entity.group_label || entity.group || "PROVIS") + '</span></div><div class="factrow"><b>Trace</b><span>' + esc(entity.trace || "CASEDEX_ENTITY") + '</span></div></div></section>';
  }
  if(type === "edge"){
    sheetTitle.textContent = "Edge";
    sheetBody.innerHTML = '<section class="card block"><span class="label">' + esc(edge.id) + '</span><h2 style="margin:0 0 8px">' + esc(edge.subject) + ' -> <button class="hyper" data-open="edgeRule" type="button">' + esc(edge.predicate) + '</button> -> ' + esc(edge.object) + '</h2><div class="chips"><span class="pill ' + pillClass(entity) + '">' + esc(edge.state) + '</span><button class="pill" data-open="packet" type="button">' + esc(edge.evidenceCount) + ' evidence rows</button></div><div class="fact"><div class="factrow"><b>Supports</b><span>' + esc(packet.supports) + '</span></div><div class="factrow"><b>Does not establish</b><span>' + esc(edge.doesNotEstablish) + '</span></div><div class="factrow"><b>Next probe</b><span>' + esc(edge.nextProbe) + '</span></div></div></section><section class="section moveGrid"><button class="moveCard" data-action="probe" type="button"><strong>Probe</strong><span>Create next source hunt.</span></button><button class="moveCard" data-action="fork" type="button"><strong>Fork</strong><span>Split ambiguity.</span></button></section>';
  }
  if(type === "edgeRule"){
    sheetTitle.textContent = "Edge Rule";
    sheetBody.innerHTML = '<section class="card block"><span class="label">No edge without evidence</span><h2 style="margin:0 0 8px">' + esc(edge.predicate) + '</h2><p class="muted">A relationship edge needs source-backed support. Name similarity, co-presence, or ecosystem proximity is not enough. Every edge must preserve what it does not establish.</p></section>';
  }
  if(type === "packet"){
    sheetTitle.textContent = "Packet";
    sheetBody.innerHTML = '<section class="card block"><div class="packetTop"><div class="packetIcon">PK</div><div><strong>' + esc(packet.id) + '</strong><span>' + esc(packet.trace) + '</span></div><span class="pill warn">' + esc(packet.level) + '</span></div><div class="fact"><div class="factrow"><b>Source</b><span><button class="hyper" data-open="sources" type="button">' + esc(packet.source) + '</button></span></div><div class="factrow"><b>Claim</b><span>' + esc(packet.claim) + '</span></div><div class="factrow"><b>Supports</b><span>' + esc(packet.supports) + '</span></div><div class="factrow"><b>Limit</b><span>' + esc(packet.doesNotEstablish) + '</span></div><div class="factrow"><b>Gap</b><span><button class="hyper" data-open="problems" type="button">' + esc(packet.gap) + '</button></span></div></div></section>';
  }
  if(type === "sources"){
    sheetTitle.textContent = "Sources";
    sheetBody.innerHTML = '<div class="list">' + sourceList(entity).map(function(item){
      return '<section class="card source"><strong>' + esc(item.title) + '</strong><span>' + esc(item.kind) + ' - ' + esc(item.level) + '</span>' + sourceHref(item) + '<div class="split"><div><h3>Supports</h3><p>' + esc(item.supports || packet.supports) + '</p></div><div><h3>Does not establish</h3><p>' + esc(item.limit || packet.doesNotEstablish) + '</p></div></div></section>';
    }).join("") + '</div>';
  }
  if(type === "problems"){
    sheetTitle.textContent = "Problems";
    sheetBody.innerHTML = '<div class="list">' + problemList(entity).map(function(problem){
      return '<section class="card source"><strong>' + esc(problem.id) + ' - ' + esc(problem.title) + '</strong><span>Severity: ' + esc(problem.severity) + '</span><p class="muted">' + esc(problem.text) + '</p></section>';
    }).join("") + '</div>';
  }
  if(type === "probe"){
    sheetTitle.textContent = "Probe";
    sheetBody.innerHTML = '<section class="card block"><span class="label">Next public-source hunt</span><h2 style="margin:0 0 10px">' + esc(edge.nextProbe) + '</h2><p class="muted">Assigned to Scout. Guard rejects private, login-gated, paywalled, doxxing-risk, or raw search-result evidence before Binder sees it.</p></section><section class="section moveGrid"><button class="moveCard" data-action="probe" type="button"><strong>Create Probe</strong><span>Keep uncertainty visible.</span></button><button class="moveCard" data-open="sources" type="button"><strong>Sources</strong><span>Review evidence first.</span></button></section>';
  }
  if(type === "trace"){
    sheetTitle.textContent = "Trace";
    const base = [
      { move: "CAPTURE", result: "Casedex source rows loaded for " + entity.entity + ".", target: entity.tile_id || entity.id },
      { move: "GUARD", result: "Private data excluded; public destination URLs only.", target: packet.sourceType },
      { move: "BIND", result: "Packet " + packet.id + " bound to current edge.", target: edge.id },
      { move: "JUDGE", result: problemList(entity)[0].title, target: edge.state }
    ];
    sheetBody.innerHTML = '<div class="list">' + base.concat(state.moves).map(function(trace){
      return '<section class="card source"><strong>' + esc(trace.move) + ' - ' + esc(trace.target) + '</strong><span>' + esc(trace.result) + '</span></section>';
    }).join("") + '</div>';
  }
  sheet.classList.add("open");
  if(type === "select"){
    const input = sheetBody.querySelector("[data-search]");
    if(input) input.focus();
  }
}
function recordMove(move){
  const entity = selected();
  const edge = currentEdge(entity);
  const upper = move.toUpperCase();
  const resultMap = {
    verify: "Verification requires enough support and no unresolved source gap.",
    probe: "Created probe: " + edge.nextProbe,
    link: "Opened edge review for " + edge.predicate + ".",
    reject: "Recorded rejection or boundary note.",
    fork: "Created fork candidate for ambiguous identity or relationship.",
    export: "Compiler gate checked export readiness."
  };
  state.moves.unshift({ move: upper, target: edge.id, result: resultMap[move] || "Move recorded." });
  if(move === "verify" && Number(entity.gap_to_target || 0) === 0) state.edgeStatus[entity.id] = "supported";
  if(move === "verify" && Number(entity.gap_to_target || 0) > 0) state.edgeStatus[entity.id] = "reviewing";
  if(move === "probe") state.edgeStatus[entity.id] = "ambiguous";
  showToast(upper + ": " + (resultMap[move] || "Move recorded."));
  sheet.classList.remove("open");
  render();
}
document.addEventListener("click", function(event){
  const mode = event.target.closest("[data-mode]");
  if(mode){ state.mode = mode.dataset.mode; render(); scrollTo({top:0, behavior:"smooth"}); return; }
  const open = event.target.closest("[data-open]");
  if(open){ openDrawer(open.dataset.open); return; }
  const select = event.target.closest("[data-select]");
  if(select){ state.selected = Number(select.dataset.select) || 0; state.q = ""; sheet.classList.remove("open"); state.mode = "case"; render(); scrollTo({top:0, behavior:"smooth"}); return; }
  const action = event.target.closest("[data-action]");
  if(action){ recordMove(action.dataset.action); return; }
});
document.addEventListener("input", function(event){
  if(event.target.matches("[data-search]")){
    state.q = event.target.value;
    openDrawer("select");
  }
});
document.getElementById("selectBtn").onclick = function(){ openDrawer("select"); };
document.getElementById("more").onclick = function(){ openDrawer("trace"); };
document.getElementById("verify").onclick = function(){ recordMove("verify"); };
document.getElementById("probe").onclick = function(){ recordMove("probe"); };
document.getElementById("link").onclick = function(){ openDrawer("edge"); };
document.getElementById("closeSheet").onclick = function(){ sheet.classList.remove("open"); };
render();
</script>
</body>
</html>`;

await fs.writeFile(path.join(outDir, "provis-glass-loop.html"), html);
console.log(`Wrote ${path.join(outDir, "provis-glass-loop.html")} with ${entities.length} entities`);
