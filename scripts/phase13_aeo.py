#!/usr/bin/env python3
"""Phase 13 AEO: Organization before </body>, semantic paragraph, Article author, Speakable on cornerstone."""
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

ORG_MARKER = "MindPulseProfile entity (Phase 13)"

ORG_SCRIPT = f"""<!-- {ORG_MARKER} -->
<script type="application/ld+json">
{{
 "@context": "https://schema.org",
 "@type": "Organization",
 "name": "MindPulseProfile",
 "url": "https://mindpulseprofile.com",
 "parentOrganization": {{
   "@type": "Organization",
   "name": "Albor Digital LLC",
   "address": {{
     "@type": "PostalAddress",
     "addressRegion": "Wyoming",
     "addressCountry": "US"
   }}
 }}
}}
</script>
"""

SPEAKABLE_SCRIPT = """<script type="application/ld+json">
{
 "@context": "https://schema.org",
 "@type": "WebPage",
 "speakable": {
   "@type": "SpeakableSpecification",
   "cssSelector": [".snippet-answer", ".direct-answer"]
 }
}
</script>
"""

LD_PATTERN = re.compile(
    r'(<script type="application/ld\+json">\s*)(.*?)(\s*</script>)',
    re.DOTALL,
)

SEMANTIC_RULES = [
    ("traits/", "Trait dimensions, personality tendencies, and cognitive patterns connect on this page. Analytical thinking, intuitive processing, strategic planning, and creative exploration are related ways people differ in how they approach problems and decisions."),
    ("comparisons/", "Comparing thinking styles clarifies how people differ on the same dimension. Cognitive style, decision speed, and communication patterns often cluster in predictable ways."),
    ("trait-combinations/", "Trait combinations show how multiple tendencies interact. Behavioral frameworks, thinking habits, and decision-making styles combine into recognizable profiles."),
    ("relationship-styles/", "Relationship and communication patterns reflect cognitive style. Emotional processing, conflict approach, and alignment preferences vary by thinking pattern."),
    ("work-styles/", "Work style describes how people execute and collaborate. Structured problem-solving, flexible iteration, deep focus, and strategic planning are common dimensions."),
    ("cognitive-styles-", "Team context shapes how cognitive styles show up. Decision-making, collaboration norms, and role boundaries affect analytical, creative, strategic, and intuitive patterns."),
    ("cognitive-style-matrix", "The matrix maps cognitive styles across dimensions. Analytical reasoning, creative thinking, strategic planning, and intuitive judgment are four high-level patterns."),
    ("cognitive-misalignment", "Misalignment happens when styles clash without being named. Clear communication, role clarity, and shared vocabulary reduce friction between thinking patterns."),
    ("author/", "Author and publisher identity support consistent attribution. MindPulseProfile (by Albor Digital LLC) publishes cognitive modeling and behavioral framework content."),
]

DEFAULT_SEMANTIC = (
    "Cognitive style, thinking patterns, behavioral frameworks, and decision-making approaches are closely related topics on this page. "
    "MindPulseProfile (by Albor Digital LLC) uses consistent definitions across its knowledge base."
)


def semantic_for_path(rel: str) -> str:
    rel = rel.replace("\\", "/")
    for prefix, text in SEMANTIC_RULES:
        if prefix in rel:
            return text
    return DEFAULT_SEMANTIC


def inject_article_author(html: str) -> str:
    def repl_block(m):
        open_tag, body, close_tag = m.group(1), m.group(2), m.group(3)
        raw = body.strip()
        try:
            data = json.loads(raw)
        except json.JSONDecodeError:
            return m.group(0)
        if not isinstance(data, dict) or data.get("@type") != "Article":
            return m.group(0)
        if "author" in data:
            return m.group(0)
        data["author"] = {
            "@type": "Person",
            "name": "Gustavo Aragones",
            "url": "https://mindpulseprofile.com/author/gustavo-aragones/",
        }
        new_body = json.dumps(data, ensure_ascii=False, indent=2)
        return f'{open_tag}\n{new_body}\n  {close_tag}'

    return LD_PATTERN.sub(repl_block, html)


def add_org_before_body(html: str) -> str:
    if ORG_MARKER in html:
        return html
    if "</body>" not in html:
        return html
    return html.replace("</body>", ORG_SCRIPT + "\n</body>", 1)


def add_semantic_in_main(html: str, rel: str) -> str:
    if 'class="semantic-reinforcement"' in html:
        return html
    para = f'      <p class="semantic-reinforcement">{semantic_for_path(rel)}</p>\n'
    needle = "    </div>\n  </main>"
    if needle not in html:
        return html
    idx = html.rfind(needle)
    if idx == -1:
        return html
    return html[:idx] + para + html[idx:]


def add_speakable_in_head(html: str, rel: str) -> str:
    rel = rel.replace("\\", "/")
    cornerstone = {
        "index.html",
        "what-is-cognitive-style.html",
        "thinking-style-explained.html",
        "how-your-mind-works.html",
        "personality-vs-thinking-style.html",
        "cognitive-style-matrix/index.html",
        "cognitive-misalignment/index.html",
        "methodology/index.html",
    }
    if rel not in cornerstone:
        return html
    if "SpeakableSpecification" in html:
        return html
    if "</head>" not in html:
        return html
    return html.replace("</head>", "  " + SPEAKABLE_SCRIPT + "\n</head>", 1)


def strip_duplicate_index_org(html: str, rel: str) -> str:
    """Remove pre-</body> Organization block from index if we add unified org at end — keep one with url."""
    if rel != "index.html":
        return html
    # Remove old Organization script before quiz scripts (lines 130-145 style)
    old = re.sub(
        r'<script type="application/ld\+json">\s*\{\s*"@context":\s*"https://schema\.org",\s*"@type":\s*"Organization",\s*"name":\s*"MindPulseProfile",\s*"parentOrganization":\s*\{[^}]+\}[^}]+\}\s*\}\s*</script>\s*',
        "",
        html,
        count=1,
        flags=re.DOTALL,
    )
    return old


def process_file(path: Path) -> bool:
    rel = str(path.relative_to(ROOT))
    text = path.read_text(encoding="utf-8")
    orig = text
    if rel == "index.html":
        text = strip_duplicate_index_org(text, rel)
    text = inject_article_author(text)
    text = add_semantic_in_main(text, rel)
    text = add_org_before_body(text)
    text = add_speakable_in_head(text, rel)
    if text != orig:
        path.write_text(text, encoding="utf-8")
        return True
    return False


def main():
    updated = []
    for path in sorted(ROOT.rglob("*.html")):
        if "node_modules" in str(path):
            continue
        if process_file(path):
            updated.append(str(path.relative_to(ROOT)))
    for u in updated:
        print("updated:", u)
    print("total:", len(updated))


if __name__ == "__main__":
    main()
