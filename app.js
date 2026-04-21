const palette = {
  "Geo Builders": "#F97316",
  "Research & Science": "#06B6D4",
  "Crypto & Web3": "#A855F7",
  "Writing & Content": "#F43F5E",
  "Design & Product": "#14B8A6",
  "Engineering & AI": "#84CC16",
  "Community & Education": "#FACC15",
  "Business & Strategy": "#38BDF8",
  Generalists: "#94A3B8",
};

const BOSS_NAME = "Yaniv Tal";
const BOSS_COLOR = "#FFD84D";

const ROSTER_PAGE_SIZE = 12;

/** First-page roster order; names must match `member.name` in members-data (see audit in init). */
const ROSTER_PAGE1_PIN_ORDER = [
  "Kevin",
  "Kevin Primicerio",
  "Iris",
  "MaximVL",
  "Thomas Freestone",
  "Federico Sendra",
  "Pablo Ragalli",
  "Farida Ahmed",
  "Ishita Sharma",
  "Victor Amigo",
];

const data = window.GEO_CURATORS_DATA;
const socialIcons = {
  x: `
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M18.9 2H22l-6.77 7.74L23.2 22h-6.27l-4.9-7.45L5.5 22H2.4l7.24-8.28L1.8 2h6.43l4.42 6.77L18.9 2Z"></path>
    </svg>
  `,
  github: `
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 .5a12 12 0 0 0-3.8 23.4c.6.1.8-.3.8-.6v-2.2c-3.4.7-4.1-1.4-4.1-1.4-.6-1.3-1.3-1.6-1.3-1.6-1.1-.7.1-.7.1-.7 1.2.1 1.9 1.2 1.9 1.2 1.1 1.9 2.9 1.4 3.6 1.1.1-.8.4-1.4.8-1.7-2.7-.3-5.5-1.3-5.5-6a4.7 4.7 0 0 1 1.2-3.2 4.3 4.3 0 0 1 .1-3.1s1-.3 3.3 1.2a11.4 11.4 0 0 1 6 0c2.3-1.5 3.3-1.2 3.3-1.2.5 1.1.4 2.4.1 3.1a4.7 4.7 0 0 1 1.2 3.2c0 4.7-2.9 5.7-5.6 6 .4.3.8 1 .8 2.1v3.1c0 .3.2.7.8.6A12 12 0 0 0 12 .5Z"></path>
    </svg>
  `,
  linkedin: `
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M4.98 3.5A2.48 2.48 0 1 1 5 8.46a2.48 2.48 0 0 1-.02-4.96ZM2.8 9.5h4.4V21H2.8V9.5Zm7 0h4.2v1.57h.06c.58-1.1 2-2.27 4.13-2.27 4.42 0 5.24 2.9 5.24 6.67V21H19V16c0-1.2-.02-2.75-1.67-2.75-1.67 0-1.93 1.3-1.93 2.66V21H10V9.5Z"></path>
    </svg>
  `,
};

const platformLabels = {
  x: "X",
  github: "GitHub",
  linkedin: "LinkedIn",
};

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

function renderAvatar(member, sizeClass = "") {
  if (member.avatarUrl) {
    return `<img class="avatar-image ${sizeClass}" src="${member.avatarUrl}" alt="${member.name}" loading="lazy" />`;
  }
  return `<span class="avatar-fallback ${sizeClass}">${member.initials}</span>`;
}

function normalizeMemberSkills(raw) {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw.map((s) => String(s).trim()).filter(Boolean);
  if (typeof raw === "string") return raw.split(/[,;|]/).map((s) => s.trim()).filter(Boolean);
  return [];
}

const members = data.members
  .filter((member) => member.description && member.description.trim())
  .filter((member) => member.avatarUrl && member.avatarUrl.trim())
  .map((member, index) => {
    const spaces = (member.spaces || []).map(normalizeSpaceUrl).filter(Boolean);
    const spaceCount = spaces.length;
    return {
      isBoss: member.name === BOSS_NAME,
      ...member,
      spaces,
      spaceCount,
      skills: normalizeMemberSkills(member.skills),
      socialLinks: {
        x: normalizeXUrl(member.socialLinks?.x || ""),
        github: normalizeGithubUrl(member.socialLinks?.github || ""),
        linkedin: normalizeLinkedinUrl(member.socialLinks?.linkedin || ""),
      },
      color: member.name === BOSS_NAME ? BOSS_COLOR : palette[member.theme] || member.color || "#94A3B8",
      x: 0,
      y: 0,
      vx: 0,
      vy: 0,
      radius: 2.5 + Math.min(8, spaceCount * 0.9 + member.descLength / 120),
      seed: index * 0.37,
    };
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
  rosterFilter: "all",
  rosterPage: 1,
  starFilter: "all",
  badgeFilter: "all",
  hoveredId: null,
  selectedId: demoMember?.entityId || null,
  phase: 0,
};

/** Immersive person → skills constellation (canvas-only). See plan: focus_personne_canvas */
const GALAXY_FOCUS_MAX_SKILLS = 12;
const GALAXY_FOCUS_ENTER_MS = 2000;
const GALAXY_FOCUS_EXIT_MS = 1700;
const GF_FADE_END = 0.11;
const GF_MOVE_END = 0.52;
const GF_GROW_END = 0.68;
const GF_SKILLS_END = 0.86;

const galaxyFocus = {
  mode: "landscape",
  memberId: null,
  member: null,
  transitionStart: 0,
  skillsSnapshot: [],
  skillNodes: [],
  snapHubX: 0,
  snapHubY: 0,
  snapHubR: 0,
  hubTargetR: 48,
  backRect: { x: 14, y: 14, w: 44, h: 44 },
};

function gfSmoothstep01(t) {
  const x = Math.max(0, Math.min(1, t));
  return x * x * (3 - 2 * x);
}

function gfEaseInOutCubic(t) {
  const x = Math.max(0, Math.min(1, t));
  return x < 0.5 ? 4 * x * x * x : 1 - (-2 * x + 2) ** 3 / 2;
}

function gfEaseOutCubic(t) {
  const x = Math.max(0, Math.min(1, t));
  return 1 - (1 - x) ** 3;
}

/** Overshoot modéré (Penner-style), 0→0 et 1→1. */
function gfEaseOutBack(t, c1 = 1.525) {
  const x = Math.max(0, Math.min(1, t));
  const c3 = c1 + 1;
  return 1 + c3 * (x - 1) ** 3 + c1 * (x - 1) ** 2;
}

/** Dissolve autres points vite au début (contraste immédiat avec le paysage). */
function gfFadeLandscapeAlpha(p) {
  const u = Math.max(0, Math.min(1, p / GF_FADE_END));
  return 1 - u * u * u;
}

function gfRoundRectPath(ctx, x, y, w, h, r) {
  const rad = Math.min(r, w / 2, h / 2);
  if (typeof ctx.roundRect === "function") {
    ctx.roundRect(x, y, w, h, rad);
    return;
  }
  ctx.moveTo(x + rad, y);
  ctx.arcTo(x + w, y, x + w, y + h, rad);
  ctx.arcTo(x + w, y + h, x, y + h, rad);
  ctx.arcTo(x, y + h, x, y, rad);
  ctx.arcTo(x, y, x + w, y, rad);
  ctx.closePath();
}

function gfSkillNodeColor(skill, index) {
  const hues = [268, 312, 200, 168, 32, 228, 145, 350];
  let hsh = 0;
  const str = String(skill);
  for (let k = 0; k < str.length; k += 1) hsh = Math.imul(hsh ^ str.charCodeAt(k), 16777619);
  const hue = hues[(Math.abs(hsh) + index) % hues.length];
  return `hsl(${hue}, 68%, 52%)`;
}

function gfUpdateBackButtonLayout(width) {
  galaxyFocus.backRect = { x: 14, y: 14, w: 44, h: 44 };
}

function gfBuildSkillNodes(skills, cx, cy, width, height) {
  const capped = skills.slice(0, GALAXY_FOCUS_MAX_SKILLS);
  const extra = skills.length - capped.length;
  const labels = extra > 0 ? [...capped, `+${extra}`] : capped;
  const n = labels.length;
  const diskW = Math.max(92, Math.min(width * 0.46, 340));
  const diskH = Math.max(92, Math.min(height * 0.42, 300));
  const nodes = labels.map((name, index) => {
    const idx = index + 1;
    const golden = idx * 2.39996322972865332;
    const normR = Math.sqrt(idx / (n + 1));
    const tx = cx + Math.cos(golden) * normR * diskW;
    const ty = cy + Math.sin(golden) * normR * diskH;
    return {
      name,
      golden,
      normR,
      tx,
      ty,
      color: name.startsWith("+") ? "rgba(107, 94, 130, 0.75)" : gfSkillNodeColor(name, index),
      isMore: name.startsWith("+"),
    };
  });
  gfRelaxSkillNodes(nodes);
  return nodes;
}

function gfRelaxSkillNodes(nodes) {
  const minDist = 72;
  for (let pass = 0; pass < 3; pass += 1) {
    for (let i = 0; i < nodes.length; i += 1) {
      for (let j = i + 1; j < nodes.length; j += 1) {
        const dx = nodes[j].tx - nodes[i].tx;
        const dy = nodes[j].ty - nodes[i].ty;
        const dist = Math.hypot(dx, dy) || 1;
        if (dist >= minDist) continue;
        const push = (minDist - dist) * 0.42;
        const ux = dx / dist;
        const uy = dy / dist;
        nodes[i].tx -= ux * push;
        nodes[i].ty -= uy * push;
        nodes[j].tx += ux * push;
        nodes[j].ty += uy * push;
      }
    }
  }
}

function gfCanvasToLogic(event) {
  const bounds = canvas.getBoundingClientRect();
  const { width: logicW, height: logicH } = readCanvasCssSize();
  let x = event.clientX - bounds.left;
  let y = event.clientY - bounds.top;
  if (bounds.width >= 2 && bounds.height >= 2) {
    x = (x / bounds.width) * logicW;
    y = (y / bounds.height) * logicH;
  }
  return { x, y };
}

function gfHitBackButton(x, y) {
  const r = galaxyFocus.backRect;
  return x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h;
}

function gfRebuildSkillLayout() {
  const member = galaxyFocus.member;
  if (!member || !galaxyFocus.skillsSnapshot.length) return;
  const { width, height } = readCanvasCssSize();
  const cx = width / 2;
  const cy = height / 2;
  galaxyFocus.skillNodes = gfBuildSkillNodes(galaxyFocus.skillsSnapshot, cx, cy, width, height);
}

function startGalaxyPersonFocus(member) {
  if (!member || galaxyFocus.mode !== "landscape") return;
  const skills = memberSkillsList(member);
  if (!skills.length) return;
  const list = visibleMembers();
  const sel = selectedMember(list);
  const { width, height } = readCanvasCssSize();
  const cx = width / 2;
  const cy = height / 2;
  galaxyFocus.mode = "enter";
  galaxyFocus.memberId = member.entityId;
  galaxyFocus.member = member;
  galaxyFocus.transitionStart = performance.now();
  galaxyFocus.skillsSnapshot = skills.slice();
  galaxyFocus.snapHubX = member.x;
  galaxyFocus.snapHubY = member.y;
  galaxyFocus.snapHubR = memberDisplayRadius(member, sel, state.hoveredId);
  const dim = Math.min(width, height);
  const nameLen = String(member.name || "").length;
  galaxyFocus.hubTargetR = Math.min(
    84,
    Math.max(40, dim * 0.078 + Math.min(22, Math.max(0, nameLen - 14) * 1.35)),
  );
  galaxyFocus.skillNodes = gfBuildSkillNodes(galaxyFocus.skillsSnapshot, cx, cy, width, height);
  gfUpdateBackButtonLayout(width);
  state.selectedId = member.entityId;
  renderDetail(member);
  renderRoster(activeMembers());
  requestAnimationFrame(() => {
    detailCard?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  });
}

function requestGalaxyPersonExit() {
  if (galaxyFocus.mode === "landscape" || galaxyFocus.mode === "exit") return;
  galaxyFocus.mode = "exit";
  galaxyFocus.transitionStart = performance.now();
}

function gfFinishExitToLandscape() {
  galaxyFocus.mode = "landscape";
  galaxyFocus.memberId = null;
  galaxyFocus.member = null;
  galaxyFocus.skillsSnapshot = [];
  galaxyFocus.skillNodes = [];
  const vis = visibleMembers();
  const chosen = selectedMember(vis);
  if (chosen) state.selectedId = chosen.entityId;
  else state.selectedId = null;
  snapSingleThemeVogelPositions(vis);
  renderDetail(chosen);
  renderRoster(activeMembers());
}

function gfLerp(a, b, t) {
  return a + (b - a) * t;
}

/** Flottement des pastilles skills — amplitudes nettes (px logiques canvas), liens + hit-test alignés. */
function gfSkillNodeFloat(node, index, now) {
  let amp = 1;
  if (galaxyFocus.mode === "enter") {
    const p = Math.min(1, (now - galaxyFocus.transitionStart) / GALAXY_FOCUS_ENTER_MS);
    amp = gfSmoothstep01(Math.max(0, (p - 0.18) / 0.62));
  } else if (galaxyFocus.mode === "exit") {
    const p = Math.min(1, (now - galaxyFocus.transitionStart) / GALAXY_FOCUS_EXIT_MS);
    amp = gfSmoothstep01(1 - p);
  } else if (galaxyFocus.mode !== "person") {
    return { ox: 0, oy: 0 };
  }
  const ph = node.golden + index * 0.71;
  const t = now * 0.00092;
  const wob = now * 0.00185 + ph * 2.08;
  const ox1 = Math.sin(t + ph) * 16 + Math.cos(t * 0.79 + ph * 1.31) * 10;
  const oy1 = Math.cos(t * 0.86 + ph) * 14 + Math.sin(t * 0.61 + ph * 1.11) * 9;
  const ox2 = Math.cos(wob) * 7 + Math.sin(wob * 0.71 + 1.4) * 5;
  const oy2 = Math.sin(wob * 0.77) * 6 + Math.cos(wob * 0.58 + 0.35) * 5;
  return { ox: (ox1 + ox2) * amp, oy: (oy1 + oy2) * amp };
}

function gfSkillNodeRadius(node) {
  if (node.isMore) return 16;
  const len = String(node.name).length;
  return 15 + Math.min(20, len * 1.08);
}

/** Fond neutre type produit SaaS — pas de « mesh » ni halos multiples. */
function gfDrawFocusBackdrop(ctx, width, height) {
  ctx.fillStyle = "#f3f2f6";
  ctx.fillRect(0, 0, width, height);
  const cx = width / 2;
  const cy = height / 2;
  const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.max(width, height) * 0.48);
  g.addColorStop(0, "rgba(255, 255, 255, 0.65)");
  g.addColorStop(0.55, "rgba(255, 255, 255, 0)");
  g.addColorStop(1, "rgba(0, 0, 0, 0.02)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, width, height);
}

function gfDrawBackButton(ctx) {
  const { x, y, w, h } = galaxyFocus.backRect;
  ctx.save();
  ctx.beginPath();
  gfRoundRectPath(ctx, x, y, w, h, 10);
  ctx.fillStyle = "#ffffff";
  ctx.fill();
  ctx.strokeStyle = "rgba(15, 12, 24, 0.1)";
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.strokeStyle = "rgba(15, 12, 24, 0.55)";
  ctx.lineWidth = 1.5;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  const cx = x + w * 0.52;
  const cy = y + h / 2;
  ctx.beginPath();
  ctx.moveTo(cx + 4, cy - 6);
  ctx.lineTo(cx - 3, cy);
  ctx.lineTo(cx + 4, cy + 6);
  ctx.stroke();
  ctx.restore();
}

function gfDrawSkillLinks(ctx, hx, hy, hubR, nodes, linksAlpha, dashPhase, now, grpOx = 0, grpOy = 0) {
  if (linksAlpha <= 0.02) return;
  const hubEdge = hubR + 1.5;
  nodes.forEach((node, index) => {
    const { ox, oy } = gfSkillNodeFloat(node, index, now);
    const tx = node.tx + ox + grpOx;
    const ty = node.ty + oy + grpOy;
    const dx = tx - hx;
    const dy = ty - hy;
    const dist = Math.hypot(dx, dy) || 1;
    const ux = dx / dist;
    const uy = dy / dist;
    const sx = hx + ux * hubEdge;
    const sy = hy + uy * hubEdge;
    const nr = gfSkillNodeRadius(node);
    const ex = tx - ux * nr;
    const ey = ty - uy * nr;
    const bend = dist * 0.065;
    const mx = (sx + ex) / 2 - uy * bend;
    const my = (sy + ey) / 2 + ux * bend;
    ctx.save();
    ctx.globalAlpha = linksAlpha * 0.9;
    ctx.beginPath();
    ctx.moveTo(sx, sy);
    ctx.quadraticCurveTo(mx, my, ex, ey);
    ctx.strokeStyle = "rgba(15, 12, 24, 0.1)";
    ctx.lineWidth = 2.25;
    ctx.lineCap = "round";
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(sx, sy);
    ctx.quadraticCurveTo(mx, my, ex, ey);
    ctx.setLineDash([3, 6]);
    ctx.lineDashOffset = dashPhase;
    ctx.strokeStyle = "rgba(15, 12, 24, 0.16)";
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();
  });
  ctx.lineDashOffset = 0;
}

function gfDrawSkillNodes(ctx, nodes, skillsAlpha, spin, now, grpOx = 0, grpOy = 0) {
  nodes.forEach((node, index) => {
    const stagger = index * 0.04;
    const rawA = Math.max(0, Math.min(1, (skillsAlpha - stagger) / (1 - stagger + 0.001)));
    if (rawA <= 0.01) return;
    const a = gfEaseOutCubic(rawA);
    const pop = gfEaseOutCubic(Math.min(1, rawA * 1.15));
    const { ox, oy } = gfSkillNodeFloat(node, index, now);
    const x = node.tx + ox + grpOx;
    const y = node.ty + oy + grpOy;
    const nr = gfSkillNodeRadius(node);
    const rDraw = nr * (0.2 + 0.8 * pop);
    ctx.save();
    ctx.globalAlpha = a;
    ctx.beginPath();
    ctx.fillStyle = "#ffffff";
    ctx.arc(x, y, rDraw, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.strokeStyle = "rgba(15, 12, 24, 0.08)";
    ctx.lineWidth = 1;
    ctx.arc(x, y, rDraw, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.strokeStyle = node.color;
    ctx.lineWidth = 2;
    ctx.arc(x, y, rDraw - 0.5, 0, Math.PI * 2);
    ctx.stroke();
    const label = truncateGalaxyLabel(node.name, 28);
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    ctx.font = '500 13px ui-sans-serif, system-ui, -apple-system, sans-serif';
    const ty = y + rDraw + 9;
    ctx.fillStyle = "rgba(15, 12, 24, 0.78)";
    ctx.fillText(label, x, ty);
    ctx.restore();
  });
}

function gfFitHubNameLines(ctx, name, maxW, maxH) {
  const clean = String(name || "—").trim() || "—";
  for (let fontPx = 12.5; fontPx >= 7; fontPx -= 0.5) {
    ctx.font = `500 ${fontPx}px ui-sans-serif, system-ui, -apple-system, sans-serif`;
    const words = clean.split(/\s+/).filter(Boolean);
    const lines = [];
    let cur = "";
    for (const w of words) {
      const next = cur ? `${cur} ${w}` : w;
      if (ctx.measureText(next).width <= maxW) cur = next;
      else {
        if (cur) lines.push(cur);
        if (ctx.measureText(w).width > maxW) {
          let s = w;
          while (s.length > 1 && ctx.measureText(`${s.slice(0, -1)}…`).width > maxW) s = s.slice(0, -1);
          cur = `${s}…`;
        } else cur = w;
      }
    }
    if (cur) lines.push(cur);
    if (lines.length > 3) continue;
    const lineHeight = fontPx * 1.22;
    if (lines.length * lineHeight <= maxH) return { lines, fontPx, lineHeight };
  }
  ctx.font = '500 7px ui-sans-serif, system-ui, -apple-system, sans-serif';
  return { lines: [truncateGalaxyLabel(clean, 30)], fontPx: 7, lineHeight: 9 };
}

function gfDrawHubName(ctx, member, hx, hy, hubR, labelAlpha, labelPop) {
  if (labelAlpha <= 0.02) return;
  const padX = 14;
  const padY = 12;
  const maxW = Math.max(40, hubR * 2 - padX * 2);
  const maxH = Math.max(28, hubR * 2 - padY * 2);
  const { lines, fontPx, lineHeight } = gfFitHubNameLines(ctx, member.name, maxW, maxH);
  const totalH = lines.length * lineHeight;
  const yStart = hy - totalH / 2 + lineHeight * 0.72;
  const pop = 0.97 + 0.03 * Math.min(1, Math.max(0, labelPop));
  ctx.save();
  ctx.globalAlpha = labelAlpha;
  ctx.translate(hx, hy);
  ctx.scale(pop, pop);
  ctx.translate(-hx, -hy);
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = `500 ${fontPx}px ui-sans-serif, system-ui, -apple-system, sans-serif`;
  ctx.fillStyle = "rgba(15, 12, 24, 0.88)";
  lines.forEach((line, i) => {
    const ly = yStart + i * lineHeight;
    ctx.fillText(line, hx, ly);
  });
  ctx.restore();
}

function gfDrawCentralHub(ctx, member, hx, hy, hubR, labelAlpha, labelPop) {
  const hubC = member.color || "#7447f5";
  ctx.save();
  ctx.beginPath();
  ctx.arc(hx, hy, hubR, 0, Math.PI * 2);
  ctx.fillStyle = "#ffffff";
  ctx.fill();
  ctx.beginPath();
  ctx.arc(hx, hy, hubR - 3.5, 0, Math.PI * 2);
  ctx.strokeStyle = hubC;
  ctx.globalAlpha = 0.88;
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.globalAlpha = 1;
  ctx.beginPath();
  ctx.arc(hx, hy, hubR, 0, Math.PI * 2);
  ctx.strokeStyle = "rgba(15, 12, 24, 0.09)";
  ctx.lineWidth = 1;
  ctx.stroke();
  gfDrawHubName(ctx, member, hx, hy, hubR - 5, labelAlpha, labelPop);
  ctx.restore();
}

function gfCurrentHubGeometry(now, width, height) {
  const cx = width / 2;
  const cy = height / 2;
  if (galaxyFocus.mode === "person") {
    const t = now * 0.00036;
    const driftX = Math.sin(t) * 18 + Math.cos(t * 0.59 + 0.42) * 9;
    const driftY = Math.cos(t * 0.47) * 15 + Math.sin(t * 0.68 + 1.1) * 8;
    const hx = cx + driftX;
    const hy = cy + driftY;
    const rBreath = Math.sin(t * 1.04) * 0.095 + Math.sin(t * 0.46 + 2) * 0.042;
    const hubR = galaxyFocus.hubTargetR * (1 + rBreath);
    return { hx, hy, hubR, hubGrowT: 1 };
  }
  if (galaxyFocus.mode === "enter") {
    const p = Math.min(1, (now - galaxyFocus.transitionStart) / GALAXY_FOCUS_ENTER_MS);
    const uMove = Math.min(1, p / GF_MOVE_END);
    const hubPosT = gfEaseInOutCubic(uMove);
    const growRaw = gfEaseInOutCubic(Math.max(0, Math.min(1, (p - 0.04) / (GF_GROW_END - 0.04))));
    const hubR = gfLerp(galaxyFocus.snapHubR, galaxyFocus.hubTargetR, growRaw);
    return {
      hx: gfLerp(galaxyFocus.snapHubX, cx, hubPosT),
      hy: gfLerp(galaxyFocus.snapHubY, cy, hubPosT),
      hubR,
      hubGrowT: growRaw,
    };
  }
  if (galaxyFocus.mode === "exit") {
    const p = Math.min(1, (now - galaxyFocus.transitionStart) / GALAXY_FOCUS_EXIT_MS);
    const q = 1 - p;
    const hubPosT = gfEaseInOutCubic(q);
    const shrinkT = gfEaseInOutCubic(q);
    const hubR = gfLerp(galaxyFocus.snapHubR, galaxyFocus.hubTargetR, shrinkT);
    return {
      hx: gfLerp(galaxyFocus.snapHubX, cx, hubPosT),
      hy: gfLerp(galaxyFocus.snapHubY, cy, hubPosT),
      hubR,
      hubGrowT: shrinkT,
    };
  }
  return { hx: cx, hy: cy, hubR: galaxyFocus.hubTargetR, hubGrowT: 1 };
}

function gfGalaxyPointerTargets(x, y, now, width, height) {
  if (gfHitBackButton(x, y)) return "back";
  const geo = gfCurrentHubGeometry(now, width, height);
  const { hx, hy, hubR } = geo;
  const cx0 = width / 2;
  const cy0 = height / 2;
  const grpOx = galaxyFocus.mode === "person" ? hx - cx0 : 0;
  const grpOy = galaxyFocus.mode === "person" ? hy - cy0 : 0;
  if (Math.hypot(x - hx, y - hy) <= hubR + 16) return "hub";
  for (let i = 0; i < galaxyFocus.skillNodes.length; i += 1) {
    const node = galaxyFocus.skillNodes[i];
    const { ox, oy } = gfSkillNodeFloat(node, i, now);
    const nx = node.tx + ox + grpOx;
    const ny = node.ty + oy + grpOy;
    const nr = gfSkillNodeRadius(node);
    if (Math.hypot(x - nx, y - ny) <= nr + 20) return "skill";
  }
  return "empty";
}

function drawGalaxyPersonFocus(width, height, now, list, selected, hoveredId) {
  const member = galaxyFocus.member;
  if (!member) {
    gfFinishExitToLandscape();
    return;
  }

  const bgDots = gfBackgroundDotsExcludingFocus(list, member.entityId, selected, hoveredId);

  gfDrawFocusBackdrop(ctx, width, height);

  const spin = 0;
  const geo = gfCurrentHubGeometry(now, width, height);
  const { hx, hy, hubR, hubGrowT } = geo;
  const cx0 = width / 2;
  const cy0 = height / 2;
  const grpOx = galaxyFocus.mode === "person" ? hx - cx0 : 0;
  const grpOy = galaxyFocus.mode === "person" ? hy - cy0 : 0;

  if (galaxyFocus.mode === "enter") {
    const p = Math.min(1, (now - galaxyFocus.transitionStart) / GALAXY_FOCUS_ENTER_MS);
    const fadeLand = gfFadeLandscapeAlpha(p);
    const skillsT = gfSmoothstep01(Math.max(0, Math.min(1, (p - 0.22) / (GF_SKILLS_END - 0.22))));
    const linksT = gfSmoothstep01(Math.max(0, Math.min(1, (p - 0.38) / (1 - 0.38))));

    const labelAlpha = gfSmoothstep01(Math.max(0, Math.min(1, (p - 0.24) / 0.4)));
    const labelPop = gfEaseOutCubic(Math.max(0, Math.min(1, (p - 0.26) / 0.36)));

    ctx.save();
    ctx.globalAlpha = fadeLand * 0.85;
    bgDots.forEach((d) => {
      ctx.beginPath();
      ctx.fillStyle = `${d.color}99`;
      ctx.arc(d.x, d.y, d.r, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.restore();

    gfDrawCentralHub(ctx, member, hx, hy, hubR, labelAlpha, labelPop);
    gfDrawSkillLinks(ctx, hx, hy, hubR, galaxyFocus.skillNodes, linksT, -now * 0.022, now, 0, 0);
    gfDrawSkillNodes(ctx, galaxyFocus.skillNodes, skillsT, spin, now, 0, 0);
    gfDrawBackButton(ctx);

    if (p >= 1) {
      galaxyFocus.mode = "person";
      galaxyFocus.transitionStart = now;
    }
    return;
  }

  if (galaxyFocus.mode === "person") {
    ctx.save();
    ctx.globalAlpha = 0.14;
    bgDots.forEach((d) => {
      ctx.beginPath();
      ctx.fillStyle = `${d.color}aa`;
      ctx.arc(d.x, d.y, d.r, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.restore();
    gfDrawCentralHub(ctx, member, hx, hy, hubR, 1, 1);
    gfDrawSkillLinks(ctx, hx, hy, hubR, galaxyFocus.skillNodes, 1, -now * 0.022, now, grpOx, grpOy);
    gfDrawSkillNodes(ctx, galaxyFocus.skillNodes, 1, spin, now, grpOx, grpOy);
    gfDrawBackButton(ctx);
    return;
  }

  if (galaxyFocus.mode === "exit") {
    const p = Math.min(1, (now - galaxyFocus.transitionStart) / GALAXY_FOCUS_EXIT_MS);
    const q = 1 - p;
    const fadeLand = gfSmoothstep01(p);
    const skillsT = gfEaseOutCubic(Math.max(0, q * 1.08));
    const linksT = gfEaseOutCubic(Math.max(0, q * 1.12));
    const labelAlpha = gfSmoothstep01(Math.max(0, q * 1.05));
    const labelPop = gfSmoothstep01(Math.max(0, q * 1.02));

    ctx.save();
    ctx.globalAlpha = fadeLand * 0.82;
    bgDots.forEach((d) => {
      ctx.beginPath();
      ctx.fillStyle = `${d.color}99`;
      ctx.arc(d.x, d.y, d.r, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.restore();

    gfDrawCentralHub(ctx, member, hx, hy, hubR, labelAlpha, labelPop);
    gfDrawSkillLinks(ctx, hx, hy, hubR, galaxyFocus.skillNodes, linksT, -now * 0.022, now, 0, 0);
    gfDrawSkillNodes(ctx, galaxyFocus.skillNodes, skillsT, spin, now, 0, 0);
    gfDrawBackButton(ctx);

    if (p >= 1) gfFinishExitToLandscape();
  }
}

const PERSONAL_STORAGE_KEY = "geoAtlas.personalMarks.v1";
const BADGE_KEYS = ["blue", "green", "red", "yellow"];
const BADGE_META = {
  blue: { label: "Blue", hex: "#2563eb" },
  green: { label: "Green", hex: "#16a34a" },
  red: { label: "Red", hex: "#dc2626" },
  yellow: { label: "Yellow", hex: "#ca8a04" },
};

const personalMarks = { ratings: {}, badges: {} };

function loadPersonalMarks() {
  try {
    const raw = localStorage.getItem(PERSONAL_STORAGE_KEY);
    if (!raw) return;
    const data = JSON.parse(raw);
    if (!data || typeof data !== "object") return;
    if (data.ratings && typeof data.ratings === "object") personalMarks.ratings = { ...data.ratings };
    if (data.badges && typeof data.badges === "object") personalMarks.badges = { ...data.badges };
  } catch {
    /* ignore corrupt storage */
  }
}

function savePersonalMarks() {
  try {
    localStorage.setItem(
      PERSONAL_STORAGE_KEY,
      JSON.stringify({ v: 1, ratings: personalMarks.ratings, badges: personalMarks.badges }),
    );
  } catch {
    /* quota or private mode */
  }
}

function getPersonalRating(entityId) {
  const r = personalMarks.ratings[entityId];
  return typeof r === "number" && r >= 1 && r <= 5 ? r : 0;
}

function getPersonalBadge(entityId) {
  const b = personalMarks.badges[entityId];
  return BADGE_KEYS.includes(b) ? b : null;
}

function setPersonalRating(entityId, value) {
  const cur = getPersonalRating(entityId);
  if (cur === value) {
    delete personalMarks.ratings[entityId];
  } else if (value >= 1 && value <= 5) {
    personalMarks.ratings[entityId] = value;
  }
  savePersonalMarks();
  void marksCloudPersistEntity(entityId);
}

function setPersonalBadge(entityId, key) {
  if (key === "clear" || key === "") {
    delete personalMarks.badges[entityId];
  } else if (BADGE_KEYS.includes(key)) {
    if (personalMarks.badges[entityId] === key) delete personalMarks.badges[entityId];
    else personalMarks.badges[entityId] = key;
  }
  savePersonalMarks();
  void marksCloudPersistEntity(entityId);
}

const cloudState = { email: null, message: "", busy: false };
let __supabaseClient = null;
let __cloudUserId = null;

function cloudConfigured() {
  const c = window.GEO_ATLAS_CLOUD;
  return Boolean(c?.supabaseUrl?.trim() && c?.supabaseAnonKey?.trim());
}

async function ensureSupabaseClient() {
  if (__supabaseClient) return __supabaseClient;
  if (!cloudConfigured()) return null;
  try {
    const mod = await import("https://esm.sh/@supabase/supabase-js@2.49.1");
    const { createClient } = mod;
    __supabaseClient = createClient(window.GEO_ATLAS_CLOUD.supabaseUrl.trim(), window.GEO_ATLAS_CLOUD.supabaseAnonKey.trim());
    return __supabaseClient;
  } catch (e) {
    console.warn("[GeoAtlas] Supabase client failed to load", e);
    return null;
  }
}

async function pullMarksFromCloud() {
  const sb = await ensureSupabaseClient();
  if (!sb || !__cloudUserId) return;
  const { data, error } = await sb.from("user_marks").select("entity_id, stars, badge");
  if (error) {
    console.warn("[GeoAtlas] pull marks", error.message);
    return;
  }
  for (const row of data || []) {
    if (row.stars >= 1 && row.stars <= 5) personalMarks.ratings[row.entity_id] = row.stars;
    else delete personalMarks.ratings[row.entity_id];
    if (BADGE_KEYS.includes(row.badge)) personalMarks.badges[row.entity_id] = row.badge;
    else delete personalMarks.badges[row.entity_id];
  }
  savePersonalMarks();
}

async function pushAllMarksToCloud() {
  const sb = await ensureSupabaseClient();
  if (!sb || !__cloudUserId) return;
  const ids = new Set([...Object.keys(personalMarks.ratings), ...Object.keys(personalMarks.badges)]);
  const rows = [];
  for (const entityId of ids) {
    const stars = getPersonalRating(entityId) || null;
    const badge = getPersonalBadge(entityId) || null;
    if (stars || badge) rows.push({ user_id: __cloudUserId, entity_id: entityId, stars, badge });
  }
  if (rows.length) {
    const { error } = await sb.from("user_marks").upsert(rows, { onConflict: "user_id,entity_id" });
    if (error) console.warn("[GeoAtlas] push all marks", error.message);
  }
}

async function marksCloudPersistEntity(entityId) {
  const sb = await ensureSupabaseClient();
  if (!sb || !__cloudUserId) return;
  const stars = getPersonalRating(entityId) || null;
  const badge = getPersonalBadge(entityId) || null;
  if (!stars && !badge) {
    const { error } = await sb.from("user_marks").delete().eq("user_id", __cloudUserId).eq("entity_id", entityId);
    if (error) console.warn("[GeoAtlas] delete mark", error.message);
    return;
  }
  const { error } = await sb
    .from("user_marks")
    .upsert({ user_id: __cloudUserId, entity_id: entityId, stars, badge }, { onConflict: "user_id,entity_id" });
  if (error) console.warn("[GeoAtlas] upsert mark", error.message);
}

function exportMarksJson() {
  const body = JSON.stringify({ v: 1, ratings: personalMarks.ratings, badges: personalMarks.badges }, null, 2);
  const blob = new Blob([body], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `geo-atlas-marks-${new Date().toISOString().slice(0, 10)}.json`;
  a.rel = "noopener";
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function mergeImportedMarks(data) {
  if (!data || typeof data !== "object") throw new Error("Invalid");
  if (data.ratings && typeof data.ratings === "object") {
    Object.assign(personalMarks.ratings, data.ratings);
  }
  if (data.badges && typeof data.badges === "object") {
    Object.assign(personalMarks.badges, data.badges);
  }
  for (const k of Object.keys(personalMarks.ratings)) {
    let r = personalMarks.ratings[k];
    if (typeof r === "string") r = Number(r);
    if (typeof r !== "number" || r < 1 || r > 5) delete personalMarks.ratings[k];
    else personalMarks.ratings[k] = r;
  }
  for (const k of Object.keys(personalMarks.badges)) {
    if (!BADGE_KEYS.includes(personalMarks.badges[k])) delete personalMarks.badges[k];
  }
}

function escapeHtml(str) {
  return String(str ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function memberSkillsList(member) {
  return Array.isArray(member?.skills) ? member.skills.filter(Boolean) : [];
}

/** Parse #RRGGBB curator color → rgba() for tinted UI (falls back to violet). */
function accentRgbParts(hex) {
  const raw = String(hex || "").trim().replace(/^#/, "");
  if (!/^[0-9a-f]{6}$/i.test(raw)) return { r: 116, g: 71, b: 245 };
  const n = parseInt(raw, 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

function renderSocialIconButtons(member, btnClass) {
  return (["x", "github", "linkedin"])
    .map((key) => {
      const rawHref = member.socialLinks?.[key];
      if (!rawHref) return "";
      const href = escapeHtml(ensureHttps(String(rawHref).trim()));
      const title = platformLabels[key] || key;
      const label = escapeHtml(`${title} (opens in a new tab)`);
      return `<a class="${btnClass} ${btnClass}--${key}" href="${href}" target="_blank" rel="noopener noreferrer" aria-label="${label}" title="${escapeHtml(title)}">${socialIcons[key]}</a>`;
    })
    .filter(Boolean)
    .join("");
}

function renderDetailSkillsSection(member) {
  const skills = memberSkillsList(member);
  if (!skills.length) return "";
  const { r, g, b } = accentRgbParts(member.color || "#7447f5");
  const sep = '<span class="detail-skill-sep" aria-hidden="true">·</span>';
  const prose = skills.map((s) => `<span class="detail-skill-item">${escapeHtml(String(s))}</span>`).join(sep);
  return `
    <section class="detail-skills" aria-label="Skills" style="--detail-accent-r:${r};--detail-accent-g:${g};--detail-accent-b:${b}">
      <h3 class="detail-section-title">Skills</h3>
      <p class="detail-skills-prose">${prose}</p>
    </section>`;
}

function renderDetailConnect(member) {
  const primary = normalizeSpaceUrl((member.spaces || []).find(Boolean) || "");
  const socialHtml = renderSocialIconButtons(member, "detail-social-btn");
  if (!primary && !socialHtml) return "";

  const spaceBlock = primary
    ? `<a class="detail-space-cta" href="${escapeHtml(primary)}" target="_blank" rel="noopener noreferrer" aria-label="Open personal Geo space (opens in a new tab)">
        <span class="detail-space-cta-graphic" aria-hidden="true">
          <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round">
            <circle cx="12" cy="12" r="9"></circle>
            <circle cx="12" cy="12" r="3.2"></circle>
            <path d="M12 2.5v4.3M12 17.2v4.3M2.5 12h4.3M17.2 12h4.3"></path>
          </svg>
        </span>
        <span class="detail-space-cta-body">
          <span class="detail-space-cta-kicker">Geo workspace</span>
          <span class="detail-space-cta-title">Open personal space</span>
        </span>
        <span class="detail-space-cta-chev" aria-hidden="true">
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 6l6 6-6 6"></path></svg>
        </span>
      </a>`
    : "";

  const socialBlock = socialHtml
    ? `<div class="detail-social-block">
        <h3 class="detail-section-title">Social</h3>
        <div class="detail-social-row">${socialHtml}</div>
      </div>`
    : "";

  return `<section class="detail-connect" aria-label="Space and social links">
    <div class="detail-connect-inner">${spaceBlock}${socialBlock}</div>
  </section>`;
}

function renderRosterSkillsChips(member, maxWords = 10) {
  const skills = memberSkillsList(member);
  if (!skills.length) return "";
  const { r, g, b } = accentRgbParts(member.color || "#7447f5");
  const shown = skills.slice(0, maxWords);
  const extra = skills.length - shown.length;
  const sep = '<span class="roster-skills-sep" aria-hidden="true">·</span>';
  const body = shown.map((s) => escapeHtml(String(s))).join(sep);
  const tail =
    extra > 0 ? ` <span class="roster-skills-more" style="color:rgba(${r},${g},${b},0.82)">+${extra}</span>` : "";
  return `<div class="roster-skills"><p class="roster-skills-line">${body}${tail}</p></div>`;
}

function renderRosterConnectRow(member) {
  const primary = normalizeSpaceUrl((member.spaces || []).find(Boolean) || "");
  const socialHtml = renderSocialIconButtons(member, "roster-social-btn");
  if (!primary && !socialHtml) return "";

  const space = primary
    ? `<a class="roster-space-chip" href="${escapeHtml(primary)}" target="_blank" rel="noopener noreferrer" aria-label="Geo space (opens in a new tab)" title="Geo space">
        <span class="roster-space-chip-icon" aria-hidden="true">
          <svg viewBox="0 0 24 24" width="15" height="15"><circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="1.7"></circle><circle cx="12" cy="12" r="3" fill="currentColor"></circle></svg>
        </span>
        <span>Space</span>
      </a>`
    : "";

  return `<div class="roster-connect">${space}${socialHtml ? `<div class="roster-social-cluster">${socialHtml}</div>` : ""}</div>`;
}

function renderMarksSyncPanel() {
  const el = document.getElementById("marks-sync-panel");
  if (!el) return;
  const hasCloud = cloudConfigured();
  const signed = Boolean(cloudState.email);
  const cloudBlock = hasCloud
    ? `
    <div class="marks-sync-cloud">
      <p class="marks-sync-cloud-title">Cloud sync</p>
      ${
        signed
          ? `<p class="marks-sync-signed">Signed in as <strong>${escapeHtml(cloudState.email)}</strong></p>
             <button type="button" class="marks-sync-btn marks-sync-btn--ghost" id="marks-cloud-signout">Sign out</button>`
          : `<form class="marks-sync-form" id="marks-cloud-form" action="#" method="dialog">
               <input class="marks-sync-input" type="email" id="marks-cloud-email" autocomplete="email" placeholder="Email for magic link" required />
               <button type="submit" class="marks-sync-btn" id="marks-cloud-submit" ${cloudState.busy ? "disabled" : ""}>Email sign-in link</button>
             </form>`
      }
      <p class="marks-sync-msg" id="marks-cloud-msg" role="status">${escapeHtml(cloudState.message)}</p>
    </div>`
    : `<p class="marks-sync-hint">For permanent cross-device sync, connect Supabase (see <a href="./README-CLOUD-SYNC.md">README-CLOUD-SYNC.md</a>). JSON export is always available.</p>`;

  el.innerHTML = `
    <div class="marks-sync-inner">
      <div class="marks-sync-row">
        <p class="marks-sync-kicker">Your ratings &amp; tags</p>
        <div class="marks-sync-actions">
          <button type="button" class="marks-sync-btn" id="marks-export-btn">Export JSON</button>
          <button type="button" class="marks-sync-btn marks-sync-btn--ghost" id="marks-import-btn">Import JSON</button>
          <input type="file" id="marks-import-input" accept="application/json,.json" hidden />
        </div>
      </div>
      ${cloudBlock}
    </div>`;

  el.querySelector("#marks-export-btn")?.addEventListener("click", () => exportMarksJson());

  const importInput = el.querySelector("#marks-import-input");
  const importBtn = el.querySelector("#marks-import-btn");
  importBtn?.addEventListener("click", () => importInput?.click());
  importInput?.addEventListener("change", () => {
    const file = importInput.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        mergeImportedMarks(JSON.parse(String(reader.result)));
        savePersonalMarks();
        void (async () => {
          await pushAllMarksToCloud();
          refreshSpotlightUI();
        })();
        cloudState.message = "Import merged successfully.";
      } catch {
        cloudState.message = "Could not read that JSON file.";
        renderMarksSyncPanel();
        return;
      }
      importInput.value = "";
      renderMarksSyncPanel();
    };
    reader.readAsText(file);
  });

  el.querySelector("#marks-cloud-signout")?.addEventListener("click", async () => {
    const sb = await ensureSupabaseClient();
    cloudState.busy = true;
    renderMarksSyncPanel();
    await sb?.auth.signOut();
    cloudState.busy = false;
    cloudState.message = "Signed out.";
    renderMarksSyncPanel();
  });

  el.querySelector("#marks-cloud-form")?.addEventListener("submit", async (ev) => {
    ev.preventDefault();
    const sb = await ensureSupabaseClient();
    if (!sb) return;
    const email = el.querySelector("#marks-cloud-email")?.value?.trim();
    if (!email) return;
    cloudState.busy = true;
    cloudState.message = "";
    renderMarksSyncPanel();
    const redirect = `${window.location.origin}${window.location.pathname}`;
    const { error } = await sb.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: redirect },
    });
    cloudState.busy = false;
    cloudState.message = error ? error.message : "Check your inbox for the sign-in link.";
    renderMarksSyncPanel();
  });
}

async function initCloudAuth() {
  if (!cloudConfigured()) {
    renderMarksSyncPanel();
    return;
  }
  const sb = await ensureSupabaseClient();
  if (!sb) {
    renderMarksSyncPanel();
    return;
  }
  const { data } = await sb.auth.getSession();
  __cloudUserId = data.session?.user?.id ?? null;
  cloudState.email = data.session?.user?.email ?? null;

  sb.auth.onAuthStateChange(async (event, session) => {
    __cloudUserId = session?.user?.id ?? null;
    cloudState.email = session?.user?.email ?? null;
    if (session?.user && (event === "SIGNED_IN" || event === "INITIAL_SESSION")) {
      await pullMarksFromCloud();
      await pushAllMarksToCloud();
    }
    if (event === "SIGNED_IN") cloudState.message = "Signed in. Marks synced.";
    if (event === "SIGNED_OUT") cloudState.message = "";
    renderMarksSyncPanel();
    refreshSpotlightUI();
  });

  renderMarksSyncPanel();
}

const __galaxyThemeForReset = { theme: state.theme };

const canvas = document.querySelector("#galaxy-canvas");
const ctx = canvas.getContext("2d", { alpha: true });
if (typeof ctx.imageSmoothingQuality === "string") {
  ctx.imageSmoothingQuality = "high";
}
const searchInput = document.querySelector("#search-input");
const themePills = document.querySelector("#theme-pills");
const spotlightThemeStrip = document.querySelector("#spotlight-theme-strip");
const canvasWrap = document.querySelector(".canvas-wrap");
const rosterGrid = document.querySelector("#roster-grid");
const rosterPagination = document.querySelector("#roster-pagination");
const rosterListShell = document.querySelector("#roster-list-shell");
const spotlightFilters = document.querySelector("#spotlight-filters");
const markerFilters = document.querySelector("#marker-filters");
const detailPanel = document.querySelector("#detail-panel");
const detailCard = document.querySelector(".detail-card");
const selectionSummary = document.querySelector("#selection-summary");
const rosterCard = document.querySelector(".roster-card");

function formatNumber(value) {
  return new Intl.NumberFormat("en-US").format(value);
}

function truncate(text, max = 150) {
  if (!text) return "No bio available yet.";
  if (text.length <= max) return text;
  return `${text.slice(0, max).trim()}...`;
}

function relativeDensity(member) {
  if (member.description && member.spaceCount > 1) return "highly connected profile";
  if (member.description) return "detailed bio";
  if (member.spaceCount > 1) return "active across multiple spaces";
  return "light profile";
}

function activeMembers() {
  const query = state.query.trim().toLowerCase();
  return members.filter((member) => {
    const matchTheme = state.theme === "all" || member.theme === state.theme;
    const skillsHay = memberSkillsList(member).join(" ");
    const haystack = `${member.name} ${member.description} ${member.theme} ${skillsHay}`.toLowerCase();
    const matchQuery = !query || haystack.includes(query);
    return matchTheme && matchQuery;
  });
}

function applyPersonalFilters(list) {
  const { starFilter, badgeFilter } = state;
  return list.filter((m) => {
    const r = getPersonalRating(m.entityId);
    const b = getPersonalBadge(m.entityId);
    if (starFilter === "unrated") {
      if (r !== 0) return false;
    } else if (starFilter !== "all") {
      const min = Number(starFilter);
      if (!Number.isFinite(min) || r < min) return false;
    }
    if (badgeFilter === "all") return true;
    if (badgeFilter === "none") return !b;
    return b === badgeFilter;
  });
}

function visibleMembers() {
  return applyPersonalFilters(spotlightMembers(activeMembers()));
}

function selectedMember(list = members) {
  if (!list.length) return null;
  const found = list.find((member) => member.entityId === state.selectedId);
  return found || list[0];
}

function rosterFilterItems(list) {
  return [
    { key: "all", label: "All", count: list.length },
    { key: "x", label: "X", count: list.filter((member) => member.socialLinks?.x).length },
    { key: "github", label: "GitHub", count: list.filter((member) => member.socialLinks?.github).length },
    { key: "linkedin", label: "LinkedIn", count: list.filter((member) => member.socialLinks?.linkedin).length },
  ];
}

function spotlightMembers(list) {
  if (state.rosterFilter === "all") return list;
  return list.filter((member) => member.socialLinks?.[state.rosterFilter]);
}

function rosterPinOrderIndex(name) {
  const i = ROSTER_PAGE1_PIN_ORDER.indexOf(name);
  return i === -1 ? 1000 : i;
}

function hasFullDisplayName(name) {
  const parts = (name || "")
    .trim()
    .split(/\s+/)
    .filter((t) => /[A-Za-zÀ-ÿ0-9]/.test(t));
  return parts.length >= 2;
}

function sortedSpotlightMembers(list) {
  return [...applyPersonalFilters(spotlightMembers(list))].sort((a, b) => {
    const pinA = rosterPinOrderIndex(a.name);
    const pinB = rosterPinOrderIndex(b.name);
    if (pinA !== pinB) return pinA - pinB;
    const fullA = hasFullDisplayName(a.name);
    const fullB = hasFullDisplayName(b.name);
    if (fullA !== fullB) return Number(fullB) - Number(fullA);
    const showcaseScore = (spotlightPriority.get(b.name) || 0) - (spotlightPriority.get(a.name) || 0);
    if (showcaseScore) return showcaseScore;
    const bossScore = Number(b.isBoss) - Number(a.isBoss);
    if (bossScore) return bossScore;
    const featuredScore = Number(b.featured) - Number(a.featured);
    if (featuredScore) return featuredScore;
    const densityScore = b.descLength + b.spaceCount * 24 - (a.descLength + a.spaceCount * 24);
    if (densityScore) return densityScore;
    return a.name.localeCompare(b.name);
  });
}

function renderSpotlightFilters(list) {
  const items = rosterFilterItems(list);
  const activeItem = items.find((item) => item.key === state.rosterFilter && item.count > 0);
  if (!activeItem) {
    state.rosterFilter = "all";
  }

  spotlightFilters.innerHTML = items
    .map(
      (item) => `
        <button
          class="spotlight-filter ${state.rosterFilter === item.key ? "active" : ""}"
          data-roster-filter="${item.key}"
          type="button"
        >
          <span>${item.label}</span>
          <span class="spotlight-filter-count">${formatNumber(item.count)}</span>
        </button>
      `,
    )
    .join("");
}

function renderThemePillsInto(container, compact) {
  if (!container) return;
  const counts = memberSummary.themeCounts;
  const total = memberSummary.totalMembers;
  const pills = [
    {
      key: "all",
      label: "All",
      color: "#EEF4FF",
      count: total,
    },
    ...Object.entries(counts).map(([theme, count]) => ({
      key: theme,
      label: theme,
      color: palette[theme] || "#94A3B8",
      count,
    })),
  ];

  const compactClass = compact ? " theme-pill--compact" : "";
  container.innerHTML = pills
    .map(
      (pill) => `
        <button
          class="theme-pill${compactClass} ${state.theme === pill.key ? "active" : ""}"
          data-theme="${pill.key}"
          type="button"
        >
          <span class="theme-dot" style="color:${pill.color}; background:${pill.color};"></span>
          <span>${pill.label}</span>
          <span class="theme-pill-count">${formatNumber(pill.count)}</span>
        </button>
      `,
    )
    .join("");
}

function buildThemePills() {
  renderThemePillsInto(themePills, false);
  renderThemePillsInto(spotlightThemeStrip, true);
}

function renderStarRow(entityId, compact) {
  const r = getPersonalRating(entityId);
  const mod = compact ? " star-rail--compact" : "";
  const stars = [1, 2, 3, 4, 5]
    .map(
      (i) => `
    <button type="button" class="star-btn${i <= r ? " is-lit" : ""}" data-star="${i}" aria-label="${i} out of 5 stars">
      <span class="star-shape" aria-hidden="true"></span>
    </button>`,
    )
    .join("");
  return `<div class="star-rail${mod}">${stars}</div>`;
}

function renderPastilleRow(entityId, compact) {
  const current = getPersonalBadge(entityId);
  const mod = compact ? " pastille-rail--compact" : "";
  const dots = BADGE_KEYS.map(
    (k) => `
    <button type="button" class="pastille-dot pastille-dot--${k}${current === k ? " is-on" : ""}" data-pastille="${k}" aria-label="${BADGE_META[k].label} tag" title="${BADGE_META[k].label}"></button>`,
  ).join("");
  const noneOn = !current;
  return `
    <div class="pastille-rail${mod}" role="group" aria-label="Color tag">
      <button type="button" class="pastille-dot pastille-dot--clear${noneOn ? " is-on" : ""}" data-pastille="clear" aria-label="No color tag" title="None"></button>
      ${dots}
    </div>`;
}

function renderMarkerFilters(baseList) {
  if (!markerFilters) return;
  const scope = spotlightMembers(baseList);
  const n = scope.length;
  const starCounts = {
    all: n,
    unrated: scope.filter((m) => getPersonalRating(m.entityId) === 0).length,
    5: scope.filter((m) => getPersonalRating(m.entityId) >= 5).length,
    4: scope.filter((m) => getPersonalRating(m.entityId) >= 4).length,
    3: scope.filter((m) => getPersonalRating(m.entityId) >= 3).length,
    2: scope.filter((m) => getPersonalRating(m.entityId) >= 2).length,
    1: scope.filter((m) => getPersonalRating(m.entityId) >= 1).length,
  };
  const badgeCounts = {
    all: n,
    none: scope.filter((m) => !getPersonalBadge(m.entityId)).length,
    blue: scope.filter((m) => getPersonalBadge(m.entityId) === "blue").length,
    green: scope.filter((m) => getPersonalBadge(m.entityId) === "green").length,
    red: scope.filter((m) => getPersonalBadge(m.entityId) === "red").length,
    yellow: scope.filter((m) => getPersonalBadge(m.entityId) === "yellow").length,
  };
  const sf = state.starFilter;
  const bf = state.badgeFilter;
  const starRow = [
    ["all", "Any", starCounts.all],
    ["unrated", "Unrated", starCounts.unrated],
    ["5", "5 ★", starCounts[5]],
    ["4", "4+ ★", starCounts[4]],
    ["3", "3+ ★", starCounts[3]],
    ["2", "2+ ★", starCounts[2]],
    ["1", "1+ ★", starCounts[1]],
  ]
    .map(
      ([key, label, count]) => `
      <button type="button" class="marker-chip ${sf === key ? "active" : ""}" data-marker-star-filter="${key}">
        <span>${label}</span>
        <span class="marker-chip-count">${formatNumber(count)}</span>
      </button>`,
    )
    .join("");
  const badgeRow = [
    ["all", "Any tag", null, true],
    ["none", "None", null, false],
    ["blue", "", "blue", false],
    ["green", "", "green", false],
    ["red", "", "red", false],
    ["yellow", "", "yellow", false],
  ]
    .map(([key, label, colorKey, isText]) => {
      const count = badgeCounts[key];
      const active = bf === key;
      if (isText) {
        return `
      <button type="button" class="marker-chip ${active ? "active" : ""}" data-marker-badge-filter="${key}">
        <span>${label}</span>
        <span class="marker-chip-count">${formatNumber(count)}</span>
      </button>`;
      }
      if (key === "none") {
        return `
      <button type="button" class="marker-chip marker-chip--pastille marker-chip--none ${active ? "active" : ""}" data-marker-badge-filter="none" aria-label="No tag" title="No tag">
        <span class="marker-none-icon" aria-hidden="true"></span>
        <span class="marker-chip-count">${formatNumber(count)}</span>
      </button>`;
      }
      const meta = BADGE_META[colorKey];
      return `
      <button type="button" class="marker-chip marker-chip--pastille ${active ? "active" : ""}" data-marker-badge-filter="${key}" style="--pastille:${meta.hex}" aria-label="${meta.label}" title="${meta.label}">
        <span class="marker-pastille-swatch" aria-hidden="true"></span>
        <span class="marker-chip-count">${formatNumber(count)}</span>
      </button>`;
    })
    .join("");
  markerFilters.innerHTML = `
    <div class="marker-filters-inner">
      <p class="marker-filters-label">Your marks</p>
      <div class="marker-filters-row" role="toolbar" aria-label="Filter by star rating">${starRow}</div>
      <div class="marker-filters-row marker-filters-row--badges" role="toolbar" aria-label="Filter by color tag">${badgeRow}</div>
    </div>`;
}

function renderDetail(member) {
  if (!member) {
    detailPanel.innerHTML = `<div class="empty-state">No profiles match the current filters.</div>`;
    return;
  }

  detailPanel.innerHTML = `
    <div class="detail-top">
      <div class="detail-identity">
        <div class="detail-avatar" style="border-color:${member.color}55;">
          ${renderAvatar(member, "avatar-large")}
        </div>
        <div class="detail-heading">
          <div class="detail-theme">
            <span class="theme-dot" style="color:${member.color}; background:${member.color};"></span>
            <span>${member.theme}</span>
          </div>
          <h2 class="detail-name">${member.name}</h2>
          <p class="detail-description">${member.description || "This curator has not added a detailed bio yet."}</p>
          ${renderDetailSkillsSection(member)}
          <div class="detail-markers" data-entity-id="${member.entityId}">
            <div class="detail-markers-label">Your rating and tag</div>
            <div class="detail-markers-controls">
              ${renderStarRow(member.entityId, false)}
              ${renderPastilleRow(member.entityId, false)}
            </div>
            <p class="detail-markers-hint">Stored on this device. Use Export JSON or cloud sign-in for a permanent backup.</p>
          </div>
        </div>
      </div>
    </div>
    ${renderDetailConnect(member)}
  `;
}

function renderRoster(list) {
  const sorted = sortedSpotlightMembers(list);
  const total = sorted.length;

  if (!total) {
    rosterGrid.innerHTML = `<div class="empty-state">No profiles match these filters. Try another category, search, link filter, or relax your star and tag filters.</div>`;
    rosterPagination.innerHTML = "";
    return;
  }

  const totalPages = Math.max(1, Math.ceil(total / ROSTER_PAGE_SIZE));
  if (state.rosterPage > totalPages) state.rosterPage = totalPages;
  if (state.rosterPage < 1) state.rosterPage = 1;

  const start = (state.rosterPage - 1) * ROSTER_PAGE_SIZE;
  const end = Math.min(start + ROSTER_PAGE_SIZE, total);
  const pageItems = sorted.slice(start, end);

  rosterGrid.innerHTML = pageItems
    .map(
      (member) => `
        <article class="roster-item${member.entityId === state.selectedId ? " is-selected" : ""}" data-entity-id="${member.entityId}">
          <div class="roster-top">
            <div>
              <p class="roster-name">${member.name}</p>
              <p class="roster-theme">${member.isBoss ? "Founder" : member.theme}</p>
            </div>
            <div class="roster-avatar" style="background:${member.color}; box-shadow:0 0 28px ${member.color}33;">
              ${renderAvatar(member, "avatar-small")}
            </div>
          </div>
          <div class="roster-markers">
            ${renderStarRow(member.entityId, true)}
            ${renderPastilleRow(member.entityId, true)}
          </div>
          <p class="roster-description">${truncate(member.description, 175)}</p>
          ${renderRosterSkillsChips(member)}
          ${renderRosterConnectRow(member)}
        </article>
      `,
    )
    .join("");

  const atFirst = state.rosterPage <= 1;
  const atLast = state.rosterPage >= totalPages;
  rosterPagination.innerHTML = `
    <p class="roster-pagination-range" id="roster-page-summary">
      Showing <strong>${formatNumber(start + 1)}–${formatNumber(end)}</strong> of
      <strong>${formatNumber(total)}</strong>
      <span class="roster-pagination-page">· Page ${formatNumber(state.rosterPage)} of ${formatNumber(totalPages)}</span>
    </p>
    <div class="roster-pagination-nav">
      <button type="button" class="roster-page-btn" data-roster-nav="prev" ${atFirst ? "disabled" : ""} aria-label="Previous page">
        Previous
      </button>
      <button type="button" class="roster-page-btn" data-roster-nav="next" ${atLast ? "disabled" : ""} aria-label="Next page">
        Next
      </button>
    </div>
  `;
}

function isGalaxyThemeFocus() {
  return state.theme !== "all";
}

function galaxyOrbitScale() {
  return isGalaxyThemeFocus() ? 2.55 : 1;
}

function memberIsGalaxyHighlighted(member, selected, hoveredId) {
  return (
    member.entityId === hoveredId ||
    member.entityId === selected?.entityId ||
    member.entityId === state.selectedId
  );
}

function memberDisplayRadius(member, selected, hoveredId) {
  const highlighted = memberIsGalaxyHighlighted(member, selected, hoveredId);
  let r = member.radius;
  if (isGalaxyThemeFocus() && member.theme === state.theme) {
    const richness = Math.min(1, (member.descLength || 0) / 520 + (member.spaceCount || 0) / 10);
    r *= Math.exp(0.68 + richness * 1.12);
  }
  if (highlighted) r += 4;
  return Math.min(r, 44);
}

function truncateGalaxyLabel(name, max = 20) {
  if (!name) return "";
  if (name.length <= max) return name;
  return `${name.slice(0, max - 1).trim()}…`;
}

function updateSummary(list) {
  const count = list.length;
  const activeTheme = state.theme === "all" ? "all themes" : state.theme;
  const marks =
    state.starFilter !== "all" || state.badgeFilter !== "all"
      ? ", with your star and tag filters applied"
      : "";
  const defaultBlurb =
    state.starFilter === "all" &&
    state.badgeFilter === "all" &&
    count === members.length &&
    !state.query;
  selectionSummary.textContent = defaultBlurb
    ? `${formatNumber(count)} curator profiles with bios, grouped by shared themes.`
    : `${formatNumber(count)} curator profiles match "${activeTheme}"${state.query ? ` and "${state.query}"` : ""}${marks}.`;
}

function anchorMap(list, width, height) {
  const themes = [...new Set(list.map((member) => member.theme))];
  if (themes.length === 1) {
    const theme = themes[0];
    return new Map([[theme, { x: width / 2, y: height / 2 }]]);
  }
  const radiusX = width * 0.41;
  const radiusY = height * 0.37;
  return new Map(
    themes.map((theme, index) => {
      const angle = state.phase + (index / Math.max(themes.length, 1)) * Math.PI * 2;
      return [
        theme,
        {
          x: width / 2 + Math.cos(angle) * radiusX,
          y: height / 2 + Math.sin(angle) * radiusY,
        },
      ];
    }),
  );
}

function readCanvasCssSize() {
  let w = canvas.clientWidth;
  let h = canvas.clientHeight;
  if (!w || !h) {
    const r = canvas.getBoundingClientRect();
    w = r.width;
    h = r.height;
  }
  if (w < 4 || h < 4) {
    const wrap = canvasWrap;
    if (wrap) {
      w = wrap.clientWidth || wrap.getBoundingClientRect().width;
      h = wrap.clientHeight || wrap.getBoundingClientRect().height;
    }
  }
  const width = Math.max(120, Math.round(w) || 120);
  const height = Math.max(120, Math.round(h) || 120);
  return { width, height, br: canvas.getBoundingClientRect() };
}

function resizeCanvas() {
  const { width: cssW, height: cssH } = readCanvasCssSize();
  const raw = window.devicePixelRatio || 1;
  const dpr = Math.min(3, Math.max(1, raw * 1.12));
  const needW = Math.max(1, Math.round(cssW * dpr));
  const needH = Math.max(1, Math.round(cssH * dpr));
  if (canvas.width !== needW || canvas.height !== needH) {
    canvas.width = needW;
    canvas.height = needH;
  }
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

/** When a single theme is shown, snap dots to Vogel targets so they are never stuck off-screen (bitmap/CSS size mismatch). */
function snapSingleThemeVogelPositions(list) {
  if (!list.length) return;
  const { width, height } = readCanvasCssSize();
  const anchors = anchorMap(list, width, height);
  if (anchors.size !== 1) return;
  const diskHalfW = Math.max(64, width * 0.5 - 40);
  const diskHalfH = Math.max(64, height * 0.5 - 76);
  const anchor = [...anchors.values()][0];
  const n = Math.max(list.length, 1);
  list.forEach((member, index) => {
    const idx = index + 1;
    const golden = idx * 2.39996322972865332;
    const normR = Math.sqrt(idx / (n + 1));
    const spin = state.phase * 0.1;
    const t = golden + spin;
    member.x = anchor.x + Math.cos(t) * normR * diskHalfW;
    member.y = anchor.y + Math.sin(t) * normR * diskHalfH;
    member.vx = 0;
    member.vy = 0;
  });
}

/** Même physique que le paysage ; `freezeEntityId` fige un membre (focus perso) pour ne pas bouger son point de sortie. */
function stepMemberLayoutPhysics(list, width, height, now, freezeEntityId = null) {
  const anchors = anchorMap(list, width, height);
  const singleThemeDisk = anchors.size === 1;
  const orbitScale = galaxyOrbitScale();
  const diskHalfW = singleThemeDisk ? Math.max(64, width * 0.5 - 40) : 0;
  const diskHalfH = singleThemeDisk ? Math.max(64, height * 0.5 - 76) : 0;
  const layoutPull = 0.012;
  const layoutDamp = 0.92;
  const angleDrift = now * 0.00008;

  list.forEach((member, index) => {
    if (freezeEntityId && member.entityId === freezeEntityId) return;
    const anchor = anchors.get(member.theme) || { x: width / 2, y: height / 2 };
    const angle = member.seed + index * 0.07 + angleDrift;
    let targetX;
    let targetY;

    if (singleThemeDisk) {
      const n = Math.max(list.length, 1);
      const idx = index + 1;
      const golden = idx * 2.39996322972865332;
      const normR = Math.sqrt(idx / (n + 1));
      const wobbleX = Math.sin(now * 0.00028 + member.seed * 3.9) * 4;
      const wobbleY = Math.cos(now * 0.00026 + member.seed * 2.7) * 4;
      const spin = state.phase * 0.1;
      const t = golden + spin + angleDrift;
      targetX = anchor.x + Math.cos(t) * normR * diskHalfW + wobbleX;
      targetY = anchor.y + Math.sin(t) * normR * diskHalfH + wobbleY;
    } else {
      const viewScale = Math.min(1.85, Math.min(width, height) / 520);
      const orbit = (42 + (index % 12) * 16 + member.spaceCount * 8) * orbitScale * viewScale;
      targetX = anchor.x + Math.cos(angle) * orbit;
      targetY = anchor.y + Math.sin(angle * 1.2) * (orbit * 0.72);
    }

    const curX = Number.isFinite(member.x) ? member.x : targetX;
    const curY = Number.isFinite(member.y) ? member.y : targetY;
    member.vx += (targetX - curX) * layoutPull;
    member.vy += (targetY - curY) * layoutPull;
    member.vx *= layoutDamp;
    member.vy *= layoutDamp;
    member.x = curX + member.vx;
    member.y = curY + member.vy;
  });
}

function gfBackgroundDotsExcludingFocus(list, focusId, selected, hoveredId) {
  return list
    .filter((m) => m.entityId !== focusId)
    .map((m) => ({
      x: m.x,
      y: m.y,
      color: m.color,
      r: memberDisplayRadius(m, selected, hoveredId),
    }));
}

function drawFrame() {
  resizeCanvas();
  const { width, height, br: brSize } = readCanvasCssSize();
  const now = performance.now();
  const list = visibleMembers();

  if (galaxyFocus.mode !== "landscape") {
    const stillVisible = galaxyFocus.memberId && list.some((m) => m.entityId === galaxyFocus.memberId);
    if (!stillVisible) {
      gfFinishExitToLandscape();
    } else {
      const selected = selectedMember(list);
      const hoveredId = state.hoveredId;
      stepMemberLayoutPhysics(list, width, height, now, galaxyFocus.memberId);
      state.phase += 0.0009;
      ctx.clearRect(0, 0, width, height);
      drawGalaxyPersonFocus(width, height, now, list, selected, hoveredId);
      requestAnimationFrame(drawFrame);
      return;
    }
  }

  const selected = selectedMember(list);
  const hoveredId = state.hoveredId;
  const anchors = anchorMap(list, width, height);

  ctx.clearRect(0, 0, width, height);

  const backgroundGlow = ctx.createRadialGradient(width / 2, height / 2, 0, width / 2, height / 2, height * 0.52);
  backgroundGlow.addColorStop(0, "rgba(182, 128, 255, 0.08)");
  backgroundGlow.addColorStop(1, "rgba(255, 255, 255, 0)");
  ctx.fillStyle = backgroundGlow;
  ctx.fillRect(0, 0, width, height);

  ctx.save();
  const singleThemeDisk = anchors.size === 1;
  const orbitScale = galaxyOrbitScale();
  const diskHalfW = singleThemeDisk ? Math.max(64, width * 0.5 - 40) : 0;
  const diskHalfH = singleThemeDisk ? Math.max(64, height * 0.5 - 76) : 0;

  const ringRadius = singleThemeDisk
    ? Math.max(diskHalfW, diskHalfH)
    : isGalaxyThemeFocus()
      ? 118
      : 90;
  anchors.forEach((anchor, theme) => {
    const color = palette[theme] || "#94A3B8";
    ctx.beginPath();
    ctx.strokeStyle = `${color}25`;
    ctx.lineWidth = isGalaxyThemeFocus() ? 1.25 : 1;
    if (singleThemeDisk && typeof ctx.ellipse === "function") {
      ctx.ellipse(anchor.x, anchor.y, diskHalfW * 0.98, diskHalfH * 0.98, 0, 0, Math.PI * 2);
    } else {
      ctx.arc(anchor.x, anchor.y, ringRadius, 0, Math.PI * 2);
    }
    ctx.stroke();

    ctx.fillStyle = "#796f99";
    ctx.font = isGalaxyThemeFocus()
      ? '600 13px system-ui, "Avenir Next", "Segoe UI", sans-serif'
      : '500 12px system-ui, "Avenir Next", "Segoe UI", sans-serif';
    const label = String(theme);
    const tw = ctx.measureText(label).width;
    const labelY = singleThemeDisk
      ? Math.max(14, anchor.y - diskHalfH + 16)
      : anchor.y - ringRadius - 14;
    ctx.fillText(label, anchor.x - tw / 2, labelY);
  });
  ctx.restore();

  stepMemberLayoutPhysics(list, width, height, now, null);

  list.forEach((member) => {
    const highlighted = memberIsGalaxyHighlighted(member, selected, hoveredId);
    const radius = memberDisplayRadius(member, selected, hoveredId);

    ctx.beginPath();
    ctx.fillStyle = `${member.color}${highlighted ? "" : isGalaxyThemeFocus() ? "e6" : "cc"}`;
    ctx.shadowBlur = highlighted ? 32 : isGalaxyThemeFocus() ? 22 : 16;
    ctx.shadowColor = member.color;
    ctx.arc(member.x, member.y, radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    const tag = getPersonalBadge(member.entityId);
    if (tag) {
      ctx.beginPath();
      ctx.strokeStyle = BADGE_META[tag].hex;
      ctx.globalAlpha = 0.88;
      ctx.lineWidth = 1.65;
      ctx.arc(member.x, member.y, radius + 3.2, 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = 1;
    }

    if (highlighted) {
      ctx.beginPath();
      ctx.strokeStyle = `${member.color}77`;
      ctx.lineWidth = 2;
      ctx.arc(member.x, member.y, radius + Math.min(12, radius * 0.35), 0, Math.PI * 2);
      ctx.stroke();
    }
  });

  if (isGalaxyThemeFocus()) {
    ctx.save();
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    ctx.font = '600 11px system-ui, "Avenir Next", "Segoe UI", sans-serif';
    list.forEach((member) => {
      const radius = memberDisplayRadius(member, selected, hoveredId);
      const label = truncateGalaxyLabel(member.name, 22);
      const tx = member.x;
      const ty = member.y + radius + 4;
      ctx.lineJoin = "round";
      ctx.lineWidth = 4;
      ctx.strokeStyle = "rgba(255, 255, 255, 0.92)";
      ctx.strokeText(label, tx, ty);
      ctx.fillStyle = memberIsGalaxyHighlighted(member, selected, hoveredId) ? "#120c1f" : "rgba(35, 31, 48, 0.9)";
      ctx.fillText(label, tx, ty);
    });
    ctx.restore();
  } else {
    const pin = list.find((m) => m.entityId === hoveredId) || selected;
    if (pin && (hoveredId || selected)) {
      const radius = memberDisplayRadius(pin, selected, hoveredId);
      ctx.save();
      ctx.fillStyle = "#2b2734";
      ctx.font = '600 13px system-ui, "Avenir Next", "Segoe UI", sans-serif';
      ctx.textAlign = "left";
      ctx.textBaseline = "bottom";
      ctx.fillText(pin.name, pin.x + radius + 8, pin.y - radius - 4);
      ctx.restore();
    }
  }

  state.phase += 0.0009;
  requestAnimationFrame(drawFrame);
}

function pickMemberFromPointer(event) {
  const bounds = canvas.getBoundingClientRect();
  const { width: logicW, height: logicH } = readCanvasCssSize();
  let x = event.clientX - bounds.left;
  let y = event.clientY - bounds.top;
  if (bounds.width >= 2 && bounds.height >= 2) {
    x = (x / bounds.width) * logicW;
    y = (y / bounds.height) * logicH;
  }
  const list = visibleMembers();

  let nearest = null;
  let nearestDistance = Infinity;

  const selected = selectedMember(list);
  list.forEach((member) => {
    const r = memberDisplayRadius(member, selected, state.hoveredId);
    const distance = Math.hypot(member.x - x, member.y - y);
    if (distance < r + 12 && distance < nearestDistance) {
      nearest = member;
      nearestDistance = distance;
    }
  });

  return nearest;
}

function refreshSpotlightUI({ rebuildThemes = false } = {}) {
  const base = activeMembers();
  if (rebuildThemes) buildThemePills();
  renderSpotlightFilters(base);
  renderMarkerFilters(base);
  const vis = visibleMembers();
  const chosen = selectedMember(vis);
  if (chosen) state.selectedId = chosen.entityId;
  else state.selectedId = null;
  updateSummary(vis);
  renderDetail(chosen);
  renderRoster(base);
  snapSingleThemeVogelPositions(vis);
}

function syncUI() {
  if (galaxyFocus.mode !== "landscape") gfFinishExitToLandscape();
  if (__galaxyThemeForReset.theme !== state.theme) {
    __galaxyThemeForReset.theme = state.theme;
    members.forEach((m) => {
      m.x = undefined;
      m.y = undefined;
      m.vx = 0;
      m.vy = 0;
    });
  }
  state.rosterPage = 1;
  refreshSpotlightUI({ rebuildThemes: true });
}

loadPersonalMarks();
void (async () => {
  await initCloudAuth();
  resizeCanvas();
  syncUI();
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      resizeCanvas();
      syncUI();
    });
  });
  requestAnimationFrame(drawFrame);
})();

if (canvasWrap && typeof ResizeObserver !== "undefined") {
  const ro = new ResizeObserver(() => {
    resizeCanvas();
    snapSingleThemeVogelPositions(visibleMembers());
    if (galaxyFocus.mode !== "landscape") gfRebuildSkillLayout();
  });
  ro.observe(canvasWrap);
}

window.addEventListener("load", () => {
  resizeCanvas();
  snapSingleThemeVogelPositions(visibleMembers());
});

searchInput.addEventListener("input", (event) => {
  state.query = event.target.value;
  syncUI();
});

function onThemePillClick(event) {
  const button = event.target.closest("[data-theme]");
  if (!button) return;
  state.theme = button.dataset.theme;
  syncUI();
}

themePills.addEventListener("click", onThemePillClick);
if (spotlightThemeStrip) {
  spotlightThemeStrip.addEventListener("click", onThemePillClick);
}

if (spotlightFilters) {
  spotlightFilters.addEventListener("click", (event) => {
    const button = event.target.closest("[data-roster-filter]");
    if (!button) return;
    state.rosterFilter = button.dataset.rosterFilter;
    state.rosterPage = 1;
    refreshSpotlightUI();
  });
}

if (markerFilters) {
  markerFilters.addEventListener("click", (event) => {
    const starChip = event.target.closest("[data-marker-star-filter]");
    if (starChip) {
      state.starFilter = starChip.dataset.markerStarFilter;
      state.rosterPage = 1;
      refreshSpotlightUI();
      return;
    }
    const badgeChip = event.target.closest("[data-marker-badge-filter]");
    if (badgeChip) {
      state.badgeFilter = badgeChip.dataset.markerBadgeFilter;
      state.rosterPage = 1;
      refreshSpotlightUI();
    }
  });
}

if (rosterCard) {
  rosterCard.addEventListener("click", (event) => {
    const nav = event.target.closest("[data-roster-nav]");
    if (!nav || nav.disabled) return;
    const list = activeMembers();
    const sorted = sortedSpotlightMembers(list);
    const total = sorted.length;
    const totalPages = Math.max(1, Math.ceil(total / ROSTER_PAGE_SIZE));
    if (nav.dataset.rosterNav === "prev" && state.rosterPage > 1) {
      state.rosterPage -= 1;
      renderRoster(list);
      rosterListShell?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    } else if (nav.dataset.rosterNav === "next" && state.rosterPage < totalPages) {
      state.rosterPage += 1;
      renderRoster(list);
      rosterListShell?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  });
}

canvas.addEventListener("mousemove", (event) => {
  if (galaxyFocus.mode !== "landscape") {
    const { x, y } = gfCanvasToLogic(event);
    const { width, height } = readCanvasCssSize();
    const zone = gfGalaxyPointerTargets(x, y, performance.now(), width, height);
    canvas.style.cursor = zone === "empty" ? "default" : "pointer";
    return;
  }
  const member = pickMemberFromPointer(event);
  state.hoveredId = member?.entityId || null;
  canvas.style.cursor = member ? "pointer" : "default";
});

canvas.addEventListener("mouseleave", () => {
  state.hoveredId = null;
  canvas.style.cursor = "default";
});

canvas.addEventListener("click", (event) => {
  const { x, y } = gfCanvasToLogic(event);
  const { width, height } = readCanvasCssSize();
  const now = performance.now();

  if (galaxyFocus.mode !== "landscape") {
    const zone = gfGalaxyPointerTargets(x, y, now, width, height);
    if (zone === "back") {
      requestGalaxyPersonExit();
      return;
    }
    if (zone === "hub" || zone === "skill") return;
    requestGalaxyPersonExit();
    return;
  }

  const member = pickMemberFromPointer(event);
  if (!member) return;
  if (memberSkillsList(member).length > 0) {
    startGalaxyPersonFocus(member);
    return;
  }
  state.selectedId = member.entityId;
  renderDetail(member);
  renderRoster(activeMembers());
});

window.addEventListener("keydown", (event) => {
  if (event.key !== "Escape") return;
  if (galaxyFocus.mode === "landscape") return;
  requestGalaxyPersonExit();
});

if (rosterGrid) {
  rosterGrid.addEventListener("click", (event) => {
    const starBtn = event.target.closest("[data-star]");
    if (starBtn) {
      const card = starBtn.closest("[data-entity-id]");
      if (card) {
        setPersonalRating(card.dataset.entityId, Number(starBtn.dataset.star));
        refreshSpotlightUI();
      }
      event.stopPropagation();
      return;
    }
    const pastBtn = event.target.closest("[data-pastille]");
    if (pastBtn) {
      const card = pastBtn.closest("[data-entity-id]");
      if (card) {
        setPersonalBadge(card.dataset.entityId, pastBtn.dataset.pastille);
        refreshSpotlightUI();
      }
      event.stopPropagation();
      return;
    }
    if (event.target.closest("a")) return;
    const card = event.target.closest("[data-entity-id]");
    if (!card) return;
    if (galaxyFocus.mode !== "landscape") gfFinishExitToLandscape();
    state.selectedId = card.dataset.entityId;
    renderDetail(selectedMember(visibleMembers()));
    renderRoster(activeMembers());
  });
}

if (detailCard) {
  detailCard.addEventListener("click", (event) => {
    const wrap = event.target.closest(".detail-markers");
    if (!wrap) return;
    const id = wrap.dataset.entityId;
    const starBtn = event.target.closest("[data-star]");
    if (starBtn && id) {
      setPersonalRating(id, Number(starBtn.dataset.star));
      refreshSpotlightUI();
      return;
    }
    const pastBtn = event.target.closest("[data-pastille]");
    if (pastBtn && id) {
      setPersonalBadge(id, pastBtn.dataset.pastille);
      refreshSpotlightUI();
    }
  });
}

window.addEventListener("resize", () => {
  resizeCanvas();
  if (galaxyFocus.mode !== "landscape") gfRebuildSkillLayout();
});
