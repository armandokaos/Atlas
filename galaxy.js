function getGalaxyClusterKey(member) {
  if (state.galaxyViewMode === "team") {
    if (state.orgGroup !== "all") return state.orgGroup;
    return memberTeamGalaxyClusterKey(member);
  }
  if (state.galaxyViewMode === "skills") {
    if (state.skillGalaxy !== "all") return state.skillGalaxy;
    return member.skillClusterKey;
  }
  return member.theme;
}

function sortedGalaxyClusterKeys(keys) {
  const uniq = [...new Set(keys)];
  if (state.galaxyViewMode === "skills") {
    const out = [];
    GALAXY_TOP_SKILL_KEYS.forEach((k) => {
      if (uniq.includes(k)) out.push(k);
    });
    if (uniq.includes(GALAXY_SKILL_OTHER)) out.push(GALAXY_SKILL_OTHER);
    uniq.forEach((k) => {
      if (!out.includes(k)) out.push(k);
    });
    return out;
  }
  if (state.galaxyViewMode === "team") {
    return [...uniq].sort((a, b) => {
      const rank = (k) => {
        if (k.includes("|")) return 900 + k.length * 0.001;
        const i = ORG_GROUP_PILL_ORDER.indexOf(k);
        return i === -1 ? 998 : i;
      };
      const ra = rank(a);
      const rb = rank(b);
      if (ra !== rb) return ra - rb;
      return String(a).localeCompare(String(b));
    });
  }
  return [...uniq].sort((a, b) => String(a).localeCompare(String(b)));
}

function getGalaxyClusterColor(key) {
  if (state.galaxyViewMode === "category") return palette[key] || "#94A3B8";
  if (state.galaxyViewMode === "team") {
    if (String(key).includes("|")) {
      const parts = String(key).split("|").filter(Boolean);
      const hexes = parts.map((p) => ORG_GROUP_DOT_COLORS[p]).filter(Boolean);
      if (hexes.length >= 2) return blendHex2(hexes[0], hexes[1], 0.5);
      return hexes[0] || "#94A3B8";
    }
    return ORG_GROUP_DOT_COLORS[key] || "#94A3B8";
  }
  return galaxySkillHex(key);
}

function getGalaxyClusterLabel(key) {
  if (state.galaxyViewMode === "category") return String(key);
  if (state.galaxyViewMode === "team") {
    if (String(key).includes("|")) {
      return String(key)
        .split("|")
        .map((p) => ORG_GROUP_LABEL_BY_KEY[p] || p)
        .join(" + ");
    }
    return ORG_GROUP_LABEL_BY_KEY[key] || String(key);
  }
  return GALAXY_SKILL_LABEL_BY_KEY.get(key) || String(key);
}

function isGalaxyClusterFocus() {
  if (state.galaxyViewMode === "category") return state.theme !== "all";
  if (state.galaxyViewMode === "team") return state.orgGroup !== "all";
  return state.skillGalaxy !== "all";
}

/** Search + spotlight + marks only — ignores galaxy theme/org/skill pills (same density target as « All »). */
function galaxyRadiusReferenceMemberCount() {
  const list = applyPersonalFilters(
    spotlightMembers(uiMembers().filter((m) => searchQueryMatchesHaystack(buildMemberSearchHaystack(m), state.query))),
  );
  return Math.max(1, list.length);
}

/**
 * Count passed to `galaxyMemberDotRadiusPx` / overlap. In cluster focus, blend toward the full-map
 * reference so filtered views don't use tiny-N sizing (huge dots + cramped Vogel disk).
 */
const GALAXY_CLUSTER_RADIUS_BLEND = 0.82;

function galaxyRadiusLayoutCountFromList(list) {
  const vis = Math.max(1, list.length);
  if (!isGalaxyClusterFocus() || galaxyFocus.mode !== "landscape") return vis;
  const ref = galaxyRadiusReferenceMemberCount();
  if (ref <= vis) return vis;
  return Math.min(ref, Math.round(vis + (ref - vis) * GALAXY_CLUSTER_RADIUS_BLEND));
}

function memberIsGalaxyClusterFocused(member) {
  if (!isGalaxyClusterFocus()) return false;
  if (state.galaxyViewMode === "category") return member.theme === state.theme;
  if (state.galaxyViewMode === "team") return memberBelongsToOrgGroup(member, state.orgGroup);
  return memberMatchesSkillGalaxyFilter(member);
}

function galaxyMemberBaseColor(member) {
  const tag = getPersonalBadge(member.entityId);
  if (tag) return BADGE_META[tag].hex;
  if (member.isBoss) return BOSS_COLOR;
  if (state.galaxyViewMode === "skills") {
    if (state.skillGalaxy !== "all") return galaxySkillHex(state.skillGalaxy);
    return galaxySkillHex(member.skillClusterKey);
  }
  if (state.galaxyViewMode === "team") {
    const cols = galaxyTeamColorsForMember(member);
    if (cols.length >= 2) return blendHex2(cols[0], cols[1], 0.5);
    return cols[0] || "#94A3B8";
  }
  return member.color;
}

function galaxyHexToRgb(hex) {
  const raw = String(hex || "#94A3B8").replace(/^#/, "");
  if (!/^[0-9a-f]{6}$/i.test(raw)) return { r: 148, g: 163, b: 184 };
  const n = parseInt(raw, 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

/** URL → { status, img } for canvas drawImage (CORS-safe when gateway allows). */
const __galaxyAvatarByUrl = new Map();

function galaxyAvatarEnsureEntry(urlRaw) {
  const u = resolveMemberMediaUrl(urlRaw) || String(urlRaw || "").trim();
  if (!u) return null;
  let e = __galaxyAvatarByUrl.get(u);
  if (!e) {
    e = { status: "idle" };
    __galaxyAvatarByUrl.set(u, e);
  }
  return e;
}

function galaxyAvatarStartLoad(urlRaw) {
  const u = resolveMemberMediaUrl(urlRaw) || String(urlRaw || "").trim();
  if (!u) return;
  const e = galaxyAvatarEnsureEntry(u);
  if (!e || e.status !== "idle") return;
  e.status = "loading";
  const img = new Image();
  img.crossOrigin = "anonymous";
  img.onload = () => {
    if (e.status !== "loading") return;
    if (!(img.naturalWidth > 0)) {
      e.status = "error";
      return;
    }
    e.img = img;
    e.status = "ready";
  };
  img.onerror = () => {
    e.status = "error";
    e.img = undefined;
  };
  img.src = u;
}

function galaxyAvatarDrainPreload(members) {
  const cap = GALAXY_AVATAR_PRELOAD_PER_FRAME;
  let started = 0;
  const seen = new Set();
  for (const m of members) {
    if (started >= cap) break;
    const u = resolveMemberMediaUrl(m?.avatarUrl) || String(m?.avatarUrl || "").trim();
    if (!u || seen.has(u)) continue;
    seen.add(u);
    const e = galaxyAvatarEnsureEntry(u);
    if (e && e.status === "idle") {
      galaxyAvatarStartLoad(u);
      started += 1;
    }
  }
}

function galaxyAvatarReadyImg(urlRaw) {
  const u = resolveMemberMediaUrl(urlRaw) || String(urlRaw || "").trim();
  if (!u) return null;
  const e = __galaxyAvatarByUrl.get(u);
  if (!e || e.status !== "ready" || !e.img) return null;
  const img = e.img;
  if (!img.complete || !(img.naturalWidth > 0)) return null;
  return img;
}

/** object-fit: cover inside a circle (own save/restore). */
function drawGalaxyAvatarCoverInCircle(ctx, img, cx, cy, rad) {
  const iw = img.naturalWidth || img.width;
  const ih = img.naturalHeight || img.height;
  if (!iw || !ih) return;
  const scale = Math.max((rad * 2) / iw, (rad * 2) / ih);
  const dw = iw * scale;
  const dh = ih * scale;
  const dx = cx - dw / 2;
  const dy = cy - dh / 2;
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, rad, 0, Math.PI * 2);
  ctx.clip();
  ctx.drawImage(img, dx, dy, dw, dh);
  ctx.restore();
}

function drawConstellationMemberGradientDisk(ctx, x, y, rad, baseHex) {
  const hex = String(baseHex || "#94A3B8");
  const { r, g, b } = galaxyHexToRgb(hex);
  const ix = x - rad * 0.32;
  const iy = y - rad * 0.32;
  const gFill = ctx.createRadialGradient(ix, iy, rad * 0.08, x, y, rad);
  gFill.addColorStop(0, `rgba(${Math.min(255, r + 42)}, ${Math.min(255, g + 38)}, ${Math.min(255, b + 55)}, 0.92)`);
  gFill.addColorStop(0.65, `rgba(${r},${g},${b},0.88)`);
  gFill.addColorStop(1, `rgba(${Math.max(0, r - 22)}, ${Math.max(0, g - 22)}, ${Math.max(0, b - 18)}, 0.86)`);
  ctx.beginPath();
  ctx.arc(x, y, rad, 0, Math.PI * 2);
  ctx.fillStyle = gFill;
  ctx.fill();
}

/** Faint ring on hover, drawn just inside the enlarged avatar edge. */
const GALAXY_HOVER_OUTER_RING_LINE = 2.5;

/**
 * Hover disk radius ≈ this × layout radius (`baseR`).
 * 4.5 matches the user reference (red circle ≈ 4–5× the dot diameter).
 */
const GALAXY_HOVER_AVATAR_RADIUS_MUL = 4.5;

function galaxyHoverAvatarRadius(baseR) {
  const r = Number(baseR) || 8;
  return r * GALAXY_HOVER_AVATAR_RADIUS_MUL;
}

/** Constellation nodes: avatar (when loaded) + rings; interaction = none|hover|selected */
function drawConstellationMemberRing(ctx, x, y, radius, baseHex, interaction, avatarUrl, memberIsSelected = false) {
  const hex = String(baseHex || "#94A3B8");
  const { r, g, b } = galaxyHexToRgb(hex);
  const sel = interaction === "selected";
  const hov = interaction === "hover";
  const baseR = Number(radius) || 8;
  const selScale = 1.16;
  /** Ring geometry: only selected grows rings; hover grows avatar to the 2nd ring, not the rings themselves. */
  const radRing = baseR * (sel ? selScale : 1);
  const radAvatar = sel ? baseR * selScale : hov ? galaxyHoverAvatarRadius(baseR) : baseR;
  const img = galaxyAvatarReadyImg(avatarUrl);

  ctx.save();
  if (img) {
    try {
      drawGalaxyAvatarCoverInCircle(ctx, img, x, y, radAvatar);
    } catch {
      drawConstellationMemberGradientDisk(ctx, x, y, radAvatar, hex);
    }
  } else {
    drawConstellationMemberGradientDisk(ctx, x, y, radAvatar, hex);
  }

  if (!hov) {
    ctx.beginPath();
    ctx.arc(x, y, radRing * 0.9, -0.35, -0.35 + 1.0);
    ctx.strokeStyle = "rgba(255, 255, 255, 0.45)";
    ctx.lineWidth = 1.1;
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(x, y, radRing, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(${r},${g},${b},0.75)`;
    ctx.lineWidth = sel ? 2.35 : 1.45;
    ctx.shadowBlur = sel ? 14 : 6;
    ctx.shadowColor = `rgba(${r},${g},${b},0.22)`;
    ctx.stroke();
    ctx.shadowBlur = 0;
  } else {
    /** Hover: `radRing` is layout-sized — drawing it on a huge `radAvatar` looked like a stray inner circle. */
    ctx.beginPath();
    ctx.strokeStyle = `rgba(${r},${g},${b},0.5)`;
    ctx.lineWidth = GALAXY_HOVER_OUTER_RING_LINE;
    const ringR = radAvatar - GALAXY_HOVER_OUTER_RING_LINE * 0.55;
    ctx.arc(x, y, ringR, 0, Math.PI * 2);
    ctx.stroke();
  }

  if (sel || memberIsSelected) {
    ctx.beginPath();
    ctx.strokeStyle = "rgba(116, 71, 245, 0.45)";
    ctx.lineWidth = 2;
    ctx.setLineDash(canvasReducedMotion() ? [] : [4, 5]);
    ctx.lineDashOffset = canvasReducedMotion() ? 0 : -performance.now() * 0.025;
    const dashPad = hov ? Math.min(12, radAvatar * 0.07) : Math.min(15, radRing * 0.32);
    const dashR = hov ? radAvatar + dashPad : radRing + dashPad;
    ctx.arc(x, y, dashR, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
  }
  ctx.restore();
}

function memberRingInteraction(member, selected, hoveredId) {
  if (member.entityId === hoveredId) return "hover";
  if (member.entityId === selected?.entityId) return "selected";
  return "none";
}

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
  renderGalaxyCanvasLegend();
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
  renderGalaxyCanvasLegend();
}

function gfLerp(a, b, t) {
  return a + (b - a) * t;
}

/** Flottement des pastilles skills — amplitudes nettes (px logiques canvas), liens + hit-test alignés. */
function gfSkillNodeFloat(node, index, now) {
  if (canvasReducedMotion()) return { ox: 0, oy: 0 };
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
  /** Same drivers as the main galaxy disk (`GALAXY_MOTION` + `state.phase`). */
  const { wobbleAmp, wobbleSinK, wobbleCosK, diskSpinPhaseFactor } = GALAXY_MOTION;
  const ph = node.golden + index * 0.71;
  const disk = state.phase * diskSpinPhaseFactor;
  const t = now * wobbleSinK * 18 + disk * 2.1;
  const wob = now * wobbleCosK * 22.5 + ph * 2.08 + disk;
  const ampPx = wobbleAmp * 8.5;
  const ox1 =
    Math.sin(t + ph) * ampPx + Math.cos(t * 0.79 + ph * 1.31 + disk * 0.4) * (ampPx * 0.62);
  const oy1 =
    Math.cos(t * 0.86 + ph + disk * 0.35) * (ampPx * 0.9) + Math.sin(t * 0.61 + ph * 1.11) * (ampPx * 0.58);
  const ox2 =
    Math.cos(wob) * (wobbleAmp * 3.2) + Math.sin(wob * 0.71 + 1.4) * (wobbleAmp * 2.1);
  const oy2 =
    Math.sin(wob * 0.77) * (wobbleAmp * 2.8) + Math.cos(wob * 0.58 + 0.35) * (wobbleAmp * 2.2);
  return { ox: (ox1 + ox2) * amp, oy: (oy1 + oy2) * amp };
}

function gfSkillNodeRadius(node) {
  if (node.isMore) return 16;
  const len = String(node.name).length;
  return 15 + Math.min(20, len * 1.08);
}

/** Fond aligné sur le paysage (même atmosphère + grain). */
function gfDrawFocusBackdrop(ctx, width, height) {
  drawGalaxyCanvasAtmosphere(ctx, width, height);
}

function gfDrawBackButton(ctx) {
  const { x, y, w, h } = galaxyFocus.backRect;
  ctx.save();
  ctx.beginPath();
  gfRoundRectPath(ctx, x, y, w, h, 10);
  ctx.fillStyle = "rgba(255, 255, 255, 0.94)";
  ctx.fill();
  ctx.strokeStyle = "rgba(117, 99, 164, 0.18)";
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.strokeStyle = "rgba(38, 35, 52, 0.55)";
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
    const { cx: mx, cy: my } = gfQuadraticBridgeControl(sx, sy, ex, ey, 0.065);
    ctx.save();
    ctx.globalAlpha = linksAlpha * 0.92;
    ctx.beginPath();
    ctx.moveTo(sx, sy);
    ctx.quadraticCurveTo(mx, my, ex, ey);
    ctx.strokeStyle = "rgba(116, 71, 245, 0.22)";
    ctx.lineWidth = 2.2;
    ctx.lineCap = "round";
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(sx, sy);
    ctx.quadraticCurveTo(mx, my, ex, ey);
    ctx.setLineDash([3, 6]);
    ctx.lineDashOffset = dashPhase;
    ctx.strokeStyle = "rgba(117, 99, 164, 0.14)";
    ctx.lineWidth = 1.1;
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
    ctx.strokeStyle = "rgba(117, 99, 164, 0.12)";
    ctx.lineWidth = 1;
    ctx.arc(x, y, rDraw, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.strokeStyle = node.color;
    ctx.lineWidth = 2;
    ctx.shadowBlur = 6;
    ctx.shadowColor = "rgba(116, 71, 245, 0.2)";
    ctx.arc(x, y, rDraw - 0.5, 0, Math.PI * 2);
    ctx.stroke();
    ctx.shadowBlur = 0;
    const label = truncateGalaxyLabel(node.name, 28);
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    ctx.font = CANVAS_FONT_MEMBER_NAMES;
    const ty = y + rDraw + 9;
    ctx.fillStyle = CANVAS_TEXT_MEMBER_MUTED;
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

/** Member name under the central hub (same idea as skill-node labels below their dots). */
function gfDrawHubName(ctx, member, hx, hy, hubR, labelAlpha, labelPop) {
  if (labelAlpha <= 0.02) return;
  const gap = 10;
  const maxW = Math.max(140, Math.min(380, hubR * 5.2));
  const maxH = 112;
  const { lines, fontPx, lineHeight } = gfFitHubNameLines(ctx, member.name, maxW, maxH);
  const y0 = hy + hubR + gap;
  const pop = 0.97 + 0.03 * Math.min(1, Math.max(0, labelPop));
  ctx.save();
  ctx.globalAlpha = labelAlpha;
  ctx.translate(hx, y0);
  ctx.scale(pop, pop);
  ctx.translate(-hx, -y0);
  ctx.textAlign = "center";
  ctx.textBaseline = "top";
  ctx.font = `500 ${fontPx}px ui-sans-serif, system-ui, -apple-system, sans-serif`;
  ctx.lineJoin = "round";
  ctx.lineWidth = 3;
  ctx.strokeStyle = "rgba(255, 255, 255, 0.92)";
  ctx.fillStyle = "rgba(32, 28, 44, 0.92)";
  lines.forEach((line, i) => {
    const ly = y0 + i * lineHeight;
    ctx.strokeText(line, hx, ly);
    ctx.fillText(line, hx, ly);
  });
  ctx.restore();
}

function gfDrawCentralHub(ctx, member, hx, hy, hubR, labelAlpha, labelPop) {
  const hubC = member.color || "#7447f5";
  const url = String(member?.avatarUrl || "").trim();
  const img = galaxyAvatarReadyImg(url);
  ctx.save();
  if (img) {
    try {
      drawGalaxyAvatarCoverInCircle(ctx, img, hx, hy, hubR);
    } catch {
      ctx.beginPath();
      ctx.arc(hx, hy, hubR, 0, Math.PI * 2);
      ctx.fillStyle = "#ffffff";
      ctx.fill();
    }
  } else {
    ctx.beginPath();
    ctx.arc(hx, hy, hubR, 0, Math.PI * 2);
    ctx.fillStyle = "#ffffff";
    ctx.fill();
  }
  ctx.beginPath();
  ctx.arc(hx, hy, hubR - 3.5, 0, Math.PI * 2);
  ctx.strokeStyle = hubC;
  ctx.globalAlpha = 0.9;
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.globalAlpha = 1;
  ctx.beginPath();
  ctx.arc(hx, hy, hubR, 0, Math.PI * 2);
  ctx.strokeStyle = "rgba(117, 99, 164, 0.16)";
  ctx.lineWidth = 1;
  ctx.stroke();
  gfDrawHubName(ctx, member, hx, hy, hubR, labelAlpha, labelPop);
  ctx.restore();
}

function gfCurrentHubGeometry(now, width, height) {
  const cx = width / 2;
  const cy = height / 2;
  if (galaxyFocus.mode === "person") {
    const mot = canvasReducedMotion() ? 0 : 1;
    const t = now * 0.00036;
    const driftX = (Math.sin(t) * 18 + Math.cos(t * 0.59 + 0.42) * 9) * mot;
    const driftY = (Math.cos(t * 0.47) * 15 + Math.sin(t * 0.68 + 1.1) * 8) * mot;
    const hx = cx + driftX;
    const hy = cy + driftY;
    const rBreath = (Math.sin(t * 1.04) * 0.095 + Math.sin(t * 0.46 + 2) * 0.042) * mot;
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

function gfGalaxySkillNodeHitIndex(x, y, now, width, height) {
  const geo = gfCurrentHubGeometry(now, width, height);
  const { hx, hy } = geo;
  const cx0 = width / 2;
  const cy0 = height / 2;
  const grpOx = galaxyFocus.mode === "person" ? hx - cx0 : 0;
  const grpOy = galaxyFocus.mode === "person" ? hy - cy0 : 0;
  for (let i = 0; i < galaxyFocus.skillNodes.length; i += 1) {
    const node = galaxyFocus.skillNodes[i];
    const { ox, oy } = gfSkillNodeFloat(node, i, now);
    const nx = node.tx + ox + grpOx;
    const ny = node.ty + oy + grpOy;
    const nr = gfSkillNodeRadius(node);
    /** Generous slop: drawn disk can sit near hub; hub is hit-tested after skills so circles win. */
    if (Math.hypot(x - nx, y - ny) <= nr + 28) return i;
  }
  return -1;
}

function gfGalaxyPointerTargets(x, y, now, width, height) {
  if (gfHitBackButton(x, y)) return "back";
  if (gfGalaxySkillNodeHitIndex(x, y, now, width, height) >= 0) return "skill";
  const geo = gfCurrentHubGeometry(now, width, height);
  const { hx, hy, hubR } = geo;
  if (Math.hypot(x - hx, y - hy) <= hubR + 16) return "hub";
  return "empty";
}

function drawGalaxyPersonFocus(width, height, now, list, selected, hoveredId) {
  const member = galaxyFocus.member;
  if (!member) {
    gfFinishExitToLandscape();
    return;
  }

  galaxyAvatarDrainPreload(list);
  galaxyAvatarDrainPreload([member]);

  const bgDots = gfBackgroundDotsExcludingFocus(list, member.entityId, selected, hoveredId);

  gfDrawFocusBackdrop(ctx, width, height);

  const spin = state.phase * GALAXY_MOTION.diskSpinPhaseFactor;
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
      drawConstellationMemberRing(ctx, d.x, d.y, d.r, d.base, "none", d.avatarUrl);
    });
    ctx.restore();

    gfDrawCentralHub(ctx, member, hx, hy, hubR, labelAlpha, labelPop);
    gfDrawSkillLinks(
      ctx,
      hx,
      hy,
      hubR,
      galaxyFocus.skillNodes,
      linksT,
      -now * 0.022 - state.phase * GALAXY_MOTION.diskSpinPhaseFactor * 28,
      now,
      0,
      0,
    );
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
      drawConstellationMemberRing(ctx, d.x, d.y, d.r, d.base, "none", d.avatarUrl);
    });
    ctx.restore();
    gfDrawCentralHub(ctx, member, hx, hy, hubR, 1, 1);
    gfDrawSkillLinks(
      ctx,
      hx,
      hy,
      hubR,
      galaxyFocus.skillNodes,
      1,
      -now * 0.022 - state.phase * GALAXY_MOTION.diskSpinPhaseFactor * 28,
      now,
      grpOx,
      grpOy,
    );
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
      drawConstellationMemberRing(ctx, d.x, d.y, d.r, d.base, "none", d.avatarUrl);
    });
    ctx.restore();

    gfDrawCentralHub(ctx, member, hx, hy, hubR, labelAlpha, labelPop);
    gfDrawSkillLinks(
      ctx,
      hx,
      hy,
      hubR,
      galaxyFocus.skillNodes,
      linksT,
      -now * 0.022 - state.phase * GALAXY_MOTION.diskSpinPhaseFactor * 28,
      now,
      0,
      0,
    );
    gfDrawSkillNodes(ctx, galaxyFocus.skillNodes, skillsT, spin, now, 0, 0);
    gfDrawBackButton(ctx);

    if (p >= 1) gfFinishExitToLandscape();
  }
}

const canvas = document.querySelector("#galaxy-canvas");
const ctx = canvas.getContext("2d", { alpha: true });
/** Set in `resizeCanvas` — used by atmosphere cache (avoid reading debug-only state). */
let __galaxyResizeDpr = 1;
if (typeof ctx.imageSmoothingQuality === "string") {
  ctx.imageSmoothingQuality = "high";
}

const __galaxyMotionMql = window.matchMedia?.("(prefers-reduced-motion: reduce)") ?? { matches: false };
let __galaxyReducedMotion = !!__galaxyMotionMql.matches;
function canvasReducedMotion() {
  return __galaxyReducedMotion;
}
__galaxyMotionMql.addEventListener?.("change", (e) => {
  __galaxyReducedMotion = !!e.matches;
});

/** Shared canvas tokens — align with light page / cards (Geo Atlas UI). */
const CANVAS_FONT_MEMBER_NAMES =
  '500 12.5px ui-sans-serif, system-ui, "Segoe UI", "Avenir Next", sans-serif';
const CANVAS_FONT_MEMBER_PIN =
  '600 13.5px ui-sans-serif, system-ui, "Segoe UI", "Avenir Next", sans-serif';
const CANVAS_TEXT_MEMBER = "rgba(32, 28, 44, 0.94)";
const CANVAS_TEXT_MEMBER_MUTED = "rgba(55, 50, 72, 0.78)";

let __galaxyGrainPattern = null;
let __galaxyGrainBuildId = "";
const GALAXY_GRAIN_BUILD_ID = "light-v3";
function ensureGalaxyGrainPattern(targetCtx) {
  if (canvasReducedMotion()) return null;
  if (__galaxyGrainPattern && __galaxyGrainBuildId === GALAXY_GRAIN_BUILD_ID) return __galaxyGrainPattern;
  __galaxyGrainPattern = null;
  const n = 64;
  const c = document.createElement("canvas");
  c.width = n;
  c.height = n;
  const g = c.getContext("2d");
  if (!g) return null;
  g.clearRect(0, 0, n, n);
  for (let i = 0; i < 130; i += 1) {
    const x = (i * 37 + (i % 5)) % n;
    const y = (i * 19 + ((i * 3) % 7)) % n;
    const a = 0.028 + (i % 6) * 0.009;
    g.fillStyle = `rgba(88, 72, 130, ${a})`;
    g.fillRect(x, y, 1, 1);
  }
  __galaxyGrainPattern = targetCtx.createPattern(c, "repeat");
  __galaxyGrainBuildId = GALAXY_GRAIN_BUILD_ID;
  return __galaxyGrainPattern;
}

/** Violet / cyan wash only (no grain) — reused from bitmap when size+DPR unchanged. */
function drawGalaxyCanvasAtmosphereGradients(targetCtx, width, height) {
  const cx = width / 2;
  const cy = height / 2;
  const r = Math.max(width, height) * 0.58;
  const base = targetCtx.createRadialGradient(cx, cy, 0, cx, cy, r);
  base.addColorStop(0, "rgba(255, 255, 255, 0.99)");
  base.addColorStop(0.42, "rgba(252, 249, 255, 0.97)");
  base.addColorStop(0.78, "rgba(246, 241, 252, 0.94)");
  base.addColorStop(1, "rgba(248, 244, 253, 0.98)");
  targetCtx.fillStyle = base;
  targetCtx.fillRect(0, 0, width, height);

  const g1 = targetCtx.createRadialGradient(cx * 0.62, cy * 0.34, 0, cx * 0.62, cy * 0.34, r * 0.55);
  g1.addColorStop(0, "rgba(138, 99, 255, 0.1)");
  g1.addColorStop(0.55, "rgba(138, 99, 255, 0.03)");
  g1.addColorStop(1, "rgba(138, 99, 255, 0)");
  targetCtx.fillStyle = g1;
  targetCtx.fillRect(0, 0, width, height);

  const g2 = targetCtx.createRadialGradient(cx * 1.05, cy * 0.88, 0, cx * 1.05, cy * 0.88, r * 0.42);
  g2.addColorStop(0, "rgba(113, 231, 255, 0.08)");
  g2.addColorStop(1, "rgba(113, 231, 255, 0)");
  targetCtx.fillStyle = g2;
  targetCtx.fillRect(0, 0, width, height);
}

let __galaxyAtmoCache = { w: 0, h: 0, dpr: 0, cv: null };

function drawGalaxyCanvasAtmosphere(targetCtx, width, height) {
  const dpr = __galaxyResizeDpr || 1;
  const hit =
    __galaxyAtmoCache.cv &&
    __galaxyAtmoCache.w === width &&
    __galaxyAtmoCache.h === height &&
    Math.abs(__galaxyAtmoCache.dpr - dpr) < 0.0005;
  if (hit) {
    targetCtx.drawImage(__galaxyAtmoCache.cv, 0, 0, width, height);
  } else {
    if (!__galaxyAtmoCache.cv) __galaxyAtmoCache.cv = document.createElement("canvas");
    __galaxyAtmoCache.w = width;
    __galaxyAtmoCache.h = height;
    __galaxyAtmoCache.dpr = dpr;
    const cv = __galaxyAtmoCache.cv;
    const pw = Math.max(1, Math.round(width * dpr));
    const ph = Math.max(1, Math.round(height * dpr));
    cv.width = pw;
    cv.height = ph;
    const ox = cv.getContext("2d", { alpha: true });
    if (ox) {
      if (typeof ox.imageSmoothingQuality === "string") ox.imageSmoothingQuality = "high";
      ox.setTransform(dpr, 0, 0, dpr, 0, 0);
      drawGalaxyCanvasAtmosphereGradients(ox, width, height);
    }
    targetCtx.drawImage(cv, 0, 0, width, height);
  }
  const pat = ensureGalaxyGrainPattern(targetCtx);
  if (pat) {
    targetCtx.save();
    targetCtx.globalAlpha = 0.045;
    targetCtx.fillStyle = pat;
    targetCtx.fillRect(0, 0, width, height);
    targetCtx.restore();
  }
}

/** Quadratic control point for a subtle arc between two points (shared bridge math). */
function gfQuadraticBridgeControl(x0, y0, x1, y1, bendFactor) {
  const dx = x1 - x0;
  const dy = y1 - y0;
  const dist = Math.hypot(dx, dy) || 1;
  const mx = (x0 + x1) / 2;
  const my = (y0 + y1) / 2;
  const ux = dx / dist;
  const uy = dy / dist;
  const bend = dist * bendFactor;
  return { cx: mx - uy * bend, cy: my + ux * bend };
}
/** Shared layout / animation knobs for galaxy member physics and phase. */
const GALAXY_MOTION = {
  layoutPull: 0.016,
  layoutDamp: 0.9,
  angleDriftPerMs: 0.000035,
  wobbleAmp: 2.2,
  wobbleSinK: 0.00022,
  wobbleCosK: 0.0002,
  diskSpinPhaseFactor: 0.06,
  phaseIncrement: 0.0009,
};

/** Demi-axes du disque Vogel (un seul thème) : marge pour grosses pastilles + labels. */
function galaxySingleDiskHalfExtents(width, height) {
  const dotR = galaxyMemberDotRadiusPx(__galaxyVisibleCountForRadius);
  const edgeBoost = dotR > 18 ? Math.min(56, (dotR - 18) * 1.15) : 0;
  const edge = 40 + dotR * 2.4 + edgeBoost;
  return {
    diskHalfW: Math.max(96, width * 0.47 - edge),
    diskHalfH: Math.max(92, height * 0.43 - edge),
  };
}

function galaxyOrbitScale() {
  /** Same orbit scale as the main map — cluster filters only change membership, not motion constants. */
  return 1;
}

function memberIsGalaxyHighlighted(member, selected, hoveredId) {
  return (
    member.entityId === hoveredId ||
    member.entityId === selected?.entityId ||
    member.entityId === state.selectedId
  );
}

function memberDisplayRadius(member, selected, hoveredId) {
  void member;
  void selected;
  void hoveredId;
  return galaxyMemberDotRadiusPx(__galaxyVisibleCountForRadius);
}

function truncateGalaxyLabel(name, max = 20) {
  if (!name) return "";
  if (name.length <= max) return name;
  return `${name.slice(0, max - 1).trim()}…`;
}

function anchorMap(list, width, height) {
  const keys = sortedGalaxyClusterKeys(list.map((m) => getGalaxyClusterKey(m)));
  if (keys.length === 1) {
    const k = keys[0];
    return new Map([[k, { x: width / 2, y: height / 2 }]]);
  }
  const span = Math.min(width, height);
  const radiusX = span * 0.36;
  const radiusY = span * 0.31;
  return new Map(
    keys.map((clusterKey, index) => {
      const angle = (index / Math.max(keys.length, 1)) * Math.PI * 2 + Math.PI / 2;
      return [
        clusterKey,
        {
          x: width / 2 + Math.cos(angle) * radiusX,
          y: height / 2 + Math.sin(angle) * radiusY,
        },
      ];
    }),
  );
}

/** Stable spread anchors used when a filtered view has a single logical cluster but should not collapse to center. */
function galaxyPseudoSpreadAnchor(member, width, height) {
  const id = String(member?.entityId || member?.name || "");
  let h = 2166136261;
  for (let i = 0; i < id.length; i++) h = Math.imul(h ^ id.charCodeAt(i), 16777619);
  const u = (h >>> 0) / 4294967295;
  const bucket = Math.floor(u * 6) % 6;
  const angle = (bucket / 6) * Math.PI * 2 + Math.PI / 2;
  const span = Math.min(width, height);
  const ringR = Math.max(72, span * 0.225);
  const jitterA = ((u * 37.31) % 1 - 0.5) * 0.34;
  const jitterR = ((u * 17.19) % 1 - 0.5) * Math.max(22, span * 0.04);
  return {
    x: width / 2 + Math.cos(angle + jitterA) * (ringR + jitterR),
    y: height / 2 + Math.sin(angle + jitterA) * (ringR + jitterR * 0.88),
  };
}

function shouldUseSingleThemeDisk(anchors) {
  if (!anchors || anchors.size !== 1) return false;
  /** Apply All-style orbital motion to every visualization/filter mode. */
  return false;
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

/** Lower DPR when many galaxy nodes draw per frame — cuts backing-store fill cost on dense views. */
function galaxyCanvasDpr(visibleCount) {
  const raw = window.devicePixelRatio || 1;
  const uncapped = Math.max(1, raw * 1.12);
  const n = Number(visibleCount) || 0;
  if (n < 72) return Math.min(3, uncapped);
  if (n < 160) return Math.min(2.35, uncapped);
  if (n < 260) return Math.min(2, uncapped);
  return Math.min(1.72, uncapped);
}

function resizeCanvas(visibleCountHint) {
  const { width: cssW, height: cssH } = readCanvasCssSize();
  const n =
    typeof visibleCountHint === "number" && Number.isFinite(visibleCountHint)
      ? visibleCountHint
      : visibleMembers().length;
  const dpr = galaxyCanvasDpr(n);
  const needW = Math.max(1, Math.round(cssW * dpr));
  const needH = Math.max(1, Math.round(cssH * dpr));
  if (canvas.width !== needW || canvas.height !== needH) {
    canvas.width = needW;
    canvas.height = needH;
  }
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  __galaxyResizeDpr = dpr;
}

/** When a single theme is shown, snap dots to Vogel targets so they are never stuck off-screen (bitmap/CSS size mismatch). */
function snapSingleThemeVogelPositions(list) {
  if (!list.length) return;
  __galaxyVisibleCountForRadius = galaxyRadiusLayoutCountFromList(list);
  const { width, height } = readCanvasCssSize();
  const anchors = anchorMap(list, width, height);
  if (!shouldUseSingleThemeDisk(anchors)) return;
  const { diskHalfW, diskHalfH } = galaxySingleDiskHalfExtents(width, height);
  const anchor = [...anchors.values()][0];
  const n = Math.max(list.length, 1);
  list.forEach((member, index) => {
    const idx = index + 1;
    const golden = idx * 2.39996322972865332;
    const normR = Math.sqrt(idx / (n + 1.12));
    const spin = state.phase * GALAXY_MOTION.diskSpinPhaseFactor;
    const t = golden + spin;
    member.x = anchor.x + Math.cos(t) * normR * diskHalfW;
    member.y = anchor.y + Math.sin(t) * normR * diskHalfH;
    member.vx = 0;
    member.vy = 0;
  });
  const rSnap = galaxyMemberDotRadiusPx(__galaxyVisibleCountForRadius);
  applyGalaxyMemberNonOverlap(list, rSnap, null);
  clampGalaxyMemberCanvasBounds(list, width, height);
}

function clampGalaxyMemberCanvasBounds(list, width, height) {
  if (!list.length) return;
  const r0 = galaxyMemberDotRadiusPx(__galaxyVisibleCountForRadius);
  const rExt = r0 * 1.08 + 10;
  const bottomExtra = isGalaxyClusterFocus() ? 28 : 14;
  const topExtra = 8;
  for (const member of list) {
    member.x = Math.min(width - rExt, Math.max(rExt, member.x));
    member.y = Math.min(height - rExt - bottomExtra, Math.max(rExt + topExtra, member.y));
  }
}

/** Push member dots apart when centers are closer than twice the layout radius (soft collision). */
function applyGalaxyMemberNonOverlap(list, radiusPx, freezeEntityId = null) {
  const n = list.length;
  if (n < 2) return;
  const pad = isGalaxyClusterFocus() ? 7 : 4;
  const minDist = radiusPx * 2 + pad;
  const minDistSq = minDist * minDist;
  const iterations = n > 240 ? 2 : n > 140 ? 3 : 4;
  const strength = n > 240 ? 0.58 : 0.45;
  for (let iter = 0; iter < iterations; iter++) {
    for (let i = 0; i < n; i++) {
      const a = list[i];
      const aF = freezeEntityId && a.entityId === freezeEntityId;
      for (let j = i + 1; j < n; j++) {
        const b = list[j];
        const bF = freezeEntityId && b.entityId === freezeEntityId;
        if (aF && bF) continue;
        let dx = b.x - a.x;
        let dy = b.y - a.y;
        let distSq = dx * dx + dy * dy;
        if (distSq < 1e-8) {
          const ang = ((i * 47 + j * 91) % 628) / 100;
          dx = Math.cos(ang) * 0.04;
          dy = Math.sin(ang) * 0.04;
          distSq = dx * dx + dy * dy;
        }
        if (distSq >= minDistSq) continue;
        const dist = Math.sqrt(distSq);
        const overlap = minDist - dist;
        const nx = dx / dist;
        const ny = dy / dist;
        let pushA = overlap * strength * 0.5;
        let pushB = overlap * strength * 0.5;
        if (aF && !bF) {
          pushA = 0;
          pushB = overlap * strength;
        } else if (!aF && bF) {
          pushA = overlap * strength;
          pushB = 0;
        }
        if (!aF) {
          a.x -= nx * pushA;
          a.y -= ny * pushA;
        }
        if (!bF) {
          b.x += nx * pushB;
          b.y += ny * pushB;
        }
      }
    }
  }
}

/** Même physique que le paysage ; `freezeEntityId` fige un membre (focus perso) pour ne pas bouger son point de sortie. */
function stepMemberLayoutPhysics(list, width, height, now, freezeEntityId = null) {
  __galaxyVisibleCountForRadius = galaxyRadiusLayoutCountFromList(list);
  const anchors = anchorMap(list, width, height);
  const singleThemeDisk = shouldUseSingleThemeDisk(anchors);
  const usePseudoSpread = !singleThemeDisk && anchors.size === 1;
  const orbitScale = galaxyOrbitScale();
  const diskExtents = singleThemeDisk ? galaxySingleDiskHalfExtents(width, height) : { diskHalfW: 0, diskHalfH: 0 };
  const { diskHalfW, diskHalfH } = diskExtents;
  const { layoutPull, layoutDamp, angleDriftPerMs, wobbleAmp, wobbleSinK, wobbleCosK, diskSpinPhaseFactor } =
    GALAXY_MOTION;
  const angleDrift = canvasReducedMotion() ? 0 : now * angleDriftPerMs;
  const dotR = galaxyMemberDotRadiusPx(__galaxyVisibleCountForRadius);
  const orbitRadiusBoost = dotR > 16 ? 1 + Math.min(0.45, (dotR - 16) * 0.024) : 1;

  list.forEach((member, index) => {
    if (freezeEntityId && member.entityId === freezeEntityId) return;
    const anchor =
      (usePseudoSpread
        ? galaxyPseudoSpreadAnchor(member, width, height)
        : anchors.get(getGalaxyClusterKey(member))) || { x: width / 2, y: height / 2 };
    const angle = member.seed + index * 0.065 + angleDrift;
    let targetX;
    let targetY;

    if (singleThemeDisk) {
      const n = Math.max(list.length, 1);
      const idx = index + 1;
      const golden = idx * 2.39996322972865332;
      const normR = Math.sqrt(idx / (n + 1.12));
      const wobbleMul = canvasReducedMotion() ? 0 : 1;
      const wobbleX = Math.sin(now * wobbleSinK + member.seed * 3.9) * wobbleAmp * wobbleMul;
      const wobbleY = Math.cos(now * wobbleCosK + member.seed * 2.7) * wobbleAmp * wobbleMul;
      const spin = state.phase * diskSpinPhaseFactor;
      const t = golden + spin;
      targetX = anchor.x + Math.cos(t) * normR * diskHalfW + wobbleX;
      targetY = anchor.y + Math.sin(t) * normR * diskHalfH + wobbleY;
    } else {
      const viewScale = Math.min(1.72, Math.min(width, height) / 500);
      const orbit =
        (50 + (index % 12) * 20 + member.spaceCount * 9) * orbitScale * viewScale * orbitRadiusBoost;
      targetX = anchor.x + Math.cos(angle) * orbit;
      targetY = anchor.y + Math.sin(angle * 1.15) * (orbit * 0.74);
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
  applyGalaxyMemberNonOverlap(list, dotR, freezeEntityId);
  clampGalaxyMemberCanvasBounds(list, width, height);
}

function gfBackgroundDotsExcludingFocus(list, focusId, selected, hoveredId) {
  return list
    .filter((m) => m.entityId !== focusId)
    .map((m) => ({
      x: m.x,
      y: m.y,
      base: galaxyMemberBaseColor(m),
      r: memberDisplayRadius(m, selected, hoveredId),
      avatarUrl: m.avatarUrl || "",
    }));
}

/** Frosted pill behind galaxy names — shared cluster + map pin hover. */
function drawGalaxyNamePillChrome(ctx, x, y, w, h, accent) {
  const corner = Math.min(11, Math.floor(Math.min(w * 0.5, h * 0.5) - 1));
  const g = ctx.createLinearGradient(x, y - 0.5, x, y + h + 0.5);
  if (accent) {
    g.addColorStop(0, "rgba(255, 255, 255, 0.995)");
    g.addColorStop(0.5, "rgba(248, 244, 255, 0.98)");
    g.addColorStop(1, "rgba(234, 228, 252, 0.95)");
  } else {
    g.addColorStop(0, "rgba(255, 255, 255, 0.98)");
    g.addColorStop(0.42, "rgba(252, 250, 255, 0.97)");
    g.addColorStop(1, "rgba(241, 237, 249, 0.94)");
  }
  ctx.shadowColor = accent ? "rgba(116, 71, 245, 0.12)" : "rgba(92, 74, 138, 0.09)";
  ctx.shadowBlur = accent ? 20 : 17;
  ctx.shadowOffsetY = accent ? 5 : 4;
  ctx.fillStyle = g;
  ctx.beginPath();
  gfRoundRectPath(ctx, x, y, w, h, Math.max(4, corner));
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.shadowOffsetY = 0;
  ctx.strokeStyle = accent ? "rgba(116, 71, 245, 0.2)" : "rgba(117, 99, 164, 0.13)";
  ctx.lineWidth = 1;
  ctx.stroke();
}

/** Cluster focus: name on a pill; avoids huge hover disk covering neighbors' labels. */
function drawGalaxyClusterMemberName(ctx, member, selected, hoveredId, canvasW, canvasH, hoverPeer) {
  const rLayout = memberDisplayRadius(member, selected, hoveredId);
  const rVis = member.entityId === hoveredId ? galaxyHoverAvatarRadius(rLayout) : rLayout;
  const label = truncateGalaxyLabel(member.name, 24);

  let placeAbove = member.entityId === hoveredId;
  if (!placeAbove && hoverPeer) {
    const hR = galaxyHoverAvatarRadius(memberDisplayRadius(hoverPeer, selected, hoveredId));
    const d = Math.hypot(member.x - hoverPeer.x, member.y - hoverPeer.y);
    if (d < hR + rVis + 14) placeAbove = true;
  }
  if (!placeAbove && member.y + rVis + 30 > canvasH - 8) placeAbove = true;
  if (placeAbove && member.y - rVis - 30 < 8) placeAbove = false;

  const emphasized = memberIsGalaxyHighlighted(member, selected, hoveredId);

  ctx.save();
  ctx.font = CANVAS_FONT_MEMBER_NAMES;
  const metrics = ctx.measureText(label);
  const padX = 11;
  const padY = 7;
  const pillW = Math.min(metrics.width + padX * 2, canvasW - 12);
  const pillH = 26;

  const cx = member.x;
  let left = cx - pillW / 2;
  let topY = placeAbove ? member.y - rVis - 10 - pillH : member.y + rVis + 10;
  left = Math.max(6, Math.min(left, canvasW - pillW - 6));
  topY = Math.max(6, Math.min(topY, canvasH - pillH - 6));

  drawGalaxyNamePillChrome(ctx, left, topY, pillW, pillH, emphasized);

  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.letterSpacing = emphasized ? "0.04em" : "0.025em";
  ctx.fillStyle = emphasized ? CANVAS_TEXT_MEMBER : CANVAS_TEXT_MEMBER_MUTED;
  ctx.fillText(label, left + pillW / 2, topY + pillH / 2 + 0.5);
  ctx.letterSpacing = "0px";
  ctx.restore();
}

/** Render-loop gating: skip rAF when tab is hidden or canvas is fully off-screen,
 * resume on visibilitychange / IntersectionObserver. Coalesce nested schedules. */
let __canvasOnScreen = true;
let __rafScheduled = false;
function scheduleDrawFrame() {
  if (__rafScheduled) return;
  if (typeof document !== "undefined" && document.hidden) return;
  if (!__canvasOnScreen) return;
  __rafScheduled = true;
  requestAnimationFrame(() => {
    __rafScheduled = false;
    drawFrame();
  });
}

function drawFrame() {
  const list = visibleMembers();
  resizeCanvas(list.length);
  const { width, height, br: brSize } = readCanvasCssSize();
  const now = performance.now();

  if (galaxyFocus.mode !== "landscape") {
    const stillVisible = galaxyFocus.memberId && list.some((m) => m.entityId === galaxyFocus.memberId);
    if (!stillVisible) {
      gfFinishExitToLandscape();
    } else {
      const selected = selectedMember(list);
      const hoveredId = state.hoveredId;
      stepMemberLayoutPhysics(list, width, height, now, galaxyFocus.memberId);
      state.phase += GALAXY_MOTION.phaseIncrement;
      ctx.clearRect(0, 0, width, height);
      drawGalaxyPersonFocus(width, height, now, list, selected, hoveredId);
      scheduleDrawFrame();
      return;
    }
  }

  const selected = selectedMember(list);
  const hoveredId = state.hoveredId;

  ctx.clearRect(0, 0, width, height);
  drawGalaxyCanvasAtmosphere(ctx, width, height);

  stepMemberLayoutPhysics(list, width, height, now, null);

  galaxyAvatarDrainPreload(list);

  const drawBack = [];
  const drawMid = [];
  const drawHover = [];
  const hid = hoveredId;
  const selId = selected?.entityId;
  for (let i = 0; i < list.length; i++) {
    const m = list[i];
    if (m.entityId === hid) drawHover.push(m);
    else if (m.entityId === selId) drawMid.push(m);
    else drawBack.push(m);
  }
  const drawOrder = drawBack.concat(drawMid, drawHover);
  /** Many `drawImage` scales per frame: `medium` can reduce GPU filtering cost vs `high` (dense views only). */
  const heavySmooth = list.length > 200;
  const prevSmoothQ =
    typeof ctx.imageSmoothingQuality === "string" ? ctx.imageSmoothingQuality : "high";
  if (typeof ctx.imageSmoothingQuality === "string") {
    ctx.imageSmoothingQuality = heavySmooth ? "medium" : "high";
  }
  drawOrder.forEach((member) => {
    const interaction = memberRingInteraction(member, selected, hoveredId);
    const radius = memberDisplayRadius(member, selected, hoveredId);
    drawConstellationMemberRing(
      ctx,
      member.x,
      member.y,
      radius,
      galaxyMemberBaseColor(member),
      interaction,
      member.avatarUrl || "",
      member.entityId === selected?.entityId,
    );
  });
  if (typeof ctx.imageSmoothingQuality === "string") {
    ctx.imageSmoothingQuality = prevSmoothQ;
  }

  if (isGalaxyClusterFocus()) {
    const pin = list.find((m) => m.entityId === hoveredId) || selected;
    if (pin && (hoveredId || selected)) {
      const hoverPeer = hoveredId ? list.find((m) => m.entityId === hoveredId) : null;
      drawGalaxyClusterMemberName(ctx, pin, selected, hoveredId, width, height, hoverPeer);
    }
  } else {
    const pin = list.find((m) => m.entityId === hoveredId) || selected;
    if (pin && (hoveredId || selected)) {
      const radius = memberDisplayRadius(pin, selected, hoveredId);
      const rLabel = pin.entityId === hoveredId ? galaxyHoverAvatarRadius(radius) : radius;
      const name = String(pin.name || "").trim() || "—";
      ctx.save();
      ctx.font = CANVAS_FONT_MEMBER_PIN;
      if (pin.entityId === hoveredId) {
        const tw = Math.min(ctx.measureText(name).width + 20, width - 12);
        const th = 28;
        let left = pin.x - tw / 2;
        let top = pin.y - rLabel - 12 - th;
        left = Math.max(6, Math.min(left, width - tw - 6));
        top = Math.max(6, Math.min(top, height - th - 6));
        drawGalaxyNamePillChrome(ctx, left, top, tw, th, true);
        ctx.fillStyle = CANVAS_TEXT_MEMBER;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.letterSpacing = "0.035em";
        ctx.fillText(name, left + tw / 2, top + th / 2 + 0.5);
        ctx.letterSpacing = "0px";
      } else {
        ctx.textAlign = "left";
        ctx.textBaseline = "bottom";
        const px = pin.x + rLabel + 8;
        const py = pin.y - rLabel - 4;
        ctx.lineJoin = "round";
        ctx.lineWidth = 3;
        ctx.strokeStyle = "rgba(255, 255, 255, 0.9)";
        ctx.strokeText(name, px, py);
        ctx.fillStyle = CANVAS_TEXT_MEMBER;
        ctx.fillText(name, px, py);
      }
      ctx.restore();
    }
  }

  state.phase += GALAXY_MOTION.phaseIncrement;
  scheduleDrawFrame();
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
  __galaxyVisibleCountForRadius = galaxyRadiusLayoutCountFromList(list);

  let nearest = null;
  let nearestDistance = Infinity;

  const selected = selectedMember(list);
  list.forEach((member) => {
    const rBase = memberDisplayRadius(member, selected, state.hoveredId);
    const onHover = member.entityId === state.hoveredId;
    const hitR = onHover ? galaxyHoverAvatarRadius(rBase) + 12 : rBase * 1.2 + 14;
    const distance = Math.hypot(member.x - x, member.y - y);
    if (distance < hitR && distance < nearestDistance) {
      nearest = member;
      nearestDistance = distance;
    }
  });

  return nearest;
}

