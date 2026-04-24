#!/usr/bin/env python3
"""Build members-data.js body from space_person_entities_profile_testnet_new_only.csv."""
import csv
import json
import re
import sys
from pathlib import Path

CSV_PATH = Path(
    "/Users/armandoweb3/Geo API/space_person_entities_profile_testnet_new_only.csv"
)
OUT_PATH = Path(__file__).resolve().parents[1] / "members-data.js"

CONTENT_TEAM_NAMES = {
    "arturas vil",
    "catalin",
    "dovile sv",
}


def initials(name: str) -> str:
    parts = [p for p in re.split(r"\s+", name.strip()) if p]
    if not parts:
        return "?"
    if len(parts) == 1:
        return (parts[0][:2] or "?").upper()
    return (parts[0][0] + parts[-1][0]).upper()


def ensure_url(raw: str, kind: str) -> str:
    s = (raw or "").strip()
    if not s:
        return ""
    if s.startswith("http://") or s.startswith("https://"):
        return s
    if kind == "x" and "twitter.com" not in s and "x.com" not in s:
        s = s.replace("twitter.com/", "x.com/")
        if not s.startswith("x.com/") and not s.startswith("www."):
            if "/" not in s and "@" not in s:
                return f"https://x.com/{s.lstrip('@')}"
        if s.startswith("x.com/") or s.startswith("www."):
            return f"https://{s}"
    if kind == "github" and not s.startswith("github.com"):
        return f"https://github.com/{s.split('/')[-1]}" if "/" not in s else f"https://{s}"
    if kind == "linkedin":
        if s.startswith("linkedin.com") or s.startswith("www.linkedin.com"):
            return f"https://{s}"
        return f"https://www.linkedin.com/in/{s.strip('/')}"
    return f"https://{s}" if "://" not in s else s


def infer_theme(name: str, skills: list[str], desc: str) -> str:
    n = name.lower()
    blob = " ".join(skills).lower() + " " + desc.lower()
    if n in CONTENT_TEAM_NAMES:
        return "Writing & Content"
    if any(k in blob for k in ("solidity", "web3", "defi", "blockchain", "crypto")):
        return "Crypto & Web3"
    if any(k in blob for k in ("rust", "javascript", "engineering", "software", "api", "backend")):
        return "Engineering & AI"
    if any(k in blob for k in ("ai ", "machine learning", "ml", "research")):
        return "Research & Science"
    if any(k in blob for k in ("content", "writing", "marketing")):
        return "Writing & Content"
    return "Generalists"


def avatar_placeholder(seed: str) -> str:
    # Deterministic external placeholder (GeoAtlas filters require non-empty avatarUrl).
    safe = re.sub(r"[^a-zA-Z0-9]+", "+", seed)[:40]
    return f"https://api.dicebear.com/7.x/initials/svg?seed={safe}&backgroundType=gradientLinear"


def row_score(row: dict) -> tuple[int, int, str]:
    """Prefer richer rows when deduping the same display name."""
    desc = len((row.get("Description") or "").strip())
    skills = len(re.split(r"[;]", (row.get("Skills") or "")))
    eid = (row.get("Entity id") or "").strip()
    return (desc, skills, eid)


def parse_csv(path: Path) -> list[dict]:
    text = path.read_text(encoding="utf-8")
    reader = csv.DictReader(text.splitlines())
    by_id: dict[str, dict] = {}
    for row in reader:
        eid = (row.get("Entity id") or "").strip()
        if not eid:
            continue
        by_id[eid] = row
    # Dedupe by display name (case-insensitive): keep highest-scoring row.
    by_name: dict[str, dict] = {}
    for row in by_id.values():
        key = (row.get("Name") or "").strip().lower() or row["Entity id"]
        prev = by_name.get(key)
        if prev is None or row_score(row) > row_score(prev):
            by_name[key] = row
    members_out = []
    for row in sorted(by_name.values(), key=lambda r: (r.get("Name") or "").lower()):
        eid = (row.get("Entity id") or "").strip()
        name = (row.get("Name") or "").strip() or "Unknown"
        desc = (row.get("Description") or "").strip()
        if not desc:
            desc = f"{name} — Geo community profile (testnet export)."
        skills_raw = (row.get("Skills") or "").strip()
        skills = [s.strip() for s in re.split(r"[;]", skills_raw) if s.strip()]
        space_cell = (row.get("Space ids") or "").strip()
        spaces = []
        for part in re.split(r"\s+", space_cell):
            if part.startswith("http"):
                spaces.append(part)
        if not spaces and space_cell.startswith("http"):
            spaces = [space_cell]
        theme = infer_theme(name, skills, desc)
        palette = {
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
        color = palette.get(theme, "#94A3B8")
        members_out.append(
            {
                "entityId": f"row-{eid}",
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
                "avatarUrl": avatar_placeholder(eid + name),
            }
        )
    return members_out


def main() -> None:
    if not CSV_PATH.exists():
        print(f"Missing CSV: {CSV_PATH}", file=sys.stderr)
        sys.exit(1)
    members = parse_csv(CSV_PATH)
    names = {m["name"].lower() for m in members}
    for required in CONTENT_TEAM_NAMES:
        if required not in names:
            print(f"Missing required name (case-insensitive): {required}", file=sys.stderr)
            sys.exit(1)
    theme_counts: dict[str, int] = {}
    for m in members:
        theme_counts[m["theme"]] = theme_counts.get(m["theme"], 0) + 1
    summary = {
        "totalMembers": len(members),
        "withDescription": sum(1 for m in members if m["description"].strip()),
        "uniqueSpaces": len({s for m in members for s in m["spaces"]}),
        "themeCounts": dict(sorted(theme_counts.items(), key=lambda x: (-x[1], x[0]))),
        "latestUpdate": "2026-04-22",
    }
    payload = {"members": members, "summary": summary}
    js = "window.GEO_CURATORS_DATA = " + json.dumps(payload, ensure_ascii=False) + ";\n"
    OUT_PATH.write_text(js, encoding="utf-8")
    print(f"Wrote {OUT_PATH} with {len(members)} members.")


if __name__ == "__main__":
    main()
