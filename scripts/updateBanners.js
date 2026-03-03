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
  'Accept-Language': 'en-US,en;q=0.9,zh-CN;q=0.8',
};

function log(...args) { if (VERBOSE) console.log(...args); }

function extractTextFromContent(raw) {
  if (!raw) return '';
  try {
    const parsed = JSON.parse(raw);
    if (parsed?.ops) return parsed.ops.map(op => (typeof op.insert === 'string' ? op.insert : '')).join(' ');
  } catch (_) {}
  return cheerio.load(raw).text().replace(/\s+/g, ' ');
}

// ─── Universal Time Parsers ───

function parseGenshinTime(text) {
  // Matches numerical formats: 2026/03/01, 2026-03-01, 2026.03.01 with various separators
  const m = text.match(/(\d{4})[\/\.\-](\d{1,2})[\/\.\-](\d{1,2})\s*[\d:]*\s*[~～至\-–to]+\s*(\d{4})[\/\.\-](\d{1,2})[\/\.\-](\d{1,2})/i);
  if (m) {
    const pad = n => String(n).padStart(2, '0');
    return { start: `${m[1]}-${pad(m[2])}-${pad(m[3])}`, end: `${m[4]}-${pad(m[5])}-${pad(m[6])}` };
  }
  return null;
}

function parseZZZTime(text) {
  // Matches Chinese numerical formats: 2026年3月1日
  const m = text.match(/(\d{4})年(\d{1,2})月(\d{1,2})日.{0,30}?(\d{1,2})月(\d{1,2})日/);
  if (m) {
    const pad = n => String(n).padStart(2, '0');
    return { start: `${m[1]}-${pad(m[2])}-${pad(m[3])}`, end: `${m[1]}-${pad(m[4])}-${pad(m[5])}` };
  }
  return null;
}

function parseEnglishTime(text) {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  // Flexible regex matching: "August 28, 2024 - September 17, 2024", "Aug 28 2024 - Sep 17 2024", etc.
  const regex = /([A-Z][a-z]+)\s+(\d{1,2})[,\s]+(\d{4})\s*[-–~to]+\s*([A-Z][a-z]+)\s+(\d{1,2})[,\s]+(\d{4})/i;
  const m = text.match(regex);
  if (m) {
    const m1 = String(months.findIndex(x => m[1].toLowerCase().startsWith(x.toLowerCase())) + 1).padStart(2, '0');
    const m2 = String(months.findIndex(x => m[4].toLowerCase().startsWith(x.toLowerCase())) + 1).padStart(2, '0');
    if (m1 !== '00' && m2 !== '00') {
      return { start: `${m[3]}-${m1}-${String(m[2]).padStart(2, '0')}`, end: `${m[6]}-${m2}-${String(m[5]).padStart(2, '0')}` };
    }
  }
  
  // Fallback for short English formats: "Aug 28 - Sep 17" (assumes current year)
  const shortRegex = /([A-Z][a-z]+)\s+(\d{1,2})\s*[-–~to]+\s*([A-Z][a-z]+)\s+(\d{1,2})/i;
  const shortM = text.match(shortRegex);
  if (shortM) {
    const sm1 = String(months.findIndex(x => shortM[1].toLowerCase().startsWith(x.toLowerCase())) + 1).padStart(2, '0');
    const sm2 = String(months.findIndex(x => shortM[3].toLowerCase().startsWith(x.toLowerCase())) + 1).padStart(2, '0');
    if (sm1 !== '00' && sm2 !== '00') {
      const year = new Date().getFullYear();
      let endYear = year;
      if (parseInt(sm2) < parseInt(sm1)) endYear++;
      return { start: `${year}-${sm1}-${String(shortM[2]).padStart(2, '0')}`, end: `${endYear}-${sm2}-${String(shortM[4]).padStart(2, '0')}` };
    }
  }

  return null;
}

// Attempts all parsers and returns the first valid result
function extractTime(text) {
  return parseGenshinTime(text) || parseEnglishTime(text) || parseZZZTime(text);
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
      const titleLower = title.toLowerCase();
      
      const isBanner = titleLower.includes('wish') || titleLower.includes('banner') || title.includes('祈愿');
      const isEvent  = titleLower.includes('event') || title.includes('活动') || title.includes('限时') || titleLower.includes('program') || titleLower.includes('rewards');
      if (!isBanner && !isEvent) continue;

      const pid = post.post?.post_id;
      const detail = await axios.get(`https://bbs-api-os.hoyolab.com/community/post/wapi/getPostFull?post_id=${pid}`, { headers: { ...BROWSER_HEADERS }, timeout: 15000 });
      const text = extractTextFromContent(detail.data?.data?.post?.post?.content || '');
      
      const time = extractTime(text);
      
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
      const titleLower = title.toLowerCase();
      
      const isBanner = titleLower.includes('search') || titleLower.includes('channel') || title.includes('调频');
      const isEvent  = titleLower.includes('event') || titleLower.includes('commission') || title.includes('活动') || titleLower.includes('giveaway') || titleLower.includes('drops');
      if (!isBanner && !isEvent) continue;

      const pid = post.post?.post_id;
      const detail = await axios.get(`https://bbs-api-os.hoyolab.com/community/post/wapi/getPostFull?post_id=${pid}`, { headers: { ...BROWSER_HEADERS }, timeout: 15000 });
      const text = extractTextFromContent(detail.data?.data?.post?.post?.content || '');
      
      const time = extractTime(text);
      
      if (!time) { console.warn(`[ZZZ] ⚠️ No date found in "${title}"`); continue; }

      results.push({ id: `auto_zzz_${pid}`, name: `${isBanner ? '🎴' : '🎯'} ${title}`, date: time.end, type: isBanner ? 'banner' : 'event', auto: true });
      log(`[ZZZ] ✅ Added: "${title}"`);
    }
  } catch (e) { console.warn(`[ZZZ] ❌ Scrape failed: ${e.message}`); }
  return results;
}

// Fandom (WW) and EndfieldTools (AK) remain unchanged...
async function parseWW() {
  const results = [];
  try {
    const url = 'https://wutheringwaves.fandom.com/api.php?action=parse&page=Convene&format=json&prop=text';
    const res = await axios.get(url, { headers: { ...BROWSER_HEADERS }, timeout: 15000 });
    const $ = cheerio.load(res.data?.parse?.text?.['*'] || '');

    $('table').each((_, table) => {
      $(table).find('tr').each((_, tr) => {
        const text = $(tr).text().replace(/\s+/g, ' ').trim();
        const time = extractTime(text);
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
  return Array.from(new Map(results.map(item => [item.name, item])).values());
}

async function parseAK() {
  const results = [];
  try {
    const url = 'https://endfieldtools.dev/';
    const res = await axios.get(url, { headers: { ...BROWSER_HEADERS }, timeout: 15000 });
    const $ = cheerio.load(res.data);
    
    const seen = new Set();
    $('div, li, p, a, span').each((_, el) => {
      const text = $(el).text().replace(/\s+/g, ' ').trim();
      if (text.length > 150) return;
      
      const regex = /(.*?)\s*(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+(\d{1,2})\s*[-–~]\s*(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+(\d{1,2})/i;
      const m = text.match(regex);
      if (m) {
        let title = m[1].replace(/^[-•·*]\s*/, '').replace(/[\.·•\s]+$/, '').trim();
        if (title.length > 1 && title.length < 50 && !seen.has(title)) {
          seen.add(title);
          const months = { jan:'01', feb:'02', mar:'03', apr:'04', may:'05', jun:'06', jul:'07', aug:'08', sep:'09', oct:'10', nov:'11', dec:'12' };
          const endM = months[m[4].toLowerCase()];
          const endD = String(m[5]).padStart(2, '0');
          const year = new Date().getFullYear();
          const isBanner = title.toLowerCase().includes('banner') || title.toLowerCase().includes('headhunt');
          
          results.push({
            id: `auto_ak_${encodeURIComponent(title).substring(0, 15)}`, name: `${isBanner ? '🎴' : '🧩'} ${title}`,
            date: `${year}-${endM}-${endD}`, type: isBanner ? 'banner' : 'event', auto: true
          });
          log(`[AK] ✅ Added: "${title}"`);
        }
      }
    });
  } catch (e) { console.warn(`[AK] ❌ Scrape failed: ${e.message}`); }
  return results;
}

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
