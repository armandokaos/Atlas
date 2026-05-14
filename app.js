/** Org keys from name lists only (stored on each member at init). */
function memberOrgGroupKeysFromNames(member) {
  const raw = member?.orgGroupKeysFromNames;
  return Array.isArray(raw) && raw.length ? [...raw] : [];
}

/** Effective org keys: name lists for geo teams win; otherwise personal badge → curator bucket. */
function memberOrgGroupKeys(member) {
  const fromNames = memberOrgGroupKeysFromNames(member);
  const hasExplicitGeo = fromNames.some((k) => k === "geo-core" || k === "geo-content" || k === "geo-dev");
  if (hasExplicitGeo) return [...new Set(fromNames)];
  const fromBadge = BADGE_TO_ORG_GROUP[getPersonalBadge(member.entityId)];
  if (fromBadge) return [fromBadge];
  if (fromNames.length) return [...new Set(fromNames)];
  return ["curators"];
}

function memberBelongsToOrgGroup(member, orgKey) {
  if (orgKey === "all") return true;
  return memberOrgGroupKeys(member).includes(orgKey);
}

/** Galaxy cluster id in team mode (composite when a person belongs to several teams). */
function memberTeamGalaxyClusterKey(member) {
  return [...memberOrgGroupKeys(member)].sort().join("|");
}

function galaxyTeamColorsForMember(member) {
  return memberOrgGroupKeys(member).map((k) => ORG_GROUP_DOT_COLORS[k] || "#64748b");
}

function memberOrgGroupLabel(member) {
  const keys = memberOrgGroupKeys(member);
  const labels = keys.map((k) => ORG_GROUP_LABEL_BY_KEY[k] || k).filter(Boolean);
  if (!labels.length) return "Curators";
  if (labels.length === 1) return labels[0];
  return labels.join(" · ");
}

function memberOrgGroupDotColor(member) {
  const cols = galaxyTeamColorsForMember(member);
  if (!cols.length) return "#64748b";
  if (cols.length === 1) return cols[0];
  return blendHex2(cols[0], cols[1], 0.5);
}

function renderMemberOrgDotsHtml(member, sizeClass) {
  const cols = galaxyTeamColorsForMember(member);
  const cls = sizeClass ? `theme-dot ${sizeClass}` : "theme-dot";
  if (!cols.length) return `<span class="${cls}" style="color:#64748b;background:#64748b;"></span>`;
  return cols.map((c) => `<span class="${cls}" style="color:${c};background:${c};"></span>`).join("");
}

function memberIsHiddenByTag(member) {
  return String(personalMarks.badges?.[member.entityId] || "")
    .trim()
    .toLowerCase() === "black";
}

function uiMembers() {
  return members.filter((member) => !memberIsHiddenByTag(member));
}

const personalMarks = { ratings: {}, badges: {}, _version: 0 };
function bumpPersonalMarksVersion() {
  personalMarks._version = (personalMarks._version || 0) + 1;
}

function loadPersonalMarks() {
  try {
    const raw = localStorage.getItem(PERSONAL_STORAGE_KEY);
    if (!raw) return;
    const data = JSON.parse(raw);
    if (!data || typeof data !== "object") return;
    if (data.ratings && typeof data.ratings === "object") personalMarks.ratings = { ...data.ratings };
    if (data.badges && typeof data.badges === "object") personalMarks.badges = { ...data.badges };
    let pruned = false;
    for (const entityId of Object.keys(personalMarks.badges)) {
      if (!BADGE_KEYS.includes(personalMarks.badges[entityId])) {
        delete personalMarks.badges[entityId];
        pruned = true;
      }
    }
    if (pruned) savePersonalMarks();
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

/** Seed-only: fill keys that aren't already in personalMarks so the bundled JSON acts as a starting point,
 * not an overwrite. Without this, every page refresh would clobber in-session marks with the April 21 snapshot. */
function seedFromImportedMarks(data) {
  if (!data || typeof data !== "object") return;
  if (data.ratings && typeof data.ratings === "object") {
    for (const [k, raw] of Object.entries(data.ratings)) {
      if (personalMarks.ratings[k] != null) continue;
      const v = typeof raw === "string" ? Number(raw) : raw;
      if (typeof v === "number" && v >= 1 && v <= 5) personalMarks.ratings[k] = v;
    }
  }
  if (data.badges && typeof data.badges === "object") {
    for (const [k, v] of Object.entries(data.badges)) {
      if (personalMarks.badges[k] != null) continue;
      if (BADGE_KEYS.includes(v)) personalMarks.badges[k] = v;
    }
  }
}

async function loadBundledMarks() {
  let loaded = false;
  try {
    for (const url of DEFAULT_MARKS_JSON_URLS) {
      const res = await fetch(url);
      if (!res.ok) continue;
      const data = await res.json();
      seedFromImportedMarks(data);
      loaded = true;
    }
    if (loaded) {
      bumpPersonalMarksVersion();
      savePersonalMarks();
    }
  } catch {
    /* optional seed file; ignore if unavailable */
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
  bumpPersonalMarksVersion();
  bumpFilterCache();
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
  bumpPersonalMarksVersion();
  bumpFilterCache();
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
  bumpPersonalMarksVersion();
  bumpFilterCache();
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
  bumpPersonalMarksVersion();
}

function memberSkillsList(member) {
  return Array.isArray(member?.skills) ? member.skills.filter(Boolean) : [];
}

/** Parse #RRGGBB member theme color → rgba() for tinted UI (falls back to violet). */
function accentRgbParts(hex) {
  const raw = String(hex || "").trim().replace(/^#/, "");
  if (!/^[0-9a-f]{6}$/i.test(raw)) return { r: 116, g: 71, b: 245 };
  const n = parseInt(raw, 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

function renderSocialIconButtons(member, btnClass) {
  const isDetail = btnClass === "detail-social-btn";
  return (["x", "github", "linkedin"])
    .map((key) => {
      const rawHref = member.socialLinks?.[key];
      if (!rawHref) return "";
      const href = escapeHtml(ensureHttps(String(rawHref).trim()));
      const title = platformLabels[key] || key;

      if (key === "x" && member.xStatus) {
        const statusLabel = member.xStatus === "suspended" ? "Suspended" : "Deleted";
        const tip = `X account ${statusLabel.toLowerCase()}`;
        if (isDetail) {
          return `<span class="soc-unavail soc-unavail--detail" title="${tip}" role="img" aria-label="${tip}">${socialIcons.x}<span class="soc-unavail-label">${statusLabel}</span></span>`;
        }
        return `<span class="soc-unavail soc-unavail--roster" title="${tip}" role="img" aria-label="${tip}">${socialIcons.x}</span>`;
      }

      if (key === "x" && Number.isFinite(member.xFollowers)) {
        const count = formatFollowers(member.xFollowers);
        const ariaLabel = escapeHtml(`X, ${member.xFollowers.toLocaleString()} followers (opens in a new tab)`);
        if (isDetail) {
          return `<a class="${btnClass} ${btnClass}--x follower-pill" href="${href}" target="_blank" rel="noopener noreferrer" aria-label="${ariaLabel}">${socialIcons.x}<span class="follower-pill-stats" aria-hidden="true"><b class="follower-pill-count">${count}</b><span class="follower-pill-label">followers</span></span></a>`;
        }
        return `<a class="${btnClass} ${btnClass}--x follower-chip" href="${href}" target="_blank" rel="noopener noreferrer" aria-label="${ariaLabel}" title="X — ${count} followers">${socialIcons.x}<span class="follower-chip-count" aria-hidden="true">${count}</span></a>`;
      }

      if (key === "github" && member.ghStatus) {
        const tip = "GitHub account unavailable";
        if (isDetail) {
          return `<span class="soc-unavail soc-unavail--detail" title="${tip}" role="img" aria-label="${tip}">${socialIcons.github}<span class="soc-unavail-label">Unavailable</span></span>`;
        }
        return `<span class="soc-unavail soc-unavail--roster" title="${tip}" role="img" aria-label="${tip}">${socialIcons.github}</span>`;
      }

      if (key === "github" && Number.isFinite(member.ghFollowers)) {
        const count = formatFollowers(member.ghFollowers);
        const ariaLabel = escapeHtml(`GitHub, ${member.ghFollowers.toLocaleString()} followers (opens in a new tab)`);
        if (isDetail) {
          return `<a class="${btnClass} ${btnClass}--github follower-pill" href="${href}" target="_blank" rel="noopener noreferrer" aria-label="${ariaLabel}">${socialIcons.github}<span class="follower-pill-stats" aria-hidden="true"><b class="follower-pill-count">${count}</b><span class="follower-pill-label">followers</span></span></a>`;
        }
        return `<a class="${btnClass} ${btnClass}--github follower-chip" href="${href}" target="_blank" rel="noopener noreferrer" aria-label="${ariaLabel}" title="GitHub — ${count} followers">${socialIcons.github}<span class="follower-chip-count" aria-hidden="true">${count}</span></a>`;
      }

      if (key === "linkedin" && member.liStatus) {
        const tip = "LinkedIn account unavailable";
        if (isDetail) {
          return `<span class="soc-unavail soc-unavail--detail" title="${tip}" role="img" aria-label="${tip}">${socialIcons.linkedin}<span class="soc-unavail-label">Unavailable</span></span>`;
        }
        return `<span class="soc-unavail soc-unavail--roster" title="${tip}" role="img" aria-label="${tip}">${socialIcons.linkedin}</span>`;
      }

      if (key === "linkedin" && Number.isFinite(member.liFollowers)) {
        const count = formatFollowers(member.liFollowers);
        const ariaLabel = escapeHtml(`LinkedIn, ${member.liFollowers.toLocaleString()} followers (opens in a new tab)`);
        if (isDetail) {
          return `<a class="${btnClass} ${btnClass}--linkedin follower-pill" href="${href}" target="_blank" rel="noopener noreferrer" aria-label="${ariaLabel}">${socialIcons.linkedin}<span class="follower-pill-stats" aria-hidden="true"><b class="follower-pill-count">${count}</b><span class="follower-pill-label">followers</span></span></a>`;
        }
        return `<a class="${btnClass} ${btnClass}--linkedin follower-chip" href="${href}" target="_blank" rel="noopener noreferrer" aria-label="${ariaLabel}" title="LinkedIn — ${count} followers">${socialIcons.linkedin}<span class="follower-chip-count" aria-hidden="true">${count}</span></a>`;
      }

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
  const prose = skills
    .map((s) => {
      const k = String(s).trim().toLowerCase();
      const enc = encodeURIComponent(k);
      return `<button type="button" class="detail-skill-item" data-skill-nav="${enc}" title="Show everyone with this skill">${escapeHtml(String(s))}</button>`;
    })
    .join(sep);
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
  const body = shown
    .map((s) => {
      const k = String(s).trim().toLowerCase();
      const enc = encodeURIComponent(k);
      return `<button type="button" class="roster-skill-chip" data-skill-nav="${enc}" title="Show everyone with this skill">${escapeHtml(String(s))}</button>`;
    })
    .join(sep);
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

const __galaxyLayoutReset = {
  theme: state.theme,
  orgGroup: state.orgGroup,
  galaxyViewMode: state.galaxyViewMode,
  skillGalaxy: state.skillGalaxy,
};

const searchInput = document.querySelector("#search-input");
const spotlightThemeStrip = document.querySelector("#spotlight-theme-strip");
const spotlightOrgStrip = document.querySelector("#spotlight-org-strip");
const canvasWrap = document.querySelector(".canvas-wrap");
const rosterGrid = document.querySelector("#roster-grid");
const rosterPagination = document.querySelector("#roster-pagination");
const rosterListShell = document.querySelector("#roster-list-shell");
const spotlightFilters = document.querySelector("#spotlight-filters");
const markerFilters = document.querySelector("#marker-filters");
const detailPanel = document.querySelector("#detail-panel");
const detailCard = document.querySelector(".detail-card");
const rosterCard = document.querySelector(".roster-card");
const searchSuggestEl = document.querySelector("#search-suggest");
const skillChipsEl = document.querySelector("#spotlight-skill-chips");
const compareTrayEl = document.querySelector("#compare-tray");
const compareModalEl = document.querySelector("#compare-modal");
const COMPARE_MAX = 3;
const galaxyCardEl = document.querySelector(".galaxy-card");
const galaxyThemePills = document.querySelector("#galaxy-theme-pills");
const galaxyOrgPills = document.querySelector("#galaxy-org-pills");
const galaxySkillPills = document.querySelector("#galaxy-skill-pills");

function formatNumber(value) {
  return new Intl.NumberFormat("en-US").format(value);
}

function formatFollowers(n) {
  if (!Number.isFinite(n) || n < 0) return "";
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, "")}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(1).replace(/\.0$/, "")}K`;
  return String(n);
}

function truncate(text, max = 150) {
  if (!text || !String(text).trim()) return "";
  if (text.length <= max) return text;
  return `${text.slice(0, max).trim()}...`;
}

function relativeDensity(member) {
  if (member.description && member.spaceCount > 1) return "highly connected profile";
  if (member.description) return "detailed bio";
  if (member.spaceCount > 1) return "active across multiple spaces";
  return "light profile";
}

/** Lowercase + strip combining marks for accent-insensitive search (best-effort). */
function normalizeForSearch(value) {
  const s = String(value ?? "").toLowerCase();
  try {
    return s.normalize("NFD").replace(/\p{M}/gu, "");
  } catch {
    return s;
  }
}

function buildMemberSearchHaystack(member) {
  const v = personalMarks._version || 0;
  if (member._searchHayV === v && member._searchHay != null) return member._searchHay;
  const skillsHay = memberSkillsList(member).join(" ");
  const sl = member.socialLinks || {};
  const urls = [sl.x, sl.github, sl.linkedin, ...(member.spaces || [])].filter(Boolean).join(" ");
  const orgKeysHay = memberOrgGroupKeys(member).join(" ");
  const raw = [
    member.name,
    member.description,
    member.theme,
    memberOrgGroupLabel(member),
    orgKeysHay,
    skillsHay,
    member.entityId,
    member.skillClusterLabel,
    urls,
  ]
    .filter(Boolean)
    .join(" ");
  const hay = normalizeForSearch(raw);
  member._searchHay = hay;
  member._searchHayV = v;
  return hay;
}

let __queryTokensCacheRaw = " ";
let __queryTokensCacheVal = [];
function getQueryTokens(rawQuery) {
  if (rawQuery === __queryTokensCacheRaw) return __queryTokensCacheVal;
  __queryTokensCacheRaw = rawQuery;
  const q = String(rawQuery ?? "").trim();
  if (!q) {
    __queryTokensCacheVal = [];
    return __queryTokensCacheVal;
  }
  __queryTokensCacheVal = normalizeForSearch(q).split(/\s+/).filter(Boolean);
  return __queryTokensCacheVal;
}

function searchQueryMatchesHaystack(normHaystack, rawQuery) {
  const tokens = getQueryTokens(rawQuery);
  if (!tokens.length) return true;
  for (let i = 0; i < tokens.length; i++) {
    if (!normHaystack.includes(tokens[i])) return false;
  }
  return true;
}

/** Theme + team + search (used for skill-pill counts so they never drop to 0 just because a skill filter is active). */
function memberMatchesGalaxyRollupFilters(member) {
  const matchTheme =
    state.galaxyViewMode === "category" ? state.theme === "all" || member.theme === state.theme : true;
  const matchOrg =
    state.galaxyViewMode === "team" ? memberBelongsToOrgGroup(member, state.orgGroup) : true;
  const haystack = buildMemberSearchHaystack(member);
  const matchQuery = searchQueryMatchesHaystack(haystack, state.query);
  return matchTheme && matchOrg && matchQuery;
}

/** Read pill `data-skill-galaxy` (literal attribute) so decoding never throws on odd `%` sequences. */
function readSkillGalaxyPillKey(el) {
  const raw = el.getAttribute("data-skill-galaxy");
  if (raw == null || raw === "" || raw === "all") return "all";
  let decoded;
  try {
    decoded = decodeURIComponent(raw);
  } catch {
    decoded = raw;
  }
  const k = String(decoded).trim().toLowerCase();
  if (!k || k === "all") return "all";
  if (k === GALAXY_SKILL_OTHER) return GALAXY_SKILL_OTHER;
  return k;
}

/** AND-match every chip in `state.skillFilters` against the member's skills. */
function memberMatchesSkillChipFilters(member) {
  if (!state.skillFilters || state.skillFilters.size === 0) return true;
  const owned = new Set();
  for (const s of memberSkillsList(member)) owned.add(String(s).trim().toLowerCase());
  for (const k of state.skillFilters) {
    if (!owned.has(k)) return false;
  }
  return true;
}

/** Skills galaxy filter: match normalized skill text; Other = cluster-only bucket. */
function memberMatchesSkillGalaxyFilter(member) {
  if (state.skillGalaxy === "all") return true;
  if (state.skillGalaxy === GALAXY_SKILL_OTHER) return member.skillClusterKey === GALAXY_SKILL_OTHER;
  const key = state.skillGalaxy;
  for (const s of memberSkillsList(member)) {
    if (String(s).trim().toLowerCase() === key) return true;
  }
  return false;
}

function navigateToSkillGalaxyFilter(skillKeyRaw) {
  const skillKey = String(skillKeyRaw || "").trim().toLowerCase();
  if (!skillKey) return;
  state.galaxyViewMode = "skills";
  state.skillGalaxy = skillKey;
  syncUI();
}

/** Pass-scoped memo: cleared at the start of each syncUI/refreshSpotlightUI call so
 * drawFrame's per-frame visibleMembers() lookups are O(1) until state actually changes. */
const __filterCache = new Map();
function bumpFilterCache() {
  __filterCache.clear();
}

function activeMembers() {
  let cached = __filterCache.get("active");
  if (cached) return cached;
  cached = uiMembers().filter((member) => {
    if (!memberMatchesGalaxyRollupFilters(member)) return false;
    if (!memberMatchesSkillChipFilters(member)) return false;
    return state.galaxyViewMode !== "skills" || memberMatchesSkillGalaxyFilter(member);
  });
  __filterCache.set("active", cached);
  return cached;
}

/** Theme pill counts must not use the active theme filter, or "All" and the selected theme show the same total. */
function membersForThemePillCounts() {
  return uiMembers().filter((m) => {
    if (!searchQueryMatchesHaystack(buildMemberSearchHaystack(m), state.query)) return false;
    if (!memberMatchesSkillChipFilters(m)) return false;
    if (state.galaxyViewMode === "team" && !memberBelongsToOrgGroup(m, state.orgGroup)) return false;
    if (state.galaxyViewMode === "skills" && !memberMatchesSkillGalaxyFilter(m)) return false;
    return true;
  });
}

/** Org pill counts must not use the active org filter (same redundancy as theme pills). */
function membersForOrgPillCounts() {
  return uiMembers().filter((m) => {
    if (!searchQueryMatchesHaystack(buildMemberSearchHaystack(m), state.query)) return false;
    if (!memberMatchesSkillChipFilters(m)) return false;
    if (state.galaxyViewMode === "category" && state.theme !== "all" && m.theme !== state.theme) return false;
    if (state.galaxyViewMode === "skills" && !memberMatchesSkillGalaxyFilter(m)) return false;
    return true;
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
  let cached = __filterCache.get("visible");
  if (cached) return cached;
  cached = applyPersonalFilters(spotlightMembers(activeMembers()));
  __filterCache.set("visible", cached);
  return cached;
}

function selectedMember(list = uiMembers()) {
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

function memberHasFollowerData(member) {
  return Number.isFinite(member.xFollowers) || Number.isFinite(member.ghFollowers) || Number.isFinite(member.liFollowers);
}

function memberTotalFollowers(member) {
  let n = 0;
  if (Number.isFinite(member.xFollowers)) n += member.xFollowers;
  if (Number.isFinite(member.ghFollowers)) n += member.ghFollowers;
  if (Number.isFinite(member.liFollowers)) n += member.liFollowers;
  return n;
}

// When a platform filter is active, sort by that platform's followers only.
// Falls back to total when filter is "all".
function memberSortFollowers(member) {
  if (state.rosterFilter === "x") return Number.isFinite(member.xFollowers) ? member.xFollowers : -1;
  if (state.rosterFilter === "github") return Number.isFinite(member.ghFollowers) ? member.ghFollowers : -1;
  if (state.rosterFilter === "linkedin") return Number.isFinite(member.liFollowers) ? member.liFollowers : -1;
  return memberTotalFollowers(member);
}

function memberSortHasFollowerData(member) {
  if (state.rosterFilter === "x") return Number.isFinite(member.xFollowers);
  if (state.rosterFilter === "github") return Number.isFinite(member.ghFollowers);
  if (state.rosterFilter === "linkedin") return Number.isFinite(member.liFollowers);
  return memberHasFollowerData(member);
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
  const filtered = [...applyPersonalFilters(spotlightMembers(list))];
  if (state.followerSort !== "none") {
    return filtered.sort((a, b) => {
      const hasA = memberSortHasFollowerData(a);
      const hasB = memberSortHasFollowerData(b);
      if (hasA !== hasB) return hasA ? -1 : 1;
      if (!hasA) return a.name.localeCompare(b.name);
      const diff = memberSortFollowers(b) - memberSortFollowers(a);
      return state.followerSort === "most" ? diff : -diff;
    });
  }
  return filtered.sort((a, b) => {
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

  const filterHtml = items
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

  const hasFollowerData = uiMembers().some(memberHasFollowerData);
  const sortHtml = hasFollowerData
    ? `<div class="follower-sort-row">
        <span class="follower-sort-label">Followers</span>
        <div class="follower-sort-btns">
          <button type="button" class="follower-sort-btn${state.followerSort === "most" ? " active" : ""}" data-follower-sort="most">Most</button>
          <button type="button" class="follower-sort-btn${state.followerSort === "fewest" ? " active" : ""}" data-follower-sort="fewest">Fewest</button>
        </div>
      </div>`
    : "";

  spotlightFilters.innerHTML = filterHtml + sortHtml;
}

function renderThemePillsInto(container, compact, countSource) {
  if (!container) return;
  const source = countSource ?? activeMembers();
  const counts = source.reduce((acc, member) => {
    acc[member.theme] = (acc[member.theme] || 0) + 1;
    return acc;
  }, {});
  const total = source.length;
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

function renderOrgGroupPillsInto(container, compact, countSource) {
  if (!container) return;
  const counts = new Map();
  const source = countSource ?? activeMembers();
  source.forEach((m) => {
    for (const key of memberOrgGroupKeys(m)) {
      counts.set(key, (counts.get(key) || 0) + 1);
    }
  });
  const pills = ORG_GROUP_PILL_ORDER.map((key) => {
    if (key === "all") {
      return { key: "all", label: "All teams", color: "#EEF4FF", count: source.length };
    }
    return {
      key,
      label: ORG_GROUP_LABEL_BY_KEY[key] || key,
      color: ORG_GROUP_DOT_COLORS[key] || "#94A3B8",
      count: counts.get(key) || 0,
    };
  });
  const compactClass = compact ? " theme-pill--compact" : "";
  container.innerHTML = pills
    .map(
      (pill) => `
        <button
          class="theme-pill${compactClass} ${state.orgGroup === pill.key ? "active" : ""}"
          data-org-group="${pill.key}"
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

/** Category / Team pill rows under the constellation tabs (same filters as Spotlight). */
function renderGalaxyCategoryTeamToolbars() {
  const catBar = document.querySelector("#galaxy-category-toolbar");
  const teamBar = document.querySelector("#galaxy-team-toolbar");
  if (!catBar || !teamBar || !galaxyThemePills || !galaxyOrgPills) return;
  const mode = state.galaxyViewMode;
  catBar.hidden = mode !== "category";
  teamBar.hidden = mode !== "team";
  if (mode === "category") {
    renderThemePillsInto(galaxyThemePills, true, membersForThemePillCounts());
  } else {
    galaxyThemePills.innerHTML = "";
  }
  if (mode === "team") {
    renderOrgGroupPillsInto(galaxyOrgPills, true, membersForOrgPillCounts());
  } else {
    galaxyOrgPills.innerHTML = "";
  }
}

function renderGalaxySkillPillsStrip() {
  const bar = document.querySelector("#galaxy-skill-toolbar");
  const el = document.querySelector("#galaxy-skill-pills");
  if (!bar || !el) return;
  if (state.galaxyViewMode !== "skills") {
    bar.hidden = true;
    el.innerHTML = "";
    return;
  }
  bar.hidden = false;
  const rollup = uiMembers().filter(memberMatchesGalaxyRollupFilters);
  const counts = new Map();
  rollup.forEach((m) => {
    if (m.skillClusterKey === GALAXY_SKILL_OTHER) {
      counts.set(GALAXY_SKILL_OTHER, (counts.get(GALAXY_SKILL_OTHER) || 0) + 1);
    }
    const seenSkill = new Set();
    for (const raw of m.skills) {
      const k = String(raw).trim().toLowerCase();
      if (!k) continue;
      if (seenSkill.has(k)) continue;
      seenSkill.add(k);
      counts.set(k, (counts.get(k) || 0) + 1);
    }
  });
  if (
    state.skillGalaxy !== "all" &&
    (state.skillGalaxy === GALAXY_SKILL_OTHER
      ? (counts.get(GALAXY_SKILL_OTHER) || 0) === 0
      : (counts.get(state.skillGalaxy) || 0) < 1)
  ) {
    state.skillGalaxy = "all";
  }
  const keysWithPeople = GALAXY_TOP_SKILL_KEYS.filter((k) => (counts.get(k) || 0) >= 2);
  const extraMulti = [...counts.keys()].filter(
    (k) => k !== GALAXY_SKILL_OTHER && (counts.get(k) || 0) >= 2 && !keysWithPeople.includes(k),
  );
  extraMulti.sort((a, b) => (counts.get(b) - counts.get(a)) || String(a).localeCompare(String(b)));
  const keys = ["all", ...keysWithPeople, ...extraMulti];
  const sg = state.skillGalaxy;
  if (sg !== "all" && sg !== GALAXY_SKILL_OTHER && (counts.get(sg) || 0) >= 1 && !keys.includes(sg)) {
    keys.push(sg);
  }
  if ((counts.get(GALAXY_SKILL_OTHER) || 0) > 0) keys.push(GALAXY_SKILL_OTHER);
  const pills = keys
    .map((key) => {
      if (key === "all") {
        return { key: "all", label: "All skills", color: "#EEF4FF", count: rollup.length };
      }
      return {
        key,
        label: truncateGalaxyLabel(GALAXY_SKILL_LABEL_BY_KEY.get(key) || key, 20),
        color: galaxySkillHex(key),
        count: counts.get(key) || 0,
      };
    })
    .filter((pill) => pill.key === "all" || pill.count > 0);
  el.innerHTML = pills
    .map((pill) => {
      const enc = pill.key === "all" ? "all" : encodeURIComponent(pill.key);
      return `
        <button
          type="button"
          class="theme-pill theme-pill--compact ${state.skillGalaxy === pill.key ? "active" : ""}"
          data-skill-galaxy="${enc}"
        >
          <span class="theme-dot" style="color:${pill.color}; background:${pill.color};"></span>
          <span>${pill.label}</span>
          <span class="theme-pill-count">${formatNumber(pill.count)}</span>
        </button>`;
    })
    .join("");
}

function renderGalaxyViewChrome() {
  const root = document.querySelector("#galaxy-viz-switch");
  if (!root) return;
  const modes = [
    { id: "category", label: "Category" },
    { id: "team", label: "Team" },
    { id: "skills", label: "Skills" },
  ];
  root.innerHTML = modes
    .map(
      (m) => `
        <button
          type="button"
          class="galaxy-viz-tab ${state.galaxyViewMode === m.id ? "is-active" : ""}"
          data-galaxy-view="${m.id}"
          role="tab"
          aria-selected="${state.galaxyViewMode === m.id ? "true" : "false"}"
        >${m.label}</button>`,
    )
    .join("");
  renderGalaxyCategoryTeamToolbars();
  renderGalaxySkillPillsStrip();
}

function buildThemePills() {
  renderThemePillsInto(spotlightThemeStrip, true, membersForThemePillCounts());
  renderOrgGroupPillsInto(spotlightOrgStrip, true, membersForOrgPillCounts());
  renderGalaxyViewChrome();
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
  };
  for (const k of BADGE_KEYS) {
    badgeCounts[k] = scope.filter((m) => getPersonalBadge(m.entityId) === k).length;
  }
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
    ...BADGE_KEYS.map((k) => [k, "", k, false]),
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
            <span>${escapeHtml(member.theme)}</span>
          </div>
          <h2 class="detail-name">${escapeHtml(member.name)}</h2>
          <p class="detail-org" aria-label="Team: ${escapeHtml(memberOrgGroupLabel(member))}"><span class="detail-org-label">Team</span><span class="detail-org-pill">${renderMemberOrgDotsHtml(member, "theme-dot--detail")}<span class="detail-org-name">${escapeHtml(memberOrgGroupLabel(member))}</span></span></p>
          <p class="detail-description">${member.description ? escapeHtml(member.description) : ""}</p>
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
    rosterGrid.innerHTML = `<div class="empty-state">No profiles match these filters. Try another team, category, search, link filter, or relax your star and tag filters.</div>`;
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
    .map((member) => {
      const inCompare = isInCompareSet(member.entityId);
      const compareDisabled = !inCompare && state.compareIds.length >= COMPARE_MAX;
      return `
        <article class="roster-item${member.entityId === state.selectedId ? " is-selected" : ""}${inCompare ? " is-comparing" : ""}" data-entity-id="${member.entityId}">
          <button type="button" class="compare-toggle${inCompare ? " is-on" : ""}" data-compare-toggle="${escapeHtml(member.entityId)}" aria-pressed="${inCompare ? "true" : "false"}" ${compareDisabled ? "disabled" : ""} title="${inCompare ? "Remove from compare" : compareDisabled ? "Compare is full (3 max)" : "Add to compare"}">
            ${inCompare ? "✓ Compare" : "+ Compare"}
          </button>
          <div class="roster-top">
            <div>
              <p class="roster-name">${escapeHtml(member.name)}</p>
              <p class="roster-theme">
                <span class="roster-team">${renderMemberOrgDotsHtml(member, "theme-dot--roster")}<span class="roster-team-label">${escapeHtml(memberOrgGroupLabel(member))}</span></span><span class="roster-theme-split"> · </span><span class="roster-theme-name">${member.isBoss ? "Founder" : escapeHtml(member.theme)}</span>
              </p>
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
      `;
    })
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

function refreshSpotlightUI({ rebuildThemes = false } = {}) {
  bumpFilterCache();
  const base = activeMembers();
  if (rebuildThemes) buildThemePills();
  renderSpotlightFilters(base);
  renderMarkerFilters(base);
  renderSkillChips();
  renderCompareTray();
  const vis = visibleMembers();
  const chosen = selectedMember(vis);
  if (chosen) state.selectedId = chosen.entityId;
  else state.selectedId = null;
  renderDetail(chosen);
  renderRoster(base);
  snapSingleThemeVogelPositions(vis);
  renderGalaxyCanvasLegend();
}

function syncUI() {
  bumpFilterCache();
  if (galaxyFocus.mode !== "landscape") gfFinishExitToLandscape();
  if (state.orgGroup === "curators-red") state.orgGroup = "curators-orange";
  if (
    __galaxyLayoutReset.theme !== state.theme ||
    __galaxyLayoutReset.orgGroup !== state.orgGroup ||
    __galaxyLayoutReset.galaxyViewMode !== state.galaxyViewMode ||
    __galaxyLayoutReset.skillGalaxy !== state.skillGalaxy
  ) {
    __galaxyLayoutReset.theme = state.theme;
    __galaxyLayoutReset.orgGroup = state.orgGroup;
    __galaxyLayoutReset.galaxyViewMode = state.galaxyViewMode;
    __galaxyLayoutReset.skillGalaxy = state.skillGalaxy;
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

function galaxyCanvasViewModeLabel() {
  if (state.galaxyViewMode === "team") return "Team";
  if (state.galaxyViewMode === "skills") return "Skills";
  return "Category";
}

function renderGalaxyCanvasLegend() {
  const el = document.querySelector("#galaxy-canvas-legend");
  if (!el) return;
  if (galaxyFocus.mode !== "landscape") {
    el.removeAttribute("hidden");
    el.innerHTML = `<div class="galaxy-canvas-legend__inner galaxy-canvas-legend__inner--focus"><span>${escapeHtml("Esc — return to map")}</span></div>`;
    return;
  }
  el.innerHTML = "";
  el.setAttribute("hidden", "");
}

loadPersonalMarks();

/** Critical path: render UI from localStorage immediately. Cloud auth + seed-marks are deferred
 * — both can land later without blocking first paint. The previous code awaited both before any UI. */
resizeCanvas();
syncUI();
scheduleDrawFrame();

/** Second resize after layout settles (font metrics, scrollbars). No syncUI needed — drawFrame picks up new size. */
requestAnimationFrame(() => {
  requestAnimationFrame(() => resizeCanvas());
});

/** No-op when cloud isn't configured; otherwise dynamic-imports Supabase and renders the sync panel.
 * Either way the canvas doesn't depend on it. */
void initCloudAuth();

/** First-time visitors get curator seed marks; existing visitors already have them in localStorage.
 * Trigger one re-render only if seed actually changed something. */
void loadBundledMarks().then(() => {
  if (Object.keys(personalMarks.ratings).length || Object.keys(personalMarks.badges).length) {
    bumpFilterCache();
    refreshSpotlightUI();
  }
});

if (typeof document !== "undefined") {
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) scheduleDrawFrame();
  });
}

if (canvas && typeof IntersectionObserver !== "undefined") {
  const io = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        __canvasOnScreen = entry.isIntersecting;
      }
      if (__canvasOnScreen) scheduleDrawFrame();
    },
    { threshold: 0 },
  );
  io.observe(canvas);
}

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

/** ---------------- Skill autocomplete ---------------- */

let __skillSuggestList = [];
let __skillSuggestActive = -1;

function renderSkillSuggest() {
  if (!searchSuggestEl) return;
  const q = (state.query || "").trim().toLowerCase();
  if (q.length < 2) {
    __skillSuggestList = [];
    __skillSuggestActive = -1;
    searchSuggestEl.hidden = true;
    searchSuggestEl.innerHTML = "";
    return;
  }
  const matches = [];
  for (const entry of __skillSearchIndex) {
    if (state.skillFilters.has(entry.key)) continue;
    if (entry.key.includes(q)) matches.push(entry);
    if (matches.length >= 8) break;
  }
  __skillSuggestList = matches;
  __skillSuggestActive = -1;
  if (!matches.length) {
    searchSuggestEl.hidden = true;
    searchSuggestEl.innerHTML = "";
    return;
  }
  searchSuggestEl.hidden = false;
  searchSuggestEl.innerHTML = matches
    .map(
      (m, i) => `
        <button type="button" class="search-suggest-item" role="option" data-skill-key="${escapeHtml(m.key)}" data-suggest-index="${i}">
          <span class="search-suggest-label">${escapeHtml(m.label)}</span>
          <span class="search-suggest-count">${formatNumber(m.count)}</span>
        </button>
      `,
    )
    .join("");
}

function applySkillSuggest(key) {
  const k = String(key || "").toLowerCase();
  if (!k) return;
  state.skillFilters.add(k);
  state.query = "";
  if (searchInput) searchInput.value = "";
  __skillSuggestList = [];
  __skillSuggestActive = -1;
  if (searchSuggestEl) {
    searchSuggestEl.hidden = true;
    searchSuggestEl.innerHTML = "";
  }
  state.rosterPage = 1;
  syncUI();
}

function setSuggestActive(idx) {
  if (!searchSuggestEl || searchSuggestEl.hidden) return;
  const items = searchSuggestEl.querySelectorAll(".search-suggest-item");
  if (!items.length) return;
  const next = ((idx % items.length) + items.length) % items.length;
  __skillSuggestActive = next;
  items.forEach((el, i) => el.classList.toggle("is-active", i === next));
  items[next]?.scrollIntoView({ block: "nearest" });
}

function renderSkillChips() {
  if (!skillChipsEl) return;
  const keys = [...state.skillFilters];
  if (!keys.length) {
    skillChipsEl.hidden = true;
    skillChipsEl.innerHTML = "";
    return;
  }
  skillChipsEl.hidden = false;
  skillChipsEl.innerHTML = keys
    .map((k) => {
      const label = __skillLabelByKey.get(k) || k;
      return `<button type="button" class="skill-chip" data-skill-chip="${escapeHtml(k)}" aria-label="Remove skill filter ${escapeHtml(label)}"><span class="skill-chip-label">${escapeHtml(label)}</span><span class="skill-chip-x" aria-hidden="true">×</span></button>`;
    })
    .join("");
}

/** mousedown (not click) so the suggest item fires before the input loses focus. */
searchSuggestEl?.addEventListener("mousedown", (event) => {
  const btn = event.target.closest("[data-skill-key]");
  if (!btn) return;
  event.preventDefault();
  applySkillSuggest(btn.dataset.skillKey);
});

skillChipsEl?.addEventListener("click", (event) => {
  const btn = event.target.closest("[data-skill-chip]");
  if (!btn) return;
  state.skillFilters.delete(btn.dataset.skillChip);
  state.rosterPage = 1;
  syncUI();
});

document.addEventListener("click", (event) => {
  if (!searchSuggestEl || searchSuggestEl.hidden) return;
  if (event.target.closest("#search-suggest")) return;
  if (event.target === searchInput) return;
  searchSuggestEl.hidden = true;
});

/** Coalesce rapid keystrokes: at most one syncUI per frame. */
let __searchSyncScheduled = false;
searchInput.addEventListener("input", (event) => {
  state.query = event.target.value;
  if (__searchSyncScheduled) return;
  __searchSyncScheduled = true;
  requestAnimationFrame(() => {
    __searchSyncScheduled = false;
    renderSkillSuggest();
    syncUI();
  });
});

searchInput.addEventListener("focus", () => {
  if ((state.query || "").trim().length >= 2) renderSkillSuggest();
});

searchInput.addEventListener("keydown", (event) => {
  if (!searchSuggestEl || searchSuggestEl.hidden || !__skillSuggestList.length) return;
  if (event.key === "ArrowDown") {
    event.preventDefault();
    setSuggestActive(__skillSuggestActive + 1);
  } else if (event.key === "ArrowUp") {
    event.preventDefault();
    setSuggestActive(__skillSuggestActive - 1);
  } else if (event.key === "Enter") {
    if (__skillSuggestActive >= 0 && __skillSuggestList[__skillSuggestActive]) {
      event.preventDefault();
      applySkillSuggest(__skillSuggestList[__skillSuggestActive].key);
    }
  } else if (event.key === "Escape") {
    searchSuggestEl.hidden = true;
    __skillSuggestList = [];
    __skillSuggestActive = -1;
  }
});

/** ---------------- Compare (side-by-side) ---------------- */

function isInCompareSet(entityId) {
  return state.compareIds.includes(entityId);
}

function toggleCompare(entityId) {
  if (!entityId) return;
  const i = state.compareIds.indexOf(entityId);
  if (i >= 0) {
    state.compareIds.splice(i, 1);
  } else if (state.compareIds.length < COMPARE_MAX) {
    state.compareIds.push(entityId);
  } else {
    return;
  }
  renderCompareTray();
  renderRoster(activeMembers());
  renderDetail(selectedMember(visibleMembers()));
}

function renderCompareTray() {
  if (!compareTrayEl) return;
  const ids = state.compareIds;
  if (!ids.length) {
    compareTrayEl.hidden = true;
    compareTrayEl.innerHTML = "";
    return;
  }
  const byId = new Map(members.map((m) => [m.entityId, m]));
  const picks = ids.map((id) => byId.get(id)).filter(Boolean);
  compareTrayEl.hidden = false;
  compareTrayEl.innerHTML = `
    <div class="compare-tray-inner">
      <div class="compare-tray-avatars">
        ${picks
          .map(
            (m) => `
              <button type="button" class="compare-tray-avatar" data-compare-tray-remove="${escapeHtml(m.entityId)}" title="Remove ${escapeHtml(m.name)}" aria-label="Remove ${escapeHtml(m.name)} from compare">
                ${renderAvatar(m, "avatar-mini")}
              </button>
            `,
          )
          .join("")}
      </div>
      <span class="compare-tray-count">${picks.length} / ${COMPARE_MAX}</span>
      <button type="button" class="compare-tray-btn compare-tray-btn--open" id="compare-tray-open" ${picks.length < 2 ? "disabled" : ""}>Compare</button>
      <button type="button" class="compare-tray-btn compare-tray-btn--clear" id="compare-tray-clear">Clear</button>
    </div>
  `;
}

compareTrayEl?.addEventListener("click", (event) => {
  const removeBtn = event.target.closest("[data-compare-tray-remove]");
  if (removeBtn) {
    toggleCompare(removeBtn.dataset.compareTrayRemove);
    return;
  }
  if (event.target.closest("#compare-tray-clear")) {
    state.compareIds = [];
    renderCompareTray();
    renderRoster(activeMembers());
    renderDetail(selectedMember(visibleMembers()));
    return;
  }
  if (event.target.closest("#compare-tray-open")) {
    openCompareModal();
  }
});

function compareModalKeydownHandler(event) {
  if (event.key === "Escape") closeCompareModal();
}

function openCompareModal() {
  if (!compareModalEl) return;
  const byId = new Map(members.map((m) => [m.entityId, m]));
  const picks = state.compareIds.map((id) => byId.get(id)).filter(Boolean);
  if (picks.length < 2) return;
  compareModalEl.hidden = false;
  compareModalEl.innerHTML = `
    <div class="compare-modal-backdrop" data-compare-close></div>
    <div class="compare-modal-shell" role="dialog" aria-modal="true" aria-label="Compare profiles">
      <header class="compare-modal-header">
        <h2>Compare profiles</h2>
        <button type="button" class="compare-modal-close" data-compare-close aria-label="Close compare view">×</button>
      </header>
      <div class="compare-modal-grid" data-cols="${picks.length}">
        ${picks.map(renderCompareCard).join("")}
      </div>
    </div>
  `;
  document.addEventListener("keydown", compareModalKeydownHandler);
}

function closeCompareModal() {
  if (!compareModalEl) return;
  compareModalEl.hidden = true;
  compareModalEl.innerHTML = "";
  document.removeEventListener("keydown", compareModalKeydownHandler);
}

function renderCompareCard(member) {
  const teams = memberOrgGroupKeys(member).map((k) => ORG_GROUP_LABEL_BY_KEY[k] || k).join(" · ") || "—";
  const skills = (member.skills || []).length
    ? (member.skills || []).map((s) => `<span class="compare-skill">${escapeHtml(s)}</span>`).join("")
    : `<span class="compare-empty">No skills listed</span>`;
  const sl = member.socialLinks || {};
  const links = [];
  if (sl.x) links.push(`<a href="${escapeHtml(sl.x)}" target="_blank" rel="noopener noreferrer">X</a>`);
  if (sl.github) links.push(`<a href="${escapeHtml(sl.github)}" target="_blank" rel="noopener noreferrer">GitHub</a>`);
  if (sl.linkedin) links.push(`<a href="${escapeHtml(sl.linkedin)}" target="_blank" rel="noopener noreferrer">LinkedIn</a>`);
  for (const sp of (member.spaces || []).filter(Boolean)) {
    links.push(`<a href="${escapeHtml(sp)}" target="_blank" rel="noopener noreferrer">Geo space</a>`);
  }
  return `
    <article class="compare-card" data-entity-id="${escapeHtml(member.entityId)}">
      <header class="compare-card-head">
        <div class="compare-card-avatar" style="background:${member.color}; box-shadow:0 0 28px ${member.color}33;">
          ${renderAvatar(member, "avatar-medium")}
        </div>
        <div class="compare-card-meta">
          <h3 class="compare-card-name">${escapeHtml(member.name)}</h3>
          <p class="compare-card-theme">${escapeHtml(member.theme || "—")}</p>
          <p class="compare-card-team">${escapeHtml(teams)}</p>
        </div>
      </header>
      <section class="compare-card-section">
        <p class="compare-card-section-title">Bio</p>
        <p class="compare-card-bio">${escapeHtml(member.description || "—")}</p>
      </section>
      <section class="compare-card-section">
        <p class="compare-card-section-title">Skills</p>
        <div class="compare-card-skills">${skills}</div>
      </section>
      <section class="compare-card-section">
        <p class="compare-card-section-title">Links</p>
        <div class="compare-card-links">${links.length ? links.join(" · ") : "—"}</div>
      </section>
    </article>
  `;
}

compareModalEl?.addEventListener("click", (event) => {
  if (event.target.closest("[data-compare-close]")) closeCompareModal();
});

/** ---------------- CSV export ---------------- */

function buildRosterCsv(list) {
  const headers = ["entityId", "name", "theme", "teams", "category", "skills", "description", "spaces", "x", "github", "linkedin"];
  const escapeField = (v) => {
    const s = String(v == null ? "" : v).replace(/"/g, '""');
    return /[",\n\r]/.test(s) ? `"${s}"` : s;
  };
  const rows = list.map((m) => {
    const badge = getPersonalBadge(m.entityId);
    const category = badge && BADGE_META[badge] ? BADGE_META[badge].label : "";
    return [
      m.entityId || "",
      m.name || "",
      m.theme || "",
      memberOrgGroupKeys(m).map((k) => ORG_GROUP_LABEL_BY_KEY[k] || k).join("; "),
      category,
      (m.skills || []).join("; "),
      m.description || "",
      (m.spaces || []).join(" "),
      m.socialLinks?.x || "",
      m.socialLinks?.github || "",
      m.socialLinks?.linkedin || "",
    ];
  });
  return [headers, ...rows].map((r) => r.map(escapeField).join(",")).join("\n");
}

document.querySelector("#export-csv-btn")?.addEventListener("click", () => {
  const list = visibleMembers();
  if (!list.length) return;
  /** UTF-8 BOM keeps Excel from mangling accented names. */
  const blob = new Blob(["﻿" + buildRosterCsv(list)], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  const date = new Date().toISOString().slice(0, 10);
  a.href = url;
  a.download = `geo-atlas-roster-${date}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
});

function onThemePillClick(event) {
  const button = event.target.closest("[data-theme]");
  if (!button) return;
  state.theme = button.dataset.theme;
  syncUI();
}

function onOrgGroupPillClick(event) {
  const button = event.target.closest("[data-org-group]");
  if (!button) return;
  state.orgGroup = button.dataset.orgGroup;
  syncUI();
}

if (spotlightThemeStrip) {
  spotlightThemeStrip.addEventListener("click", onThemePillClick);
}
if (galaxyThemePills) galaxyThemePills.addEventListener("click", onThemePillClick);

if (spotlightOrgStrip) spotlightOrgStrip.addEventListener("click", onOrgGroupPillClick);
if (galaxyOrgPills) galaxyOrgPills.addEventListener("click", onOrgGroupPillClick);

if (galaxyCardEl) {
  galaxyCardEl.addEventListener("click", (event) => {
    const tab = event.target.closest("[data-galaxy-view]");
    if (tab) {
      const mode = tab.dataset.galaxyView;
      if (mode && mode !== state.galaxyViewMode) {
        state.galaxyViewMode = mode;
        if (mode === "skills") state.skillGalaxy = "all";
        syncUI();
      }
      return;
    }
  });
}

if (galaxySkillPills) {
  galaxySkillPills.addEventListener("click", (event) => {
    const sk = event.target.closest("[data-skill-galaxy]");
    if (!sk || !galaxySkillPills.contains(sk)) return;
    event.stopPropagation();
    const pillKey = readSkillGalaxyPillKey(sk);
    state.skillGalaxy = pillKey;
    syncUI();
  });
}

if (spotlightFilters) {
  spotlightFilters.addEventListener("click", (event) => {
    const sortBtn = event.target.closest("[data-follower-sort]");
    if (sortBtn) {
      const dir = sortBtn.dataset.followerSort;
      state.followerSort = state.followerSort === dir ? "none" : dir;
      state.rosterPage = 1;
      refreshSpotlightUI();
      return;
    }
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
    if (zone === "skill") {
      const idx = gfGalaxySkillNodeHitIndex(x, y, now, width, height);
      const node = idx >= 0 ? galaxyFocus.skillNodes[idx] : null;
      if (node && !node.isMore) {
        const skillKey = String(node.name).trim().toLowerCase();
        if (skillKey) navigateToSkillGalaxyFilter(skillKey);
      }
      return;
    }
    if (zone === "hub") return;
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
    const compareBtn = event.target.closest("[data-compare-toggle]");
    if (compareBtn) {
      if (!compareBtn.disabled) toggleCompare(compareBtn.dataset.compareToggle);
      event.preventDefault();
      event.stopPropagation();
      return;
    }
    const skillBtn = event.target.closest("[data-skill-nav]");
    if (skillBtn && rosterGrid.contains(skillBtn)) {
      const raw = skillBtn.getAttribute("data-skill-nav");
      let key = "";
      if (raw && raw !== "all") {
        try {
          key = decodeURIComponent(raw);
        } catch {
          key = raw;
        }
      }
      if (key) {
        navigateToSkillGalaxyFilter(key);
        event.preventDefault();
        event.stopPropagation();
      }
      return;
    }
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
    const entityId = card.dataset.entityId;
    state.selectedId = entityId;
    const member =
      activeMembers().find((m) => m.entityId === entityId) ||
      uiMembers().find((m) => m.entityId === entityId) ||
      null;
    if (member && memberSkillsList(member).length > 0) {
      startGalaxyPersonFocus(member);
      return;
    }
    renderDetail(selectedMember(visibleMembers()));
    renderRoster(activeMembers());
  });
}

if (detailCard) {
  detailCard.addEventListener("click", (event) => {
    const skillBtn = event.target.closest("[data-skill-nav]");
    if (skillBtn && detailCard.contains(skillBtn)) {
      const raw = skillBtn.getAttribute("data-skill-nav");
      let key = "";
      if (raw && raw !== "all") {
        try {
          key = decodeURIComponent(raw);
        } catch {
          key = raw;
        }
      }
      if (key) {
        navigateToSkillGalaxyFilter(key);
        event.preventDefault();
      }
      return;
    }
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
