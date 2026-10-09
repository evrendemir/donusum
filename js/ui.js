import { db } from './db.js';

export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
export const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export const h = (html) => { const t = document.createElement('template'); t.innerHTML = html.trim(); return t.content.firstElementChild; };

let toastT;
export function toast(msg, ms = 2200) {
  const t = $('#toast'); t.textContent = msg; t.hidden = false;
  clearTimeout(toastT); toastT = setTimeout(() => { t.hidden = true; }, ms);
}

export function modal(html) {
  const m = $('#modal'), c = $('.modal-card', m);
  c.innerHTML = html; m.hidden = false;
  const close = () => { m.hidden = true; c.innerHTML = ''; };
  m.onclick = e => { if (e.target === m) close(); };
  return { el: c, close };
}

export function confirmBox(text, okLabel = 'Evet', danger = false) {
  return new Promise(res => {
    const { el, close } = modal(`<p style="font-weight:700;font-size:16px;margin:0 0 14px">${esc(text)}</p>
      <div class="grid2"><button class="btn line" data-x="0">Vazgeç</button><button class="btn ${danger ? 'red' : 'orange'}" data-x="1">${esc(okLabel)}</button></div>`);
    el.onclick = e => { const b = e.target.closest('[data-x]'); if (b) { close(); res(b.dataset.x === '1'); } };
  });
}

// ---------- photos ----------
export function compressImage(file, max = 1280, q = 0.82) {
  return new Promise((res, rej) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const s = Math.min(1, max / Math.max(img.width, img.height));
      const c = document.createElement('canvas');
      c.width = Math.round(img.width * s); c.height = Math.round(img.height * s);
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
      c.toBlob(b => { URL.revokeObjectURL(url); b ? res(b) : rej(new Error('blob')); }, 'image/jpeg', q);
    };
    img.onerror = () => { URL.revokeObjectURL(url); rej(new Error('img')); };
    img.src = url;
  });
}
export async function savePhoto(file) {
  const blob = await compressImage(file);
  const id = 'p' + Date.now() + Math.random().toString(36).slice(2, 7);
  await db.set('photos', id, blob);
  return id;
}
const urlCache = new Map();
export async function photoURL(id) {
  if (urlCache.has(id)) return urlCache.get(id);
  const b = await db.get('photos', id);
  if (!b) return '';
  const u = URL.createObjectURL(b); urlCache.set(id, u); return u;
}
export async function deletePhoto(id) { await db.del('photos', id); urlCache.delete(id); }

export function pickPhoto(capture) {
  return new Promise(res => {
    const inp = document.createElement('input');
    inp.type = 'file'; inp.accept = 'image/*';
    if (capture) inp.capture = 'environment';
    inp.onchange = () => res(inp.files[0] || null);
    inp.click();
  });
}

// ---------- lightbox with pinch zoom ----------
export function openLightbox(src, onDelete) {
  const lb = $('#lightbox'), img = $('img', lb), stage = $('.lb-stage', lb);
  img.src = src; lb.hidden = false;
  let scale = 1, tx = 0, ty = 0, pts = new Map(), startDist = 0, startScale = 1, last = null, lastTap = 0;
  const apply = () => { img.style.transform = `translate(${tx}px,${ty}px) scale(${scale})`; };
  const reset = () => { scale = 1; tx = 0; ty = 0; apply(); };
  reset();
  const down = e => { stage.setPointerCapture(e.pointerId); pts.set(e.pointerId, [e.clientX, e.clientY]);
    if (pts.size === 2) { const [a, b] = [...pts.values()]; startDist = Math.hypot(a[0] - b[0], a[1] - b[1]); startScale = scale; }
    else { last = [e.clientX, e.clientY]; const now = Date.now(); if (now - lastTap < 300) { scale = scale > 1 ? 1 : 2.5; if (scale === 1) { tx = ty = 0; } apply(); } lastTap = now; } };
  const move = e => { if (!pts.has(e.pointerId)) return; pts.set(e.pointerId, [e.clientX, e.clientY]);
    if (pts.size === 2) { const [a, b] = [...pts.values()]; const d = Math.hypot(a[0] - b[0], a[1] - b[1]); scale = Math.max(1, Math.min(5, startScale * d / startDist)); apply(); }
    else if (last && scale > 1) { tx += e.clientX - last[0]; ty += e.clientY - last[1]; last = [e.clientX, e.clientY]; apply(); } };
  const up = e => { pts.delete(e.pointerId); if (pts.size < 2) { startDist = 0; } last = null; if (scale <= 1) { tx = ty = 0; apply(); } };
  stage.onpointerdown = down; stage.onpointermove = move; stage.onpointerup = up; stage.onpointercancel = up;
  const close = () => { lb.hidden = true; img.src = ''; };
  $('.lb-close', lb).onclick = close;
  const del = $('.lb-delete', lb);
  del.hidden = !onDelete;
  del.onclick = async () => { if (await confirmBox('Bu fotoğraf silinsin mi?', 'Sil', true)) { await onDelete(); close(); } };
}

export function confetti() {
  const colors = ['#FF7A1A', '#2FBF71', '#3D7BFF', '#FFC53D', '#F25F5C'];
  for (let i = 0; i < 40; i++) {
    const c = document.createElement('i'); c.className = 'conf';
    c.style.cssText = `left:${Math.random() * 100}vw;top:0;background:${colors[i % 5]};animation-delay:${Math.random() * .6}s;position:fixed;z-index:70`;
    document.body.appendChild(c); setTimeout(() => c.remove(), 2400);
  }
}
export function download(name, blob) {
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; document.body.appendChild(a); a.click();
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 2000);
}
