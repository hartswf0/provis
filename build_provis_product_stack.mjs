import fs from "node:fs/promises";
import path from "node:path";

const cwd = process.cwd();
const dataPath = path.join(cwd, "outputs/provis-mobile-index/provis-index-data.json");
const outDir = path.join(cwd, "outputs/provis-product-stack");
const mobileIndexPath = path.join(cwd, "outputs/provis-mobile-index/index.html");
const data = JSON.parse(await fs.readFile(dataPath, "utf8"));

function esc(value) {
  return String(value ?? "").replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  }[char]));
}

function safeJson(value) {
  return JSON.stringify(value).replace(/</g, "\\u003c");
}

function arr(value) {
  if (Array.isArray(value)) return value.filter(Boolean);
  if (!value) return [];
  return [value];
}

function slug(value) {
  return String(value || "item").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "item";
}

const personByName = new Map(arr(data.founders).map((person) => [person.name, person]));
const ventureByName = new Map(arr(data.ventures).map((venture) => [venture.name, venture]));
const organizationByName = new Map(arr(data.organizations).map((organization) => [organization.name, organization]));

const groupOrder = ["STAFF", "FACULTY", "MENTORS", "FOUNDERS", "FELLOWS", "INVESTORS", "VENTURES", "ECOSYSTEM"];
const groupMeta = {
  STAFF: { label: "CEI Staff", prefix: "A", symbol: "ST", order: 1 },
  FACULTY: { label: "Faculty", prefix: "B", symbol: "FA", order: 2 },
  MENTORS: { label: "Mentors", prefix: "C", symbol: "ME", order: 3 },
  FOUNDERS: { label: "Founders", prefix: "D", symbol: "FO", order: 4 },
  FELLOWS: { label: "Fellows", prefix: "E", symbol: "FE", order: 5 },
  INVESTORS: { label: "Investors / Luminaries", prefix: "F", symbol: "IN", order: 6 },
  VENTURES: { label: "Ventures", prefix: "G", symbol: "VE", order: 7 },
  ECOSYSTEM: { label: "Ecosystem Orgs", prefix: "H", symbol: "EO", order: 8 },
};

function groupForQuota(quota) {
  if (quota.entity_type === "Venture") return "VENTURES";
  if (quota.entity_type === "Organization") return "ECOSYSTEM";
  const person = personByName.get(quota.entity) || {};
  const role = person.role_type || person.registry ? `${person.role_type || ""} ${person.registry || ""}` : `${quota.source_context || ""}`;
  if (/staff/i.test(role)) return "STAFF";
  if (/mentor|eir/i.test(role)) return "MENTORS";
  if (/founder/i.test(role)) return "FOUNDERS";
  if (/faculty/i.test(role)) return "FACULTY";
  if (/fellow|student/i.test(role)) return "FELLOWS";
  if (/investor|supporter|luminary|keynote|speaker/i.test(role)) return "INVESTORS";
  return "FELLOWS";
}

function recordFor(name) {
  return data.venture_records.find((record) => record.target?.name === name) || {};
}

function sourcesFor(record, venture) {
  return arr(record.source_base).length ? arr(record.source_base) : arr(venture.source_base);
}

function problemsFor(record, venture) {
  return arr(record.venture_problem_list).length ? arr(record.venture_problem_list) : arr(venture.problems);
}

function evidenceForEntity(entity) {
  return arr(data.evidence).filter((row) => row.entity === entity);
}

function buildEntityRows() {
  const groupCounters = {};
  return arr(data.quota).map((quota, index) => {
    const group = groupForQuota(quota);
    const meta = groupMeta[group];
    groupCounters[group] = (groupCounters[group] || 0) + 1;
    const sequence = groupCounters[group];
    const evidence = evidenceForEntity(quota.entity);
    const firstEvidence = evidence[0] || {};
    const urls = arr(quota.verified_urls);
    const linkCount = Number(quota.verified_link_count || urls.length || evidence.length || 0);
    const gap = Number(quota.gap_to_target ?? Math.max(0, Number(quota.target_links || 10) - linkCount));
    const person = personByName.get(quota.entity);
    const venture = ventureByName.get(quota.entity);
    const organization = organizationByName.get(quota.entity);
    return {
      id: `entity-${String(index + 1).padStart(3, "0")}`,
      tile_id: `${meta.prefix}-${String(sequence).padStart(3, "0")}`,
      symbol: meta.symbol,
      group,
      group_label: meta.label,
      group_order: meta.order,
      entity: quota.entity,
      entity_type: quota.entity_type,
      role: person?.role_type || venture?.sector || organization?.partner_type || organization?.type || quota.entity_type,
      verified_link_count: linkCount,
      target_links: Number(quota.target_links || 10),
      gap_to_target: gap,
      coverage_status: quota.coverage_status || `${linkCount}/10 verified links`,
      gap_reason: quota.gap_reason || "",
      verified_urls: urls,
      source_context: quota.source_context || "",
      source_title: firstEvidence.source_title || urls[0] || "",
      source_url: firstEvidence.url || urls[0] || "",
      source_type: firstEvidence.evidence_type || "",
      evidence_count: evidence.length,
      evidence_rows: evidence,
      problem: gap > 0 ? "Source coverage below target" : "Coverage target met",
      probe: gap > 0 ? "Find additional public destination sources without padding or private data." : "Inspect strongest evidence and preserve trace.",
      state: gap > 0 ? "unresolved" : "supported",
      confidence: firstEvidence.confidence || "",
      trace: `CASEDEX_ENTITY ${new Date().toISOString().slice(0, 10)}`,
    };
  });
}

function buildGridRows() {
  const rows = [];
  data.ventures.forEach((venture) => {
    const record = recordFor(venture.name);
    const sources = sourcesFor(record, venture);
    const problems = problemsFor(record, venture);
    const founders = arr(record.entity_forms?.founders).map((founder) => founder.name).join(", ") || venture.named_founders || "";
    const edge = arr(record.relationship_forms)[0];
    const trace = arr(record.provenance_trace)[0];
    sources.forEach((source, index) => {
      const claim = arr(record.claim_forms).find((item) => arr(item.evidence_links).includes(source.evidence_id)) || arr(record.claim_forms)[index] || {};
      const problem = problems.find((item) => arr(item.evidence_links).includes(source.evidence_id)) || problems[0] || {};
      rows.push({
        id: `${slug(venture.name)}-${String(index + 1).padStart(2, "0")}`,
        venture: venture.name,
        sector: venture.sector || "",
        founder: founders,
        source_title: source.title || source.url || "",
        source_url: source.url || "",
        source_type: source.source_type || "",
        claim: claim.claim_text || source.summary || "",
        relationship: edge ? `${edge.subject} ${edge.predicate} ${edge.object}` : "",
        evidence_level: source.evidence_level || "",
        problem: problem.title || "",
        probe: arr(problem.next_probe)[0] || arr(record.venture_diagnosis?.next_probe)[0] || "",
        state: problem.state || record.target?.record_status || venture.record_status || "",
        trace: trace ? `${trace.action || ""} ${trace.timestamp || ""}`.trim() : "CAPTURED",
        links: Number(venture.verified_link_count || sources.length || 0),
        problem_count: problems.length,
        confidence: venture.record_confidence || record.target?.confidence || "",
      });
    });
  });
  return rows;
}

const traceRows = buildGridRows();
const entityRows = buildEntityRows().sort((a, b) => a.group_order - b.group_order || a.tile_id.localeCompare(b.tile_id));
const gridRows = entityRows;

const grammar = {
  states: ["unseen", "captured", "parsed", "candidate", "evidence_bound", "weakly_supported", "supported", "strongly_supported", "ambiguous", "contradicted", "disconfirmed", "stale", "unresolved", "forbidden_private", "resolved", "dormant", "exported"],
  evidenceLevels: ["L0_unverified", "L1_self_claim", "L2_program_claim", "L3_independent_public_source", "L4_multiple_independent_sources", "L5_primary_record", "source_gap"],
  moves: ["dispatch", "inspect", "capture", "extract", "bind", "verify", "reject", "probe", "fork", "merge", "freeze", "export", "summon_critic"],
  hardBoundaries: ["No private emails.", "No private phones.", "No home addresses.", "No protected attributes.", "No login-gated content.", "No paywall bypass.", "No raw search URL as evidence.", "No name-similarity edge.", "No link padding.", "No unsourced critique."],
};

const explorerAgents = [
  {
    title: "Meitner",
    role: "Hidden-cause detector.",
    hunts: "quiet mechanisms, overlooked contributors, buried causal chains.",
    move: "Find the missing actor behind a visible claim.",
    best_for: "founder ambiguity, hidden technical labor, uncredited research lineage.",
    risk: "sees invisible structure before evidence is strong enough.",
    trace: "creates Uncertainty_Form or Hidden-Contributor Problem.",
  },
  {
    title: "Mencius",
    role: "Moral-pressure reader.",
    hunts: "who is harmed, who bears downside, what duty is being violated.",
    move: "Turn a claim into a customer-harm or governance problem.",
    best_for: "privacy risk, labor risk, exploitative incentives, public-good claims.",
    risk: "moral diagnosis outruns source evidence.",
    trace: "creates Risk_Form with downside_distribution.",
  },
  {
    title: "Sagan",
    role: "Cosmic skeptic.",
    hunts: "extraordinary claims requiring extraordinary evidence.",
    move: "Downgrade overclaimed technology until proof appears.",
    best_for: "AI claims, deeptech claims, scientific language, miracle-product pitches.",
    risk: "can become too skeptical of early but real signals.",
    trace: "creates Evidence_Gap and Technical_Feasibility Problem.",
  },
  {
    title: "Heisenberg",
    role: "Uncertainty mapper.",
    hunts: "measurement limits, ambiguity, observer effects, unstable facts.",
    move: "Fork an ambiguous record instead of forcing certainty.",
    best_for: "same-name founders, stale sources, conflicting timelines, identity ambiguity.",
    risk: "keeps too many branches open.",
    trace: "creates Uncertainty_Form or Contradiction_Form.",
  },
  {
    title: "Erdos",
    role: "Graph wanderer.",
    hunts: "connections across people, ventures, papers, repositories, institutions.",
    move: "Expand the relationship graph by one evidence-bound edge.",
    best_for: "founder networks, advisor trails, prior startups, publications, patents.",
    risk: "link sprawl; too many weak edges.",
    trace: "creates Relationship_Edge with confidence state.",
  },
  {
    title: "Archimedes",
    role: "First-principles tester.",
    hunts: "leverage points, mechanical truth, simple proof, physical constraint.",
    move: "Reduce a business claim to the minimum test that would prove it.",
    best_for: "unit economics, product reality, does-this-work claims.",
    risk: "over-reduces social or market complexity.",
    trace: "creates Probe_Card or Minimal_Test Problem.",
  },
  {
    title: "Boundary Guard",
    role: "Illegitimate-capture blocker.",
    hunts: "private data, paywall bypass, login-gated content, doxxing risk.",
    move: "Reject forbidden input and create a safe substitute probe.",
    best_for: "privacy boundary, protected attributes, irrelevant personal data.",
    risk: "can over-block professionally relevant public evidence.",
    trace: "creates Boundary_Form and Source_Rejected trace.",
  },
  {
    title: "Case Compiler",
    role: "Case-file closer.",
    hunts: "source-bound facts, unresolved gaps, export readiness, contradiction burden.",
    move: "Merge verified forms into a case file and name remaining problems.",
    best_for: "export, diagnosis, final audit, board review.",
    risk: "can close before the weak links are visible enough.",
    trace: "creates Diagnosis and Exported state.",
  },
];

const cardSpecs = [
  { type: "FIELD", icon: "[FLD]", count: 8, titles: ["Venture Field", "Founder Field", "Program Field", "Ecosystem Field", "University Venture Field", "Accelerator Cohort Field", "Market Field", "Evidence Boundary Field"] },
  { type: "FORM", icon: "[FRM]", count: 10, titles: ["Venture Form", "Founder Form", "Claim Form", "Evidence Form", "Relationship Edge", "Risk Form", "Contradiction Form", "Uncertainty Form", "Venture Problem Form", "Provenance Trace"] },
  { type: "SOURCE", icon: "[SRC]", count: 10, titles: ["Official Website", "Team Page", "Founder Bio", "University Page", "Accelerator Roster", "Press Article", "Podcast", "YouTube Interview", "GitHub Repository", "Patent Record"] },
  { type: "CLAIM", icon: "[CLM]", count: 10, titles: ["Founder Claim", "Product Claim", "Technology Claim", "Funding Claim", "Customer Claim", "Traction Claim", "Compliance Claim", "Affiliation Claim", "Market Claim", "Revenue Claim"] },
  { type: "EDGE", icon: "[EDG]", count: 8, titles: ["founder_of", "cofounder_of", "advisor_to", "investor_in", "participant_in", "backed_by", "partnered_with", "patent_inventor_of"] },
  { type: "FIT", icon: "[FIT]", count: 8, titles: ["SOAPP Fit", "Bind Source to Claim", "Bind Source to Founder", "Bind Source to Venture", "Bind Source to Edge", "Bind Source to Problem", "Bind Source to Risk", "Bind Source to Contradiction"] },
  { type: "PROBLEM", icon: "[PRB]", count: 10, titles: ["Founder Relationship Not Verified", "Missing Official Team Page", "Unsupported Traction Claim", "AI Capability Lacks Artifact", "No Customer Proof", "Weak Source Quality", "Contradictory Timeline", "Funding Claim Unverified", "Compliance Claim Unsupported", "Founder Identity Ambiguous"] },
  { type: "PROBE", icon: "[PRX]", count: 8, titles: ["Find Official Team Page", "Find Founder Bio", "Find Product Demo", "Find GitHub Artifact", "Find Customer Proof", "Find Privacy Page", "Find Filing", "Find Independent Press"] },
  { type: "RISK", icon: "[RSK]", count: 8, titles: ["Prestige Laundering", "Founder Mythology", "Wizard-of-Oz Risk", "Narrative Overhang", "API Dependency", "Compliance Timebomb", "Customer Harm Risk", "Unit Economics Fog"] },
  { type: "CONTRADICTION", icon: "[CON]", count: 6, titles: ["Source Conflict", "Timeline Conflict", "Founder Role Conflict", "Venture Status Conflict", "Product Claim Conflict", "Identity Conflict"] },
  { type: "BOUNDARY", icon: "[BDY]", count: 6, titles: ["Forbidden Private Data", "Login-Gated Source", "Paywalled Source", "Private Email", "Protected Attribute", "Doxxing Risk"] },
  { type: "TRACE", icon: "[TRC]", count: 6, titles: ["Captured", "Parsed", "Evidence Bound", "Contradiction Flagged", "Problem Created", "Exported to Case File"] },
  { type: "AGENT", icon: "[AGT]", count: 8, titles: explorerAgents.map((agent) => agent.title) },
  { type: "COMMAND", icon: "[CMD]", count: 8, titles: ["Dispatch", "Inspect", "Capture", "Bind", "Verify", "Reject", "Fork", "Export"] },
  { type: "EVOLUTION", icon: "[EVO]", count: 4, titles: ["Candidate to Supported", "Supported to Contradicted", "Ambiguous to Resolved", "Unresolved to Exported"] },
  { type: "DIAGNOSIS", icon: "[DX]", count: 2, titles: ["Venture Diagnosis", "Bear Case Diagnosis"] },
];

const bodyByType = {
  FIELD: "Declare the public evidence boundary. Define what entities, source types, and claims can enter this case.",
  FORM: "Create a typed PROVIS object. It is a container awaiting source-bound evidence, not a fact.",
  SOURCE: "Capture a public destination page. Search results are discovery only. Private data does not count.",
  CLAIM: "Extract one bounded assertion from a source. It enters as candidate until evidence is bound.",
  EDGE: "Connect entities only when a public source supports the relationship. No proximity, no name-match inference.",
  FIT: "Play Source, Observation, Assessment, Problem, Probe. Say what is supported and what is not established.",
  PROBLEM: "Name the unresolved hole. A missing link is not blank space; it is a Venture Problem Form.",
  PROBE: "Turn uncertainty into the next public-source hunt. Every unresolved problem needs a probe.",
  RISK: "Translate a weak claim or gap into diligence pressure. Critique must remain evidence-bound.",
  CONTRADICTION: "Preserve conflict between sources. Do not erase contradiction or choose a winner too early.",
  BOUNDARY: "Block illegitimate capture. Professional public risk is allowed; private dirt is not.",
  TRACE: "Record the mutation. Every capture, bind, rejection, contradiction, and export leaves provenance.",
  AGENT: "Choose the explorer whose epistemic move matches the stuck point. Do not send every explorer at once.",
  COMMAND: "Advance the case with a legal PROVIS move. The move must change evidence, state, problem, probe, or trace.",
  EVOLUTION: "Move a form between states only when evidence, contradiction, or explicit uncertainty justifies the transition.",
  DIAGNOSIS: "Export the case interpretation: proven facts, weak claims, open problems, bear case, and salvageable truth.",
};

const defaultByType = {
  FIELD: { state: "unseen", evidence: "source_gap", limit: "does not establish any claim until a Source enters the field", move: "dispatch", trace: "creates Venture_Field boundary" },
  FORM: { state: "candidate", evidence: "L0_unverified", limit: "does not establish truth; it only names a container", move: "inspect", trace: "creates typed Form" },
  SOURCE: { state: "captured", evidence: "L1_self_claim", limit: "does not establish adoption, revenue, or current role unless directly stated", move: "capture", trace: "creates Evidence_Form" },
  CLAIM: { state: "candidate", evidence: "L0_unverified", limit: "does not establish truth until bound to source evidence", move: "extract", trace: "creates Claim_Form" },
  EDGE: { state: "weakly_supported", evidence: "L1_self_claim", limit: "does not establish equity, control, current role, or operating reality", move: "verify", trace: "creates Relationship_Edge" },
  FIT: { state: "evidence_bound", evidence: "L2_program_claim", limit: "does not establish what the source does not directly say", move: "bind", trace: "creates SOAPP_Fit" },
  PROBLEM: { state: "unresolved", evidence: "source_gap", limit: "does not prove failure; it names missing proof", move: "probe", trace: "creates Venture_Problem_Form" },
  PROBE: { state: "unresolved", evidence: "source_gap", limit: "does not count as evidence until a destination source is captured", move: "probe", trace: "creates next investigation task" },
  RISK: { state: "ambiguous", evidence: "source_gap", limit: "does not imply wrongdoing without evidence or explicit uncertainty", move: "summon_critic", trace: "creates Risk_Form" },
  CONTRADICTION: { state: "contradicted", evidence: "L2_program_claim", limit: "does not choose a winner between sources", move: "fork", trace: "creates Contradiction_Form" },
  BOUNDARY: { state: "forbidden_private", evidence: "source_gap", limit: "does not enter the evidence base", move: "reject", trace: "creates Source_Rejected trace" },
  TRACE: { state: "exported", evidence: "L5_primary_record", limit: "does not alter facts; it records case mutation", move: "freeze", trace: "appends Provenance_Trace" },
  AGENT: { state: "candidate", evidence: "source_gap", limit: "does not establish truth; it chooses an evidence behavior", move: "dispatch", trace: "creates Agent_Action trace" },
  COMMAND: { state: "parsed", evidence: "source_gap", limit: "does not substitute for evidence", move: "dispatch", trace: "creates Command trace" },
  EVOLUTION: { state: "evidence_bound", evidence: "L3_independent_public_source", limit: "does not upgrade confidence beyond the evidence level", move: "merge", trace: "changes state with reason" },
  DIAGNOSIS: { state: "exported", evidence: "L4_multiple_independent_sources", limit: "does not erase open problems or contradictions", move: "export", trace: "creates Diagnosis" },
};

function makeCard(spec, title, id) {
  const defaults = defaultByType[spec.type];
  const explorer = spec.type === "AGENT" ? explorerAgents.find((agent) => agent.title === title) : null;
  return {
    id: String(id).padStart(3, "0"),
    type: spec.type,
    icon: spec.icon,
    title,
    state: defaults.state,
    evidence: defaults.evidence,
    limit: explorer ? `risk: ${explorer.risk}` : defaults.limit,
    move: explorer ? explorer.move : defaults.move,
    trace: explorer ? explorer.trace : defaults.trace,
    body: explorer ? `${explorer.role} Hunts: ${explorer.hunts} Best for: ${explorer.best_for}` : bodyByType[spec.type],
    footer: `${spec.type} · ${defaults.move}`,
    tags: [spec.type.toLowerCase(), slug(title), "provis"],
    back: "No claim without source. No edge without evidence. No uncertainty hidden. No contradiction erased. No private dirt. FIELD · FORM · FIT · TRACE.",
  };
}

function makeCards() {
  const cards = [];
  cardSpecs.forEach((spec) => {
    if (spec.titles.length !== spec.count) {
      throw new Error(`${spec.type} expects ${spec.count} cards, got ${spec.titles.length}`);
    }
    spec.titles.forEach((title) => cards.push(makeCard(spec, title, cards.length + 1)));
  });
  if (cards.length !== 120) throw new Error(`Expected 120 cards, got ${cards.length}`);
  return cards;
}

const cards = makeCards();

function makeCaseCard(row, index) {
  return {
    id: `CASE-${String(index + 1).padStart(3, "0")}`,
    type: "CASE",
    icon: "[204]",
    title: row.entity,
    state: row.state,
    evidence: `${row.verified_link_count}/10 verified links`,
    limit: row.gap_reason || "does not establish claims beyond attached public sources",
    move: Number(row.gap_to_target || 0) > 0 ? "probe" : "inspect",
    trace: row.trace,
    body: `${row.entity_type}. ${row.coverage_status}. ${row.source_context}`,
    footer: `CASEDEX · ${row.id}`,
    tags: ["case", row.entity_type.toLowerCase(), "provis"],
    back: "204-entity Casedex expansion card. Source-bound case objects can enter play without changing the fixed 120-card press deck.",
  };
}

const caseCards = entityRows.map(makeCaseCard);

const baseStyle = `
  :root { color-scheme: light; --bg:#fff; --fg:#000; --line:#000; font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
  * { box-sizing: border-box; }
  html, body { margin: 0; background: var(--bg); color: var(--fg); }
  body { font-size: 14px; line-height: 1.25; letter-spacing: 0; }
  a { color: var(--fg); text-decoration: underline; text-decoration-thickness: 2px; }
  button, input, select, textarea { font: inherit; color: var(--fg); background: var(--bg); border: 1px solid var(--line); border-radius: 0; }
  button { cursor: pointer; }
  .top { position: sticky; top: 0; z-index: 10; background: var(--bg); border-bottom: 2px solid var(--line); display: flex; gap: 0; overflow-x: auto; }
  .top a, .top button { min-height: 42px; padding: 9px 10px; border: 0; border-right: 1px solid var(--line); font-weight: 900; text-transform: uppercase; font-size: 11px; white-space: nowrap; }
  main { width: min(100%, 1120px); margin: 0 auto; padding: 10px; }
  .panel { border: 2px solid var(--line); margin-bottom: 10px; }
  .head { border-bottom: 2px solid var(--line); padding: 7px 9px; display: flex; justify-content: space-between; gap: 8px; font-size: 11px; font-weight: 900; text-transform: uppercase; }
  .body { padding: 9px; }
  h1, h2, h3, p { margin: 0; }
  h1 { font-size: 24px; line-height: 1.02; }
  h2 { font-size: 17px; line-height: 1.1; }
  h3 { font-size: 14px; line-height: 1.1; }
  .small { font-size: 12px; line-height: 1.25; }
  .micro { font-size: 10px; line-height: 1.1; font-weight: 900; text-transform: uppercase; }
  .grid { display: grid; gap: 6px; }
  .cols { grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); }
  .cell { border: 1px solid var(--line); padding: 7px; min-height: 54px; overflow-wrap: anywhere; }
  .k { display: block; font-size: 10px; font-weight: 900; text-transform: uppercase; }
`;

function nav(current) {
  const links = [
    ["PROVIS", "provis.html"],
    ["PROVISGRID", "provisgrid.html"],
    ["PROVISDECK", "provisdeck.html"],
    ["PROVIS PLUS", "provis-plus.html"],
    ["PROVIS GLASS", "provis-glass.html"],
    ["GLASS LOOP", "provis-glass-loop.html"],
    ["DECKPRESS", "deckpress.html"],
  ];
  return `<nav class="top">${links.map(([label, href]) => `<a href="${href}"${label === current ? ' aria-current="page"' : ""}>${label}</a>`).join("")}</nav>`;
}

function htmlDoc(title, body, extraStyle = "", scripts = "") {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
  <title>${esc(title)}</title>
  <style>${baseStyle}${extraStyle}</style>
</head>
<body>${body}${scripts}</body>
</html>`;
}

const provisHtml = htmlDoc("PROVIS", `${nav("PROVIS")}
<main>
  <section class="panel">
    <div class="head"><span>PROVIS</span><span>ontology</span></div>
    <div class="body">
      <h1>Problem-Oriented Venture Information System</h1>
      <p class="small" style="margin-top:8px">PROVIS turns public venture traces into source-bound case files: entities, claims, relationships, evidence, risks, contradictions, problems, probes, and trace.</p>
    </div>
  </section>
  <section class="panel">
    <div class="head"><span>F4</span><span>language</span></div>
    <div class="body grid cols">
      ${[
        ["Field", "The bounded public evidence space around a venture, founder, program, or ecosystem."],
        ["Form", "A typed object: venture, founder, claim, evidence, edge, risk, contradiction, uncertainty, problem, trace."],
        ["Fit", "The play: Source, Observation, Assessment, Problem, Probe."],
        ["Trace", "The audit log for every capture, bind, rejection, contradiction, and export."],
      ].map(([k, v]) => `<div class="cell"><span class="k">${k}</span>${v}</div>`).join("")}
    </div>
  </section>
  <section class="panel">
    <div class="head"><span>Evidence Levels</span><span>L0-L5</span></div>
    <div class="body grid cols">
      ${[
        ["L0", "Unverified claim."],
        ["L1", "Self claim."],
        ["L2", "Program claim."],
        ["L3", "Independent public source."],
        ["L4", "Multiple independent sources."],
        ["L5", "Primary record or artifact."],
      ].map(([k, v]) => `<div class="cell"><span class="k">${k}</span>${v}</div>`).join("")}
    </div>
  </section>
  <section class="panel">
    <div class="head"><span>Shared Contract</span><span>all products</span></div>
    <div class="body grid cols">
      <div class="cell"><span class="k">Objects</span>FIELD / FORM / FIT / TRACE / SOURCE / CLAIM / EDGE / PROBLEM / PROBE / RISK / CONTRADICTION / UNCERTAINTY / BOUNDARY / AGENT / COMMAND / DIAGNOSIS</div>
      <div class="cell"><span class="k">States</span>${grammar.states.join(" / ")}</div>
      <div class="cell"><span class="k">Moves</span>${grammar.moves.join(" / ")}</div>
      <div class="cell"><span class="k">Boundaries</span>${grammar.hardBoundaries.join(" ")}</div>
    </div>
  </section>
  <section class="panel">
    <div class="head"><span>Product Stack</span><span>real outputs</span></div>
    <div class="body grid cols">
      <a class="cell" href="provisgrid.html"><span class="k">PROVISGRID</span>204-entity Casedex plus evidence board.</a>
      <a class="cell" href="provisdeck.html"><span class="k">PROVISDECK</span>Core 120-card language plus 204 CASE expansion cards.</a>
      <a class="cell" href="provis-plus.html"><span class="k">PROVIS PLUS</span>Prompt-system integrated Casedex app.</a>
      <a class="cell" href="provis-glass.html"><span class="k">PROVIS GLASS</span>Mobile glass branch: pinned entity, map, thread, evidence packet, move surface, agentdeck, element index.</a>
      <a class="cell" href="provis-glass-loop.html"><span class="k">GLASS LOOP</span>Actual 204-entity mobile operator loop: work queue, pinned entity, evidence packet, agentdeck, legal moves, and element index.</a>
      <a class="cell" href="deckpress.html"><span class="k">DECKPRESS</span>Print/mobile deck artifact plus 204 Casedex and CASE cards.</a>
    </div>
  </section>
</main>`);

const gridHtml = htmlDoc("PROVISGRID", `${nav("PROVISGRID")}
<main>
  <section class="panel">
    <div class="head"><span>PROVISGRID / 204 Casedex</span><span>${gridRows.length} entities / ${data.evidence.length} evidence rows</span></div>
    <div class="body">
      <div class="stats">
        <div><span class="k">Entities</span>${data.summary.quota_entity_count}</div>
        <div><span class="k">Ventures</span>${data.summary.venture_count}</div>
        <div><span class="k">People</span>${data.summary.people_count}</div>
        <div><span class="k">Organizations</span>${data.summary.organization_count}</div>
        <div><span class="k">Evidence</span>${data.summary.evidence_count}</div>
      </div>
      <div class="tools">
        <input id="q" type="search" placeholder="search entity, source, gap, context" />
        <select id="etype"><option value="all">all types</option><option>Person</option><option>Venture</option><option>Organization</option></select>
        <select id="coverage"><option value="all">all coverage</option><option value="gap">has gap</option><option value="0">zero links</option><option value="1-3">1-3 links</option><option value="4-9">4-9 links</option><option value="10">10+ links</option></select>
      </div>
      <div id="board"></div>
      <div id="detail" class="detail"></div>
    </div>
  </section>
</main>`, `
  .stats { display:grid; grid-template-columns: repeat(5, 1fr); gap:6px; margin-bottom:8px; }
  .stats > div { border:1px solid #000; padding:6px; min-height:42px; }
  .tools { display:grid; grid-template-columns: 1fr 130px 130px; gap:6px; margin-bottom:8px; }
  .tools input, .tools select { min-height:40px; padding:7px; }
  #board { display:grid; gap:2px; max-height:58vh; overflow:auto; }
  .row { display:grid; grid-template-columns: minmax(160px,1.15fr) 92px 58px 58px minmax(160px,1.25fr) 70px minmax(150px,1fr) 82px; border:1px solid var(--line); background:#fff; text-align:left; padding:0; }
  .row > span { border-right:1px solid var(--line); padding:5px; min-width:0; overflow-wrap:anywhere; }
  .row > span:last-child { border-right:0; }
  .row[aria-current="true"] { outline:3px solid #000; outline-offset:-3px; }
  .hdr { font-size:10px; font-weight:900; text-transform:uppercase; position:sticky; top:0; z-index:2; }
  .detail { border-top:2px solid #000; margin-top:8px; padding-top:8px; }
  .detail-grid { display:grid; grid-template-columns: 1fr 1fr; gap:8px; }
  .detail dl { display:grid; grid-template-columns:96px 1fr; gap:4px 8px; margin:0; }
  .detail dt { font-size:10px; font-weight:900; text-transform:uppercase; }
  .detail dd { margin:0; overflow-wrap:anywhere; }
  .evidence-list { display:grid; gap:4px; max-height:260px; overflow:auto; }
  .evidence-list a { display:block; border:1px solid #000; padding:6px; }
  @media (max-width: 760px) {
    .stats { grid-template-columns: repeat(3, 1fr); }
    .tools { grid-template-columns: 1fr 1fr; }
    .tools input { grid-column: span 2; }
    .row { grid-template-columns: minmax(130px,1fr) 58px 46px 54px; }
    .row .hide-sm { display:none; }
    .detail-grid { grid-template-columns:1fr; }
  }
`, `
<script id="grid-data" type="application/json">${safeJson(gridRows)}</script>
<script>
  const rows = JSON.parse(document.getElementById("grid-data").textContent);
  const q = document.getElementById("q");
  const etype = document.getElementById("etype");
  const coverage = document.getElementById("coverage");
  const board = document.getElementById("board");
  const detail = document.getElementById("detail");
  let selected = 0;
  function e(v){return String(v ?? "").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;","\\"":"&quot;","'":"&#39;"}[c]));}
  function sourceLink(url, text){return url ? '<a href="'+e(url)+'" target="_blank" rel="noreferrer">'+e(text || url)+'</a>' : "";}
  function hay(row){return [row.entity,row.entity_type,row.coverage_status,row.gap_reason,row.source_context,row.source_title,row.source_type,JSON.stringify(row.evidence_rows)].join(" ").toLowerCase();}
  function coverageOk(row){
    const links = Number(row.verified_link_count || 0);
    if (coverage.value === "all") return true;
    if (coverage.value === "gap") return Number(row.gap_to_target || 0) > 0;
    if (coverage.value === "0") return links === 0;
    if (coverage.value === "1-3") return links >= 1 && links <= 3;
    if (coverage.value === "4-9") return links >= 4 && links <= 9;
    if (coverage.value === "10") return links >= 10;
    return true;
  }
  function visible(){
    const term = q.value.trim().toLowerCase();
    return rows.filter(row => (etype.value === "all" || row.entity_type === etype.value) && coverageOk(row) && (!term || hay(row).includes(term)));
  }
  function show(row){
    if (!row) return;
    const urls = (row.verified_urls || []).map(url => sourceLink(url, url)).join("");
    const evidence = (row.evidence_rows || []).map(ev => sourceLink(ev.url, (ev.source_title || ev.url) + " — " + (ev.evidence_type || "") + " — " + (ev.confidence || ""))).join("");
    detail.innerHTML = '<div class="detail-grid"><dl>' +
      '<dt>entity</dt><dd>'+e(row.entity)+'</dd>' +
      '<dt>type</dt><dd>'+e(row.entity_type)+'</dd>' +
      '<dt>coverage</dt><dd>'+e(row.coverage_status)+'</dd>' +
      '<dt>gap</dt><dd>'+e(row.gap_to_target)+' / '+e(row.target_links)+'</dd>' +
      '<dt>problem</dt><dd>'+e(row.problem)+'</dd>' +
      '<dt>probe</dt><dd>'+e(row.probe)+'</dd>' +
      '<dt>state</dt><dd>'+e(row.state)+'</dd>' +
      '<dt>context</dt><dd>'+e(row.source_context)+'</dd>' +
      '<dt>trace</dt><dd>'+e(row.trace)+'</dd>' +
    '</dl><div><p class="micro">Verified URLs</p><div class="evidence-list">'+(urls || "No verified URLs recorded.")+'</div><p class="micro" style="margin-top:8px">Evidence Rows</p><div class="evidence-list">'+(evidence || "No evidence rows attached.")+'</div></div></div>';
  }
  function render(){
    const out = visible();
    board.innerHTML = '<div class="row hdr"><span>Entity</span><span>Type</span><span>Links</span><span>Gap</span><span class="hide-sm">First Source</span><span class="hide-sm">Rows</span><span class="hide-sm">Problem</span><span>State</span></div>' +
      out.map((row) => '<button class="row" data-i="'+rows.indexOf(row)+'"'+(rows.indexOf(row)===selected?' aria-current="true"':'')+'><span>'+e(row.entity)+'</span><span>'+e(row.entity_type)+'</span><span>'+e(row.verified_link_count)+'/10</span><span>'+e(row.gap_to_target)+'</span><span class="hide-sm">'+sourceLink(row.source_url,row.source_title || row.source_url)+'</span><span class="hide-sm">'+e(row.evidence_count)+'</span><span class="hide-sm">'+e(row.problem)+'</span><span>'+e(row.state)+'</span></button>').join("");
    board.querySelectorAll("button.row").forEach(btn => btn.addEventListener("click", () => { selected = Number(btn.dataset.i); show(rows[selected]); render(); }));
    show(rows[selected] || out[0] || rows[0]);
  }
  q.addEventListener("input", render);
  etype.addEventListener("change", render);
  coverage.addEventListener("change", render);
  render();
</script>`);

const deckHtml = htmlDoc("PROVISGRID 204 Casedex", `
<div id="appShell" class="app-shell">
  <header class="appbar">
    <button class="brand-mini" data-mode="library" type="button">PROVIS</button>
    <div id="modeTitle" class="mode-title">204 entities</div>
    <button id="searchToggle" class="icon-btn" type="button" aria-label="Find">⌕</button>
  </header>
  <section id="searchPanel" class="search-panel">
    <input id="searchInput" type="search" placeholder="Search 204 entities" autocomplete="off" />
    <div class="filter-row">
      <button data-filter="all" class="active" type="button">All</button>
      <button data-filter="people" type="button">People</button>
      <button data-filter="ventures" type="button">Ventures</button>
      <button data-filter="orgs" type="button">Orgs</button>
      <button data-filter="problems" type="button">Problems</button>
    </div>
  </section>
  <main id="appView" class="app-view"></main>
  <button id="selectedDock" class="selected-dock" type="button"></button>
  <nav class="bottom-nav" aria-label="Primary">
    <button data-mode="library" class="active" type="button">Entity</button>
    <button data-mode="map" type="button">Map</button>
    <button data-mode="thread" type="button">Thread</button>
    <button data-mode="evidence" type="button">Evidence</button>
    <button data-mode="move" type="button">Move</button>
  </nav>
</div>`, `
  :root {
    --page:#fbfaf7;
    --card:#fff;
    --ink:#0b0d10;
    --muted:#67707d;
    --line:#dedbd3;
    --line-strong:#b9b4aa;
    --soft:#f2f0eb;
    --green:#e2f3e6;
    --green-ink:#12622f;
    --red:#fff0ed;
    --red-ink:#a22a1c;
    --amber:#fff4dd;
    --amber-ink:#8b5a00;
    --blue:#eaf2ff;
    --blue-ink:#174a86;
    --purple:#f0e9fb;
    --purple-ink:#5b3a86;
  }
  body { background:var(--page); color:var(--ink); padding:42px 0 112px; }
  body, button, input { font-family:-apple-system,BlinkMacSystemFont,"SF Pro Text","Inter",system-ui,sans-serif; }
  button { color:inherit; }
  * { scrollbar-width: thin; scrollbar-color: #d2cdc3 transparent; }
  *::-webkit-scrollbar { width:4px; height:4px; }
  *::-webkit-scrollbar-track { background:transparent; }
  *::-webkit-scrollbar-thumb { background:#d2cdc3; border-radius:999px; }
  .appbar { position:fixed; top:0; left:0; right:0; z-index:50; height:42px; display:grid; grid-template-columns:74px 1fr 42px; align-items:center; padding:0 10px; border-bottom:1px solid var(--line); background:rgba(255,255,255,.96); }
  .brand-mini, .icon-btn { border:0; background:transparent; font-weight:900; }
  .brand-mini { text-align:left; font-size:14px; letter-spacing:.01em; }
  .mode-title { text-align:center; font-size:12px; font-weight:800; color:#1a1d21; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
  .icon-btn { min-height:34px; font-size:18px; }
  .search-panel { position:fixed; top:42px; left:0; right:0; z-index:45; padding:8px 10px; background:rgba(251,250,247,.98); border-bottom:1px solid var(--line); transform:translateY(-110%); transition:transform .16s ease; }
  .search-panel.open { transform:translateY(0); }
  .search-panel input { width:100%; height:36px; border:1px solid var(--line); border-radius:9px; background:var(--soft); padding:7px 10px; font-size:13px; }
  .filter-row, .category-row, .entity-tabs, .mini-strip, .toolbar-row { overflow-x:auto; scrollbar-width:none; -webkit-overflow-scrolling:touch; }
  .filter-row::-webkit-scrollbar, .category-row::-webkit-scrollbar, .entity-tabs::-webkit-scrollbar, .mini-strip::-webkit-scrollbar, .toolbar-row::-webkit-scrollbar { display:none; }
  .filter-row, .category-row, .toolbar-row { display:flex; gap:6px; padding-top:7px; }
  .filter-row button, .category-row button, .toolbar-row button, .small-action { border:1px solid var(--line); border-radius:999px; background:#fff; min-height:30px; padding:5px 10px; font-size:11px; font-weight:850; white-space:nowrap; }
  .filter-row button.active, .category-row button.active, .toolbar-row button.active { background:#000; color:#fff; border-color:#000; }
  .app-view { max-width:1180px; margin:0 auto; padding:9px 10px 0; }
  .app-view.view-enter > * { animation: surfaceIn .18s ease both; }
  @keyframes surfaceIn { from { opacity:0; transform:translateY(8px); } to { opacity:1; transform:translateY(0); } }
  .bottom-nav { position:fixed; left:0; right:0; bottom:0; z-index:55; height:54px; display:grid; grid-template-columns:repeat(5,1fr); border-top:1px solid var(--line); background:rgba(255,255,255,.96); }
  .bottom-nav button { border:0; border-right:1px solid var(--line); background:transparent; font-size:10px; font-weight:850; }
  .bottom-nav button.active { background:#000; color:#fff; }
  .selected-dock { position:fixed; left:10px; right:10px; bottom:62px; z-index:48; min-height:48px; display:grid; grid-template-columns:40px 1fr auto; align-items:center; gap:8px; border:1px solid var(--line-strong); border-radius:10px; background:rgba(255,255,255,.97); box-shadow:0 5px 20px rgba(15,23,42,.10); padding:6px 8px; text-align:left; }
  .selected-dock.hidden { display:none; }
  .avatar { width:40px; height:40px; display:grid; place-items:center; border:1px solid var(--line); border-radius:8px; background:var(--blue); color:var(--blue-ink); font-size:16px; font-weight:950; }
  .avatar.small { width:32px; height:32px; font-size:13px; border-radius:7px; }
  .avatar.large { width:52px; height:52px; font-size:20px; }
  .avatar.group-FOUNDERS, .avatar.group-INVESTORS { background:var(--amber); color:var(--amber-ink); }
  .avatar.group-MENTORS, .avatar.group-FACULTY { background:var(--purple); color:var(--purple-ink); }
  .avatar.group-VENTURES { background:var(--green); color:var(--green-ink); }
  .avatar.group-ECOSYSTEM { background:#f4eadf; color:#7a4b16; }
  .dock-title { min-width:0; }
  .dock-title strong { display:block; font-size:12px; line-height:1.05; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
  .dock-title span { display:block; color:var(--muted); font-size:10px; margin-top:2px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
  .badge-row { display:flex; flex-wrap:wrap; gap:4px; }
  .badge { display:inline-flex; align-items:center; min-height:18px; border:1px solid var(--line); border-radius:5px; padding:1px 5px; background:#fff; font-size:10px; font-weight:850; white-space:nowrap; }
  .badge.verified { background:var(--green); color:var(--green-ink); border-color:#c7e6cd; }
  .badge.ambiguous { background:var(--amber); color:var(--amber-ink); border-color:#eed6a8; }
  .badge.problem { background:var(--red); color:var(--red-ink); border-color:#f1c6bd; }
  .section { margin-bottom:12px; }
  .section-head { display:flex; align-items:center; justify-content:space-between; gap:8px; margin:3px 0 7px; }
  .section-head h2 { font-size:13px; line-height:1.1; }
  .section-head button { border:0; background:transparent; color:#111; font-size:11px; font-weight:900; padding:5px 0; }
  .mini-strip { display:grid; grid-auto-flow:column; grid-auto-columns:minmax(104px,132px); gap:8px; padding:1px 0 3px; }
  .mini-card, .list-row, .entity-card, .problem-card, .agent-card, .thread-card, .stack-face, .map-card { border:1px solid var(--line); border-radius:9px; background:var(--card); box-shadow:0 1px 4px rgba(15,23,42,.04); }
  .mini-card { min-height:102px; padding:8px; text-align:left; display:grid; grid-template-rows:auto 1fr auto; gap:5px; }
  .mini-card h3 { font-size:12px; line-height:1.05; display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; overflow:hidden; }
  .mini-card p { color:var(--muted); font-size:10px; line-height:1.15; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
  .plus-card { display:grid; place-items:center; text-align:center; color:#111; font-weight:900; }
  .grid-cards { display:grid; grid-template-columns:repeat(auto-fill,minmax(96px,1fr)); gap:8px; }
  .library-summary { display:grid; grid-template-columns:repeat(4,1fr); gap:6px; margin-bottom:8px; }
  .summary-box { border:1px solid var(--line); border-radius:9px; background:#fff; padding:8px; }
  .summary-box strong { display:block; font-size:15px; }
  .summary-box span { display:block; color:var(--muted); font-size:10px; margin-top:2px; }
  .entity-sticky { position:sticky; top:42px; z-index:30; background:rgba(251,250,247,.98); padding:0 0 7px; margin:-2px 0 8px; }
  .identity-bar { border:1px solid var(--line); border-radius:10px; background:#fff; display:grid; grid-template-columns:52px 1fr auto; align-items:center; gap:8px; padding:8px; }
  .identity-bar h1 { font-size:16px; line-height:1.05; }
  .identity-bar p { font-size:11px; color:var(--muted); margin-top:2px; }
  .identity-tools { display:flex; gap:4px; }
  .identity-tools button, .identity-tools a { min-width:34px; min-height:32px; display:grid; place-items:center; border:1px solid var(--line); border-radius:8px; background:#fff; text-decoration:none; font-size:12px; font-weight:900; }
  .entity-tabs { display:grid; grid-auto-flow:column; grid-auto-columns:minmax(82px,1fr); gap:0; margin-top:6px; border-bottom:1px solid var(--line); }
  .entity-tabs button { border:0; border-bottom:2px solid transparent; background:transparent; min-height:34px; font-size:11px; font-weight:850; }
  .entity-tabs button.active { border-bottom-color:#000; }
  .entity-card { padding:11px; }
  .pinned-panel { border:1px solid var(--line-strong); border-radius:11px; background:#fff; padding:10px; margin-bottom:10px; }
  .pin-label { display:flex; align-items:center; justify-content:space-between; gap:8px; font-size:10px; font-weight:950; text-transform:uppercase; margin-bottom:8px; }
  .pinned-core { display:grid; grid-template-columns:52px 1fr auto; gap:10px; align-items:center; }
  .pinned-core h1 { font-size:17px; line-height:1.05; }
  .pinned-core p { color:var(--muted); font-size:11px; margin-top:2px; }
  .signal-row { display:grid; grid-template-columns:1fr 1fr 1fr; border-top:1px solid var(--line); margin-top:10px; }
  .signal-row div { padding:8px 8px 0 0; border-right:1px solid var(--line); }
  .signal-row div:last-child { border-right:0; padding-right:0; padding-left:8px; }
  .signal-row span { display:block; color:var(--muted); font-size:9px; font-weight:950; text-transform:uppercase; }
  .signal-row strong { display:block; font-size:12px; margin-top:3px; }
  .score-dots { letter-spacing:2px; font-size:15px; }
  .fact-table { display:grid; grid-template-columns:92px 1fr; border-top:1px solid var(--line); }
  .fact-table dt, .fact-table dd { border-bottom:1px solid var(--line); padding:7px 0; font-size:12px; }
  .fact-table dt { color:var(--muted); font-weight:900; text-transform:uppercase; font-size:9px; }
  .fact-table dd { margin:0; min-width:0; }
  .text-block { border-top:1px solid var(--line); padding:10px 0; }
  .text-block:first-child { border-top:0; padding-top:0; }
  .text-block h3 { font-size:10px; color:var(--muted); text-transform:uppercase; margin-bottom:4px; }
  .text-block p { font-size:13px; line-height:1.35; }
  .chip-list { display:flex; gap:5px; flex-wrap:wrap; }
  .action-row { display:grid; grid-template-columns:repeat(3,1fr); gap:7px; margin-top:10px; }
  .action-row button, .action-row a { border:1px solid var(--line); border-radius:8px; min-height:36px; display:grid; place-items:center; background:#fff; text-decoration:none; font-size:11px; font-weight:900; }
  .action-row button.primary, .action-row a.primary { background:#000; color:#fff; border-color:#000; }
  .list-row { display:grid; grid-template-columns:34px 1fr auto; gap:9px; align-items:center; width:100%; margin-bottom:7px; padding:9px; text-align:left; }
  .list-row strong { display:block; font-size:12px; line-height:1.1; }
  .list-row span, .list-row p { color:var(--muted); font-size:10px; line-height:1.25; }
  .list-row p { margin-top:2px; }
  .problem-card { display:grid; grid-template-columns:34px 1fr auto; gap:9px; align-items:start; width:100%; padding:10px; margin-bottom:8px; text-align:left; }
  .warn { width:32px; height:32px; display:grid; place-items:center; border:1px solid #efc2b9; border-radius:8px; background:var(--red); color:var(--red-ink); font-weight:950; }
  .problem-card strong { font-size:12px; line-height:1.15; }
  .problem-card p { color:var(--muted); font-size:11px; margin:3px 0 6px; }
  .stack-wrap { min-height:calc(100vh - 202px); display:grid; place-items:center; padding:8px 0 20px; }
  .stack-stage { width:min(92vw,390px); }
  .stack-face { position:relative; min-height:320px; padding:15px; box-shadow:0 16px 30px rgba(15,23,42,.11); }
  .stack-face:before, .stack-face:after { content:""; position:absolute; inset:0; border:1px solid var(--line); border-radius:9px; background:#fff; z-index:-1; }
  .stack-face:before { transform:translate(9px,9px) rotate(2deg); }
  .stack-face:after { transform:translate(18px,18px) rotate(4deg); }
  .stack-count { text-align:center; color:var(--muted); font-size:12px; margin:13px 0 8px; }
  .stack-controls { display:grid; grid-template-columns:1fr 1fr 1fr; gap:8px; }
  .stack-controls button { min-height:38px; border:1px solid var(--line); border-radius:8px; background:#fff; font-weight:900; }
  .map-card { position:relative; height:360px; overflow:hidden; background:linear-gradient(#fff,#fbfaf7); }
  .map-card svg { position:absolute; inset:0; width:100%; height:100%; pointer-events:none; }
  .map-node { position:absolute; width:102px; min-height:54px; border:1px solid var(--line); border-radius:8px; background:#fff; padding:7px; text-align:center; box-shadow:0 2px 8px rgba(15,23,42,.05); }
  .map-node.center { background:#000; color:#fff; border-color:#000; }
  .map-node b { display:block; font-size:11px; line-height:1.05; }
  .map-node span { display:block; color:var(--muted); font-size:9px; margin-top:3px; }
  .map-node.center span { color:#ddd; }
  .thread-card { padding:10px; margin-bottom:8px; display:grid; grid-template-columns:42px 1fr; gap:9px; }
  .thread-card h3 { font-size:12px; }
  .thread-card p { color:var(--muted); font-size:11px; line-height:1.3; margin-top:3px; }
  .agent-grid { display:grid; grid-template-columns:repeat(auto-fit,minmax(138px,1fr)); gap:8px; }
  .agent-card { padding:10px; min-height:126px; }
  .agent-card h3 { font-size:13px; }
  .agent-card p { color:var(--muted); font-size:11px; line-height:1.3; margin-top:4px; }
  .agent-card .dot { width:7px; height:7px; border-radius:50%; background:#1f8f3a; display:inline-block; margin-left:5px; }
  .core-card { border:1px solid #111; border-radius:10px; background:#fff; padding:11px; margin-bottom:10px; }
  .core-card h2, .core-card h3 { font-size:13px; margin-bottom:6px; }
  .core-card p { font-size:12px; line-height:1.35; }
  .constraint-list { display:grid; gap:5px; margin-top:8px; }
  .constraint-list div, .constraint-list li { list-style:none; border:1px solid var(--line); border-radius:7px; padding:7px; font-size:11px; }
  .directive-list { display:grid; gap:5px; margin:8px 0; }
  .directive-list li { list-style:none; border-top:1px solid var(--line); padding-top:5px; color:#24272c; font-size:11px; line-height:1.3; }
  .prompt-actions { display:grid; grid-template-columns:1fr 1fr; gap:6px; margin-top:8px; }
  .prompt-actions button { min-height:32px; border:1px solid var(--line); border-radius:8px; background:#fff; font-size:10px; font-weight:900; }
  .prompt-actions button.primary { background:#000; color:#fff; border-color:#000; }
  .codebox { border:1px solid var(--line); border-radius:8px; background:#faf9f5; padding:8px; font:10px/1.35 ui-monospace,SFMono-Regular,Menlo,monospace; overflow:auto; max-height:160px; white-space:pre-wrap; margin-top:8px; }
  .agent-strip { display:grid; grid-auto-flow:column; grid-auto-columns:minmax(116px,142px); gap:7px; overflow-x:auto; padding:2px 0 8px; scrollbar-width:none; }
  .agent-strip::-webkit-scrollbar { display:none; }
  .agent-pill { border:1px solid var(--line); border-radius:9px; background:#fff; padding:8px; text-align:left; min-height:76px; }
  .agent-pill strong { display:block; font-size:12px; }
  .agent-pill span { display:block; color:var(--muted); font-size:10px; margin-top:3px; line-height:1.2; }
  .packet-card { border:1px solid var(--line); border-radius:10px; background:#fff; margin-bottom:9px; overflow:hidden; }
  .packet-head { display:grid; grid-template-columns:34px 1fr auto; gap:9px; align-items:center; padding:10px; }
  .packet-head strong { display:block; font-size:12px; }
  .packet-head span { display:block; color:var(--muted); font-size:10px; margin-top:2px; }
  .packet-body { display:grid; grid-template-columns:1fr 1fr; border-top:1px solid var(--line); }
  .packet-body div { padding:9px 10px; border-right:1px solid var(--line); }
  .packet-body div:last-child { border-right:0; }
  .packet-body h3 { font-size:9px; color:var(--muted); text-transform:uppercase; margin-bottom:4px; }
  .packet-body p { font-size:12px; line-height:1.35; }
  .packet-foot { display:flex; align-items:center; justify-content:space-between; gap:8px; border-top:1px solid var(--line); padding:8px 10px; font-size:11px; color:var(--muted); }
  .composer { position:sticky; bottom:58px; z-index:25; display:grid; grid-template-columns:1fr 38px; gap:7px; background:rgba(251,250,247,.96); padding:8px 0; }
  .composer input { min-height:38px; border:1px solid var(--line); border-radius:9px; background:#fff; padding:8px 10px; font-size:12px; }
  .composer button { border:1px solid #000; border-radius:999px; background:#000; color:#fff; font-weight:950; }
  .command-row { display:grid; grid-template-columns:repeat(5,1fr); gap:6px; margin:8px 0 10px; }
  .command-row button { min-height:36px; border:1px solid var(--line); border-radius:8px; background:#fff; font-size:11px; font-weight:900; }
  .command-row button.primary { background:#000; color:#fff; border-color:#000; }
  .move-grid { display:grid; grid-template-columns:repeat(2,1fr); gap:8px; }
  .move-card { border:1px solid var(--line); border-radius:10px; background:#fff; padding:10px; min-height:92px; }
  .move-card h3 { font-size:12px; }
  .move-card p { color:var(--muted); font-size:11px; line-height:1.3; margin-top:4px; }
  .compare-strip { display:grid; grid-auto-flow:column; grid-auto-columns:minmax(126px,1fr); gap:8px; overflow-x:auto; padding:2px 0 8px; scrollbar-width:none; }
  .compare-strip::-webkit-scrollbar { display:none; }
  .compare-card { border:1px solid var(--line); border-radius:10px; background:#fff; padding:10px; min-height:150px; text-align:center; }
  .compare-card.selected { border-color:#000; box-shadow:inset 0 0 0 1px #000; }
  .compare-card .avatar { margin:0 auto 8px; }
  .compare-card h3 { font-size:12px; line-height:1.1; }
  .compare-card p { color:var(--muted); font-size:10px; margin-top:4px; }
  .field-metrics { display:grid; grid-template-columns:repeat(3,1fr); gap:6px; margin:8px 0 10px; }
  .metric-card { border:1px solid var(--line); border-radius:9px; background:#fff; padding:9px; }
  .metric-card strong { display:block; font-size:17px; }
  .metric-card span { display:block; color:var(--muted); font-size:10px; margin-top:2px; }
  .capture-button { width:100%; min-height:42px; border:0; border-radius:9px; background:#000; color:#fff; font-size:12px; font-weight:950; margin-bottom:10px; }
  .gap-scroll { overflow:auto; border:1px solid var(--line); border-radius:10px; background:#fff; }
  .gap-matrix { min-width:720px; display:grid; grid-template-columns:150px repeat(8,70px); }
  .gap-cell { min-height:46px; border-right:1px solid var(--line); border-bottom:1px solid var(--line); padding:6px; font-size:10px; display:grid; align-items:center; }
  .gap-cell.head { font-weight:950; text-transform:uppercase; text-align:center; color:#30343a; background:#faf9f5; }
  .gap-cell.entity { font-weight:900; line-height:1.1; }
  .mark { width:26px; height:26px; border:1px solid var(--line-strong); border-radius:6px; display:grid; place-items:center; margin:auto; font-size:12px; font-weight:950; background:#fff; }
  .mark.found { background:#111; color:#fff; border-color:#111; }
  .mark.weak { background:repeating-linear-gradient(135deg,#fff,#fff 3px,#ece7df 3px,#ece7df 6px); }
  .mark.missing { color:#aaa; }
  .mark.contradicted { background:var(--red); color:var(--red-ink); border-color:#efc2b9; }
  .gate-card { border:1px solid var(--line); border-radius:10px; background:#fff; padding:10px; margin-bottom:9px; }
  .gate-row { display:grid; grid-template-columns:1fr auto; gap:8px; align-items:center; border-top:1px solid var(--line); padding-top:8px; margin-top:8px; }
  .gate-row:first-child { border-top:0; padding-top:0; margin-top:0; }
  .bar { height:6px; border-radius:999px; background:var(--soft); overflow:hidden; margin-top:5px; }
  .bar span { display:block; height:100%; background:#111; }
  .trace-list { border:1px solid var(--line); border-radius:10px; background:#fff; padding:4px 0; margin-top:9px; }
  .trace-item { display:grid; grid-template-columns:34px 1fr auto; gap:9px; align-items:start; padding:10px; border-bottom:1px solid var(--line); }
  .trace-item:last-child { border-bottom:0; }
  .trace-dot { width:22px; height:22px; border:1px solid #111; border-radius:50%; display:grid; place-items:center; font-size:10px; font-weight:950; }
  .trace-item strong { font-size:12px; }
  .trace-item p { color:var(--muted); font-size:11px; line-height:1.3; margin-top:2px; }
  .export-grid { display:grid; grid-template-columns:repeat(2,1fr); gap:8px; }
  .export-card { border:1px solid var(--line); border-radius:10px; background:#fff; padding:10px; min-height:88px; display:grid; gap:6px; }
  .export-card strong { font-size:12px; }
  .export-card span { color:var(--muted); font-size:10px; }
  .export-card button { border:1px solid var(--line); border-radius:7px; min-height:30px; background:#fff; font-weight:900; font-size:10px; }
  .gesture-grid { display:grid; grid-template-columns:1fr 1fr; gap:1px; border:1px solid var(--line); border-radius:10px; overflow:hidden; background:var(--line); }
  .gesture { background:#fff; padding:10px; min-height:66px; }
  .gesture strong { display:block; font-size:11px; text-transform:uppercase; }
  .gesture span { display:block; color:var(--muted); font-size:10px; margin-top:3px; }
  .empty { border:1px dashed var(--line-strong); border-radius:9px; padding:12px; background:#fff; color:var(--muted); font-size:12px; }
  @media (min-width:760px) {
    body { padding-bottom:64px; }
    .app-view { padding-left:14px; padding-right:14px; }
    .selected-dock { left:50%; right:auto; width:min(520px,calc(100vw - 30px)); transform:translateX(-50%); }
    .desktop-split { display:grid; grid-template-columns:minmax(310px,410px) 1fr; gap:12px; align-items:start; }
    .mini-strip { grid-auto-columns:minmax(120px,154px); }
    .grid-cards { grid-template-columns:repeat(auto-fill,minmax(112px,1fr)); }
    .entity-sticky { top:42px; }
  }
`, `
<script id="entity-data" type="application/json">${safeJson(entityRows)}</script>
<script id="case-card-data" type="application/json">${safeJson(caseCards)}</script>
<script id="deck-data" type="application/json">${safeJson(cards)}</script>
<script>
  const entities = JSON.parse(document.getElementById("entity-data").textContent);
  const caseCards = JSON.parse(document.getElementById("case-card-data").textContent);
  const coreCards = JSON.parse(document.getElementById("deck-data").textContent);
  const groups = ${safeJson(groupOrder.map((key) => ({ key, ...groupMeta[key] })))};
  const appView = document.getElementById("appView");
  const selectedDock = document.getElementById("selectedDock");
  const modeTitle = document.getElementById("modeTitle");
  const searchPanel = document.getElementById("searchPanel");
  const searchInput = document.getElementById("searchInput");
  const searchToggle = document.getElementById("searchToggle");
  const state = { mode:"library", tab:"overview", filter:"all", selected:0, focusedGroup:"", stackIndex:0, evidenceFilter:"all" };
  const groupLabels = Object.fromEntries(groups.map((group) => [group.key, group.label]));
  const systemCore = {
    id: "PROVIS_CORE",
    philosophy: "No claim without source. No edge without evidence. No uncertainty hidden. No contradiction erased. No private dirt. FIELD · FORM · FIT · TRACE.",
    constraints: [
      ["C1", "Never hallucinate facts. If the evidence is absent, output a SOURCE_GAP."],
      ["C2", "Never rely on name-similarity alone to establish a relationship edge."],
      ["C3", "Private data, doxxing, and leaked materials are strictly FORBIDDEN."],
      ["C4", "Preserve contradictions; do not hallucinate a synthesis if sources disagree."]
    ]
  };
  const agentData = [
    {
      id: "SCOUT",
      name: "Scout",
      role: "Public Surface Area Explorer",
      purpose: "Finds public destination URLs and reports source packets.",
      family: "Gathering",
      move: "capture",
      directives: [
        "Receive target entity: Person, Venture, or Organization.",
        "Identify canonical public URLs: official websites, team pages, press articles, university rosters.",
        "Filter out aggregator spam, paywalled domains, and private social media profiles.",
        "Return a list of viable source URLs awaiting capture."
      ],
      output: "source_packet: url, source_type, confidence."
    },
    {
      id: "GUARD",
      name: "Guard",
      role: "Boundary Enforcer",
      purpose: "Blocks private, paywalled, or illegitimate capture.",
      family: "Gathering",
      move: "reject",
      directives: [
        "Analyze incoming source text and URLs provided by Scout.",
        "Reject if content requires a login to view.",
        "Reject protected attributes, private emails, physical home addresses, doxxing risk, and leaked material.",
        "If rejected, throw a Boundary_Form with move=reject status."
      ],
      output: "boundary_form: source, reason, move, safe substitute probe."
    },
    {
      id: "BINDER",
      name: "Binder",
      role: "Evidence Attacher",
      purpose: "Attaches source, support, limit, confidence, and trace.",
      family: "Gathering",
      move: "bind",
      directives: [
        "Consume raw text from a Guard-approved source.",
        "Extract bounded assertions as Claims.",
        "Define exactly what the text SUPPORTS.",
        "Define exactly what the text DOES NOT ESTABLISH.",
        "Bind the evidence to the entity record."
      ],
      output: "evidence_row: extracted_facts, matching_fields, unresolved_gap, trace."
    },
    {
      id: "LINKER",
      name: "Linker / Erdos",
      role: "Graph Wanderer",
      purpose: "Tests edges without name-similarity shortcuts.",
      family: "Gathering",
      move: "link",
      directives: [
        "Receive two entities and a candidate source text.",
        "Determine if a formal relationship edge exists: founder_of, investor_in, partnered_with, employed_by.",
        "Reject edges relying only on same-name similarity without contextual anchors.",
        "Output the validated Edge_Form."
      ],
      output: "edge_form: subject, predicate, object, evidence_id, supports, does_not_establish, confidence."
    },
    {
      id: "CRITIC",
      name: "Critic",
      role: "Gap & Contradiction Spotter",
      purpose: "Turns gaps and contradictions into named problems.",
      family: "Critique",
      move: "problem",
      directives: [
        "Review the assembled evidence packet from Binder.",
        "Identify unsupported traction claims, missing official team pages, ambiguous founder identities, and weak source layers.",
        "Output a Problem_Form.",
        "Generate the next specific public-source Probe required to close the gap."
      ],
      output: "problem_form: title, severity, evidence_links, risk_if_wrong, next_probe."
    },
    {
      id: "SAGAN",
      name: "Sagan",
      role: "Cosmic Skeptic",
      purpose: "Downgrades overclaimed technology until proof appears.",
      family: "Critique",
      move: "downgrade",
      directives: [
        "Target AI claims, deeptech claims, scientific language, and miracle-product pitches.",
        "Assess whether an API wrapper is masquerading as proprietary ML or a render is masquerading as a prototype.",
        "Downgrade confidence when proof is absent.",
        "Log Wizard-of-Oz Risk or Technology Claim Unsupported."
      ],
      output: "risk_form: technical_gap, evidence_required, confidence_change, probe."
    },
    {
      id: "MENCIUS",
      name: "Mencius",
      role: "Moral-Pressure Reader",
      purpose: "Turns claims into customer-harm or governance problems.",
      family: "Critique",
      move: "risk",
      directives: [
        "Target privacy risk, labor risk, exploitative incentives, and public-good claims.",
        "Assess who is harmed, who bears downside, and what duty may be violated.",
        "Instantiate a Risk_Form such as Compliance Timebomb or Customer Harm Risk."
      ],
      output: "risk_form: downside_distribution, harm_vector, affected_parties, probe."
    },
    {
      id: "MEITNER",
      name: "Meitner",
      role: "Hidden-Cause Detector",
      purpose: "Finds the missing actor behind a visible claim.",
      family: "Critique",
      move: "fork",
      directives: [
        "Target quiet mechanisms, overlooked contributors, and buried causal chains.",
        "Assess uncredited technical labor, university lab IP, or prestige-laundered provenance.",
        "Output Founder Mythology or Prestige Laundering Risk_Form when source-bound."
      ],
      output: "risk_form: hidden_actor, evidence_gap, ambiguity_flag, next_probe."
    },
    {
      id: "ARCHIMEDES",
      name: "Archimedes",
      role: "First-Principles Tester",
      purpose: "Reduces a business claim to the minimum test that would prove it.",
      family: "Critique",
      move: "probe",
      directives: [
        "Target unit economics, product reality, and scale claims.",
        "Assess the physical or economic constraint that makes a claim impossible or improbable.",
        "Create Unit Economics Fog Risk_Form or Minimal_Test Probe."
      ],
      output: "probe_form: minimum_test, evidence_needed, stop_condition, owner."
    },
    {
      id: "HEISENBERG",
      name: "Heisenberg",
      role: "Uncertainty Mapper",
      purpose: "Forks an ambiguous record instead of forcing certainty.",
      family: "Critique",
      move: "contradict",
      directives: [
        "Target same-name founders, stale sources, and conflicting timelines.",
        "If sources conflict, do not merge and do not guess.",
        "Create a Contradiction_Form, move state to contradicted, and fork the entity record."
      ],
      output: "contradiction_form: source_a, source_b, conflict_summary, fork_state, probe."
    },
    {
      id: "COMPILER",
      name: "Compiler",
      role: "Case-File Closer",
      purpose: "Packages verified objects into the case file.",
      family: "Synthesis",
      move: "export",
      directives: [
        "Ingest all Forms, Edges, Fits, Problems, and Traces.",
        "Compile final JSON/HTML presentation.",
        "Ensure every fact maps 1:1 with a verified evidence_id.",
        "Export Venture Diagnosis and Bear Case Diagnosis."
      ],
      output: "case_file: diagnosis, bear_case, evidence_register, edge_list, problem_ledger, trace."
    }
  ];
  function e(v){ return String(v ?? "").replace(/[&<>"']/g, (c) => ({"&":"&amp;","<":"&lt;",">":"&gt;","\\"":"&quot;","'":"&#39;"}[c])); }
  function initials(name){ return String(name || "P").split(/\\s+/).filter(Boolean).slice(0,2).map((x) => x[0]).join("").toUpperCase() || "P"; }
  function kind(row){ if(row.entity_type === "Person") return "people"; if(row.entity_type === "Venture") return "ventures"; if(row.entity_type === "Organization") return "orgs"; return "other"; }
  function status(row){ const n = Number(row.verified_link_count || 0); if(Number(row.gap_to_target || 0) > 7) return "thin"; if(n >= 5) return "verified"; if(n > 0) return "ambiguous"; return "thin"; }
  function level(row){ const n = Number(row.verified_link_count || 0); if(n >= 8) return "L4"; if(n >= 5) return "L3"; if(n >= 2) return "L2"; if(n >= 1) return "L1"; return "L0"; }
  function firstUrl(row){ return (row.verified_urls || []).find((url) => /^https?:/i.test(url)); }
  function hay(row){ return [row.entity,row.role,row.group_label,row.entity_type,row.coverage_status,row.gap_reason,row.source_context,JSON.stringify(row.verified_urls),JSON.stringify(row.evidence_rows)].join(" ").toLowerCase(); }
  function passes(row){
    const term = searchInput.value.trim().toLowerCase();
    if(term && !hay(row).includes(term)) return false;
    if(state.filter === "people" && kind(row) !== "people") return false;
    if(state.filter === "ventures" && kind(row) !== "ventures") return false;
    if(state.filter === "orgs" && kind(row) !== "orgs") return false;
    if(state.filter === "problems" && Number(row.gap_to_target || 0) <= 0) return false;
    return true;
  }
  function rows(){ return entities.filter(passes); }
  function count(filter){ return entities.filter((row) => filter === "all" || (filter === "problems" ? Number(row.gap_to_target || 0) > 0 : kind(row) === filter)).length; }
  function badge(row){
    const s = status(row);
    const cls = s === "verified" ? "verified" : s === "ambiguous" ? "ambiguous" : "problem";
    return '<span class="badge '+cls+'">'+e(s === "thin" ? "gap" : s)+'</span><span class="badge">'+level(row)+'</span>';
  }
  function dotScore(row){
    const n = Math.max(0, Math.min(5, Math.ceil(Number(row.verified_link_count || 0) / 2)));
    return '<span class="score-dots">'+Array.from({ length:5 }, (_, i) => i < n ? "●" : "○").join("")+'</span>';
  }
  function sourceLink(url, text){ return url ? '<a href="'+e(url)+'" target="_blank" rel="noreferrer">'+e(text || "Open")+'</a>' : '<button disabled type="button">Open</button>'; }
  function xml(v){ return String(v ?? "").replace(/[&<>"]/g, (c) => ({"&":"&amp;","<":"&lt;",">":"&gt;","\\"":"&quot;"}[c])); }
  function corePoml(){
    return '<system id="PROVIS_CORE">\\n  <philosophy>\\n    '+xml(systemCore.philosophy)+'\\n  </philosophy>\\n  <global_constraints>\\n'+systemCore.constraints.map((item) => '    <constraint id="'+xml(item[0])+'">'+xml(item[1])+'</constraint>').join("\\n")+'\\n  </global_constraints>\\n</system>';
  }
  function agentPoml(agent){
    return '<agent id="'+xml(agent.id)+'">\\n  <role>'+xml(agent.role)+'</role>\\n  <purpose>'+xml(agent.purpose)+'</purpose>\\n  <directives>\\n'+agent.directives.map((step) => '    <step>'+xml(step)+'</step>').join("\\n")+'\\n  </directives>\\n  <output_format>\\n    <format>'+xml(agent.output)+'</format>\\n  </output_format>\\n</agent>';
  }
  function agentById(id){ return agentData.find((agent) => agent.id === id) || agentData[0]; }
  function agentPill(agent){
    return '<button class="agent-pill" data-agent="'+e(agent.id)+'" type="button"><strong>'+e(agent.name)+'</strong><span>'+e(agent.role)+'</span><div class="badge-row"><span class="badge">'+e(agent.move)+'</span><span class="badge">'+e(agent.family)+'</span></div></button>';
  }
  function renderAgentCard(agent, expanded){
    return '<article class="agent-card" id="agent-'+e(agent.id)+'"><h3>'+e(agent.name)+'<span class="dot"></span></h3><p><strong>'+e(agent.role)+'</strong></p><p>'+e(agent.purpose)+'</p><div class="badge-row"><span class="badge">'+e(agent.family)+'</span><span class="badge">'+e(agent.move)+'</span><span class="badge">'+e(agent.id)+'</span></div><ul class="directive-list">'+agent.directives.map((step) => '<li>'+e(step)+'</li>').join("")+'</ul><div class="text-block"><h3>Output</h3><p>'+e(agent.output)+'</p></div>'+(expanded ? '<pre class="codebox">'+e(agentPoml(agent))+'</pre>' : '')+'<div class="prompt-actions"><button class="primary" data-copy-agent="'+e(agent.id)+'" type="button">Copy POML</button><button data-mode="thread" type="button">Dispatch</button></div></article>';
  }
  function copyText(text){
    if(navigator.clipboard && navigator.clipboard.writeText){ navigator.clipboard.writeText(text); return; }
    const scratch = document.createElement("textarea");
    scratch.value = text;
    scratch.setAttribute("readonly", "");
    scratch.style.position = "fixed";
    scratch.style.opacity = "0";
    document.body.appendChild(scratch);
    scratch.select();
    document.execCommand("copy");
    scratch.remove();
  }
  function pinnedPanel(row, context){
    const url = firstUrl(row);
    return '<section class="pinned-panel"><div class="pin-label"><span>Selected entity'+(context ? " / "+e(context) : "")+'</span><span class="badge">204</span></div><div class="pinned-core"><div class="avatar large group-'+e(row.group)+'">'+e(initials(row.entity))+'</div><div><h1>'+e(row.entity)+'</h1><p>'+e(row.role || row.entity_type)+' · '+e(row.group_label)+'</p><div class="badge-row">'+badge(row)+'</div></div>'+sourceLink(url,"Open")+'</div><div class="signal-row"><div><span>State</span><strong>'+e(row.state || "active")+'</strong></div><div><span>Evidence level</span><strong>'+dotScore(row)+' '+level(row)+'</strong></div><div><span>Last seen</span><strong>'+e(row.evidence_count || row.verified_link_count || 0)+' traces</strong></div></div></section>';
  }
  function mini(row, moreText){
    if(moreText) return '<button class="mini-card plus-card" data-group="'+e(row)+'" type="button"><strong>'+e(moreText)+'</strong></button>';
    const i = entities.indexOf(row);
    return '<button class="mini-card" data-select="'+i+'" type="button"><div class="avatar small group-'+e(row.group)+'">'+e(initials(row.entity))+'</div><div><h3>'+e(row.entity)+'</h3><p>'+e(row.role || row.entity_type)+'</p></div><div class="badge-row">'+badge(row)+'</div></button>';
  }
  function selectedRow(){ return entities[state.selected] || entities[0]; }
  function relatedRows(row){
    const urls = new Set((row.verified_urls || []).filter(Boolean));
    const shared = entities.filter((other) => other !== row && (other.verified_urls || []).some((url) => urls.has(url)));
    const sameGroup = entities.filter((other) => other !== row && other.group === row.group);
    const sameType = entities.filter((other) => other !== row && other.entity_type === row.entity_type);
    return [...shared, ...sameGroup, ...sameType].filter((item, index, self) => self.indexOf(item) === index);
  }
  function problemRows(scope){
    const pool = scope ? [scope] : entities;
    return pool.filter((row) => Number(row.gap_to_target || 0) > 0).sort((a,b) => Number(b.gap_to_target || 0) - Number(a.gap_to_target || 0));
  }
  function evidenceRows(row){
    return (row.evidence_rows || []).slice().sort((a,b) => String(a.evidence_type || "").localeCompare(String(b.evidence_type || "")));
  }
  function evidenceTotal(){ return entities.reduce((sum, row) => sum + Number(row.evidence_count || 0), 0); }
  function sourceKinds(row){
    const text = [JSON.stringify(row.verified_urls || []), JSON.stringify(row.evidence_rows || []), row.source_type, row.source_title].join(" ").toLowerCase();
    return {
      official: /official|website|homepage|team|about|company/.test(text),
      founder: /founder|linkedin|profile|bio|people|person/.test(text),
      independent: /press|news|article|podcast|interview|forbes|techcrunch|medium|substack/.test(text),
      product: /github|demo|product|docs|app|repository|artifact/.test(text),
      customer: /customer|case|testimonial|review|partner/.test(text),
      filing: /filing|sec|court|patent|registry|incorporation|nonprofit/.test(text),
      privacy: /privacy|security|legal|terms|compliance/.test(text),
      program: /emory|goizueta|hatchery|accelerator|program|cohort|award|university/.test(text)
    };
  }
  function markFor(row, key){
    const kinds = sourceKinds(row);
    if(kinds[key]) return "found";
    if(Number(row.verified_link_count || 0) > 0 && ["official","founder","program"].includes(key)) return "weak";
    if(Number(row.gap_to_target || 0) > 8 && ["customer","privacy"].includes(key)) return "contradicted";
    return "missing";
  }
  function renderSourceGapMatrix(scopeRows){
    const layers = [["official","Official"],["founder","Founder"],["independent","Independent"],["product","Product"],["customer","Customer"],["filing","Filing"],["privacy","Privacy"],["program","Program"]];
    const rows = scopeRows.slice(0,6);
    return '<section class="section"><div class="section-head"><h2>Source gap matrix</h2><span class="badge">found / weak / missing</span></div><div class="gap-scroll"><div class="gap-matrix"><div class="gap-cell head">Entity / Problem</div>'+layers.map((layer) => '<div class="gap-cell head">'+e(layer[1])+'</div>').join("")+rows.map((row) => '<div class="gap-cell entity">'+e(row.entity)+'<br><span>'+e(row.gap_reason || row.problem)+'</span></div>'+layers.map((layer) => { const m = markFor(row, layer[0]); return '<div class="gap-cell"><span class="mark '+m+'">'+(m==="found"?"●":m==="weak"?"◐":m==="contradicted"?"×":"○")+'</span></div>'; }).join("")).join("")+'</div></div></section>';
  }
  function renderQuickcheck(row){
    const checks = [
      ["Identity Evidence", row.verified_link_count >= 2, "Founder or entity identity has >=2 public traces."],
      ["Source Independence", row.verified_link_count >= 5, "Evidence from multiple source types."],
      ["Does Not Establish", Boolean(row.gap_reason), "Limits are visible."],
      ["Private Boundary", true, "No private data collected."],
      ["Export Readiness", Number(row.gap_to_target || 0) === 0, "Open source gaps resolved."]
    ];
    const passCount = checks.filter((item) => item[1]).length;
    return '<section class="section"><div class="section-head"><h2>Quickcheck gate</h2><span class="badge '+(passCount===checks.length?"verified":"ambiguous")+'">'+passCount+'/'+checks.length+'</span></div><div class="gate-card">'+checks.map((check) => '<div class="gate-row"><div><strong>'+e(check[0])+'</strong><p>'+e(check[2])+'</p><div class="bar"><span style="width:'+(check[1] ? 100 : 45)+'%"></span></div></div><span class="badge '+(check[1] ? "verified" : "problem")+'">'+(check[1] ? "pass" : "partial")+'</span></div>').join("")+'</div></section>';
  }
  function renderTrace(row){
    const evs = evidenceRows(row).slice(0,3);
    const events = [
      ["Captured", row.source_type || "Source captured", row.trace || "CASEDEX entity"],
      ["Parsed", evs[0]?.source_title || row.source_title || "Text extracted", "Claim candidates created"],
      ["Evidence Bound", level(row)+" assigned", row.coverage_status || "Evidence level estimated"],
      [Number(row.gap_to_target || 0) > 0 ? "Probe Launched" : "Approved", row.probe, row.gap_reason || "No source-gap problem"]
    ];
    return '<section class="section"><div class="section-head"><h2>Provenance / trace</h2><button data-mode="move" type="button">Export</button></div><div class="trace-list">'+events.map((item,index) => '<div class="trace-item"><div class="trace-dot">'+(index+1)+'</div><div><strong>'+e(item[0])+'</strong><p>'+e(item[1])+'</p></div><span class="badge">'+e(item[2]).slice(0,18)+'</span></div>').join("")+'</div></section>';
  }
  function setMode(mode){ state.mode = mode; if(mode !== "entity") state.focusedGroup = ""; render(); window.scrollTo({ top:0, behavior:"smooth" }); }
  function select(index, mode){ state.selected = index; if(mode) state.mode = mode; render(); window.scrollTo({ top:0, behavior:"smooth" }); }
  function updateChrome(){
    const row = selectedRow();
    const titles = { library:"204 entities", map:"Topology", thread:"Mission thread", evidence:"Evidence", move:"Move", stack:"Stack", entity:row.entity, problems:"Open problems", agents:"Agents" };
    modeTitle.textContent = titles[state.mode] || "PROVIS";
    document.querySelectorAll("[data-mode]").forEach((button) => button.classList.toggle("active", button.dataset.mode === state.mode));
    document.querySelectorAll("[data-filter]").forEach((button) => button.classList.toggle("active", button.dataset.filter === state.filter));
    selectedDock.classList.toggle("hidden", state.mode !== "library");
    selectedDock.innerHTML = '<div class="avatar small group-'+e(row.group)+'">'+e(initials(row.entity))+'</div><div class="dock-title"><strong>'+e(row.entity)+'</strong><span>'+e(row.role || row.entity_type)+' · '+e(row.group_label)+'</span></div><div class="badge-row">'+badge(row)+'</div>';
  }
  function renderLibrary(){
    const visible = rows();
    const filters = '<div class="category-row"><button class="'+(state.filter==="all"?"active":"")+'" data-filter="all">All '+count("all")+'</button><button class="'+(state.filter==="people"?"active":"")+'" data-filter="people">People '+count("people")+'</button><button class="'+(state.filter==="ventures"?"active":"")+'" data-filter="ventures">Ventures '+count("ventures")+'</button><button class="'+(state.filter==="orgs"?"active":"")+'" data-filter="orgs">Orgs '+count("orgs")+'</button><button class="'+(state.filter==="problems"?"active":"")+'" data-filter="problems">Problems '+count("problems")+'</button></div>';
    if(state.focusedGroup){
      const groupRows = visible.filter((row) => row.group === state.focusedGroup);
      appView.innerHTML = '<section class="section"><div class="section-head"><h2>'+e(groupLabels[state.focusedGroup])+' '+groupRows.length+'</h2><button data-back-library type="button">Back</button></div><div class="grid-cards">'+groupRows.map((row) => mini(row)).join("")+'</div></section>';
      return;
    }
    const recent = entities.slice(Math.max(0, state.selected - 2), state.selected + 3);
    appView.innerHTML = filters+'<div class="field-metrics"><div class="metric-card"><strong>'+entities.length+'</strong><span>Total entities</span></div><div class="metric-card"><strong>'+problemRows().length+'</strong><span>Open problems</span></div><div class="metric-card"><strong>'+evidenceTotal()+'</strong><span>Evidence rows</span></div></div><button class="capture-button" data-mode="evidence" type="button">Scan / Capture Source</button><section class="section"><div class="section-head"><h2>Recently viewed</h2><button data-mode="stack" type="button">Stack</button></div>'+recent.map((row) => '<button class="list-row" data-select="'+entities.indexOf(row)+'" type="button"><div class="avatar small group-'+e(row.group)+'">'+e(initials(row.entity))+'</div><div><strong>'+e(row.entity)+'</strong><span>'+e(row.role || row.entity_type)+'</span></div><span>'+level(row)+'</span></button>').join("")+'</section>'+groups.map((group) => {
      const subset = visible.filter((row) => row.group === group.key);
      if(!subset.length) return "";
      const shown = subset.slice(0,4);
      return '<section class="section"><div class="section-head"><h2>'+e(group.label)+' '+subset.length+'</h2><button data-group="'+e(group.key)+'" type="button">See all</button></div><div class="mini-strip">'+shown.map((row) => mini(row)).join("")+(subset.length > shown.length ? mini(group.key, "+"+(subset.length - shown.length)) : "")+'</div></section>';
    }).join("");
  }
  function entityHeader(row){
    const url = firstUrl(row);
    const tabs = [["overview","Overview"],["links","Links "+relatedRows(row).length],["evidence","Evidence "+evidenceRows(row).length],["problems","Problems "+problemRows(row).length],["map","Map"]];
    return '<div class="entity-sticky"><div class="identity-bar"><div class="avatar large group-'+e(row.group)+'">'+e(initials(row.entity))+'</div><div><h1>'+e(row.entity)+'</h1><p>'+e(row.role || row.entity_type)+' · '+e(row.group_label)+'</p><div class="badge-row">'+badge(row)+'</div></div><div class="identity-tools">'+sourceLink(url,"↗")+'<button data-mode="stack" type="button">▱</button></div></div><div class="entity-tabs">'+tabs.map((tab) => '<button data-tab="'+tab[0]+'" class="'+(state.tab===tab[0]?"active":"")+'" type="button">'+e(tab[1])+'</button>').join("")+'</div></div>';
  }
  function renderEntity(){
    const row = selectedRow();
    let body = "";
    if(state.tab === "overview"){
      const rel = relatedRows(row).slice(0,4);
      body = '<div class="desktop-split"><section class="entity-card"><dl class="fact-table"><dt>Role</dt><dd>'+e(row.role || row.entity_type)+'</dd><dt>Type</dt><dd>'+e(row.entity_type)+'</dd><dt>State</dt><dd>'+e(row.state)+'</dd><dt>Evidence</dt><dd>'+e(row.verified_link_count)+' / '+e(row.target_links)+' · '+level(row)+'</dd><dt>Supports</dt><dd><div class="chip-list">'+rel.slice(0,3).map((item) => '<span class="badge">'+e(item.entity)+'</span>').join("")+(rel.length ? '<span class="badge">+'+Math.max(0, relatedRows(row).length - 3)+'</span>' : '<span class="badge">none linked</span>')+'</div></dd></dl><div class="text-block"><h3>Summary</h3><p>'+e(row.source_context || row.coverage_status || "Public-source entity in the PROVIS casedex.")+'</p></div><div class="text-block"><h3>Does not establish</h3><p>'+e(row.gap_reason || "Attached sources do not establish control, revenue, adoption, or current operating status unless explicitly stated.")+'</p></div><div class="text-block"><h3>Next move</h3><p>'+e(row.probe)+'</p></div><div class="action-row"><button data-tab="evidence" type="button">Evidence</button><button data-tab="links" type="button">Links</button><button data-tab="problems" type="button">Problems</button></div></section><section>'+renderEvidenceList(row, 4)+'</section></div>';
    }
    if(state.tab === "links"){
      const rel = relatedRows(row);
      body = '<div class="toolbar-row"><button class="active" type="button">All '+rel.length+'</button><button type="button">Supports '+Math.min(5,rel.length)+'</button><button type="button">Affiliates</button><button type="button">Other</button></div><div class="stack-wrap"><div class="stack-stage"><div class="stack-face">'+rel.slice(0,4).map((item) => '<button class="list-row" data-select="'+entities.indexOf(item)+'" type="button"><div class="avatar small group-'+e(item.group)+'">'+e(initials(item.entity))+'</div><div><strong>'+e(item.entity)+'</strong><span>'+e(item.role || item.entity_type)+'</span></div><div class="badge-row">'+badge(item)+'</div></button>').join("")+'</div><div class="stack-count">1 of '+rel.length+'</div><div class="action-row"><button data-tab="overview" type="button">Details</button><button data-tab="evidence" type="button">Evidence</button><button data-tab="map" type="button">Map</button></div></div></div>';
    }
    if(state.tab === "evidence") body = renderEvidenceList(row, 999, true);
    if(state.tab === "problems") body = renderProblemList(problemRows(row), true);
    if(state.tab === "map") body = renderMap(row);
    appView.innerHTML = entityHeader(row) + body;
  }
  function renderEvidenceList(row, limit, full){
    const evs = evidenceRows(row).slice(0, limit);
    if(!evs.length) return '<section class="entity-card"><div class="empty">No evidence rows attached to this entity yet.</div></section>';
    const filters = full ? '<div class="toolbar-row"><button class="active" type="button">All '+evidenceRows(row).length+'</button><button type="button">Docs</button><button type="button">Profiles</button><button type="button">Links</button><button type="button">Notes</button></div>' : "";
    return '<section>'+filters+evs.map((ev) => '<div class="list-row"><div class="avatar small">'+e((ev.evidence_type || "S").slice(0,2).toUpperCase())+'</div><div><strong>'+e(ev.source_title || ev.url || "Evidence")+'</strong><span>'+e(ev.evidence_type || "source")+' · '+e(ev.confidence || "")+'</span><p>'+e(ev.extracted_facts || ev.url || "")+'</p></div><div>'+sourceLink(ev.url,"↗")+'</div></div>').join("")+(full ? '<div class="action-row"><button type="button">Add Evidence</button><button type="button">New Note</button><button type="button">Request Doc</button></div>' : "")+'</section>';
  }
  function renderProblemList(list, selectedOnly){
    if(!list.length) return '<section class="entity-card"><div class="empty">No unresolved source-gap problem for this scope.</div></section>';
    return '<section><div class="section-head"><h2>'+e(selectedOnly ? "Unresolved problems" : "All unresolved problems")+' '+list.length+'</h2></div>'+list.map((row) => '<button class="problem-card" data-select="'+entities.indexOf(row)+'" type="button"><div class="warn">!</div><div><strong>'+e(row.gap_reason || row.problem || "Source gap")+'</strong><p>'+e(row.entity)+' · '+e(row.probe)+'</p><div class="badge-row"><span class="badge problem">gap '+e(row.gap_to_target)+'</span><span class="badge">'+level(row)+'</span></div></div><span>›</span></button>').join("")+(selectedOnly ? '<div class="action-row"><button type="button">Log Problem</button><button type="button">Add Probe</button><button type="button">Reassess</button></div>' : "")+'</section>';
  }
  function packetCard(row, ev, index){
    const title = ev?.source_title || ev?.url || row.source_title || "Evidence packet";
    const source = ev?.evidence_type || row.source_type || "public source";
    const confidence = ev?.confidence || row.confidence || level(row);
    const supports = ev?.extracted_facts || row.source_context || row.coverage_status || "Public source attached to this entity.";
    const limit = row.gap_reason || "Does not establish control, revenue, adoption, current role, or technical validity unless the source explicitly says so.";
    return '<article class="packet-card"><div class="packet-head"><div class="avatar small">'+e(source.slice(0,2).toUpperCase())+'</div><div><strong>'+e(title)+'</strong><span>'+e(source)+' · '+e(confidence)+'</span></div><span class="badge">'+e(ev?.evidence_id || "E-"+String(index+1).padStart(3,"0"))+'</span></div><div class="packet-body"><div><h3>Supports</h3><p>'+e(supports)+'</p></div><div><h3>Does not establish</h3><p>'+e(limit)+'</p></div></div><div class="packet-foot"><span>Trace: '+e(row.trace || "captured")+'</span>'+sourceLink(ev?.url || firstUrl(row), "Source")+'</div></article>';
  }
  function renderEvidenceSurface(){
    const row = selectedRow();
    const evs = evidenceRows(row);
    appView.innerHTML = pinnedPanel(row, "Evidence")+'<div class="command-row"><button class="primary" type="button">Verify</button><button type="button">Reject</button><button type="button">Probe</button><button data-tab="problems" type="button">Problems</button><button data-mode="thread" type="button">Thread</button></div><section class="section"><div class="section-head"><h2>Evidence packets '+evs.length+'</h2><button data-tab="evidence" type="button">Entity tab</button></div>'+(evs.length ? evs.slice(0,12).map((ev,index) => packetCard(row, ev, index)).join("") : packetCard(row, null, 0))+'</section>'+renderTrace(row)+renderProblemList(problemRows(row), true);
  }
  function renderThreadSurface(){
    const row = selectedRow();
    const rel = relatedRows(row).slice(0,3);
    const threadAgents = ["SCOUT","GUARD","BINDER","LINKER","CRITIC","COMPILER"].map(agentById);
    const messages = [
      ["You", "Scout, verify "+row.entity+" from public destination sources."],
      ["Scout", "Found "+row.verified_link_count+" sources. Evidence level "+level(row)+". Gap remains "+row.gap_to_target+"."],
      ["Binder", "Packet created. Supports: "+(row.source_context || row.coverage_status)+" Does not establish: "+(row.gap_reason || "unverified downstream claims")+"."],
      ["Linker", "Related entities staged: "+rel.map((item) => item.entity).join(", ")+"."],
      ["Critic", problemRows(row).length ? "Open problem: "+(row.gap_reason || row.problem)+"." : "No unresolved source-gap problem in selected scope."],
      ["Guard", "Boundary clear: no private data, no raw search URL, no name-similarity edge."]
    ];
    appView.innerHTML = pinnedPanel(row, "Thread")+'<section class="section"><div class="section-head"><h2>Mission thread</h2><button data-mode="agents" type="button">Prompt system</button></div><div class="agent-strip">'+threadAgents.map(agentPill).join("")+'</div><div class="toolbar-row"><button class="active" type="button">All</button><button type="button">Scout</button><button type="button">Binder</button><button type="button">Critic</button><button type="button">Guard</button></div>'+messages.map((item,index) => '<article class="thread-card"><div class="avatar small">'+e(item[0].slice(0,2).toUpperCase())+'</div><div><h3>'+e(item[0])+' · Packet '+String(index+1).padStart(2,"0")+'</h3><p>'+e(item[1])+'</p><div class="badge-row"><span class="badge">'+level(row)+'</span><span class="badge">trace</span><span class="badge">FIELD · FORM · FIT · TRACE</span></div></div></article>').join("")+'<div class="composer"><input placeholder="Message agents..." /><button type="button">›</button></div><div class="command-row"><button class="primary" type="button">Verify</button><button type="button">Probe</button><button type="button">Link</button><button type="button">Reject</button><button data-mode="move" type="button">Export</button></div></section>';
  }
  function renderProblemSurface(){
    const row = selectedRow();
    const open = problemRows();
    const scoped = [row].concat(open.filter((item) => item !== row).slice(0,5));
    const first = open[0] || row;
    appView.innerHTML = pinnedPanel(row, "Problem spine")+'<div class="desktop-split"><section>'+renderProblemList(open.slice(0,8), false)+'<button class="capture-button" type="button">+ Create Problem</button></section><section>'+renderSourceGapMatrix(scoped)+renderQuickcheck(first)+'</section></div><section class="section"><div class="section-head"><h2>Next best probe</h2><span class="badge problem">high impact</span></div><article class="entity-card"><div class="text-block"><h3>'+e(first.entity)+'</h3><p>'+e(first.probe || "Find a public destination source that closes the strongest missing evidence layer.")+'</p></div><div class="action-row"><button class="primary" type="button">Launch Probe</button><button data-mode="thread" type="button">Assign Agent</button><button data-mode="evidence" type="button">Evidence</button></div></article></section><section class="section"><div class="section-head"><h2>Compare evidence</h2><button data-mode="move" type="button">Open compare</button></div><div class="packet-card"><div class="packet-body"><div><h3>Source A</h3><p>'+e(row.source_title || row.source_url || "Selected source")+'</p></div><div><h3>Source B</h3><p>'+e(first.source_title || first.source_url || "Highest gap source")+'</p></div></div><div class="packet-foot"><span>Similarity: '+Math.max(12, 100 - Number(first.gap_to_target || 0) * 8)+'%</span><span>Conflicts: '+(Number(first.gap_to_target || 0) > 6 ? "possible" : "none flagged")+'</span></div></div></section>';
  }
  function renderMap(row){
    const rel = relatedRows(row).slice(0,6);
    const pos = [[50,8],[75,26],[75,66],[50,78],[17,66],[17,26]];
    const lines = pos.slice(0,rel.length).map((p) => '<line x1="50%" y1="50%" x2="'+p[0]+'%" y2="'+p[1]+'%" stroke="#b9b4aa" stroke-width="1"/>').join("");
    return '<section><div class="map-card"><svg>'+lines+'</svg><button class="map-node center" style="left:50%;top:50%;transform:translate(-50%,-50%)" type="button"><b>'+e(initials(row.entity))+'</b><span>'+e(row.entity)+'</span></button>'+rel.map((item,i) => '<button class="map-node" data-select="'+entities.indexOf(item)+'" style="left:'+pos[i][0]+'%;top:'+pos[i][1]+'%;transform:translate(-50%,-50%)" type="button"><b>'+e(initials(item.entity))+'</b><span>'+e(item.entity)+'</span></button>').join("")+'</div><div class="action-row"><button type="button">Fit</button><button type="button">Expand</button><button type="button">Focus</button></div></section>';
  }
  function renderMapSurface(){
    const row = selectedRow();
    appView.innerHTML = pinnedPanel(row, "Topology")+renderMap(row)+'<section class="section"><div class="section-head"><h2>Direct links</h2><button data-tab="links" type="button">List</button></div>'+relatedRows(row).slice(0,5).map((item) => '<button class="list-row" data-select="'+entities.indexOf(item)+'" type="button"><div class="avatar small group-'+e(item.group)+'">'+e(initials(item.entity))+'</div><div><strong>'+e(item.entity)+'</strong><span>'+e(item.role || item.entity_type)+'</span></div><span>'+level(item)+'</span></button>').join("")+'</section>';
  }
  function renderMoveSurface(){
    const row = selectedRow();
    const rel = relatedRows(row).slice(0,2);
    const compare = [row].concat(rel);
    const exportReady = Number(row.gap_to_target || 0) === 0;
    appView.innerHTML = pinnedPanel(row, "Control surface")+'<section class="section"><div class="section-head"><h2>Compare / handoff</h2><button data-mode="thread" type="button">Thread</button></div><div class="compare-strip">'+compare.map((item) => '<article class="compare-card '+(item===row ? "selected" : "")+'"><div class="avatar group-'+e(item.group)+'">'+e(initials(item.entity))+'</div><h3>'+e(item.entity)+'</h3><p>'+e(item.role || item.entity_type)+'</p><div class="badge-row">'+badge(item)+'</div></article>').join("")+'</div></section><section class="section"><div class="section-head"><h2>Relationship edge detail</h2><button data-mode="map" type="button">Graph</button></div><article class="entity-card"><dl class="fact-table"><dt>Subject</dt><dd>'+e(row.entity)+'</dd><dt>Predicate</dt><dd>related_to</dd><dt>Object</dt><dd>'+e(rel[0]?.entity || "No linked entity")+'</dd><dt>Supports</dt><dd>'+e(row.source_context || row.coverage_status)+'</dd><dt>Does not establish</dt><dd>'+e(row.gap_reason || "Control, equity, revenue, or product validity.")+'</dd></dl><div class="action-row"><button class="primary" type="button">Approve</button><button type="button">Reject</button><button type="button">Escalate</button></div></article></section><section class="section"><div class="section-head"><h2>Legal moves</h2><span class="badge">no private data</span></div><div class="move-grid">'+[
      ["Verify", "Raise or freeze state only when evidence supports the claim."],
      ["Probe", "Create the next public-source hunt without treating search as evidence."],
      ["Bind", "Attach source, support, limit, confidence, and trace."],
      ["Reject", "Route weak, private, padded, or unsupported material out of the case."],
      ["Fork", "Preserve ambiguity instead of forcing a false identity match."],
      ["Export", "Compile the case file with claims, gaps, links, and provenance."]
    ].map((move,index) => '<article class="move-card"><h3>'+e(move[0])+'</h3><p>'+e(move[1])+'</p><span class="badge">'+(index+1)+'</span></article>').join("")+'</div></section><section class="section"><div class="section-head"><h2>POML agent prompts</h2><button data-mode="agents" type="button">Open system</button></div><article class="core-card"><div><h3>'+e(systemCore.id)+'</h3><p>'+e(systemCore.philosophy)+'</p></div><button data-copy-core type="button">Copy Core</button></article><div class="agent-strip">'+agentData.map(agentPill).join("")+'</div></section><section class="section"><div class="section-head"><h2>Case file export</h2><span class="badge '+(exportReady ? "verified" : "problem")+'">'+(exportReady ? "ready" : "blocked")+'</span></div><div class="export-grid">'+[
      ["Case File", "Complete case bundle", "ZIP"],
      ["Source Register", "All public sources", "XLSX"],
      ["Relationship Edges", "Edges and attributes", "CSV"],
      ["Problem Ledger", "Problems and decisions", "XLSX"],
      ["Probe Log", "Probes and results", "CSV"],
      ["Quickcheck Audit", "Gate results", "PDF"]
    ].map((item) => '<article class="export-card"><strong>'+e(item[0])+'</strong><span>'+e(item[1])+'</span><button type="button">'+e(item[2])+'</button></article>').join("")+'</div></section><section class="section"><div class="section-head"><h2>Control surface</h2><span class="badge">gestures</span></div><div class="gesture-grid">'+[
      ["Tap card", "Open details"],
      ["Long press", "Quick actions"],
      ["Swipe left", "Next entity"],
      ["Swipe right", "Previous entity"],
      ["Pull down", "Search"],
      ["Double tap", "Add note"]
    ].map((item) => '<div class="gesture"><strong>'+e(item[0])+'</strong><span>'+e(item[1])+'</span></div>').join("")+'</div></section>';
  }
  function renderStack(){
    const pool = rows();
    if(state.stackIndex >= pool.length) state.stackIndex = 0;
    const row = pool[state.stackIndex] || selectedRow();
    state.selected = entities.indexOf(row);
    updateChrome();
    appView.innerHTML = '<div class="stack-wrap"><div class="stack-stage"><div class="stack-face">'+entityHeader(row)+'<section class="entity-card"><div class="text-block"><h3>Summary</h3><p>'+e(row.source_context || row.coverage_status)+'</p></div><div class="text-block"><h3>Does not establish</h3><p>'+e(row.gap_reason || "No additional limits recorded.")+'</p></div><div class="text-block"><h3>Next move</h3><p>'+e(row.probe)+'</p></div></section></div><div class="stack-count">'+(state.stackIndex + 1)+' of '+pool.length+'</div><div class="stack-controls"><button data-stack="prev" type="button">Previous</button><button data-open-selected type="button">Open</button><button data-stack="next" type="button">Next</button></div></div></div>';
  }
  function renderMission(){
    const row = selectedRow();
    const rel = relatedRows(row).slice(0,3);
    appView.innerHTML = '<section class="section"><div class="section-head"><h2>Mission: '+e(row.entity)+'</h2><span class="badge verified">live</span></div><div class="mini-strip">'+[row].concat(rel).map((item) => mini(item)).join("")+'</div></section>'+[
      ["Scout", "Captured "+e(row.verified_link_count)+" public destination links. Source gap: "+e(row.gap_to_target)+"."],
      ["Linker", "Linked "+e(rel.length)+" nearby entities. Edges remain source-bound and inspectable."],
      ["Binder", "Evidence level is "+level(row)+". Does-not-establish field is preserved."],
      ["Critic", e(row.gap_reason || "No unresolved critique beyond current source gap.")],
      ["Guard", "Private-data boundary checked. No private data collected."]
    ].map((item) => '<article class="thread-card"><div class="avatar small">'+e(item[0].slice(0,2).toUpperCase())+'</div><div><h3>'+e(item[0])+'</h3><p>'+item[1]+'</p></div></article>').join("");
  }
  function renderAgents(){
    const gathering = agentData.filter((agent) => agent.family === "Gathering");
    const critique = agentData.filter((agent) => agent.family === "Critique");
    const synthesis = agentData.filter((agent) => agent.family === "Synthesis");
    appView.innerHTML = '<section class="section"><div class="section-head"><h2>POML prompt system</h2><button data-mode="thread" type="button">Thread</button></div><article class="core-card"><div><h3>'+e(systemCore.id)+'</h3><p>'+e(systemCore.philosophy)+'</p><ol class="constraint-list">'+systemCore.constraints.map((item) => '<li><strong>'+e(item[0])+'</strong> '+e(item[1])+'</li>').join("")+'</ol></div><button data-copy-core type="button">Copy Core</button></article><pre class="codebox">'+e(corePoml())+'</pre></section><section class="section"><div class="section-head"><h2>Gathering & verification</h2><span class="badge">'+gathering.length+'</span></div><div class="agent-grid">'+gathering.map((agent) => renderAgentCard(agent, true)).join("")+'</div></section><section class="section"><div class="section-head"><h2>Critique & analysis</h2><span class="badge">'+critique.length+'</span></div><div class="agent-grid">'+critique.map((agent) => renderAgentCard(agent, true)).join("")+'</div></section><section class="section"><div class="section-head"><h2>Synthesis & handoff</h2><span class="badge">'+synthesis.length+'</span></div><div class="agent-grid">'+synthesis.map((agent) => renderAgentCard(agent, true)).join("")+'</div></section><section class="entity-card"><div class="text-block"><h3>Legal moves</h3><p>Dispatch, inspect, capture, bind, verify, reject, probe, fork, merge, export. No raw search URL, no private data, no name-similarity edge.</p></div></section>';
  }
  function animateView(){
    appView.classList.remove("view-enter");
    void appView.offsetWidth;
    appView.classList.add("view-enter");
  }
  function render(){
    updateChrome();
    if(state.mode === "library") renderLibrary();
    if(state.mode === "entity") renderEntity();
    if(state.mode === "stack") renderStack();
    if(state.mode === "map") renderMapSurface();
    if(state.mode === "thread") renderThreadSurface();
    if(state.mode === "evidence") renderEvidenceSurface();
    if(state.mode === "move") renderMoveSurface();
    if(state.mode === "problems") renderProblemSurface();
    if(state.mode === "mission") renderMission();
    if(state.mode === "agents") renderAgents();
    animateView();
  }
  document.addEventListener("click", (event) => {
    const copyCore = event.target.closest("[data-copy-core]");
    if(copyCore){ copyText(corePoml()); return; }
    const copyAgent = event.target.closest("[data-copy-agent]");
    if(copyAgent){ copyText(agentPoml(agentById(copyAgent.dataset.copyAgent))); return; }
    const agentButton = event.target.closest("[data-agent]");
    if(agentButton){
      const agentId = agentButton.dataset.agent;
      state.mode = "agents";
      render();
      setTimeout(() => {
        const target = document.getElementById("agent-"+agentId);
        if(target) target.scrollIntoView({ behavior:"smooth", block:"start" });
      }, 20);
      return;
    }
    const mode = event.target.closest("[data-mode]");
    if(mode){ setMode(mode.dataset.mode); return; }
    const selectButton = event.target.closest("[data-select]");
    if(selectButton){ select(Number(selectButton.dataset.select), "entity"); return; }
    const filterButton = event.target.closest("[data-filter]");
    if(filterButton){ state.filter = filterButton.dataset.filter; state.focusedGroup = ""; state.mode = "library"; render(); return; }
    const groupButton = event.target.closest("[data-group]");
    if(groupButton){ state.focusedGroup = groupButton.dataset.group; state.mode = "library"; render(); return; }
    if(event.target.closest("[data-back-library]")){ state.focusedGroup = ""; render(); return; }
    const tab = event.target.closest("[data-tab]");
    if(tab){ state.tab = tab.dataset.tab; state.mode = "entity"; render(); return; }
    const stack = event.target.closest("[data-stack]");
    if(stack){ const pool = rows(); state.stackIndex = stack.dataset.stack === "next" ? (state.stackIndex + 1) % pool.length : (state.stackIndex - 1 + pool.length) % pool.length; state.mode = "stack"; render(); return; }
    if(event.target.closest("[data-open-selected]") || event.target.closest("#selectedDock")){ state.mode = "entity"; render(); window.scrollTo({ top:0, behavior:"smooth" }); return; }
  });
  searchToggle.addEventListener("click", () => { searchPanel.classList.toggle("open"); if(searchPanel.classList.contains("open")) searchInput.focus(); });
  searchInput.addEventListener("input", () => { state.mode = "library"; state.focusedGroup = ""; render(); });
  render();
</script>`);

const deckpressHtml = htmlDoc("DECKPRESS", `${nav("DECKPRESS")}
<main>
  <section class="panel screen-panel">
    <div class="head"><span>DECKPRESS</span><span>mobile / print fronts / print backs</span></div>
    <div class="body">
      <div class="deck-tools">
        <button data-view="casedex">204 Casedex</button>
        <button data-view="mobile">Mobile</button>
        <button data-view="fronts">Print Fronts</button>
        <button data-view="backs">Print Backs</button>
        <button data-view="casecards">204 Cards</button>
        <button data-view="casebacks">204 Backs</button>
        <button data-view="forge">Infinite Forge</button>
        <button data-view="checklist">Checklist</button>
        <button id="copyJson">Copy JSON</button>
        <button id="copyCsv">Copy CSV</button>
        <button id="copyEntities">Copy 204</button>
      </div>
    </div>
  </section>
  <section id="mount"></section>
</main>`, `
  .deck-tools { display:flex; gap:6px; flex-wrap:wrap; }
  .deck-tools button { min-height:38px; padding:7px; font-weight:900; text-transform:uppercase; }
  .mobile-card { border:2px solid #000; padding:14px; min-height:320px; display:grid; grid-template-rows:auto 1fr auto; }
  .grammar { display:grid; grid-template-columns: .72in 1fr; gap:.04in .08in; margin-top:.08in; }
  .grammar dt { font-weight:900; text-transform:uppercase; }
  .grammar dd { margin:0; overflow-wrap:anywhere; }
  .print-page { width:8.5in; height:11in; page-break-after:always; display:grid; grid-template-columns:2.5in 2.5in; grid-template-rows:3.5in 3.5in; gap:.25in; align-content:center; justify-content:center; margin:0 auto .25in; }
  .print-card { width:2.5in; height:3.5in; border:1px dashed #000; padding:.125in; overflow:hidden; display:grid; grid-template-rows:auto 1fr auto; }
  .print-card h2 { font-size:18px; }
  .print-card p { font-size:11px; }
  .print-card .grammar { font-size:7.5px; line-height:1.08; grid-template-columns:.42in 1fr; }
  .forge-card { border:2px solid #000; padding:12px; margin-top:8px; }
  .case-search { width:100%; min-height:40px; padding:7px; margin-bottom:8px; }
  .case-list { display:grid; gap:4px; max-height:70vh; overflow:auto; }
  .case-item { border:1px solid #000; padding:7px; }
  .case-item summary { cursor:pointer; font-weight:900; display:grid; grid-template-columns: 1fr 92px 72px 72px; gap:6px; align-items:start; }
  .case-body { display:grid; grid-template-columns: 1fr 1fr; gap:8px; margin-top:8px; }
  .case-links { display:grid; gap:4px; }
  .case-links a { border:1px solid #000; padding:5px; display:block; }
  @media (max-width:760px) { .case-item summary { grid-template-columns:1fr 68px 54px; } .case-item summary .wide { display:none; } .case-body { grid-template-columns:1fr; } }
  @media print {
    .top, .screen-panel { display:none; }
    main { padding:0; width:auto; }
    .print-page { margin:0; }
  }
`, `
<script id="deck-data" type="application/json">${safeJson(cards)}</script>
<script id="entity-data" type="application/json">${safeJson(entityRows)}</script>
<script id="case-card-data" type="application/json">${safeJson(caseCards)}</script>
<script>
  const cards = JSON.parse(document.getElementById("deck-data").textContent);
  const entities = JSON.parse(document.getElementById("entity-data").textContent);
  const caseCards = JSON.parse(document.getElementById("case-card-data").textContent);
  const mount = document.getElementById("mount");
  let forgeCount = 0;
  let active = "casedex";
  function e(v){return String(v ?? "").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;","\\"":"&quot;","'":"&#39;"}[c]));}
  function sourceLink(url, text){return url ? '<a href="'+e(url)+'" target="_blank" rel="noreferrer">'+e(text || url)+'</a>' : "";}
  function grammar(c){ return '<dl class="grammar"><dt>State</dt><dd>'+e(c.state)+'</dd><dt>Evidence</dt><dd>'+e(c.evidence)+'</dd><dt>Limit</dt><dd>'+e(c.limit)+'</dd><dt>Move</dt><dd>'+e(c.move)+'</dd><dt>Trace</dt><dd>'+e(c.trace)+'</dd></dl>'; }
  function cardFront(c, cls="mobile-card"){return '<article class="'+cls+'"><div><p class="micro">'+e(c.id)+' '+e(c.icon)+' '+e(c.type)+'</p><h2>'+e(c.title)+'</h2></div><div><p>'+e(c.body)+'</p>'+grammar(c)+'</div><p class="micro">'+e(c.tags.join(" / "))+'</p></article>';}
  function cardBack(c){return '<article class="print-card"><p class="micro">'+e(c.id)+' PROVISDECK</p><h2>No claim without source.</h2><p>No edge without evidence. No uncertainty hidden. No contradiction erased. No private dirt.</p><p class="micro">FIELD · FORM · FIT · TRACE</p></article>';}
  function pages(items, back=false){ let html=''; for(let i=0;i<items.length;i+=4){ html += '<section class="print-page">'+items.slice(i,i+4).map(c => back ? cardBack(c) : cardFront(c,'print-card')).join('')+'</section>'; } return html; }
  function forge(){
    const base = caseCards[forgeCount % caseCards.length];
    forgeCount += 1;
    return { ...base, id:'INF-'+String(forgeCount).padStart(4,'0'), title:'Infinite '+base.title, footer:'INFINITE · '+base.footer, trace:'creates expansion candidate from '+base.id };
  }
  function csv(){ return 'id,type,title,state,evidence,limit,move,trace,body,footer,tags\\n' + cards.map(c => [c.id,c.type,c.title,c.state,c.evidence,c.limit,c.move,c.trace,c.body,c.footer,c.tags.join('|')].map(v => '"'+String(v).replaceAll('"','""')+'"').join(',')).join('\\n'); }
  function caseItems(term=''){
    const q = term.toLowerCase();
    const out = entities.filter(row => !q || JSON.stringify(row).toLowerCase().includes(q));
    return out.map(row => {
      const urls = (row.verified_urls || []).map(url => sourceLink(url, url)).join('');
      const evidence = (row.evidence_rows || []).map(ev => sourceLink(ev.url, (ev.source_title || ev.url) + ' — ' + (ev.evidence_type || '') + ' — ' + (ev.confidence || ''))).join('');
      return '<details class="case-item"><summary><span>'+e(row.entity)+'</span><span>'+e(row.entity_type)+'</span><span>'+e(row.verified_link_count)+'/10</span><span class="wide">gap '+e(row.gap_to_target)+'</span></summary><div class="case-body"><div><p class="micro">Problem</p><p>'+e(row.problem)+'</p><p class="micro">Probe</p><p>'+e(row.probe)+'</p><p class="micro">Context</p><p>'+e(row.source_context)+'</p></div><div><p class="micro">Verified URLs</p><div class="case-links">'+(urls || 'No verified URLs recorded.')+'</div><p class="micro" style="margin-top:8px">Evidence Rows</p><div class="case-links">'+(evidence || 'No evidence rows attached.')+'</div></div></div></details>';
    }).join('');
  }
  function bindCasedex(){
    const input = document.getElementById('caseSearch');
    const count = document.getElementById('caseCount');
    const list = document.getElementById('caseItems');
    function update(){ const q = input.value; const n = entities.filter(row => !q || JSON.stringify(row).toLowerCase().includes(q.toLowerCase())).length; count.textContent = n + ' / ' + entities.length; list.innerHTML = caseItems(q); }
    input.oninput = update;
    update();
  }
  function render(){
    if(active==='casedex') {
      mount.innerHTML = '<section class="panel"><div class="head"><span>204 Casedex</span><span id="caseCount">204 / 204</span></div><div class="body"><input id="caseSearch" class="case-search" type="search" placeholder="search all 204 entities, links, gaps, evidence" /><div id="caseItems" class="case-list"></div></div></section>';
      bindCasedex();
    }
    if(active==='mobile') mount.innerHTML = '<section class="panel"><div class="head"><span>Mobile Viewer</span><span>core 120</span></div><div class="body">'+cardFront(cards[0])+'</div></section>';
    if(active==='fronts') mount.innerHTML = pages(cards,false);
    if(active==='backs') mount.innerHTML = pages(cards,true);
    if(active==='casecards') mount.innerHTML = pages(caseCards,false);
    if(active==='casebacks') mount.innerHTML = pages(caseCards,true);
    if(active==='forge') { const c=forge(); mount.innerHTML = '<section class="panel"><div class="head"><span>Infinite Forge</span><span>204 case objects outside fixed print run</span></div><div class="body"><button id="again">Forge Again</button><div class="forge-card">'+cardFront(c,'mobile-card')+'</div></div></section>'; document.getElementById('again').onclick=()=>{active='forge'; render();}; }
    if(active==='checklist') mount.innerHTML = '<section class="panel"><div class="head"><span>Print Checklist</span><span>duplex</span></div><div class="body grid cols"><div class="cell">Printer scaling = 100%</div><div class="cell">Disable headers and footers</div><div class="cell">Recommended duplex: flip on long edge</div><div class="cell">Print one test page before full run</div><div class="cell">Trim: 2.5in x 3.5in</div><div class="cell">Safe margin: 0.125in</div><div class="cell">Core press run = exactly 120 cards</div><div class="cell">Expansion run = 204 CASE cards</div><div class="cell">204 Casedex entities are live case objects</div><div class="cell">Infinite Forge emits expansion CASE cards from the 204</div></div></section>';
  }
  document.querySelectorAll('[data-view]').forEach(b => b.onclick=()=>{active=b.dataset.view; render();});
  document.getElementById('copyJson').onclick=()=>navigator.clipboard.writeText(JSON.stringify(cards,null,2));
  document.getElementById('copyCsv').onclick=()=>navigator.clipboard.writeText(csv());
  document.getElementById('copyEntities').onclick=()=>navigator.clipboard.writeText(JSON.stringify(entities,null,2));
  render();
</script>`);

const indexHtml = htmlDoc("PROVIS — Electronic Medical Records for Ventures", `${nav("")}
<main>
  <section class="panel">
    <div class="head"><span>PROVIS</span><span>electronic medical records for ventures</span></div>
    <div class="body">
      <h1>Problem-Oriented Venture Information System</h1>
      <p class="small" style="margin-top:8px">PROVIS converts public-source venture traces into auditable case files for startups, founders, claims, relationships, risks, contradictions, and unresolved evidence gaps.</p>
      <p class="small" style="margin-top:8px"><strong>Diagnose the record. Do not trust the pitch.</strong></p>
    </div>
  </section>
  <section class="panel">
    <div class="head"><span>Origin</span><span>PROMIS / POMR lineage</span></div>
    <div class="body grid cols">
      <div class="cell"><span class="k">Medicine</span>PROMIS forced clinical data, notes, diagnoses, and interventions to attach to medical problems.</div>
      <div class="cell"><span class="k">Venture Intelligence</span>PROVIS forces sources, claims, founder links, risks, contradictions, and probes to attach to venture problems.</div>
      <div class="cell"><span class="k">Core Question</span>Not “is this a promising startup?” but “what does the evidence actually support?”</div>
      <div class="cell"><span class="k">Output</span>Here is the case. Here are the problems. Here is what is proven, weak, missing, contradicted, and worth probing next.</div>
    </div>
  </section>
  <section class="panel">
    <div class="head"><span>Start Here</span><span>recommended path</span></div>
    <div class="body grid cols">
      <a class="cell" href="provis-glass-loop.html"><span class="k">1 / Mobile MVP</span>Open GLASS LOOP. Hold one entity, inspect one edge, read one packet, choose one move.</a>
      <a class="cell" href="provisgrid.html"><span class="k">2 / Casedex</span>Browse the 204-entity evidence register with actual public-source rows.</a>
      <a class="cell" href="provisdeck.html"><span class="k">3 / Language</span>Inspect PROVISDECK: the card grammar for Field, Form, Fit, Trace, Source, Claim, Edge, Problem, Probe.</a>
      <a class="cell" href="deckpress.html"><span class="k">4 / Artifact</span>Open DECKPRESS for mobile viewing, print fronts/backs, JSON, CSV, and 204 CASE expansion cards.</a>
    </div>
  </section>
  <section class="panel">
    <div class="head"><span>How It Works</span><span>operator workflow</span></div>
    <div class="body grid cols">
      <div class="cell"><span class="k">1 / Capture</span>Register a public destination source. Search pages are discovery only, not final evidence.</div>
      <div class="cell"><span class="k">2 / Form</span>Convert loose information into typed objects: Evidence Form, Claim Form, Relationship Edge, Problem Form, Trace.</div>
      <div class="cell"><span class="k">3 / Bind</span>Attach each claim or edge to evidence, with both supports and does-not-establish visible.</div>
      <div class="cell"><span class="k">4 / Diagnose</span>Make gaps and contradictions first-class problems instead of hiding them in notes.</div>
      <div class="cell"><span class="k">5 / Probe</span>Turn uncertainty into the next public-source hunt.</div>
      <div class="cell"><span class="k">6 / Export</span>Run Quickcheck, preserve trace, and compile the venture case file.</div>
    </div>
  </section>
  <section class="panel">
    <div class="head"><span>Who It Serves</span><span>serious diligence</span></div>
    <div class="body grid cols">
      <div class="cell"><span class="k">Investors</span>Separate verified facts from self-claims, weak signals, stale affiliations, and pitch-deck optimism.</div>
      <div class="cell"><span class="k">Accelerators</span>Track what the public record actually supports for cohorts, founders, programs, and alumni ventures.</div>
      <div class="cell"><span class="k">Universities</span>Understand venture ecosystems as living evidence fields, not static directory listings.</div>
      <div class="cell"><span class="k">Founders</span>See where the public record is strong, confusing, thin, or missing proof investors will ask for.</div>
      <div class="cell"><span class="k">Analysts</span>Use a deterministic vocabulary for claims, edges, evidence, problems, risks, contradictions, probes, and trace.</div>
      <div class="cell"><span class="k">Operators</span>Move from scattered web research to audit-safe venture case files.</div>
    </div>
  </section>
  <section class="panel">
    <div class="head"><span>All Demos</span><span>interfaces</span></div>
    <div class="body grid cols">
      <a class="cell" href="provis.html"><span class="k">PROVIS</span>Ontology, laws, F4 primitives, shared language contract.</a>
      <a class="cell" href="provisgrid.html"><span class="k">PROVISGRID</span>Board/interface: 204 entities, evidence rows, problems, probes, and source links.</a>
      <a class="cell" href="provisdeck.html"><span class="k">PROVISDECK</span>Playable language: core 120 cards plus the 204-entity CASE expansion.</a>
      <a class="cell" href="provis-plus.html"><span class="k">PROVIS PLUS</span>Prompt-system and agentdeck branch for Scout, Guard, Binder, Linker, Critic, and Compiler flows.</a>
      <a class="cell" href="provis-glass.html"><span class="k">PROVIS GLASS</span>Mobile second-brain branch: pinned entity, local map, agent thread, evidence, move surface.</a>
      <a class="cell" href="provis-glass-loop.html"><span class="k">GLASS LOOP</span>Reduced operator MVP: CASE / THREAD / MOVE with linked drawers for entity, edge, packet, sources, problems, probe, trace.</a>
      <a class="cell" href="deckpress.html"><span class="k">DECKPRESS</span>Printable and mobile artifact generator for cards and Casedex objects.</a>
      <a class="cell" href="../provis-mobile-index/index.html"><span class="k">Mobile Index</span>Alternate entry point for the product stack and generated Casedex files.</a>
    </div>
  </section>
  <section class="panel">
    <div class="head"><span>Core Product Names</span><span>shared vocabulary</span></div>
    <div class="body grid cols">
      <div class="cell"><span class="k">Source Base</span>The repository of captured public destination sources.</div>
      <div class="cell"><span class="k">Venture Field</span>The bounded evidence environment around a venture.</div>
      <div class="cell"><span class="k">Claim Register</span>The structured inventory of claims and self-claims.</div>
      <div class="cell"><span class="k">Founder Graph</span>The source-backed network of founder relationships.</div>
      <div class="cell"><span class="k">Relationship Edges</span>Evidence-bound subject / predicate / object connections.</div>
      <div class="cell"><span class="k">Problem List</span>The organizing spine of unresolved venture issues.</div>
      <div class="cell"><span class="k">SOAPP Fits</span>Source, Observation, Assessment, Problem, Probe.</div>
      <div class="cell"><span class="k">Trace Log</span>Immutable audit history for each mutation.</div>
      <div class="cell"><span class="k">Source Gap Report</span>The named missing evidence layer.</div>
      <div class="cell"><span class="k">Bear Case Diagnosis</span>The strongest critique grounded in evidence and uncertainty.</div>
      <div class="cell"><span class="k">Quickcheck</span>The final compliance checklist before export.</div>
    </div>
  </section>
  <section class="panel">
    <div class="head"><span>Rules</span><span>anti-mythology</span></div>
    <div class="body grid cols">
      <div class="cell"><span class="k">Evidence Before Narrative</span>No claim without a source. No edge without evidence.</div>
      <div class="cell"><span class="k">Problems First</span>Missing founder proof, stale accelerator pages, unsupported traction, and contradictions are first-class objects.</div>
      <div class="cell"><span class="k">Uncertainty Preserved</span>PROVIS does not pretend to know what it cannot know. It names uncertainty and turns it into a probe.</div>
      <div class="cell"><span class="k">Public Boundary</span>Professional risk is allowed. Private dirt is not. No private emails, phones, home addresses, protected attributes, leaks, or login-gated material.</div>
      <div class="cell"><span class="k">Tone</span>Forensic, operational, skeptical, bounded, traceable, direct, calmly adversarial.</div>
      <div class="cell"><span class="k">Positioning</span>Not Crunchbase, PitchBook, LinkedIn, CRM, lead scraper, surveillance tool, pitch summarizer, or generic AI research assistant.</div>
    </div>
  </section>
  <section class="panel">
    <div class="head"><span>Generated Data</span><span>real artifacts</span></div>
    <div class="body grid cols">
      <a class="cell" href="provis-204-casedex.json"><span class="k">204 Casedex JSON</span>All entity cards with evidence rows, gaps, probes, and traces.</a>
      <a class="cell" href="provisgrid-rows.json"><span class="k">Grid Rows JSON</span>Board/interface rows compiled from the Casedex.</a>
      <a class="cell" href="provisdeck-cards.json"><span class="k">Core Deck JSON</span>Exactly 120 PROVISDECK cards.</a>
      <a class="cell" href="provis-204-casecards.json"><span class="k">204 CASE Cards JSON</span>Expansion cards generated from every Casedex entity.</a>
      <a class="cell" href="provis-trace-rows.json"><span class="k">Trace Rows JSON</span>Traceable venture/source rows for audit and export.</a>
      <a class="cell" href="../provis-real-data-only/PROVIS-real-data-only.xlsx"><span class="k">Real Data Workbook</span>Spreadsheet artifact with previews and evidence sheets.</a>
      <a class="cell" href="../provis-real-link-dd/PROVIS-real-link-due-diligence-batch3.xlsx"><span class="k">Real-Link DD Workbook</span>Due-diligence workbook for public-link expansion.</a>
      <a class="cell" href="../provis-204-expanded-real-links/PROVIS-204-entity-real-link-expansion.xlsx"><span class="k">204 Real-Link Expansion</span>Expanded public-link workbook for all 204 entities.</a>
      <a class="cell" href="../provis-venture-json/PROVIS-21-venture-records.json"><span class="k">21 Venture Records JSON</span>Structured venture records for case-file export.</a>
    </div>
  </section>
</main>`);

await fs.mkdir(outDir, { recursive: true });
await fs.writeFile(path.join(outDir, "index.html"), indexHtml);
await fs.writeFile(path.join(outDir, "provis.html"), provisHtml);
await fs.writeFile(path.join(outDir, "provisgrid.html"), gridHtml);
await fs.writeFile(path.join(outDir, "provisdeck.html"), deckHtml);
await fs.writeFile(path.join(outDir, "provis-plus.html"), deckHtml);
await fs.writeFile(path.join(outDir, "deckpress.html"), deckpressHtml);
await fs.writeFile(path.join(outDir, "provisdeck-cards.json"), `${JSON.stringify(cards, null, 2)}\n`);
await fs.writeFile(path.join(outDir, "provis-204-casecards.json"), `${JSON.stringify(caseCards, null, 2)}\n`);
await fs.writeFile(path.join(outDir, "provisgrid-rows.json"), `${JSON.stringify(gridRows, null, 2)}\n`);
await fs.writeFile(path.join(outDir, "provis-204-casedex.json"), `${JSON.stringify(entityRows, null, 2)}\n`);
await fs.writeFile(path.join(outDir, "provis-trace-rows.json"), `${JSON.stringify(traceRows, null, 2)}\n`);
await fs.writeFile(mobileIndexPath, indexHtml.replaceAll('href="provis.html"', 'href="../provis-product-stack/provis.html"').replaceAll('href="provisgrid.html"', 'href="../provis-product-stack/provisgrid.html"').replaceAll('href="provisdeck.html"', 'href="../provis-product-stack/provisdeck.html"').replaceAll('href="provis-plus.html"', 'href="../provis-product-stack/provis-plus.html"').replaceAll('href="provis-glass.html"', 'href="../provis-product-stack/provis-glass.html"').replaceAll('href="provis-glass-loop.html"', 'href="../provis-product-stack/provis-glass-loop.html"').replaceAll('href="deckpress.html"', 'href="../provis-product-stack/deckpress.html"').replaceAll('href="../provis-mobile-index/index.html"', 'href="index.html"'));

console.log(JSON.stringify({
  outDir,
  mobileIndexPath,
  cards: cards.length,
  caseCards: caseCards.length,
  casedexEntities: entityRows.length,
  gridRows: gridRows.length,
  traceRows: traceRows.length,
  evidenceRows: data.evidence.length,
  products: ["provis.html", "provisgrid.html", "provisdeck.html", "provis-plus.html", "provis-glass.html", "provis-glass-loop.html", "deckpress.html"],
}, null, 2));
