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
  'Accept-Language': 'en-US,en;q=0.9', // Force English dates on tools sites
};

function log(...args) { if (VERBOSE) console.log(...args); }

function extractTextFromContent(raw) {
  if (!raw) return '';
  try {
    const parsed = JSON.parse(raw);
    if (parsed?.ops) return parsed.ops.map(op => (typeof op.insert === 'string' ? op.insert : '')).join('');
  } catch (_) {}
  return cheerio.load(raw).text();
}

// ─── Time Parsers ───

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
  return { start: `${m[1]}-${pad(m[2])}-${pad(m[3])}`, end: `${m[1]}-${pad(m[4])}-${pad(m[5])}` };
}

// Wiki Time Parser (e.g. May 23, 2024 - June 13, 2024)
function parseFandomTime(text) {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const regex = /([A-Z][a-z]+)\s+(\d{1,2}),\s+(\d{4})\s*[-–~to]+\s*([A-Z][a-z]+)\s+(\d{1,2}),\s+(\d{4})/i;
  const m = text.match(regex);
  if (!m) return null;
  const m1 = String(months.findIndex(x => m[1].toLowerCase().startsWith(x.toLowerCase())) + 1).padStart(2, '0');
  const m2 = String(months.findIndex(x => m[4].toLowerCase().startsWith(x.toLowerCase())) + 1).padStart(2, '0');
  if (m1 === '00' || m2 === '00') return null;
  return { start: `${m[3]}-${m1}-${String(m[2]).padStart(2, '0')}`, end: `${m[6]}-${m2}-${String(m[5]).padStart(2, '0')}` };
}

// EndfieldTools.dev Time Parser (e.g. Yvonne Banner. Feb 23 - Mar 12)
function parseEndfieldToolsTime(text) {
  const months = { jan:'01', feb:'02', mar:'03', apr:'04', may:'05', jun:'06', jul:'07', aug:'08', sep:'09', oct:'10', nov:'11', dec:'12' };
  const regex = /(.*?)\s*(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+(\d{1,2})\s*[-–~]\s*(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+(\d{1,2})/i;
  
  const m = text.match(regex);
  if (!m) return null;
  
  // Clean up formatting dots or bullets attached to the title
  let title = m[1].replace(/^[-•·*]\s*/, '').replace(/[\.·•\s]+$/, '').trim(); 
  if (title.length > 50) {
      const parts = title.split(/[•·|-]/);
      title = parts[parts.length - 1].trim();
  }
  if (!title || title.length < 2) return null;
  
  const startM = months[m[2].toLowerCase()];
  const startD = String(m[3]).padStart(2, '0');
  const endM = months[m[4].toLowerCase()];
  const endD = String(m[5]).padStart(2, '0');
  
  const currentYear = new Date().getFullYear();
  let endYear = currentYear;
  if (parseInt(endM) < parseInt(startM)) endYear = currentYear + 1; // Handle year wrap-around
  
  return { title: title, start: `${currentYear}-${startM}-${startD}`, end: `${endYear}-${endM}-${endD}` };
}

// ─── Per-game scrapers ───

async function parseGenshin() {
  const results = [];
  try {
    const apiUrl = 'https://bbs-api-os.hoyolab.com/community/post/wapi/getNewsList?gids=2&page_size=50&type=2';
    log('[GI] Fetching post list...');
    const res = await axios.get(apiUrl, { headers: { ...BROWSER_HEADERS, 'Referer': 'https://www.hoyolab.com/' }, timeout: 15000 });
    const posts = res.data?.data?.list || [];

    for (const post of posts) {
      const title = post.post?.subject || '';
      const isBanner = title.includes('祈愿') || (title.includes('角色') && title.includes('武器'));
      const isEvent  = title.includes('活动') || title.includes('限时');
      if (!isBanner && !isEvent) continue;

      const pid = post.post?.post_id;
      const detail = await axios.get(`https://bbs-api-os.hoyolab.com/community/post/wapi/getPostFull?post_id=${pid}`, { headers: { ...BROWSER_HEADERS }, timeout: 15000 });
      const text = extractTextFromContent(detail.data?.data?.post?.post?.content || '');
      const time = parseGenshinTime(text);
      if (!time) { console.warn(`[GI] ⚠️ No date found in "${title}"`); continue; }

      results.push({ id: `auto_gi_${pid}`, name: `${isBanner ? '🎴' : '🎯'} ${title}`, date: time.end, type: isBanner ? 'banner' : 'event', auto: true });
      log(`[GI] ✅ Added: "${title}"`);
    }
  } catch (e) { console.warn(`[GI] ❌ Scrape failed: ${e.message}`); }
  return results;
}

async function parseZZZ() {
  const results = [];
  try {
    const apiUrl = 'https://bbs-api-os.hoyolab.com/community/post/wapi/getNewsList?gids=8&page_size=50&type=2';
    log('[ZZZ] Fetching post list...');
    const res = await axios.get(apiUrl, { headers: { ...BROWSER_HEADERS, 'Referer': 'https://www.hoyolab.com/' }, timeout: 15000 });
    const posts = res.data?.data?.list || [];

    for (const post of posts) {
      const title = post.post?.subject || '';
      const isBanner = title.includes('调频') || title.includes('代理人');
      const isEvent  = title.includes('活动') || title.includes('限时');
      if (!isBanner && !isEvent) continue;

      const pid = post.post?.post_id;
      const detail = await axios.get(`https://bbs-api-os.hoyolab.com/community/post/wapi/getPostFull?post_id=${pid}`, { headers: { ...BROWSER_HEADERS }, timeout: 15000 });
      const text = extractTextFromContent(detail.data?.data?.post?.post?.content || '');
      const time = parseZZZTime(text) || parseGenshinTime(text);
      if (!time) { console.warn(`[ZZZ] ⚠️ No date found in "${title}"`); continue; }

      results.push({ id: `auto_zzz_${pid}`, name: `${isBanner ? '🎴' : '🎯'} ${title}`, date: time.end, type: isBanner ? 'banner' : 'event', auto: true });
      log(`[ZZZ] ✅ Added: "${title}"`);
    }
  } catch (e) { console.warn(`[ZZZ] ❌ Scrape failed: ${e.message}`); }
  return results;
}

async function parseWW() {
  const results = [];
  try {
    // FIX: Scrapes the Wuthering Waves Fandom Wiki directly
    const url = 'https://wutheringwaves.fandom.com/wiki/Convene';
    log('[WW] Fetching Fandom Wiki...');
    const res = await axios.get(url, { headers: { ...BROWSER_HEADERS }, timeout: 15000 });
    const $ = cheerio.load(res.data);

    $('table').each((_, table) => {
      $(table).find('tr').each((_, tr) => {
        const text = $(tr).text().replace(/\s+/g, ' ').trim();
        const time = parseFandomTime(text) || parseGenshinTime(text);
        if (time) {
          let title = $(tr).find('th, td, a, b').first().text().replace(/\n/g, '').trim();
          if (title && !title.includes('202') && title.length < 50) {
             results.push({ id: `auto_ww_${encodeURIComponent(title).substring(0, 10)}`, name: `🎴 ${title}`, date: time.end, type: 'banner', auto: true });
             log(`[WW] ✅ Added: "${title}"`);
          }
        }
      });
    });
  } catch (e) { console.warn(`[WW] ❌ Scrape failed: ${e.message}`); }
  
  // Deduplicate entries
  return Array.from(new Map(results.map(item => [item.name, item])).values());
}

async function parseAK() {
  const results = [];
  try {
    // FIX: Scrapes EndfieldTools.dev!
    const url = 'https://endfieldtools.dev/';
    log('[AK] Fetching EndfieldTools.dev...');
    const res = await axios.get(url, { headers: { ...BROWSER_HEADERS }, timeout: 15000 });
    const $ = cheerio.load(res.data);
    
    const seen = new Set();
    
    // Scan all small text blocks on the page
    $('div, li, p, a, span').each((_, el) => {
      const text = $(el).text().replace(/\s+/g, ' ').trim();
      
      // Ignore large container blocks to prevent greedy matching
      if (text.length > 150) return;
      
      const parsed = parseEndfieldToolsTime(text);
      if (parsed && !seen.has(parsed.title)) {
         seen.add(parsed.title);
         
         const isBanner = parsed.title.toLowerCase().includes('banner') || parsed.title.toLowerCase().includes('headhunt');
         
         results.push({
           id: `auto_ak_${encodeURIComponent(parsed.title).substring(0, 15)}`,
           name: `${isBanner ? '🎴' : '🧩'} ${parsed.title}`,
           date: parsed.end, 
           type: isBanner ? 'banner' : 'event', 
           auto: true
         });
         log(`[AK] ✅ Added: "${parsed.title}" -> ends ${parsed.end}`);
      }
    });
  } catch (e) { console.warn(`[AK] ❌ Scrape failed: ${e.message}`); }
  
  return results;
}

// ─── Main ───
async function main() {
  console.log('🔄 Fetching banner/event data...');

  const [gi, zzz, ww, ak] = await Promise.all([ parseGenshin(), parseZZZ(), parseWW(), parseAK() ]);

  console.log(`📊 Results — GI:${gi.length} ZZZ:${zzz.length} WW:${ww.length} AK:${ak.length}`);

  const today = new Date().toISOString().split('T')[0];

  // NOTE: Uncomment the line below once you verify GitHub Actions turns green and logs the titles properly!
  // const filterExpired = arr => arr.filter(e => e.date >= today);

  const data = {
    _meta: { updated: today, note: 'Auto-generated by updateBanners.js' },
    // gi: filterExpired(gi), zzz: filterExpired(zzz), ww: filterExpired(ww), ak: filterExpired(ak),
    gi: gi, zzz: zzz, ww: ww, ak: ak, // Temporary test: Everything passes
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
