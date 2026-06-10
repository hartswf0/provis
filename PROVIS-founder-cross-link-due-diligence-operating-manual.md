# PROVIS Founder Cross-Link Due Diligence Operating Manual

Version: 0.2  
Purpose: turn the current PROVIS link register into a public-source, case-based diligence system for ventures, founders, organizations, claims, contradictions, risks, and next probes.

---

## 1. Core Correction

The next PROVIS pass should not ask only:

```text
Can we find 10 URLs for this venture?
```

It should ask:

```text
What public evidence field surrounds this venture, its founders, its related organizations, and its claims?
```

That means every venture becomes a case file.

Every founder becomes a cross-linked public professional profile.

Every relationship becomes a source-backed edge.

Every missing link becomes a named problem, not a guessed URL.

---

## 2. Public-Source Boundary

Allowed:

```text
official company websites
official founder/team pages
university bios
accelerator rosters
award pages
press articles
podcasts
public YouTube videos
public GitHub repositories
public LinkedIn profile/company pages when directly accessible
public X/Instagram/Substack/Medium pages when entity-specific
product docs
security/privacy pages
pricing pages
app store listings
patent records
SEC/company filings where relevant
court/regulatory records where professionally relevant
public publications
public speaking pages
investor portfolio pages
partner/customer case studies
job postings
public reviews
```

Forbidden:

```text
private emails
private phone numbers
home addresses
family information
protected attributes
private social posts
login-gated content
paywall bypass
credentialed databases
doxxing material
irrelevant personal gossip
scraped private data
```

Professional risk is allowed. Private dirt is not.

---

## 3. Evidence Standard

Use this scale for every claim and relationship:

```yaml
evidence_standard:
  L0_unverified:
    meaning: "Claim exists but no destination source supports it."
  L1_self_claim:
    meaning: "Official/founder/company-controlled page claims it."
  L2_program_claim:
    meaning: "University, accelerator, award, or ecosystem source supports it."
  L3_independent_public_source:
    meaning: "Independent press, podcast, database, or public third-party source supports it."
  L4_multiple_independent_sources:
    meaning: "Multiple independent sources converge."
  L5_primary_record:
    meaning: "Filing, patent, court record, publication, repo, app listing, or primary artifact supports it."
```

Rule:

```text
Confidence must not exceed the evidence level.
```

A founder-controlled page can prove that a founder claims something.

It does not prove traction, revenue, efficacy, customer value, or market adoption.

---

## 4. Source Diversity Rule

Ten links is a target, not a license to pad.

Do not count ten near-duplicate pages from the same domain as ten independent proof points.

For each venture, try to collect this mix:

```yaml
target_source_mix:
  venture_official:
    - homepage
    - about/team page
    - product/pricing/docs page
    - security/privacy/legal page
    - careers/jobs page
  founder_public_profile:
    - official bio
    - public LinkedIn destination profile
    - personal website
    - GitHub profile or repo
    - YouTube/podcast/speaker page
    - publications/patents
  institutional:
    - Emory/Goizueta/Hatchery/CEI page
    - accelerator roster
    - award page
    - annual report
  independent:
    - press article
    - podcast/interview
    - investor portfolio page
    - partner/customer page
    - public registry/listing
  primary_artifact:
    - GitHub repo
    - app store listing
    - patent
    - SEC/filing
    - court/regulatory record
    - product documentation
```

If fewer than ten real links exist, write:

```text
Verified links found: N/10.
Missing layers: official team page, founder profile, independent press, GitHub, publications, customer proof, filings, etc.
Do not fabricate.
```

---

## 5. Founder Cross-Link Model

Each founder should be treated as a public professional entity, not just a name string.

```yaml
founder_cross_link_record:
  founder_name: ""
  linked_venture: ""
  claimed_role: ""
  relationship_state: "candidate | weakly_supported | supported | strongly_supported | contradicted | unresolved"
  identity_confidence: "low | moderate | high | very_high"
  relationship_confidence: "low | moderate | high | very_high"
  public_profile_urls:
    linkedin_profile: ""
    personal_website: ""
    github: ""
    youtube: ""
    podcast: ""
    publications: []
    patents: []
    speaker_pages: []
    company_team_pages: []
    university_bios: []
  professional_profile:
    current_role: ""
    prior_roles: []
    education_claims: []
    technical_claims: []
    domain_claims: []
    investor_or_advisor_roles: []
    related_startups: []
    related_organizations: []
  evidence_bindings:
    - claim: ""
      source_url: ""
      source_type: ""
      supports: []
      does_not_establish: []
      confidence_change: ""
  ambiguity_flags:
    - "same-name risk"
    - "profile does not mention venture"
    - "venture page names founder but founder profile does not confirm"
    - "program page stale"
  privacy_boundary:
    private_data_collected: false
    forbidden_data_rejected: []
  next_probe:
    - ""
```

---

## 6. Relationship Edge Rules

Never infer a founder relationship from proximity.

Every edge must be source-bound.

```yaml
relationship_edge:
  subject: "Founder or organization"
  predicate: "founder_of | cofounder_of | advisor_to | investor_in | member_of | participant_in | backed_by | partnered_with | employed_by | affiliated_with"
  object: "Venture or organization"
  source_urls: []
  confidence: "low | moderate | high | very_high"
  state: "candidate | evidence_bound | supported | contradicted | stale | unresolved"
  what_it_supports: []
  what_it_does_not_support: []
  contradiction_flags: []
  next_probe: []
```

Examples:

```text
Program roster names Jane as participant in Venture X.
This supports: Jane participated in program context for Venture X.
This does not establish: current founder role, active employment, revenue, customer traction.
```

```text
Official company team page names Jane as founder.
This supports: stronger founder relationship.
This does not establish: product adoption, technical validity, customer satisfaction.
```

Related-startup and organization edges should also be recorded when public evidence supports them.

```yaml
related_entity_edges:
  prior_startup:
    example: "Founder profile says founder previously founded Company Y."
    required_source: "founder bio, company page, press article, portfolio page, or filing"
    does_not_establish: "That Company Y is connected to the current venture unless separately sourced."
  investor_or_advisor:
    example: "Investor portfolio page lists Venture X."
    required_source: "investor page, official announcement, filing, or article"
    does_not_establish: "Investment amount, terms, or ongoing involvement unless stated."
  institutional_affiliation:
    example: "University page lists founder as fellow or program participant."
    required_source: "university, program, accelerator, or award page"
    does_not_establish: "Current company status or founder employment."
  publication_or_patent:
    example: "Public paper or patent names founder."
    required_source: "publisher, Google Scholar landing page, patent office page, or university profile"
    does_not_establish: "Commercial product validity unless tied to the venture."
  code_or_product_artifact:
    example: "GitHub repo or product docs map to the venture."
    required_source: "public repo, docs page, app listing, or official product page"
    does_not_establish: "Security, scale, customer adoption, or revenue."
```

---

## 7. Founder Search Families

Search pages are discovery only. They are never final evidence.

Use query families like:

```text
"First Last" "Venture Name"
"First Last" Emory
"First Last" Goizueta
"First Last" Hatchery
"First Last" Techstars
"First Last" founder
"First Last" co-founder
"First Last" LinkedIn
"First Last" GitHub
"First Last" YouTube
"First Last" podcast
"First Last" patent
"First Last" publication
"First Last" "Google Scholar"
"First Last" "Atlanta"
"First Last" "company"
"First Last" "speaker"
"First Last" "award"
"First Last" "Pitch the Summit"
```

Then capture only the destination pages:

```text
public profile page
GitHub profile/repo
YouTube video page
podcast episode page
university bio
company team page
publication page
patent page
portfolio page
conference/speaker page
press article
```

---

## 8. Venture Case File Model

Each venture should have a case file like this:

```yaml
venture_case_file:
  venture:
    name: ""
    aliases: []
    one_line_claim: ""
    current_status: "unknown | active_claimed | active_supported | dormant | ambiguous"
    confidence: ""

  source_base:
    - url: ""
      source_type: ""
      title: ""
      publisher: ""
      captured_at: ""
      evidence_level: "L0-L5"
      summary: ""
      privacy_status: "public"

  founder_graph:
    founders: []
    relationship_edges: []
    missing_founder_proof: []

  related_entities:
    organizations: []
    accelerators: []
    investors: []
    advisors: []
    partners: []
    related_startups: []

  claims:
    product_claims: []
    technical_claims: []
    traction_claims: []
    funding_claims: []
    customer_claims: []
    compliance_claims: []
    impact_claims: []

  problem_list:
    - title: ""
      problem_type: ""
      severity: ""
      state: ""
      evidence_links: []
      next_probe: []

  contradiction_map: []
  risk_forms: []
  uncertainty_forms: []
  soapp_fits: []

  diagnosis:
    strongest_supported_facts: []
    weakest_material_claims: []
    biggest_risks: []
    key_unknowns: []
    strongest_bear_case: ""
    salvageable_truth: ""
    next_probe: []
```

---

## 9. SOAPP Fit Template

Use one SOAPP note per meaningful source.

```yaml
soapp_fit:
  source:
    url: ""
    source_type: ""
    captured_at: ""
  observation: ""
  assessment:
    supports: []
    weakens: []
    contradicts: []
    does_not_establish: []
    confidence_change: ""
  problem: ""
  probe:
    next_sources_to_find: []
    next_questions: []
    stop_conditions:
      - "no private data"
      - "no login-gated data"
      - "no guessed relationship"
```

---

## 10. Due Diligence Genome

Use one genome per venture when enough evidence exists.

```yaml
due_diligence_genome:
  title: ""
  seed: ""
  claimed_surface:
    stated_mission: ""
    explicit_promises: []
    implied_promises: []
    prestige_signals: []
    emotional_hook: ""
  adversarial_frame:
    core_question: ""
    failure_hunch: ""
    deception_hunch: ""
    asymmetry_hunch: ""
    pressure_points: []
  business_reality_matrix:
    product_logic: ""
    customer_logic: ""
    revenue_logic: ""
    cost_logic: ""
    margin_logic: ""
    distribution_logic: ""
    retention_logic: ""
    substitution_risk: []
    dependency_risk: []
    market_timing_risk: []
  technical_reality_matrix:
    core_technical_claims: []
    hidden_technical_requirements: []
    likely_failure_modes: []
    demo_vs_deployment_gap: ""
    scaling_risks: []
    security_privacy_risks: []
    maintainability_risks: []
  governance_and_people:
    founder_risk: []
    team_risk: []
    governance_risk: []
    labor_risk: []
    culture_risk: []
  legal_regulatory_ethics:
    compliance_exposure: []
    litigation_vectors: []
    ethical_hazards: []
    policy_dependency: []
    public_backlash_vectors: []
  evidence_stack:
    internal_claims_to_verify: []
    external_sources_needed: []
    hidden_metrics_to_demand: []
    artifacts_to_compare: []
    contradiction_surfaces: []
  attack_surface:
    bear_case: ""
    journalist_case: ""
    customer_case: ""
    employee_case: ""
    regulator_case: ""
    competitor_case: ""
  risk_axis:
    existential_risks: []
    reputational_risks: []
    operational_risks: []
    financial_risks: []
    technical_risks: []
    social_risks: []
    compounding_risks: []
  signature_critique_ecology:
    claim_logic: ""
    contradiction_logic: ""
    bottleneck_logic: ""
    deception_logic: ""
    adoption_logic: ""
    dependency_logic: ""
    enforcement_logic: ""
    collapse_logic: ""
    evidence_logic: ""
    downside_distribution: ""
    salvage_logic: ""
  tagline: ""
```

---

## 11. Critique Echo Template

```text
Investigate [VENTURE] as a problem-oriented venture record, not as a pitch narrative. Treat its core claim, [CORE CLAIM], as unproven until source-bound evidence establishes who is involved, what exists, who uses it, how it works, and who bears the downside risk. Cross-link every named founder to public professional artifacts: official bio, public LinkedIn destination profile, GitHub, YouTube, podcast, publications, patents, prior startups, investor/advisor roles, and institutional affiliations. Hunt contradictions between venture marketing, founder profiles, program rosters, product docs, press, and primary artifacts. Demand evidence for founder relationships, product existence, technical feasibility, customer traction, funding, compliance posture, and revenue logic. Map likely failure modes across technical deployment, adoption, unit economics, legal exposure, privacy/security, founder governance, and dependency risk. Identify where prestige signals from Emory, accelerators, investors, or AI language may be laundering uncertainty. Separate facts, claims, suspicions, contradictions, and unknowns. Produce the strongest grounded bear case without inventing scandal or collecting private data, then name what could still be real or salvageable.
#source-bound-founder-graph-venture-problem-list
```

---

## 12. Workbook Architecture

The next workbook should use these tabs:

```text
00 Summary
01 Entity Index
02 Venture Case Files
03 Founder Cross-Link Profiles
04 Relationship Edges
05 Evidence Base
06 Claims Register
07 SOAPP Fits
08 Venture Problem List
09 Contradictions
10 Risk Register
11 Source Gap Report
12 Critique Genomes
13 Search and Probe Log
14 Safety Rejections
```

### 03 Founder Cross-Link Profiles

```text
Founder
Linked Venture
Claimed Role
Identity Confidence
Relationship Confidence
Official Bio URL
Company Team URL
LinkedIn Destination URL
GitHub URL
YouTube URL
Podcast URL
Publication URL
Patent URL
Speaker/Award URL
Prior Startup URLs
Related Organization URLs
Profile Facts Extracted
Venture Relationship Evidence
Ambiguity Flags
Forbidden Data Rejected
Next Probe
```

### 04 Relationship Edges

```text
Subject Entity
Predicate
Object Entity
Evidence URL
Evidence Type
Source Title
What It Supports
What It Does Not Establish
Confidence
State
Contradiction Flag
Next Probe
```

### 05 Evidence Base

```text
Evidence ID
Entity
Entity Type
URL
Domain
Source Type
Evidence Level
Title
Publisher
Captured At
Extracted Facts
Linked Claims
Linked Relationships
Privacy Status
Reliability Score
```

### 08 Venture Problem List

```text
Problem ID
Venture
Problem Type
Title
Severity
State
Evidence Links
Why It Matters
Risk If Wrong
Next Probe
```

---

## 13. Diligence Frames

Apply a frame based on venture type.

```yaml
ai_startup:
  required_checks:
    - model dependency
    - data source
    - evaluation metrics
    - hallucination risk
    - human-in-loop
    - privacy/security exposure
    - cost to serve
    - workflow integration
    - incumbent feature risk

healthtech:
  required_checks:
    - clinical claim boundary
    - HIPAA or privacy exposure
    - FDA/device exposure
    - patient harm risk
    - provider workflow
    - validation evidence

student_venture:
  required_checks:
    - student affiliation
    - venture affiliation
    - founder role proof
    - program participation
    - venture continuity
    - public profile match
    - stale-source risk

marketplace:
  required_checks:
    - demand side
    - supply side
    - liquidity
    - take rate
    - disintermediation
    - trust and safety
    - CAC and retention

fintech:
  required_checks:
    - money movement
    - custody
    - lending/securities exposure
    - fraud risk
    - bank partner dependency
    - consumer protection
```

---

## 14. Capture Policy

Use bounded expansion.

```yaml
capture_policy:
  max_sources_per_entity: 25
  target_sources_per_entity: 10
  max_search_depth: 2
  max_related_entities_per_source: 20
  max_claims_per_source: 50
  no_padding: true
  no_private_data: true
  no_login_bypass: true
  no_paywall_bypass: true
  no_raw_search_urls_as_evidence: true
```

Search depth:

```text
Depth 0: workbook seed
Depth 1: destination pages directly naming entity
Depth 2: related founder/org/startup pages linked from Depth 1 or found by exact query
Stop: no more direct public entity match, private boundary, same-name ambiguity, or target reached
```

---

## 15. Quickcheck

Before accepting any record:

```text
Are all facts source-bound?
Are all founder relationships evidence-bound?
Are founder profiles disambiguated?
Are public profiles destination URLs, not search pages?
Are GitHub/YouTube/publication links attached to the right person?
Are same-name risks flagged?
Are stale sources marked?
Are missing layers listed?
Are contradictions preserved?
Are critique claims grounded?
Was private data excluded?
Are next probes specific?
```

If any answer is no, the record is not PROVIS-compliant.

---

## 16. Operating Mantra

```text
Do not make a startup card.
Make a venture problem record.

Do not trust the pitch.
Bind the claim.

Do not infer the founder.
Prove the relationship.

Do not repeat the same website forever.
Diversify the evidence stack.

Do not hide missing links.
Name the source gap.

Do not collect private dirt.
Stay public, professional, bounded, and traceable.

Do not summarize the venture.
Diagnose the record.
```
