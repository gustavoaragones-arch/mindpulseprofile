#!/usr/bin/env node
/**
 * generate-trait-pages.js
 * Programmatic template for scaling trait-based content.
 *
 * USAGE: Build 12 pages manually first. Audit. Deploy. Check Search Console.
 * Do NOT auto-generate hundreds immediately.
 *
 * This script generates combinations such as:
 * - Trait X + Work Style Y
 * - Trait X + Relationship Style Y
 * - Trait X in Leadership
 * - Trait X Under Stress
 *
 * Run with: node scripts/generate-trait-pages.js
 * Or: node scripts/generate-trait-pages.js --dry-run
 *
 * Output directory and combinations are configurable below.
 */

const fs = require('fs');
const path = require('path');

// Config: edit these before running
const CONFIG = {
  dryRun: process.argv.includes('--dry-run'),
  baseUrl: 'https://mindpulseprofile.com',
  outputDir: path.join(__dirname, '..', 'generated'),
  traits: [
    'openness', 'conscientiousness', 'extraversion', 'agreeableness', 'emotional-stability',
    'analytical-thinking', 'creative-thinking', 'strategic-thinking', 'intuitive-thinking', 'detail-oriented'
  ],
  workStyles: ['strategic-planner', 'independent-thinker', 'collaborative-builder', 'deep-focus-worker'],
  relationshipStyles: ['analytical-partner', 'emotional-partner', 'independent-partner'],
  maxCombinations: 12, // Limit for initial rollout
};

// Slug to display name
const TRAIT_NAMES = {
  openness: 'Openness',
  conscientiousness: 'Conscientiousness',
  extraversion: 'Extraversion',
  agreeableness: 'Agreeableness',
  'emotional-stability': 'Emotional Stability',
  'analytical-thinking': 'Analytical Thinking',
  'creative-thinking': 'Creative Thinking',
  'strategic-thinking': 'Strategic Thinking',
  'intuitive-thinking': 'Intuitive Thinking',
  'detail-oriented': 'Detail-Oriented',
};

const WORK_STYLE_NAMES = {
  'strategic-planner': 'Strategic Planner',
  'independent-thinker': 'Independent Thinker',
  'collaborative-builder': 'Collaborative Builder',
  'deep-focus-worker': 'Deep Focus Worker',
};

const RELATIONSHIP_STYLE_NAMES = {
  'analytical-partner': 'Analytical Partner',
  'emotional-partner': 'Emotional Partner',
  'independent-partner': 'Independent Partner',
};

function renderTraitWorkPage(trait, workStyle) {
  const traitName = TRAIT_NAMES[trait] || trait;
  const workName = WORK_STYLE_NAMES[workStyle] || workStyle;
  const title = `${traitName} and the ${workName} Work Style`;
  const slug = `trait-${trait}-work-${workStyle}`;
  const url = `${CONFIG.baseUrl}/generated/${slug}.html`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${title} — MindPulseProfile</title>
  <meta name="description" content="How ${traitName} shapes the ${workName} work style: strengths, blind spots, and career fit. A practical snapshot.">
  <link rel="canonical" href="${url}">
  <link rel="stylesheet" href="../styles.css">
  <link rel="stylesheet" href="../authority.css">
  <script type="application/ld+json">
  {"@context":"https://schema.org","@type":"Article","headline":"${title.replace(/"/g, '\\"')}","url":"${url}","datePublished":"2025-02-10","dateModified":"2025-02-10","author":{"@type":"Organization","name":"MindPulseProfile"},"publisher":{"@type":"Organization","name":"MindPulseProfile"}}
  </script>
</head>
<body>
  <nav class="site-nav authority-nav" aria-label="Main">
    <div class="content-wrap site-nav-inner">
      <a href="../index.html">Home</a>
      <a href="../index.html#quiz-container">Quiz</a>
      <a href="../index.html#how-heading">How It Works</a>
    </div>
  </nav>
  <main class="authority-main">
    <div class="content-wrap">
      <h1>${traitName} and the ${workName} Work Style</h1>
      <div class="content-ad-slot" data-position="after-intro" aria-label="Advertisement"></div>
      <p>This page explores how ${traitName} influences the ${workName} work style. See <a href="../traits/${trait}.html">${traitName}</a> and <a href="../work-styles/${workStyle}.html">${workName}</a> for more.</p>
      <div class="content-ad-slot" data-position="between-sections" aria-label="Advertisement"></div>
      <h2>Strengths</h2>
      <p>Content to be written or customized.</p>
      <h2>Potential Blind Spots</h2>
      <p>Content to be written or customized.</p>
      <div class="content-ad-slot" data-position="before-cta" aria-label="Advertisement"></div>
      <section class="cta-section">
        <h2>Discover Your Full Profile</h2>
        <a href="../index.html#quiz-container" class="cta">Take the Mind Snapshot</a>
      </section>
    </div>
  </main>
  <footer class="site-footer">
    <div class="content-wrap">
      <p>MindPulseProfile — How your mind works. No sign-ups. No tracking.</p>
      <nav class="footer-explore" aria-label="Explore more">
        <h3>Explore More</h3>
        <ul>
          <li><a href="../index.html">Home</a></li>
          <li><a href="../index.html#quiz-container">Take the Quiz</a></li>
          <li><a href="../traits/${trait}.html">${traitName}</a></li>
          <li><a href="../work-styles/${workStyle}.html">${workName}</a></li>
        </ul>
      </nav>
    </div>
  </footer>
</body>
</html>`;
}

function main() {
  const combinations = [];

  // Trait + Work Style combinations
  for (const trait of CONFIG.traits.slice(0, 3)) {
    for (const workStyle of CONFIG.workStyles.slice(0, 2)) {
      if (combinations.length >= CONFIG.maxCombinations) break;
      combinations.push({ type: 'trait-work', trait, workStyle });
    }
  }

  if (CONFIG.dryRun) {
    console.log('DRY RUN. Would generate:', combinations.length, 'pages');
    combinations.forEach((c, i) => console.log(`  ${i + 1}. ${c.trait} + ${c.workStyle || c.relationshipStyle}`));
    return;
  }

  fs.mkdirSync(CONFIG.outputDir, { recursive: true });

  for (const c of combinations) {
    let html, filename;
    if (c.type === 'trait-work') {
      html = renderTraitWorkPage(c.trait, c.workStyle);
      filename = `trait-${c.trait}-work-${c.workStyle}.html`;
    }
    const outPath = path.join(CONFIG.outputDir, filename);
    fs.writeFileSync(outPath, html, 'utf8');
    console.log('Wrote', outPath);
  }

  console.log('Done. Generated', combinations.length, 'pages. Review before deploying.');
}

main();
