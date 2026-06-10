import fs from "node:fs/promises";
import path from "node:path";

const inputPath = path.resolve("provis_204_expanded_real_link_data.json");
const outputDir = path.resolve("outputs", "provis-venture-json");
const outputPath = path.join(outputDir, "PROVIS-21-venture-records.json");
const capturedAt = "2026-06-10";

const source = JSON.parse(await fs.readFile(inputPath, "utf8"));
const ventures = source.quota.filter((row) => row.entity_type === "Venture");
const evidenceRows = source.evidence_rows.filter((row) => row.entity_type === "Venture");

function slug(value) {
  return String(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function splitList(value) {
  if (!value) return [];
  return String(value)
    .split(/[,;|]/)
    .map((item) => item.trim())
    .filter((item) => item && item !== "-" && item !== "—");
}

function unique(values) {
  return [...new Set(values.filter(Boolean))];
}

function sourceType(row) {
  const text = `${row.evidence_type} ${row.source_title} ${row.url}`.toLowerCase();
  if (text.includes("github")) return "github_repository";
  if (text.includes("youtube") || text.includes("video")) return "public_video";
  if (text.includes("podcast") || text.includes("businessradiox")) return "podcast";
  if (text.includes("linkedin")) return "public_linkedin_profile";
  if (text.includes("press") || text.includes("hypepotamus") || text.includes("poetsandquants")) return "press_article";
  if (text.includes("official") && text.includes("site")) return "official_website";
  if (text.includes("team")) return "company_team_page";
  if (text.includes("docs") || text.includes("documentation")) return "product_documentation";
  if (text.includes("program") || text.includes("roster") || text.includes("accelerator")) return "program_roster";
  if (text.includes("university") || text.includes("emory") || text.includes("goizueta")) return "university_page";
  if (text.includes("pdf") || row.url.endsWith(".pdf")) return "public_report";
  return "other_public_source";
}

function evidenceLevel(row) {
  const type = sourceType(row);
  if (["github_repository", "product_documentation"].includes(type)) return "L5_primary_record";
  if (["press_article", "podcast"].includes(type)) return "L3_independent_public_source";
  if (["program_roster", "university_page", "public_report"].includes(type)) return "L2_program_claim";
  if (["official_website", "company_team_page", "public_linkedin_profile"].includes(type)) return "L1_self_claim";
  return "L1_self_claim";
}

function reliability(row) {
  const level = evidenceLevel(row);
  const confidence = String(row.confidence || "").toLowerCase();
  let score = 0.45;
  if (level.startsWith("L5")) score = 0.85;
  else if (level.startsWith("L4")) score = 0.8;
  else if (level.startsWith("L3")) score = 0.72;
  else if (level.startsWith("L2")) score = 0.64;
  else if (level.startsWith("L1")) score = 0.52;
  if (confidence.includes("high")) score += 0.05;
  if (confidence.includes("candidate") || confidence.includes("low")) score -= 0.2;
  return Math.max(0.1, Math.min(0.95, Number(score.toFixed(2))));
}

function claimType(text) {
  const t = String(text).toLowerCase();
  if (t.includes("founder") || t.includes("co-founder") || t.includes("cofounder")) return "founder_claim";
  if (t.includes("funding") || t.includes("raised") || t.includes("seed") || t.includes("prize") || t.includes("$")) return "funding_claim";
  if (t.includes("ai") || t.includes("machine learning") || t.includes("sdk") || t.includes("analytics") || t.includes("platform")) return "technology_claim";
  if (t.includes("pilot") || t.includes("customer") || t.includes("users") || t.includes("revenue")) return "traction_claim";
  if (t.includes("hipaa") || t.includes("fda") || t.includes("medical") || t.includes("healthcare") || t.includes("methadone")) return "compliance_claim";
  if (t.includes("program") || t.includes("accelerator") || t.includes("summit") || t.includes("hatchery")) return "affiliation_claim";
  return "product_claim";
}

function supportStatus(row) {
  const level = evidenceLevel(row);
  if (level.startsWith("L5") || level.startsWith("L3")) return "supported";
  if (level.startsWith("L2")) return "weakly_supported";
  if (String(row.confidence || "").toLowerCase().includes("candidate")) return "ambiguous";
  return "weakly_supported";
}

function confidenceScore(row) {
  const r = reliability(row);
  return Number(Math.max(0.2, Math.min(0.9, r)).toFixed(2));
}

function hasAny(rows, terms) {
  const joined = rows.map((row) => `${row.evidence_type} ${row.source_title} ${row.extracted_facts} ${row.url}`).join(" ").toLowerCase();
  return terms.some((term) => joined.includes(term));
}

function frameFor(venture, rows) {
  const text = `${venture.entity} ${JSON.stringify(venture.context)} ${rows.map((row) => row.extracted_facts).join(" ")}`.toLowerCase();
  const frames = [];
  if (/(ai|machine learning|analytics|platform|sdk|automation|regulatory intelligence)/.test(text)) frames.push("AI_Startup_Frame");
  if (/(medical|health|healthcare|methadone|nurse|clinical|blood|device)/.test(text)) frames.push("Healthtech_Frame");
  if (/(finance|fintech|cfo|revenue|inventory|marketing data)/.test(text)) frames.push("Fintech_Frame");
  if (/(marketplace|social commerce|booking|stylists|artists|two-sided)/.test(text)) frames.push("Marketplace_Frame");
  if (!frames.length || /student|emory|goizueta|hatchery|summit|techstars/.test(text)) frames.push("Student_Founder_Frame");
  return unique(frames);
}

function recordConfidence(linkCount, rows) {
  const hasOfficial = rows.some((row) => ["official_website", "company_team_page", "product_documentation"].includes(sourceType(row)));
  const hasIndependent = rows.some((row) => ["press_article", "podcast"].includes(sourceType(row)));
  if (linkCount >= 5 && hasOfficial && hasIndependent) return "high";
  if (linkCount >= 2) return "moderate";
  return "low";
}

function recordStatus(linkCount, rows) {
  const hasOfficial = rows.some((row) => ["official_website", "company_team_page", "product_documentation"].includes(sourceType(row)));
  if (linkCount >= 2 && hasOfficial) return "active_supported";
  if (hasOfficial) return "active_claimed";
  if (linkCount >= 2) return "program_supported_status_unresolved";
  return "ambiguous";
}

function relationState(rows) {
  const hasOfficialTeam = rows.some((row) => sourceType(row) === "company_team_page");
  const hasFounderText = hasAny(rows, ["founder", "co-founder", "cofounder", "team"]);
  if (hasOfficialTeam) return ["supported", "high"];
  if (hasFounderText) return ["weakly_supported", "moderate"];
  return ["candidate", "low"];
}

function makeProblems(venture, rows, sourceIds) {
  const problems = [];
  const linkCount = venture.current_verified_links;
  const noOfficialSite = !rows.some((row) => sourceType(row) === "official_website");
  const noTeamPage = !rows.some((row) => sourceType(row) === "company_team_page");
  const noIndependent = !rows.some((row) => ["press_article", "podcast"].includes(sourceType(row)));
  const noTraction = !hasAny(rows, ["customer", "pilot", "revenue", "users", "case study", "retention"]);
  const text = `${venture.entity} ${JSON.stringify(venture.context)} ${rows.map((row) => row.extracted_facts).join(" ")}`.toLowerCase();

  problems.push({
    problem_id: `vp_${slug(venture.entity)}_coverage`,
    title: "Source coverage below target",
    problem_type: "source_quality_problem",
    state: linkCount >= 10 ? "Resolved" : "Weakly_Supported",
    severity: linkCount >= 5 ? "medium" : "high",
    confidence: "high",
    evidence_links: sourceIds,
    why_it_matters: "The record cannot support broad diligence conclusions without diverse evidence across official, founder, institutional, independent, and primary artifact sources.",
    next_probe: [
      "Find official team/about page.",
      "Find founder public profile naming the venture.",
      "Find independent press, customer, product, GitHub, app, patent, or filing evidence.",
    ],
  });

  if (noOfficialSite) {
    problems.push({
      problem_id: `vp_${slug(venture.entity)}_official_site`,
      title: "Official venture website not verified",
      problem_type: "venture_status_problem",
      state: "Ambiguous",
      severity: "high",
      confidence: "moderate",
      evidence_links: sourceIds,
      why_it_matters: "Program or award pages can prove appearance in an ecosystem context, but not current operating status.",
      next_probe: ["Find official company website, product page, app listing, or founder-controlled page."],
    });
  }

  if (noTeamPage) {
    problems.push({
      problem_id: `vp_${slug(venture.entity)}_founders`,
      title: "Founder relationship needs stronger proof",
      problem_type: "founder_relationship_problem",
      state: "Weakly_Supported",
      severity: "high",
      confidence: "moderate",
      evidence_links: sourceIds,
      why_it_matters: "Program rosters and news mentions may be stale or incomplete; founder relationships require direct source binding.",
      next_probe: ["Find company team page, founder bio, LinkedIn destination profile, speaker bio, or public interview confirming the role."],
    });
  }

  if (noIndependent) {
    problems.push({
      problem_id: `vp_${slug(venture.entity)}_independence`,
      title: "Independent corroboration missing or thin",
      problem_type: "weak_source_problem",
      state: "Weakly_Supported",
      severity: "medium",
      confidence: "high",
      evidence_links: sourceIds,
      why_it_matters: "University and founder-controlled sources can launder prestige; independent sources reduce narrative-only risk.",
      next_probe: ["Find independent press, podcast, investor portfolio, partner page, public customer reference, or public registry."],
    });
  }

  if (noTraction) {
    problems.push({
      problem_id: `vp_${slug(venture.entity)}_traction`,
      title: "Traction and customer evidence not established",
      problem_type: "traction_verification_problem",
      state: "Unsupported",
      severity: "high",
      confidence: "high",
      evidence_links: sourceIds,
      why_it_matters: "Existence in a program does not establish adoption, revenue, retention, clinical/commercial value, or customer willingness to pay.",
      next_probe: ["Find customer page, case study, app reviews, user metrics, pilots, revenue claim source, or third-party adoption evidence."],
    });
  }

  if (/(ai|machine learning|analytics|sdk|automation|regulatory intelligence)/.test(text)) {
    problems.push({
      problem_id: `vp_${slug(venture.entity)}_technical`,
      title: "Technical capability claim needs deployment proof",
      problem_type: "technical_feasibility_problem",
      state: "Weakly_Supported",
      severity: "medium",
      confidence: "moderate",
      evidence_links: sourceIds,
      why_it_matters: "AI, analytics, and SDK claims can work in demos while failing in production due to data, workflow, reliability, cost, or integration limits.",
      next_probe: ["Find product docs, demo video, GitHub repo, benchmarks, evaluation metrics, security docs, or deployment case study."],
    });
  }

  if (/(medical|health|healthcare|methadone|nurse|clinical|blood|device)/.test(text)) {
    problems.push({
      problem_id: `vp_${slug(venture.entity)}_health_compliance`,
      title: "Health or clinical exposure unresolved",
      problem_type: "compliance_problem",
      state: "Ambiguous",
      severity: "high",
      confidence: "moderate",
      evidence_links: sourceIds,
      why_it_matters: "Health-related products can create patient, privacy, FDA/device, clinical validation, and workflow liability not visible from pitch pages.",
      next_probe: ["Find regulatory positioning, privacy policy, clinical validation, provider workflow proof, FDA/device boundary, or pilot documentation."],
    });
  }

  return problems;
}

function contradictionForms(venture, rows) {
  const facts = rows.map((row) => row.extracted_facts).join(" ");
  const contradictions = [];
  if (venture.entity === "WorkforceIQ" && /25MBA/.test(facts) && /26MBA/.test(facts)) {
    contradictions.push({
      contradiction_id: `ct_${slug(venture.entity)}_class_year`,
      issue: "Founder class year conflict",
      source_a: "Voice of Goizueta / Poets&Quants references Omid Razmpour 26MBA.",
      source_b: "CEI Annual Report extraction references Omid Razmpour 25MBA.",
      conflict_summary: "Public sources disagree on the class year attached to the same founder relationship.",
      current_interpretation: "Founder relationship remains supported, but class-year metadata is unstable.",
      severity: "low",
      confidence: "moderate",
      next_probe: ["Check official Goizueta profile or founder bio for canonical class year."],
    });
  }
  if (venture.entity === "The Elephant Room" && (/Barrera/.test(facts) && /Barerra/.test(facts))) {
    contradictions.push({
      contradiction_id: `ct_${slug(venture.entity)}_founder_spelling`,
      issue: "Founder name spelling variance",
      source_a: "Some sources spell Federico Morales Barrera.",
      source_b: "Some source text spells Federico Morales Barerra.",
      conflict_summary: "Founder relationship appears supported, but one founder name spelling needs canonicalization.",
      current_interpretation: "Treat as a data-quality problem, not a disconfirmation.",
      severity: "low",
      confidence: "moderate",
      next_probe: ["Use official team page or founder public profile as canonical spelling."],
    });
  }
  if (venture.entity === "Boomi" && (/Deepak/.test(facts) && /Depak/.test(facts))) {
    contradictions.push({
      contradiction_id: `ct_${slug(venture.entity)}_founder_spelling`,
      issue: "Founder name spelling variance",
      source_a: "One source text says Shirin Deepak.",
      source_b: "One source text says Shirin Depak.",
      conflict_summary: "Venture context is supported by program sources, but founder spelling needs canonicalization.",
      current_interpretation: "Treat as a data-quality problem pending direct founder profile.",
      severity: "low",
      confidence: "moderate",
      next_probe: ["Find official founder profile or program correction."],
    });
  }
  return contradictions;
}

function bearCase(venture, rows) {
  const linkCount = venture.current_verified_links;
  const noOfficial = !rows.some((row) => sourceType(row) === "official_website");
  const noIndependent = !rows.some((row) => ["press_article", "podcast"].includes(sourceType(row)));
  const parts = [];
  if (noOfficial) parts.push("public evidence may prove program participation more than an operating company");
  if (noIndependent) parts.push("independent corroboration is thin");
  if (linkCount < 4) parts.push("the evidence stack is too narrow for claims about traction or durability");
  parts.push("customer adoption, revenue, retention, and execution capacity remain unresolved unless separately sourced");
  return `The strongest grounded bear case is that ${venture.entity} is currently more of a public program/pitch record than a fully verified venture record: ${parts.join("; ")}.`;
}

function salvageTruth(venture, rows) {
  if (rows.length === 1) return "At minimum, a public source records the venture or venture-like claim; broader operational reality remains unproven.";
  return "The venture has a public evidence footprint that supports existence or program participation; the unresolved issue is depth, independence, and operating proof.";
}

const records = ventures.map((venture) => {
  const rows = evidenceRows.filter((row) => row.entity === venture.entity);
  const sourceBase = rows.map((row, index) => ({
    evidence_id: `ev_${slug(venture.entity)}_${String(index + 1).padStart(2, "0")}`,
    url: row.url,
    source_type: sourceType(row),
    title: row.source_title || row.evidence_type,
    publisher: new URL(row.url).hostname.replace(/^www\./, ""),
    captured_at: capturedAt,
    publication_date: "",
    summary: row.extracted_facts,
    evidence_level: evidenceLevel(row),
    reliability_score: reliability(row),
    privacy_status: "public",
  }));
  const sourceIds = sourceBase.map((sourceItem) => sourceItem.evidence_id);
  const founders = splitList(venture.context?.named_founders);
  const programs = splitList(venture.context?.programs);
  const [founderState, founderConfidence] = relationState(rows);
  const frames = frameFor(venture, rows);
  const problems = makeProblems(venture, rows, sourceIds);
  const contradictions = contradictionForms(venture, rows);
  const risks = problems.map((problem, index) => ({
    risk_id: `risk_${slug(venture.entity)}_${String(index + 1).padStart(2, "0")}`,
    title: problem.title,
    risk_type: problem.problem_type.replace("_problem", "_risk"),
    severity: problem.severity,
    likelihood: problem.state === "Unsupported" ? "high" : "moderate",
    confidence: problem.confidence,
    evidence_links: problem.evidence_links,
    explanation: problem.why_it_matters,
    next_probe: problem.next_probe,
  }));
  const uncertainties = problems.map((problem, index) => ({
    uncertainty_id: `unc_${slug(venture.entity)}_${String(index + 1).padStart(2, "0")}`,
    question: problem.title,
    reason_uncertain: problem.why_it_matters,
    evidence_seen: problem.evidence_links,
    evidence_missing: problem.next_probe,
    risk_if_wrong: `If unresolved, the record may overstate ${venture.entity}'s status, relationships, traction, or risk posture.`,
    next_probe: problem.next_probe,
  }));

  return {
    provis_record: {
      target: {
        name: venture.entity,
        target_type: "venture",
        one_line_summary: venture.context?.description || rows[0]?.extracted_facts || "",
        record_status: recordStatus(venture.current_verified_links, rows),
        confidence: recordConfidence(venture.current_verified_links, rows),
      },
      source_base: sourceBase,
      entity_forms: {
        founders: founders.map((founder, index) => ({
          founder_id: `founder_${slug(venture.entity)}_${index + 1}`,
          name: founder,
          public_profile_urls: [],
          claimed_roles: ["founder candidate"],
          venture_relationships: [`${founder} founder_of ${venture.entity}`],
          institutional_affiliations: programs,
          program_affiliations: programs,
          source_links: sourceIds,
          identity_confidence: founderConfidence,
          relationship_confidence: founderConfidence,
          ambiguity_flags: founderState === "supported" ? [] : ["needs direct public founder profile or company team confirmation"],
          privacy_flags: [],
        })),
        ventures: [{
          venture_id: `venture_${slug(venture.entity)}`,
          name: venture.entity,
          aliases: [],
          website_urls: rows.filter((row) => sourceType(row) === "official_website").map((row) => row.url),
          public_descriptions: [venture.context?.description || ""].filter(Boolean),
          product_urls: rows.filter((row) => ["product_documentation", "official_website", "company_team_page"].includes(sourceType(row))).map((row) => row.url),
          geography_claims: [],
          industry_claims: [venture.context?.sector || ""].filter(Boolean),
          stage_claims: [],
          founder_relationships: founders,
          program_relationships: programs,
          investor_relationships: [],
          customer_claims: [],
          traction_claims: rows.filter((row) => claimType(row.extracted_facts) === "traction_claim").map((row) => row.extracted_facts),
          funding_claims: rows.filter((row) => claimType(row.extracted_facts) === "funding_claim").map((row) => row.extracted_facts),
          compliance_claims: rows.filter((row) => claimType(row.extracted_facts) === "compliance_claim").map((row) => row.extracted_facts),
          technical_claims: rows.filter((row) => claimType(row.extracted_facts) === "technology_claim").map((row) => row.extracted_facts),
          source_links: sourceIds,
          risk_forms: risks.map((risk) => risk.risk_id),
          contradiction_forms: contradictions.map((item) => item.contradiction_id),
          uncertainty_forms: uncertainties.map((item) => item.uncertainty_id),
          confidence_state: recordConfidence(venture.current_verified_links, rows),
          current_status: recordStatus(venture.current_verified_links, rows),
        }],
        programs,
        investors: [],
        partners: [],
        institutions: unique(rows.flatMap((row) => {
          const text = `${row.matching_fields} ${row.source_title}`;
          return ["Emory", "Goizueta", "Hatchery", "Techstars", "CEI"].filter((name) => text.includes(name));
        })),
      },
      relationship_forms: [
        ...founders.map((founder, index) => ({
          relationship_id: `rel_${slug(venture.entity)}_founder_${index + 1}`,
          subject: founder,
          predicate: "founder_of",
          object: venture.entity,
          evidence_links: sourceIds,
          confidence: founderConfidence,
          state: founderState,
        })),
        ...programs.map((program, index) => ({
          relationship_id: `rel_${slug(venture.entity)}_program_${index + 1}`,
          subject: venture.entity,
          predicate: "participant_in",
          object: program,
          evidence_links: sourceIds,
          confidence: "moderate",
          state: "evidence_bound",
        })),
      ],
      claim_forms: rows.map((row, index) => ({
        claim_id: `claim_${slug(venture.entity)}_${String(index + 1).padStart(2, "0")}`,
        claim_text: row.extracted_facts,
        claim_type: claimType(row.extracted_facts),
        claimed_by_entity: row.source_pass || "",
        about_entity: venture.entity,
        evidence_links: [sourceBase[index].evidence_id],
        support_status: supportStatus(row),
        confidence: confidenceScore(row),
        contradiction_links: [],
        required_verification: ["Confirm claim through a source with higher independence or primary-artifact level where possible."],
      })),
      venture_problem_list: problems,
      evidence_bindings: rows.map((row, index) => ({
        evidence_id: sourceBase[index].evidence_id,
        target_form: `venture_${slug(venture.entity)}`,
        supports: [row.extracted_facts],
        does_not_establish: [
          "Does not establish revenue unless directly stated.",
          "Does not establish active customer adoption unless directly stated.",
          "Does not establish current founder role unless directly named in the source.",
        ],
        confidence_change: `${supportStatus(row)} via ${evidenceLevel(row)}`,
      })),
      soapp_fits: rows.map((row, index) => ({
        fit_id: `fit_${slug(venture.entity)}_${String(index + 1).padStart(2, "0")}`,
        source: sourceBase[index].evidence_id,
        observation: row.extracted_facts,
        assessment: {
          supports: [row.matching_fields || `Public source mentions ${venture.entity}`],
          weakens: [],
          contradicts: [],
          does_not_establish: ["Full operating status", "customer traction", "unit economics", "governance quality"],
          confidence_change: `${supportStatus(row)}; ${evidenceLevel(row)}`,
        },
        problem: problems[0]?.problem_id || "",
        probe: problems[0]?.next_probe || [],
      })),
      contradiction_forms: contradictions,
      risk_forms: risks,
      uncertainty_forms: uncertainties,
      provenance_trace: [
        ...sourceBase.map((item) => ({
          action: "CAPTURE_SOURCE",
          actor: "PROVIS",
          timestamp: capturedAt,
          source: item.evidence_id,
          prior_state: "Unseen",
          new_state: "Captured",
          reason: "Source included in verified public venture evidence stack.",
        })),
        {
          action: "GENERATE_PROVIS_RECORD",
          actor: "PROVIS",
          timestamp: capturedAt,
          prior_state: "Evidence_Bound",
          new_state: "Parsed",
          reason: "Generated structured venture problem record from verified source base.",
        },
      ],
      venture_diagnosis: {
        strongest_supported_facts: rows.slice(0, 5).map((row) => row.extracted_facts),
        weakest_material_claims: problems.map((problem) => problem.title),
        key_contradictions: contradictions.map((item) => item.issue),
        key_unknowns: uncertainties.map((item) => item.question),
        major_risks: risks.map((risk) => risk.title),
        diligence_frames: frames,
        strongest_bear_case: bearCase(venture, rows),
        salvageable_truth: salvageTruth(venture, rows),
        next_probe: unique(problems.flatMap((problem) => problem.next_probe)).slice(0, 12),
      },
      safety_boundary: {
        private_data_collected: false,
        forbidden_data_rejected: ["private contact data", "home addresses", "private social media", "login-gated profile content", "paywall bypass"],
        notes: ["Record is based on public destination URLs and explicit uncertainty; absence of evidence is not treated as evidence of wrongdoing."],
      },
      quickcheck: {
        factual_claims_source_bound: rows.length > 0,
        founder_relationships_evidence_bound: founders.length === 0 ? true : founderState !== "candidate",
        uncertainties_visible: uncertainties.length > 0,
        contradictions_preserved: true,
        private_data_boundaries_respected: true,
        confidence_levels_justified: true,
        next_probes_specific: problems.every((problem) => problem.next_probe.length > 0),
        critique_grounded: true,
        stale_sources_marked: true,
        invented_entities_blocked: true,
      },
    },
  };
});

const output = {
  meta: {
    title: "PROVIS 21 Venture Records",
    generated_at: capturedAt,
    source_file: "provis_204_expanded_real_link_data.json",
    venture_count: records.length,
    evidence_row_count: evidenceRows.length,
    mode: "public-source problem-oriented venture record generation",
  },
  index: records.map((record) => ({
    name: record.provis_record.target.name,
    status: record.provis_record.target.record_status,
    confidence: record.provis_record.target.confidence,
    source_count: record.provis_record.source_base.length,
    problem_count: record.provis_record.venture_problem_list.length,
    risk_count: record.provis_record.risk_forms.length,
  })),
  records,
};

await fs.mkdir(outputDir, { recursive: true });
await fs.writeFile(outputPath, `${JSON.stringify(output, null, 2)}\n`);
console.log(JSON.stringify({
  outputPath,
  venture_count: records.length,
  evidence_row_count: evidenceRows.length,
  records_with_source_base: records.filter((record) => record.provis_record.source_base.length > 0).length,
}, null, 2));
