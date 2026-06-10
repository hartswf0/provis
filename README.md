# PROVIS

**Electronic medical records for ventures.**

PROVIS is a **Problem-Oriented Venture Information System**. It converts public-source venture traces into auditable case files for startups, founders, claims, relationships, risks, contradictions, and unresolved evidence gaps.

Venture intelligence with provenance.

## What It Is

PROVIS is inspired by PROMIS and the Problem-Oriented Medical Record.

PROMIS changed medicine by forcing clinical data, notes, diagnoses, and interventions to attach to medical problems. PROVIS applies the same discipline to venture intelligence.

Where medicine asks:

```text
What problem does this symptom belong to?
```

PROVIS asks:

```text
What venture problem does this claim belong to?
```

The result is a system that treats startup research not as collection, but as diagnosis.

## Product Definition

```text
PROVIS = problem-oriented, source-bound venture intelligence infrastructure.
```

It is built for investors, accelerators, universities, entrepreneurs, technical analysts, and ecosystem builders who need to know what the public record actually supports.

PROVIS is not trying to be Crunchbase, PitchBook, LinkedIn, a CRM, a lead scraper, a founder surveillance tool, a pitch-deck summarizer, or a generic AI research assistant.

It is closer to a due-diligence knowledge graph, evidence register, contradiction tracker, and problem-oriented case-file engine.

## Core Law

```text
No claim without a source.
No edge without evidence.
No founder relationship from proximity.
No raw search URL as final evidence.
No uncertainty hidden.
No contradiction erased.
No private dirt.
No invented people, ventures, links, or affiliations.
```

## Product Stack

Open the top-level demo gallery:

[index.html](/Users/gaia/Documents/Codex/2026-06-10/files-mentioned-by-the-user-provis/index.html)

Open the product documentation landing page:

[outputs/provis-product-stack/index.html](/Users/gaia/Documents/Codex/2026-06-10/files-mentioned-by-the-user-provis/outputs/provis-product-stack/index.html)

The stack:

```text
PROVIS      = ontology and operating language
PROVISGRID  = board / interface over the 204-entity Casedex
PROVISDECK  = playable language for source, claim, edge, problem, probe, trace
PROVIS PLUS = agent prompt cockpit and POML system branch
PROVIS GLASS = mobile second-brain interface branch
GLASS LOOP  = reduced mobile MVP: CASE / THREAD / MOVE
DECKPRESS   = printable and mobile artifact generator
```

## Start Path

1. Open `index.html` for the top-level gallery with links and iframe previews for every HTML demo.
2. Open `outputs/provis-product-stack/index.html` for product doctrine and documentation.
3. Start with `GLASS LOOP` for the reduced mobile operator experience.
4. Use `PROVISGRID` to inspect all 204 real entities and evidence rows.
5. Use `PROVISDECK` to inspect the card grammar.
6. Use `DECKPRESS` for mobile viewing, print layouts, JSON, and CSV export.

## Shared Vocabulary

Feature names:

```text
Source Base          captured public destination sources
Venture Field        bounded evidence environment around a venture
Claim Register       structured inventory of claims
Founder Graph        source-backed founder relationship network
Relationship Edges   subject / predicate / object links with evidence
Problem List         organizing spine of unresolved venture issues
SOAPP Fits           Source, Observation, Assessment, Problem, Probe
Trace Log            immutable audit history
Source Gap Report    named missing evidence layer
Bear Case Diagnosis  strongest grounded critique
Quickcheck           final compliance checklist
```

Core objects:

```text
FIELD
FORM
FIT
TRACE
SOURCE
CLAIM
EDGE
PROBLEM
PROBE
RISK
CONTRADICTION
UNCERTAINTY
BOUNDARY
AGENT
COMMAND
DIAGNOSIS
```

## What PROVIS Preserves

PROVIS helps programs understand their ventures as living evidence fields, not static directory listings. It preserves source gaps, founder ambiguity, stale pages, public proof requirements, technical overstatements, and unresolved founder relationships.

PROVIS helps founders identify where their public record is strong, where it is confusing, and where investors may ask for proof. It turns vague scrutiny into a clear list of fixable evidence gaps.

PROVIS helps business teams move beyond pitch language and scattered web research. It turns public sources into structured case files that reveal what is proven, what is claimed, what is risky, and what still needs verification.

## Brand Position

Category:

```text
Venture intelligence infrastructure
```

Subcategory:

```text
Problem-oriented, source-bound due-diligence system
```

Positioning:

```text
For investors, accelerators, universities, operators, founders, and technical analysts who need to evaluate ventures responsibly, PROVIS is a source-bound venture intelligence system that turns public startup evidence into auditable case files.
```

Competitive frame:

```text
Unlike startup directories, CRMs, lead scrapers, or pitch-deck summarizers, PROVIS preserves uncertainty, requires provenance, binds claims to sources, and makes contradictions part of the record.
```

Voice:

```text
Forensic.
Operational.
Skeptical.
Bounded.
Traceable.
Direct.
Calmly adversarial.
```

## Data Boundary

PROVIS is public, professional, and bounded.

Professional risk is allowed. Private dirt is not.

Forbidden:

```text
private emails
private phone numbers
home addresses
family information
protected attributes
private social posts
leaked data
login-gated material
paywall bypass
raw search URLs as evidence
name-similarity edges
unsupported critique
```

## Generated Artifacts

Main demos:

- [Top-Level Demo Index](index.html)
- [PROVIS landing / docs](outputs/provis-product-stack/index.html)
- [PROVIS ontology](outputs/provis-product-stack/provis.html)
- [PROVISGRID](outputs/provis-product-stack/provisgrid.html)
- [PROVISDECK](outputs/provis-product-stack/provisdeck.html)
- [PROVIS PLUS](outputs/provis-product-stack/provis-plus.html)
- [PROVIS GLASS](outputs/provis-product-stack/provis-glass.html)
- [GLASS LOOP](outputs/provis-product-stack/provis-glass-loop.html)
- [DECKPRESS](outputs/provis-product-stack/deckpress.html)

Data:

- [204 Casedex JSON](outputs/provis-product-stack/provis-204-casedex.json)
- [204 CASE Cards JSON](outputs/provis-product-stack/provis-204-casecards.json)
- [Core Deck JSON](outputs/provis-product-stack/provisdeck-cards.json)
- [Grid Rows JSON](outputs/provis-product-stack/provisgrid-rows.json)
- [Trace Rows JSON](outputs/provis-product-stack/provis-trace-rows.json)
- [21 Venture Records JSON](outputs/provis-venture-json/PROVIS-21-venture-records.json)

Workbooks:

- [Real Data Workbook](outputs/provis-real-data-only/PROVIS-real-data-only.xlsx)
- [Real-Link Due Diligence Workbook](outputs/provis-real-link-dd/PROVIS-real-link-due-diligence-batch3.xlsx)
- [204 Real-Link Expansion Workbook](outputs/provis-204-expanded-real-links/PROVIS-204-entity-real-link-expansion.xlsx)

## Rebuild

Generate the product stack:

```bash
node build_provis_product_stack.mjs
```

Generate the reduced mobile loop:

```bash
node build_provis_glass_loop.mjs
```

## Mantra

```text
Startup diligence is full of claims.
PROVIS turns them into records.

Catch the source.
Name the claim.
Bind the evidence.
Expose the problem.
Choose the probe.
Preserve the trace.
Export the case.
```
