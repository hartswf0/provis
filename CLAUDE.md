# CLAUDE.md

Guidance for Claude and other coding agents working in this repository.

## Project Identity

PROVIS is **electronic medical records for ventures**.

Expanded name:

```text
Problem-Oriented Venture Information System
```

PROVIS converts public-source venture traces into auditable case files for startups, founders, claims, relationships, risks, contradictions, and unresolved evidence gaps.

The design lineage is:

```text
PROMIS / POMR -> PROVIS -> PROVISGRID -> PROVISDECK -> DECKPRESS
```

The system should feel like a problem-oriented medical record translated into venture diligence.

## Core Law

Do not weaken these rules:

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

The top-level gallery is:

```text
index.html
```

The product documentation landing page is:

```text
outputs/provis-product-stack/index.html
```

Main generated demos:

```text
outputs/provis-product-stack/provis.html
outputs/provis-product-stack/provisgrid.html
outputs/provis-product-stack/provisdeck.html
outputs/provis-product-stack/provis-plus.html
outputs/provis-product-stack/provis-glass.html
outputs/provis-product-stack/provis-glass-loop.html
outputs/provis-product-stack/deckpress.html
outputs/provis-mobile-index/index.html
```

Current best mobile MVP:

```text
outputs/provis-product-stack/provis-glass-loop.html
```

It should stay centered on:

```text
one selected entity
one current edge
one evidence packet
one next move
one trace
```

Persistent navigation should remain minimal:

```text
CASE / THREAD / MOVE
```

Entity library, sources, packet, edge, problems, probe, and trace belong in linked drawers, not extra permanent tabs.

## Source Data

Primary real-data outputs:

```text
outputs/provis-product-stack/provis-204-casedex.json
outputs/provis-product-stack/provisgrid-rows.json
outputs/provis-product-stack/provisdeck-cards.json
outputs/provis-product-stack/provis-204-casecards.json
outputs/provis-product-stack/provis-trace-rows.json
outputs/provis-venture-json/PROVIS-21-venture-records.json
```

Workbook artifacts:

```text
outputs/provis-real-data-only/PROVIS-real-data-only.xlsx
outputs/provis-real-link-dd/PROVIS-real-link-due-diligence-batch3.xlsx
outputs/provis-204-expanded-real-links/PROVIS-204-entity-real-link-expansion.xlsx
```

## Build Commands

Rebuild the product stack:

```bash
node build_provis_product_stack.mjs
```

Rebuild the reduced mobile loop:

```bash
node build_provis_glass_loop.mjs
```

Rebuild the root iframe gallery:

```bash
node build_top_level_index.mjs
```

Before finishing code changes, run at least:

```bash
node --check build_provis_product_stack.mjs
node --check build_provis_glass_loop.mjs
node --check build_top_level_index.mjs
```

Then run the relevant build command and validate generated HTML scripts if the change touches generated pages.

## Interface Direction

Prefer:

```text
less chrome
more epistemic state
hyperlinked objects
compact cards
source-bound claims
drawer-based detail
mobile-first steering
```

Avoid:

```text
dashboard sprawl
decorative gradients
large search-first home screens
too many bottom-nav destinations
form-filling clutter
toy game framing
generic startup-card design
unsupported claims
```

PROVIS should behave like a mobile hypertext case file controlled by agent packets.

The strongest flow is:

```text
Problem -> Entity -> Edge -> Packet -> Source -> Probe -> Trace
```

Every visible object should either open a source, bind evidence, expose a problem, launch a probe, show trace, or change state.

## Agent System

Agent roles:

```text
Scout      finds public destination URLs
Guard      blocks private / forbidden / illegitimate capture
Binder     attaches source, support, limit, confidence, trace
Linker     tests relationship edges without name-similarity shortcuts
Critic     turns gaps and contradictions into named problems
Sagan      downgrades unsupported AI / deeptech claims
Mencius    maps customer harm and governance downside
Meitner    finds hidden actors and prestige laundering
Archimedes reduces claims to minimum proof tests
Heisenberg forks ambiguity instead of forcing certainty
Compiler   packages verified objects into case files
```

Agent output should be packetized:

```text
CLAIM:
SOURCE:
LEVEL:
CONFIDENCE:
SUPPORTS:
DOES NOT ESTABLISH:
PROBLEM:
NEXT PROBE:
TRACE:
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

## Editing Notes

- Generated HTML is intentionally self-contained.
- Prefer editing the build scripts over hand-editing generated HTML when a page is generated.
- Keep `README.md`, `CLAUDE.md`, and `outputs/provis-product-stack/index.html` aligned on product language.
- Preserve the 204-entity Casedex and 120-card PROVISDECK constraints unless the user explicitly changes them.
- If adding a new HTML demo, update `build_top_level_index.mjs` or regenerate `index.html` so the demo appears in the top-level gallery.

## Mantra

```text
Catch the source.
Name the claim.
Bind the evidence.
Expose the problem.
Choose the probe.
Preserve the trace.
Export the case.
```
