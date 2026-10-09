import { S, weekStart, addDays, dkey, dow, DAY_NAMES, DAY_SHORT, MONTHS, newWeekPlan, savePlan, DEFAULT_MEALS } from './state.js';
import { $, $$, esc, toast, modal, confirmBox } from './ui.js';
import { parsePlanText, parsePlanParagraphs, fileToParagraphs, buildPlan } from './planparse.js';
import { aiParsePlan, aiReady } from './ai.js';

let ws = weekStart(new Date());
let di = dow(new Date());

export function renderPlan(root) {
  const wk = dkey(ws);
  const plan = S.plans[wk];
  const days = [...Array(7)].map((_, i) => addDays(ws, i));
  const isThis = wk === dkey(weekStart(new Date()));
  const prevKeys = Object.keys(S.plans).filter(k => k < wk).sort();
  root.innerHTML = `
  <div class="header"><div><div class="brand">Plan</div><div class="sub">${days[0].getDate()} ${MONTHS[days[0].getMonth()]} – ${days[6].getDate()} ${MONTHS[days[6].getMonth()]}${isThis ? ' · bu hafta' : ''}</div></div>
    <div class="row" style="gap:6px"><button class="btn line sm" data-w="-1" style="width:auto">‹</button><button class="btn line sm" data-w="1" style="width:auto">›</button></div></div>
  ${!plan ? `<div class="card focus"><div style="font-weight:800;margin-bottom:6px">Bu hafta için plan yok</div><div class="hint">Diyetisyenin listesini üç yoldan ekleyebilirsin:</div>
    <div style="display:flex;flex-direction:column;gap:8px;margin-top:10px">
      <button class="btn orange" data-photo>📷 Kâğıt fotoğrafı çek, AI okusun</button>
      <button class="btn ghost" data-pdf>📄 PDF / Word yükle, otomatik ayır</button>
      <button class="btn ghost" data-paste>📋 Metin yapıştır</button>
      ${prevKeys.length ? `<button class="btn ghost" data-copyprev>↺ Önceki haftanın planını kopyala</button>` : ''}
      <button class="btn line" data-blank>✎ Boş şablonla elle gir</button>
    </div></div>` : `
  <div class="row" style="gap:8px;margin-bottom:10px"><button class="btn ghost sm" data-photo>📷 AI</button><button class="btn ghost sm" data-pdf>📄 Dosya</button><button class="btn ghost sm" data-paste>📋 Metin</button><button class="btn line sm" data-clear style="width:auto">Sıfırla</button></div>
  ${plan.notes?.length ? `<div class="card" style="margin-bottom:10px;border-color:var(--orange-l)"><div class="label">Diyetisyen notu</div><div class="small" style="margin-top:4px;line-height:1.4">${plan.notes.map(esc).join('<br>')}</div></div>` : ''}
  <div class="daytabs">${days.map((d, i) => `<button class="${i === di ? 'on' : ''}" data-di="${i}">${DAY_SHORT[i]} ${d.getDate()}${plan.days[i]?.some(m => m.options.length) ? ' ·' : ''}</button>`).join('')}</div>
  <div class="sect"><h2>${DAY_NAMES[di]}</h2><span class="small">${plan.days[di].length} öğün</span></div>
  <div id="meals">${plan.days[di].map((m, i) => mealEditor(m, i)).join('')}</div>
  <div class="row" style="gap:8px;margin-top:10px"><button class="btn line sm" data-add="ana">+ Ana öğün</button><button class="btn line sm" data-add="ara">+ Ara öğün</button></div>
  <button class="btn ghost sm" data-copyday style="margin-top:8px">Bu günün planını diğer günlere kopyala</button>
  <div class="hint" style="margin-top:12px">Her öğün için seçenekleri <b>ayrı satırlara</b> yaz (ör. "Omlet + salata" ↵ "Yulaf + süt"). Gün geldiğinde hangisini yediğini seçersin. Öğün saati hatırlatıcılar için kullanılır.</div>`}`;

  root.onclick = async e => {
    const t = e.target;
    const w = t.closest('[data-w]'); if (w) { ws = addDays(ws, 7 * Number(w.dataset.w)); return renderPlan(root); }
    const dt = t.closest('[data-di]'); if (dt) { di = Number(dt.dataset.di); return renderPlan(root); }
    if (t.closest('[data-blank]')) { await savePlan(wk, newWeekPlan(null)); return renderPlan(root); }
    if (t.closest('[data-copyprev]')) { await savePlan(wk, newWeekPlan(S.plans[prevKeys[prevKeys.length - 1]])); toast('Önceki hafta kopyalandı'); return renderPlan(root); }
    if (t.closest('[data-clear]')) { if (await confirmBox('Bu haftanın planı silinsin mi?', 'Sil', true)) { const { db } = await import('./db.js'); delete S.plans[wk]; await db.del('plans', wk); renderPlan(root); } return; }
    if (t.closest('[data-pdf]')) return importPdf(root, wk);
    if (t.closest('[data-photo]')) return importPhoto(root, wk);
    if (t.closest('[data-paste]')) return importText(root, wk);
    const add = t.closest('[data-add]');
    if (add) { const type = add.dataset.add; plan.days[di].push({ id: type + Date.now().toString(36), name: type === 'ana' ? 'Öğün' : 'Ara öğün', type, time: type === 'ana' ? '12:00' : '16:00', options: [] }); await savePlan(wk, plan); return renderPlan(root); }
    const del = t.closest('[data-del]');
    if (del) { plan.days[di].splice(Number(del.dataset.del), 1); await savePlan(wk, plan); return renderPlan(root); }
    const up = t.closest('[data-up]');
    if (up) { const i = Number(up.dataset.up); if (i > 0) { [plan.days[di][i - 1], plan.days[di][i]] = [plan.days[di][i], plan.days[di][i - 1]]; await savePlan(wk, plan); renderPlan(root); } return; }
    if (t.closest('[data-copyday]')) { if (await confirmBox(`${DAY_NAMES[di]} planı diğer 6 güne kopyalansın mı? (üzerine yazar)`, 'Kopyala')) { for (let i = 0; i < 7; i++) if (i !== di) plan.days[i] = plan.days[di].map(m => ({ ...m, options: [...m.options] })); await savePlan(wk, plan); toast('Kopyalandı'); renderPlan(root); } }
  };
  root.onchange = async e => {
    const t = e.target; const pm = t.closest('.pm'); if (!pm || !plan) return;
    const m = plan.days[di][Number(pm.dataset.i)];
    if (t.matches('.nm')) m.name = t.value.trim() || m.name;
    if (t.matches('[type=time]')) m.time = t.value;
    if (t.matches('textarea')) m.options = t.value.split(/\n/).map(s => s.trim()).filter(Boolean);
    await savePlan(wk, plan);
    $(`.pm[data-i="${pm.dataset.i}"] .cnt`, root).textContent = m.options.length + ' seçenek';
  };
}

function mealEditor(m, i) {
  return `<div class="pm" data-i="${i}"><div class="hd"><button class="ib" data-up="${i}" aria-label="Yukarı">↑</button><input class="nm" value="${esc(m.name)}" aria-label="Öğün adı"><input type="time" value="${esc(m.time || '')}" aria-label="Saat"><button class="ib" data-del="${i}" aria-label="Sil">✕</button></div>
  <textarea class="txt" rows="${Math.max(2, Math.min(5, m.options.length + 1))}" placeholder="Seçenekleri ayrı satırlara yaz…">${esc(m.options.join('\n'))}</textarea>
  <div class="small cnt" style="margin-top:4px">${m.options.length} seçenek</div></div>`;
}

async function applyParsed(root, wk, text) {
  const parsed = Array.isArray(text) ? parsePlanParagraphs(text, DEFAULT_MEALS) : parsePlanText(text, DEFAULT_MEALS);
  if (!parsed) { toast('Metinde öğün başlığı bulamadım (Kahvaltı, Öğle, Akşam…)'); return; }
  await savePlan(wk, { days: parsed.days, notes: parsed.notes });
  toast(parsed.single ? 'Tek günlük plan bulundu, 7 güne uygulandı. Kontrol et!' : `${parsed.detected} gün ayrıştırıldı. Kontrol edip düzelt.`, 3500);
  renderPlan(root);
}

function importText(root, wk) {
  const { el, close } = modal(`<h2 style="font-size:20px;margin-bottom:8px">Metin yapıştır</h2><div class="hint">Diyetisyenin WhatsApp/PDF metnini olduğu gibi yapıştır. "Pazartesi", "1. Gün", "Kahvaltı:", "Ara öğün:", "Öğle:", "Akşam:" başlıklarını ve "veya" / "/" ayraçlarını tanır.</div>
    <textarea class="txt" id="ptxt" rows="10" style="margin:10px 0" placeholder="Pazartesi&#10;Kahvaltı: 2 yumurta omlet + salata veya yulaf + süt&#10;Ara öğün: 1 elma + 10 badem&#10;Öğle: ..."></textarea>
    <button class="btn orange" data-go>Ayrıştır ve uygula</button>`);
  el.onclick = async e => { if (e.target.closest('[data-go]')) { const txt = $('#ptxt', el).value; close(); await applyParsed(root, wk, txt); } };
}

function importPdf(root, wk) {
  const inp = document.createElement('input'); inp.type = 'file'; inp.accept = '.pdf,.docx,.txt,application/pdf';
  inp.onchange = async () => {
    const f = inp.files[0]; if (!f) return;
    toast('Dosya okunuyor…', 4000);
    try {
      const paras = await fileToParagraphs(f);
      const text = paras.map(l => l.replace(/^\u00a7/, 'NOT: ')).join('\n');
      const { el, close } = modal(`<h2 style="font-size:20px;margin-bottom:8px">Dosyadan çıkan metin</h2><div class="hint">Boş satırlar seçenek gruplarını ayırır. Gerekirse düzelt, sonra uygula.</div>
        <textarea class="txt" id="ptxt" rows="12" style="margin:10px 0">${esc(text)}</textarea><button class="btn orange" data-go>Ayrıştır ve uygula</button>
        ${aiReady() ? '<button class="btn blue" data-ai style="margin-top:8px">🤖 AI ile ayrıştır (daha isabetli)</button>' : ''}`);
      el.onclick = async e => {
        if (e.target.closest('[data-go]')) { const txt = $('#ptxt', el).value; close(); await applyParsed(root, wk, txt.split(/\n/).map(l => l.replace(/^NOT: /, '\u00a7'))); }
        if (e.target.closest('[data-ai]')) { const txt = $('#ptxt', el).value; close(); await runAI(root, wk, { text: txt }); }
      };
    } catch (err) { toast('Dosya okunamadı: ' + err.message, 4000); }
  };
  inp.click();
}

async function runAI(root, wk, input) {
  toast('AI okuyor… (10-30 sn)', 6000);
  try {
    const r = await aiParsePlan(input);
    document.getElementById('toast').hidden = true;
    const plan = buildPlan(r.blocks, r.notes, DEFAULT_MEALS);
    if (!plan) throw new Error('Plan çıkarılamadı');
    const names = ['Pt', 'Sa', 'Ça', 'Pe', 'Cu', 'Ct', 'Pa'];
    const summary = r.blocks.map(b => `<div style="margin-bottom:8px"><b>${(b.days || [0, 1, 2, 3, 4, 5, 6]).map(d => names[d]).join(', ')}</b><br>${(b.meals || []).map(m => `${esc(m.name)}${m.time ? ' ' + esc(m.time) : ''}: ${(m.options || []).length} seçenek`).join(' · ')}</div>`).join('');
    const { el, close } = modal(`<h2 style="font-size:20px;margin-bottom:8px">AI sonucu</h2><div class="small" style="line-height:1.5">${summary}${plan.notes.length ? `<div><b>Notlar:</b> ${plan.notes.map(esc).join(' / ')}</div>` : ''}</div>
      <div class="hint" style="margin-top:8px">Uygulayınca her öğünü düzenleyebilirsin. "[okunamadı]" işaretli yerleri kontrol et.</div>
      <div class="grid2" style="margin-top:12px"><button class="btn line" data-no>Vazgeç</button><button class="btn orange" data-ok>Uygula</button></div>`);
    el.onclick = async e => {
      if (e.target.closest('[data-no]')) close();
      if (e.target.closest('[data-ok]')) { close(); await savePlan(wk, { days: plan.days, notes: plan.notes }); toast('Plan AI ile yerleştirildi. Kontrol et!', 3000); renderPlan(root); }
    };
  } catch (err) { toast(err.message, 5000); }
}

function importPhoto(root, wk) {
  if (!aiReady()) {
    const { el, close } = modal(`<h2 style="font-size:20px;margin-bottom:8px">Fotoğraftan okuma için AI anahtarı gerekli</h2>
      <div class="hint">Kâğıttaki programı Claude okuyup günlere yerleştirir. Bunun için bir Anthropic API anahtarı lazım: <b>console.anthropic.com</b> → API Keys → Create Key. Kullandıkça ödenir (bir fotoğraf birkaç kuruş). Anahtar sadece bu telefonda saklanır; fotoğraf okunmak için Anthropic'e gönderilir.</div>
      <button class="btn orange" data-go style="margin-top:12px">Ben › Yapay zeka ayarına git</button>`);
    el.onclick = e => { if (e.target.closest('[data-go]')) { close(); document.querySelector('[data-route=me]').click(); } };
    return;
  }
  const inp = document.createElement('input'); inp.type = 'file'; inp.accept = 'image/*'; inp.multiple = true;
  inp.onchange = async () => { const files = [...inp.files].slice(0, 4); if (!files.length) return; await runAI(root, wk, { images: files }); };
  inp.click();
}
