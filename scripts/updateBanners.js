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

  const regexYYYYMMDD = /(\d{4})[\/\.\-](\d{1,2})[\/\.\-](\d{1,2}).{1,20}?(\d{4})[\/\.\-](\d{1,2})[\/\.\-](\d{1,2})/;
  const m1 = text.match(regexYYYYMMDD);
  if (m1) return { start: `${m1[1]}-${pad(m1[2])}-${pad(m1[3])}`, end: `${m1[4]}-${pad(m1[5])}-${pad(m1[6])}` };

  const regexMMDDYYYY = /(\d{1,2})[\/\.\-](\d{1,2})[\/\.\-](\d{4}).{1,20}?(\d{1,2})[\/\.\-](\d{1,2})[\/\.\-](\d{4})/;
  const m2 = text.match(regexMMDDYYYY);
  if (m2) return { start: `${m2[3]}-${pad(m2[1])}-${pad(m2[2])}`, end: `${m2[6]}-${pad(m2[4])}-${pad(m2[5])}` };
  
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const regexWritten = /([a-z]{3,})\s+(\d{1,2})[,\s]+(\d{4}).{1,20}?([a-z]{3,})\s+(\d{1,2})[,\s]+(\d{4})/i;
  const m3 = text.match(regexWritten);
  if (m3) {
      const month1 = String(months.findIndex(x => m3[1].toLowerCase().startsWith(x.toLowerCase())) + 1).padStart(2, '0');
      const month2 = String(months.findIndex(x => m3[4].toLowerCase().startsWith(x.toLowerCase())) + 1).padStart(2, '0');
      if (month1 !== '00' && month2 !== '00') return { start: `${m3[3]}-${month1}-${pad(m3[2])}`, end: `${m3[6]}-${month2}-${pad(m3[5])}` };
  }

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

  const regexCN = /(\d{4})年(\d{1,2})月(\d{1,2})日.{1,20}?(\d{4})年(\d{1,2})月(\d{1,2})日/;
  const m5 = text.match(regexCN);
  if (m5) return { start: `${m5[1]}-${pad(m5[2])}-${pad(m5[3])}`, end: `${m5[4]}-${pad(m5[5])}-${pad(m5[6])}` };

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
    const res = await axios.get(apiUrl, { headers: { ...BROWSER_HEADERS, 'Referer': 'https://www.hoyolab.com/' }, timeout: 15000 });
    const posts = res.data?.data?.list || [];

    for (const post of posts) {
      const title = post.post?.subject || '';
      const isBanner = title.toLowerCase().includes('wish') || title.toLowerCase().includes('banner') || title.includes('祈愿');
      const isEvent  = title.toLowerCase().includes('event') || title.includes('活动') || title.includes('限时') || title.toLowerCase().includes('program') || title.toLowerCase().includes('rewards');
      if (!isBanner && !isEvent) continue;

      const detail = await axios.get(`https://bbs-api-os.hoyolab.com/community/post/wapi/getPostFull?post_id=${post.post?.post_id}`, { headers: BROWSER_HEADERS, timeout: 15000 });
      const text = extractTextFromContent(detail.data?.data?.post?.post?.content || '');
      const time = parseTime(text);
      if (time) results.push({ id: `auto_gi_${post.post?.post_id}`, name: `${isBanner ? '🎴' : '🎯'} ${title}`, date: time.end, type: isBanner ? 'banner' : 'event', auto: true });
    }
  } catch (e) { console.warn(`[GI] ❌ Scrape failed: ${e.message}`); }
  return results;
}

async function parseZZZ() {
  const results = [];
  try {
    const apiUrl = 'https://bbs-api-os.hoyolab.com/community/post/wapi/getNewsList?gids=8&page_size=50&type=2';
    const res = await axios.get(apiUrl, { headers: { ...BROWSER_HEADERS, 'Referer': 'https://www.hoyolab.com/' }, timeout: 15000 });
    const posts = res.data?.data?.list || [];

    for (const post of posts) {
      const title = post.post?.subject || '';
      const isBanner = title.toLowerCase().includes('search') || title.toLowerCase().includes('channel') || title.includes('调频');
      const isEvent  = title.toLowerCase().includes('event') || title.toLowerCase().includes('commission') || title.includes('活动') || title.toLowerCase().includes('giveaway') || title.toLowerCase().includes('drops');
      if (!isBanner && !isEvent) continue;

      const detail = await axios.get(`https://bbs-api-os.hoyolab.com/community/post/wapi/getPostFull?post_id=${post.post?.post_id}`, { headers: BROWSER_HEADERS, timeout: 15000 });
      const text = extractTextFromContent(detail.data?.data?.post?.post?.content || '');
      const time = parseTime(text);
      if (time) results.push({ id: `auto_zzz_${post.post?.post_id}`, name: `${isBanner ? '🎴' : '🎯'} ${title}`, date: time.end, type: isBanner ? 'banner' : 'event', auto: true });
    }
  } catch (e) { console.warn(`[ZZZ] ❌ Scrape failed: ${e.message}`); }
  return results;
}

async function parseWW() {
  const results = [];
  
  // MULTIPLE SOURCES: Scrapes both Banners AND Events pages
  const sources = [
    { name: "WW Banners", url: 'https://wutheringwaves.fandom.com/api.php?action=parse&page=Convene&format=json&prop=text', type: 'banner' },
    { name: "WW Events", url: 'https://wutheringwaves.fandom.com/api.php?action=parse&page=Events&format=json&prop=text', type: 'event' }
  ];

  for (const src of sources) {
    try {
      const res = await axios.get(src.url, { headers: BROWSER_HEADERS, timeout: 15000 });
      const $ = cheerio.load(res.data?.parse?.text?.['*'] || '');

      $('table').each((_, table) => {
        $(table).find('tr').each((_, tr) => {
            let rowText = '';
            $(tr).find('td, th').each((_, td) => { rowText += $(td).text() + ' '; });
            const time = parseTime(rowText.replace(/\s+/g, ' ').trim());
            
            if (time) {
              let title = $(tr).find('th, td, a, b').first().text().replace(/\n/g, '').trim();
              if (title && !title.includes('202') && title.length < 50) {
                 results.push({ id: `auto_ww_${encodeURIComponent(title).substring(0, 10)}`, name: `${src.type === 'banner' ? '🎴' : '🎯'} ${title}`, date: time.end, type: src.type, auto: true });
              }
            }
        });
      });
    } catch (e) { console.warn(`[WW] ❌ Scrape failed for ${src.name}: ${e.message}`); }
  }
  return Array.from(new Map(results.map(item => [item.name, item])).values());
}

async function parseAK() {
  const results = [];
  try {
    const res = await axios.get('https://endfieldtools.dev/', { headers: BROWSER_HEADERS, timeout: 15000 });
    const $ = cheerio.load(res.data);
    const seen = new Set();
    
    $('div, li, p, a, span').each((_, el) => {
      const text = $(el).text().replace(/\s+/g, ' ').trim();
      if (text.length > 150) return;
      const time = parseTime(text);
      
      if (time) {
        let titleMatch = text.match(/(.*?)(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)/i);
        let title = "Event";
        if (titleMatch && titleMatch[1]) title = titleMatch[1].replace(/^[-•·*]\s*/, '').replace(/[\.·•\s]+$/, '').trim();

        if (title.length > 1 && title.length < 50 && !seen.has(title)) {
          seen.add(title);
          const isBanner = title.toLowerCase().includes('banner') || title.toLowerCase().includes('headhunt');
          results.push({ id: `auto_ak_${encodeURIComponent(title).substring(0, 15)}`, name: `${isBanner ? '🎴' : '🧩'} ${title}`, date: time.end, type: isBanner ? 'banner' : 'event', auto: true });
        }
      }
    });
  } catch (e) { console.warn(`[AK] ❌ Scrape failed: ${e.message}`); }
  return results;
}

async function main() {
  console.log('🔄 Fetching banner/event data...');
  const [gi, zzz, ww, ak] = await Promise.all([ parseGenshin(), parseZZZ(), parseWW(), parseAK() ]);
  
  const today = new Date().toISOString().split('T')[0];
  const filterExpired = arr => arr.filter(e => e.date >= today); // Automatically filters dead events

  const data = {
    _meta: { updated: today, note: 'Auto-generated by updateBanners.js' },
    gi: filterExpired(gi), 
    zzz: filterExpired(zzz), 
    ww: filterExpired(ww), 
    ak: filterExpired(ak), 
  };
  
  const totalActiveItems = data.gi.length + data.zzz.length + data.ww.length + data.ak.length;
  console.log(`📊 Active Events Saved — GI:${data.gi.length} ZZZ:${data.zzz.length} WW:${data.ww.length} AK:${data.ak.length}`);

  if (totalActiveItems === 0) {
    console.warn('⚠️ All scrapers returned 0 ACTIVE results — NOT overwriting banners.json');
    process.exit(1);
  }

  fs.writeFileSync(OUTPUT, JSON.stringify(data, null, 2), 'utf-8');
  console.log(`✅ banners.json written successfully.`);
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
