#!/usr/bin/env python3
"""Hreflang, global EN|ES switch, footer language note. Bidirectional ES hub + mapped authority pages."""
from __future__ import annotations

import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
BASE = "https://mindpulseprofile.com"
SKIP = {"node_modules"}

# English root-relative path (trailing slash for directories) -> Spanish path
EN_TO_ES: dict[str, str] = {
    "/": "/es/",
    "/cognitive-style-glossary/": "/es/glosario-estilo-cognitivo/",
    "/cognitive-style-matrix/": "/es/matriz-estilo-cognitivo/",
    "/cognitive-misalignment/": "/es/desalineacion-cognitiva/",
    "/analytical-thinker-definition/": "/es/pensador-analitico/",
    "/creative-thinker-definition/": "/es/pensador-creativo/",
    "/strategic-thinker-definition/": "/es/pensador-estrategico/",
    "/intuitive-thinker-definition/": "/es/pensador-intuitivo/",
    "/structured-vs-flexible-definition/": "/es/estructurado-vs-flexible/",
    "/long-term-vs-short-term-definition/": "/es/largo-vs-corto-plazo/",
    "/analytical-thinkers-conflict/": "/es/estilo-analitico-en-conflictos/",
    "/creative-minds-leadership/": "/es/liderazgo-creativo-equipos/",
    "/why-strategic-people-seem-calm-under-pressure/": "/es/por-que-personas-estrategicas-parecen-calmas/",
}

ES_TO_EN: dict[str, str] = {v: k for k, v in EN_TO_ES.items()}

HREFLANG_LINE_RE = re.compile(
    r'^\s*<link rel="alternate" hreflang="[^"]+" href="[^"]*"\s*/?>\s*\n',
    re.MULTILINE,
)

CANONICAL_RE = re.compile(
    r'(<link rel="canonical"\s+href="[^"]*"\s*/?>\s*\n)',
    re.I,
)

NAV_INJECT_RE = re.compile(
    r"(      <a href=\"/(?:es/)?#how-heading\">[^<]+</a>\s*\n)(      </div>\s*\n    </div>\s*\n  </nav>)",
)

FOOTER_WRAP_RE = re.compile(
    r"(<footer class=\"site-footer\">\s*\n    <div class=\"content-wrap\">)([\s\S]*?)(\n    </div>\n  </footer>)",
)

FOOTER_NOTE_P_RE = re.compile(
    r"\n\s*<p class=\"footer-lang-note\">[\s\S]*?</p>\s*",
)

LANG_SWITCH_BLOCK_RE = re.compile(
    r"\n\s*<span class=\"lang-switch\"[^>]*>[\s\S]*?</span>\s*\n",
)

LANG_SWITCH_MARK = 'class="lang-switch"'
FOOTER_NOTE_MARK = "footer-lang-note"


def root_relative_path(rel: str) -> str:
    rel = rel.replace("\\", "/")
    if rel == "index.html":
        return "/"
    if rel.endswith("/index.html"):
        parent = rel[: -len("index.html")].rstrip("/")
        return f"/{parent}/" if parent else "/"
    return f"/{rel}"


def en_key_for_rel(rel: str) -> str | None:
    """English site path for this file, or None if not an English page."""
    if rel.startswith("es/"):
        p = root_relative_path(rel)
        return ES_TO_EN.get(p)
    p = root_relative_path(rel)
    if p.endswith(".html") or p == "/":
        return p
    if p.endswith("/"):
        return p
    return p + "/" if not p.endswith("/") else p


def es_path_for_english(en_path: str) -> str:
    return EN_TO_ES.get(en_path, "/es/")


def canonical_url_for(rel: str) -> str:
    rr = root_relative_path(rel)
    if rr == "/":
        return f"{BASE}/"
    if rr.endswith(".html"):
        return f"{BASE}{rr}"
    return f"{BASE}{rr}" if rr.endswith("/") else f"{BASE}{rr}/"


def full_url_from_root_path(path: str) -> str:
    if path == "/":
        return f"{BASE}/"
    if path.endswith("/"):
        return f"{BASE}{path}"
    if path.endswith(".html"):
        return f"{BASE}{path}"
    return f"{BASE}{path}/"


def strip_hreflang(html: str) -> str:
    return HREFLANG_LINE_RE.sub("", html)


def strip_spanish_language_ui(html: str) -> str:
    """Phase 14.3: Spanish cluster stays self-contained (no visible EN links in UI)."""
    html = LANG_SWITCH_BLOCK_RE.sub("\n", html)
    return FOOTER_NOTE_P_RE.sub("\n", html, count=1)


def inject_hreflang(html: str, en_href: str, es_href: str, x_default_href: str) -> str:
    block = (
        f'  <link rel="alternate" hreflang="en" href="{en_href}">\n'
        f'  <link rel="alternate" hreflang="es" href="{es_href}">\n'
        f'  <link rel="alternate" hreflang="x-default" href="{x_default_href}">\n'
    )

    def repl(m: re.Match) -> str:
        return m.group(1) + block

    new, n = CANONICAL_RE.subn(repl, html, count=1)
    if n:
        return new
    return html


def lang_switch_html(en_path: str, es_path: str) -> str:
    return (
        '      <span class="lang-switch" role="navigation" aria-label="Language">'
        f'<a href="{en_path}" hreflang="en">EN</a>'
        '<span class="lang-switch-sep" aria-hidden="true"> | </span>'
        f'<a href="{es_path}" hreflang="es">ES</a>'
        "</span>\n"
    )


def replace_lang_switch(html: str, en_path: str, es_path: str) -> str:
    old = re.search(
        r"\n\s*<span class=\"lang-switch\"[^>]*>[\s\S]*?</span>\s*\n",
        html,
    )
    if not old:
        return html
    return html[: old.start()] + "\n" + lang_switch_html(en_path, es_path) + html[old.end() :]


def inject_lang_switch(html: str, en_path: str, es_path: str) -> str:
    if LANG_SWITCH_MARK in html:
        return replace_lang_switch(html, en_path, es_path)
    ins = lang_switch_html(en_path, es_path)
    m = NAV_INJECT_RE.search(html)
    if not m:
        return html
    return NAV_INJECT_RE.sub(r"\1" + ins + r"\2", html, count=1)


def inject_footer_note(
    html: str,
    spanish_page: bool,
    en_link: str,
    es_link: str,
) -> str:
    en_href = en_link if en_link != "/" else "/"
    es_href = es_link if es_link != "/es/" else "/es/"
    note = (
        '      <p class="footer-lang-note">También disponible en '
        f'<a href="{en_href}" lang="en">inglés</a>.</p>'
        if spanish_page
        else '      <p class="footer-lang-note">Also available in '
        f'<a href="{es_href}" lang="es">Spanish</a>.</p>'
    )
    if FOOTER_NOTE_MARK in html:
        return FOOTER_NOTE_P_RE.sub("\n" + note + "\n", html, count=1)

    def repl(m: re.Match) -> str:
        inner = m.group(2)
        if FOOTER_NOTE_MARK in inner:
            return m.group(0)
        return m.group(1) + inner + "\n" + note + m.group(3)

    return FOOTER_WRAP_RE.sub(repl, html, count=1)


def process_file(path: Path) -> bool:
    rel = path.relative_to(ROOT).as_posix()
    text = path.read_text(encoding="utf-8")
    orig = text
    text = strip_hreflang(text)

    if rel.startswith("es/"):
        en_key = ES_TO_EN.get(root_relative_path(rel))
        if not en_key:
            return False
        text = strip_spanish_language_ui(text)
        en_h = full_url_from_root_path(en_key)
        es_h = canonical_url_for(rel)
        xd = en_h
        spanish = True
    else:
        en_key = en_key_for_rel(rel)
        if not en_key:
            return False
        en_h = full_url_from_root_path(en_key)
        es_tail = es_path_for_english(en_key)
        es_h = full_url_from_root_path(es_tail)
        xd = en_h
        en_sw = en_key if en_key != "/" else "/"
        es_sw = es_tail
        spanish = False

    text = inject_hreflang(text, en_h, es_h, xd)
    if not spanish:
        text = inject_lang_switch(text, en_sw, es_sw)
        text = inject_footer_note(
            text,
            spanish_page=False,
            en_link=en_sw,
            es_link=es_sw,
        )

    if text != orig:
        path.write_text(text, encoding="utf-8")
        return True
    return False


def main() -> None:
    n = 0
    for p in sorted(ROOT.rglob("*.html")):
        if SKIP & set(p.parts):
            continue
        if process_file(p):
            n += 1
            print("updated:", p.relative_to(ROOT))
    print("files updated:", n)


if __name__ == "__main__":
    main()
