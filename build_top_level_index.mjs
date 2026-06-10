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
<style>
:root{--bg:#fff;--fg:#000;--line:#000;--soft:#f6f6f6;font-family:ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}
*{box-sizing:border-box}
html,body{margin:0;background:var(--bg);color:var(--fg)}
body{font-size:14px;line-height:1.28}
a{color:var(--fg);text-decoration:underline;text-decoration-thickness:2px;text-underline-offset:3px}
.top{position:sticky;top:0;z-index:10;display:flex;gap:0;overflow-x:auto;background:#fff;border-bottom:2px solid #000}
.top a{min-height:42px;padding:10px 12px;border-right:1px solid #000;font-size:11px;font-weight:950;text-transform:uppercase;white-space:nowrap}
main{width:min(100%,1280px);margin:0 auto;padding:10px}
.panel{border:2px solid #000;margin-bottom:10px}
.head{display:flex;justify-content:space-between;gap:10px;border-bottom:2px solid #000;padding:8px 10px;font-size:11px;font-weight:950;text-transform:uppercase}
.body{padding:10px}
h1,h2,p{margin:0}
h1{font-size:28px;line-height:1.02;max-width:860px}
.small{font-size:12px;max-width:880px}
.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(320px,1fr));gap:10px}
.demo{border:2px solid #000;background:#fff;min-width:0}
.demo-head{display:grid;grid-template-columns:1fr auto;gap:8px;align-items:start;border-bottom:1px solid #000;padding:8px}
.demo h2{font-size:17px;line-height:1.05}
.tag{border:1px solid #000;padding:3px 6px;font-size:10px;font-weight:950;text-transform:uppercase;white-space:nowrap}
.path{margin-top:5px;font:10px/1.2 ui-monospace,SFMono-Regular,Menlo,monospace;overflow-wrap:anywhere;color:#333}
.demo-body{padding:8px;display:grid;gap:8px}
.actions{display:flex;gap:8px;flex-wrap:wrap}
.actions a{border:1px solid #000;padding:7px 9px;font-size:11px;font-weight:950;text-transform:uppercase;text-decoration:none}
.frame-wrap{border:1px solid #000;background:#fff;height:360px;overflow:hidden}
iframe{display:block;width:100%;height:100%;border:0;background:#fff}
.note{font-size:11px;color:#333}
@media (max-width:760px){.grid{grid-template-columns:1fr}.frame-wrap{height:520px}h1{font-size:24px}}
</style>
</head>
<body>
<nav class="top">
  <a href="README.md">README</a>
  <a href="outputs/provis-product-stack/index.html">Landing</a>
  <a href="outputs/provis-product-stack/provis-glass-loop.html">Glass Loop</a>
  <a href="outputs/provis-product-stack/provisgrid.html">Grid</a>
  <a href="outputs/provis-product-stack/provisdeck.html">Deck</a>
  <a href="outputs/provis-product-stack/deckpress.html">Deckpress</a>
</nav>
<main>
  <section class="panel">
    <div class="head"><span>PROVIS Demo Index</span><span>${cards.length} HTML artifacts</span></div>
    <div class="body">
      <h1>Electronic medical records for ventures.</h1>
      <p class="small" style="margin-top:8px">Top-level index for every generated PROVIS HTML demo. Each artifact has a direct link and a live iframe preview.</p>
    </div>
  </section>
  <section class="grid">
    ${cards.map((card, index) => `<article class="demo">
      <div class="demo-head">
        <div>
          <h2>${esc(index + 1)}. ${esc(card.title)}</h2>
          <p class="path">${esc(card.file)}</p>
        </div>
        <span class="tag">${esc(card.type)}</span>
      </div>
      <div class="demo-body">
        <p class="small">${esc(card.summary)}</p>
        <div class="actions">
          <a href="${esc(card.file)}">Open</a>
          <a href="${esc(card.file)}" target="_blank" rel="noreferrer">New Tab</a>
        </div>
        <div class="frame-wrap">
          <iframe title="${esc(card.title)} preview" src="${esc(card.file)}" loading="lazy" sandbox="allow-scripts allow-same-origin allow-forms allow-popups"></iframe>
        </div>
      </div>
    </article>`).join("")}
  </section>
  <section class="panel" style="margin-top:10px">
    <div class="head"><span>Boundary</span><span>source-bound</span></div>
    <div class="body">
      <p class="note">PROVIS demos use public-source venture evidence only. No private dirt, no raw search URLs as evidence, no name-similarity edges, no unsupported critique.</p>
    </div>
  </section>
</main>
</body>
</html>`;

await fs.writeFile(path.join(cwd, "index.html"), html);
console.log(JSON.stringify({ index: path.join(cwd, "index.html"), htmlFiles: cards.length }, null, 2));
