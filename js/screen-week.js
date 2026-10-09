import { S, day, dkey, fromKey, addDays, weekStart, todayKey, dayScore, mealsFor, saveWeight, deleteWeight, latestWeight, fmtKg, DAY_SHORT, MONTHS, dow, jokerUsedThisWeek, workoutsInWeek, BADGES, earnedBadges, weightProgress, levelInfo } from './state.js';
import { $, $$, esc, toast, confetti, confirmBox } from './ui.js';
import { avatarSVG } from './avatar.js';

let ws = weekStart(new Date());

export function renderWeek(root, go) {
  const st = S.settings;
  const today = todayKey();
  const days = [...Array(7)].map((_, i) => addDays(ws, i));
  const wkKey = dkey(ws);
  const isThisWeek = wkKey === dkey(weekStart(new Date()));
  // weekly stats
  let good = 0, cnt = 0, walk = 0, stars = 0, starN = 0, logged = 0, total = 0;
  for (const d of days) {
    const k = dkey(d); const rec = day(k); const meals = mealsFor(d);
    total += meals.length;
    for (const m of meals) { const s = rec.meals[m.id]?.status; if (!s) continue; logged++; if (s === 'joker') continue; cnt++; if (s === 'good') good += 1; else if (s === 'partial') good += 0.5; }
    walk += rec.walk || 0; if (rec.stars) { stars += rec.stars; starN++; }
  }
  const weighKey = Object.keys(S.weights).filter(k => k >= wkKey && k <= dkey(addDays(ws, 6))).sort().pop();
  const lw = latestWeight();
  const weighDayName = ['Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi', 'Pazar'][st.weighDay ?? 0];
  const isWeighDay = dow(new Date()) === (st.weighDay ?? 0);
  const wkeys = Object.keys(S.weights).sort();
  const cur = weighKey ? S.weights[weighKey] : (lw ? lw.kg : st.startWeight);
  const prevW = wkeys.filter(k => k < (weighKey || today)).pop();

  root.innerHTML = `
  <div class="header"><div><div class="brand">Hafta</div><div class="sub">${days[0].getDate()} ${MONTHS[days[0].getMonth()]} – ${days[6].getDate()} ${MONTHS[days[6].getMonth()]}</div></div>
    <div class="row" style="gap:6px"><button class="btn line sm" data-w="-1" style="width:auto">‹</button><button class="btn line sm" data-w="1" style="width:auto" ${isThisWeek ? 'disabled' : ''}>›</button></div></div>
  <div class="card">
    <div class="wk">${days.map(d => { const k = dkey(d); const sc = dayScore(k); const rec = day(k); const future = k > today; const j = Object.values(rec.meals).some(m => m.status === 'joker');
      return `<button class="dcell" data-day="${k}" ${future ? 'disabled' : ''}><div class="sq ${sc.color} ${k === today ? 't' : ''}">${future ? '' : (j ? 'J' : (sc.color ? sc.grade : ''))}</div><div class="dn">${DAY_SHORT[dow(d)]}</div>
      <div class="ic">${(rec.walk || 0) >= (st.walkGoal || 30) ? '<i style="background:var(--orange)"></i>' : ''}${rec.workout ? '<i style="background:var(--blue)"></i>' : ''}</div></button>`; }).join('')}</div>
    <div class="small" style="margin-top:8px">Yeşil: temiz gün · Sarı: kısmen · Kırmızı: zor gün · J: joker · <span style="color:var(--orange)">●</span> yürüyüş · <span style="color:var(--blue)">●</span> antrenman. Güne dokunup düzenleyebilirsin.</div>
  </div>

  <div class="sect"><h2>Tartı günü</h2><span class="small">${esc(weighDayName)} sabahları</span></div>
  <div class="card ${isWeighDay && !weighKey ? 'focus' : ''}">
    ${isWeighDay && !weighKey && isThisWeek ? '<div class="small" style="color:var(--orange);font-weight:800;margin-bottom:6px">Bugün tartı günü! Kilonu gir, maskotun ışınlansın.</div>' : ''}
    <div class="weighbox">
      <div class="row" style="justify-content:center;gap:10px"><button class="rnd" data-kg="-0.1">−</button><input id="kg" inputmode="decimal" value="${fmtKg(cur)}"><button class="rnd" data-kg="0.1">+</button></div>
      <div class="small" style="margin:6px 0 10px">${weighKey ? `Bu hafta kaydedildi (${weighKey.slice(8)} ${MONTHS[Number(weighKey.slice(5, 7)) - 1]})` : 'Bu hafta henüz kaydedilmedi'}${prevW ? ` · önceki ${fmtKg(S.weights[prevW])} kg` : ''} · başlangıç ${fmtKg(st.startWeight)} kg</div>
      <button class="btn orange" data-saveweight>${weighKey ? 'Güncelle' : 'Kaydet ve dönüşümü gör'}</button>
      ${weighKey ? '<button class="btn line sm" data-delweight style="margin-top:8px">Bu haftanın tartısını sil</button>' : ''}
    </div>
  </div>

  <div class="card" style="margin-top:10px">
    <div class="row sp"><div class="label">Kilo yolculuğu</div><span class="small">hedef ${fmtKg(st.targetWeight)} kg · %${Math.round(weightProgress() * 100)}</span></div>
    ${chart()}
  </div>

  <div class="sect"><h2>Bu hafta</h2><span class="small">${logged} / ${total} öğün kaydedildi</span></div>
  <div class="grid2">
    <div class="stat"><div class="label">Plana uyum</div><div class="v" style="color:var(--green)">${cnt ? Math.round(good / cnt * 100) : 0}<small>%</small></div><div class="small">${cnt} öğün · ${jokerUsedThisWeek(ws) ? '1 joker' : 'joker yok'}</div></div>
    <div class="stat"><div class="label">Yürüyüş</div><div class="v">${walk}<small> dk</small></div><div class="small">${days.filter(d => (day(dkey(d)).walk || 0) >= (st.walkGoal || 30)).length} / 7 gün hedef</div></div>
    <div class="stat"><div class="label">Antrenman</div><div class="v">${workoutsInWeek(ws)}<small> / 2</small></div><div class="small">${workoutsInWeek(ws) >= 2 ? 'hafta tamam 💪' : 'hedef: haftada 2'}</div></div>
    <div class="stat"><div class="label">Ortalama his</div><div class="v" style="color:var(--orange)">${starN ? (stars / starN).toFixed(1).replace('.', ',') : '–'}<small> / 5</small></div><div class="small">${starN} gün puanlandı</div></div>
  </div>

  <div class="sect"><h2>Rozetler</h2><span class="small">${earnedBadges().length} / ${BADGES.length}</span></div>
  <div class="badges">${BADGES.map(b => `<div class="badge ${earnedBadges().includes(b.id) ? 'on' : ''}"><div class="em">${b.em}</div>${esc(b.name)}</div>`).join('')}</div>`;

  root.onclick = async e => {
    const t = e.target;
    const w = t.closest('[data-w]'); if (w) { ws = addDays(ws, 7 * Number(w.dataset.w)); return renderWeek(root, go); }
    const dc = t.closest('[data-day]'); if (dc) return go('today', dc.dataset.day);
    const kgb = t.closest('[data-kg]'); if (kgb) { const i = $('#kg', root); i.value = fmtKg(parseKg(i.value) + Number(kgb.dataset.kg)); return; }
    if (t.closest('[data-saveweight]')) {
      const v = parseKg($('#kg', root).value);
      if (!(v > 30 && v < 300)) return toast('Geçerli bir kilo gir');
      const k = weighKey || (isThisWeek ? today : wkKey);
      const before = latestWeight();
      await saveWeight(k, v);
      const prevKg = before && before.key !== k ? before.kg : (before && before.key === k ? null : st.startWeight);
      const diff = prevKg == null ? 0 : v - prevKg;
      renderWeek(root, go);
      if (diff < 0) { confetti(); showTransform(root, Math.abs(diff)); }
      else toast(diff > 0 ? `Kaydedildi. +${fmtKg(diff)} kg — olur, haftaya telafi.` : 'Kaydedildi.');
      return;
    }
    if (t.closest('[data-delweight]')) { if (await confirmBox('Bu haftanın tartı kaydı silinsin mi?', 'Sil', true)) { await deleteWeight(weighKey); renderWeek(root, go); } }
  };
}

function parseKg(s) { return parseFloat(String(s).replace(',', '.')) || 0; }

function chart() {
  const st = S.settings;
  const ks = Object.keys(S.weights).sort();
  const pts = [...(S.weights[st.startDate] != null ? [] : [{ k: st.startDate, v: st.startWeight }]), ...ks.map(k => ({ k, v: S.weights[k] }))].sort((a, b) => a.k < b.k ? -1 : 1);
  const W = 320, H = 150, px = 28, py = 14;
  const vals = pts.map(p => p.v).concat([st.targetWeight]);
  const lo = Math.min(...vals) - 1, hi = Math.max(...vals) + 1;
  const y = v => py + (hi - v) / (hi - lo) * (H - py - 22);
  const x = i => pts.length > 1 ? px + i / (pts.length - 1) * (W - px - 16) : W / 2;
  const line = pts.map((p, i) => `${x(i)},${y(p.v)}`).join(' ');
  return `<svg class="chart" viewBox="0 0 ${W} ${H}" aria-label="Kilo grafiği">
    <line x1="${px}" y1="${y(st.targetWeight)}" x2="${W - 16}" y2="${y(st.targetWeight)}" stroke="#FF7A1A" stroke-width="1.5" stroke-dasharray="4 4"/>
    <text x="${W - 16}" y="${y(st.targetWeight) - 4}" text-anchor="end" font-size="10" fill="#FF7A1A" font-weight="700">hedef ${fmtKg(st.targetWeight)}</text>
    <polyline points="${line}" fill="none" stroke="#26213A" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round"/>
    ${pts.map((p, i) => `<circle cx="${x(i)}" cy="${y(p.v)}" r="${i === pts.length - 1 ? 5 : 3.5}" fill="${i === pts.length - 1 ? '#2FBF71' : '#26213A'}"/>`).join('')}
    <text x="${x(0)}" y="${y(pts[0].v) - 8}" text-anchor="middle" font-size="10" fill="#6F6A80" font-weight="700">${fmtKg(pts[0].v)}</text>
    ${pts.length > 1 ? `<text x="${x(pts.length - 1)}" y="${y(pts[pts.length - 1].v) + 16}" text-anchor="middle" font-size="11" fill="#2FBF71" font-weight="800">${fmtKg(pts[pts.length - 1].v)}</text>` : ''}
    <text x="${px}" y="${H - 4}" font-size="10" fill="#9A94A8">${pts[0].k.slice(8)}.${pts[0].k.slice(5, 7)}</text>
    <text x="${W - 16}" y="${H - 4}" text-anchor="end" font-size="10" fill="#9A94A8">${pts[pts.length - 1].k.slice(8)}.${pts[pts.length - 1].k.slice(5, 7)}</text>
  </svg>`;
}

function showTransform(root, lost) {
  const el = document.createElement('div'); el.className = 'levelup';
  const p = weightProgress();
  el.innerHTML = `<div><div class="stage" style="height:230px;width:300px;margin:0 auto 14px"><div class="grass"></div><div style="position:absolute;left:62px;top:8px;width:176px;height:213px">${avatarSVG(p, 0.95, 'good')}</div></div>
    <h1>−${fmtKg(lost)} kg! 🎉</h1><p style="font-weight:700;font-size:16px;margin:8px 0 16px">Hedefe %${Math.round(p * 100)} yaklaştın. Maskotun bunu hissediyor.</p><button class="btn orange" style="max-width:240px">Harika</button></div>`;
  el.onclick = e => { if (e.target.closest('button')) el.remove(); };
  document.body.appendChild(el);
}
