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

// ─── Shared browser-like headers ───
const BROWSER_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Accept': 'application/json, text/plain, */*',
  'Accept-Language': 'zh-CN,zh;q=0.9',
};

function log(...args) { if (VERBOSE) console.log(...args); }

// ─── Quill delta text extractor ───
function extractTextFromContent(raw) {
  if (!raw) return '';
  try {
    const parsed = JSON.parse(raw);
    if (parsed?.ops) {
      return parsed.ops
        .map(op => (typeof op.insert === 'string' ? op.insert : ''))
        .join('');
    }
  } catch (_) { /* fall through to HTML */ }
  const $ = cheerio.load(raw);
  return $.text();
}

// ─── Relaxed Time parsing helpers ───
function parseGenshinTime(text) {
  // Matches 2026/03/01, 2026/3/1, 2026.03.01, 2026-03-01
  const m = text.match(/(\d{4})[\/\.\-](\d{1,2})[\/\.\-](\d{1,2})\s*[\d:]*\s*[~～至\-–]+\s*(\d{4})[\/\.\-](\d{1,2})[\/\.\-](\d{1,2})/);
  if (!m) return null;
  const pad = n => String(n).padStart(2, '0');
  return { start: `${m[1]}-${pad(m[2])}-${pad(m[3])}`, end: `${m[4]}-${pad(m[5])}-${pad(m[6])}` };
}

function parseZZZTime(text) {
  const m = text.match(/(\d{4})年(\d{1,2})月(\d{1,2})日.{0,30}?(\d{1,2})月(\d{1,2})日/);
  if (!m) return null;
  const pad = n => String(n).padStart(2, '0');
  return {
    start: `${m[1]}-${pad(m[2])}-${pad(m[3])}`,
    end:   `${m[1]}-${pad(m[4])}-${pad(m[5])}`
  };
}

function parseWWTime(text) {
  const m = text.match(/(\d{4})[\/\.\-](\d{1,2})[\/\.\-](\d{1,2})\s*[\d:]*\s*[至~～\-–]+\s*(\d{4})[\/\.\-](\d{1,2})[\/\.\-](\d{1,2})/);
  if (!m) return null;
  const pad = n => String(n).padStart(2, '0');
  return { start: `${m[1]}-${pad(m[2])}-${pad(m[3])}`, end: `${m[4]}-${pad(m[5])}-${pad(m[6])}` };
}

function parseAKTime(text) {
  const m = text.match(/(\d{4})[\/\.\-](\d{1,2})[\/\.\-](\d{1,2}).{0,20}?(\d{4})[\/\.\-](\d{1,2})[\/\.\-](\d{1,2})/);
  if (!m) return null;
  const pad = n => String(n).padStart(2, '0');
  return { start: `${m[1]}-${pad(m[2])}-${pad(m[3])}`, end: `${m[4]}-${pad(m[5])}-${pad(m[6])}` };
}

// ─── Per-game scrapers ───
async function parseGenshin() {
  const results = [];
  try {
    const apiUrl = 'https://bbs-api-os.hoyolab.com/community/post/wapi/getNewsList?gids=2&page_size=20&type=1';
    log('[GI] Fetching post list...');
    const res = await axios.get(apiUrl, { headers: { ...BROWSER_HEADERS, 'Referer': 'https://www.hoyolab.com/' }, timeout: 15000 });
    const posts = res.data?.data?.list || [];
    log(`[GI] Got ${posts.length} posts`);

    for (const post of posts) {
      const title = post.post?.subject || '';
      const isBanner = title.includes('祈愿') || (title.includes('角色') && title.includes('武器'));
      const isEvent  = title.includes('活动') || title.includes('限时');
      if (!isBanner && !isEvent) continue;

      const pid = post.post?.post_id;
      const detail = await axios.get(`https://bbs-api-os.hoyolab.com/community/post/wapi/getPostFull?post_id=${pid}`, { headers: { ...BROWSER_HEADERS, 'Referer': 'https://www.hoyolab.com/' }, timeout: 15000 });
      const text = extractTextFromContent(detail.data?.data?.post?.post?.content || '');
      const time = parseGenshinTime(text);
      if (!time) { console.warn(`[GI] ⚠️ No date found in "${title}"`); continue; }

      results.push({
        id: `auto_gi_${pid}`,
        name: `${isBanner ? '🎴' : '🎯'} ${title}`,
        date: time.end, type: isBanner ? 'banner' : 'event', auto: true
      });
      log(`[GI] ✅ Added: "${title}"`);
    }
  } catch (e) { console.warn(`[GI] ❌ Scrape failed: ${e.message}`); }
  return results;
}

async function parseZZZ() {
  const results = [];
  try {
    const apiUrl = 'https://bbs-api-os.hoyolab.com/community/post/wapi/getNewsList?gids=8&page_size=20&type=1';
    log('[ZZZ] Fetching post list...');
    const res = await axios.get(apiUrl, { headers: { ...BROWSER_HEADERS, 'Referer': 'https://www.hoyolab.com/' }, timeout: 15000 });
    const posts = res.data?.data?.list || [];
    log(`[ZZZ] Got ${posts.length} posts`);

    for (const post of posts) {
      const title = post.post?.subject || '';
      const isBanner = title.includes('调频') || title.includes('代理人');
      const isEvent  = title.includes('活动') || title.includes('限时');
      if (!isBanner && !isEvent) continue;

      const pid = post.post?.post_id;
      const detail = await axios.get(`https://bbs-api-os.hoyolab.com/community/post/wapi/getPostFull?post_id=${pid}`, { headers: { ...BROWSER_HEADERS, 'Referer': 'https://www.hoyolab.com/' }, timeout: 15000 });
      const text = extractTextFromContent(detail.data?.data?.post?.post?.content || '');
      const time = parseZZZTime(text) || parseGenshinTime(text);
      if (!time) { console.warn(`[ZZZ] ⚠️ No date found in "${title}"`); continue; }

      results.push({
        id: `auto_zzz_${pid}`,
        name: `${isBanner ? '🎴' : '🎯'} ${title}`,
        date: time.end, type: isBanner ? 'banner' : 'event', auto: true
      });
      log(`[ZZZ] ✅ Added: "${title}"`);
    }
  } catch (e) { console.warn(`[ZZZ] ❌ Scrape failed: ${e.message}`); }
  return results;
}

async function parseWW() {
  const results = [];
  try {
    const url = 'https://api.kurogames.com/website/news-list?gameId=3&typeId=2&page=1&pageSize=10';
    log('[WW] Fetching post list...');
    const res = await axios.get(url, { headers: { ...BROWSER_HEADERS, 'Referer': 'https://wutheringwaves.kurogames.com/' }, timeout: 15000 });
    const list = res.data?.data?.list || res.data?.list || [];
    log(`[WW] Got ${list.length} items`);

    for (const item of list) {
      const title = item.title || '';
      const isBanner = title.includes('唤取') || title.includes('共鸣者');
      const isEvent  = title.includes('活动') || title.includes('限时');
      if (!isBanner && !isEvent) continue;

      const articleUrl = `https://api.kurogames.com/website/news-detail?id=${item.id}`;
      const detail = await axios.get(articleUrl, { headers: { ...BROWSER_HEADERS, 'Referer': 'https://wutheringwaves.kurogames.com/' }, timeout: 15000 });
      const text = extractTextFromContent(detail.data?.data?.content || '');
      const time = parseWWTime(text) || parseGenshinTime(text);
      if (!time) { console.warn(`[WW] ⚠️ No date found in "${title}"`); continue; }

      results.push({
        id: `auto_ww_${item.id}`,
        name: `${isBanner ? '🎴' : '🌟'} ${title}`,
        date: time.end, type: isBanner ? 'banner' : 'event', auto: true
      });
      log(`[WW] ✅ Added: "${title}"`);
    }
  } catch (e) { console.warn(`[WW] ❌ Scrape failed: ${e.message}`); }
  return results;
}

async function parseAK() {
  const results = [];
  try {
    const url = 'https://ak.hypergryph.com/archive/news';
    log('[AK] Fetching news page...');
    const res = await axios.get(url, { headers: { ...BROWSER_HEADERS, 'Referer': 'https://ak.hypergryph.com/' }, timeout: 15000 });
    const $ = cheerio.load(res.data);
    const items = [];
    $('a[href*="/archive/"]').each((_, el) => {
      const href = $(el).attr('href') || '';
      const title = $(el).text().trim() || $(el).find('h3,h4,.title').text().trim();
      if (title && (title.includes('活动') || title.includes('寻访') || title.includes('干员'))) items.push({ href, title });
    });
    log(`[AK] Found ${items.length} candidate articles`);

    for (const item of items.slice(0, 10)) {
      const fullUrl = item.href.startsWith('http') ? item.href : `https://ak.hypergryph.com${item.href}`;
      const detail = await axios.get(fullUrl, { headers: { ...BROWSER_HEADERS }, timeout: 15000 });
      const text = cheerio.load(detail.data).text();
      const time = parseAKTime(text);
      if (!time) { console.warn(`[AK] ⚠️ No date found in "${item.title}"`); continue; }

      const isBanner = item.title.includes('寻访') || item.title.includes('干员');
      results.push({
        id: `auto_ak_${encodeURIComponent(item.href).slice(-12)}`,
        name: `${isBanner ? '🎴' : '🧩'} ${item.title}`,
        date: time.end, type: isBanner ? 'banner' : 'event', auto: true
      });
      log(`[AK] ✅ Added: "${item.title}"`);
    }
  } catch (e) { console.warn(`[AK] ❌ Scrape failed: ${e.message}`); }
  return results;
}

// ─── Main ───
async function main() {
  console.log('🔄 Fetching banner/event data...');
  if (VERBOSE) console.log('   (verbose mode on)');

  const [gi, zzz, ww, ak] = await Promise.all([ parseGenshin(), parseZZZ(), parseWW(), parseAK() ]);

  console.log(`📊 Results — GI:${gi.length} ZZZ:${zzz.length} WW:${ww.length} AK:${ak.length}`);

  const today = new Date().toISOString().split('T')[0];
  
  // NOTE: Expiration filtering is temporarily DISABLED for debugging
  // const filterExpired = arr => arr.filter(e => e.date >= today);

  const data = {
    _meta: {
      updated: today,
      note: 'Auto-generated by updateBanners.js — do not edit manually'
    },
    gi: gi,
    zzz: zzz,
    ww: ww,
    ak: ak,
  };

  const totalItems = gi.length + zzz.length + ww.length + ak.length;
  if (totalItems === 0) {
    console.warn('⚠️  All scrapers returned 0 results — NOT overwriting banners.json');
    console.warn('   Run with --verbose to see detailed failure reasons.');
    process.exit(1); // FIX: Fails the Github Action so it turns RED instead of Green
  }

  fs.writeFileSync(OUTPUT, JSON.stringify(data, null, 2), 'utf-8');
  console.log(`✅ banners.json written.`);
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
