// scripts/updateBanners.js
// Run: node scripts/updateBanners.js
// Run with debug output: node scripts/updateBanners.js --verbose
// Deps: npm install axios cheerio

import axios from 'axios';
import * as cheerio from 'cheerio';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUTPUT = path.join(__dirname, '..', 'banners.json');
const VERBOSE = process.argv.includes('--verbose');

// ─── Shared browser-like headers (required — GitHub Actions IPs get blocked without these) ───
const BROWSER_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Accept': 'application/json, text/plain, */*',
  'Accept-Language': 'zh-CN,zh;q=0.9',
};

function log(...args) { if (VERBOSE) console.log(...args); }

// ─── Quill delta text extractor ──────────────────────────────────────
// HoYoLAB post content is Quill.js delta JSON: {"ops":[{"insert":"..."}, ...]}
// Plain cheerio.load() + $.text() returns garbled JSON — this fixes it.
function extractTextFromContent(raw) {
  if (!raw) return '';
  try {
    const parsed = JSON.parse(raw);
    if (parsed?.ops) {
      // Quill delta: collect all insert strings
      return parsed.ops
        .map(op => (typeof op.insert === 'string' ? op.insert : ''))
        .join('');
    }
  } catch (_) { /* not JSON — fall through to HTML path */ }
  // Plain HTML content fallback
  const $ = cheerio.load(raw);
  return $.text();
}

// ─── Time parsing helpers ────────────────────────────────────────────
// Returns { start, end } in YYYY-MM-DD, or null if no match found.

function parseGenshinTime(text) {
  // "2026/03/01 18:00:00 ~ 2026/03/17 14:59:59"
  const m = text.match(/(\d{4})\/(\d{2})\/(\d{2})\s+[\d:]+\s*[~～至\-–]+\s*(\d{4})\/(\d{2})\/(\d{2})/);
  if (!m) return null;
  return { start: `${m[1]}-${m[2]}-${m[3]}`, end: `${m[4]}-${m[5]}-${m[6]}` };
}

function parseZZZTime(text) {
  // "2026年3月1日 18:00 - 3月17日 14:59"
  const m = text.match(/(\d{4})年(\d{1,2})月(\d{1,2})日.{0,30}?(\d{1,2})月(\d{1,2})日/);
  if (!m) return null;
  const pad = n => String(n).padStart(2, '0');
  return {
    start: `${m[1]}-${pad(m[2])}-${pad(m[3])}`,
    end:   `${m[1]}-${pad(m[4])}-${pad(m[5])}`
  };
}

function parseWWTime(text) {
  // "2026-03-01 18:00至2026-03-17 14:59" or with ~ or –
  const m = text.match(/(\d{4}-\d{2}-\d{2})\s*[\d:]*\s*[至~～\-–]+\s*(\d{4}-\d{2}-\d{2})/);
  if (!m) return null;
  return { start: m[1], end: m[2] };
}

function parseAKTime(text) {
  // "2026/03/01 - 2026/03/12" or "2026-03-01 ~ 2026-03-12"
  const m = text.match(/(\d{4})[\/\-](\d{2})[\/\-](\d{2}).{0,20}?(\d{4})[\/\-](\d{2})[\/\-](\d{2})/);
  if (!m) return null;
  return { start: `${m[1]}-${m[2]}-${m[3]}`, end: `${m[4]}-${m[5]}-${m[6]}` };
}

// ─── Per-game scrapers ───────────────────────────────────────────────

async function parseGenshin() {
  const results = [];
  try {
    // gids=2 = Genshin Impact on HoYoLAB
    const apiUrl = 'https://bbs-api-os.hoyolab.com/community/post/wapi/getNewsList?gids=2&page_size=20&type=1';
    log('[GI] Fetching post list...');
    const res = await axios.get(apiUrl, {
      headers: { ...BROWSER_HEADERS, 'Referer': 'https://www.hoyolab.com/' },
      timeout: 15000
    });

    const posts = res.data?.data?.list || [];
    log(`[GI] Got ${posts.length} posts`);

    for (const post of posts) {
      const title = post.post?.subject || '';
      const isBanner = title.includes('祈愿') || (title.includes('角色') && title.includes('武器'));
      const isEvent  = title.includes('活动') || title.includes('限时');
      if (!isBanner && !isEvent) { log(`[GI] Skip: "${title}"`); continue; }

      const pid = post.post?.post_id;
      log(`[GI] Fetching detail for post ${pid}: "${title}"`);

      const detail = await axios.get(
        `https://bbs-api-os.hoyolab.com/community/post/wapi/getPostFull?post_id=${pid}`,
        { headers: { ...BROWSER_HEADERS, 'Referer': 'https://www.hoyolab.com/' }, timeout: 15000 }
      );

      // FIX: content is Quill delta JSON, not HTML — use extractTextFromContent()
      const rawContent = detail.data?.data?.post?.post?.content || '';
      const text = extractTextFromContent(rawContent);
      log(`[GI] Extracted text snippet: "${text.slice(0, 120).replace(/\n/g, ' ')}"`);

      const time = parseGenshinTime(text);
      if (!time) { console.warn(`[GI] ⚠️  No date found in "${title}" — text: "${text.slice(0, 200)}"`); continue; }

      results.push({
        id:      `auto_gi_${pid}`,
        name:    `${isBanner ? '🎴' : '🎯'} ${title}`,
        date:    time.end,
        type:    isBanner ? 'banner' : 'event',
        auto:    true,
        desc:    '',
        rewards: []
      });
      log(`[GI] ✅ Added: "${title}" → ends ${time.end}`);
    }
  } catch (e) {
    console.warn(`[GI] ❌ Scrape failed: ${e.message}`);
    if (VERBOSE && e.response) {
      console.warn(`[GI]    Status: ${e.response.status}`);
      console.warn(`[GI]    Body:`, JSON.stringify(e.response.data).slice(0, 300));
    }
  }
  return results;
}

async function parseZZZ() {
  const results = [];
  try {
    // gids=8 = Zenless Zone Zero on HoYoLAB
    const apiUrl = 'https://bbs-api-os.hoyolab.com/community/post/wapi/getNewsList?gids=8&page_size=20&type=1';
    log('[ZZZ] Fetching post list...');
    const res = await axios.get(apiUrl, {
      headers: { ...BROWSER_HEADERS, 'Referer': 'https://www.hoyolab.com/' },
      timeout: 15000
    });

    const posts = res.data?.data?.list || [];
    log(`[ZZZ] Got ${posts.length} posts`);

    for (const post of posts) {
      const title = post.post?.subject || '';
      const isBanner = title.includes('调频') || title.includes('代理人');
      const isEvent  = title.includes('活动') || title.includes('限时');
      if (!isBanner && !isEvent) { log(`[ZZZ] Skip: "${title}"`); continue; }

      const pid = post.post?.post_id;
      log(`[ZZZ] Fetching detail for post ${pid}: "${title}"`);

      const detail = await axios.get(
        `https://bbs-api-os.hoyolab.com/community/post/wapi/getPostFull?post_id=${pid}`,
        { headers: { ...BROWSER_HEADERS, 'Referer': 'https://www.hoyolab.com/' }, timeout: 15000 }
      );

      // FIX: Quill delta parsing
      const rawContent = detail.data?.data?.post?.post?.content || '';
      const text = extractTextFromContent(rawContent);
      log(`[ZZZ] Extracted text snippet: "${text.slice(0, 120).replace(/\n/g, ' ')}"`);

      const time = parseZZZTime(text) || parseGenshinTime(text);
      if (!time) { console.warn(`[ZZZ] ⚠️  No date found in "${title}" — text: "${text.slice(0, 200)}"`); continue; }

      results.push({
        id:      `auto_zzz_${pid}`,
        name:    `${isBanner ? '🎴' : '🎯'} ${title}`,
        date:    time.end,
        type:    isBanner ? 'banner' : 'event',
        auto:    true,
        desc:    '',
        rewards: []
      });
      log(`[ZZZ] ✅ Added: "${title}" → ends ${time.end}`);
    }
  } catch (e) {
    console.warn(`[ZZZ] ❌ Scrape failed: ${e.message}`);
    if (VERBOSE && e.response) {
      console.warn(`[ZZZ]    Status: ${e.response.status}`);
      console.warn(`[ZZZ]    Body:`, JSON.stringify(e.response.data).slice(0, 300));
    }
  }
  return results;
}

async function parseWW() {
  const results = [];
  try {
    // FIX: correct host is api.kurogames.com, not ak.kurogames.com
    // type=2 = announcements/events; gameId=3 = Wuthering Waves
    const url = 'https://api.kurogames.com/website/news-list?gameId=3&typeId=2&page=1&pageSize=10';
    log('[WW] Fetching post list...');
    const res = await axios.get(url, {
      headers: { ...BROWSER_HEADERS, 'Referer': 'https://wutheringwaves.kurogames.com/' },
      timeout: 15000
    });

    log(`[WW] Response keys:`, Object.keys(res.data || {}));
    const list = res.data?.data?.list || res.data?.list || [];
    log(`[WW] Got ${list.length} items`);

    for (const item of list) {
      const title = item.title || '';
      const isBanner = title.includes('唤取') || title.includes('共鸣者');
      const isEvent  = title.includes('活动') || title.includes('限时');
      if (!isBanner && !isEvent) { log(`[WW] Skip: "${title}"`); continue; }

      // Try to get end date from article content
      const articleUrl = `https://api.kurogames.com/website/news-detail?id=${item.id}`;
      log(`[WW] Fetching article ${item.id}: "${title}"`);
      const detail = await axios.get(articleUrl, {
        headers: { ...BROWSER_HEADERS, 'Referer': 'https://wutheringwaves.kurogames.com/' },
        timeout: 15000
      });

      const rawContent = detail.data?.data?.content || '';
      const text = extractTextFromContent(rawContent);
      log(`[WW] Extracted text snippet: "${text.slice(0, 120).replace(/\n/g, ' ')}"`);

      const time = parseWWTime(text) || parseGenshinTime(text);
      if (!time) { console.warn(`[WW] ⚠️  No date found in "${title}" — text: "${text.slice(0, 200)}"`); continue; }

      results.push({
        id:      `auto_ww_${item.id}`,
        name:    `${isBanner ? '🎴' : '🌟'} ${title}`,
        date:    time.end,
        type:    isBanner ? 'banner' : 'event',
        auto:    true,
        desc:    '',
        rewards: []
      });
      log(`[WW] ✅ Added: "${title}" → ends ${time.end}`);
    }
  } catch (e) {
    console.warn(`[WW] ❌ Scrape failed: ${e.message}`);
    if (VERBOSE && e.response) {
      console.warn(`[WW]    Status: ${e.response.status}`);
      console.warn(`[WW]    Body:`, JSON.stringify(e.response.data).slice(0, 300));
    }
  }
  return results;
}

async function parseAK() {
  const results = [];
  try {
    // FIX: Arknights Endfield official site news API (CN server)
    // The news list page returns structured data with title + time ranges
    const url = 'https://ak.hypergryph.com/archive/news';
    log('[AK] Fetching news page...');
    const res = await axios.get(url, {
      headers: { ...BROWSER_HEADERS, 'Referer': 'https://ak.hypergryph.com/' },
      timeout: 15000
    });

    log(`[AK] Response status: ${res.status}, content length: ${String(res.data).length}`);

    // This is an HTML page — scrape it with cheerio
    const $ = cheerio.load(res.data);

    // Endfield news items are typically in article/li elements with title + date
    const items = [];
    $('a[href*="/archive/"]').each((_, el) => {
      const href = $(el).attr('href') || '';
      const title = $(el).text().trim() || $(el).find('h3,h4,.title').text().trim();
      if (title && (title.includes('活动') || title.includes('寻访') || title.includes('干员'))) {
        items.push({ href, title });
      }
    });
    log(`[AK] Found ${items.length} candidate articles`);

    for (const item of items.slice(0, 10)) {
      const fullUrl = item.href.startsWith('http') ? item.href : `https://ak.hypergryph.com${item.href}`;
      log(`[AK] Fetching article: "${item.title}"`);
      const detail = await axios.get(fullUrl, {
        headers: { ...BROWSER_HEADERS },
        timeout: 15000
      });
      const $d = cheerio.load(detail.data);
      const text = $d.text();
      const time = parseAKTime(text);
      if (!time) { console.warn(`[AK] ⚠️  No date found in "${item.title}"`); continue; }

      const isBanner = item.title.includes('寻访') || item.title.includes('干员');
      results.push({
        id:      `auto_ak_${encodeURIComponent(item.href).slice(-12)}`,
        name:    `${isBanner ? '🎴' : '🧩'} ${item.title}`,
        date:    time.end,
        type:    isBanner ? 'banner' : 'event',
        auto:    true,
        desc:    '',
        rewards: []
      });
      log(`[AK] ✅ Added: "${item.title}" → ends ${time.end}`);
    }
  } catch (e) {
    console.warn(`[AK] ❌ Scrape failed: ${e.message}`);
    if (VERBOSE && e.response) {
      console.warn(`[AK]    Status: ${e.response.status}`);
      console.warn(`[AK]    Body:`, String(e.response.data).slice(0, 300));
    }
  }
  return results;
}

// ─── Main ────────────────────────────────────────────────────────────

async function main() {
  console.log('🔄 Fetching banner/event data...');
  if (VERBOSE) console.log('   (verbose mode on)');

  const [gi, zzz, ww, ak] = await Promise.all([
    parseGenshin(),
    parseZZZ(),
    parseWW(),
    parseAK()
  ]);

  console.log(`📊 Results — GI:${gi.length} ZZZ:${zzz.length} WW:${ww.length} AK:${ak.length}`);

  // Filter out already-expired entries
  const today = new Date().toISOString().split('T')[0];
  const filterExpired = arr => arr.filter(e => e.date >= today);

  const data = {
    _meta: {
      updated: today,
      note: 'Auto-generated by updateBanners.js — do not edit manually'
    },
    gi:  filterExpired(gi),
    zzz: filterExpired(zzz),
    ww:  filterExpired(ww),
    ak:  filterExpired(ak),
  };

  const totalItems = gi.length + zzz.length + ww.length + ak.length;
  if (totalItems === 0) {
    console.warn('⚠️  All scrapers returned 0 results — NOT overwriting banners.json');
    console.warn('   Run with --verbose to see detailed failure reasons.');
    process.exit(0);
  }

  fs.writeFileSync(OUTPUT, JSON.stringify(data, null, 2), 'utf-8');
  console.log(`✅ banners.json written.`);
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(0);
});
