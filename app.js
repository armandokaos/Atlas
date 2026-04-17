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
  hoveredId: null,
  selectedId: demoMember?.entityId || null,
  phase: 0,
};

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
const detailPanel = document.querySelector("#detail-panel");
const selectionSummary = document.querySelector("#selection-summary");

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

function renderSocialLinks(member, variant = "detail") {
  const label = variant === "detail" ? "Social links" : "";
  const items = [
    ["x", "X"],
    ["github", "GitHub"],
    ["linkedin", "LinkedIn"],
  ]
    .map(([key, title]) => {
      const directHref = member.socialLinks?.[key];
      if (!directHref) return "";
      const labelText = `${title} profile`;
      return `
        <a class="social-link is-active is-direct" href="${directHref}" aria-label="${labelText}" title="${labelText}">
          ${socialIcons[key]}
        </a>
      `;
    })
    .filter(Boolean)
    .join("");

  if (!items) return "";

  return `
    <div class="social-block social-block-${variant}">
      ${label ? `<p class="detail-meta">${label}</p>` : ""}
      <div class="social-links">${items}</div>
    </div>
  `;
}

function renderSpaceLinks(member, variant = "detail") {
  const primarySpace = (member.spaces || []).find(Boolean);
  if (!primarySpace) return "";
  const label = variant === "detail" ? "Personal space" : "";
  const item = `
    <a class="space-link" href="${primarySpace}" aria-label="Open personal Geo space">
      <span class="space-link-logo" aria-hidden="true">
        <svg viewBox="0 0 24 24">
          <circle cx="12" cy="12" r="9"></circle>
          <circle cx="12" cy="12" r="3.2"></circle>
          <path d="M12 2.5v4.3M12 17.2v4.3M2.5 12h4.3M17.2 12h4.3"></path>
        </svg>
      </span>
      <span class="space-link-title">Personal space</span>
    </a>
  `;
  return `
    <div class="space-block space-block-${variant}">
      ${label ? `<p class="detail-meta">${label}</p>` : ""}
      <div class="space-links">${item}</div>
    </div>
  `;
}

function activeMembers() {
  const query = state.query.trim().toLowerCase();
  return members.filter((member) => {
    const matchTheme = state.theme === "all" || member.theme === state.theme;
    const haystack = `${member.name} ${member.description} ${member.theme}`.toLowerCase();
    const matchQuery = !query || haystack.includes(query);
    return matchTheme && matchQuery;
  });
}

function selectedMember(list = members) {
  const found = list.find((member) => member.entityId === state.selectedId);
  return found || list[0] || members[0];
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
  return [...spotlightMembers(list)].sort((a, b) => {
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
        </div>
      </div>
    </div>

    ${renderSpaceLinks(member, "detail")}
    ${renderSocialLinks(member, "detail")}
  `;
}

function renderRoster(list) {
  const sorted = sortedSpotlightMembers(list);
  const total = sorted.length;

  if (!total) {
    rosterGrid.innerHTML = `<div class="empty-state">No spotlight cards for this filter yet. Try another theme or a broader keyword.</div>`;
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
        <article class="roster-item" data-entity-id="${member.entityId}">
          <div class="roster-top">
            <div>
              <p class="roster-name">${member.name}</p>
              <p class="roster-theme">${member.isBoss ? "Founder" : member.theme}</p>
            </div>
            <div class="roster-avatar" style="background:${member.color}; box-shadow:0 0 28px ${member.color}33;">
              ${renderAvatar(member, "avatar-small")}
            </div>
          </div>
          <p class="roster-description">${truncate(member.description, 175)}</p>
          ${renderSpaceLinks(member, "card")}
          ${renderSocialLinks(member, "card")}
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
  selectionSummary.textContent =
    count === members.length && !state.query
      ? `${formatNumber(count)} curator profiles with bios, grouped by shared themes.`
      : `${formatNumber(count)} curator profiles match "${activeTheme}"${state.query ? ` and "${state.query}"` : ""}.`;
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
  const br = canvas.getBoundingClientRect();
  const width = Math.max(120, Math.round(br.width) || canvas.clientWidth);
  const height = Math.max(120, Math.round(br.height) || canvas.clientHeight);
  return { width, height, br };
}

function resizeCanvas() {
  const { width: cssW, height: cssH } = readCanvasCssSize();
  const raw = window.devicePixelRatio || 1;
  const dpr = Math.min(3, Math.max(1, raw * 1.12));
  canvas.width = Math.max(1, Math.round(cssW * dpr));
  canvas.height = Math.max(1, Math.round(cssH * dpr));
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

function drawFrame() {
  const { width, height, br: brSize } = readCanvasCssSize();
  const list = activeMembers();
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

  const layoutPull = singleThemeDisk ? 0.072 : 0.012;
  const layoutDamp = singleThemeDisk ? 0.88 : 0.92;

  list.forEach((member, index) => {
    const anchor = anchors.get(member.theme) || { x: width / 2, y: height / 2 };
    const angle = member.seed + index * 0.07 + performance.now() * 0.00008;
    let targetX;
    let targetY;

    if (singleThemeDisk) {
      const n = Math.max(list.length, 1);
      const idx = index + 1;
      const golden = idx * 2.39996322972865332;
      const normR = Math.sqrt(idx / (n + 1));
      const wobbleX = Math.sin(performance.now() * 0.00028 + member.seed * 3.9) * 4;
      const wobbleY = Math.cos(performance.now() * 0.00026 + member.seed * 2.7) * 4;
      const spin = state.phase * 0.1;
      const t = golden + spin;
      targetX = anchor.x + Math.cos(t) * normR * diskHalfW + wobbleX;
      targetY = anchor.y + Math.sin(t) * normR * diskHalfH + wobbleY;
    } else {
      const viewScale = Math.min(1.85, Math.min(width, height) / 520);
      const orbit = (42 + (index % 12) * 16 + member.spaceCount * 8) * orbitScale * viewScale;
      targetX = anchor.x + Math.cos(angle) * orbit;
      targetY = anchor.y + Math.sin(angle * 1.2) * (orbit * 0.72);
    }

    member.vx += (targetX - member.x) * layoutPull;
    member.vy += (targetY - member.y) * layoutPull;
    member.vx *= layoutDamp;
    member.vy *= layoutDamp;
    member.x = member.x || targetX;
    member.y = member.y || targetY;
    member.x += member.vx;
    member.y += member.vy;
  });

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
  const list = activeMembers();

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

function syncUI() {
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
  const list = activeMembers();
  const chosen = selectedMember(list);
  if (chosen) state.selectedId = chosen.entityId;
  buildThemePills();
  renderSpotlightFilters(list);
  updateSummary(list);
  renderDetail(chosen);
  renderRoster(list);
  snapSingleThemeVogelPositions(list);
}

buildThemePills();
resizeCanvas();
syncUI();
requestAnimationFrame(() => {
  requestAnimationFrame(() => {
    resizeCanvas();
    syncUI();
  });
});
requestAnimationFrame(drawFrame);

if (canvasWrap && typeof ResizeObserver !== "undefined") {
  const ro = new ResizeObserver(() => {
    resizeCanvas();
    snapSingleThemeVogelPositions(activeMembers());
  });
  ro.observe(canvasWrap);
}

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

spotlightFilters.addEventListener("click", (event) => {
  const button = event.target.closest("[data-roster-filter]");
  if (!button) return;
  state.rosterFilter = button.dataset.rosterFilter;
  state.rosterPage = 1;
  renderSpotlightFilters(activeMembers());
  renderRoster(activeMembers());
});

document.querySelector(".roster-card").addEventListener("click", (event) => {
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

canvas.addEventListener("mousemove", (event) => {
  const member = pickMemberFromPointer(event);
  state.hoveredId = member?.entityId || null;
  canvas.style.cursor = member ? "pointer" : "default";
});

canvas.addEventListener("mouseleave", () => {
  state.hoveredId = null;
  canvas.style.cursor = "default";
});

canvas.addEventListener("click", (event) => {
  const member = pickMemberFromPointer(event);
  if (!member) return;
  state.selectedId = member.entityId;
  renderDetail(member);
  renderRoster(activeMembers());
});

rosterGrid.addEventListener("click", (event) => {
  if (event.target.closest("a")) return;
  const card = event.target.closest("[data-entity-id]");
  if (!card) return;
  state.selectedId = card.dataset.entityId;
  renderDetail(selectedMember(activeMembers()));
});

window.addEventListener("resize", resizeCanvas);
