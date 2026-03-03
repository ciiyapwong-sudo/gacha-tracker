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

// ─── Super Robust Time Parsers ───

function parseTime(text) {
  const currentYear = new Date().getFullYear();
  const pad = n => String(n).padStart(2, '0');

  // 1. Standard YYYY/MM/DD or YYYY-MM-DD (e.g., 2024/08/20 - 2024/09/10)
  const regexYYYYMMDD = /(\d{4})[\/\.\-](\d{1,2})[\/\.\-](\d{1,2}).{1,20}?(\d{4})[\/\.\-](\d{1,2})[\/\.\-](\d{1,2})/;
  const m1 = text.match(regexYYYYMMDD);
  if (m1) return { start: `${m1[1]}-${pad(m1[2])}-${pad(m1[3])}`, end: `${m1[4]}-${pad(m1[5])}-${pad(m1[6])}` };

  // 2. American MM/DD/YYYY (e.g., 08/20/2024 - 09/10/2024)
  const regexMMDDYYYY = /(\d{1,2})[\/\.\-](\d{1,2})[\/\.\-](\d{4}).{1,20}?(\d{1,2})[\/\.\-](\d{1,2})[\/\.\-](\d{4})/;
  const m2 = text.match(regexMMDDYYYY);
  if (m2) return { start: `${m2[3]}-${pad(m2[1])}-${pad(m2[2])}`, end: `${m2[6]}-${pad(m2[4])}-${pad(m2[5])}` };
  
  // 3. English Written Dates (e.g., August 28, 2024 - September 17, 2024)
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const regexWritten = /([a-z]{3,})\s+(\d{1,2})[,\s]+(\d{4}).{1,20}?([a-z]{3,})\s+(\d{1,2})[,\s]+(\d{4})/i;
  const m3 = text.match(regexWritten);
  if (m3) {
      const month1 = String(months.findIndex(x => m3[1].toLowerCase().startsWith(x.toLowerCase())) + 1).padStart(2, '0');
      const month2 = String(months.findIndex(x => m3[4].toLowerCase().startsWith(x.toLowerCase())) + 1).padStart(2, '0');
      if (month1 !== '00' && month2 !== '00') {
          return { start: `${m3[3]}-${month1}-${pad(m3[2])}`, end: `${m3[6]}-${month2}-${pad(m3[5])}` };
      }
  }

  // 4. Short English Written Dates (e.g., Aug 28 - Sep 17)
  const regexShortWritten = /([a-z]{3,})\s+(\d{1,2}).{1,20}?([a-z]{3,})\s+(\d{1,2})/i;
  const m4 = text.match(regexShortWritten);
  if (m4) {
      const month1 = String(months.findIndex(x => m4[1].toLowerCase().startsWith(x.toLowerCase())) + 1).padStart(2, '0');
      const month2 = String(months.findIndex(x => m4[3].toLowerCase().startsWith(x.toLowerCase())) + 1).padStart(2, '0');
      if (month1 !== '00' && month2 !== '00') {
          let endYear = currentYear;
          if (parseInt(month2) < parseInt(month1)) endYear++;
          return { start: `${currentYear}-${month1}-${pad(m4[2])}`, end: `${endYear}-${month2}-${pad(m4[4])}` };
      }
  }

  // 5. Chinese Dates (e.g., 2024年8月20日 - 2024年9月10日)
  const regexCN = /(\d{4})年(\d{1,2})月(\d{1,2})日.{1,20}?(\d{4})年(\d{1,2})月(\d{1,2})日/;
  const m5 = text.match(regexCN);
  if (m5) return { start: `${m5[1]}-${pad(m5[2])}-${pad(m5[3])}`, end: `${m5[4]}-${pad(m5[5])}-${pad(m5[6])}` };

  // 6. Short Chinese Dates (e.g., 8月20日 - 9月10日)
  const regexShortCN = /(\d{1,2})月(\d{1,2})日.{1,20}?(\d{1,2})月(\d{1,2})日/;
  const m6 = text.match(regexShortCN);
  if (m6) {
      let endYear = currentYear;
      if (parseInt(m6[3]) < parseInt(m6[1])) endYear++;
      return { start: `${currentYear}-${pad(m6[1])}-${pad(m6[2])}`, end: `${endYear}-${pad(m6[3])}-${pad(m6[4])}` };
  }

  return null;
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
      
      const time = parseTime(text);
      if (!time) { console.warn(`[GI] ⚠️ No date found in "${title}"`); continue; }

      results.push({ id: `auto_gi_${pid}`, name: `${isBanner ? '🎴' : '🎯'} ${title}`, date: time.end, type: isBanner ? 'banner' : 'event', auto: true });
      log(`[GI] ✅ Added: "${title}" -> ends ${time.end}`);
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
      
      const time = parseTime(text);
      if (!time) { console.warn(`[ZZZ] ⚠️ No date found in "${title}"`); continue; }

      results.push({ id: `auto_zzz_${pid}`, name: `${isBanner ? '🎴' : '🎯'} ${title}`, date: time.end, type: isBanner ? 'banner' : 'event', auto: true });
      log(`[ZZZ] ✅ Added: "${title}" -> ends ${time.end}`);
    }
  } catch (e) { console.warn(`[ZZZ] ❌ Scrape failed: ${e.message}`); }
  return results;
}

async function parseWW() {
  const results = [];
  try {
    log('[WW] Fetching Fandom API...');
    const url = 'https://wutheringwaves.fandom.com/api.php?action=parse&page=Convene&format=json&prop=text';
    const res = await axios.get(url, { headers: { ...BROWSER_HEADERS }, timeout: 15000 });
    const $ = cheerio.load(res.data?.parse?.text?.['*'] || '');

    $('table').each((_, table) => {
      $(table).find('tr').each((_, tr) => {
          let rowText = '';
          $(tr).find('td, th').each((_, td) => {
              rowText += $(td).text() + ' ';
          });
          rowText = rowText.replace(/\s+/g, ' ').trim();

          const time = parseTime(rowText);
          if (time) {
            // Fandom WW Convene table structure typically places the exact banner name inside a bold tag or a specific link 
            // inside the row. We will try to extract all readable string text before the dates
            let possibleTitle = $(tr).find('b, a[title]').first().text().trim();
            
            // Fallback: If no bold text or link, just use the first column text
            if(!possibleTitle || possibleTitle.length < 3) {
                possibleTitle = $(tr).find('td').first().text().replace(/\n/g, '').trim();
            }
            
            if (possibleTitle && !possibleTitle.includes('202') && possibleTitle.length > 2 && possibleTitle.length < 60) {
               results.push({ id: `auto_ww_${encodeURIComponent(possibleTitle).substring(0, 10)}`, name: `🎴 ${possibleTitle}`, date: time.end, type: 'banner', auto: true });
               log(`[WW] ✅ Added: "${possibleTitle}" -> ends ${time.end}`);
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
      
      const time = parseTime(text);
      if (time) {
        let titleMatch = text.match(/(.*?)(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)/i);
        let title = "Event";
        if (titleMatch && titleMatch[1]) {
           title = titleMatch[1].replace(/^[-•·*]\s*/, '').replace(/[\.·•\s]+$/, '').trim();
        }

        if (title.length > 1 && title.length < 50 && !seen.has(title)) {
          seen.add(title);
          const isBanner = title.toLowerCase().includes('banner') || title.toLowerCase().includes('headhunt');
          results.push({
            id: `auto_ak_${encodeURIComponent(title).substring(0, 15)}`, name: `${isBanner ? '🎴' : '🧩'} ${title}`,
            date: time.end, type: isBanner ? 'banner' : 'event', auto: true
          });
          log(`[AK] ✅ Added: "${title}" -> ends ${time.end}`);
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
