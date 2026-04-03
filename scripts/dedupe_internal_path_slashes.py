#!/usr/bin/env python3
"""Collapse duplicate slashes in root-relative hrefs and mindpulseprofile.com URLs; inject path-guard."""
from __future__ import annotations

import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SKIP_DIRS = {"node_modules"}

CANONICAL_RE = re.compile(
    r'(<link\s+rel="canonical"\s+href=")([^"]+)(")',
    re.I,
)
BODY_CLOSE = re.compile(r"</body>", re.I)
GUARD_LINE = '  <script src="/path-guard.js" defer></script>\n'


def squeeze_root_href(value: str) -> str:
    if not value.startswith("/") or value.startswith("//"):
        return value
    hash_i = value.find("#")
    frag = ""
    if hash_i >= 0:
        frag = value[hash_i:]
        value = value[:hash_i]
    q_i = value.find("?")
    query = ""
    if q_i >= 0:
        query = value[q_i:]
        value = value[:q_i]
    path = re.sub(r"/+", "/", value)
    if not path:
        path = "/"
    return path + query + frag


def squeeze_absolute_mp_url(url: str) -> str:
    from urllib.parse import urlparse, urlunparse

    if "mindpulseprofile.com" not in url:
        return url
    p = urlparse(url)
    path = re.sub(r"/+", "/", p.path or "/")
    if path == "":
        path = "/"
    return urlunparse(
        (p.scheme or "https", p.netloc, path, p.params, p.query, p.fragment)
    )


HREF_ATTR = re.compile(r'(href=)(")([^"]*)(")', re.I)


def href_repl(m: re.Match) -> str:
    prefix, q1, val, q2 = m.group(1), m.group(2), m.group(3), m.group(4)
    if val.startswith(("http://", "https://", "mailto:", "tel:", "javascript:", "data:")):
        if "mindpulseprofile.com" in val:
            return prefix + q1 + squeeze_absolute_mp_url(val) + q2
        return m.group(0)
    if val.startswith("#"):
        return m.group(0)
    if val.startswith("/"):
        return prefix + q1 + squeeze_root_href(val) + q2
    return m.group(0)


def process_html(path: Path) -> bool:
    text = path.read_text(encoding="utf-8")
    orig = text

    text = HREF_ATTR.sub(href_repl, text)

    def canon_repl(m: re.Match) -> str:
        return m.group(1) + squeeze_absolute_mp_url(m.group(2)) + m.group(3)

    text = CANONICAL_RE.sub(canon_repl, text)

    if 'path-guard.js' not in text:

        def inject_body(m: re.Match) -> str:
            return GUARD_LINE + m.group(0)

        text, n = BODY_CLOSE.subn(inject_body, text, count=1)
        if n == 0:
            pass

    if text != orig:
        path.write_text(text, encoding="utf-8")
        return True
    return False


def main() -> None:
    updated = []
    for p in sorted(ROOT.rglob("*.html")):
        if SKIP_DIRS & set(p.parts):
            continue
        if process_html(p):
            updated.append(str(p.relative_to(ROOT)))
    for u in updated:
        print("updated:", u)
    print("total:", len(updated))


if __name__ == "__main__":
    main()
