// ════════════════════════════════════════════
// ── TYPE DEFINITIONS (JSDoc — TS checking without a build step)
// ── Enable: add  // @ts-check  at top, or open in VS Code
// ════════════════════════════════════════════

// @ts-check

/**
 * @typedef {{ id: string, label: string, tag: string, dynamic?: string }} Task
 * @typedef {{ id: string, label: string, tag: string, dynamic?: string }} WeeklyTask
 * @typedef {{ id: string, label: string, tag: string, days: number }} CyclicTask
 * @typedef {{ id: string, label: string }} AbyssConfig
 * @typedef {{ id: string, name: string, date: string, type: 'banner'|'event', manual?: boolean, auto?: boolean, desc?: string, rewards?: string[] }} GameEvent
 */

/**
* @typedef {{
*   id: string,
*   name: string,
*   icon: string,
*   cls: string,
*   searchName: string,
*   tasks: Task[],
*   weekly?: WeeklyTask[],
*   cyclic?: CyclicTask[],
*   abyss?: AbyssConfig,
*   builtIn?: boolean,
*   profileDef?: { level1: string, level2: string, currency: string, monthly: string, pulls: string }
* }} Game
*/

/**
 * @typedef {{
 *   done: number, total: number,
 *   wDone: number, wTotal: number,
 *   cDone: number, cTotal: number,
 *   abyssDone: number, abyssTotal: number
 * }} GameCounts
 */

/**
 * @typedef {{
 *   _date?: string,
 *   _celebrated?: boolean,
 *   [key: string]: any
 * }} AppState
 */

/** @type {Game[]} */
const BASE_GAMES = [
  {
    id: 'ww', name: '鸣潮', icon: '🌊', cls: 'ww',
    searchName: '鸣潮 Wuthering Waves',
    profileDef: { level1: '联觉等级', level2: '索拉等级', currency: '星声', monthly: '月卡剩余', pulls: '余波珊瑚' },
    tasks: [
      { id: 'ww_vitality', label: '活跃度（100）', tag: '活跃' },
      { id: 'ww_wave', label: '消耗结晶波片', tag: '体力' },
      { id: 'ww_nightmare', label: '梦魇拔除', tag: '战斗' },
      { id: 'ww_echo', label: '残像聚落', tag: '声骸' },
    ],
    weekly: [
      { id: 'ww_w_boss1', label: '周本BOSS 1', tag: '周本' },
      { id: 'ww_w_boss2', label: '周本BOSS 2', tag: '周本' },
      { id: 'ww_w_boss3', label: '周本BOSS 3', tag: '周本' },
      { id: 'ww_w_door', label: '千道门扉的异想', tag: '周常' },
      { id: 'ww_w_oil', label: '买金装特级香油', tag: '商店' },
    ]
  },
  {
    id: 'ak', name: '明日方舟：终末地', icon: '⚙️', cls: 'ak',
    searchName: '明日方舟终末地 Arknights Endfield',
    profileDef: { level1: '协议等级', level2: '基建进度', currency: '源石', monthly: '月卡剩余', pulls: '寻访凭证' },
    tasks: [
      { id: 'ak_sanity', label: '消耗耐力（理智）', tag: '体力' },
      { id: 'ak_vitality', label: '活跃度（100）', tag: '活跃' },
      { id: 'ak_storage', label: '仓储节点（武陵）', tag: '收集' },
    ],
    cyclic: [
      { id: 'ak_c2_env', label: '环境监测', tag: '每2天', days: 2 },
      { id: 'ak_c4_map', label: '全地图收集资源', tag: '每4天', days: 4 },
    ]
  },
  {
    id: 'gi', name: '原神', icon: '✦', cls: 'gi',
    searchName: '原神 Genshin Impact',
    profileDef: { level1: '冒险等阶', level2: '世界等级', currency: '原石', monthly: '空月祝福', pulls: '纠缠之缘' },
    tasks: [
      { id: 'gi_commissions', label: '每日委托（4个）', tag: '日常' },
      { id: 'gi_commission_claim', label: '领取冒险者协会', tag: '日常' },
      { id: 'gi_resin', label: '消耗原粹树脂（160）', tag: '体力' },
    ],
    weekly: [
      { id: 'gi_w_boss1', label: '周本BOSS 1', tag: '周本' },
      { id: 'gi_w_boss2', label: '周本BOSS 2', tag: '周本' },
      { id: 'gi_w_boss3', label: '周本BOSS 3', tag: '周本' },
    ],
    abyss: { id: 'gi_abyss', label: '深境螺旋' }
  },
  {
    id: 'zzz', name: '绝区零', icon: '⚡', cls: 'zzz',
    searchName: '绝区零 Zenless Zone Zero',
    profileDef: { level1: '绳网等级', level2: '信誉度', currency: '菲林', monthly: '底片', pulls: '加密母带' },
    tasks: [
      { id: 'zzz_battery', label: '消耗电量（200）', tag: '体力' },
      { id: 'zzz_shop', label: '刮刮乐（招财猫）', tag: '商店' },
      { id: 'zzz_vitality', label: '活跃度（4个）', tag: '活跃' },
    ],
    weekly: [
      { id: 'zzz_w_hollow', label: '空洞零号', tag: '周常' },
    ]
  }
];

// Mark base games so we can distinguish them from custom games
BASE_GAMES.forEach(g => { g.builtIn = true; });

/** @returns {Game[]} */
function getCustomGames() {
  const custom = state._customGames;
  return Array.isArray(custom) ? /** @type {Game[]} */ (custom) : [];
}

/** @param {Game[]} games */
function setCustomGames(games) {
  state._customGames = games;
  saveState();
}

/** @returns {{ all: Game[], base: Game[], custom: Game[] }} */
function getAllGames() {
  const custom = getCustomGames();
  return {
    all: [...BASE_GAMES, ...custom],
    base: BASE_GAMES,
    custom
  };
}

// ════════════════════════════════════════════
// ── DATA: AUTO_BANNERS — loaded from banners.json at startup ──
// ════════════════════════════════════════════

/** @type {Record<string, GameEvent[]>} */
const AUTO_BANNERS = { ww: [], ak: [], gi: [], zzz: [] };

/** @type {Record<string, GameEvent>} */
const EVENT_DETAIL_MAP = {};
// NOTE: populated inside fetch().then() below, after banners.json has loaded

// ── Event detail (inline) ──
/**
 * @param {string} eid
 * @param {string} gid
 */
function openEvModal(eid, gid) {
  let ev = EVENT_DETAIL_MAP[eid];
  if (!ev) { const evs = getEvents(gid); ev = evs.find(e => e.id === eid); }
  if (!ev) return;
  const item = document.querySelector('.event-item[data-eid="' + eid + '"][data-gid="' + gid + '"]');
  if (!item || !item.parentElement) return;
  const list = item.parentElement;

  // Toggle same item
  const next = item.nextElementSibling;
  if (next && next.classList && next.classList.contains('event-detail')) {
    next.remove();
    return;
  }

  // Close any other open detail inside this list
  Array.from(list.querySelectorAll('.event-detail')).forEach(function (d) { d.remove(); });

  const isBanner = ev.type === 'banner';
  const urg = urgencyClass(ev.date);
  const cdColor = urg === 'urgent' ? 'var(--danger)' : urg === 'warning' ? 'var(--warn)' : 'var(--accent2)';
  const rewardsArr = ev.rewards || [];

  const detail = document.createElement('div');
  detail.className = 'event-detail';
  detail.setAttribute('data-eid', eid);

  const typeText = isBanner ? '🎴 限定卡池 / 寻访' : '🎯 限时活动';
  const descHtml = ev.desc ? '<div class="event-detail-desc">' + ev.desc + '</div>' : '';
  const rewardsHtml = rewardsArr.length
    ? '<div class="event-detail-rewards">' + rewardsArr.map(function (r) { return '<span>' + r + '</span>'; }).join('') + '</div>'
    : '';

  detail.innerHTML =
    '<div class="event-detail-header">'
    + '<span class="event-detail-type">' + typeText + '</span>'
    + '<span class="event-detail-date">' + ev.date + '</span>'
    + '</div>'
    + descHtml
    + rewardsHtml
    + '<div class="event-detail-countdown" style="color:' + cdColor + '">⏱ 剩余时间：' + countdownText(ev.date) + '</div>';

  item.insertAdjacentElement('afterend', detail);
}
function closeEvModal(e) { /* no-op (inline detail mode) */ }
function closeEvModalBtn() { /* no-op (inline detail mode) */ }

// Merge auto banners/events into state — skip expired, skip duplicates, clean old autos
function mergeAutoBanners() {
  getAllGames().base.forEach(g => {
    /** @type {GameEvent[]} */
    const autoItems = Object.hasOwn(AUTO_BANNERS, g.id) ? AUTO_BANNERS[g.id] : [];
    const existing = getEvents(g.id);
    const existingIds = new Set(existing.map(e => e.id));
    const toAdd = autoItems.filter(b => getExpireMs(b.date) > Date.now() && !existingIds.has(b.id));
    const cleaned = existing.filter(e => !e.auto || getExpireMs(e.date) > Date.now());
    if (toAdd.length > 0 || cleaned.length !== existing.length) {
      const merged = [...cleaned, ...toAdd].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
      state['events_' + g.id] = merged;
    }
  });
}

/** @type {AppState} */
var state = {};

/** @param {string} gid @returns {GameEvent[]} */
function getEvents(gid) { return /** @type {GameEvent[]} */ (state['events_' + gid]) || []; }
/** @param {string} gid @param {GameEvent[]} evs */
function saveEvents(gid, evs) { state['events_' + gid] = evs; saveState(); }

// ── State ──
/** @returns {Date} */
function getServerNow() {
  return new Date(Date.now() - 4 * 3600 * 1000);
}
/** @returns {string} ISO date string YYYY-MM-DD */
function getResetDate() {
  const now = getServerNow();
  const reset = new Date(now);
  reset.setHours(4, 0, 0, 0);
  if (now < reset) reset.setDate(reset.getDate() - 1);
  return reset.toISOString().split('T')[0];
}

/** 
 * Automatically deducts a specified number of days from monthly card tracking values
 * @param {string} profileKey The 'profile_gid' key in state
 * @param {number} daysPassed Number of days since last reset
 * @param {Object} keptState The state object where the profile holds data
 */
function deductMonthlyCard(profileKey, daysPassed, keptState) {
  if (daysPassed <= 0) return;
  const gid = profileKey.slice('profile_'.length);
  const game = getAllGames().all.find(x => x.id === gid);
  const def = (game && game.profileDef) ? game.profileDef : { monthly: '月卡' };
  const profile = keptState[profileKey];

  if (profile && Array.isArray(profile.stats)) {
    profile.stats.forEach(s => {
      if (s.label && s.label.includes(def.monthly)) {
        s.value = String(s.value).replace(/\d+/, match => {
          return Math.max(0, parseInt(match, 10) - daysPassed).toString();
        });
      }
    });
  }
}

/** Loads persisted state from localStorage, resets daily keys on new day */
function loadState() {
  try { const s = localStorage.getItem('gaming_dailies_v4'); if (s) state = JSON.parse(s); } catch (e) { }
  const today = getResetDate();
  if (state._date !== today) {
    const kept = {};
    const weekKey = getWeekKey();

    // Calculate days passed for monthly card deduction
    let daysPassed = 1;
    if (state._date) {
      const oldD = new Date(state._date + 'T04:00:00').getTime();
      const newD = new Date(today + 'T04:00:00').getTime();
      daysPassed = Math.round((newD - oldD) / 86400000);
      if (daysPassed < 1) daysPassed = 1;
    } else {
      daysPassed = 0; // First time init, don't deduct
    }

    getAllGames().all.forEach(g => {
      ['events_', '_collapsed_'].forEach(p => {
        if (state[p + g.id] !== undefined) kept[p + g.id] = state[p + g.id];
      });
      if (g.weekly) g.weekly.forEach(t => {
        const wk = 'w_' + weekKey + '_' + t.id;
        if (state[wk]) kept[wk] = state[wk];
      });
      if (g.abyss) {
        Object.keys(state).forEach(k => {
          if (k.startsWith('abyss_') && k.endsWith('_' + g.abyss.id)) kept[k] = state[k];
        });
      }
    });
    Object.keys(state).forEach(k => {
      if (k === '_customGames' || k.startsWith('events_') || k.startsWith('abyss_') || k.startsWith('cyclic_') || k.endsWith('_start')
        || k.startsWith('custom_daily_') || k.startsWith('custom_weekly_')
        || k.startsWith('hidden_daily_') || k.startsWith('hidden_weekly_')
        || k.startsWith('profile_')) {

        kept[k] = state[k];
        if (k.startsWith('profile_')) {
          deductMonthlyCard(k, daysPassed, kept);
        }
      }
    });
    // Preserve weekly check state for custom weekly tasks across day resets
    Object.keys(state).forEach(k => {
      if (k.startsWith('w_') && !kept[k]) {
        // keep any weekly key (covers custom task IDs too)
        kept[k] = state[k];
      }
    });
    state = Object.assign({ _date: today, _celebrated: false }, kept);
    saveState();
  }
}
/** Persists current state to localStorage and schedules Firestore sync */
function saveState() {
  localStorage.setItem('gaming_dailies_v4', JSON.stringify(state));
  if (typeof scheduleSyncToFirestore === 'function') scheduleSyncToFirestore();
}

/** @param {string} tid */
function toggleTask(tid) { dispatch({ type: 'TOGGLE_TASK', tid }); }

// ── Cyclic task logic ──
/** @param {string} tid @returns {string|null} */
function getCyclicLastDone(tid) {
  return state['cyclic_' + tid + '_lastDone'] || null;
}
/** @param {CyclicTask} task @returns {number} */
function getCyclicDaysUntilDue(task) {
  const lastDone = getCyclicLastDone(task.id);
  if (!lastDone) return 0;
  const last = new Date(lastDone);
  const now = new Date(getResetDate());
  const diffDays = Math.floor((now - last) / 86400000);
  return Math.max(0, task.days - diffDays);
}
/** @param {CyclicTask} task @returns {boolean} */
function isCyclicDue(task) { return getCyclicDaysUntilDue(task) === 0; }
/** @param {string} tid @returns {boolean} */
function isCyclicDone(tid) {
  const lastDone = getCyclicLastDone(tid);
  if (!lastDone) return false;
  const last = new Date(lastDone);
  const now = new Date(getResetDate());
  const diffDays = Math.floor((now - last) / 86400000);
  for (const g of getAllGames().all) {
    for (const t of (g.cyclic || [])) {
      if (t.id === tid) return diffDays < t.days;
    }
  }
  return false;
}
/** @param {string} tid */
function toggleCyclic(tid) { dispatch({ type: 'TOGGLE_CYCLIC', tid }); }

/** Clears daily task state, preserves events/weekly/abyss/cyclic */
function resetAll() {
  const today = getResetDate();
  const kept = {};
  const weekKey = getWeekKey();
  getAllGames().all.forEach(g => {
    ['events_', '_collapsed_'].forEach(p => {
      if (state[p + g.id] !== undefined) kept[p + g.id] = state[p + g.id];
    });
    if (g.weekly) g.weekly.forEach(t => {
      const wk = 'w_' + weekKey + '_' + t.id;
      if (state[wk]) kept[wk] = state[wk];
    });
    if (g.abyss) {
      Object.keys(state).forEach(k => {
        if (k.startsWith('abyss_') && k.endsWith('_' + g.abyss.id)) kept[k] = state[k];
      });
    }
  });
  Object.keys(state).forEach(k => {
    if (k === '_customGames' || k.startsWith('events_') || k.startsWith('abyss_') || k.startsWith('cyclic_') || k.endsWith('_start')
      || k.startsWith('custom_daily_') || k.startsWith('custom_weekly_')
      || k.startsWith('hidden_daily_') || k.startsWith('hidden_weekly_')
      || k.startsWith('profile_')) {

      kept[k] = state[k];

      // On manual reset all, deduct exactly 1 day
      if (k.startsWith('profile_')) {
        deductMonthlyCard(k, 1, kept);
      }
    }
  });
  Object.keys(state).forEach(k => {
    if (k.startsWith('w_') && !kept[k]) kept[k] = state[k];
  });
  state = Object.assign({ _date: today, _celebrated: false }, kept);
  saveState(); render();
}
function closeOverlay() { document.getElementById('completionOverlay').classList.remove('show'); }

// ── Banner / Event forms ──
/** @param {string} gid */
function toggleBannerForm(gid) {
  const f = document.getElementById('bnform_' + gid);
  if (!f) return;
  f.classList.toggle('open');
  if (f.classList.contains('open')) {
    const input = document.getElementById('bninput_' + gid);
    if (input) input.focus();
    const ef = document.getElementById('evform_' + gid);
    if (ef) ef.classList.remove('open');
  }
}
/** @param {string} gid */
function closeBannerForm(gid) {
  const f = document.getElementById('bnform_' + gid);
  if (f) f.classList.remove('open');
  const bninput = /** @type {HTMLInputElement | null} */ (document.getElementById('bninput_' + gid));
  const bndate = /** @type {HTMLInputElement | null} */ (document.getElementById('bndate_' + gid));
  if (bninput) bninput.value = '';
  if (bndate) bndate.value = '';
}
/** @param {string} gid */
function toggleEventForm(gid) {
  const f = document.getElementById('evform_' + gid);
  if (!f) return;
  f.classList.toggle('open');
  if (f.classList.contains('open')) {
    const input = document.getElementById('evinput_' + gid);
    if (input) input.focus();
    const bf = document.getElementById('bnform_' + gid);
    if (bf) bf.classList.remove('open');
  }
}
/** @param {string} gid */
function closeEventForm(gid) {
  const f = document.getElementById('evform_' + gid);
  if (f) f.classList.remove('open');
  const evinput = /** @type {HTMLInputElement | null} */ (document.getElementById('evinput_' + gid));
  const evdate = /** @type {HTMLInputElement | null} */ (document.getElementById('evdate_' + gid));
  if (evinput) evinput.value = '';
  if (evdate) evdate.value = '';
}
/** @param {string} gid */
function addBanner(gid) {
  const nameInput = /** @type {HTMLInputElement | null} */ (document.getElementById('bninput_' + gid));
  const dateInput = /** @type {HTMLInputElement | null} */ (document.getElementById('bndate_' + gid));
  const name = nameInput ? nameInput.value.trim() : '';
  const date = dateInput ? dateInput.value : '';
  if (!name || !date) return;
  const evs = getEvents(gid);
  evs.push({ id: Date.now().toString(), name, date, type: 'banner', manual: true });
  evs.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  saveEvents(gid, evs); closeBannerForm(gid); render();
}
/** @param {string} gid */
function addEvent(gid) {
  const nameInput = /** @type {HTMLInputElement | null} */ (document.getElementById('evinput_' + gid));
  const dateInput = /** @type {HTMLInputElement | null} */ (document.getElementById('evdate_' + gid));
  const name = nameInput ? nameInput.value.trim() : '';
  const date = dateInput ? dateInput.value : '';
  if (!name || !date) return;
  const evs = getEvents(gid);
  evs.push({ id: Date.now().toString(), name, date, type: 'event', manual: true });
  evs.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  saveEvents(gid, evs); closeEventForm(gid); render();
}
/** @param {string} gid @param {string} eid */
function deleteEvent(gid, eid) {
  saveEvents(gid, getEvents(gid).filter(e => e.id !== eid)); render();
}

// ════════════════════════════════════════════
// ── CUSTOM TASK MANAGEMENT
// ════════════════════════════════════════════

// ── State accessors ──
/** @param {string} gid @returns {Task[]} */
function getCustomDailyDefs(gid) { const a = state['custom_daily_defs_' + gid]; return Array.isArray(a) ? a : []; }
/** @param {string} gid @returns {WeeklyTask[]} */
function getCustomWeeklyDefs(gid) { const a = state['custom_weekly_defs_' + gid]; return Array.isArray(a) ? a : []; }
/** @param {string} gid @returns {string[]} */
function getHiddenDailyTasks(gid) { const a = state['hidden_daily_' + gid]; return Array.isArray(a) ? a : []; }
/** @param {string} gid @returns {string[]} */
function getHiddenWeeklyTasks(gid) { const a = state['hidden_weekly_' + gid]; return Array.isArray(a) ? a : []; }

// ── Confirm modal ──
/** @type {(() => void) | null} */
let _confirmCallback = null;
/** 
 * @param {string} label
 * @param {() => void} onConfirm 
 */
function showConfirm(label, onConfirm) {
  _confirmCallback = onConfirm;
  const msgEl = document.getElementById('confirmMsg');
  if (msgEl) {
    msgEl.innerHTML =
      '确定要删除任务 <strong>「' + label + '」</strong> 吗？<br><span style="font-size:0.82rem;color:var(--dim);margin-top:4px;display:block;">此操作无法撤销。</span>';
  }
  const overlay = document.getElementById('confirmOverlay');
  if (overlay) overlay.classList.add('show');
}
function closeConfirm() {
  const overlay = document.getElementById('confirmOverlay');
  if (overlay) overlay.classList.remove('show');
  _confirmCallback = null;
}
function execConfirm() {
  if (_confirmCallback) _confirmCallback();
  closeConfirm();
}
// Close on backdrop click
document.addEventListener('click', function (e) {
  if (e.target === document.getElementById('confirmOverlay')) closeConfirm();
});

// ── ADD daily task form ──
/** @param {string} gid */
function toggleAddDailyForm(gid) {
  const f = document.getElementById('add_daily_form_' + gid);
  if (!f) return;
  f.classList.toggle('open');
  if (f.classList.contains('open')) {
    const inp = document.getElementById('add_daily_inp_' + gid);
    if (inp) inp.focus();
  }
}
/** @param {string} gid */
function closeAddDailyForm(gid) {
  const f = document.getElementById('add_daily_form_' + gid);
  if (!f) return;
  f.classList.remove('open');
  const inp = /** @type {HTMLInputElement | null} */ (document.getElementById('add_daily_inp_' + gid));
  const tag = /** @type {HTMLInputElement | null} */ (document.getElementById('add_daily_tag_' + gid));
  if (inp) inp.value = '';
  if (tag) tag.value = '';
}
/** @param {string} gid */
function saveAddDailyTask(gid) {
  const inp = /** @type {HTMLInputElement | null} */ (document.getElementById('add_daily_inp_' + gid));
  const tagInp = /** @type {HTMLInputElement | null} */ (document.getElementById('add_daily_tag_' + gid));
  const label = inp ? inp.value.trim() : '';
  if (!label) { if (inp) inp.focus(); return; }
  const tag = (tagInp ? tagInp.value.trim() : '') || '自定义';
  const defs = getCustomDailyDefs(gid);
  defs.push({ id: 'cd_' + gid + '_' + Date.now(), label, tag });
  state['custom_daily_defs_' + gid] = defs;
  saveState(); closeAddDailyForm(gid); render();
}

// ── ADD weekly task form ──
/** @param {string} gid */
function toggleAddWeeklyForm(gid) {
  const f = document.getElementById('add_weekly_form_' + gid);
  if (!f) return;
  f.classList.toggle('open');
  if (f.classList.contains('open')) {
    const inp = document.getElementById('add_weekly_inp_' + gid);
    if (inp) inp.focus();
  }
}
/** @param {string} gid */
function closeAddWeeklyForm(gid) {
  const f = document.getElementById('add_weekly_form_' + gid);
  if (!f) return;
  f.classList.remove('open');
  const inp = /** @type {HTMLInputElement | null} */ (document.getElementById('add_weekly_inp_' + gid));
  const tag = /** @type {HTMLInputElement | null} */ (document.getElementById('add_weekly_tag_' + gid));
  if (inp) inp.value = '';
  if (tag) tag.value = '';
}
/** @param {string} gid */
function saveAddWeeklyTask(gid) {
  const inp = /** @type {HTMLInputElement | null} */ (document.getElementById('add_weekly_inp_' + gid));
  const tagInp = /** @type {HTMLInputElement | null} */ (document.getElementById('add_weekly_tag_' + gid));
  const label = inp ? inp.value.trim() : '';
  if (!label) { if (inp) inp.focus(); return; }
  const tag = (tagInp ? tagInp.value.trim() : '') || '周常';
  const defs = getCustomWeeklyDefs(gid);
  defs.push({ id: 'cw_' + gid + '_' + Date.now(), label, tag });
  state['custom_weekly_defs_' + gid] = defs;
  saveState(); closeAddWeeklyForm(gid); render();
}

// ── DELETE daily task ──
// For built-in tasks: hide by adding tid to hidden list
// For custom tasks: remove from defs
/** @param {string} gid @param {string} tid @param {string} label */
function requestDeleteDailyTask(gid, tid, label) {
  showConfirm(label, () => {
    const hidden = getHiddenDailyTasks(gid);
    const customDefs = getCustomDailyDefs(gid);
    const isCustom = customDefs.some(t => t.id === tid);
    if (isCustom) {
      state['custom_daily_defs_' + gid] = customDefs.filter(t => t.id !== tid);
      delete state[tid];
    } else {
      if (!hidden.includes(tid)) hidden.push(tid);
      state['hidden_daily_' + gid] = hidden;
    }
    saveState(); render();
  });
}

// ── DELETE weekly task ──
/** @param {string} gid @param {string} tid @param {string} label */
function requestDeleteWeeklyTask(gid, tid, label) {
  showConfirm(label, () => {
    const hidden = getHiddenWeeklyTasks(gid);
    const customDefs = getCustomWeeklyDefs(gid);
    const isCustom = customDefs.some(t => t.id === tid);
    if (isCustom) {
      state['custom_weekly_defs_' + gid] = customDefs.filter(t => t.id !== tid);
      // Clean up all weekly completion states for this task
      Object.keys(state).forEach(k => { if (k.endsWith('_' + tid)) delete state[k]; });
    } else {
      if (!hidden.includes(tid)) hidden.push(tid);
      state['hidden_weekly_' + gid] = hidden;
    }
    saveState(); render();
  });
}


// ── Dynamic labels ──
/** @param {string=} type @returns {string} */
function getDynamicLabel(type) {
  return type || '';
}
/** @param {string=} type @returns {string} */
function getWeeklyDynamicLabel(type) {
  return type || '';
}

// ── Helpers ──
/** @param {string} dateStr @returns {number} ms timestamp of 4AM day after dateStr */
function getExpireMs(dateStr) {
  // Events expire at 4AM the day after their end date
  const end = new Date(dateStr);
  end.setDate(end.getDate() + 1);
  end.setHours(4, 0, 0, 0);
  return end.getTime();
}
/** @param {string} dateStr @returns {number} */
function daysUntil(dateStr) {
  return Math.ceil((getExpireMs(dateStr) - Date.now()) / 86400000);
}
/** @param {string} dateStr @returns {'urgent'|'warning'|''} */
function urgencyClass(dateStr) {
  const msLeft = getExpireMs(dateStr) - Date.now();
  if (msLeft <= 0) return '';
  if (msLeft <= 2 * 86400000) return 'urgent';
  if (msLeft <= 5 * 86400000) return 'warning';
  return '';
}
/** @param {string} dateStr @returns {string} human-readable countdown */
function countdownText(dateStr) {
  const msLeft = getExpireMs(dateStr) - Date.now();
  if (msLeft <= 0) return '已结束';
  const totalSecs = Math.floor(msLeft / 1000);
  const d = Math.floor(totalSecs / 86400);
  const h = Math.floor((totalSecs % 86400) / 3600);
  const m = Math.floor((totalSecs % 3600) / 60);
  if (d >= 1) return d + '天 ' + h + '时 ' + m + '分';
  const s = totalSecs % 60;
  if (h > 0) return h + '时 ' + m + '分';
  return m + '分 ' + s + '秒';
}

// ── Weekly reset logic (resets Monday 4AM) ──
// ════════════════════════════════════════════
// ── RESET SYSTEM — unified reset key factory
// ════════════════════════════════════════════

/**
 * @typedef {{ type: 'daily'|'weekly'|'bimonthly', resetHour?: number, resetDay?: number }} ResetConfig
 * @typedef {{ getKey: () => string, getDaysUntilReset: () => number, getResetLabel: () => string }} ResetSystem
 */

/**
 * Factory that creates a reset system for any period type.
 * Centralises all reset-boundary logic — daily, weekly, bimonthly all use the same pattern.
 * @param {ResetConfig} config
 * @returns {ResetSystem}
 */
function createResetSystem(config) {
  const { type, resetHour = 4, resetDay = 1 } = config;

  function getKey() {
    const now = getServerNow();
    if (type === 'daily') {
      return now.toISOString().split('T')[0];
    }
    if (type === 'weekly') {
      const day = now.getDay();
      const monday = new Date(now);
      monday.setDate(now.getDate() - (day === 0 ? 6 : day - 1));
      return monday.toISOString().split('T')[0];
    }
    if (type === 'bimonthly') {
      const year = now.getFullYear();
      const month = now.getMonth();
      const d = now.getDate();
      const period = d < 16 ? 1 : 16;
      return year + '-' + String(month + 1).padStart(2, '0') + '-' + String(period).padStart(2, '0');
    }
    return '';
  }

  function getDaysUntilReset() {
    const now = new Date();
    if (type === 'daily') {
      const next = new Date(now);
      next.setHours(resetHour, 0, 0, 0);
      if (now >= next) next.setDate(next.getDate() + 1);
      return Math.ceil((next.getTime() - now.getTime()) / 86400000);
    }
    if (type === 'weekly') {
      const day = now.getDay();
      return day === resetDay ? 7 : (resetDay - day + 7) % 7 || 7;
    }
    if (type === 'bimonthly') {
      const adj = getServerNow();
      const d = adj.getDate();
      const next = d < 16
        ? new Date(adj.getFullYear(), adj.getMonth(), 16, resetHour, 0, 0)
        : new Date(adj.getFullYear(), adj.getMonth() + 1, 1, resetHour, 0, 0);
      return Math.floor((next.getTime() - now.getTime()) / 86400000);
    }
    return 0;
  }

  function getResetLabel() {
    const days = getDaysUntilReset();
    if (days === 0) return '今日重置';
    if (days === 1) return '明天重置';
    return '还剩 ' + days + ' 天重置';
  }

  return { getKey, getDaysUntilReset, getResetLabel };
}

// Instantiate the three reset systems
const dailyReset = createResetSystem({ type: 'daily', resetHour: 4 });
const weeklyReset = createResetSystem({ type: 'weekly', resetHour: 4, resetDay: 1 });
const bimonthlyReset = createResetSystem({ type: 'bimonthly', resetHour: 4 });

function getWeekKey() { return weeklyReset.getKey(); }
/** @param {string} tid */
function toggleWeekly(tid) { dispatch({ type: 'TOGGLE_WEEKLY', tid }); }
/** @param {string} tid */
function isWeeklyDone(tid) {
  return !!state['w_' + getWeekKey() + '_' + tid];
}
/** @param {Game} game */
function getWeeklyProgress(game) {
  const hiddenW = getHiddenWeeklyTasks(game.id);
  const builtinVisible = (game.weekly || []).filter(t => !hiddenW.includes(t.id));
  const customW = getCustomWeeklyDefs(game.id);
  const allWeekly = [...builtinVisible, ...customW];
  if (!allWeekly.length) return null;
  const done = allWeekly.filter(t => isWeeklyDone(t.id)).length;
  return { done, total: allWeekly.length };
}
function getDaysUntilMonday() { return weeklyReset.getDaysUntilReset(); }

// ── Abyss (深境螺旋) reset logic — resets 1st and 16th of each month ──
function getAbyssKey() { return bimonthlyReset.getKey(); }
function toggleAbyss(tid) { dispatch({ type: 'TOGGLE_ABYSS', tid }); }
function isAbyssDone(tid) {
  return !!state['abyss_' + getAbyssKey() + '_' + tid];
}
function getAbyssResetLabel() { return bimonthlyReset.getResetLabel(); }

// ── Render helpers ──
/** @param {GameEvent} e @param {string} gid @param {boolean} isBanner @returns {string} */
function renderItem(e, gid, isBanner) {
  const urg = urgencyClass(e.date);
  const bannerCls = isBanner ? ' banner-item' : '';
  return '<div class="event-item' + (urg ? ' ' + urg : '') + bannerCls
    + '" data-expire="' + e.date + '" data-eid="' + e.id + '" data-gid="' + gid + '"'
    + ' onclick="openEvModal(\'' + e.id + '\',\'' + gid + '\')">'
    + '<div class="event-dot"></div>'
    + '<span class="event-name">' + e.name + '</span>'
    + '<span class="event-countdown">' + countdownText(e.date) + '</span>'
    + '<button class="event-delete" onclick="event.stopPropagation();deleteEvent(\'' + gid + '\',\'' + e.id + '\')" title="删除">×</button>'
    + '</div>';
}

// ── Profile management ──
/** @param {string} gid */
function openProfileModal(gid) {
  state.editingProfileGid = gid;
  render();
}

/** @param {HTMLElement} btn */
function addProfileStatRowLocal(btn) {
  const statsList = btn.parentElement ? btn.parentElement.previousElementSibling : null;
  if (!statsList) return;
  const row = document.createElement('div');
  row.className = 'stat-row-grp';
  row.style.marginBottom = '8px';
  row.innerHTML = '<input type="text" class="modal-input stat-key" placeholder="标签" style="width:70px; flex-shrink:0">'
    + '<input type="text" class="modal-input stat-val" placeholder="数值" style="flex:1">'
    + '<button class="task-del-btn" style="opacity:1; padding: 0 8px;" onclick="this.parentElement.remove()" title="删除">×</button>';
  statsList.appendChild(row);
}

/** @param {Event} e @param {string} gid */
function handleProfileAvatarUploadLocal(e, gid) {
  const target = /** @type {HTMLInputElement} */ (e.target);
  const file = target.files ? target.files[0] : null;
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function (evt) {
    if (!evt.target || typeof evt.target.result !== 'string') return;
    const img = new Image();
    img.onload = function () {
      const canvas = document.createElement('canvas');
      const MAX_SIZE = 120;
      let width = img.width;
      let height = img.height;

      if (width > height) {
        if (width > MAX_SIZE) {
          height *= MAX_SIZE / width;
          width = MAX_SIZE;
        }
      } else {
        if (height > MAX_SIZE) {
          width *= MAX_SIZE / height;
          height = MAX_SIZE;
        }
      }
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (ctx) ctx.drawImage(img, 0, 0, width, height);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.85);

      const avatarData = /** @type {HTMLInputElement | null} */ (document.getElementById('profileAvatarData'));
      if (avatarData) avatarData.value = dataUrl;
      const preview = /** @type {HTMLImageElement | null} */ (document.getElementById('profileAvatarPreview'));
      if (preview) {
        preview.src = dataUrl;
        preview.style.display = 'block';
      }
      const emoji = document.getElementById('profileAvatarEmoji');
      if (emoji) emoji.style.display = 'none';
    };
    img.src = evt.target.result;
  };
  reader.readAsDataURL(file);
}

function closeProfileModal() {
  state.editingProfileGid = null;
  render();
}

function saveProfileFromModal(gid) {
  const card = document.getElementById('profile_edit_card_' + gid);
  if (!card) return;

  /** @type {{label: string, value: string}[]} */
  const stats = [];
  card.querySelectorAll('.profileStatsList .stat-row-grp').forEach(row => {
    const kInput = /** @type {HTMLInputElement | null} */ (row.querySelector('.stat-key'));
    const vInput = /** @type {HTMLInputElement | null} */ (row.querySelector('.stat-val'));
    const k = kInput ? kInput.value.trim() : '';
    const v = vInput ? vInput.value.trim() : '';
    if (k || v) stats.push({ label: k, value: v });
  });

  const nameInput = /** @type {HTMLInputElement | null} */ (card.querySelector('.profileNameInput'));
  const uidInput = /** @type {HTMLInputElement | null} */ (card.querySelector('.profileUidInput'));
  const avatarInput = /** @type {HTMLInputElement | null} */ (card.querySelector('.inlineProfileAvatarData'));

  const profileData = {
    name: nameInput ? nameInput.value.trim() : '',
    uid: uidInput ? uidInput.value.trim() : '',
    avatar: avatarInput ? avatarInput.value : '',
    stats: stats
  };

  state['profile_' + gid] = profileData;
  saveState();
  closeProfileModal();
}

/** @param {Game} game */
function renderProfileCard(game) {
  if (!game.builtIn && !state['profile_' + game.id]) return ''; // Only show for built-in or if custom has data
  const def = game.profileDef || { level1: '等级1', level2: '等级2', currency: '资源', monthly: '月卡', pulls: '抽卡' };
  const p = state['profile_' + game.id] || { name: game.name, uid: '未设置' };

  let avatarHtml = '<div class="profile-avatar">' + game.icon + '</div>';
  if (p.avatar) {
    avatarHtml = '<div class="profile-avatar" style="background:transparent; padding:0;"><img src="' + p.avatar + '" style="width:100%; height:100%; object-fit:cover; border-radius:8px;"></div>';
  }

  let statsToRender = p.stats;
  if (!statsToRender) {
    statsToRender = [
      { label: def.level1, value: '-' },
      { label: def.level2, value: '-' },
      { label: '💰 ' + def.currency, value: '-' },
      { label: '🎫 ' + def.pulls, value: '-' },
      { label: '📅 ' + def.monthly, value: '-' }
    ];
  }

  if (state.editingProfileGid === game.id) {
    // Render INLINE EDIT mode
    let avatarPreviewObj = p.avatar ? '<img id="inlineProfileAvatarPreview_' + game.id + '" src="' + p.avatar + '" style="display:block; width:100%; height:100%; border-radius:8px; object-fit:cover;">'
      + '<div id="inlineProfileAvatarEmoji_' + game.id + '" style="font-size:1.5rem; display:none;">✦</div>'
      : '<img id="inlineProfileAvatarPreview_' + game.id + '" src="" style="display:none; width:100%; height:100%; border-radius:8px; object-fit:cover;">'
      + '<div id="inlineProfileAvatarEmoji_' + game.id + '" style="font-size:1.5rem; display:block;">' + game.icon + '</div>';

    let editStatsHtml = '<div class="profileStatsList" style="margin-bottom: 12px; max-height: 200px; overflow-y: auto; padding-right: 4px;">';
    statsToRender.forEach(s => {
      editStatsHtml += '<div class="stat-row-grp" style="margin-bottom:8px;">'
        + '<input type="text" class="modal-input stat-key" placeholder="标签" style="width:70px; flex-shrink:0; padding:6px 8px;" value="' + (s.label.replace(/"/g, '&quot;')) + '">'
        + '<input type="text" class="modal-input stat-val" placeholder="数值" style="flex:1; padding:6px 8px;" value="' + (s.value.replace(/"/g, '&quot;')) + '">'
        + '<button class="task-del-btn" style="opacity:1; padding: 0 8px;" onclick="this.parentElement.remove()" title="删除">×</button>'
        + '</div>';
    });
    editStatsHtml += '</div>';

    return '<div class="profile-card ' + game.cls + '" id="profile_edit_card_' + game.id + '" style="padding: 16px;">'
      + '<input type="hidden" class="inlineProfileAvatarData" id="inlineProfileAvatarData_' + game.id + '" value="' + (p.avatar || '') + '">'

      + '<div style="display:flex; gap:12px; margin-bottom:16px;">'
      + '<div class="profile-avatar-upload" style="width:50px; height:50px; min-width:50px;" onclick="document.getElementById(\'inlineProfileAvatarFile_' + game.id + '\').click()">'
      + avatarPreviewObj
      + '<div class="upload-hint" style="font-size:0.65rem;">头像</div>'
      + '</div>'
      + '<input type="file" id="inlineProfileAvatarFile_' + game.id + '" accept="image/*" style="display:none" onchange="handleProfileAvatarUploadLocal(event, \'' + game.id + '\')">'

      + '<div style="flex:1; display:flex; flex-direction:column; gap:8px;">'
      + '<input type="text" class="modal-input profileNameInput" placeholder="游戏昵称" style="padding:6px 10px; font-size:0.9rem;" value="' + (p.name || game.name) + '">'
      + '<input type="text" class="modal-input profileUidInput" placeholder="账号 UID" style="padding:6px 10px; font-size:0.8rem;" value="' + (p.uid || '') + '">'
      + '</div>'
      + '</div>'

      + editStatsHtml

      + '<div style="margin-bottom: 12px; text-align: center;">'
      + '<button class="btn-ghost" style="font-size: 0.8rem; width:100%; padding: 6px 0;" onclick="addProfileStatRowLocal(this)">+ 添加新项</button>'
      + '</div>'

      + '<div style="display:flex; gap:8px; justify-content: flex-end;">'
      + '<button class="add-task-form-cancel" style="padding:6px 16px; font-size:0.85rem;" onclick="closeProfileModal()">取消</button>'
      + '<button class="auth-btn signin" style="padding:6px 16px; font-size:0.85rem;" onclick="saveProfileFromModal(\'' + game.id + '\')">保存</button>'
      + '</div>'
      + '</div>';
  }

  // Render STATIC DISPLAY mode
  let statsHtml = '<div class="profile-stats" style="flex-wrap:wrap;">';
  statsToRender.forEach(s => {
    statsHtml += '<div class="profile-stat" style="min-width:45%; margin-bottom:8px;">'
      + '<span class="stat-label">' + s.label + '</span>'
      + '<span class="stat-value" style="font-size:0.85rem">' + (s.value || '-') + '</span>'
      + '</div>';
  });
  statsHtml += '</div>';

  return '<div class="profile-card ' + game.cls + '">'
    + '<div class="profile-header">'
    + avatarHtml
    + '<div class="profile-info">'
    + '<div style="display:flex; align-items:center;">'
    + '<div class="profile-name">' + (p.name || game.name) + '</div>'
    + '<button class="profile-edit-btn" onclick="openProfileModal(\'' + game.id + '\')" title="编辑档案">✎</button>'
    + '</div>'
    + '<div class="profile-uid">UID: ' + (p.uid || '未设置') + '</div>'
    + '</div>'
    + '</div>'
    + statsHtml
    + '</div>';
}

// ── Render ──
/** @param {Game} game */
function renderGameCard(game) {
  const hiddenD = getHiddenDailyTasks(game.id);
  const hiddenW = getHiddenWeeklyTasks(game.id);
  const customDaily = getCustomDailyDefs(game.id);
  const customWeekly = getCustomWeeklyDefs(game.id);

  const visibleBuiltinDaily = game.tasks.filter(t => !hiddenD.includes(t.id));
  const visibleBuiltinWeekly = (game.weekly || []).filter(t => !hiddenW.includes(t.id));
  const allDailyTasks = [...visibleBuiltinDaily, ...customDaily];
  const allWeeklyTasks = [...visibleBuiltinWeekly, ...customWeekly];

  const done = allDailyTasks.filter(t => state[t.id]).length;
  const total = allDailyTasks.length;
  const wDone = allWeeklyTasks.filter(t => isWeeklyDone(t.id)).length;
  const wTotal = allWeeklyTasks.length;
  const cDone = (game.cyclic || []).filter(t => isCyclicDone(t.id)).length;
  const cTotal = (game.cyclic || []).length;
  const abyssDone = game.abyss ? (isAbyssDone(game.abyss.id) ? 1 : 0) : 0;
  const abyssTotal = game.abyss ? 1 : 0;
  const allDone = done === total && wDone === wTotal && cDone === cTotal && abyssDone === abyssTotal;

  // Clean expired auto events, keep manual ones
  const allEvs = getEvents(game.id);
  const active = allEvs.filter(e => getExpireMs(e.date) > Date.now() || e.manual);
  if (active.length !== allEvs.length) saveEvents(game.id, active);

  const banners = active.filter(e => e.type === 'banner');
  const events = active.filter(e => e.type !== 'banner');

  const svgTick = '<svg class="checkmark" width="11" height="9" viewBox="0 0 11 9" fill="none"><path d="M1 4L4 7.5L10 1" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';

  // Daily tasks (built-in visible + custom)
  const tasksHtml = allDailyTasks.map(/** @param {Task} t */ t => {
    const checked = !!state[t.id];
    const label = t.dynamic ? getDynamicLabel(t.dynamic) : t.label;
    const tcls = 'task' + (checked ? ' done' : '');
    const safeLabel = label.replace(/'/g, "\\'");
    return '<div class="' + tcls + '" data-tid="' + t.id + '" onclick="toggleTask(this.dataset.tid)">'
      + '<div class="checkbox">' + svgTick + '</div>'
      + '<span class="task-label">' + label + '</span>'
      + '<span class="task-tag" style="background:rgba(255,255,255,0.05);color:var(--dim)">' + t.tag + '</span>'
      + '<button class="task-del-btn" onclick="event.stopPropagation();requestDeleteDailyTask(\'' + game.id + '\',\'' + t.id + '\',\'' + safeLabel + '\')" title="删除任务">×</button>'
      + '</div>';
  }).join('');

  // Add-daily-task form
  const addDailyFormHtml = '<div class="add-task-row">'
    + '<button class="add-task-trigger" onclick="toggleAddDailyForm(\'' + game.id + '\')">'
    + '<svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M6 1v10M1 6h10" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>'
    + ' 添加日常任务'
    + '</button>'
    + '</div>'
    + '<div class="add-task-form-wrap" id="add_daily_form_' + game.id + '">'
    + '<input type="text" class="inp-label" id="add_daily_inp_' + game.id + '" placeholder="任务名称…" onkeydown="if(event.key===\'Enter\')saveAddDailyTask(\'' + game.id + '\')">'
    + '<input type="text" class="inp-tag"   id="add_daily_tag_' + game.id + '" placeholder="标签"     onkeydown="if(event.key===\'Enter\')saveAddDailyTask(\'' + game.id + '\')">'
    + '<button class="add-task-form-save"   onclick="saveAddDailyTask(\'' + game.id + '\')">保存</button>'
    + '<button class="add-task-form-cancel" onclick="closeAddDailyForm(\'' + game.id + '\')">取消</button>'
    + '</div>';

  // ── Weekly tasks ──
  let weeklyHtml = '';
  if (allWeeklyTasks.length > 0) {
    const wp = getWeeklyProgress(game);
    const resetLabel = weeklyReset.getResetLabel();
    const svgCheck = '<svg class="checkmark" width="11" height="9" viewBox="0 0 11 9" fill="none"><path d="M1 4L4 7.5L10 1" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
    const weekTasksHtml = allWeeklyTasks.map(/** @param {WeeklyTask} t */ t => {
      const checked = isWeeklyDone(t.id);
      const label = t.dynamic ? getWeeklyDynamicLabel(t.dynamic) : t.label;
      const safeLabel = label.replace(/'/g, "\\'");
      return '<div class="' + (checked ? 'weekly-task done' : 'weekly-task') + '" data-wid="' + t.id + '" onclick="toggleWeekly(this.dataset.wid)">'
        + '<div class="checkbox">' + svgCheck + '</div>'
        + '<span class="task-label">' + label + '</span>'
        + '<span class="task-tag" style="background:rgba(255,255,255,0.05);color:var(--dim)">' + t.tag + '</span>'
        + '<button class="weekly-task-del-btn" onclick="event.stopPropagation();requestDeleteWeeklyTask(\'' + game.id + '\',\'' + t.id + '\',\'' + safeLabel + '\')" title="删除任务">×</button>'
        + '</div>';
    }).join('');

    const addWeeklyFormHtml = '<div class="add-weekly-task-row">'
      + '<button class="add-task-trigger" onclick="toggleAddWeeklyForm(\'' + game.id + '\')">'
      + '<svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M6 1v10M1 6h10" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>'
      + ' 添加周常任务'
      + '</button>'
      + '</div>'
      + '<div class="add-task-form-wrap" id="add_weekly_form_' + game.id + '">'
      + '<input type="text" class="inp-label" id="add_weekly_inp_' + game.id + '" placeholder="任务名称…" onkeydown="if(event.key===\'Enter\')saveAddWeeklyTask(\'' + game.id + '\')">'
      + '<input type="text" class="inp-tag"   id="add_weekly_tag_' + game.id + '" placeholder="标签"     onkeydown="if(event.key===\'Enter\')saveAddWeeklyTask(\'' + game.id + '\')">'
      + '<button class="add-task-form-save"   onclick="saveAddWeeklyTask(\'' + game.id + '\')">保存</button>'
      + '<button class="add-task-form-cancel" onclick="closeAddWeeklyForm(\'' + game.id + '\')">取消</button>'
      + '</div>';

    weeklyHtml = '<div class="weekly-section">'
      + '<div class="sub-section-header">'
      + '<span class="sub-section-title"><span>📅</span> 周常任务'
      + '<span class="weekly-reset">· ' + wp.done + '/' + wp.total + ' · ' + resetLabel + '</span>'
      + '</span>'
      + '</div>'
      + weekTasksHtml
      + addWeeklyFormHtml
      + '</div>';
  } else {
    // No weekly tasks yet — still show the add form
    const addWeeklyFormHtml = '<div class="add-weekly-task-row">'
      + '<button class="add-task-trigger" onclick="toggleAddWeeklyForm(\'' + game.id + '\')">'
      + '<svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M6 1v10M1 6h10" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>'
      + ' 添加周常任务'
      + '</button>'
      + '</div>'
      + '<div class="add-task-form-wrap" id="add_weekly_form_' + game.id + '">'
      + '<input type="text" class="inp-label" id="add_weekly_inp_' + game.id + '" placeholder="任务名称…" onkeydown="if(event.key===\'Enter\')saveAddWeeklyTask(\'' + game.id + '\')">'
      + '<input type="text" class="inp-tag"   id="add_weekly_tag_' + game.id + '" placeholder="标签"     onkeydown="if(event.key===\'Enter\')saveAddWeeklyTask(\'' + game.id + '\')">'
      + '<button class="add-task-form-save"   onclick="saveAddWeeklyTask(\'' + game.id + '\')">保存</button>'
      + '<button class="add-task-form-cancel" onclick="closeAddWeeklyForm(\'' + game.id + '\')">取消</button>'
      + '</div>';
    weeklyHtml = '<div class="weekly-section">'
      + '<div class="sub-section-header">'
      + '<span class="sub-section-title"><span>📅</span> 周常任务</span>'
      + '</div>'
      + addWeeklyFormHtml
      + '</div>';
  }

  // ── Cyclic section ──
  let cyclicSectionHtml = '';
  if (game.cyclic && game.cyclic.length > 0) {
    const svgCyc = '<svg class="checkmark" width="11" height="9" viewBox="0 0 11 9" fill="none"><path d="M1 4L4 7.5L10 1" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
    const cyclicItems = game.cyclic.map(/** @param {CyclicTask} t */ t => {
      const due = isCyclicDue(t);
      const doneCyc = isCyclicDone(t.id);
      const daysLeft = getCyclicDaysUntilDue(t);
      const subLabel = (!due && daysLeft > 0)
        ? '<span class="cyclic-countdown">' + daysLeft + '天后</span>' : '';
      return '<div class="weekly-task cyclic-task' + (doneCyc ? ' done' : '') + '" data-cid="' + t.id + '" onclick="toggleCyclic(this.dataset.cid)">'
        + '<div class="checkbox">' + svgCyc + '</div>'
        + '<span class="task-label">' + t.label + '</span>'
        + subLabel
        + '<span class="task-tag cyclic-tag">每' + t.days + '天</span>'
        + '</div>';
    }).join('');
    cyclicSectionHtml = '<div class="weekly-section cyclic-section">'
      + '<div class="sub-section-header">'
      + '<span class="sub-section-title"><span>🔄</span> 定时任务</span>'
      + '</div>'
      + cyclicItems
      + '</div>';
  }

  // ── Abyss section ──
  let abyssHtml = '';
  if (game.abyss) {
    const ab = game.abyss;
    const abDone = isAbyssDone(ab.id);
    const abResetLabel = getAbyssResetLabel();
    const svgCheckAb = '<svg class="checkmark" width="11" height="9" viewBox="0 0 11 9" fill="none"><path d="M1 4L4 7.5L10 1" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
    abyssHtml = '<div class="weekly-section abyss-section">'
      + '<div class="sub-section-header">'
      + '<span class="sub-section-title"><span>🌀</span> 深境螺旋'
      + '<span class="weekly-reset">· ' + abResetLabel + '</span>'
      + '</span>'
      + '</div>'
      + '<div class="' + (abDone ? 'weekly-task done' : 'weekly-task') + '" data-abid="' + ab.id + '" onclick="toggleAbyss(this.dataset.abid)">'
      + '<div class="checkbox">' + svgCheckAb + '</div>'
      + '<span class="task-label">' + ab.label + '</span>'
      + '<span class="task-tag" style="background:rgba(245,197,24,0.1);color:var(--gi)">双周</span>'
      + '</div>'
      + '</div>';
  }

  const todayStr = new Date().toISOString().split('T')[0];
  const bannersHtml = banners.length === 0
    ? '<div class="no-events">暂无卡池数据</div>'
    : banners.map(e => renderItem(e, game.id, true)).join('');
  const eventsHtml = events.length === 0
    ? '<div class="no-events">暂无活动数据</div>'
    : events.map(e => renderItem(e, game.id, false)).join('');

  const hideEvents = !!state['hide_events_' + game.id];

  const removable = !game.builtIn;
  const cardCls = 'game-card ' + game.cls + (allDone ? ' all-done' : '');
  const deleteBtn = removable
    ? '<button class="task-del-btn" style="opacity:1;margin-left:6px;" onclick="event.stopPropagation();requestDeleteGame(\'' + game.id + '\')" title="删除游戏">×</button>'
    : '';

  // Events section (can be hidden per game)
  let eventsSectionHtml;
  if (hideEvents) {
    eventsSectionHtml = '<div class="events-section events-section-hidden">'
      + '<div class="sub-section-header">'
      + '<span class="sub-section-title"><span>🎯</span> 卡池 / 活动已隐藏</span>'
      + '<button class="add-event-btn" onclick="toggleEventsHidden(\'' + game.id + '\')">显示区块</button>'
      + '</div>'
      + '</div>';
  } else {
    eventsSectionHtml = '<div class="events-section">'
      + '<div class="sub-section">'
      + '<div class="sub-section-header">'
      + '<span class="sub-section-title"><span>🎴</span> 当前卡池 / 寻访</span>'
      + '<div style="display:flex;align-items:center;gap:6px;">'
      + '<button class="add-banner-btn" onclick="toggleBannerForm(\'' + game.id + '\')">+ 手动添加</button>'
      + '<button class="add-event-btn" style="opacity:0.7;" onclick="toggleEventsHidden(\'' + game.id + '\')">隐藏区块</button>'
      + '</div>'
      + '</div>'
      + '<div class="event-list">' + bannersHtml + '</div>'
      + '<div class="event-form banner-form" id="bnform_' + game.id + '">'
      + '<input type="text" id="bninput_' + game.id + '" placeholder="卡池 / 角色名称…" onkeydown="if(event.key===\'Enter\')addBanner(\'' + game.id + '\')">'
      + '<input type="date" id="bndate_' + game.id + '" min="' + todayStr + '">'
      + '<button class="event-form-save" onclick="addBanner(\'' + game.id + '\')">保存</button>'
      + '<button class="event-form-cancel" onclick="closeBannerForm(\'' + game.id + '\')">取消</button>'
      + '</div>'
      + '</div>'
      + '<div class="sub-section-divider"></div>'
      + '<div class="sub-section">'
      + '<div class="sub-section-header">'
      + '<span class="sub-section-title"><span>🎯</span> 限时活动</span>'
      + '<button class="add-event-btn" onclick="toggleEventForm(\'' + game.id + '\')">+ 手动添加</button>'
      + '</div>'
      + '<div class="event-list">' + eventsHtml + '</div>'
      + '<div class="event-form" id="evform_' + game.id + '">'
      + '<input type="text" id="evinput_' + game.id + '" placeholder="活动名称…" onkeydown="if(event.key===\'Enter\')addEvent(\'' + game.id + '\')">'
      + '<input type="date" id="evdate_' + game.id + '" min="' + todayStr + '">'
      + '<button class="event-form-save" onclick="addEvent(\'' + game.id + '\')">保存</button>'
      + '<button class="event-form-cancel" onclick="closeEventForm(\'' + game.id + '\')">取消</button>'
      + '</div>'
      + '</div>'
      + '</div>';
  }

  return '<div class="' + cardCls + '">'
    + '<div class="game-header" onclick="toggleCollapse(\'' + game.id + '\')">'
    + '<div class="game-icon">' + game.icon + '</div>'
    + '<div class="game-title">' + game.name + '</div>'
    + '<div class="game-progress">' + (done + wDone + cDone + abyssDone) + '/' + (total + wTotal + cTotal + abyssTotal) + '</div>'
    + deleteBtn
    + '<svg class="chevron" viewBox="0 0 16 16" fill="none"><path d="M4 6L8 10L12 6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>'
    + '</div>'
    + '<div class="tasks">' + tasksHtml + '</div>'
    + addDailyFormHtml
    + '<div class="all-done-badge"><span class="pulse">✦</span> 所有任务已完成 — 干得漂亮！</div>'
    + weeklyHtml
    + cyclicSectionHtml
    + abyssHtml
    + eventsSectionHtml
    + '</div>';
}

function render() {
  const container = document.getElementById('gamesContainer');

  let totalDone = 0, totalAll = 0;
  getAllGames().all.forEach(game => {
    const hiddenD = getHiddenDailyTasks(game.id);
    const hiddenW = getHiddenWeeklyTasks(game.id);
    const customDaily = getCustomDailyDefs(game.id);
    const customWeekly = getCustomWeeklyDefs(game.id);
    const visibleDaily = [...game.tasks.filter(t => !hiddenD.includes(t.id)), ...customDaily];
    const visibleWeekly = [...(game.weekly || []).filter(t => !hiddenW.includes(t.id)), ...customWeekly];

    totalDone += visibleDaily.filter(t => state[t.id]).length
      + visibleWeekly.filter(t => isWeeklyDone(t.id)).length
      + (game.cyclic || []).filter(t => isCyclicDone(t.id)).length
      + (game.abyss ? (isAbyssDone(game.abyss.id) ? 1 : 0) : 0);
    totalAll += visibleDaily.length
      + visibleWeekly.length
      + (game.cyclic || []).length
      + (game.abyss ? 1 : 0);
  });

  container.innerHTML = getAllGames().all.map(renderGameCard).join('');

  const profilesContainer = document.getElementById('profilesContainer');
  if (profilesContainer) {
    let profilesHtml = '<div class="section-title">游戏档案 PROFILES</div>';
    profilesHtml += getAllGames().all.map(g => renderProfileCard(g)).join('');
    profilesContainer.innerHTML = profilesHtml;
  }

  getAllGames().all.forEach(g => {
    if (state['_collapsed_' + g.id]) {
      const card = container.querySelector('.game-card.' + g.cls);
      if (card) card.classList.add('collapsed');
    }
  });

  const pct = totalAll ? (totalDone / totalAll * 100) : 0;
  document.getElementById('globalBar').style.width = pct + '%';
  document.getElementById('globalCount').textContent = totalDone + ' / ' + totalAll;

  // Pure UI: check completion but dispatch the action, don't mutate state here
  if (totalDone === totalAll && totalAll > 0 && !state._celebrated) {
    dispatch({ type: 'CELEBRATE' });
  }
}

/**
 * Central action dispatcher — the only place that mutates state then re-renders.
 * UI calls dispatch(action); logic updates state; render() reflects it.
 * @param {{ type: string, [key: string]: any }} action
 */
function dispatch(action) {
  switch (action.type) {
    case 'TOGGLE_TASK':
      state[action.tid] = !state[action.tid];
      saveState(); render(); break;
    case 'TOGGLE_WEEKLY':
      state['w_' + getWeekKey() + '_' + action.tid] = !state['w_' + getWeekKey() + '_' + action.tid];
      saveState(); render(); break;
    case 'TOGGLE_CYCLIC': {
      const key = 'cyclic_' + action.tid + '_lastDone';
      if (isCyclicDone(action.tid)) { delete state[key]; } else { state[key] = getResetDate(); }
      saveState(); render(); break;
    }
    case 'TOGGLE_ABYSS':
      state['abyss_' + getAbyssKey() + '_' + action.tid] = !state['abyss_' + getAbyssKey() + '_' + action.tid];
      saveState(); render(); break;
    case 'TOGGLE_COLLAPSE': {
      const colKey = '_collapsed_' + action.gid;
      state[colKey] = !state[colKey]; saveState();
      const g = getAllGames().all.find(x => x.id === action.gid);
      const card = document.querySelector('.game-card.' + g.cls);
      if (card) card.classList.toggle('collapsed', !!state[colKey]);
      break;
    }
    case 'CELEBRATE':
      if (!state._celebrated) {
        state._celebrated = true; saveState();
        setTimeout(() => document.getElementById('completionOverlay').classList.add('show'), 400);
      }
      break;
    default:
      console.warn('Unknown action:', action.type);
  }
}
/** @param {string} gid */
function toggleCollapse(gid) { dispatch({ type: 'TOGGLE_COLLAPSE', gid }); }

function toggleEventsHidden(gid) {
  const key = 'hide_events_' + gid;
  state[key] = !state[key];
  saveState();
  render();
}

// ── Custom game management ──
function openAddGameModal() {
  var ov = document.getElementById('gameModalOverlay');
  if (!ov) return;
  const gameNameInput = /** @type {HTMLInputElement | null} */ (document.getElementById('gameNameInput'));
  const gameIconInput = /** @type {HTMLInputElement | null} */ (document.getElementById('gameIconInput'));
  const gameIdInput = /** @type {HTMLInputElement | null} */ (document.getElementById('gameIdInput'));
  if (gameNameInput) gameNameInput.value = '';
  if (gameIconInput) gameIconInput.value = '';
  if (gameIdInput) gameIdInput.value = '';
  ov.classList.add('show');
  if (gameNameInput) gameNameInput.focus();
}
function closeGameModal() {
  var ov = document.getElementById('gameModalOverlay');
  if (ov) ov.classList.remove('show');
}
/** @param {string} raw @returns {string} */
function normalizeGameId(raw) {
  return raw.toLowerCase().replace(/[^a-z0-9_]/g, '_');
}
function saveCustomGameFromModal() {
  const gameNameInput = /** @type {HTMLInputElement | null} */ (document.getElementById('gameNameInput'));
  const gameIconInput = /** @type {HTMLInputElement | null} */ (document.getElementById('gameIconInput'));
  const gameIdInput = /** @type {HTMLInputElement | null} */ (document.getElementById('gameIdInput'));

  var name = gameNameInput ? gameNameInput.value.trim() : '';
  var icon = (gameIconInput ? gameIconInput.value.trim() : '') || '🎮';
  var rawId = (gameIdInput ? gameIdInput.value.trim() : '') || name;
  if (!name || !rawId) {
    if (gameNameInput) gameNameInput.focus();
    return;
  }
  var id = normalizeGameId(rawId);
  if (!id) return;

  var all = getAllGames().all;
  if (all.some(function (g) { return g.id === id; })) {
    alert('已存在相同 ID 的游戏：' + id + '，请换一个简称。');
    return;
  }
  var cls = 'g_' + id;
  var game = {
    id: id,
    name: name,
    icon: icon,
    cls: cls,
    searchName: name,
    tasks: [],
    weekly: [],
    builtIn: false
  };
  var custom = getCustomGames();
  custom.push(game);
  setCustomGames(custom);
  closeGameModal();
  render();
}
function requestDeleteGame(gid) {
  var all = getAllGames();
  var target = all.custom.find(function (g) { return g.id === gid; });
  if (!target) return;
  showConfirm('删除游戏「' + target.name + '」', function () {
    // remove from custom list
    var remaining = all.custom.filter(function (g) { return g.id !== gid; });
    setCustomGames(remaining);
    // clean up per-game state keys
    Object.keys(state).forEach(function (k) {
      if (k.indexOf('_' + gid) !== -1 || k.indexOf(gid + '_') !== -1 || k === 'events_' + gid || k === '_collapsed_' + gid) {
        delete state[k];
      }
    });
    saveState();
    render();
  });
}

function updateDate() {
  document.getElementById('dateDisplay').textContent = new Date().toLocaleDateString('zh-CN', {
    weekday: 'short', month: 'long', day: 'numeric'
  });
}

// ── Reset countdown timer ──
function updateResetTimer() {
  const now = new Date();
  const next4AM = new Date(now);
  next4AM.setHours(4, 0, 0, 0);
  if (now >= next4AM) next4AM.setDate(next4AM.getDate() + 1);
  const msLeft = next4AM - now;
  const totalSecs = Math.floor(msLeft / 1000);
  const h = Math.floor(totalSecs / 3600);
  const m = Math.floor((totalSecs % 3600) / 60);
  const s = totalSecs % 60;
  const pad = n => String(n).padStart(2, '0');
  document.getElementById('t-h').textContent = pad(h);
  document.getElementById('t-m').textContent = pad(m);
  document.getElementById('t-s').textContent = pad(s);
  // Turn red when under 1 hour
  const digits = document.getElementById('timerDigits');
  if (msLeft <= 3600000) digits.classList.add('timer-urgent');
  else digits.classList.remove('timer-urgent');
}
setInterval(updateResetTimer, 1000);

// ── Init ──
fetch('banners.json')
  .then(r => r.json())
  .then(data => {
    ['gi', 'zzz', 'ww', 'ak'].forEach(gid => {
      if (Array.isArray(data[gid])) AUTO_BANNERS[gid] = data[gid];
    });
    // Populate EVENT_DETAIL_MAP now that AUTO_BANNERS has real data
    Object.values(AUTO_BANNERS).flat().forEach(e => { EVENT_DETAIL_MAP[e.id] = e; });
  })
  .catch(() => { /* silently keep hardcoded fallback */ })
  .finally(() => {
    loadState();
    mergeAutoBanners();
    saveState();
    render();
  });
updateDate();
updateResetTimer();


// ── Smart ticker ──
// Items > 1 day away: update every 60s (no need to show seconds)
// Items < 1 day away: update every 1s (shows HH:MM:SS precision)
// This avoids 4-game × N-events × 1s DOM updates when not needed.

const DAY_MS = 86400000;

/** Refresh countdown text + urgency class on a single event DOM element
 * @param {HTMLElement} el
 */
function tickEventItem(el) {
  const dateStr = el.getAttribute('data-expire');
  if (!dateStr) return;
  const span = el.querySelector('.event-countdown');
  if (span) span.textContent = countdownText(dateStr);
  const urg = urgencyClass(dateStr);
  el.classList.toggle('urgent', urg === 'urgent');
  el.classList.toggle('warning', urg === 'warning');

  // If inline detail is open right under this item, refresh its countdown too
  const next = el.nextElementSibling;
  if (next && next.classList && next.classList.contains('event-detail')) {
    const cd = next.querySelector('.event-detail-countdown');
    if (cd) cd.textContent = '⏱ 剩余时间：' + countdownText(dateStr);
  }
}

// Fast ticker: runs every second, only updates items < 1 day away
setInterval(() => {
  document.querySelectorAll('.event-item[data-expire]').forEach(el => {
    const htmlEl = /** @type {HTMLElement} */ (el);
    const expire = htmlEl.getAttribute('data-expire');
    if (!expire) return;
    const msLeft = getExpireMs(expire) - Date.now();
    if (msLeft < DAY_MS) tickEventItem(htmlEl);
  });
}, 1000);

// Slow ticker: runs every 60s, updates items >= 1 day away
setInterval(() => {
  document.querySelectorAll('.event-item[data-expire]').forEach(el => {
    const htmlEl = /** @type {HTMLElement} */ (el);
    const expire = htmlEl.getAttribute('data-expire');
    if (!expire) return;
    const msLeft = getExpireMs(expire) - Date.now();
    if (msLeft >= DAY_MS) tickEventItem(htmlEl);
  });
}, 60000);

// ════════════════════════════════════════════
// ── FIREBASE — see <script type="module"> below
// ════════════════════════════════════════════

// ══════════════════════════════════════════════════════
// ── PATCH REMINDER SYSTEM
// ══════════════════════════════════════════════════════

window.state = state;
window.saveState = saveState;
window.render = render;
