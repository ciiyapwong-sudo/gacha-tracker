// scripts/updateBanners.js
import axios from 'axios';
import * as cheerio from 'cheerio';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUTPUT = path.join(__dirname, '..', 'banners.json');
const VERBOSE = process.argv.includes('--verbose');

const BROWSER_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Accept': 'application/json, text/plain, */*',
  'Accept-Language': 'zh-CN,zh;q=0.9',
};

function log(...args) { if (VERBOSE) console.log(...args); }

function extractTextFromContent(raw) {
  if (!raw) return '';
  try {
    const parsed = JSON.parse(raw);
    if (parsed?.ops) {
      return parsed.ops.map(op => (typeof op.insert === 'string' ? op.insert : '')).join('');
    }
  } catch (_) {}
  const $ = cheerio.load(raw);
  return $.text();
}

function parseGenshinTime(text) {
  const m = text.match(/(\d{4})[\/\.\-](\d{1,2})[\/\.\-](\d{1,2})\s*[\d:]*\s*[~～至\-–]+\s*(\d{4})[\/\.\-](\d{1,2})[\/\.\-](\d{1,2})/);
  if (!m) return null;
  const pad = n => String(n).padStart(2, '0');
  return { start: `${m[1]}-${pad(m[2])}-${pad(m[3])}`, end: `${m[4]}-${pad(m[5])}-${pad(m[6])}` };
}

function parseZZZTime(text) {
  const m = text.match(/(\d{4})年(\d{1,2})月(\d{1,2})日.{0,30}?(\d{1,2})月(\d{1,2})日/);
  if (!m) return null;
  const pad = n => String(n).padStart(2, '0');
  return { start: `${m[1]}-${pad(m[2])}-${pad(m[3])}`, end:   `${m[1]}-${pad(m[4])}-${pad(m[5])}` };
}

// ─── Per-game scrapers ───

async function parseGenshin() {
  const results = [];
  try {
    // FIX: Changed page_size to 50, and type to 2 (Notices/Events)
    const apiUrl = 'https://bbs-api-os.hoyolab.com/community/post/wapi/getNewsList?gids=2&page_size=50&type=2';
    log('[GI] Fetching post list...');
    const res = await axios.get(apiUrl, { headers: { ...BROWSER_HEADERS, 'Referer': 'https://www.hoyolab.com/' }, timeout: 15000 });
    const posts = res.data?.data?.list || [];
    log(`[GI] Got ${posts.length} posts`);

    for (const post of posts) {
      const title = post.post?.subject || '';
      
      // FIX: Force print every title so we can see what HoYoLAB is returning
      log(`[GI] Found title: "${title}"`);
      
      const isBanner = title.includes('祈愿') || (title.includes('角色') && title.includes('武器'));
      const isEvent  = title.includes('活动') || title.includes('限时');
      if (!isBanner && !isEvent) continue;

      const pid = post.post?.post_id;
      const detail = await axios.get(`https://bbs-api-os.hoyolab.com/community/post/wapi/getPostFull?post_id=${pid}`, { headers: { ...BROWSER_HEADERS }, timeout: 15000 });
      const text = extractTextFromContent(detail.data?.data?.post?.post?.content || '');
      const time = parseGenshinTime(text);
      if (!time) { console.warn(`[GI] ⚠️ No date found in "${title}"`); continue; }

      results.push({
        id: `auto_gi_${pid}`, name: `${isBanner ? '🎴' : '🎯'} ${title}`, date: time.end, type: isBanner ? 'banner' : 'event', auto: true
      });
      log(`[GI] ✅ Added: "${title}"`);
    }
  } catch (e) { console.warn(`[GI] ❌ Scrape failed: ${e.message}`); }
  return results;
}

async function parseZZZ() {
  const results = [];
  try {
    // FIX: Changed page_size to 50, and type to 2 (Notices/Events)
    const apiUrl = 'https://bbs-api-os.hoyolab.com/community/post/wapi/getNewsList?gids=8&page_size=50&type=2';
    log('[ZZZ] Fetching post list...');
    const res = await axios.get(apiUrl, { headers: { ...BROWSER_HEADERS, 'Referer': 'https://www.hoyolab.com/' }, timeout: 15000 });
    const posts = res.data?.data?.list || [];
    log(`[ZZZ] Got ${posts.length} posts`);

    for (const post of posts) {
      const title = post.post?.subject || '';
      log(`[ZZZ] Found title: "${title}"`); // Force print title

      const isBanner = title.includes('调频') || title.includes('代理人');
      const isEvent  = title.includes('活动') || title.includes('限时');
      if (!isBanner && !isEvent) continue;

      const pid = post.post?.post_id;
      const detail = await axios.get(`https://bbs-api-os.hoyolab.com/community/post/wapi/getPostFull?post_id=${pid}`, { headers: { ...BROWSER_HEADERS }, timeout: 15000 });
      const text = extractTextFromContent(detail.data?.data?.post?.post?.content || '');
      const time = parseZZZTime(text) || parseGenshinTime(text);
      if (!time) { console.warn(`[ZZZ] ⚠️ No date found in "${title}"`); continue; }

      results.push({
        id: `auto_zzz_${pid}`, name: `${isBanner ? '🎴' : '🎯'} ${title}`, date: time.end, type: isBanner ? 'banner' : 'event', auto: true
      });
      log(`[ZZZ] ✅ Added: "${title}"`);
    }
  } catch (e) { console.warn(`[ZZZ] ❌ Scrape failed: ${e.message}`); }
  return results;
}

// FIX: Temporarily disable WW and AK so they don't crash the script
async function parseWW() {
  console.warn('[WW] ⚠️ Scraper disabled temporarily (API URL is dead).');
  return [];
}

async function parseAK() {
  console.warn('[AK] ⚠️ Scraper disabled temporarily (API URL is dead).');
  return [];
}

// ─── Main ───
async function main() {
  console.log('🔄 Fetching banner/event data...');

  const [gi, zzz, ww, ak] = await Promise.all([ parseGenshin(), parseZZZ(), parseWW(), parseAK() ]);

  console.log(`📊 Results — GI:${gi.length} ZZZ:${zzz.length} WW:${ww.length} AK:${ak.length}`);

  const today = new Date().toISOString().split('T')[0];

  const data = {
    _meta: { updated: today, note: 'Auto-generated by updateBanners.js' },
    gi: gi, zzz: zzz, ww: ww, ak: ak,
  };

  const totalItems = gi.length + zzz.length + ww.length + ak.length;
  if (totalItems === 0) {
    console.warn('⚠️ All scrapers returned 0 results — NOT overwriting banners.json');
    process.exit(1);
  }

  fs.writeFileSync(OUTPUT, JSON.stringify(data, null, 2), 'utf-8');
  console.log(`✅ banners.json written.`);
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
