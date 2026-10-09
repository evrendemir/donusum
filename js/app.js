import { S, load, saveSettings, savePlan, newWeekPlan, weekKey, todayKey } from './state.js';
import { $, $$, esc, toast } from './ui.js';
import { avatarSVG } from './avatar.js';
import { renderToday, setDate } from './screen-today.js';
import { renderWeek } from './screen-week.js';
import { renderPlan } from './screen-plan.js';
import { renderMe, settingsForm, readSettingsForm, bindDayPickers } from './screen-me.js';

const screen = $('#screen'), nav = $('#nav');
let route = 'today';

export function go(r, arg) {
  route = r;
  $$('.nav-btn').forEach(b => b.classList.toggle('active', b.dataset.route === r));
  window.scrollTo(0, 0);
  if (r === 'today') { if (arg) setDate(arg); renderToday(screen); }
  else if (r === 'week') renderWeek(screen, go);
  else if (r === 'plan') renderPlan(screen);
  else if (r === 'me') renderMe(screen, go);
}

function onboarding() {
  nav.hidden = true;
  screen.innerHTML = `<div class="onb">
    <div class="stage" style="height:230px"><div class="grass"></div><div class="cloud" style="left:22px;top:16px;width:56px;height:18px"></div>
      <div style="position:absolute;left:2px;top:10px;width:176px;height:213px">${avatarSVG(0.1, 0.45, '')}</div>
      <div class="side"><div class="bubble">Merhaba! Ben senin maskotunum. Sen iyi beslenip yürüdükçe ben de değişeceğim. Hadi başlayalım.</div></div></div>
    <h1 style="font-size:28px;margin-top:16px">Dönüşüm'e hoş geldin</h1>
    <p class="lead">Birkaç bilgi: hedefin, tartı günün ve antrenman günlerin. Hepsini sonra "Ben" sekmesinden değiştirebilirsin. Veriler sadece bu telefonda kalır.</p>
    <div class="card" id="onbform">${settingsForm({ targetWeight: 90, walkGoal: 30, workoutDays: [1, 4], weighDay: 0 }, true)}
    <button class="btn orange" data-start>Başla 🚀</button></div></div>`;
  bindDayPickers(screen);
  screen.onclick = async e => {
    if (!e.target.closest('[data-start]')) return;
    const s = readSettingsForm($('#onbform', screen));
    if (!s) return toast('Başlangıç kilonu gir (ör. 104,0)');
    s.onboarded = true;
    await saveSettings(s);
    if (!S.plans[weekKey(new Date())]) await savePlan(weekKey(new Date()), newWeekPlan(null));
    nav.hidden = false;
    toast(`Hoş geldin ${s.name}! Önce Plan sekmesinden diyetisyenin listesini ekle.`, 4000);
    go('plan');
  };
}

async function init() {
  await load();
  nav.onclick = e => { const b = e.target.closest('[data-route]'); if (b) go(b.dataset.route); };
  if (!S.settings?.onboarded) return onboarding();
  nav.hidden = false;
  go('today');
  if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => {});
  // iOS install hint
  const standalone = window.navigator.standalone || matchMedia('(display-mode: standalone)').matches;
  if (!standalone && /iphone|ipad/i.test(navigator.userAgent) && !localStorage.getItem('hint')) {
    setTimeout(() => { toast('İpucu: Paylaş ▸ "Ana Ekrana Ekle" ile uygulama gibi kur.', 5000); try { localStorage.setItem('hint', '1'); } catch {} }, 1500);
  }
  document.addEventListener('visibilitychange', () => { if (!document.hidden && route === 'today') go('today', todayKey()); });
}
init();
