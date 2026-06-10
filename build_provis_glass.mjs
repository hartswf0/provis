import fs from "node:fs/promises";
import path from "node:path";

const root = "/Users/gaia/Documents/Codex/2026-06-10/files-mentioned-by-the-user-provis";
const outDir = path.join(root, "outputs/provis-product-stack");
const entityRows = JSON.parse(await fs.readFile(path.join(outDir, "provis-204-casedex.json"), "utf8"));
const traceRows = JSON.parse(await fs.readFile(path.join(outDir, "provis-trace-rows.json"), "utf8"));

const agents = [
  {
    id: "SCOUT",
    name: "Scout",
    icon: "⌕",
    role: "Public Surface Area Explorer",
    purpose: "Finds public destination URLs and reports source packets.",
    move: "capture",
    output: "source_packet",
    steps: [
      "Receive target entity: Person, Venture, or Organization.",
      "Identify canonical public URLs: official websites, team pages, press articles, university rosters.",
      "Filter out aggregator spam, paywalled domains, private social profiles, and search result pages.",
      "Return viable source URLs awaiting Guard and Binder."
    ]
  },
  {
    id: "GUARD",
    name: "Guard",
    icon: "◈",
    role: "Boundary Enforcer",
    purpose: "Blocks private, paywalled, login-gated, or illegitimate capture.",
    move: "reject",
    output: "BOUNDARY_FORM",
    steps: [
      "Analyze source text and URLs provided by Scout.",
      "Reject login-gated, private, sensitive, paywalled, doxxing, or leaked material.",
      "Preserve the rejection as a safety trace.",
      "Suggest a safe public substitute probe."
    ]
  },
  {
    id: "BINDER",
    name: "Binder",
    icon: "⛓",
    role: "Evidence Attacher",
    purpose: "Attaches source, support, limit, confidence, and trace.",
    move: "bind",
    output: "evidence_row",
    steps: [
      "Consume a Guard-approved public source.",
      "Extract bounded assertions as Claim candidates.",
      "Define exactly what the source supports.",
      "Define exactly what the source does not establish.",
      "Bind evidence to entity, edge, problem, or probe."
    ]
  },
  {
    id: "LINKER",
    name: "Linker",
    icon: "◎",
    role: "Graph Wanderer",
    purpose: "Tests edges without name-similarity shortcuts.",
    move: "link",
    output: "EDGE_FORM",
    steps: [
      "Receive two entities and candidate source text.",
      "Test for a formal source-backed relationship edge.",
      "Reject name-similarity-only edges.",
      "Output subject, predicate, object, supports, does-not-establish, confidence."
    ]
  },
  {
    id: "CRITIC",
    name: "Critic",
    icon: "!",
    role: "Gap & Contradiction Spotter",
    purpose: "Turns gaps and contradictions into named problems.",
    move: "problem",
    output: "PROBLEM_FORM",
    steps: [
      "Review the evidence packet from Binder.",
      "Identify unsupported traction, missing team pages, ambiguous founder identity, or weak source layers.",
      "Create a named Problem_Form.",
      "Generate the next specific public-source Probe."
    ]
  },
  {
    id: "SAGAN",
    name: "Sagan",
    icon: "★",
    role: "Cosmic Skeptic",
    purpose: "Downgrades unsupported AI, deeptech, or miracle-product claims.",
    move: "downgrade",
    output: "RISK_FORM",
    steps: [
      "Target AI claims, deeptech claims, scientific language, and miracle-product pitches.",
      "Ask what proof would make the claim credible.",
      "Downgrade confidence when proof is absent.",
      "Create technical feasibility or Wizard-of-Oz risk."
    ]
  },
  {
    id: "MENCIUS",
    name: "Mencius",
    icon: "♡",
    role: "Moral-Pressure Reader",
    purpose: "Maps customer harm, governance, and downside risk.",
    move: "risk",
    output: "RISK_FORM",
    steps: [
      "Target privacy risk, labor risk, exploitative incentives, and public-good claims.",
      "Ask who is harmed and who bears the downside.",
      "Create customer-harm, governance, or compliance Risk_Form.",
      "Keep critique source-bound."
    ]
  },
  {
    id: "MEITNER",
    name: "Meitner",
    icon: "∴",
    role: "Hidden-Cause Detector",
    purpose: "Finds buried causal chains, hidden contributors, and prestige laundering.",
    move: "fork",
    output: "RISK_FORM",
    steps: [
      "Target quiet mechanisms, overlooked contributors, and buried causal chains.",
      "Assess whether a lab, institution, or uncredited contributor is doing hidden work.",
      "Create hidden-contributor or prestige-laundering risk only when evidence supports it.",
      "Fork uncertainty rather than inventing a story."
    ]
  },
  {
    id: "ARCHIMEDES",
    name: "Archimedes",
    icon: "△",
    role: "First-Principles Tester",
    purpose: "Reduces business claims to the minimum proof test.",
    move: "probe",
    output: "Minimal_Test",
    steps: [
      "Target unit economics, product reality, and scale claims.",
      "Find the smallest public proof that would materially update confidence.",
      "Create a Minimal_Test Probe.",
      "Avoid over-reducing social or market complexity."
    ]
  },
  {
    id: "HEISENBERG",
    name: "Heisenberg",
    icon: "?",
    role: "Uncertainty Mapper",
    purpose: "Forks ambiguous records instead of forcing certainty.",
    move: "contradict",
    output: "CONTRADICTION_FORM",
    steps: [
      "Target same-name founders, stale sources, and conflicting timelines.",
      "If Source A and Source B disagree, do not guess.",
      "Create a Contradiction_Form and move state to contradicted or ambiguous.",
      "Preserve both sources until resolved."
    ]
  },
  {
    id: "COMPILER",
    name: "Compiler",
    icon: "▣",
    role: "Case-File Closer",
    purpose: "Packages Forms, Edges, Fits, Problems, and Traces into a case file.",
    move: "export",
    output: "case_file",
    steps: [
      "Ingest all Forms, Edges, Fits, Problems, and Traces.",
      "Compile final JSON/HTML presentation.",
      "Ensure every fact maps to evidence_id.",
      "Export Venture Diagnosis and Bear Case Diagnosis."
    ]
  }
];

const elements = [
  ["Surface", "Entity", "Pinned selected entity, metrics, network, evidence, problems, next move."],
  ["Surface", "Map", "One-hop relationship topology with edge review and fork/probe controls."],
  ["Surface", "Thread", "Agent packet timeline with operator command composer."],
  ["Surface", "Evidence", "Latest source packet with supports, does-not-establish, source list, and related edge."],
  ["Surface", "Move", "Decision state, recommended move, open problems, commands, and trace preview."],
  ["Surface", "Agents", "POML prompt deck: Scout, Guard, Binder, Linker, Critic, explorers, Compiler."],
  ["Surface", "Index", "All products, objects, agents, commands, states, evidence levels, and hard boundaries."],
  ["Object", "Field", "The bounded public-source evidence field around a venture or ecosystem actor."],
  ["Object", "Form", "A structured object awaiting evidence: founder, venture, source, claim, edge, risk, problem."],
  ["Object", "Fit", "Source + Observation + Assessment + Problem + Probe."],
  ["Object", "Trace", "Immutable record of capture, parsing, binding, confidence change, contradiction, rejection, export."],
  ["Object", "Source", "Public destination page, never a raw search result."],
  ["Object", "Claim", "Candidate assertion extracted from a source."],
  ["Object", "Edge", "Source-backed relationship between entities."],
  ["Object", "Problem", "Named gap, contradiction, uncertainty, weak source, or risk."],
  ["Object", "Probe", "Specific next public-source hunt."],
  ["Command", "Verify", "Raise or freeze state only when evidence supports it."],
  ["Command", "Probe", "Create the next source-search task without treating search as evidence."],
  ["Command", "Link", "Create or inspect a source-backed relationship edge."],
  ["Command", "Reject", "Mark invalid, private, login-gated, padded, or unsupported material."],
  ["Command", "Fork", "Split ambiguity instead of collapsing it into false certainty."],
  ["Command", "Export", "Compile case file, evidence register, edge list, problem ledger, trace."]
];

const products = [
  ["PROVIS", "provis.html", "Ontology and source-bound language."],
  ["PROVISGRID", "provisgrid.html", "204-entity evidence board."],
  ["PROVISDECK", "provisdeck.html", "120-card language plus 204 CASE expansion."],
  ["PROVIS PLUS", "provis-plus.html", "Prompt-system integrated casedex app."],
  ["PROVIS GLASS", "provis-glass.html", "Mobile glass branch with pinned entity, agentdeck, evidence packet, and element index."],
  ["DECKPRESS", "deckpress.html", "Printable/mobile artifact generator."]
];

function safeJson(value) {
  return JSON.stringify(value).replace(/[<>&]/g, (char) => ({ "<": "\\u003c", ">": "\\u003e", "&": "\\u0026" }[char]));
}

const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>PROVIS Glass</title>
<style>
:root {
  color-scheme: light;
  --page:#fbfaf7; --card:#fff; --ink:#0c0d0f; --muted:#667085; --line:#dedbd3; --line2:#c9c5bc;
  --soft:#f2f0eb; --green:#e6f5eb; --greenInk:#116232; --amber:#fff4dd; --amberInk:#845502;
  --red:#fff0ed; --redInk:#a22a1c; --blue:#eaf2ff; --purple:#f2ecff; --violet:#6250c7;
  --shadow:0 18px 44px rgba(15,23,42,.12);
}
* { box-sizing:border-box; -webkit-tap-highlight-color:transparent; }
html,body { margin:0; min-height:100%; background:var(--page); color:var(--ink); font:14px/1.32 -apple-system,BlinkMacSystemFont,"SF Pro Text","Inter","Segoe UI",system-ui,sans-serif; letter-spacing:0; }
body { padding-bottom:calc(78px + env(safe-area-inset-bottom)); }
button,input { font:inherit; color:inherit; }
button { cursor:pointer; border:0; background:transparent; }
a { color:inherit; }
.app { max-width:520px; min-height:100vh; margin:0 auto; background:linear-gradient(180deg,#fff 0%,var(--page) 180px); }
.top { position:sticky; top:0; z-index:30; min-height:62px; padding:10px 14px; display:grid; grid-template-columns:auto 1fr auto auto; gap:10px; align-items:center; background:rgba(251,250,247,.94); border-bottom:1px solid var(--line); backdrop-filter:blur(18px); }
.brand { font-size:19px; font-weight:950; letter-spacing:.01em; }
.case { min-width:0; border-left:1px solid var(--line2); padding-left:12px; }
.case strong { display:block; font-size:10px; text-transform:uppercase; color:var(--muted); }
.case span { display:block; font-size:12px; font-weight:850; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
.iconbtn { width:40px; height:40px; border:1px solid var(--line); border-radius:14px; background:#fff; display:grid; place-items:center; font-weight:950; box-shadow:0 1px 5px rgba(15,23,42,.05); }
.notice { position:relative; }
.notice i { position:absolute; right:-5px; top:-5px; min-width:18px; height:18px; padding:0 5px; border-radius:999px; background:#000; color:#fff; display:grid; place-items:center; font-size:10px; font-style:normal; }
.view { padding:12px; animation:enter .18s ease both; }
@keyframes enter { from { opacity:0; transform:translateY(8px); } to { opacity:1; transform:none; } }
.glass { background:rgba(255,255,255,.78); border:1px solid var(--line); border-radius:20px; box-shadow:0 1px 4px rgba(15,23,42,.05); backdrop-filter:blur(16px); }
.selected { padding:14px; margin-bottom:12px; }
.entity-line { display:grid; grid-template-columns:58px 1fr auto; gap:12px; align-items:center; }
.avatar { width:54px; height:54px; border-radius:18px; display:grid; place-items:center; border:1px solid var(--line); background:var(--blue); color:#1a4773; font-weight:950; font-size:18px; }
.avatar.person { background:var(--purple); color:#4f3b9c; }
.avatar.venture { background:var(--green); color:var(--greenInk); }
.avatar.org { background:var(--amber); color:var(--amberInk); }
.avatar.small { width:42px; height:42px; border-radius:14px; font-size:13px; }
.avatar.tiny { width:30px; height:30px; border-radius:10px; font-size:10px; }
h1,h2,h3,p { margin:0; }
.entity-line h1 { font-size:22px; line-height:1.05; }
.entity-line p { margin-top:3px; color:var(--muted); font-size:12px; }
.chev { font-size:26px; line-height:1; }
.badges { display:flex; flex-wrap:wrap; gap:5px; margin-top:7px; }
.badge { display:inline-flex; min-height:22px; align-items:center; padding:2px 7px; border:1px solid var(--line); border-radius:7px; background:#fff; font-size:10px; font-weight:850; white-space:nowrap; }
.good { background:var(--green); color:var(--greenInk); border-color:#c7e6cd; }
.warn { background:var(--amber); color:var(--amberInk); border-color:#ead4a8; }
.bad { background:var(--red); color:var(--redInk); border-color:#f1c6bd; }
.metric-box { display:grid; grid-template-columns:repeat(4,1fr); margin-top:12px; border:1px solid var(--line); border-radius:14px; overflow:hidden; background:rgba(255,255,255,.78); }
.metric { min-height:58px; display:grid; place-items:center; padding:8px 5px; border-right:1px solid var(--line); text-align:center; }
.metric:last-child { border-right:0; }
.metric span { color:var(--muted); font-size:9px; text-transform:uppercase; font-weight:950; }
.metric strong { display:block; margin-top:4px; font-size:17px; }
.tabs { position:sticky; top:62px; z-index:20; display:grid; grid-template-columns:repeat(5,1fr); min-height:56px; margin:0 -12px 14px; background:rgba(251,250,247,.94); border-bottom:1px solid var(--line); backdrop-filter:blur(18px); }
.tabs button { display:grid; place-items:center; gap:2px; border-right:1px solid var(--line); color:#333; font-size:10px; font-weight:850; }
.tabs button:last-child { border-right:0; }
.tabs .ico { font-size:18px; }
.tabs button.active { color:#000; box-shadow:inset 0 -3px 0 #000; }
.section { margin:12px 0; }
.sectionHead { display:flex; align-items:center; justify-content:space-between; gap:10px; margin:0 3px 8px; }
.sectionHead h2 { font-size:14px; text-transform:uppercase; letter-spacing:.03em; }
.sectionHead button { color:var(--violet); font-weight:850; font-size:12px; }
.rail { display:grid; grid-auto-flow:column; grid-auto-columns:minmax(130px,42%); gap:10px; overflow-x:auto; padding:2px 2px 10px; scroll-snap-type:x mandatory; scrollbar-width:none; }
.rail::-webkit-scrollbar,.chipbar::-webkit-scrollbar { display:none; }
.net-card { scroll-snap-align:center; padding:12px; min-height:126px; display:grid; place-items:center; gap:7px; text-align:center; position:relative; }
.net-card.active { border-color:#b6a9ff; box-shadow:inset 0 0 0 1px #b6a9ff; }
.net-card:after { content:""; position:absolute; left:100%; top:50%; width:10px; border-top:1px solid #b8b4ab; }
.net-card:last-child:after { display:none; }
.net-card strong { font-size:13px; line-height:1.08; }
.net-card span { color:var(--muted); font-size:11px; }
.row { min-height:72px; padding:11px; display:grid; grid-template-columns:44px 1fr auto; gap:10px; align-items:center; text-align:left; }
.row + .row { margin-top:8px; }
.row strong { display:block; font-size:13px; }
.row span,.row p { display:block; color:var(--muted); font-size:11px; margin-top:2px; }
.composer { padding:9px; display:grid; grid-template-columns:1fr 42px; gap:8px; margin-top:8px; }
.composer input,.search input { border:1px solid var(--line); border-radius:14px; min-height:44px; padding:0 12px; background:#fff; outline:none; }
.composer button { border-radius:14px; background:#000; color:#fff; font-size:20px; }
.packet { overflow:hidden; border-color:#b9dfc8; }
.packet-head { padding:13px; display:grid; grid-template-columns:50px 1fr auto; gap:11px; align-items:center; background:linear-gradient(120deg,rgba(230,245,235,.9),rgba(255,255,255,.82)); }
.packet-head strong { display:block; font-size:19px; }
.packet-head span { color:var(--muted); font-size:12px; }
.twocol { display:grid; grid-template-columns:1fr 1fr; border-top:1px solid var(--line); }
.twocol > div { padding:12px; border-right:1px solid var(--line); }
.twocol > div:last-child { border-right:0; }
.twocol h3,.fact h3 { font-size:10px; text-transform:uppercase; letter-spacing:.03em; color:var(--muted); margin-bottom:6px; }
.twocol p,.fact p { font-size:13px; }
.sources { padding:12px; border-top:1px solid var(--line); }
.sources a { display:block; padding:6px 0; color:#2b3d69; font-size:12px; overflow-wrap:anywhere; }
.problem-grid,.move-grid,.product-grid,.element-grid { display:grid; grid-template-columns:1fr 1fr; gap:9px; }
.problem { padding:12px; min-height:116px; display:grid; grid-template-columns:42px 1fr auto; gap:10px; align-items:start; }
.problem strong { font-size:13px; line-height:1.14; }
.problem dl,.decision dl { margin:9px 0 0; display:grid; grid-template-columns:1fr 1fr 1fr; gap:6px; }
.problem dt,.decision dt { color:var(--muted); font-size:9px; text-transform:uppercase; }
.problem dd,.decision dd { margin:2px 0 0; font-weight:850; font-size:11px; }
.move { min-height:86px; padding:11px; display:grid; gap:5px; }
.move strong { font-size:13px; text-transform:uppercase; }
.move span { color:var(--muted); font-size:11px; }
.decision { padding:14px; }
.fact { padding:14px; }
.fact-row { display:grid; grid-template-columns:104px 1fr; gap:10px; padding:10px 0; border-top:1px solid var(--line); }
.fact-row:first-child { border-top:0; padding-top:0; }
.fact-row b { font-size:10px; color:var(--muted); text-transform:uppercase; }
.fact-row span { font-size:14px; }
.mapbox { min-height:398px; position:relative; overflow:hidden; padding:16px; }
.mapbox svg { position:absolute; inset:0; width:100%; height:100%; pointer-events:none; }
.node { position:absolute; min-width:94px; max-width:136px; min-height:58px; padding:8px; border:1px solid #111; border-radius:12px; background:rgba(255,255,255,.92); display:grid; place-items:center; text-align:center; font-weight:850; font-size:12px; box-shadow:0 2px 12px rgba(15,23,42,.05); }
.node small { display:block; color:var(--muted); font-weight:700; margin-top:2px; }
.node.center { min-width:150px; min-height:84px; border-width:2px; background:#fff; }
.edge-label { position:absolute; font-size:11px; background:var(--page); padding:2px 5px; color:#111; }
.thread-card { padding:13px; display:grid; grid-template-columns:48px 1fr auto; gap:11px; align-items:start; margin-bottom:8px; }
.thread-card strong { display:block; font-size:13px; }
.thread-card p { margin-top:4px; font-size:13px; }
.agent-card { padding:13px; min-height:184px; display:grid; grid-template-rows:auto 1fr auto; gap:10px; }
.agent-card h3 { font-size:18px; }
.agent-card p { color:var(--muted); font-size:12px; }
.agent-icon { width:44px; height:44px; border-radius:16px; background:#000; color:#fff; display:grid; place-items:center; font-size:19px; font-weight:950; }
.pipeline { display:grid; grid-auto-flow:column; grid-auto-columns:88px; gap:8px; overflow-x:auto; padding:2px 0 10px; scrollbar-width:none; }
.pipe { min-height:76px; border:1px solid var(--line); border-radius:16px; background:#fff; display:grid; place-items:center; text-align:center; padding:7px 4px; }
.pipe.active { background:#000; color:#fff; }
.pipe span { font-size:18px; }
.pipe b { font-size:10px; }
.poml { width:100%; max-height:220px; overflow:auto; margin-top:10px; border:1px solid #000; border-radius:14px; background:#101010; color:#f5f5f5; padding:12px; font:11px/1.4 ui-monospace,SFMono-Regular,Menlo,monospace; white-space:pre-wrap; }
.chipbar { display:flex; gap:7px; overflow-x:auto; padding:1px 0 10px; scrollbar-width:none; }
.chipbar button { flex:0 0 auto; min-height:34px; padding:0 12px; border:1px solid var(--line); border-radius:999px; background:#fff; font-size:11px; font-weight:850; }
.chipbar button.active { background:#000; color:#fff; }
.index-card { padding:12px; min-height:102px; text-align:left; }
.index-card strong { display:block; font-size:13px; }
.index-card span { display:block; color:var(--muted); font-size:11px; margin-top:4px; }
.index-card a { display:inline-flex; margin-top:8px; font-size:11px; font-weight:900; color:var(--violet); text-decoration:none; }
.bottom { position:fixed; left:0; right:0; bottom:0; z-index:40; max-width:520px; margin:0 auto; height:calc(66px + env(safe-area-inset-bottom)); padding-bottom:env(safe-area-inset-bottom); display:grid; grid-template-columns:repeat(5,1fr); background:rgba(255,255,255,.94); border-top:1px solid var(--line); backdrop-filter:blur(18px); }
.bottom button { display:grid; place-items:center; gap:2px; color:var(--muted); font-size:10px; font-weight:850; }
.bottom .ico { font-size:20px; color:#111; }
.bottom button.active { color:#000; }
.bottom button.active .ico { min-width:42px; height:28px; border-radius:999px; background:#000; color:#fff; display:grid; place-items:center; }
.sheet { position:fixed; z-index:60; left:0; right:0; bottom:0; max-width:520px; margin:0 auto; transform:translateY(110%); transition:transform .2s ease; background:rgba(255,255,255,.96); border:1px solid var(--line); border-radius:24px 24px 0 0; box-shadow:0 -20px 60px rgba(15,23,42,.18); padding:10px 14px calc(16px + env(safe-area-inset-bottom)); backdrop-filter:blur(20px); }
.sheet.open { transform:translateY(0); }
.grab { width:44px; height:5px; border-radius:999px; background:#d0ccc4; margin:0 auto 12px; }
.search { display:grid; gap:9px; }
.search-results { max-height:52vh; overflow:auto; display:grid; gap:8px; }
@media (max-width:390px) {
  .top { grid-template-columns:auto 1fr auto; }
  .notice { display:none; }
  .problem-grid,.move-grid,.product-grid,.element-grid { grid-template-columns:1fr; }
  .metric-box { grid-template-columns:repeat(2,1fr); }
  .twocol { grid-template-columns:1fr; }
  .twocol > div { border-right:0; border-bottom:1px solid var(--line); }
  .twocol > div:last-child { border-bottom:0; }
}
</style>
</head>
<body>
<div class="app">
  <header class="top">
    <div class="brand">PROVIS</div>
    <div class="case"><strong>Case</strong><span id="caseLabel">204 Entity Casedex</span></div>
    <button class="iconbtn notice" id="noticeBtn" type="button">♢<i id="noticeCount">0</i></button>
    <button class="iconbtn" id="menuBtn" type="button">☰</button>
  </header>
  <main id="view" class="view"></main>
  <nav class="bottom">
    <button data-mode="entity" class="active" type="button"><span class="ico">◉</span><span>Entity</span></button>
    <button data-mode="map" type="button"><span class="ico">⌘</span><span>Map</span></button>
    <button data-mode="thread" type="button"><span class="ico">◔</span><span>Thread</span></button>
    <button data-mode="evidence" type="button"><span class="ico">▤</span><span>Evidence</span></button>
    <button data-mode="move" type="button"><span class="ico">↗</span><span>Move</span></button>
  </nav>
  <section id="sheet" class="sheet">
    <div class="grab"></div>
    <div class="sectionHead"><h2>Find entity</h2><button id="closeSheet" type="button">Close</button></div>
    <div class="search">
      <input id="searchInput" type="search" placeholder="Search 204 entities, evidence, gaps...">
      <div id="searchResults" class="search-results"></div>
    </div>
  </section>
</div>
<script id="entity-data" type="application/json">${safeJson(entityRows)}</script>
<script id="trace-data" type="application/json">${safeJson(traceRows)}</script>
<script id="agent-data" type="application/json">${safeJson(agents)}</script>
<script id="element-data" type="application/json">${safeJson(elements)}</script>
<script id="product-data" type="application/json">${safeJson(products)}</script>
<script>
const entities = JSON.parse(document.getElementById("entity-data").textContent);
const traces = JSON.parse(document.getElementById("trace-data").textContent);
const agents = JSON.parse(document.getElementById("agent-data").textContent);
const elements = JSON.parse(document.getElementById("element-data").textContent);
const products = JSON.parse(document.getElementById("product-data").textContent);
const coreLaw = "No claim without source. No edge without evidence. No uncertainty hidden. No contradiction erased. No private dirt. FIELD · FORM · FIT · TRACE.";
const view = document.getElementById("view");
const sheet = document.getElementById("sheet");
const searchInput = document.getElementById("searchInput");
const searchResults = document.getElementById("searchResults");
const caseLabel = document.getElementById("caseLabel");
const noticeCount = document.getElementById("noticeCount");
const state = { mode:"entity", selected:0, agent:"SCOUT", indexFilter:"All" };
function esc(v){ return String(v ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;","\\"":"&quot;","'":"&#39;"}[c])); }
function initials(name){ return String(name || "P").split(/\\s+/).filter(Boolean).slice(0,2).map(x => x[0]).join("").toUpperCase(); }
function kind(row){ if(row.entity_type === "Person") return "person"; if(row.entity_type === "Venture") return "venture"; if(row.entity_type === "Organization") return "org"; return "other"; }
function selected(){ return entities[state.selected] || entities[0]; }
function level(row){ const n = Number(row.verified_link_count || 0); if(n >= 8) return "L4"; if(n >= 5) return "L3"; if(n >= 2) return "L2"; if(n >= 1) return "L1"; return "L0"; }
function status(row){ const gap = Number(row.gap_to_target || 0); if(gap === 0) return "verified"; if(gap <= 5) return "active"; return "open"; }
function confidence(row){ return Math.max(1, Math.min(5, Math.ceil(Number(row.verified_link_count || 0) / 2))); }
function dotScore(row){ const n = confidence(row); return Array.from({length:5}, (_,i) => i < n ? "●" : "○").join(""); }
function badge(row){ const s = status(row); return '<span class="badge '+(s==="verified"?"good":s==="active"?"warn":"bad")+'">'+esc(s)+'</span><span class="badge">'+level(row)+'</span>'; }
function firstUrl(row){ return (row.verified_urls || []).find(url => /^https?:/i.test(url)); }
function rowLink(url, text){ return url ? '<a href="'+esc(url)+'" target="_blank" rel="noreferrer">'+esc(text || url)+'</a>' : '<span>No public URL recorded</span>'; }
function problemTitle(row){ return row.gap_reason || row.problem || "Source gap"; }
function relatedRows(row){
  const urls = new Set((row.verified_urls || []).filter(Boolean));
  const shared = entities.filter(other => other !== row && (other.verified_urls || []).some(url => urls.has(url)));
  const sameGroup = entities.filter(other => other !== row && other.group === row.group);
  const sameType = entities.filter(other => other !== row && other.entity_type === row.entity_type);
  return [...shared, ...sameGroup, ...sameType].filter((item, index, self) => self.indexOf(item) === index);
}
function evidenceRows(row){ return (row.evidence_rows || []).slice(); }
function currentAgent(){ return agents.find(agent => agent.id === state.agent) || agents[0]; }
function poml(agent, row){
  return '<agent id="'+agent.id+'">\\n  <role>'+agent.role+'</role>\\n  <purpose>'+agent.purpose+'</purpose>\\n  <target>'+row.entity+'</target>\\n  <directives>\\n'+agent.steps.map(step => '    <step>'+step+'</step>').join("\\n")+'\\n  </directives>\\n  <output_format>'+agent.output+'</output_format>\\n</agent>';
}
function selectedPanel(context){
  const row = selected();
  const problemCount = Number(row.gap_to_target || 0) > 0 ? Math.min(9, Math.max(1, Math.ceil(Number(row.gap_to_target || 0) / 3))) : 0;
  return '<section class="glass selected"><div class="entity-line"><div class="avatar '+kind(row)+'">'+esc(initials(row.entity))+'</div><div><h1>'+esc(row.entity)+'</h1><p>'+esc(row.role || row.entity_type)+' · '+esc(context || row.group_label || "PROVIS")+'</p><div class="badges">'+badge(row)+'<span class="badge">'+esc(row.entity_type)+'</span></div></div><button class="chev" data-mode="index" type="button">›</button></div><div class="metric-box"><div class="metric"><span>Confidence</span><strong>'+dotScore(row)+'</strong></div><div class="metric"><span>Evidence</span><strong>'+esc(row.verified_link_count || 0)+'</strong></div><div class="metric"><span>Problems</span><strong class="'+(problemCount ? "bad" : "good")+'">'+problemCount+'</strong></div><div class="metric"><span>Links</span><strong>'+relatedRows(row).length+'</strong></div></div></section>';
}
function tabBar(){
  const tabs = [["entity","◉","Entity"],["map","⌘","Map"],["thread","◔","Thread"],["evidence","▤","Evidence"],["move","↗","Move"]];
  return '<div class="tabs">'+tabs.map(tab => '<button class="'+(state.mode===tab[0] ? "active" : "")+'" data-mode="'+tab[0]+'" type="button"><span class="ico">'+tab[1]+'</span><span>'+tab[2]+'</span></button>').join("")+'</div>';
}
function renderNetwork(){
  const row = selected();
  const rel = relatedRows(row).slice(0,8);
  const cards = [row].concat(rel);
  return '<section class="section"><div class="sectionHead"><h2>Local network</h2><button data-mode="map" type="button">Map</button></div><div class="rail">'+cards.map((item,index) => '<button class="glass net-card '+(index===0?"active":"")+'" data-select="'+entities.indexOf(item)+'" type="button"><div class="avatar '+kind(item)+'">'+esc(initials(item.entity))+'</div><strong>'+esc(item.entity)+'</strong><span>'+esc(item.role || item.entity_type)+'</span></button>').join("")+'</div></section>';
}
function renderThreadPreview(){
  const row = selected();
  const packet = [
    ["Scout", "Found "+(row.verified_link_count || 0)+" public sources for "+row.entity+".", "Packet S-"+String(state.selected+1).padStart(4,"0")],
    ["Binder", "Attached strongest packet to selected entity; supports public claim.", "Bound"],
    ["Critic", "Gap remains: "+problemTitle(row)+".", Math.max(0, Number(row.gap_to_target || 0))+" gaps"]
  ];
  return '<section class="section"><div class="sectionHead"><h2>Agent thread</h2><button data-mode="thread" type="button">View all</button></div>'+packet.map(item => '<article class="glass thread-card"><div class="avatar tiny">'+esc(item[0].slice(0,2).toUpperCase())+'</div><div><strong>'+esc(item[0])+'</strong><p>'+esc(item[1])+'</p></div><span class="badge">'+esc(item[2])+'</span></article>').join("")+'<div class="glass composer"><input placeholder="Ask agents anything..." /><button data-mode="agents" type="button">›</button></div></section>';
}
function renderPacket(){
  const row = selected();
  const evs = evidenceRows(row);
  const ev = evs[0] || {};
  const title = ev.source_title || row.source_title || row.source_url || "Source packet";
  const supports = ev.extracted_facts || row.source_context || row.coverage_status || row.problem;
  const limit = ev.unresolved_gap || row.gap_reason || "Does not establish control, revenue, adoption, current role, or technical validity unless source explicitly says so.";
  return '<section class="section"><div class="sectionHead"><h2>Latest evidence packet</h2><button data-mode="evidence" type="button">Open all</button></div><article class="glass packet"><div class="packet-head"><div class="avatar venture">EV</div><div><strong>Packet S-'+String(state.selected+1).padStart(4,"0")+'</strong><span>'+evs.length+' sources · '+level(row)+' · '+Math.min(99, 40 + Number(row.verified_link_count || 0) * 7)+'%</span></div><span class="badge good">Supports</span></div><div class="twocol"><div><h3>Supports</h3><p>'+esc(supports)+'</p></div><div><h3>Does not establish</h3><p>'+esc(limit)+'</p></div></div><div class="sources"><h3>Sources ('+evs.length+')</h3>'+(evs.length ? evs.slice(0,4).map(source => rowLink(source.url, source.source_title || source.url)).join("") : rowLink(firstUrl(row), row.source_title || "Seed source"))+'</div></article></section>';
}
function renderProblems(){
  const row = selected();
  const items = [
    [problemTitle(row), row.state || "Open", "Critic", Number(row.gap_to_target || 0) > 5 ? "High" : "Medium"],
    [row.probe || "Find stronger public source", "Investigating", "Scout", Number(row.verified_link_count || 0) < 2 ? "High" : "Medium"]
  ];
  return '<section class="section"><div class="sectionHead"><h2>Active problems</h2><button data-mode="move" type="button">Move</button></div><div class="problem-grid">'+items.map((item,index) => '<article class="glass problem"><div class="avatar small '+(index ? "org" : "person")+'">!</div><div><strong>P'+(index+1)+' '+esc(item[0])+'</strong><dl><div><dt>Status</dt><dd>'+esc(item[1])+'</dd></div><div><dt>Assigned</dt><dd>'+esc(item[2])+'</dd></div><div><dt>Severity</dt><dd>'+esc(item[3])+'</dd></div></dl></div><span class="chev">›</span></article>').join("")+'</div></section>';
}
function renderNextMove(){
  const moves = [["✓","Verify","Check evidence"],["⌕","Probe","Ask agents"],["⛓","Link","Add relationship"],["×","Reject","Mark invalid"],["⌘","Fork","Split identity"],["↗","Export","Case summary"]];
  return '<section class="section"><div class="sectionHead"><h2>Next move</h2><button data-mode="agents" type="button">Agents</button></div><div class="move-grid">'+moves.map(move => '<button class="glass move" type="button"><strong>'+move[0]+' '+esc(move[1])+'</strong><span>'+esc(move[2])+'</span></button>').join("")+'</div></section>';
}
function renderEntity(){
  const row = selected();
  view.innerHTML = selectedPanel("Entity")+tabBar()+renderNetwork()+renderThreadPreview()+renderPacket()+renderProblems()+renderNextMove();
}
function renderMap(){
  const row = selected();
  const rel = relatedRows(row).slice(0,5);
  const labels = ["founder_of?","affiliated_with","backed_by?","alumni_of","related_to"];
  const nodes = rel.map((item,index) => {
    const pos = [[75,26],[76,70],[50,82],[16,70],[16,26]][index] || [50,12];
    return '<button class="node" data-select="'+entities.indexOf(item)+'" style="left:'+pos[0]+'%;top:'+pos[1]+'%;transform:translate(-50%,-50%)" type="button">'+esc(item.entity)+'<small>'+esc(item.entity_type)+'</small></button><span class="edge-label" style="left:'+(46+(pos[0]-50)/2)+'%;top:'+(46+(pos[1]-50)/2)+'%">'+esc(labels[index] || "related_to")+'</span>';
  }).join("");
  const lines = rel.map((item,index) => {
    const pos = [[75,26],[76,70],[50,82],[16,70],[16,26]][index] || [50,12];
    return '<line x1="50%" y1="50%" x2="'+pos[0]+'%" y2="'+pos[1]+'%" stroke="#111" stroke-width="1.2"/>';
  }).join("");
  view.innerHTML = selectedPanel("Map")+tabBar()+'<section class="glass mapbox"><svg>'+lines+'</svg><button class="node center" type="button" style="left:50%;top:50%;transform:translate(-50%,-50%)">'+esc(row.entity)+'<small>'+esc(row.role || row.entity_type)+'</small></button>'+nodes+'</section><section class="glass fact"><h3>Edge review</h3><p><strong>'+esc(row.entity)+'</strong> → related_to → '+esc(rel[0]?.entity || "unresolved entity")+'</p><div class="fact-row"><b>State</b><span>'+esc(row.state || "ambiguous")+'</span></div><div class="fact-row"><b>Evidence</b><span>'+esc(row.verified_link_count || 0)+' source(s)</span></div><div class="fact-row"><b>Does not establish</b><span>'+esc(row.gap_reason || "Equity, control, current operating role, or revenue.")+'</span></div><div class="actions move-grid"><button class="glass move">Center Venture</button><button class="glass move">Fork Edge</button><button class="glass move">Probe</button></div></section>';
}
function renderThread(){
  const row = selected();
  const messages = [
    ["Operator","Verify public evidence for "+row.entity+"."],
    ["Scout","Found "+(row.verified_link_count || 0)+" public sources."],
    ["Guard","Boundary check passed for public links; private and login-gated material excluded."],
    ["Binder","Attached source packet; supports claim but keeps limit visible."],
    ["Critic","Gap remains: "+problemTitle(row)+"."],
    ["Heisenberg","State remains "+(row.state || "ambiguous")+" until stronger evidence appears."],
    ["Compiler","Case not export-ready while source gaps remain."]
  ];
  view.innerHTML = selectedPanel("Thread")+tabBar()+'<section class="glass fact"><h2>Verify source-bound record?</h2></section>'+messages.map(item => '<article class="glass thread-card"><div class="avatar tiny">'+esc(item[0].slice(0,2).toUpperCase())+'</div><div><strong>'+esc(item[0])+'</strong><p>'+esc(item[1])+'</p></div><span class="badge">trace</span></article>').join("")+'<div class="glass composer"><input placeholder="Ask agents..." /><button data-mode="agents" type="button">›</button></div><div class="move-grid">'+[["VERIFY","Check evidence"],["PROBE","Find missing source"],["LINK","Inspect edge"]].map(item => '<button class="glass move"><strong>'+item[0]+'</strong><span>'+item[1]+'</span></button>').join("")+'</div>';
}
function renderEvidence(){
  const row = selected();
  const evs = evidenceRows(row);
  view.innerHTML = selectedPanel("Packet")+tabBar()+renderPacket()+'<section class="glass fact"><h3>Related edge</h3><p>'+esc(row.entity)+' → related_to → '+esc(relatedRows(row)[0]?.entity || "unresolved entity")+'</p><div class="fact-row"><b>State</b><span>'+esc(row.state || "ambiguous")+'</span></div></section><section class="section"><div class="sectionHead"><h2>All evidence</h2><span class="badge">'+evs.length+'</span></div>'+evs.map(ev => '<article class="glass row"><div class="avatar tiny">EV</div><div><strong>'+esc(ev.source_title || ev.url || "Evidence")+'</strong><span>'+esc(ev.evidence_type || "source")+' · '+esc(ev.confidence || "")+'</span><p>'+esc(ev.extracted_facts || ev.url || "")+'</p></div><span>'+rowLink(ev.url, "↗")+'</span></article>').join("")+'</section>';
}
function renderMove(){
  const row = selected();
  const ready = Number(row.gap_to_target || 0) === 0;
  view.innerHTML = selectedPanel("Move")+tabBar()+'<section class="glass decision"><h3>Decision</h3><h1>Founder / entity edge under review</h1><div class="fact-row"><b>State</b><span>'+esc(row.state || "ambiguous")+'</span></div><div class="fact-row"><b>Evidence</b><span>'+level(row)+' + '+evidenceRows(row).length+' packet(s)</span></div><div class="fact-row"><b>Problem</b><span>'+esc(problemTitle(row))+'</span></div><div class="fact-row"><b>Recommended</b><span>probe</span></div></section><section class="glass fact"><h3>Open problems</h3><p>• '+esc(problemTitle(row))+'</p><p>• Evidence does not establish equity, control, revenue, or current operating status unless explicitly stated.</p><p>• '+esc(row.probe || "Find independent confirmation.")+'</p></section><section class="section"><div class="sectionHead"><h2>Commands</h2><span class="badge '+(ready ? "good" : "bad")+'">Export ready: '+(ready ? "Yes" : "No")+'</span></div><div class="move-grid">'+[["VERIFY","Check evidence"],["PROBE","Assign Scout"],["LINK","Add relationship"],["REJECT","Mark invalid"],["FORK","Split identity"],["EXPORT","Case summary"]].map(item => '<button class="glass move"><strong>'+item[0]+'</strong><span>'+item[1]+'</span></button>').join("")+'</div></section><section class="glass fact"><h3>Trace preview</h3><p>If PROBE is chosen: create new trace, keep state unresolved, assign Scout, and preserve does-not-establish.</p></section>';
}
function renderAgents(){
  const row = selected();
  const active = currentAgent();
  view.innerHTML = selectedPanel("Agents")+'<section class="section"><div class="sectionHead"><h2>Agentdeck</h2><button data-mode="thread" type="button">Thread</button></div><div class="pipeline">'+agents.map(agent => '<button class="pipe '+(agent.id===state.agent ? "active" : "")+'" data-agent="'+agent.id+'" type="button"><span>'+esc(agent.icon)+'</span><b>'+esc(agent.name)+'</b></button>').join("")+'</div></section><section class="section"><div class="rail">'+agents.map(agent => '<button class="glass agent-card" data-agent="'+agent.id+'" type="button"><div class="agent-icon">'+esc(agent.icon)+'</div><div><h3>'+esc(agent.name)+'</h3><p>'+esc(agent.purpose)+'</p></div><span class="badge">'+esc(agent.output)+'</span></button>').join("")+'</div></section><section class="glass fact"><div class="badges"><span class="badge good">'+esc(active.id)+'</span><span class="badge">'+esc(active.output)+'</span><span class="badge">'+esc(active.move)+'</span></div><h2>'+esc(active.role)+'</h2>'+active.steps.map((step,index) => '<div class="fact-row"><b>Step '+(index+1)+'</b><span>'+esc(step)+'</span></div>').join("")+'<pre class="poml">'+esc(poml(active,row))+'</pre></section>';
}
function renderIndex(){
  const filters = ["All","Products","Surface","Object","Command","Agent","Evidence","State","Boundary"];
  const agentItems = agents.map(agent => ["Agent", agent.name, agent.role+" — "+agent.purpose]);
  const evidence = [["Evidence","L0","Unverified"],["Evidence","L1","Self claim"],["Evidence","L2","Program claim"],["Evidence","L3","Independent public source"],["Evidence","L4","Multiple independent sources"],["Evidence","L5","Primary record"]];
  const states = ["unseen","captured","parsed","candidate","evidence_bound","weakly_supported","supported","strongly_supported","ambiguous","contradicted","disconfirmed","stale","unresolved","forbidden_private","resolved","dormant","exported"].map(item => ["State", item, "Allowed PROVIS state."]);
  const boundaries = ["No private emails","No private phones","No home addresses","No protected attributes","No login-gated content","No paywall bypass","No raw search URL as evidence","No name-similarity edge","No link padding","No unsourced critique"].map(item => ["Boundary", item, "Hard stop or rejection condition."]);
  const productItems = products.map(product => ["Products", product[0], product[2], product[1]]);
  const all = productItems.concat(elements, agentItems, evidence, states, boundaries);
  const filtered = all.filter(item => state.indexFilter === "All" || item[0] === state.indexFilter);
  view.innerHTML = selectedPanel("Index")+'<section class="glass fact"><h3>Core law</h3><p>'+esc(coreLaw)+'</p></section><section class="section"><div class="sectionHead"><h2>Element index</h2><span class="badge">'+filtered.length+'</span></div><div class="chipbar">'+filters.map(filter => '<button class="'+(state.indexFilter===filter ? "active" : "")+'" data-index-filter="'+filter+'" type="button">'+filter+'</button>').join("")+'</div><div class="element-grid">'+filtered.map(item => '<article class="glass index-card"><span>'+esc(item[0])+'</span><strong>'+esc(item[1])+'</strong><span>'+esc(item[2])+'</span>'+(item[3] ? '<a href="'+esc(item[3])+'">Open</a>' : "")+'</article>').join("")+'</div></section>';
}
function renderSearch(){
  const q = searchInput.value.trim().toLowerCase();
  const matches = entities.filter(row => !q || JSON.stringify(row).toLowerCase().includes(q)).slice(0,40);
  searchResults.innerHTML = matches.map(row => '<button class="glass row" data-select="'+entities.indexOf(row)+'" type="button"><div class="avatar tiny '+kind(row)+'">'+esc(initials(row.entity))+'</div><div><strong>'+esc(row.entity)+'</strong><span>'+esc(row.role || row.entity_type)+'</span></div><span class="badge">'+level(row)+'</span></button>').join("");
}
function updateChrome(){
  const row = selected();
  caseLabel.textContent = row.entity;
  noticeCount.textContent = Math.min(9, Math.max(0, Number(row.gap_to_target || 0)));
  document.querySelectorAll("[data-mode]").forEach(button => button.classList.toggle("active", button.dataset.mode === state.mode));
}
function render(){
  updateChrome();
  if(state.mode === "entity") renderEntity();
  if(state.mode === "map") renderMap();
  if(state.mode === "thread") renderThread();
  if(state.mode === "evidence") renderEvidence();
  if(state.mode === "move") renderMove();
  if(state.mode === "agents") renderAgents();
  if(state.mode === "index") renderIndex();
}
document.addEventListener("click", event => {
  const mode = event.target.closest("[data-mode]");
  if(mode){ state.mode = mode.dataset.mode; render(); window.scrollTo({top:0,behavior:"smooth"}); return; }
  const select = event.target.closest("[data-select]");
  if(select){ state.selected = Number(select.dataset.select); sheet.classList.remove("open"); state.mode = "entity"; render(); window.scrollTo({top:0,behavior:"smooth"}); return; }
  const agent = event.target.closest("[data-agent]");
  if(agent){ state.agent = agent.dataset.agent; state.mode = "agents"; render(); return; }
  const filter = event.target.closest("[data-index-filter]");
  if(filter){ state.indexFilter = filter.dataset.indexFilter; renderIndex(); return; }
});
document.getElementById("menuBtn").addEventListener("click", () => { state.mode = "index"; render(); window.scrollTo({top:0,behavior:"smooth"}); });
document.getElementById("noticeBtn").addEventListener("click", () => { state.mode = "move"; render(); window.scrollTo({top:0,behavior:"smooth"}); });
document.getElementById("closeSheet").addEventListener("click", () => sheet.classList.remove("open"));
document.querySelector(".brand").addEventListener("click", () => { sheet.classList.add("open"); searchInput.focus(); renderSearch(); });
searchInput.addEventListener("input", renderSearch);
renderSearch();
render();
</script>
</body>
</html>`;

await fs.mkdir(outDir, { recursive: true });
await fs.writeFile(path.join(outDir, "provis-glass.html"), html);

console.log(JSON.stringify({
  output: path.join(outDir, "provis-glass.html"),
  entities: entityRows.length,
  traces: traceRows.length,
  agents: agents.length,
  elements: elements.length,
  products: products.length
}, null, 2));
