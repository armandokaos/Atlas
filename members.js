const data = window.GEO_CURATORS_DATA;

/** All org keys whose `names` list contains this display name (may be multiple). */
function resolveOrgGroupKeys(displayName) {
  const n = String(displayName || "").trim().toLowerCase();
  const keys = [];
  for (const spec of ORG_GROUP_SPECS) {
    if (spec.names.has(n)) keys.push(spec.key);
  }
  return keys;
}

function blendHex2(hexA, hexB, t = 0.5) {
  const parse = (hex) => {
    const raw = String(hex || "#94A3B8").replace(/^#/, "");
    if (!/^[0-9a-f]{6}$/i.test(raw)) return { r: 148, g: 163, b: 184 };
    const n = parseInt(raw, 16);
    return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
  };
  const a = parse(hexA);
  const b = parse(hexB);
  const m = (x, y) => Math.round(x + (y - x) * t);
  const r = m(a.r, b.r);
  const g = m(a.g, b.g);
  const bl = m(a.b, b.b);
  return `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${bl.toString(16).padStart(2, "0")}`;
}


function ensureHttps(value) {
  if (!value) return "";
  if (/^https?:\/\//i.test(value)) return value;
  return `https://${value}`;
}

function looksUnavailable(value) {
  const normalized = (value || "").trim().toLowerCase();
  return (
    !normalized ||
    normalized === "nil" ||
    normalized === "-" ||
    normalized === "---" ||
    normalized === "n/a" ||
    normalized === "na" ||
    normalized === "none" ||
    normalized === "1" ||
    normalized === "null" ||
    normalized === "undefined" ||
    normalized === "false" ||
    normalized === "no" ||
    normalized === "nope" ||
    normalized === "not available" ||
    normalized === "not provided" ||
    normalized.includes("i dont have")
  );
}

function normalizeSpaceUrl(value) {
  const candidate = ensureHttps((value || "").trim());
  if (!candidate) return "";
  try {
    const url = new URL(candidate);
    const validHost = url.hostname === "www.geobrowser.io" || url.hostname === "geobrowser.io";
    const validPath = /^\/space\/[0-9a-f]+$/i.test(url.pathname);
    return validHost && validPath ? url.toString() : "";
  } catch {
    return "";
  }
}

function normalizeXUrl(value) {
  if (looksUnavailable(value)) return "";
  let candidate = (value || "").trim();
  if (/^(?:www\.)?(?:x|twitter)\.com\//i.test(candidate)) {
    candidate = ensureHttps(candidate);
  }
  try {
    const url = new URL(candidate);
    const validHost =
      url.hostname === "x.com" ||
      url.hostname === "www.x.com" ||
      url.hostname === "twitter.com" ||
      url.hostname === "www.twitter.com";
    const validPath = /^\/[A-Za-z0-9_]+(?:\/.*)?$/.test(url.pathname);
    return validHost && validPath ? url.toString() : "";
  } catch {
    return "";
  }
}

function normalizeGithubUrl(value) {
  if (looksUnavailable(value)) return "";
  let candidate = (value || "").trim();
  if (/^(?:www\.)?github\.com\//i.test(candidate)) {
    candidate = ensureHttps(candidate);
  }
  try {
    const url = new URL(candidate);
    const validHost = url.hostname === "github.com" || url.hostname === "www.github.com";
    const validPath = /^\/[A-Za-z0-9_.-]+(?:\/.*)?$/.test(url.pathname) && url.pathname !== "/";
    return validHost && validPath ? url.toString() : "";
  } catch {
    return "";
  }
}

function normalizeLinkedinUrl(value) {
  if (looksUnavailable(value)) return "";
  let candidate = (value || "").trim();
  if (/^(?:[a-z]{2,3}\.)?linkedin\.com\//i.test(candidate) || /^www\.linkedin\.com\//i.test(candidate)) {
    candidate = ensureHttps(candidate);
  }
  try {
    const url = new URL(candidate);
    const validHost =
      url.hostname === "linkedin.com" ||
      url.hostname === "www.linkedin.com" ||
      /^[a-z]{2,3}\.linkedin\.com$/i.test(url.hostname);
    const validPath = url.pathname.startsWith("/in/") || url.pathname.startsWith("/company/");
    return validHost && validPath ? url.toString() : "";
  } catch {
    return "";
  }
}

/** Resolve `./avatars/…` against the page URL so avatars load on any deploy path. */
function resolveMemberMediaUrl(raw) {
  const s = String(raw || "").trim();
  if (!s) return "";
  if (/^https?:\/\//i.test(s)) return s;
  if (typeof window === "undefined" || !window.location?.href) return s;
  try {
    return new URL(s, window.location.href).href;
  } catch {
    return s;
  }
}

function renderAvatar(member, sizeClass = "") {
  if (member.avatarUrl) {
    const src = resolveMemberMediaUrl(member.avatarUrl);
    return `<img class="avatar-image ${sizeClass}" src="${escapeHtml(src)}" alt="${escapeHtml(member.name)}" loading="lazy" />`;
  }
  return `<span class="avatar-fallback ${sizeClass}">${member.initials}</span>`;
}

function normalizeMemberSkills(raw) {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw.map((s) => String(s).trim()).filter(Boolean);
  if (typeof raw === "string") return raw.split(/[,;|]/).map((s) => s.trim()).filter(Boolean);
  return [];
}

const GALAXY_SKILL_OTHER = "__galaxy_other__";

const GALAXY_AVATAR_PRELOAD_PER_FRAME = 6;

/** Distinct hue per skill index (Skills galaxy); output is always `#rrggbb` for canvas alpha suffixes. */
function galaxySkillHueToHex(index) {
  const h = ((index * 43.7 + 277) % 360) / 360;
  const s = 0.62;
  const l = 0.48;
  const hue2rgb = (p, q, t) => {
    let tt = t;
    if (tt < 0) tt += 1;
    if (tt > 1) tt -= 1;
    if (tt < 1 / 6) return p + (q - p) * 6 * tt;
    if (tt < 1 / 2) return q;
    if (tt < 2 / 3) return p + (q - p) * (2 / 3 - tt) * 6;
    return p;
  };
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  const r = Math.round(hue2rgb(p, q, h + 1 / 3) * 255);
  const g = Math.round(hue2rgb(p, q, h) * 255);
  const b = Math.round(hue2rgb(p, q, h - 1 / 3) * 255);
  return `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`;
}

/** Bios optional: show every profile that has an avatar (descriptions may be empty). */
const membersSourceFiltered = data.members.filter((member) => member.avatarUrl && member.avatarUrl.trim());

/** Synced from the current galaxy layout list length (inverse: fewer people → larger dots). */
let __galaxyVisibleCountForRadius = 1;

/** Radius in px (logical canvas): small crowd → large circles, big crowd → compact nodes. */
function galaxyMemberDotRadiusPx(visibleCount) {
  const n = Math.max(1, Number(visibleCount) || 1);
  const rMin = 11;
  const rMax = 36;
  const nLo = 18;
  const nHi = 400;
  if (n <= nLo) return rMax;
  if (n >= nHi) return rMin;
  const u = (n - nLo) / (nHi - nLo);
  const s = u * u * (3 - 2 * u);
  return rMax - s * (rMax - rMin);
}

const __galaxySkillFreq = (() => {
  const m = new Map();
  for (const mem of membersSourceFiltered) {
    for (const raw of normalizeMemberSkills(mem.skills)) {
      const t = String(raw).trim();
      if (!t) continue;
      const k = t.toLowerCase();
      m.set(k, (m.get(k) || 0) + 1);
    }
  }
  return m;
})();

/** Skills galaxy: only skills shared by ≥2 loaded profiles (hides singletons / bad zeros in pills). */
const GALAXY_TOP_SKILL_KEYS = [...__galaxySkillFreq.entries()]
  .filter(([, count]) => count >= 2)
  .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
  .map(([k]) => k);

/** Original-case label for each lowercase skill key (first-seen wins); used by autocomplete chips. */
const __skillLabelByKey = (() => {
  const m = new Map();
  for (const mem of membersSourceFiltered) {
    for (const raw of normalizeMemberSkills(mem.skills)) {
      const t = String(raw).trim();
      if (!t) continue;
      const k = t.toLowerCase();
      if (!m.has(k)) m.set(k, t);
    }
  }
  return m;
})();

/** Pre-sorted skill list for the autocomplete search index (most-mentioned first). */
const __skillSearchIndex = [...__galaxySkillFreq.entries()]
  .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
  .map(([key, count]) => ({ key, label: __skillLabelByKey.get(key) || key, count }));

const GALAXY_SKILL_LABEL_BY_KEY = new Map();
GALAXY_SKILL_LABEL_BY_KEY.set(GALAXY_SKILL_OTHER, "Other skills");
membersSourceFiltered.forEach((mem) => {
  normalizeMemberSkills(mem.skills).forEach((raw) => {
    const t = String(raw).trim();
    if (!t) return;
    const k = t.toLowerCase();
    if (!GALAXY_SKILL_LABEL_BY_KEY.has(k)) GALAXY_SKILL_LABEL_BY_KEY.set(k, t);
  });
});

function galaxySkillHex(skillKey) {
  if (skillKey === GALAXY_SKILL_OTHER) return "#94a3b8";
  const i = GALAXY_TOP_SKILL_KEYS.indexOf(skillKey);
  if (i < 0) return "#94a3b8";
  return galaxySkillHueToHex(i);
}

const members = membersSourceFiltered.map((member, index) => {
  const spaces = (member.spaces || []).map(normalizeSpaceUrl).filter(Boolean);
  const spaceCount = spaces.length;
  const orgGroupKeysFromNames = resolveOrgGroupKeys(member.name);
  const orgGroup = orgGroupKeysFromNames.length ? orgGroupKeysFromNames[0] : "curators";
  const skills = normalizeMemberSkills(member.skills);
  let skillClusterKey = GALAXY_SKILL_OTHER;
  if (GALAXY_TOP_SKILL_KEYS.length) {
    let bestKey = null;
    let bestCount = -1;
    for (const s of skills) {
      const k = String(s).trim().toLowerCase();
      if (!GALAXY_TOP_SKILL_KEYS.includes(k)) continue;
      const c = __galaxySkillFreq.get(k) || 0;
      if (c > bestCount || (c === bestCount && bestKey !== null && k.localeCompare(bestKey) < 0)) {
        bestCount = c;
        bestKey = k;
      }
    }
    if (bestKey !== null) skillClusterKey = bestKey;
  }
  return {
    isBoss: member.name === BOSS_NAME,
    ...member,
    spaces,
    spaceCount,
    orgGroupKeysFromNames,
    orgGroup,
    skills,
    skillClusterKey,
    skillClusterLabel: GALAXY_SKILL_LABEL_BY_KEY.get(skillClusterKey) || "Other skills",
    socialLinks: {
      x: normalizeXUrl(member.socialLinks?.x || ""),
      github: normalizeGithubUrl(member.socialLinks?.github || ""),
      linkedin: normalizeLinkedinUrl(member.socialLinks?.linkedin || ""),
    },
    color: member.name === BOSS_NAME ? BOSS_COLOR : palette[member.theme] || member.color || "#94A3B8",
    /** Undefined → first physics step snaps to anchor target ([stepMemberLayoutPhysics] handles non-finite as "use target").
     * Starting at (0,0) made all 534 dots crawl outward over ~60 frames at layoutPull=0.016 — visible cold-start "settling." */
    x: undefined,
    y: undefined,
    vx: 0,
    vy: 0,
    radius: galaxyMemberDotRadiusPx(membersSourceFiltered.length),
    seed: index * 0.37,
  };
});

__galaxyVisibleCountForRadius = Math.max(1, members.length);

ORG_GROUP_RAW_SPECS.forEach((spec) => {
  if (!spec.names.length) return;
  spec.names.forEach((n) => {
    if (!members.some((m) => m.name === n)) {
      console.warn(`[GeoAtlas] Team "${spec.label}" lists unknown profile name: "${n}"`);
    }
  });
});

const themeCounts = members.reduce((acc, member) => {
  acc[member.theme] = (acc[member.theme] || 0) + 1;
  return acc;
}, {});

const memberSummary = {
  totalMembers: members.length,
  uniqueSpaces: new Set(members.flatMap((member) => member.spaces)).size,
  latestUpdate:
    members
      .map((member) => member.updatedLabel)
      .filter(Boolean)
      .sort()
      .at(-1) || data.summary.latestUpdate || "",
  themeCounts: Object.fromEntries(
    Object.entries(themeCounts).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])),
  ),
};

const bossMember = members.find((member) => member.isBoss) || null;
const spotlightPriority = new Map([
  ["Rushab Taneja", 5],
  ["Yaniv Tal", 4],
  ["Preston Mantel", 3],
  ["Federico Sendra", 2],
  ["MaximVL", 1],
  ["Dan3", -1],
  ["Joueurs", -2],
]);

const __rosterPinNameSet = new Set(members.map((m) => m.name));
ROSTER_PAGE1_PIN_ORDER.forEach((name) => {
  if (!__rosterPinNameSet.has(name)) {
    console.warn(`[GeoAtlas] Roster page-1 pin missing from loaded members: "${name}"`);
  }
});

const demoMember =
  ROSTER_PAGE1_PIN_ORDER.map((n) => members.find((m) => m.name === n)).find(Boolean) ||
  members.find((member) => member.name === "Preston Mantel") ||
  bossMember ||
  members[0] ||
  null;

const state = {
  query: "",
  theme: "all",
  orgGroup: "all",
  /** Galaxy layout: `category` (theme), `team` (org), `skills` (skills with ≥2 profiles in loaded data). */
  galaxyViewMode: "category",
  /** When `galaxyViewMode === "skills"`, which skill is focused (everyone listed with that skill). */
  skillGalaxy: "all",
  rosterFilter: "all",
  rosterPage: 1,
  starFilter: "all",
  badgeFilter: "all",
  followerSort: "none",
  /** AND-filter for skills selected via search autocomplete; lowercase keys. */
  skillFilters: new Set(),
  /** Members picked for side-by-side comparison; max 3, in pick order. */
  compareIds: [],
  hoveredId: null,
  selectedId: demoMember?.entityId || null,
  phase: 0,
};

