#!/usr/bin/env python3
"""Phase 13.5: HTTPS canonicals, robots meta, internal <a href>, sitemap.

Trailing slash only for directory-style URLs (/about/). Literal *.html files have
no trailing slash so static servers (GitHub Pages, http.server) resolve them."""
from __future__ import annotations

import re
import xml.etree.ElementTree as ET
from pathlib import Path
from urllib.parse import urljoin, urlparse, urlunparse

ROOT = Path(__file__).resolve().parents[1]
BASE = "https://mindpulseprofile.com"
SKIP_DIRS = {"node_modules"}

STATIC_SUFFIXES = (
    ".css",
    ".js",
    ".png",
    ".jpg",
    ".jpeg",
    ".gif",
    ".webp",
    ".svg",
    ".ico",
    ".xml",
    ".pdf",
    ".woff",
    ".woff2",
    ".ttf",
)

CANONICAL_RE = re.compile(
    r'^\s*<link\s+rel="canonical"\s+href="[^"]*"\s*/?>',
    re.I | re.MULTILINE,
)
ROBOTS_RE = re.compile(
    r'^\s*<meta\s+name="robots"\s+content="[^"]*"\s*/?>',
    re.I | re.MULTILINE,
)
A_HREF_RE = re.compile(r'(<a\b[^>]*\bhref=")([^"]+)(")', re.I)


def squeeze_canonical_url(url: str) -> str:
    """Collapse duplicate slashes in path (never break https://)."""
    if "mindpulseprofile.com" not in url:
        return url
    p = urlparse(url)
    path = re.sub(r"/+", "/", p.path or "/")
    if path == "":
        path = "/"
    return urlunparse(
        (p.scheme or "https", p.netloc, path, p.params, p.query, p.fragment)
    )


def iter_html_files():
    for p in sorted(ROOT.rglob("*.html")):
        parts = set(p.parts)
        if SKIP_DIRS & parts:
            continue
        yield p


def rel_posix(path: Path) -> str:
    return path.relative_to(ROOT).as_posix()


def expected_canonical_url(rel: str) -> str:
    rel = rel.replace("\\", "/")
    if rel == "index.html":
        u = f"{BASE}/"
    elif rel.endswith("/index.html"):
        parent = rel[: -len("index.html")].rstrip("/")
        u = f"{BASE}/" if not parent else f"{BASE}/{parent}/"
    else:
        # e.g. how-your-mind-works.html — no trailing slash (real file on disk)
        u = f"{BASE}/{rel}"
    return squeeze_canonical_url(u)


def page_base_url(rel: str) -> str:
    """Base URL for urllib.parse.urljoin."""
    rel = rel.replace("\\", "/")
    if rel == "index.html":
        return f"{BASE}/"
    if rel.endswith("/index.html"):
        parent = rel[: -len("index.html")].rstrip("/")
        if not parent:
            return f"{BASE}/"
        return f"{BASE}/{parent}/"
    return f"{BASE}/{rel}"


def path_with_trailing_slash(path: str) -> str:
    if path == "/" or path == "":
        return "/"
    if path.endswith("/"):
        return path
    return path + "/"


def collapse_index_html_path(path: str) -> str:
    """Pretty URLs: /index.html/ -> / ; /foo/index.html/ -> /foo/"""
    p = path_with_trailing_slash(path)
    if p == "/index.html/":
        return "/"
    suf = "/index.html/"
    if p.endswith(suf):
        parent = p[: -len(suf)]
        return parent + "/" if parent else "/"
    return p


def normalize_site_path(path: str) -> str:
    """Root-relative path: / for home, /dir/ for folders, /file.html for html files."""
    path = path or "/"
    path = re.sub(r"/+", "/", path)
    if path == "":
        path = "/"
    if path.endswith(".html/"):
        path = path[:-1]
    if path in ("", "/"):
        return "/"
    if path == "/index.html" or path.endswith("/index.html"):
        return collapse_index_html_path(path)
    if path.lower().endswith(".html"):
        return path
    if not path.endswith("/"):
        return path + "/"
    return path


def full_url_to_root_relative(full: str) -> str | None:
    p = urlparse(full)
    if p.scheme in ("http", "https") and p.netloc:
        if p.netloc != "mindpulseprofile.com":
            return None
        path = normalize_site_path(p.path or "/")
        q = ("?" + p.query) if p.query else ""
        frag = ("#" + p.fragment) if p.fragment else ""
        return path + q + frag


def normalize_href(href: str, page_rel: str) -> str:
    if not href:
        return href
    low = href.strip()
    if low.startswith(
        ("mailto:", "tel:", "javascript:", "data:", "#")
    ) or low == "#":
        return href
    for suf in STATIC_SUFFIXES:
        if low.lower().endswith(suf):
            return href

    if low.startswith("http://") or low.startswith("https://"):
        rr = full_url_to_root_relative(low)
        if rr is None:
            return href
        return rr

    base = page_base_url(page_rel)
    joined = urljoin(base, href)
    if not joined.startswith(BASE):
        return href
    rr = full_url_to_root_relative(joined)
    return rr if rr is not None else href


def ensure_canonical(html: str, url: str) -> str:
    url = squeeze_canonical_url(url)
    tag_line = f'  <link rel="canonical" href="{url}">\n'
    if CANONICAL_RE.search(html):
        return CANONICAL_RE.sub(tag_line.rstrip("\n"), html, count=1)
    ins = re.search(r'(<meta name="viewport"[^>]*>\s*\n)', html, re.I)
    if ins:
        i = ins.end()
        return html[:i] + tag_line + html[i:]
    ins = re.search(r'(<meta charset="UTF-8">\s*\n)', html, re.I)
    if ins:
        i = ins.end()
        return html[:i] + tag_line + html[i:]
    ins = html.lower().find("</head>")
    if ins != -1:
        return html[:ins] + tag_line + html[ins:]
    return html


def ensure_robots(html: str) -> str:
    tag_line = '  <meta name="robots" content="index, follow">\n'
    if ROBOTS_RE.search(html):
        return ROBOTS_RE.sub(tag_line.rstrip("\n"), html, count=1)
    ins = re.search(r'(<meta name="viewport"[^>]*>\s*\n)', html, re.I)
    if ins:
        i = ins.end()
        return html[:i] + tag_line + html[i:]
    ins = re.search(r'(<meta charset="UTF-8">\s*\n)', html, re.I)
    if ins:
        i = ins.end()
        return html[:i] + tag_line + html[i:]
    ins = html.lower().find("</head>")
    if ins != -1:
        return html[:ins] + tag_line + html[ins:]
    return html


def rewrite_a_hrefs(html: str, page_rel: str) -> str:
    def repl(m: re.Match) -> str:
        val = m.group(2)
        nv = normalize_href(val, page_rel)
        if nv == val:
            return m.group(0)
        return m.group(1) + nv + m.group(3)

    return A_HREF_RE.sub(repl, html)


def process_html(path: Path) -> bool:
    rel = rel_posix(path)
    text = path.read_text(encoding="utf-8")
    canon = expected_canonical_url(rel)
    new = ensure_canonical(text, canon)
    new = ensure_robots(new)
    new = rewrite_a_hrefs(new, rel)
    if new != text:
        path.write_text(new, encoding="utf-8")
        return True
    return False


def priority_for(rel: str) -> str:
    if rel == "index.html":
        return "1.0"
    if rel.startswith(("contact/", "author/", "privacy-policy/", "terms-of-service/")):
        return "0.6"
    if rel.startswith(
        (
            "methodology/",
            "about/",
            "cognitive-misalignment/",
            "cognitive-style-matrix/",
            "cognitive-style-glossary/",
            "editorial-standards/",
        )
    ):
        return "0.8"
    if rel in ("how-your-mind-works.html", "what-is-cognitive-style.html"):
        return "0.8"
    return "0.7"


def changefreq_for(rel: str) -> str:
    if rel.startswith(("privacy-policy/", "terms-of-service/", "contact/", "author/")):
        return "yearly"
    return "monthly"


def write_sitemap(paths: list[Path]) -> None:
    urlset = ET.Element("urlset")
    urlset.set("xmlns", "http://www.sitemaps.org/schemas/sitemap/0.9")
    lastmod = "2026-04-03"
    seen: set[str] = set()
    rows: list[tuple[str, str, str, str]] = []
    for path in paths:
        rel = rel_posix(path)
        loc = expected_canonical_url(rel)
        if loc in seen:
            continue
        seen.add(loc)
        rows.append(
            (loc, lastmod, changefreq_for(rel), priority_for(rel))
        )
    for loc, lm, cf, pr in sorted(rows, key=lambda x: x[0]):
        u = ET.SubElement(urlset, "url")
        ET.SubElement(u, "loc").text = loc
        ET.SubElement(u, "lastmod").text = lm
        ET.SubElement(u, "changefreq").text = cf
        ET.SubElement(u, "priority").text = pr

    tree = ET.ElementTree(urlset)
    ET.indent(tree, space="  ")
    out = ROOT / "sitemap.xml"
    tree.write(out, encoding="utf-8", xml_declaration=True)


def main():
    updated = []
    paths = list(iter_html_files())
    for path in paths:
        rel = rel_posix(path)
        if process_html(path):
            updated.append(rel)
    write_sitemap(paths)
    for u in updated:
        print("updated:", u)
    print("sitemap URLs:", len(paths))
    print("html updated:", len(updated))


if __name__ == "__main__":
    main()
