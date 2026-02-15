#!/usr/bin/env node
/**
 * add-seo-ads.js
 * Adds Article schema JSON-LD and ad slots to content pages.
 * Run: node scripts/add-seo-ads.js
 */

const fs = require('fs');
const path = require('path');

const BASE = path.join(__dirname, '..');
const PAGES = [
  { file: 'how-your-mind-works.html', dir: '', title: 'How Your Mind Works', desc: 'Explore how personality and thinking style shape the way your mind processes decisions, patterns, and collaboration. A clear, non-clinical overview.' },
  { file: 'thinking-style-explained.html', dir: '', title: 'Thinking Style Explained', desc: 'What thinking style means: patterns, strategy, and how you prefer to process information. A clear overview.' },
  { file: 'personality-vs-thinking-style.html', dir: '', title: 'Personality vs Thinking Style', desc: 'How personality and thinking style differ and interact. A clear overview.' },
  { file: 'what-is-cognitive-style.html', dir: '', title: 'What Is Cognitive Style', desc: 'Cognitive style describes how you prefer to process information. A clear overview.' },
  { file: 'decision-making-and-personality.html', dir: '', title: 'Decision-Making and Personality', desc: 'How personality shapes how you make decisions. A clear overview.' },
  { file: 'curious-vs-disciplined-minds.html', dir: '', title: 'Curious vs Disciplined Minds', desc: 'The tension between exploration and closure. A clear overview.' },
  { file: 'openness.html', dir: 'traits/', title: 'Understanding High Openness', desc: 'What high openness means: curiosity, exploration, and openness to new ideas. A clear look at this trait.' },
  { file: 'conscientiousness.html', dir: 'traits/', title: 'Understanding High Conscientiousness', desc: 'What high conscientiousness means: discipline, planning, and follow-through. A clear look at this trait.' },
  { file: 'extraversion.html', dir: 'traits/', title: 'Understanding High Extraversion', desc: 'What high extraversion means: social energy, group engagement, and where you get energy. A clear look at this trait.' },
  { file: 'agreeableness.html', dir: 'traits/', title: 'Understanding High Agreeableness', desc: 'What high agreeableness means: cooperation, harmony, and consideration. A clear look at this trait.' },
  { file: 'emotional-stability.html', dir: 'traits/', title: 'Understanding Emotional Stability', desc: 'What emotional stability means: how you experience and regulate emotional reactions. A clear look.' },
  { file: 'analytical-thinking.html', dir: 'traits/', title: 'Understanding Analytical Thinking', desc: 'What analytical thinking means: patterns, structure, and step-by-step reasoning. A clear look.' },
  { file: 'creative-thinking.html', dir: 'traits/', title: 'Understanding Creative Thinking', desc: 'What creative thinking means: idea generation, novelty, and exploration. A clear look.' },
  { file: 'strategic-thinking.html', dir: 'traits/', title: 'Understanding Strategic Thinking', desc: 'What strategic thinking means: planning ahead, weighing options, and tolerating uncertainty. A clear look.' },
  { file: 'intuitive-thinking.html', dir: 'traits/', title: 'Understanding Intuitive Thinking', desc: 'What intuitive thinking means: gut feel, pattern recognition, and rapid judgment. A clear look.' },
  { file: 'detail-oriented.html', dir: 'traits/', title: 'Understanding Detail-Oriented Thinking', desc: 'What detail-oriented thinking means: precision, specifics, and accuracy. A clear look.' },
  { file: 'strategic-and-analytical.html', dir: 'trait-combinations/', title: 'Strategic and Analytical: A Trait Combination', desc: 'What it means to be strategic and analytical: planning ahead, weighing options, and processing information through structure.' },
  { file: 'creative-and-intuitive.html', dir: 'trait-combinations/', title: 'Creative and Intuitive: A Trait Combination', desc: 'What it means to be creative and intuitive: idea generation, pattern recognition, and comfort with gut feel.' },
  { file: 'analytical-but-introverted.html', dir: 'trait-combinations/', title: 'Analytical but Introverted: A Trait Combination', desc: 'What it means to be analytical but introverted: pattern-based thinking with preference for quieter environments.' },
  { file: 'high-openness-low-conscientiousness.html', dir: 'trait-combinations/', title: 'High Openness, Low Conscientiousness: A Trait Combination', desc: 'What it means to have high openness and lower conscientiousness: curiosity and exploration with less emphasis on routine.' },
  { file: 'strategic-planner.html', dir: 'work-styles/', title: 'Strategic Planner Work Style', desc: 'The strategic planner work style: planning ahead, weighing options, and bringing structure to complex projects.' },
  { file: 'independent-thinker.html', dir: 'work-styles/', title: 'Independent Thinker Work Style', desc: 'The independent thinker work style: autonomy, deep focus, and preference for working through problems alone.' },
  { file: 'collaborative-builder.html', dir: 'work-styles/', title: 'Collaborative Builder Work Style', desc: 'The collaborative builder work style: drawing energy from teamwork and building value through connection.' },
  { file: 'deep-focus-worker.html', dir: 'work-styles/', title: 'Deep Focus Worker Work Style', desc: 'The deep focus worker style: sustained concentration and preference for uninterrupted blocks of time.' },
  { file: 'analytical-partner.html', dir: 'relationship-styles/', title: 'Analytical Partner Relationship Style', desc: 'The analytical partner relationship style: preference for clear communication, logical discussion, and structure.' },
  { file: 'emotional-partner.html', dir: 'relationship-styles/', title: 'Emotional Partner Relationship Style', desc: 'The emotional partner relationship style: attunement to feelings and connection through shared experience.' },
  { file: 'independent-partner.html', dir: 'relationship-styles/', title: 'Independent Partner Relationship Style', desc: 'The independent partner relationship style: valuing autonomy, space for solitude, and connection that respects separate interests.' },
];

function getCanonicalPath(p) {
  const rel = p.dir ? p.dir + p.file : p.file;
  return 'https://mindpulseprofile.com/' + rel.replace(/\/\//g, '/');
}

const SCHEMA_TEMPLATE = (title, desc, url) => `
  <script type="application/ld+json">
  {"@context":"https://schema.org","@type":"Article","headline":"${title.replace(/"/g, '\\"')}","description":"${desc.replace(/"/g, '\\"')}","url":"${url}","datePublished":"2025-02-10","dateModified":"2025-02-10","author":{"@type":"Organization","name":"MindPulseProfile"},"publisher":{"@type":"Organization","name":"MindPulseProfile"}}
  </script>
`;

const AD_AFTER_INTRO = '\n      <div class="content-ad-slot" data-position="after-intro" aria-label="Advertisement"></div>\n\n';
const AD_BETWEEN = '\n      <div class="content-ad-slot" data-position="between-sections" aria-label="Advertisement"></div>\n\n';
const AD_BEFORE_CTA = '\n      <div class="content-ad-slot" data-position="before-cta" aria-label="Advertisement"></div>\n      ';

function processFile(p) {
  const fp = path.join(BASE, p.dir, p.file);
  if (!fs.existsSync(fp)) return;
  let html = fs.readFileSync(fp, 'utf8');

  const url = getCanonicalPath(p);

  // Add Article schema if not present
  if (!html.includes('"@type":"Article"') && !html.includes('"@type": "Article"')) {
    const insertAfter = html.indexOf('</head>');
    const schema = SCHEMA_TEMPLATE(p.title, p.desc, url);
    html = html.slice(0, insertAfter) + schema + html.slice(insertAfter);
  }

  // Add ad after intro (after first h1) if not present
  if (!html.includes('data-position="after-intro"')) {
    const h1Match = html.match(/<h1>[^<]+<\/h1>\s*\n/);
    if (h1Match) {
      const idx = html.indexOf(h1Match[0]) + h1Match[0].length;
      html = html.slice(0, idx) + AD_AFTER_INTRO + html.slice(idx);
    }
  }

  // Add ad between sections (before Potential Friction or similar) if not present
  if (!html.includes('data-position="between-sections"')) {
    const markers = ['<h2>Potential Friction Points</h2>', '<h2>Common Blind Spots</h2>', '<h2>Potential Friction</h2>'];
    for (const m of markers) {
      if (html.includes(m)) {
        html = html.replace(m, AD_BETWEEN + m);
        break;
      }
    }
  }

  // Add ad before CTA if not present
  if (!html.includes('data-position="before-cta"')) {
    html = html.replace('<section class="cta-section">', AD_BEFORE_CTA + '<section class="cta-section">');
  }

  fs.writeFileSync(fp, html);
  console.log('Updated', p.dir + p.file);
}

PAGES.forEach(processFile);
console.log('Done.');
