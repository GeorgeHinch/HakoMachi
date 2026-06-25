#!/usr/bin/env python3
"""
HakoMachi i18n audit helper.

Run after adding or changing user-facing UI text:

    python tools/i18n_audit.py hakomachi_building_generator_sheet_split.html

The goal is not to understand all JavaScript perfectly; it catches the
common failures:
- keys used by tx()/tfmt()/i18nText()/data-i18n* but missing from en/ja
- keys present in one language but missing in another
- dynamic style/object labels without Japanese mappings in STYLE_I18N_JA

Exit code is non-zero when coverage problems are found.
"""
from __future__ import annotations

import re
import sys
from pathlib import Path

LANGS = ("en", "ja")

def extract_lang_block(src: str, lang: str) -> str:
    m = re.search(rf"\n\s*{re.escape(lang)}\s*:\s*\{{", src)
    if not m:
        return ""
    i = m.end()
    depth = 1
    quote = None
    esc = False
    start = i
    while i < len(src):
        ch = src[i]
        if quote:
            if esc:
                esc = False
            elif ch == "\\":
                esc = True
            elif ch == quote:
                quote = None
        else:
            if ch in ("'", '"', "`"):
                quote = ch
            elif ch == "{":
                depth += 1
            elif ch == "}":
                depth -= 1
                if depth == 0:
                    return src[start:i]
        i += 1
    return src[start:]

def keys_from_object_block(block: str) -> set[str]:
    return set(re.findall(r"^\s*([A-Za-z0-9_]+)\s*:", block, flags=re.M))

def used_i18n_keys(src: str) -> set[str]:
    keys = set()
    for fn in ("t", "tx", "tfmt", "i18nText"):
        keys.update(re.findall(rf"\b{fn}\(\s*['\"]([^'\"]+)['\"]", src))
    keys.update(re.findall(r"data-i18n(?:-html|-opt|-placeholder|-title)?=[\"']([^\"']+)[\"']", src))
    return keys

def extract_object_names(src: str, const_name: str) -> set[str]:
    m = re.search(rf"const\s+{re.escape(const_name)}\s*=\s*\{{", src)
    if not m:
        return set()
    block = src[m.end():]
    # Stop at first standalone closing brace/semicolon. Good enough for these dictionaries.
    end = block.find("\n};")
    if end >= 0:
        block = block[:end]
    out = set()
    for km in re.finditer(r"^\s*([A-Za-z0-9_]+)\s*:\s*\{", block, flags=re.M):
        key = km.group(1)
        if key not in {"defaults", "manualOpenings", "seamSpacing", "details", "innerCut", "throughHole"}:
            out.add(key)
    return out

def extract_style_i18n_group(src: str, group: str) -> set[str]:
    m = re.search(rf"\b{re.escape(group)}\s*:\s*\{{", src)
    if not m:
        return set()
    block = src[m.end():]
    end = block.find("\n  },")
    if end >= 0:
        block = block[:end]
    return set(re.findall(r"^\s*([A-Za-z0-9_]+)\s*:\s*\{", block, flags=re.M))

def main() -> int:
    if len(sys.argv) != 2:
        print("usage: i18n_audit.py <hakomachi_html>", file=sys.stderr)
        return 2
    src = Path(sys.argv[1]).read_text(encoding="utf-8")

    lang_keys = {lang: keys_from_object_block(extract_lang_block(src, lang)) for lang in LANGS}
    all_lang_keys = set().union(*lang_keys.values())
    used = used_i18n_keys(src)

    problems: list[str] = []

    for lang in LANGS:
        missing_from_lang = sorted(all_lang_keys - lang_keys[lang])
        if missing_from_lang:
            problems.append(f"{lang}: missing dictionary keys present in another language: {', '.join(missing_from_lang)}")

    for key in sorted(used):
        missing = [lang for lang in LANGS if key not in lang_keys[lang]]
        if missing:
            problems.append(f"used key {key!r} missing from: {', '.join(missing)}")

    object_groups = [
        "BUILDING_TYPES", "CLADDING_STYLES", "WINDOW_STYLES", "DOOR_STYLES",
        "FIXTURE_STYLES", "ROOFTOP_EQUIPMENT", "AWNING_STYLES", "BALCONY_STYLES",
    ]
    for group in object_groups:
        object_keys = extract_object_names(src, group)
        ja_keys = extract_style_i18n_group(src, group)
        missing = sorted(object_keys - ja_keys)
        if missing:
            problems.append(f"STYLE_I18N_JA.{group}: missing labels for: {', '.join(missing)}")

    if problems:
        print("i18n audit failed:")
        for p in problems:
            print(" -", p)
        return 1

    print(f"i18n audit passed: {len(all_lang_keys)} dictionary keys, {len(used)} used keys checked.")
    return 0

if __name__ == "__main__":
    raise SystemExit(main())
