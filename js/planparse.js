// Turkish dietitian plan text -> week plan structure
const DAY_RE = /^(pazartesi|salı|sali|çarşamba|carsamba|perşembe|persembe|cuma|cumartesi|pazar)[\s:.\-–]*$/;
const DAY_NUM_RE = /^(\d)\s*\.?\s*g[üu]n[\s:.\-–]*(.*)$/;
const MEAL_RE = /^(kahvaltı|kahvalti|sabah|ara ö?ğ?ü?n|ara ogun|ara|kuşluk|kusluk|öğle|ogle|öğlen|ikindi|akşam|aksam|gece|yatmadan önce|yatmadan once)\s*(\d)?\s*(öğünü|ogunu)?\s*[:\-–]?\s*(.*)$/;
const DAYS = { pazartesi: 0, 'salı': 1, sali: 1, 'çarşamba': 2, carsamba: 2, 'perşembe': 3, persembe: 3, cuma: 4, cumartesi: 5, pazar: 6 };
const TIMES = { Kahvaltı: '08:30', Öğle: '13:30', Akşam: '19:30' };
const ARA_TIMES = ['11:00', '16:30', '21:30'];

function mealKind(word) {
  const w = word.toLocaleLowerCase('tr').replace(/\s+/g, ' ');
  if (/^(kahvalt|sabah)/.test(w)) return { name: 'Kahvaltı', type: 'ana' };
  if (/^(öğle|ogle)/.test(w)) return { name: 'Öğle', type: 'ana' };
  if (/^(akşam|aksam)/.test(w)) return { name: 'Akşam', type: 'ana' };
  return { name: 'Ara öğün', type: 'ara' };
}

export function splitOptions(text) {
  let t = text.replace(/\s+/g, ' ').trim();
  if (!t) return [];
  // numbered / lettered alternatives: "1) ... 2) ..." or "a) ... b) ..."
  const parts = t.split(/\s*(?:^|\s)(?:\d+[\)\.]|[a-dA-D][\)\.])\s+(?=\S)/).map(s => s.trim()).filter(Boolean);
  const base = parts.length > 1 ? parts : [t];
  const out = [];
  for (const p of base) {
    for (const o of p.split(/\s+(?:veya|ya da|yada|VEYA|YA DA)\s+|\s+\/\s+|\s*\|\s*/)) { const s = o.replace(/^[-•*·]\s*/, '').trim(); if (s) out.push(s); }
  }
  return out;
}

export function parsePlanText(raw, defaults) {
  const lines = raw.split(/\r?\n/).map(l => l.replace(/ /g, ' ').trim()).filter(Boolean);
  const days = {}; // dayIndex -> [{name,type,lines:[]}]
  let curDay = null, curMeal = null, sawDay = false;
  const ensureDay = i => { if (!days[i]) days[i] = []; curDay = i; curMeal = null; };
  for (let line of lines) {
    const low = line.toLocaleLowerCase('tr');
    const dm = low.match(DAY_RE);
    const dn = low.match(DAY_NUM_RE);
    if (dm) { sawDay = true; ensureDay(DAYS[dm[1]] ?? 0); continue; }
    if (dn) { sawDay = true; ensureDay(Math.min(6, Math.max(0, Number(dn[1]) - 1))); line = line.slice(line.length - dn[2].length).trim(); if (!line) continue; }
    const mm = low.match(MEAL_RE);
    if (mm && (mm[4] !== undefined) && !(mm[1].toLowerCase() === 'ara' && !/ö|o/.test(line.slice(0, 6).toLowerCase()) && mm[4].length > 40)) {
      if (curDay === null) ensureDay(0);
      const kind = mealKind(mm[1]);
      curMeal = { ...kind, lines: [] };
      days[curDay].push(curMeal);
      if (mm[4]) curMeal.lines.push(line.slice(line.length - mm[4].length));
      continue;
    }
    if (curMeal) curMeal.lines.push(line);
  }
  // build plan
  const plan = { days: {} };
  const build = (meals) => {
    let ara = 0;
    return meals.map((m, i) => {
      const bulletish = m.lines.length > 1 && m.lines.every(l => /^(?:[-•*·]|\d+[\)\.])\s*/.test(l));
      const options = bulletish ? m.lines.map(l => l.replace(/^(?:[-•*·]|\d+[\)\.])\s*/, '').trim()).filter(Boolean) : splitOptions(m.lines.join(' '));
      const time = m.type === 'ara' ? (ARA_TIMES[ara++] || '21:30') : TIMES[m.name];
      return { id: `${m.name === 'Ara öğün' ? 'ara' : m.name.toLocaleLowerCase('tr').replace('ğ', 'g').replace('ş', 's').replace('ı', 'i')}${m.type === 'ara' ? ara : ''}_${i}`, name: m.name, type: m.type, time, options };
    });
  };
  const idx = Object.keys(days).map(Number);
  if (!idx.length) return null;
  if (!sawDay || idx.length === 1) { const one = build(days[idx[0]]); for (let i = 0; i < 7; i++) plan.days[i] = one.map(m => ({ ...m, options: [...m.options] })); plan.single = true; }
  else {
    for (let i = 0; i < 7; i++) plan.days[i] = days[i] ? build(days[i]) : (defaults ? defaults.map(m => ({ ...m, options: [] })) : []);
  }
  plan.detected = idx.length;
  return plan;
}

// pdf.js text extraction (lazy CDN load)
let pdfjsP = null;
function loadPdfjs() {
  if (pdfjsP) return pdfjsP;
  pdfjsP = new Promise((res, rej) => {
    const s = document.createElement('script');
    s.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
    s.onload = () => { window.pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js'; res(window.pdfjsLib); };
    s.onerror = () => rej(new Error('pdf.js yüklenemedi (internet gerekli)'));
    document.head.appendChild(s);
  });
  return pdfjsP;
}
export async function pdfToText(file) {
  const pdfjs = await loadPdfjs();
  const buf = await file.arrayBuffer();
  const doc = await pdfjs.getDocument({ data: buf }).promise;
  let out = [];
  for (let p = 1; p <= doc.numPages; p++) {
    const page = await doc.getPage(p);
    const tc = await page.getTextContent();
    // group by line (y), order by x
    const rows = [];
    for (const it of tc.items) {
      if (!it.str.trim()) continue;
      const y = Math.round(it.transform[5]), x = it.transform[4];
      let row = rows.find(r => Math.abs(r.y - y) < 3);
      if (!row) { row = { y, items: [] }; rows.push(row); }
      row.items.push({ x, s: it.str });
    }
    rows.sort((a, b) => b.y - a.y);
    for (const r of rows) out.push(r.items.sort((a, b) => a.x - b.x).map(i => i.s).join(' ').replace(/\s+/g, ' ').trim());
  }
  return out.join('\n');
}
