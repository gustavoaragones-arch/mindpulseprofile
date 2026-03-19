#!/usr/bin/env python3
"""Insert Quick Answer + Key Takeaways + 3 short Q&A blocks where missing (Phase 13 micro-pass)."""
from __future__ import annotations

import re
from pathlib import Path
from typing import Optional

ROOT = Path(__file__).resolve().parents[1]

SKIP = {
    "contact/index.html",
    "privacy-policy/index.html",
    "terms-of-service/index.html",
    "about/index.html",
    "author/gustavo-aragones/index.html",
    "editorial-standards/index.html",
}


def qa_block_from_title(h1: str, kind: str) -> str:
    """kind: trait | comparison | hub"""
    t = re.sub(r"\s+", " ", h1).strip()
    if kind == "trait":
        short = re.sub(r"^Understanding (High )?", "", t)
        return f"""      <p class="snippet-answer">This page explains {short} as a tendency on MindPulseProfile: a preference pattern, not IQ or a clinical label.</p>

      <h2>Quick Answer</h2>
      <p class="direct-answer">{short} describes how you tend to process information or show up in work and relationships. Use it for reflection, not to rank yourself or others.</p>

      <h2>Key Takeaways</h2>
      <ul class="key-takeaways">
        <li>Tendencies can shift with context and experience.</li>
        <li>Compare related traits and work-style pages for a fuller picture.</li>
        <li>The quiz shows where you lean on this dimension.</li>
        <li>Avoid using a single trait to label people permanently.</li>
      </ul>

      <h2>What does this trait measure?</h2>
      <p>A preference or tendency, not a fixed type or ability score.</p>

      <h2>How should I use this page?</h2>
      <p>Read for vocabulary and self-awareness; follow links to comparisons and combinations.</p>

      <h2>Is this diagnostic?</h2>
      <p>No. This is educational content for reflection, not a clinical assessment.</p>

"""
    if kind == "comparison":
        return f"""      <p class="snippet-answer">This page compares two tendencies side by side: how they differ in decisions, problem-solving, and collaboration.</p>

      <h2>Quick Answer</h2>
      <p class="direct-answer">The comparison names differences in processing style. Neither side is “better”; context and phase decide what fits.</p>

      <h2>Key Takeaways</h2>
      <ul class="key-takeaways">
        <li>Friction often comes from unnamed differences in speed, structure, or horizon.</li>
        <li>Many people blend both tendencies depending on task.</li>
        <li>Staging roles and phases reduces unnecessary conflict.</li>
        <li>See trait pages and the matrix for deeper maps.</li>
      </ul>

      <h2>Why do these styles clash at work?</h2>
      <p>They optimize for different risks and time horizons unless the team names the dimension.</p>

      <h2>Can someone be strong in both?</h2>
      <p>Yes. Snapshots highlight leanings; real behavior blends both.</p>

      <h2>Where do I go next?</h2>
      <p>Use the cognitive style matrix and misalignment hub for team framing.</p>

"""
    # hub / behavioral default
    return f"""      <p class="snippet-answer">This article applies cognitive-style ideas to a focused topic: patterns, friction, and practical ways to respond.</p>

      <h2>Quick Answer</h2>
      <p class="direct-answer">Read the sections below for how different styles show up in this situation and what to try next.</p>

      <h2>Key Takeaways</h2>
      <ul class="key-takeaways">
        <li>Name the dimension in play (speed, structure, horizon, risk).</li>
        <li>Assign phase owners when ideas conflict with execution.</li>
        <li>Use the matrix and glossary for shared vocabulary.</li>
        <li>Take the quiz to locate your own tendencies.</li>
      </ul>

      <h2>Why does style matter here?</h2>
      <p>Repeated friction often maps to style differences rather than bad intent.</p>

      <h2>What is the first step to reduce friction?</h2>
      <p>Make the disagreement about process and timing, not personality.</p>

      <h2>Where can I read more?</h2>
      <p>Follow links to the matrix, misalignment hub, and related behavioral pages.</p>

"""


def extract_h1(html: str) -> Optional[str]:
    m = re.search(r"<h1>([^<]+)</h1>", html)
    return m.group(1).strip() if m else None


def insert_after_h1_before_adslot(text: str, block: str) -> Optional[str]:
    # One or two newlines between h1 and ad slot (templates vary)
    pat = r"(<h1>[^<]+</h1>\s*\n\s*)(<div class=\"content-ad-slot\")"
    if not re.search(pat, text):
        return None
    return re.sub(pat, r"\1" + block + r"\2", text, count=1)


def insert_after_h1_before_first_p(text: str, block: str) -> Optional[str]:
    """For comparison pages: h1 then first paragraph (may have class attrs)."""
    pat = r"(<h1>[^<]+</h1>\s*\n\s*)(<p\b[^>]*>)"
    if not re.search(pat, text):
        return None
    return re.sub(pat, r"\1" + block + r"\2", text, count=1)


def insert_after_snippet_before_next(text: str, block: str) -> Optional[str]:
    """For pages that already have snippet-answer before ad or div."""
    pat = r'(<p class="snippet-answer">[\s\S]*?</p>\s*\n\s*)(<div class="(?:ad-container|content-ad-slot))'
    if not re.search(pat, text):
        return None
    return re.sub(pat, r"\1" + block + r"\2", text, count=1)


def insert_after_h1_before_h2(text: str, block: str) -> Optional[str]:
    """Glossary: h1 then h2."""
    pat = r"(<h1>[^<]+</h1>\s*\n\s*\n\s*)(<h2>)"
    if not re.search(pat, text):
        return None
    return re.sub(pat, r"\1" + block + r"\2", text, count=1)


def insert_after_h1_before_p_no_snippet(text: str, block: str) -> Optional[str]:
    """Hub style: h1 then first body <p> when no snippet before first h2."""
    head = text[: text.find("<h2") if "<h2" in text else len(text)]
    if "snippet-answer" in head:
        return None
    if "Quick Answer" in text:
        return None
    pat = r"(<h1>[^<]+</h1>\s*\n\s*\n\s*)(<p\b[^>]*>)"
    if not re.search(pat, text):
        return None
    return re.sub(pat, r"\1" + block + r"\2", text, count=1)


def hub_addon_only() -> str:
    """Quick Answer + Key Takeaways + 3 H2s when snippet-answer already exists."""
    return """
      <h2>Quick Answer</h2>
      <p class="direct-answer">Read the sections below for how different styles show up in this situation and what to try next.</p>

      <h2>Key Takeaways</h2>
      <ul class="key-takeaways">
        <li>Name the dimension in play (speed, structure, horizon, risk).</li>
        <li>Assign phase owners when ideas conflict with execution.</li>
        <li>Use the matrix and glossary for shared vocabulary.</li>
        <li>Take the quiz to locate your own tendencies.</li>
      </ul>

      <h2>Why does style matter here?</h2>
      <p>Repeated friction often maps to style differences rather than bad intent.</p>

      <h2>What is the first step to reduce friction?</h2>
      <p>Make the disagreement about process and timing, not personality.</p>

      <h2>Where can I read more?</h2>
      <p>Follow links to the matrix, misalignment hub, and related behavioral pages.</p>
"""


def insert_after_h1_before_first_h2(text: str, block: str) -> Optional[str]:
    """When body goes h1 → blank line → h2 (no ad slot or p between)."""
    pat = r"(<h1>[^<]+</h1>\s*\n\s*\n\s*)(<h2\b)"
    if not re.search(pat, text):
        return None
    return re.sub(pat, r"\1" + block + r"\2", text, count=1)


def process_file(path: Path) -> bool:
    rel = str(path.relative_to(ROOT))
    if rel in SKIP:
        return False
    text = path.read_text(encoding="utf-8")
    if "Quick Answer" in text:
        return False

    h1 = extract_h1(text) or "This topic"
    short = re.sub(r"^Understanding (High )?", "", h1)

    new_text = None

    # 1) Trait / work / relationship / trait-combo / curious vs disciplined
    if rel.startswith("traits/") or rel.startswith("work-styles/") or rel.startswith(
        "relationship-styles/"
    ) or rel.startswith("trait-combinations/"):
        block = qa_block_from_title(h1, "trait")
        new_text = insert_after_h1_before_adslot(text, block)

    # 2) Comparisons
    elif rel.startswith("comparisons/"):
        block = qa_block_from_title(h1, "comparison")
        new_text = insert_after_h1_before_first_p(text, block)

    # 3) Glossary
    elif rel == "cognitive-style-glossary/index.html":
        block = f"""      <p class="snippet-answer">The glossary defines core cognitive-style terms used across MindPulseProfile and links to full articles.</p>

      <h2>Quick Answer</h2>
      <p class="direct-answer">Use this page as a quick reference for analytical, creative, strategic, intuitive, and related terms.</p>

      <h2>Key Takeaways</h2>
      <ul class="key-takeaways">
        <li>Each term links to a deeper definition page where available.</li>
        <li>Styles describe tendencies, not fixed identities.</li>
        <li>Combine with the matrix for cross-style comparison.</li>
        <li>Start with “What is cognitive style?” if you are new.</li>
      </ul>

      <h2>How do I find a term quickly?</h2>
      <p>Scan the headings below or use your browser search on this page.</p>

      <h2>Are these clinical definitions?</h2>
      <p>No. They are educational definitions for self-reflection and team clarity.</p>

      <h2>What should I read next?</h2>
      <p>The cognitive style matrix and misalignment hub for applied use.</p>

"""
        new_text = insert_after_h1_before_h2(text, block)

    # 4) analytical-thinkers-conflict: snippet exists
    elif rel == "analytical-thinkers-conflict/index.html":
        addon = """
      <h2>Quick Answer</h2>
      <p class="direct-answer">Analytical thinkers approach conflict with logic, structure, and root-cause focus. They may seem detached until they have organized the problem.</p>

      <h2>Key Takeaways</h2>
      <ul class="key-takeaways">
        <li>Evidence and criteria land better than vague emotional framing.</li>
        <li>Silence often means processing, not disinterest.</li>
        <li>Creative and analytical styles pair well when phases are explicit.</li>
        <li>See negotiation and feedback pages for adjacent patterns.</li>
      </ul>

      <h2>Why do analytical thinkers seem cold in conflict?</h2>
      <p>They prioritize logic and error correction over immediate emotional expression.</p>

      <h2>How should you communicate with an analytical thinker?</h2>
      <p>Use specific examples, clear criteria, and structured feedback.</p>

      <h2>What causes conflict between analytical and creative thinkers?</h2>
      <p>One side narrows and validates; the other expands and reframes—staging fixes most friction.</p>
"""
        new_text = insert_after_snippet_before_next(text, addon)

    # 5) Default hub: try snippet+addon, ad slot, h1→h2, then paragraph patterns
    else:
        block = qa_block_from_title(h1, "hub")
        new_text = insert_after_snippet_before_next(text, hub_addon_only())
        if new_text is None:
            new_text = insert_after_h1_before_adslot(text, block)
        if new_text is None:
            new_text = insert_after_h1_before_first_h2(text, block)
        if new_text is None:
            new_text = insert_after_h1_before_p_no_snippet(text, block)
        if new_text is None:
            new_text = insert_after_h1_before_first_p(text, block)

    if new_text is None or new_text == text:
        return False

    path.write_text(new_text, encoding="utf-8")
    return True


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
