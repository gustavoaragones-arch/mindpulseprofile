#!/usr/bin/env python3
"""Rewrite relative href/src to root-absolute (/file) for static hosting on nested URLs."""
from __future__ import annotations

import re
from pathlib import Path
import posixpath

ROOT = Path(__file__).resolve().parents[1]
SKIP = {"node_modules"}

ATTR_RE = re.compile(
    r"\b(href|src)=(\"|\')([^\"\']*)\2",
    re.I,
)


def should_skip_value(val: str) -> bool:
    v = val.strip()
    if not v or v.startswith("#"):
        return True
    low = v.lower()
    if low.startswith(
        ("http://", "https://", "mailto:", "tel:", "javascript:", "data:")
    ):
        return True
    if low.startswith("//"):
        return True
    return False


def to_root_absolute(page_rel: str, raw: str) -> str:
    if should_skip_value(raw):
        return raw
    hash_i = raw.find("#")
    frag = ""
    path_part = raw
    if hash_i >= 0:
        frag = raw[hash_i:]
        path_part = raw[:hash_i]
    q_i = path_part.find("?")
    query = ""
    if q_i >= 0:
        query = path_part[q_i:]
        path_part = path_part[:q_i]
    want_dir_slash = bool(
        path_part.endswith("/")
        and path_part.strip("/")
        and not re.search(r"\.[a-zA-Z0-9]+$", path_part.rstrip("/"))
    )
    if path_part.startswith("/"):
        out = re.sub(r"/+", "/", path_part) or "/"
    else:
        page_dir = posixpath.dirname(page_rel.replace("\\", "/"))
        if page_dir in ("", "."):
            page_dir = ""
        joined = posixpath.normpath(
            posixpath.join(page_dir, path_part) if page_dir else path_part
        )
        if not joined or joined == ".":
            out = "/"
        else:
            out = "/" + re.sub(r"/+", "/", joined.lstrip("/"))
    if want_dir_slash and out != "/" and not out.endswith("/") and not re.search(
        r"\.[a-zA-Z0-9]+$", out
    ):
        out += "/"
    if out == "/index.html" or out.endswith("/index.html"):
        out = "/"
    if out != "/" and "//" in out:
        out = re.sub(r"/+", "/", out)
    return out + query + frag


def process_file(path: Path) -> bool:
    rel = path.relative_to(ROOT).as_posix()
    text = path.read_text(encoding="utf-8")
    orig = text

    def repl(m: re.Match) -> str:
        attr, q, val = m.group(1), m.group(2), m.group(3)
        nv = to_root_absolute(rel, val)
        return f"{attr}={q}{nv}{q}"

    text = ATTR_RE.sub(repl, text)
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
