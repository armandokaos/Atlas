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
  "Farouk",
];

/**
 * Org / team buckets. A person may appear in several `names` arrays (same `member.name` string); all apply.
 * Names must match `member.name` in `members-data`.
 */
const ORG_GROUP_RAW_SPECS = [
  {
    key: "geo-core",
    label: "Geo core team",
    names: [
      "Yaniv Tal",
      "Preston Mantel",
      "Nate",
      "Nik",
      "Adam Fischer",
      "Hugues de Braucourt",
      "Byron",
      "Matt Haynes",
      "Jagger",
      "Arturas Vil",
    ],
  },
  {
    key: "geo-content",
    label: "Geo content team",
    names: [
      "Bertrand Armando",
      "CptMoh",
      "Vytautas",
      "Hashir",
      "Rushab Taneja",
      "Ahmed Abdelmalek",
      "Dan Cordie",
      "Mantas Siukstas",
      "Catalin",
      "Dovile Sv",
      "Arturas Vil",
    ],
  },
  { key: "geo-dev", label: "Geo core devs", names: ["Walaa01", "Rex"] },
  {
    key: "curators-elite",
    label: "Curators Elite",
    names: [],
  },
  { key: "curators-green", label: "Curators green", names: [] },
  { key: "curators-orange", label: "Curators Orange", names: [] },
  { key: "curators-yellow", label: "Curators yellow", names: [] },
  { key: "curators-grey", label: "Curators grey", names: [] },
];

const ORG_GROUP_SPECS = ORG_GROUP_RAW_SPECS.map((row) => ({
  key: row.key,
  label: row.label,
  names: new Set(row.names.map((name) => String(name || "").trim().toLowerCase())),
}));

const ORG_GROUP_LABEL_BY_KEY = {
  ...Object.fromEntries(ORG_GROUP_RAW_SPECS.map((r) => [r.key, r.label])),
  curators: "Curators",
};

const ORG_GROUP_PILL_ORDER = [
  "all",
  "geo-core",
  "geo-content",
  "geo-dev",
  "curators-elite",
  "curators-green",
  "curators-orange",
  "curators-yellow",
  "curators-grey",
  /** Default bucket: not in named geo teams and no badge mapped to a curator color (incl. blue/purple/black tags). */
  "curators",
];

const ORG_GROUP_DOT_COLORS = {
  "geo-core": "#0ea5e9",
  "geo-content": "#8b5cf6",
  "geo-dev": "#6366f1",
  "curators-elite": "#db2777",
  "curators-green": "#16a34a",
  "curators-orange": "#ea580c",
  "curators-yellow": "#ca8a04",
  "curators-grey": "#6b7280",
  curators: "#64748b",
};

const BADGE_TO_ORG_GROUP = {
  green: "curators-green",
  red: "curators-orange",
  yellow: "curators-yellow",
  pink: "curators-elite",
  orange: "curators-grey",
};


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


const PERSONAL_STORAGE_KEY = "geoAtlas.personalMarks.v1";
const DEFAULT_MARKS_JSON_URLS = [
  "./geo-atlas-marks-2026-04-21-1.json?v=2",
  "./geo-atlas-marks-2026-04-21-2.json?v=2",
];
const BADGE_KEYS = ["blue", "purple", "pink", "red", "green", "yellow", "orange", "black"];
const BADGE_META = {
  blue: { label: "Core team", hex: "#2563eb" },
  purple: { label: "Content team", hex: "#9333ea" },
  pink: { label: "Curators elite", hex: "#db2777" },
  red: { label: "Curators Orange", hex: "#ea580c" },
  /** Green/yellow renamed to Active/Inactive per atlas-priority.md (temporary categorization solution). */
  green: { label: "Curators Active", hex: "#007a3f" },
  yellow: { label: "Curators Inactive", hex: "#fff3c2" },
  orange: { label: "Curators grey", hex: "#6b7280" },
  black: { label: "Hidden", hex: "#171717" },
};


function escapeHtml(str) {
  return String(str ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

