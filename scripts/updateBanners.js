// scripts/updateBanners.js
// Run: node scripts/updateBanners.js
// Deps: npm install axios cheerio

import axios from 'axios';
import * as cheerio from 'cheerio';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUTPUT = path.join(__dirname, '..', 'banners.json');

// ─── Time parsing helpers ───────────────────────────────────────────
// Each game uses a different date format — parse them all into YYYY-MM-DD

function parseGenshinTime(text) {
  // Format: "2026/03/01 18:00:00 ~ 2026/03/17 14:59:59"
  const m = text.match(/(\d{4})\/(\d{2})\/(\d{2})\s+[\d:]+.*?(\d{4})\/(\d{2})\/(\d{2})\s+([\d:]+)/);
  if (!m) return null;
  return { start: `${m[1]}-${m[2]}-${m[3]}`, end: `${m[4]}-${m[5]}-${m[6]}` };
}

function parseZZZTime(text) {
  // Format: "2026年3月1日 18:00 - 3月17日 14:59"
  const m = text.match(/(\d{4})年(\d{1,2})月(\d{1,2})日.*?(\d{1,2})月(\d{1,2})日/);
  if (!m) return null;
  const pad = n => String(n).padStart(2, '0');
  return {
    start: `${m[1]}-${pad(m[2])}-${pad(m[3])}`,
    end:   `${m[1]}-${pad(m[4])}-${pad(m[5])}`
  };
}

function parseWWTime(text) {
  // Format: "2026-03-01 18:00至2026-03-17 14:59"
  const m = text.match(/(\d{4}-\d{2}-\d{2})\s+[\d:]+[至~\-–]+(\d{4}-\d{2}-\d{2})/);
  if (!m) return null;
  return { start: m[1], end: m[2] };
}

function parseAKTime(text) {
  // Format: "2026/03/01 - 2026/03/12"
  const m = text.match(/(\d{4})\/(\d{2})\/(\d{2}).*?(\d{4})\/(\d{2})\/(\d{2})/);
  if (!m) return null;
  return { start: `${m[1]}-${m[2]}-${m[3]}`, end: `${m[4]}-${m[5]}-${m[6]}` };
}

// ─── Per-game parsers ────────────────────────────────────────────────
// Each parser: scrapes the game's news/announcement page
// Returns array of { id, name, date, type, auto, desc, rewards }

async function parseGenshin() {
  const results = [];
  try {
    const url = 'https://www.hoyolab.com/topicDetail?id=28&lang=zh-cn';
    // NOTE: HoYoLAB requires JS — use their API instead:
    const apiUrl = 'https://bbs-api-os.hoyolab.com/community/post/wapi/getNewsList?gids=2&page_size=20&type=1';
    const res = await axios.get(apiUrl, {
      headers: { 'x-rpc-language': 'zh-cn', 'Referer': 'https://www.hoyolab.com/' }
    });
    const posts = res.data?.data?.list || [];
    for (const post of posts) {
      const title = post.post?.subject || '';
      const isBanner = title.includes('祈愿') || title.includes('角色') && title.includes('武器');
      const isEvent  = title.includes('活动') || title.includes('限时');
      if (!isBanner && !isEvent) continue;

      // Fetch detail page to get time
      const pid = post.post?.post_id;
      const detail = await axios.get(
        `https://bbs-api-os.hoyolab.com/community/post/wapi/getPostFull?post_id=${pid}`,
        { headers: { 'Referer': 'https://www.hoyolab.com/' } }
      );
      const content = detail.data?.data?.post?.post?.content || '';
      const $ = cheerio.load(content);
      const text = $.text();
      const time = parseGenshinTime(text);
      if (!time) { console.warn(`GI: no time in "${title}"`); continue; }

      results.push({
        id:      `auto_gi_${pid}`,
        name:    `${isBanner ? '🎴' : '🎯'} ${title}`,
        date:    time.end,
        type:    isBanner ? 'banner' : 'event',
        auto:    true,
        desc:    '',
        rewards: []
      });
    }
  } catch (e) {
    console.warn('GI scrape failed:', e.message);
  }
  return results;
}

async function parseZZZ() {
  const results = [];
  try {
    const apiUrl = 'https://bbs-api-os.hoyolab.com/community/post/wapi/getNewsList?gids=8&page_size=20&type=1';
    const res = await axios.get(apiUrl, {
      headers: { 'x-rpc-language': 'zh-cn', 'Referer': 'https://www.hoyolab.com/' }
    });
    const posts = res.data?.data?.list || [];
    for (const post of posts) {
      const title = post.post?.subject || '';
      const isBanner = title.includes('调频') || title.includes('代理人');
      const isEvent  = title.includes('活动') || title.includes('限时');
      if (!isBanner && !isEvent) continue;

      const pid = post.post?.post_id;
      const detail = await axios.get(
        `https://bbs-api-os.hoyolab.com/community/post/wapi/getPostFull?post_id=${pid}`,
        { headers: { 'Referer': 'https://www.hoyolab.com/' } }
      );
      const content = detail.data?.data?.post?.post?.content || '';
      const $ = cheerio.load(content);
      const text = $.text();
      const time = parseZZZTime(text) || parseGenshinTime(text);
      if (!time) { console.warn(`ZZZ: no time in "${title}"`); continue; }

      results.push({
        id:      `auto_zzz_${pid}`,
        name:    `${isBanner ? '🎴' : '🎯'} ${title}`,
        date:    time.end,
        type:    isBanner ? 'banner' : 'event',
        auto:    true,
        desc:    '',
        rewards: []
      });
    }
  } catch (e) {
    console.warn('ZZZ scrape failed:', e.message);
  }
  return results;
}

async function parseWW() {
  const results = [];
  try {
    // Wuthering Waves official CN news API
    const url = 'https://ak.kurogames.com/website/news-list?gameId=3&typeId=2&page=1&pageSize=10';
    const res = await axios.get(url, { headers: { Referer: 'https://wutheringwaves.kurogames.com/' } });
    const list = res.data?.data?.list || [];
    for (const item of list) {
      const title = item.title || '';
      const isBanner = title.includes('唤取') || title.includes('共鸣者');
      const isEvent  = title.includes('活动') || title.includes('限时');
      if (!isBanner && !isEvent) continue;

      // Fetch article content
      const articleUrl = `https://ak.kurogames.com/website/news-detail?id=${item.id}`;
      const detail = await axios.get(articleUrl);
      const $ = cheerio.load(detail.data?.data?.content || '');
      const text = $.text();
      const time = parseWWTime(text);
      if (!time) { console.warn(`WW: no time in "${title}"`); continue; }

      results.push({
        id:      `auto_ww_${item.id}`,
        name:    `${isBanner ? '🎴' : '🌟'} ${title}`,
        date:    time.end,
        type:    isBanner ? 'banner' : 'event',
        auto:    true,
        desc:    '',
        rewards: []
      });
    }
  } catch (e) {
    console.warn('WW scrape failed:', e.message);
  }
  return results;
}

async function parseAK() {
  const results = [];
  try {
    // Arknights Endfield CN news
    const url = 'https://endfield.gryphline.com/website/news?type=2&page=1';
    const res = await axios.get(url);
    const list = res.data?.data?.list || [];
    for (const item of list) {
      const title = item.title || '';
      const isBanner = title.includes('寻访') || title.includes('干员');
      const isEvent  = title.includes('活动');
      if (!isBanner && !isEvent) continue;

      const time = parseAKTime(item.publishTime || '');
      if (!time) continue;

      results.push({
        id:      `auto_ak_${item.id}`,
        name:    `${isBanner ? '🎴' : '🧩'} ${title}`,
        date:    time.end,
        type:    isBanner ? 'banner' : 'event',
        auto:    true,
        desc:    '',
        rewards: []
      });
    }
  } catch (e) {
    console.warn('AK scrape failed:', e.message);
  }
  return results;
}

// ─── Main ────────────────────────────────────────────────────────────

async function main() {
  console.log('🔄 Fetching banner/event data...');

  const [gi, zzz, ww, ak] = await Promise.all([
    parseGenshin(),
    parseZZZ(),
    parseWW(),
    parseAK()
  ]);

  // Filter out expired entries (end date passed)
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

  // Safety check — if all are empty (all scrapers failed), don't overwrite
  const totalItems = gi.length + zzz.length + ww.length + ak.length;
  if (totalItems === 0) {
    console.warn('⚠️ All scrapers returned 0 results — NOT overwriting banners.json');
    process.exit(0); // exit 0 so Actions doesn't show as failed
  }

  fs.writeFileSync(OUTPUT, JSON.stringify(data, null, 2), 'utf-8');
  console.log(`✅ banners.json written — GI:${gi.length} ZZZ:${zzz.length} WW:${ww.length} AK:${ak.length}`);
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(0); // exit 0 = don't overwrite old data
});
