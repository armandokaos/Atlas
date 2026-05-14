#!/usr/bin/env node
/**
 * Fetches X follower counts for all community members and writes them back
 * into members-data.js as `xFollowers` on each member object.
 * Also bumps the members-data.js version in index.html automatically.
 *
 * Usage:
 *   node tools/fetch_x_followers.js
 *
 * Requires Node 16+. No npm dependencies.
 * X_BEARER_TOKEN is read from .env or from the environment directly.
 */

'use strict';

const fs = require('fs');
const path = require('path');
const https = require('https');

const ROOT = path.join(__dirname, '..');
const MEMBERS_DATA_PATH = path.join(ROOT, 'members-data.js');
const INDEX_HTML_PATH = path.join(ROOT, 'index.html');
const BATCH_SIZE = 100;
const BATCH_DELAY_MS = 1500;

// ── .env loader (no dotenv dependency) ──────────────────────────────────────

function loadEnv() {
  const p = path.join(ROOT, '.env');
  if (!fs.existsSync(p)) return;
  for (const line of fs.readFileSync(p, 'utf8').split('\n')) {
    const t = line.trim();
    if (!t || t.startsWith('#')) continue;
    const eq = t.indexOf('=');
    if (eq < 0) continue;
    const key = t.slice(0, eq).trim();
    const val = t.slice(eq + 1).trim().replace(/^["']|["']$/g, '');
    if (key && !(key in process.env)) process.env[key] = val;
  }
}

// ── X username extraction ────────────────────────────────────────────────────

function usernameFromXUrl(raw) {
  if (!raw) return null;
  const s = String(raw).trim();
  try {
    const url = new URL(s.startsWith('http') ? s : `https://${s}`);
    if (!['x.com', 'www.x.com', 'twitter.com', 'www.twitter.com'].includes(url.hostname)) return null;
    // handle both /username and /@username
    const m = url.pathname.replace(/^\/+/, '').match(/^@?([A-Za-z0-9_]{1,15})(?:[/?#].*)?$/);
    return m ? m[1] : null;
  } catch {
    return null;
  }
}

// ── X API v2 call ────────────────────────────────────────────────────────────

function httpsGet(url, headers) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers }, (res) => {
      let body = '';
      res.on('data', (c) => (body += c));
      res.on('end', () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(body) }); }
        catch (e) { reject(new Error(`Parse error: ${body.slice(0, 300)}`)); }
      });
    }).on('error', reject);
  });
}

async function fetchBatch(usernames, token) {
  const url = `https://api.twitter.com/2/users/by?usernames=${encodeURIComponent(usernames.join(','))}&user.fields=public_metrics`;
  const { status, body } = await httpsGet(url, {
    Authorization: `Bearer ${token}`,
    'User-Agent': 'GeoAtlasFetcher/1.0',
  });
  if (status !== 200) throw new Error(`HTTP ${status}: ${JSON.stringify(body).slice(0, 300)}`);
  const counts = {};
  const statuses = {};
  for (const user of body.data || []) {
    counts[user.username.toLowerCase()] = user.public_metrics.followers_count;
  }
  for (const err of body.errors || []) {
    const uname = String(err.value || '').toLowerCase();
    if (!uname) continue;
    if (err.type?.includes('not-authorized')) {
      statuses[uname] = 'suspended';
    } else if (err.type?.includes('resource-not-found')) {
      statuses[uname] = 'deleted';
    }
    if (err.detail) console.warn(`  ! ${err.detail}`);
  }
  return { counts, statuses };
}

function sleep(ms) { return new Promise((r) => setTimeout(r, ms)); }

// ── index.html version bump ───────────────────────────────────────────────────

function bumpMembersDataVersion() {
  const html = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const next = html.replace(/(members-data\.js\?v=)(\d+)/, (_, pre, v) => `${pre}${+v + 1}`);
  if (next !== html) {
    fs.writeFileSync(INDEX_HTML_PATH, next);
    const m = next.match(/members-data\.js\?v=(\d+)/);
    console.log(`  index.html: members-data.js?v=${m[1]}`);
  }
}

// ── main ─────────────────────────────────────────────────────────────────────

async function main() {
  loadEnv();
  const token = process.env.X_BEARER_TOKEN;
  if (!token) {
    console.error('Error: X_BEARER_TOKEN not set. Add it to .env');
    process.exit(1);
  }

  const raw = fs.readFileSync(MEMBERS_DATA_PATH, 'utf8');
  const data = JSON.parse(raw.replace(/^window\.GEO_CURATORS_DATA\s*=\s*/, '').replace(/;\s*$/, ''));

  // Build username → member indices map; clear any stale xFollowers and xStatus
  const byUsername = new Map();
  for (let i = 0; i < data.members.length; i++) {
    const m = data.members[i];
    const username = usernameFromXUrl(m.socialLinks?.x);
    delete data.members[i].xFollowers;
    delete data.members[i].xStatus;
    if (!username) continue;
    const key = username.toLowerCase();
    if (!byUsername.has(key)) byUsername.set(key, []);
    byUsername.get(key).push(i);
  }

  const allUsernames = [...byUsername.keys()];
  console.log(`\nGeo Atlas — X follower fetch`);
  console.log(`Members: ${data.members.length} total | ${allUsernames.length} with valid X username\n`);

  let updated = 0;
  let notFound = 0;
  const batches = Math.ceil(allUsernames.length / BATCH_SIZE);

  for (let b = 0; b < batches; b++) {
    const batch = allUsernames.slice(b * BATCH_SIZE, (b + 1) * BATCH_SIZE);
    process.stdout.write(`Batch ${b + 1}/${batches} (${batch.length} users)... `);
    try {
      const { counts, statuses } = await fetchBatch(batch, token);
      let n = 0;
      for (const [uname, followers] of Object.entries(counts)) {
        for (const idx of byUsername.get(uname) || []) {
          data.members[idx].xFollowers = followers;
          n++;
          updated++;
        }
      }
      for (const [uname, status] of Object.entries(statuses)) {
        for (const idx of byUsername.get(uname) || []) {
          data.members[idx].xStatus = status;
          notFound++;
        }
      }
      const marked = Object.keys(statuses).length;
      console.log(`✓ ${n} updated${marked ? ` (${marked} suspended/deleted)` : ''}`);
    } catch (err) {
      console.log(`✗ ${err.message}`);
      notFound += batch.length;
    }
    if (b < batches - 1) await sleep(BATCH_DELAY_MS);
  }

  data.summary = data.summary || {};
  data.summary.xFollowersFetchedAt = new Date().toISOString().slice(0, 10);

  fs.writeFileSync(MEMBERS_DATA_PATH, `window.GEO_CURATORS_DATA = ${JSON.stringify(data)};`);
  bumpMembersDataVersion();

  console.log(`\n✓ Done: ${updated} updated, ${notFound} not found/invalid`);
  console.log('  members-data.js written');
}

main().catch((err) => {
  console.error('\nFatal:', err.message);
  process.exit(1);
});
