// Diyetisyen plan metni -> haftalık plan. Girdi: paragraf dizisi (boş satırlar seçenek gruplarını ayırır).
const DAYS = { pazartesi: 0, 'salı': 1, sali: 1, 'çarşamba': 2, carsamba: 2, 'perşembe': 3, persembe: 3, cuma: 4, cumartesi: 5, pazar: 6 };
const DAY_WORD = '(pazartesi|salı|sali|çarşamba|carsamba|perşembe|persembe|cumartesi|cuma|pazar)';
const DAY_HEADER_RE = new RegExp(`^(?:${DAY_WORD}(?:\\s*[-–/,&]\\s*|\\s+ve\\s+|\\s+)?)+[\\s:.]*$`);
const DAY_NUM_RE = /^(\d)\s*\.?\s*g[üu]n[\s:.\-–]*(.*)$/;
const DAY_RANGE_SHORT = /^(hafta ?içi|hafta ?sonu)[\s:.]*$/;
const MEAL_RE = /^(?:(\d)\s*[.)]?\s*)?(kahvaltı|kahvalti|sabah|ara ?ö?ğ?ü?n|ara ?ogun|kuşluk|kusluk|öğlen|öğle|ogle|ikindi|akşam|aksam|gece|yatmadan önce|yatmadan once)\s*(?:(\d)\s*)?(?:öğünü|ogunu|öğün|ogun)?\s*(\(([^)]*)\))?\s*[:\-–]?\s*(\(([^)]*)\))?\s*(.*)$/;
const TIME_RE = /(\d{1,2})[.:](\d{2})/;
const NOTE_RE = /(her öğün|öğünden önce|öğünden sonra|bol su|su tüket|su iç|^not\s*:|dikkat|unutma|yasak|tüketme|tüketilmey|içelim|yiyelim|yapalım)/;
const SECENEK_RE = /\s*\(?\d+\s*\.?\s*se[çc]enek\)?\s*:?/gi;
const TIMES = { 'Kahvaltı': '08:30', 'Öğle': '13:30', 'Akşam': '19:30' };
const ARA_TIMES = ['11:00', '16:30', '21:30'];

function mealKind(word) {
  const w = word.toLocaleLowerCase('tr');
  if (/^(kahvalt|sabah)/.test(w)) return { name: 'Kahvaltı', type: 'ana' };
  if (/^(öğle|ogle)/.test(w)) return { name: 'Öğle', type: 'ana' };
  if (/^(akşam|aksam)/.test(w)) return { name: 'Akşam', type: 'ana' };
  return { name: 'Ara öğün', type: 'ara' };
}
function daySet(text) {
  const low = text.toLocaleLowerCase('tr');
  if (/hafta ?içi/.test(low)) return [0, 1, 2, 3, 4];
  if (/hafta ?sonu/.test(low)) return [5, 6];
  const found = [];
  const re = new RegExp(DAY_WORD, 'g'); let m;
  while ((m = re.exec(low))) found.push(DAYS[m[1]]);
  if (!found.length) return null;
  if (found.length === 2 && /[-–]/.test(low) && found[1] > found[0]) { const out = []; for (let i = found[0]; i <= found[1]; i++) out.push(i); return out; }
  return [...new Set(found)];
}
function fmtTime(s) { const m = s && s.match(TIME_RE); if (!m) return null; const h = Number(m[1]), mi = m[2]; return h > 23 ? null : `${String(h).padStart(2, '0')}:${mi}`; }
function clean(s) { return s.replace(SECENEK_RE, ' ').replace(/\s+/g, ' ').replace(/\s+([,)])/g, '$1').trim().replace(/^[-•*·]\s*/, ''); }

export function splitOptions(text) {
  const t = text.replace(/\s+/g, ' ').trim();
  if (!t) return [];
  const parts = t.split(/\s*(?:^|\s)(?:\d+[\)\.]|[a-dA-D][\)\.])\s+(?=\S)/).map(s => s.trim()).filter(Boolean);
  const base = parts.length > 1 ? parts : [t];
  const out = [];
  for (const p of base) for (const o of p.split(/\s+(?:veya|ya da|yada|VEYA|YA DA)\s+|\s+\/\s+|\s*\|\s*/)) { const s = clean(o); if (s) out.push(s); }
  return out;
}

/** paragraphs: string[] (boş string = boş satır). Döner: { days:{0..6:[meal]}, notes:[], detected } */
export function parsePlanParagraphs(paragraphs, defaults) {
  const blocks = []; // { days:[...], meals:[ { name,type,time,onlyDays,groups:[[lines]] } ] }
  let block = null, meal = null, inGap = false;
  const notes = [];
  const newBlock = (days) => { block = { days, meals: [] }; blocks.push(block); meal = null; };
  for (const raw of paragraphs) {
    const line = raw.replace(/ /g, ' ').trim();
    if (!line) { inGap = true; continue; }
    const isNote = raw.startsWith('\u00a7');
    const low = (isNote ? line.slice(1).trim() : line).toLocaleLowerCase('tr');
    if (isNote || (NOTE_RE.test(low) && !MEAL_RE.test(low))) { notes.push(isNote ? line.slice(1).trim() : line); inGap = true; continue; }
    if (DAY_HEADER_RE.test(low) || DAY_RANGE_SHORT.test(low)) { newBlock(daySet(low) || [0, 1, 2, 3, 4, 5, 6]); inGap = false; continue; }
    const dn = low.match(DAY_NUM_RE);
    if (dn) { newBlock([Math.min(6, Math.max(0, Number(dn[1]) - 1))]); if (!dn[2].trim()) continue; }
    const mm = low.match(MEAL_RE);
    if (mm && (mm[8] === '' || /^[:\-–(]/.test(line.slice(line.length - mm[8].length - 1)) || mm[5] || mm[7] || /[:：]/.test(line))) {
      if (!block) newBlock(null);
      const kind = mealKind(mm[2]);
      const paren = [mm[5], mm[7]].filter(Boolean).join(' ');
      const only = daySet(paren || '');
      meal = { ...kind, time: fmtTime(paren), onlyDays: only, groups: [] };
      block.meals.push(meal);
      const rest = line.slice(line.length - mm[8].length).trim();
      if (rest) { meal.groups.push([rest]); }
      inGap = false;
      continue;
    }
    if (!meal) { if (!block || !block.meals.length) { if (blocks.length === 0 && !/program|beslenme|diyet/i.test(low)) notes.push(line); else if (!/program/i.test(low) && blocks.length) notes.push(line); } else notes.push(line); continue; }
    if (inGap || !meal.groups.length) meal.groups.push([]);
    meal.groups[meal.groups.length - 1].push(line);
    inGap = false;
  }
  if (!blocks.length) return null;
  if (blocks[0].days === null) {
    // ilk blok başlıksız: diğer blokların kapsamadığı günler
    const covered = new Set(blocks.slice(1).flatMap(b => b.days || []));
    blocks[0].days = [0, 1, 2, 3, 4, 5, 6].filter(d => !covered.has(d));
    if (!blocks[0].days.length) blocks[0].days = [0, 1, 2, 3, 4, 5, 6];
  }
  return buildPlan(blocks, notes, defaults);
}

/** blocks: [{ days:[0..6], meals:[{ name, type?, time?, onlyDays?, groups?:[[lines]] | options?:[str] }] }] */
export function buildPlan(blocks, notes, defaults) {
  if (!blocks || !blocks.length) return null;
  const plan = { days: {}, notes: (notes || []).map(n => String(n).trim()).filter(n => n.length > 3).slice(0, 8) };
  for (let d = 0; d < 7; d++) plan.days[d] = [];
  for (const b of blocks) {
    const built = [];
    let ara = 0;
    (b.meals || []).forEach((m, i) => {
      const kind = m.type ? { name: m.name, type: m.type } : mealKind(m.name || 'ara');
      let options;
      if (m.groups) {
        options = m.groups.map(g => g.map(clean).filter(Boolean).join(' · ')).filter(Boolean);
        if (options.length === 1 && m.groups[0].length === 1 && /\s(veya|ya da|\/)\s/i.test(m.groups[0][0])) options = splitOptions(m.groups[0][0]);
      } else options = (m.options || []).map(o => String(o).replace(/\s+/g, ' ').trim()).filter(Boolean);
      const time = fmtTime(m.time || '') || m.time && /^\d{2}:\d{2}$/.test(m.time) ? (fmtTime(m.time) || m.time) : (kind.type === 'ara' ? (ARA_TIMES[ara] || '21:30') : TIMES[kind.name]);
      if (kind.type === 'ara') ara++;
      built.push({ id: `${kind.type === 'ara' ? 'ara' + ara : kind.name === 'Kahvaltı' ? 'kahvalti' : kind.name === 'Öğle' ? 'ogle' : 'aksam'}_${i}`, name: kind.name, type: kind.type, time, options, onlyDays: Array.isArray(m.onlyDays) && m.onlyDays.length ? m.onlyDays : null });
    });
    const days = Array.isArray(b.days) && b.days.length ? b.days.filter(d => d >= 0 && d <= 6) : [0, 1, 2, 3, 4, 5, 6];
    for (const d of days) plan.days[d] = built.filter(m => !m.onlyDays || m.onlyDays.includes(d)).map(m => ({ id: m.id, name: m.name, type: m.type, time: m.time, options: [...m.options] }));
  }
  for (let d = 0; d < 7; d++) {
    plan.days[d].sort((a, b) => (a.time || '').localeCompare(b.time || ''));
    if (!plan.days[d].length && defaults) plan.days[d] = defaults.map(m => ({ ...m, options: [] }));
  }
  plan.detected = blocks.length;
  plan.single = blocks.length === 1 && (!blocks[0].days || blocks[0].days.length === 7);
  return plan;
}
export function parsePlanText(text, defaults) { return parsePlanParagraphs(text.split(/\r?\n/), defaults); }

// ---------- dosya okuyucular ----------
function loadScript(src, ready) {
  return new Promise((res, rej) => { if (ready()) return res(); const s = document.createElement('script'); s.src = src; s.onload = () => res(); s.onerror = () => rej(new Error('Kütüphane yüklenemedi (internet gerekli)')); document.head.appendChild(s); });
}
export async function pdfToParagraphs(file) {
  await loadScript('vendor/pdf.min.js', () => window.pdfjsLib);
  window.pdfjsLib.GlobalWorkerOptions.workerSrc = 'vendor/pdf.worker.min.js';
  const doc = await window.pdfjsLib.getDocument({ data: await file.arrayBuffer() }).promise;
  const out = [];
  for (let p = 1; p <= doc.numPages; p++) {
    const tc = await (await doc.getPage(p)).getTextContent();
    const rows = [];
    for (const it of tc.items) {
      if (!it.str.trim()) continue;
      const y = Math.round(it.transform[5]), x = it.transform[4], h = Math.abs(it.transform[3]) || 10;
      let row = rows.find(r => Math.abs(r.y - y) < 3);
      if (!row) { row = { y, h, items: [] }; rows.push(row); }
      row.items.push({ x, s: it.str });
    }
    rows.sort((a, b) => b.y - a.y);
    const gaps = rows.slice(1).map((r, i) => rows[i].y - r.y).filter(g => g > 0).sort((a, b) => a - b);
    const med = gaps[Math.floor(gaps.length / 2)] || 12;
    rows.forEach((r, i) => {
      if (i > 0 && rows[i - 1].y - r.y > med * 1.7) out.push('');
      out.push(r.items.sort((a, b) => a.x - b.x).map(i => i.s).join(' ').replace(/\s+/g, ' ').trim());
    });
    out.push('');
  }
  return out;
}
export async function docxToParagraphs(file) {
  await loadScript('vendor/jszip.min.js', () => window.JSZip);
  const zip = await window.JSZip.loadAsync(file);
  const xml = await zip.file('word/document.xml')?.async('string');
  if (!xml) throw new Error('Word dosyası okunamadı');
  const doc = new DOMParser().parseFromString(xml, 'application/xml');
  const out = []; let seenList = false;
  const W = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main';
  const body = doc.getElementsByTagNameNS(W, 'body')[0];
  const walk = (node) => {
    for (const el of node.children) {
      if (el.localName === 'p') {
        let t = '';
        for (const x of el.getElementsByTagNameNS(W, 't')) t += x.textContent;
        for (const x of el.getElementsByTagNameNS(W, 'tab')) t += ' ';
        t = t.trim();
        const isList = el.getElementsByTagNameNS(W, 'numPr').length > 0;
        if (isList) seenList = true;
        // liste olmayan, başlık da olmayan uzun cümleler (dipnotlar)
        if (t && seenList && !isList && t.length > 40 && !MEAL_RE.test(t.toLocaleLowerCase('tr')) && !DAY_HEADER_RE.test(t.toLocaleLowerCase('tr'))) t = '\u00a7' + t;
        out.push(t);
      } else if (el.localName === 'tbl') {
        for (const tr of el.getElementsByTagNameNS(W, 'tr')) {
          for (const tc of tr.getElementsByTagNameNS(W, 'tc')) { for (const p of tc.getElementsByTagNameNS(W, 'p')) { let t = ''; for (const x of p.getElementsByTagNameNS(W, 't')) t += x.textContent; out.push(t.trim()); } out.push(''); }
        }
        out.push('');
      } else walk(el);
    }
  };
  walk(body);
  return out;
}
export async function fileToParagraphs(file) {
  const n = file.name.toLowerCase();
  if (n.endsWith('.docx')) return docxToParagraphs(file);
  if (n.endsWith('.pdf') || file.type === 'application/pdf') return pdfToParagraphs(file);
  if (n.endsWith('.txt') || file.type.startsWith('text/')) return (await file.text()).split(/\r?\n/);
  throw new Error('Desteklenen dosyalar: PDF, Word (.docx), metin (.txt)');
}
