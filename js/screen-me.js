import { S, saveSettings, load, DAY_SHORT, DAY_NAMES, DEFAULT_MEALS, dkey, levelInfo, totalXP, latestWeight, fmtKg, mealsFor, pad } from './state.js';
import { db } from './db.js';
import { $, $$, esc, toast, confirmBox, download, modal } from './ui.js';

export function settingsForm(st, isOnb) {
  return `
  <label class="fld"><span>Adın</span><input class="txt" name="name" value="${esc(st.name || '')}" placeholder="Evren"></label>
  <div class="grid2">
    <label class="fld"><span>Başlangıç kilosu (kg)</span><input class="txt" name="startWeight" inputmode="decimal" value="${st.startWeight ? fmtKg(st.startWeight) : ''}" placeholder="104,0"></label>
    <label class="fld"><span>Hedef kilo (kg)</span><input class="txt" name="targetWeight" inputmode="decimal" value="${st.targetWeight ? fmtKg(st.targetWeight) : '90,0'}"></label>
  </div>
  <div class="grid2">
    <label class="fld"><span>Başlangıç tarihi</span><input class="txt" type="date" name="startDate" value="${esc(st.startDate || dkey())}"></label>
    <label class="fld"><span>Hedef tarih (isteğe bağlı)</span><input class="txt" type="date" name="targetDate" value="${esc(st.targetDate || '')}"></label>
  </div>
  <label class="fld"><span>Tartı / diyetisyen günü</span>
    <div class="days7" data-single="weighDay">${DAY_SHORT.map((d, i) => `<button type="button" class="${(st.weighDay ?? 0) === i ? 'on' : ''}" data-v="${i}">${d}</button>`).join('')}</div></label>
  <label class="fld"><span>Günlük yürüyüş hedefi (dakika)</span><input class="txt" name="walkGoal" inputmode="numeric" value="${st.walkGoal || 30}"></label>
  <label class="fld"><span>Antrenman günleri (haftada 2)</span>
    <div class="days7" data-multi="workoutDays">${DAY_SHORT.map((d, i) => `<button type="button" class="${(st.workoutDays || [1, 4]).includes(i) ? 'on' : ''}" data-v="${i}">${d}</button>`).join('')}</div></label>
  <label class="fld"><span>Akşam "yürüdün mü?" hatırlatma saati</span><input class="txt" type="time" name="eveningCheck" value="${esc(st.eveningCheck || '20:30')}"></label>`;
}

export function readSettingsForm(el, base = {}) {
  const g = n => $(`[name=${n}]`, el)?.value?.trim();
  const num = v => parseFloat(String(v).replace(',', '.'));
  const s = { ...base,
    name: g('name') || 'Sen', startWeight: num(g('startWeight')), targetWeight: num(g('targetWeight')) || 90,
    startDate: g('startDate') || dkey(), targetDate: g('targetDate') || '',
    walkGoal: parseInt(g('walkGoal'), 10) || 30, eveningCheck: g('eveningCheck') || '20:30',
    weighDay: Number($('[data-single=weighDay] .on', el)?.dataset.v ?? 0),
    workoutDays: $$('[data-multi=workoutDays] .on', el).map(b => Number(b.dataset.v)),
  };
  if (!(s.startWeight > 30 && s.startWeight < 300)) return null;
  return s;
}
export function bindDayPickers(el) {
  el.addEventListener('click', e => {
    const b = e.target.closest('.days7 button'); if (!b) return;
    const box = b.parentElement;
    if (box.dataset.single) { $$('button', box).forEach(x => x.classList.remove('on')); b.classList.add('on'); }
    else b.classList.toggle('on');
  });
}

export function renderMe(root, go) {
  const st = S.settings; const lv = levelInfo(); const lw = latestWeight();
  root.innerHTML = `
  <div class="header"><div><div class="brand">Ben</div><div class="sub">${esc(st.name)} · Seviye ${lv.level} ${esc(lv.name)} · ${lv.xp} XP</div></div></div>
  <div class="card"><div class="row sp"><div><div class="label">Yolculuk</div><div class="big" style="margin:4px 0">${fmtKg(st.startWeight)} → ${lw ? fmtKg(lw.kg) : fmtKg(st.startWeight)} → <span style="color:var(--orange)">${fmtKg(st.targetWeight)}</span></div><div class="small">${st.startDate.split('-').reverse().join('.')} tarihinden beri${st.targetDate ? ' · hedef ' + st.targetDate.split('-').reverse().join('.') : ''}</div></div></div></div>

  <div class="sect"><h2>Hatırlatıcılar</h2></div>
  <div class="card"><div class="hint">iPhone'da uygulama kapalıyken bildirim atamaz; bunun yerine öğün saatlerini, akşam yürüyüş kontrolünü ve tartı gününü <b>Takvim</b>'e alarm olarak ekleriz. Dosyayı indirince "Takvim'e ekle" de.</div>
    <button class="btn blue" data-ics style="margin-top:10px">📅 Takvim dosyası indir (.ics)</button>
    <div class="small" style="margin-top:8px">Saatler bu haftanın planındaki öğün saatlerinden alınır. Plan değişirse yeniden indirip ekleyebilirsin.</div></div>

  <div class="sect"><h2>Ayarlar</h2></div>
  <div class="card" id="setform">${settingsForm(st, false)}<button class="btn orange" data-save>Kaydet</button></div>

  <div class="sect"><h2>Yedek</h2></div>
  <div class="card"><div class="hint">Tüm veriler sadece bu telefonda. Arada bir yedek al ve iCloud Drive'a kaydet; telefon değişince geri yüklersin.</div>
    <div class="grid2" style="margin-top:10px"><button class="btn green" data-export>⬇︎ Yedek al (.zip)</button><button class="btn line" data-import>⬆︎ Geri yükle</button></div></div>

  <div class="card" style="margin-top:10px;border-color:var(--red-l)"><button class="btn red sm" data-reset>Tüm verileri sil</button></div>
  <div class="small" style="text-align:center;margin-top:16px">Dönüşüm v1 · ${esc(st.name)} için yapıldı 🧡</div>`;

  bindDayPickers(root);
  root.onclick = async e => {
    const t = e.target;
    if (t.closest('[data-save]')) { const s = readSettingsForm($('#setform', root), st); if (!s) return toast('Başlangıç kilosu geçersiz'); await saveSettings(s); toast('Kaydedildi'); return renderMe(root, go); }
    if (t.closest('[data-ics]')) return download('donusum-hatirlatici.ics', new Blob([buildICS()], { type: 'text/calendar' }));
    if (t.closest('[data-export]')) return exportBackup();
    if (t.closest('[data-import]')) return importBackup(go);
    if (t.closest('[data-reset]')) { if (await confirmBox('Tüm veriler (plan, günler, fotoğraflar, kilolar) silinecek. Emin misin?', 'Hepsini sil', true)) { for (const s of ['kv', 'days', 'plans', 'photos', 'weights']) await db.clear(s); location.reload(); } }
  };
}

// ---------- ICS ----------
function icsDate(d, hm) { const [h, m] = hm.split(':').map(Number); return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}T${pad(h)}${pad(m)}00`; }
export function buildICS() {
  const st = S.settings; const today = new Date();
  const meals = mealsFor(today).length ? mealsFor(today) : DEFAULT_MEALS;
  const ev = [];
  const mk = (uid, summary, desc, hm, rrule) => ev.push(['BEGIN:VEVENT', `UID:${uid}@donusum`, `DTSTAMP:${icsDate(today, '00:00')}Z`.replace('Z', ''), `DTSTART:${icsDate(today, hm)}`, `DURATION:PT15M`, `RRULE:${rrule}`, `SUMMARY:${summary}`, `DESCRIPTION:${desc}`, 'BEGIN:VALARM', 'TRIGGER:PT0M', 'ACTION:DISPLAY', `DESCRIPTION:${summary}`, 'END:VALARM', 'END:VEVENT'].join('\r\n'));
  const seen = new Set();
  for (const m of meals) { if (!m.time || seen.has(m.time)) continue; seen.add(m.time); mk('meal-' + m.time.replace(':', ''), `🍽️ ${m.name} — ne yiyorsun?`, 'Dönüşüm: plandaki seçeneği seç, fotoğrafını ekle.', m.time, 'FREQ=DAILY'); }
  mk('walk', '🚶 Bugün yürüdün mü?', `Dönüşüm: ${st.walkGoal || 30} dk hedef. Zinciri kırma!`, st.eveningCheck || '20:30', 'FREQ=DAILY');
  const wd = ['MO', 'TU', 'WE', 'TH', 'FR', 'SA', 'SU'][st.weighDay ?? 0];
  mk('weigh', '⚖️ Tartı günü — Dönüşüm', 'Sabah aç karnına tartıl, kilonu uygulamaya gir.', '08:00', `FREQ=WEEKLY;BYDAY=${wd}`);
  for (const d of (st.workoutDays || [])) mk('wo-' + d, '🏋️ Antrenman günü', 'Fonksiyonel / ağırlık antrenmanı. Haftada 2!', '18:00', `FREQ=WEEKLY;BYDAY=${['MO', 'TU', 'WE', 'TH', 'FR', 'SA', 'SU'][d]}`);
  return ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Donusum//TR', 'CALSCALE:GREGORIAN', 'X-WR-CALNAME:Dönüşüm', ...ev, 'END:VCALENDAR'].join('\r\n');
}

// ---------- backup ----------
let zipP = null;
function loadZip() {
  if (zipP) return zipP;
  zipP = new Promise((res, rej) => { const s = document.createElement('script'); s.src = 'https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js'; s.onload = () => res(window.JSZip); s.onerror = () => rej(new Error('JSZip yüklenemedi (internet gerekli)')); document.head.appendChild(s); });
  return zipP;
}
async function exportBackup() {
  try {
    toast('Yedek hazırlanıyor…', 4000);
    const JSZip = await loadZip(); const zip = new JSZip();
    zip.file('data.json', JSON.stringify({ version: 1, exportedAt: new Date().toISOString(), settings: S.settings, days: S.days, plans: S.plans, weights: S.weights }));
    const photos = await db.all('photos');
    for (const id in photos) zip.file(`photos/${id}.jpg`, photos[id]);
    const blob = await zip.generateAsync({ type: 'blob' });
    download(`donusum-yedek-${dkey()}.zip`, blob);
  } catch (e) { toast('Yedek alınamadı: ' + e.message, 4000); }
}
function importBackup(go) {
  const inp = document.createElement('input'); inp.type = 'file'; inp.accept = '.zip,application/zip';
  inp.onchange = async () => {
    const f = inp.files[0]; if (!f) return;
    if (!(await confirmBox('Yedek, mevcut verilerin üzerine yazılacak. Devam?', 'Geri yükle'))) return;
    try {
      const JSZip = await loadZip(); const zip = await JSZip.loadAsync(f);
      const data = JSON.parse(await zip.file('data.json').async('string'));
      for (const s of ['kv', 'days', 'plans', 'photos', 'weights']) await db.clear(s);
      await db.set('kv', 'settings', data.settings);
      for (const k in data.days) await db.set('days', k, data.days[k]);
      for (const k in data.plans) await db.set('plans', k, data.plans[k]);
      for (const k in data.weights) await db.set('weights', k, data.weights[k]);
      const ph = zip.folder('photos');
      if (ph) { const files = []; ph.forEach((p, file) => files.push([p, file])); for (const [p, file] of files) await db.set('photos', p.replace(/\.jpg$/, ''), await file.async('blob')); }
      await load(); toast('Geri yüklendi'); go('today');
    } catch (e) { toast('Geri yükleme başarısız: ' + e.message, 4000); }
  };
  inp.click();
}
