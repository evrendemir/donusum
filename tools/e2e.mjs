// Smoke test: onboarding -> plan paste -> today meal logging -> weigh-in; screenshots to tools/shots
import { chromium } from '/opt/npm-tools/node_modules/playwright/index.mjs';
import { spawn } from 'node:child_process';
import fs from 'node:fs';

fs.mkdirSync('tools/shots', { recursive: true });
const srv = spawn('python3', ['-m', 'http.server', '8765', '--bind', '127.0.0.1'], { stdio: 'ignore' });
await new Promise(r => setTimeout(r, 800));
const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, locale: 'tr-TR' });
const p = await ctx.newPage();
const errors = [];
p.on('pageerror', e => errors.push('pageerror: ' + e.message));
p.on('console', m => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
const shot = n => p.screenshot({ path: `tools/shots/${n}.png`, fullPage: true });

await p.goto('http://127.0.0.1:8765/');
await p.waitForSelector('#onbform');
await shot('01-onboarding');
await p.fill('[name=name]', 'Evren');
await p.fill('[name=startWeight]', '104');
await p.click('[data-start]');
await p.waitForSelector('[data-pdf]');
await shot('02-plan-empty');
await p.click('[data-paste]');
await p.fill('#ptxt', `Pazartesi
Kahvaltı: 2 yumurta menemen + 1 dilim tam buğday ekmeği veya 3 kaşık yulaf + süt + 5 fındık
Ara öğün: 1 elma + 10 çiğ badem
Öğle: Izgara tavuk (150 g) + bulgur pilavı + salata / Fırında somon + kinoa + salata / Mercimek çorbası + ekmek + cacık
Ara öğün: Yoğurt (200 g) + 1 tatlı kaşığı chia
Akşam: Sebzeli köfte + salata veya Zeytinyağlı fasulye + yoğurt
Salı
Kahvaltı: Beyaz peynir + domates + salatalık + 1 dilim ekmek
Öğle: Tavuklu salata
Akşam: Fırın sebze + yoğurt`);
await p.click('[data-go]');
await p.waitForSelector('.pm'); await p.click('[data-di="0"]'); await p.waitForTimeout(200);
await shot('03-plan-parsed');
const parsed = await p.evaluate(() => [...document.querySelectorAll('.pm textarea')].map(t => t.value));
console.log('PARSED MONDAY?', JSON.stringify(parsed).slice(0, 300));
// docx import for next week
await p.click('[data-w="1"]'); await p.waitForSelector('[data-pdf]');
const [fc] = await Promise.all([p.waitForEvent('filechooser'), p.click('[data-pdf]')]);
await fc.setFiles('/tmp/claude-0/-home-claude-donusum/d7ea8740-3e1d-5437-988a-c86f72f07cb6/scratchpad/docx/plan.docx');
await p.waitForSelector('#ptxt'); await p.click('[data-go]'); await p.waitForSelector('.pm');
await p.click('[data-di="5"]'); await p.waitForTimeout(200);
await shot('03b-plan-docx');
console.log('DOCX SAT:', JSON.stringify(await p.evaluate(() => [...document.querySelectorAll('.pm')].map(x => x.querySelector('.nm').value + ' ' + x.querySelector('[type=time]').value + ' -> ' + x.querySelector('textarea').value.split('\n').length + ' seçenek'))));
console.log('NOTES:', await p.evaluate(() => document.querySelector('.card .small')?.textContent.slice(0, 120)));
await p.click('[data-w="-1"]'); await p.waitForTimeout(200);
await p.click('[data-route=today]');
await p.waitForSelector('.stage');
await shot('04-today');
// log first meal
const open = await p.$('.meal-card.focus');
if (open) { const opt = await open.$('[data-opt]'); if (opt) await opt.click(); await p.click('.meal-card.focus [data-status=good]'); await p.waitForTimeout(300); }
await p.click('[data-walk="30"]');
await p.click('[data-workout]');
await p.waitForTimeout(400);
await shot('05-today-logged');
await p.click('[data-route=week]');
await p.waitForSelector('#kg');
await p.fill('#kg', '103,2');
await p.click('[data-saveweight]');
await p.waitForTimeout(600);
await shot('06-week-weighed');
const lvl = await p.$('.levelup'); if (lvl) await p.click('.levelup button');
await p.click('[data-route=me]');
await p.waitForSelector('[data-ics]');
await shot('07-me');
const ics = await p.evaluate(async () => { const m = await import('./js/screen-me.js'); return m.buildICS().slice(0, 400); });
console.log('ICS', ics.split('\r\n').slice(0, 8).join(' | '));
// reload persists?
await p.reload(); await p.waitForSelector('.stage');
const streak = await p.textContent('.chain.o .n');
console.log('walk streak after reload:', streak.trim());
console.log('ERRORS', errors);
await b.close(); srv.kill();
