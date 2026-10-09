import { S, day, saveDay, mealsFor, fromKey, dkey, addDays, todayKey, fmtDate, fmtKg, levelInfo, walkStreak, cleanStreak, workoutStreak, workoutsInWeek, jokerUsedThisWeek, fitness, mood, latestWeight, isWorkoutDay, mealStats, dayScore, dayXP, earnedBadges, BADGES } from './state.js';
import { avatarSVG, speechFor } from './avatar.js';
import { $, $$, esc, toast, savePhoto, photoURL, deletePhoto, pickPhoto, openLightbox, confetti, modal } from './ui.js';

let key = todayKey();
let expanded = null;      // meal id expanded
let react = '', tick = 0, reactT = null;
let prevLevel = null, prevBadges = null;

export function setDate(k) { key = k; expanded = null; }

export async function renderToday(root) {
  const d = day(key);
  const date = fromKey(key);
  const isToday = key === todayKey();
  const meals = mealsFor(date);
  const lv = levelInfo();
  if (prevLevel === null) { prevLevel = lv.level; prevBadges = new Set(earnedBadges()); }
  const f = fitness(), m = isToday ? mood() : 0.6;
  const lw = latestWeight();
  const st = S.settings;
  const goal = st.walkGoal || 30;
  const ms = mealStats(key);
  const nextMeal = meals.find(x => !d.meals[x.id]?.status);
  if (expanded === null && nextMeal) expanded = nextMeal.id;
  const jokerFree = !jokerUsedThisWeek(date);
  const left = lw ? lw.kg - st.targetWeight : st.startWeight - st.targetWeight;

  root.innerHTML = `
  <div class="header">
    <div><div class="brand">Dönüşüm</div><div class="sub">${esc(fmtDate(date))}${isToday ? '' : ' · geçmiş gün'}</div></div>
    <div class="pill"><span class="lv">${lv.level}</span>${esc(lv.name)}</div>
  </div>
  <div class="row sp" style="margin-bottom:10px">
    <button class="btn line sm" data-nav="-1" style="width:auto">‹ Önceki</button>
    ${isToday ? '' : '<button class="btn ghost sm" data-nav="today" style="width:auto">Bugüne dön</button>'}
    <button class="btn line sm" data-nav="1" style="width:auto" ${isToday ? 'disabled' : ''}>Sonraki ›</button>
  </div>
  <div class="stage">
    <div class="grass"></div><div class="cloud" style="left:22px;top:16px;width:56px;height:18px"></div>
    <div id="avatar-slot">${avatarSVG(f, m, react)}</div>
    <div class="side">
      <div class="bubble" id="speech">${esc(speechFor(f, m, react, tick))}</div>
      <div class="bar"><div class="t"><span>FORM</span><span style="color:var(--orange)">${Math.round(f * 100)}%</span></div><div class="tr"><i style="width:${Math.round(f * 100)}%"></i></div></div>
      <div class="bar g"><div class="t"><span>MORAL</span><span style="color:var(--green)">${Math.round(m * 100)}%</span></div><div class="tr"><i style="width:${Math.round(m * 100)}%"></i></div></div>
      <div class="row" style="gap:6px;padding:0 4px"><span style="font-family:var(--disp);font-weight:700;font-size:22px">${lw ? fmtKg(lw.kg) : fmtKg(st.startWeight)}</span><span class="small">kg · hedefe ${fmtKg(Math.max(0, left))}</span></div>
    </div>
  </div>
  <div class="bar" style="margin-top:10px;border:2px solid var(--line)"><div class="t"><span>SEVİYE ${lv.level} · ${esc(lv.name)}</span><span>${lv.xp}${lv.next ? ' / ' + lv.next : ''} XP</span></div><div class="tr" style="background:#F3EFE6"><i style="width:${Math.round(lv.pct * 100)}%;background:var(--ink)"></i></div></div>

  <div class="grid3" style="margin-top:12px">
    <div class="chain o"><div class="n"><svg viewBox="0 0 24 24" stroke="#FF7A1A"><circle cx="13" cy="4" r="1.6"/><path d="M9 20l2-6 3 2v4M11 14l-1-4 3-2 2 3 3 1M7 12l2-5"/></svg>${walkStreak()}</div><div class="d">gün yürüyüş zinciri</div></div>
    <div class="chain b"><div class="n"><svg viewBox="0 0 24 24" stroke="#3D7BFF"><path d="M3 10v4M6 8v8M18 8v8M21 10v4M6 12h12"/></svg>${workoutsInWeek(new Date())}<small>/2</small></div><div class="d">antrenman · ${workoutStreak()} hafta zincir</div></div>
    <div class="chain g"><div class="n"><svg viewBox="0 0 24 24" stroke="#2FBF71"><path d="M4 12a8 8 0 0 1 16 0H4zM3 12h18M8 16h8"/></svg>${cleanStreak()}</div><div class="d">gün temiz beslenme</div></div>
  </div>

  <div class="sect"><h2>${isToday ? 'Bugünün öğünleri' : 'Öğünler'}</h2><span class="small">${ms.logged} / ${meals.length} · <span style="color:${jokerFree ? 'var(--orange)' : 'var(--muted)'}">${jokerFree ? 'Joker hazır' : 'Joker kullanıldı'}</span></span></div>
  <div id="meals">${meals.length ? meals.map(mm => mealCard(mm, d, jokerFree)).join('') : `<div class="card"><div class="small">Bu hafta için plan girilmemiş. <b>Plan</b> sekmesinden diyetisyenin listesini ekle; öğünler burada görünecek.</div></div>`}</div>

  <div class="grid2" style="margin-top:14px">
    <div class="card" style="border-color:var(--orange-l)"><div class="label">Yürüyüş</div>
      <div class="row" style="gap:4px;margin:6px 0"><span class="big">${d.walk || 0}</span><span class="small">/ ${goal} dk</span></div>
      <div class="row" style="gap:6px"><button class="btn orange sm" data-walk="15">+15</button><button class="btn orange sm" data-walk="30">+30</button><button class="btn ghost sm" data-walk="custom" style="width:auto;padding:8px 10px">✎</button></div>
    </div>
    <div class="card" style="border-color:var(--blue-l)"><div class="label">Antrenman</div>
      <div class="small" style="margin:6px 0;line-height:1.35">Fonksiyonel / ağırlık<br>haftada 2 · ${isWorkoutDay(date) ? '<b style="color:var(--blue)">bugün planlı</b>' : 'bugün planlı değil'}</div>
      <button class="btn ${d.workout ? 'green' : 'blue'} sm" data-workout>${d.workout ? 'Yapıldı ✓' : 'Yaptım'}</button>
    </div>
  </div>

  <div class="card" style="margin-top:12px"><div class="row sp"><div class="label">Gün nasıl geçti?</div><span class="small">Not: ${dayScore(key).grade} · +${dayXPLabel()} XP</span></div>
    <div class="stars" style="margin:6px 0">${[1, 2, 3, 4, 5].map(i => `<button data-star="${i}" class="${(d.stars || 0) >= i ? 'on' : ''}" aria-label="${i} yıldız">★</button>`).join('')}</div>
    <textarea class="txt" id="daynote" rows="2" placeholder="Günün notu: nasıl hissettin, ne zorladı?">${esc(d.note || '')}</textarea>
  </div>`;

  bind(root);
  await loadThumbs(root);
  checkLevelAndBadges();
}

function dayXPLabel() { return dayXP(key); }

function mealCard(mm, d, jokerFree) {
  const rec = d.meals[mm.id] || {};
  const st = rec.status;
  const open = expanded === mm.id;
  const stLabel = { good: '✓ Uydum', partial: '~ Kısmen', bad: '✕ Saptım', joker: '🃏 Joker' }[st] || (open ? 'Sırada' : 'Bekliyor');
  const stCls = st || (open ? 'next' : '');
  const chosen = rec.chosen != null && mm.options[rec.chosen] ? mm.options[rec.chosen] : (mm.options.length ? mm.options.join(' / ') : '—');
  const thumb = rec.photos?.length ? `<div class="th" data-photo="${rec.photos[0]}"><img alt="" data-src="${rec.photos[0]}"></div>`
    : st ? `<div class="th ${st === 'good' ? 'ok' : st === 'partial' ? 'part' : st === 'bad' ? 'bad' : 'joker'}">${st === 'good' ? '<svg viewBox="0 0 24 24"><path d="M5 12l5 5L20 7"/></svg>' : st === 'partial' ? '~' : st === 'bad' ? '✕' : '🃏'}</div>`
    : `<div class="th">${esc(mm.time || '')}</div>`;
  if (!open) {
    return `<div class="card ${st === 'good' || st === 'joker' ? 'ok' : st ? '' : 'dim'} meal-card" data-meal="${mm.id}">
      <div class="meal"><div class="small" style="display:none"></div>${thumb}
      <div class="grow"><div class="row sp small"><span>${esc(mm.name)} · ${esc(mm.time || '')}</span><span class="status ${stCls}">${stLabel}</span></div>
      <div class="ti ell">${esc(chosen)}</div>${rec.note ? `<div class="small ell">Not: ${esc(rec.note)}</div>` : ''}</div></div></div>`;
  }
  return `<div class="card focus meal-card" data-meal="${mm.id}">
    <div class="row sp small" data-collapse style="cursor:pointer"><span>${esc(mm.name)} · ${esc(mm.time || '')}</span><span class="status ${stCls}">${stLabel}</span></div>
    ${mm.options.length ? `<div class="small" style="margin-top:6px">Diyetisyenin seçenekleri — ne yedin?</div>
    <div class="opts">${mm.options.map((o, i) => `<button class="opt ${rec.chosen === i ? 'sel' : ''}" data-opt="${i}">${esc(o)}</button>`).join('')}</div>` : '<div class="small" style="margin:6px 0">Bu öğün için planda seçenek yok.</div>'}
    <div class="seg">
      <button class="btn green sm ${st === 'good' ? 'sel' : ''}" data-status="good">Uydum</button>
      <button class="btn yellow sm ${st === 'partial' ? 'sel' : ''}" data-status="partial">Kısmen</button>
      <button class="btn red sm ${st === 'bad' ? 'sel' : ''}" data-status="bad">Saptım</button>
    </div>
    ${(jokerFree || st === 'joker') ? `<button class="btn line sm ${st === 'joker' ? 'sel' : ''}" data-status="joker" style="margin-top:8px">🃏 ${st === 'joker' ? 'Joker kullanıldı' : 'Joker kullan (haftada 1 · puanı etkilemez)'}</button>` : ''}
    <div class="photos">${(rec.photos || []).map(p => `<img alt="Öğün fotoğrafı" data-src="${p}" data-photo="${p}">`).join('')}<button class="add" data-addphoto aria-label="Fotoğraf ekle">📷</button></div>
    <textarea class="txt" data-note rows="2" placeholder="Not: porsiyon, his, değişiklik…" style="margin-top:8px">${esc(rec.note || '')}</textarea>
  </div>`;
}

async function loadThumbs(root) {
  for (const img of $$('img[data-src]', root)) img.src = await photoURL(img.dataset.src);
}

function bind(root) {
  root.onclick = async e => {
    const t = e.target;
    const nav = t.closest('[data-nav]');
    if (nav) { const v = nav.dataset.nav; key = v === 'today' ? todayKey() : dkey(addDays(fromKey(key), Number(v))); if (key > todayKey()) key = todayKey(); expanded = null; return renderToday(root); }
    const card = t.closest('.meal-card');
    if (card) {
      const id = card.dataset.meal;
      const d = day(key); d.meals[id] = d.meals[id] || {};
      const rec = d.meals[id];
      if (t.closest('[data-photo]')) { const pid = t.closest('[data-photo]').dataset.photo; return openLightbox(await photoURL(pid), async () => { rec.photos = rec.photos.filter(p => p !== pid); await deletePhoto(pid); await saveDay(key, d); renderToday(root); }); }
      if (expanded !== id) { expanded = id; return renderToday(root); }
      if (t.closest('[data-collapse]')) { expanded = ''; return renderToday(root); }
      const opt = t.closest('[data-opt]');
      if (opt) { rec.chosen = rec.chosen === Number(opt.dataset.opt) ? null : Number(opt.dataset.opt); await saveDay(key, d); return renderToday(root); }
      const sb = t.closest('[data-status]');
      if (sb) {
        const s = sb.dataset.status;
        rec.status = rec.status === s ? null : s;
        await saveDay(key, d);
        const kind = rec.status === 'good' || rec.status === 'joker' ? 'good' : rec.status === 'bad' ? 'bad' : rec.status === 'partial' ? 'good' : '';
        if (rec.status && rec.status !== 'joker') { const meals = mealsFor(fromKey(key)); const nxt = meals.find(x => !d.meals[x.id]?.status); expanded = nxt ? nxt.id : ''; }
        return reactRender(root, kind);
      }
      if (t.closest('[data-addphoto]')) {
        const file = await pickPhoto(false); if (!file) return;
        toast('Fotoğraf kaydediliyor…');
        try { const pid = await savePhoto(file); rec.photos = rec.photos || []; rec.photos.push(pid); await saveDay(key, d); toast('Fotoğraf eklendi 📷 +10 XP'); } catch { toast('Fotoğraf eklenemedi'); }
        return renderToday(root);
      }
      return;
    }
    const w = t.closest('[data-walk]');
    if (w) {
      const d = day(key);
      if (w.dataset.walk === 'custom') {
        const v = prompt('Bugün toplam kaç dakika yürüdün?', String(d.walk || 0));
        if (v === null) return; d.walk = Math.max(0, parseInt(v, 10) || 0);
      } else d.walk = (d.walk || 0) + Number(w.dataset.walk);
      const goal = S.settings.walkGoal || 30;
      const hit = d.walk >= goal && (d.walk - Number(w.dataset.walk) < goal || w.dataset.walk === 'custom');
      await saveDay(key, d);
      if (hit) { toast(`Günlük yürüyüş tamam! +50 XP · zincir ${walkStreak()} gün`); return reactRender(root, 'good'); }
      return renderToday(root);
    }
    if (t.closest('[data-workout]')) {
      const d = day(key); d.workout = !d.workout; await saveDay(key, d);
      if (d.workout) { toast('Antrenman kaydedildi 💪 +80 XP'); return reactRender(root, 'good'); }
      return renderToday(root);
    }
    const star = t.closest('[data-star]');
    if (star) { const d = day(key); d.stars = d.stars === Number(star.dataset.star) ? 0 : Number(star.dataset.star); await saveDay(key, d); return renderToday(root); }
  };
  root.onchange = async e => {
    const t = e.target;
    if (t.matches('[data-note]')) { const id = t.closest('.meal-card').dataset.meal; const d = day(key); d.meals[id] = d.meals[id] || {}; d.meals[id].note = t.value.trim(); await saveDay(key, d); }
    if (t.id === 'daynote') { const d = day(key); d.note = t.value.trim(); await saveDay(key, d); }
  };
}

async function reactRender(root, kind) {
  react = kind; tick++;
  await renderToday(root);
  clearTimeout(reactT);
  reactT = setTimeout(() => { react = ''; const slot = $('#avatar-slot', root); if (slot) { slot.innerHTML = avatarSVG(fitness(), key === todayKey() ? mood() : 0.6, ''); $('#speech', root).textContent = speechFor(fitness(), mood(), '', tick); } }, 1200);
}

function checkLevelAndBadges() {
  const lv = levelInfo();
  if (lv.level > prevLevel) {
    prevLevel = lv.level; confetti();
    const { el, close } = modal(`<div style="text-align:center;padding:10px 0"><div style="font-size:52px">🎉</div><h1 style="font-size:30px;color:var(--orange)">Seviye ${lv.level}!</h1><p style="font-weight:700;font-size:17px;margin:8px 0 16px">Artık <b>${esc(lv.name)}</b> seviyesindesin.</p><button class="btn orange" data-ok>Devam</button></div>`);
    el.onclick = e => { if (e.target.closest('[data-ok]')) close(); };
  }
  const now = earnedBadges();
  const fresh = now.filter(b => !prevBadges.has(b));
  if (fresh.length) {
    prevBadges = new Set(now);
    const b = BADGES.find(x => x.id === fresh[0]);
    toast(`Yeni rozet: ${b.em} ${b.name}`, 3200);
  }
}
