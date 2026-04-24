#!/usr/bin/env python3
"""
Merge selected profiles from space_person_entities_profile_testnet_new_only.csv
into members-data.js (updates by display name, preserves existing entityId).
"""
import csv
import json
import re
import sys
from pathlib import Path
from typing import List, Optional

ROOT = Path(__file__).resolve().parents[1]
MEMBERS_JS = ROOT / "members-data.js"
CSV_PATH = Path("/Users/armandoweb3/Geo API/space_person_entities_profile_testnet_new_only.csv")

# Exact display names to import (CSV Name column must match after trim).
TARGET_NAMES = [
    "Arturas Vil",
    "Catalin",
    "Johns Gresham",
    "Juan Manuel Sobral",
    "Abdul Sammad Saeed",
    "Mario De Los Santos",
    "Jerome de Tychey",
    "Veronica Blanco",
    "joey shin",
    "Franco Mangone",
]

PALETTE = {
    "Geo Builders": "#F97316",
    "Research & Science": "#06B6D4",
    "Crypto & Web3": "#A855F7",
    "Writing & Content": "#F43F5E",
    "Design & Product": "#14B8A6",
    "Engineering & AI": "#84CC16",
    "Community & Education": "#FACC15",
    "Business & Strategy": "#38BDF8",
    "Generalists": "#94A3B8",
}


def initials(name: str) -> str:
    parts = [p for p in re.split(r"\s+", name.strip()) if p]
    if not parts:
        return "?"
    if len(parts) == 1:
        return (parts[0][:2] or "?").upper()
    return (parts[0][0] + parts[-1][0]).upper()


def looks_bad(s: str) -> bool:
    t = (s or "").strip().lower()
    return not t or t in ("nil", "-", "---", "n/a", "none", "1") or "i dont have" in t


def ensure_url(raw: str, kind: str) -> str:
    s = (raw or "").strip()
    if not s or looks_bad(s):
        return ""
    if s.startswith("http://") or s.startswith("https://"):
        return s
    if kind == "x":
        if not s.startswith(("x.com/", "www.", "twitter.com/")):
            return f"https://x.com/{s.lstrip('@').lstrip('/')}"
        return f"https://{s}" if not s.startswith("http") else s
    if kind == "github":
        return f"https://{s}" if s.startswith("github.com/") else f"https://github.com/{s.strip('/')}"
    if kind == "linkedin":
        if s.startswith("linkedin.com") or s.startswith("www.linkedin.com"):
            return f"https://{s}"
        return f"https://www.linkedin.com/in/{s.strip('/')}"
    return s


def infer_theme(name: str, skills: List[str], desc: str) -> str:
    blob = " ".join(skills).lower() + " " + (desc or "").lower()
    if any(k in blob for k in ("solidity", "web3", "defi", "blockchain", "crypto", "zero knowledge")):
        return "Crypto & Web3"
    if any(
        k in blob
        for k in (
            "rust",
            "javascript",
            "engineering",
            "software",
            "api",
            "backend",
            "machine learning",
            "venture capital",
        )
    ):
        return "Engineering & AI"
    if any(k in blob for k in ("finance", "strategy", "entrepreneur", "leadership", "advisor")):
        return "Business & Strategy"
    if any(k in blob for k in ("ai ", "research", "maths", "evaluation")):
        return "Research & Science"
    if any(k in blob for k in ("content", "writing", "marketing")):
        return "Writing & Content"
    return "Generalists"


def parse_spaces(cell: str) -> list[str]:
    out = []
    for part in re.split(r"\s+", (cell or "").strip()):
        if part.startswith("http") and "geobrowser.io/space/" in part:
            out.append(part.split("?", 1)[0])
    if not out and (cell or "").strip().startswith("http"):
        u = (cell or "").strip().split("?", 1)[0]
        if "geobrowser.io/space/" in u:
            out.append(u)
    return out


def row_score(row: dict) -> tuple:
    d = len((row.get("Description") or "").strip())
    sk = len(re.split(r"[;]", row.get("Skills") or ""))
    return (d, sk, row.get("Entity id") or "")


def load_csv_rows(path: Path) -> List[dict]:
    with path.open(newline="", encoding="utf-8") as f:
        return list(csv.DictReader(f))


def best_row_for_name(rows: List[dict], target: str) -> Optional[dict]:
    key = target.strip().lower()
    cands = [r for r in rows if (r.get("Name") or "").strip().lower() == key]
    if not cands:
        return None
    return max(cands, key=row_score)


def csv_row_to_member(row: dict, entity_id: Optional[str]) -> dict:
    name = (row.get("Name") or "").strip()
    desc = (row.get("Description") or "").strip()
    skills_raw = row.get("Skills") or ""
    skills = [s.strip() for s in re.split(r"[;]", skills_raw) if s.strip()]
    spaces = parse_spaces(row.get("Space ids") or "")
    theme = infer_theme(name, skills, desc)
    color = PALETTE.get(theme, "#94A3B8")
    eid = entity_id or f"row-{row.get('Entity id', '').strip()}"
    return {
        "entityId": eid,
        "name": name,
        "description": desc,
        "theme": theme,
        "color": color,
        "spaceCount": len(spaces),
        "spaces": spaces,
        "typeCount": 0,
        "createdAt": 0,
        "updatedAt": 0,
        "createdLabel": "",
        "updatedLabel": "",
        "initials": initials(name),
        "descLength": len(desc),
        "freshness": 1,
        "featured": False,
        "skills": skills,
        "socialLinks": {
            "x": ensure_url(row.get("X") or "", "x"),
            "github": ensure_url(row.get("GitHub") or "", "github"),
            "linkedin": ensure_url(row.get("Linkedin") or "", "linkedin"),
        },
        "avatarUrl": f"https://api.dicebear.com/7.x/initials/svg?seed={re.sub(r'[^a-zA-Z0-9]+', '+', eid + name)[:48]}&backgroundType=gradientLinear",
    }


def load_members_js(path: Path) -> dict:
    raw = path.read_text(encoding="utf-8")
    i, j = raw.index("{"), raw.rindex("}")
    return json.loads(raw[i : j + 1])


def write_members_js(path: Path, data: dict) -> None:
    body = "window.GEO_CURATORS_DATA = " + json.dumps(data, ensure_ascii=False) + ";\n"
    path.write_text(body, encoding="utf-8")


def is_placeholder_description(desc: str) -> bool:
    d = (desc or "").strip().lower()
    if not d:
        return False
    return "geo community profile" in d or "testnet export" in d


def strip_placeholder_descriptions(members: List[dict]) -> int:
    """Clear synthetic testnet placeholder bios; keep real CSV bios only."""
    n = 0
    for m in members:
        desc = (m.get("description") or "").strip()
        if not is_placeholder_description(desc):
            continue
        m["description"] = ""
        m["descLength"] = 0
        skills = m.get("skills") if isinstance(m.get("skills"), list) else []
        theme = infer_theme((m.get("name") or ""), skills, "")
        m["theme"] = theme
        m["color"] = PALETTE.get(theme, "#94A3B8")
        n += 1
    return n


def recompute_summary(members: List) -> dict:
    themes: dict[str, int] = {}
    for m in members:
        t = m.get("theme") or "Generalists"
        themes[t] = themes.get(t, 0) + 1
    labels = [m.get("updatedLabel") for m in members if m.get("updatedLabel")]
    labels.sort()
    return {
        "totalMembers": len(members),
        "withDescription": sum(1 for m in members if (m.get("description") or "").strip()),
        "uniqueSpaces": len({s for m in members for s in (m.get("spaces") or [])}),
        "themeCounts": dict(sorted(themes.items(), key=lambda x: (-x[1], x[0]))),
        "latestUpdate": labels[-1] if labels else "2026-04-23",
    }


def main() -> None:
    if not CSV_PATH.exists():
        print(f"Missing CSV: {CSV_PATH}", file=sys.stderr)
        sys.exit(1)
    rows = load_csv_rows(CSV_PATH)
    data = load_members_js(MEMBERS_JS)
    members: list[dict] = data["members"]
    by_lower_name: dict[str, dict] = {}
    for m in members:
        by_lower_name[(m.get("name") or "").strip().lower()] = m

    missing = []
    for target in TARGET_NAMES:
        row = best_row_for_name(rows, target)
        if row is None:
            missing.append(target)
            continue
        key = target.strip().lower()
        incoming = csv_row_to_member(row, None)
        if key in by_lower_name:
            existing = by_lower_name[key]
            eid = existing["entityId"]
            prev_avatar = (existing.get("avatarUrl") or "").strip()
            merged = csv_row_to_member(row, eid)
            if prev_avatar and "dicebear.com" not in prev_avatar:
                merged["avatarUrl"] = prev_avatar
            for k, v in merged.items():
                existing[k] = v
            existing["entityId"] = eid
        else:
            members.append(incoming)
            by_lower_name[key] = incoming

    if missing:
        print(f"Missing from CSV: {missing}", file=sys.stderr)
        sys.exit(1)

    stripped = strip_placeholder_descriptions(members)
    if stripped:
        print(f"Stripped placeholder descriptions from {stripped} profiles.")

    data["members"] = members
    data["summary"] = recompute_summary(members)
    write_members_js(MEMBERS_JS, data)
    print(f"Updated {MEMBERS_JS}: {len(members)} members.")


if __name__ == "__main__":
    main()
