import fs from "node:fs/promises";
import path from "node:path";

const cwd = process.cwd();
const outputsDir = path.join(cwd, "outputs");

async function walk(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) files.push(...await walk(full));
    if (entry.isFile() && entry.name.endsWith(".html")) files.push(full);
  }
  return files;
}

function esc(value) {
  return String(value ?? "").replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  }[char]));
}

const copy = {
  "outputs/provis-product-stack/index.html": {
    title: "PROVIS Landing",
    type: "Docs",
    summary: "Electronic medical records for ventures: doctrine, start path, demos, data, artifacts."
  },
  "outputs/provis-product-stack/provis-glass-loop.html": {
    title: "GLASS LOOP",
    type: "Mobile MVP",
    summary: "Reduced CASE / THREAD / MOVE cockpit with linked drawers over all 204 real entities."
  },
  "outputs/provis-product-stack/provisgrid.html": {
    title: "PROVISGRID",
    type: "Casedex",
    summary: "204-entity evidence board with actual source rows, gaps, probes, and trace fields."
  },
  "outputs/provis-product-stack/provisdeck.html": {
    title: "PROVISDECK",
    type: "Card Language",
    summary: "Core 120-card PROVIS language plus 204 CASE expansion cards."
  },
  "outputs/provis-product-stack/deckpress.html": {
    title: "DECKPRESS",
    type: "Print / Mobile",
    summary: "Mobile viewer, print fronts, print backs, checklist, JSON, CSV, and 204 Casedex cards."
  },
  "outputs/provis-product-stack/provis-plus.html": {
    title: "PROVIS PLUS",
    type: "Agent Prompt System",
    summary: "Prompt-system branch for Scout, Guard, Binder, Linker, Critic, explorer agents, and Compiler."
  },
  "outputs/provis-product-stack/provis-glass.html": {
    title: "PROVIS GLASS",
    type: "Mobile Branch",
    summary: "Pinned entity, local map, thread, evidence, move surface, agentdeck, and element index."
  },
  "outputs/provis-product-stack/provis.html": {
    title: "PROVIS Ontology",
    type: "Ontology",
    summary: "F4 primitives, laws, shared objects, evidence levels, states, moves, and boundaries."
  },
  "outputs/provis-mobile-index/index.html": {
    title: "Mobile Index",
    type: "Alternate Entry",
    summary: "Mobile-facing mirror of the product landing page with relative links into the stack."
  }
};

const preferred = [
  "outputs/provis-product-stack/index.html",
  "outputs/provis-product-stack/provis-glass-loop.html",
  "outputs/provis-product-stack/provisgrid.html",
  "outputs/provis-product-stack/provisdeck.html",
  "outputs/provis-product-stack/deckpress.html",
  "outputs/provis-product-stack/provis-plus.html",
  "outputs/provis-product-stack/provis-glass.html",
  "outputs/provis-product-stack/provis.html",
  "outputs/provis-mobile-index/index.html"
];

const htmlFiles = (await walk(outputsDir))
  .map((file) => path.relative(cwd, file).replaceAll(path.sep, "/"))
  .sort((a, b) => {
    const ai = preferred.indexOf(a);
    const bi = preferred.indexOf(b);
    if (ai !== -1 || bi !== -1) return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi);
    return a.localeCompare(b);
  });

const cards = htmlFiles.map((file) => {
  const meta = copy[file] || {
    title: path.basename(file, ".html"),
    type: "HTML",
    summary: "Generated PROVIS HTML artifact."
  };
  return { file, ...meta };
});

const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>PROVIS Demo Index</title>
<link rel="icon" href="favicon.svg" type="image/svg+xml">
<style>
:root {
  --bg: #fff;
  --fg: #111;
  --muted: #777;
  --line: #e8e8e8;
  --soft: #f7f7f7;
  font-family:
    ui-sans-serif,
    system-ui,
    -apple-system,
    BlinkMacSystemFont,
    "Segoe UI",
    sans-serif;
}
* { box-sizing: border-box; }
html, body { margin: 0; background: var(--bg); color: var(--fg); }
body { font-size: 15px; line-height: 1.4; }
a { color: inherit; }
nav {
  position: sticky;
  top: 0;
  z-index: 10;
  display: flex;
  gap: 2px;
  overflow-x: auto;
  padding: 8px;
  background: rgba(255,255,255,.94);
  border-bottom: 1px solid var(--line);
  backdrop-filter: blur(10px);
}
nav a {
  flex: 0 0 auto;
  padding: 6px 9px;
  border-radius: 8px;
  color: var(--muted);
  font-size: 12px;
  font-weight: 600;
  text-decoration: none;
  white-space: nowrap;
}
nav a:hover { background: var(--soft); color: var(--fg); }
main {
  width: min(100%, 1120px);
  margin: 0 auto;
  padding: 0 16px 40px;
}
h1, h2, p { margin: 0; }
.hero {
  min-height: 42vh;
  display: flex;
  flex-direction: column;
  justify-content: center;
  padding: 52px 0 40px;
  border-bottom: 1px solid var(--line);
  margin-bottom: 18px;
}
.mark {
  width: 42px;
  height: 42px;
  margin-bottom: 18px;
}
.eyebrow {
  margin-bottom: 12px;
  color: var(--muted);
  font-size: 12px;
  font-weight: 750;
  letter-spacing: .14em;
}
h1 {
  max-width: 800px;
  font-size: clamp(44px, 8vw, 92px);
  line-height: .88;
  letter-spacing: -0.08em;
}
.lede {
  max-width: 620px;
  margin-top: 18px;
  color: var(--muted);
  font-size: clamp(16px, 2vw, 19px);
  line-height: 1.35;
}
.hero-actions {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
  margin-top: 24px;
}
.hero-actions a {
  display: inline-flex;
  align-items: center;
  min-height: 38px;
  padding: 8px 13px;
  border-radius: 9px;
  background: var(--fg);
  color: #fff;
  font-size: 13px;
  font-weight: 700;
  text-decoration: none;
}
.hero-actions a + a { background: var(--soft); color: var(--fg); }
.grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
  gap: 14px;
}
.demo {
  overflow: hidden;
  border: 1px solid var(--line);
  border-radius: 14px;
  background: #fff;
}
.info { padding: 14px; }
.demo h2 {
  font-size: 18px;
  line-height: 1.1;
  letter-spacing: -0.03em;
}
.path {
  margin-top: 6px;
  color: var(--muted);
  font: 11px/1.35 ui-monospace, SFMono-Regular, Menlo, monospace;
  overflow-wrap: anywhere;
}
.desc {
  margin-top: 12px;
  color: var(--muted);
  font-size: 14px;
}
.actions {
  display: flex;
  gap: 8px;
  margin-top: 14px;
}
.actions a {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 32px;
  padding: 6px 11px;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 650;
  text-decoration: none;
}
.actions a:first-child { background: var(--fg); color: #fff; }
.actions a:last-child { background: var(--soft); color: var(--fg); }
.preview {
  height: 300px;
  border-top: 1px solid var(--line);
  background: #fff;
}
iframe {
  display: block;
  width: 100%;
  height: 100%;
  border: 0;
  background: #fff;
}
footer {
  margin-top: 22px;
  padding-top: 14px;
  border-top: 1px solid var(--line);
  color: var(--muted);
  font-size: 13px;
}
@media (max-width: 760px) {
  main { padding: 0 12px 32px; }
  .hero { min-height: auto; padding: 40px 0 30px; }
  .grid { grid-template-columns: 1fr; }
  .preview { height: 440px; }
}
</style>
</head>
<body>
<nav>
  <a href="README.md">README</a>
  <a href="outputs/provis-product-stack/index.html">Landing</a>
  <a href="outputs/provis-product-stack/provis-glass-loop.html">Glass Loop</a>
  <a href="outputs/provis-product-stack/provisgrid.html">Grid</a>
  <a href="outputs/provis-product-stack/provisdeck.html">Deck</a>
  <a href="outputs/provis-product-stack/deckpress.html">Deckpress</a>
</nav>
<main>
  <header class="hero">
    <img class="mark" src="favicon.svg" alt="">
    <p class="eyebrow">PROVIS</p>
    <h1>Venture evidence, not venture theater.</h1>
    <p class="lede">
      Nine working demos for building source-bound case files: claims, gaps, risks, contradictions, traces.
    </p>
    <div class="hero-actions">
      <a href="outputs/provis-product-stack/index.html">Start with Landing</a>
      <a href="outputs/provis-product-stack/provisgrid.html">Open Evidence Grid</a>
    </div>
  </header>
  <section class="grid">
    ${cards.map((card, index) => `<article class="demo">
      <div class="info">
          <h2>${esc(index + 1)}. ${esc(card.title)}</h2>
          <p class="path">${esc(card.file)}</p>
        <p class="desc">${esc(card.summary)}</p>
        <div class="actions">
          <a href="${esc(card.file)}">Open</a>
          <a href="${esc(card.file)}" target="_blank" rel="noreferrer">New tab</a>
        </div>
      </div>
      <div class="preview">
        <iframe title="${esc(card.title)} preview" src="${esc(card.file)}" loading="lazy" sandbox="allow-scripts allow-same-origin allow-forms allow-popups"></iframe>
      </div>
    </article>`).join("")}
  </section>
  <footer>
    Public evidence only. No private dirt. No search URLs as proof. No guessed edges.
  </footer>
</main>
</body>
</html>`;

await fs.writeFile(path.join(cwd, "index.html"), html);
console.log(JSON.stringify({ index: path.join(cwd, "index.html"), htmlFiles: cards.length }, null, 2));
