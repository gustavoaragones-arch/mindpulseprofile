#!/usr/bin/env python3
"""Validate one HTTPS canonical per HTML page, trailing slash, robots meta."""
from __future__ import annotations

import re
import sys
import xml.etree.ElementTree as ET
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
BASE = "https://mindpulseprofile.com"
SKIP_DIRS = {"node_modules"}

CANONICAL_RE = re.compile(
    r'<link\s+rel="canonical"\s+href="([^"]+)"',
    re.I,
)
ROBOTS_RE = re.compile(
    r'<meta\s+name="robots"\s+content="([^"]*)"\s*/?>',
    re.I,
)


def iter_html_files():
    for p in sorted(ROOT.rglob("*.html")):
        if SKIP_DIRS & set(p.parts):
            continue
        yield p


def rel_posix(path: Path) -> str:
    return path.relative_to(ROOT).as_posix()


def expected_canonical_url(rel: str) -> str:
    rel = rel.replace("\\", "/")
    if rel == "index.html":
        return f"{BASE}/"
    if rel.endswith("/index.html"):
        parent = rel[: -len("index.html")].rstrip("/")
        if not parent:
            return f"{BASE}/"
        return f"{BASE}/{parent}/"
    return f"{BASE}/{rel}/"


NS = {"sm": "http://www.sitemaps.org/schemas/sitemap/0.9"}


def validate_sitemap(expected_locs: set[str]) -> list[str]:
    err: list[str] = []
    path = ROOT / "sitemap.xml"
    if not path.is_file():
        return [f"missing {path}"]
    tree = ET.parse(path)
    root = tree.getroot()
    locs: list[str] = []
    for url_el in root.findall("sm:url", NS):
        loc_el = url_el.find("sm:loc", NS)
        if loc_el is None or not loc_el.text:
            err.append("sitemap: url entry missing <loc>")
            continue
        loc = loc_el.text.strip()
        locs.append(loc)
        if loc.startswith("http://"):
            err.append(f"sitemap: http URL (use https): {loc}")
        if not loc.startswith(f"{BASE}/") and loc != f"{BASE}/":
            err.append(f"sitemap: loc not under {BASE}/: {loc}")
        path_part = loc[len(BASE) :] if loc.startswith(BASE) else ""
        if path_part != "/" and path_part and not path_part.endswith("/"):
            err.append(f"sitemap: loc must end with /: {loc}")
    if len(locs) != len(set(locs)):
        err.append("sitemap: duplicate <loc> entries")
    missing = expected_locs - set(locs)
    extra = set(locs) - expected_locs
    if missing:
        err.append(f"sitemap: missing {len(missing)} URLs (e.g. {sorted(missing)[:3]})")
    if extra:
        err.append(f"sitemap: extra {len(extra)} URLs (e.g. {sorted(extra)[:3]})")
    return err


def main() -> int:
    errors: list[str] = []
    count = 0
    expected_locs = set()
    for path in iter_html_files():
        expected_locs.add(expected_canonical_url(rel_posix(path)))
    for path in iter_html_files():
        count += 1
        rel = rel_posix(path)
        text = path.read_text(encoding="utf-8")
        found = list(CANONICAL_RE.finditer(text))
        if not found:
            errors.append(f"{rel}: missing canonical")
            continue
        if len(found) > 1:
            errors.append(f"{rel}: multiple canonical tags ({len(found)})")
        got = found[0].group(1).strip()
        exp = expected_canonical_url(rel)
        if got != exp:
            errors.append(f"{rel}: canonical mismatch\n  expected: {exp}\n  got:      {got}")
        if not got.startswith(f"{BASE}/") and got != f"{BASE}/":
            errors.append(f"{rel}: canonical must be under {BASE}/")
        path_part = got[len(BASE) :] if got.startswith(BASE) else ""
        if path_part != "/" and not path_part.endswith("/"):
            errors.append(f"{rel}: canonical URL must end with /")

        rm = ROBOTS_RE.search(text)
        if not rm:
            errors.append(f"{rel}: missing <meta name=\"robots\">")
        elif "index" not in rm.group(1).lower() or "follow" not in rm.group(1).lower():
            errors.append(f"{rel}: robots meta should include index, follow")

    errors.extend(validate_sitemap(expected_locs))

    if errors:
        print("\n\n".join(errors))
        return 1
    print(f"OK: {count} pages")
    return 0


if __name__ == "__main__":
    sys.exit(main())
