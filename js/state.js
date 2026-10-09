import { db } from './db.js';

export const DAY_NAMES = ['Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi', 'Pazar'];
export const DAY_SHORT = ['Pt', 'Sa', 'Ça', 'Pe', 'Cu', 'Ct', 'Pa'];
export const MONTHS = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];
export const LEVELS = [
  { xp: 0, name: 'Başlangıç' }, { xp: 300, name: 'Hareket' }, { xp: 800, name: 'Şekillenen' },
  { xp: 1500, name: 'Sıkılaşan' }, { xp: 2500, name: 'Belirgin' }, { xp: 3800, name: 'Atlet' }, { xp: 5500, name: 'Dönüşmüş' },
];
export const XP = { good: 40, partial: 15, photo: 10, note: 5, walk: 50, workout: 80, stars: 10, weigh: 100, perKg: 100 };

export const DEFAULT_MEALS = [
  { id: 'kahvalti', name: 'Kahvaltı', type: 'ana', time: '08:30' },
  { id: 'ara1', name: 'Ara öğün', type: 'ara', time: '11:00' },
  { id: 'ogle', name: 'Öğle', type: 'ana', time: '13:30' },
  { id: 'ara2', name: 'Ara öğün', type: 'ara', time: '16:30' },
  { id: 'aksam', name: 'Akşam', type: 'ana', time: '19:30' },
];

export const S = {
  settings: null,
  days: {},     // 'YYYY-MM-DD' -> day record
  plans: {},    // weekKey -> { days: { 0..6: [meal] } }
  weights: {},  // 'YYYY-MM-DD' -> kg
  loaded: false,
};

// ---------- dates ----------
export const pad = n => String(n).padStart(2, '0');
export const dkey = (d = new Date()) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const fromKey = k => { const [y, m, d] = k.split('-').map(Number); return new Date(y, m - 1, d); };
export const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
export const dow = d => (d.getDay() + 6) % 7; // Monday = 0
export const weekStart = d => addDays(d, -dow(d));
export const weekKey = d => dkey(weekStart(d));
export const todayKey = () => dkey(new Date());
export const fmtDate = d => `${DAY_NAMES[dow(d)]}, ${d.getDate()} ${MONTHS[d.getMonth()]}`;
export const fmtKg = v => (Math.round(v * 10) / 10).toLocaleString('tr-TR', { minimumFractionDigits: 1, maximumFractionDigits: 1 });

// ---------- load/save ----------
export async function load() {
  S.settings = (await db.get('kv', 'settings')) || null;
  S.days = await db.all('days');
  S.plans = await db.all('plans');
  S.weights = await db.all('weights');
  S.loaded = true;
}
export async function saveSettings(s) { S.settings = s; await db.set('kv', 'settings', s); }
export async function saveDay(key, rec) { S.days[key] = rec; await db.set('days', key, rec); }
export async function savePlan(wk, plan) { S.plans[wk] = plan; await db.set('plans', wk, plan); }
export async function saveWeight(key, kg) { S.weights[key] = kg; await db.set('weights', key, kg); }
export async function deleteWeight(key) { delete S.weights[key]; await db.del('weights', key); }

export function day(key) {
  return S.days[key] || { meals: {}, walk: 0, workout: false, stars: 0, note: '' };
}

// ---------- plan ----------
export function newWeekPlan(fromPlan) {
  const days = {};
  for (let i = 0; i < 7; i++) {
    days[i] = (fromPlan && fromPlan.days[i] ? fromPlan.days[i] : DEFAULT_MEALS).map(m => ({ ...m, options: fromPlan ? [...(m.options || [])] : [] }));
  }
  return { days };
}
export function planFor(date) {
  const wk = weekKey(date);
  if (S.plans[wk]) return S.plans[wk];
  // fall back to the latest earlier plan's structure (empty options) for display
  const keys = Object.keys(S.plans).sort();
  const prev = keys.filter(k => k < wk).pop();
  return newWeekPlan(prev ? S.plans[prev] : null);
}
export function mealsFor(date) {
  const p = planFor(date);
  return p.days[dow(date)] || [];
}

// ---------- scoring ----------
export function mealStats(key) {
  const d = day(key);
  const meals = mealsFor(fromKey(key));
  let sum = 0, cnt = 0, logged = 0, joker = 0;
  for (const m of meals) {
    const st = d.meals[m.id]?.status;
    if (!st) continue;
    logged++;
    if (st === 'joker') { joker++; continue; }
    cnt++;
    if (st === 'good') sum += 1; else if (st === 'partial') sum += 0.5;
  }
  return { total: meals.length, logged, pct: cnt ? sum / cnt : (logged ? 1 : 0), joker, allLogged: meals.length > 0 && logged >= meals.length };
}
export function isWorkoutDay(date) { return (S.settings?.workoutDays || []).includes(dow(date)); }
export function dayScore(key) {
  const d = day(key), st = S.settings || {};
  const ms = mealStats(key);
  const goal = st.walkGoal || 30;
  const walkPart = Math.min(1, (d.walk || 0) / goal);
  const wd = isWorkoutDay(fromKey(key));
  let score;
  if (wd) score = 0.65 * ms.pct + 0.2 * walkPart + 0.15 * (d.workout ? 1 : 0);
  else score = 0.75 * ms.pct + 0.25 * walkPart + (d.workout ? 0.05 : 0);
  score = Math.min(1, score);
  const grade = score >= 0.9 ? 'A' : score >= 0.75 ? 'B' : score >= 0.6 ? 'C' : 'D';
  const clean = ms.allLogged && ms.pct >= 0.8;
  const color = !ms.logged && !d.walk && !d.workout ? '' : (clean && walkPart >= 1 ? 'g' : (ms.pct >= 0.5 ? 'y' : 'r'));
  return { score, grade, clean, color, ms, walkPart };
}
export function dayXP(key) {
  const d = day(key);
  let xp = 0;
  for (const id in d.meals) {
    const m = d.meals[id];
    if (m.status === 'good') xp += XP.good; else if (m.status === 'partial') xp += XP.partial;
    if (m.photos?.length) xp += XP.photo * Math.min(2, m.photos.length);
    if (m.note) xp += XP.note;
  }
  if ((d.walk || 0) >= (S.settings?.walkGoal || 30)) xp += XP.walk;
  if (d.workout) xp += XP.workout;
  if (d.stars) xp += XP.stars;
  return xp;
}
export function totalXP() {
  let xp = 0;
  for (const k in S.days) xp += dayXP(k);
  const wk = Object.keys(S.weights).sort();
  xp += wk.length * XP.weigh;
  if (wk.length && S.settings) {
    const lost = S.settings.startWeight - S.weights[wk[wk.length - 1]];
    if (lost > 0) xp += Math.round(lost * XP.perKg);
  }
  return xp;
}
export function levelInfo(xp = totalXP()) {
  let i = 0;
  while (i + 1 < LEVELS.length && xp >= LEVELS[i + 1].xp) i++;
  const cur = LEVELS[i], next = LEVELS[i + 1];
  return { level: i + 1, name: cur.name, xp, next: next ? next.xp : null, pct: next ? (xp - cur.xp) / (next.xp - cur.xp) : 1 };
}

// ---------- chains ----------
export function walkStreak() {
  const goal = S.settings?.walkGoal || 30;
  let d = new Date(), n = 0;
  if ((day(dkey(d)).walk || 0) < goal) d = addDays(d, -1); // today still open
  while ((day(dkey(d)).walk || 0) >= goal) { n++; d = addDays(d, -1); if (n > 3650) break; }
  return n;
}
export function cleanStreak() {
  let d = new Date(), n = 0;
  if (!dayScore(dkey(d)).clean) d = addDays(d, -1);
  while (dayScore(dkey(d)).clean) { n++; d = addDays(d, -1); if (n > 3650) break; }
  return n;
}
export function workoutsInWeek(date) {
  const ws = weekStart(date);
  let n = 0;
  for (let i = 0; i < 7; i++) if (day(dkey(addDays(ws, i))).workout) n++;
  return n;
}
export function workoutStreak() {
  let ws = weekStart(new Date()), n = 0;
  if (workoutsInWeek(ws) < 2) ws = addDays(ws, -7); // current week still open
  while (workoutsInWeek(ws) >= 2) { n++; ws = addDays(ws, -7); if (n > 520) break; }
  return n;
}
export function jokerUsedThisWeek(date = new Date()) {
  const ws = weekStart(date);
  for (let i = 0; i < 7; i++) {
    const d = day(dkey(addDays(ws, i)));
    for (const id in d.meals) if (d.meals[id].status === 'joker') return true;
  }
  return false;
}

// ---------- weight ----------
export function latestWeight() {
  const ks = Object.keys(S.weights).sort();
  return ks.length ? { key: ks[ks.length - 1], kg: S.weights[ks[ks.length - 1]] } : null;
}
export function weightProgress() {
  const st = S.settings; if (!st) return 0;
  const lw = latestWeight();
  const cur = lw ? lw.kg : st.startWeight;
  const total = st.startWeight - st.targetWeight;
  if (total <= 0) return 1;
  return Math.max(0, Math.min(1, (st.startWeight - cur) / total));
}

// ---------- avatar ----------
export function fitness() {
  const goal = S.settings?.walkGoal || 30;
  let walkDays = 0, workouts = 0;
  for (let i = 0; i < 14; i++) {
    const d = day(dkey(addDays(new Date(), -i)));
    if ((d.walk || 0) >= goal) walkDays++;
    if (d.workout) workouts++;
  }
  const train = Math.min(1, (walkDays / 14) * 0.5 + Math.min(1, workouts / 4) * 0.5);
  return Math.max(0, Math.min(1, 0.6 * weightProgress() + 0.4 * train));
}
export function mood() {
  const t = todayKey(), y = dkey(addDays(new Date(), -1));
  const base = 0.35 + 0.3 * (S.days[y] ? dayScore(y).score : 0.5);
  const d = day(t);
  let m = base;
  for (const id in d.meals) {
    const st = d.meals[id].status;
    if (st === 'good') m += 0.12; else if (st === 'partial') m += 0.04; else if (st === 'bad') m -= 0.2;
  }
  if ((d.walk || 0) >= (S.settings?.walkGoal || 30)) m += 0.15; else if (d.walk) m += 0.05;
  if (d.workout) m += 0.1;
  return Math.max(0, Math.min(1, m));
}

// ---------- badges ----------
export const BADGES = [
  { id: 'first-weigh', em: '⚖️', name: 'İlk tartı', test: () => Object.keys(S.weights).length >= 1 },
  { id: 'kg1', em: '🎯', name: '−1 kg', test: () => lost() >= 1 },
  { id: 'kg5', em: '🔥', name: '−5 kg', test: () => lost() >= 5 },
  { id: 'half', em: '🏔️', name: 'Yarı yol', test: () => weightProgress() >= 0.5 },
  { id: 'goal', em: '🏆', name: 'Hedef: 90', test: () => weightProgress() >= 1 },
  { id: 'walk7', em: '🚶', name: '7 gün yürüyüş', test: () => walkStreak() >= 7 },
  { id: 'walk30', em: '🏃', name: '30 gün yürüyüş', test: () => walkStreak() >= 30 },
  { id: 'wo2', em: '🏋️', name: 'İlk 2/2 hafta', test: () => workoutStreak() >= 1 },
  { id: 'wo4', em: '💪', name: '4 hafta antrenman', test: () => workoutStreak() >= 4 },
  { id: 'clean7', em: '🥗', name: '7 temiz gün', test: () => cleanStreak() >= 7 },
  { id: 'photo10', em: '📷', name: '10 fotoğraf', test: () => photoCount() >= 10 },
  { id: 'lv3', em: '⭐', name: 'Seviye 3', test: () => levelInfo().level >= 3 },
  { id: 'lv5', em: '🌟', name: 'Seviye 5', test: () => levelInfo().level >= 5 },
  { id: 'nojoker', em: '🃏', name: 'Jokersiz hafta', test: () => {
      const ws = addDays(weekStart(new Date()), -7);
      let any = false;
      for (let i = 0; i < 7; i++) if (S.days[dkey(addDays(ws, i))]) any = true;
      return any && !jokerUsedThisWeek(ws);
    } },
];
function lost() { const lw = latestWeight(); return lw && S.settings ? S.settings.startWeight - lw.kg : 0; }
function photoCount() { let n = 0; for (const k in S.days) for (const id in S.days[k].meals) n += S.days[k].meals[id].photos?.length || 0; return n; }
export function earnedBadges() { return BADGES.filter(b => { try { return b.test(); } catch { return false; } }).map(b => b.id); }
