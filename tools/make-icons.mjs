// Renders the mascot head as PNG app icons
import { chromium } from '/opt/npm-tools/node_modules/playwright/index.mjs';
import { avatarSVG } from '../js/avatar.js';
import fs from 'node:fs';

const svg = avatarSVG(0.6, 0.9, '').replace('viewBox="0 0 240 290"', 'viewBox="50 10 140 140"');
const html = `<html><body style="margin:0;background:#FFF7EA"><div style="width:512px;height:512px;background:#FFF7EA;border-radius:0;display:flex;align-items:center;justify-content:center">
<div style="width:440px;height:440px">${svg.replace('class="avatar"', 'style="width:440px;height:440px"')}</div></div></body></html>`;
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 512, height: 512 }, deviceScaleFactor: 1 });
await p.setContent(html);
for (const s of [512, 192, 180]) {
  await p.setViewportSize({ width: 512, height: 512 });
  const buf = await p.screenshot({ clip: { x: 0, y: 0, width: 512, height: 512 } });
  fs.writeFileSync(`icons/icon-${s}.png`, buf);
}
await b.close();
// resize with sharp if available, else leave 512 copies
try {
  const sharp = (await import('sharp')).default;
  for (const s of [192, 180]) await sharp('icons/icon-512.png').resize(s, s).toFile(`icons/icon-${s}.png`);
  console.log('resized with sharp');
} catch { console.log('sharp not available; using 512px copies'); }
