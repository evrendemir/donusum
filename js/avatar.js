// Cute chibi mascot. f = fitness 0..1 (chubby -> fit), m = mood 0..1, react = ''|'good'|'bad'
const L = (a, b, t) => Math.round((a + (b - a) * t) * 10) / 10;
const r = v => Math.round(v * 10) / 10;
const cl = v => Math.max(0, Math.min(1, v));

export function avatarSVG(f, m, react = '') {
  const sw = L(30, 42, f), ww = L(52, 30, f), hw = L(42, 30, f);
  const torso = `M ${120 - sw} 122 Q ${120 - ww - 8} 150 ${120 - ww} 172 Q ${120 - ww + 2} 196 ${120 - hw} 200 L ${120 + hw} 200 Q ${120 + ww - 2} 196 ${120 + ww} 172 Q ${120 + ww + 8} 150 ${120 + sw} 122 Z`;
  const shorts = `M ${120 - hw - 1} 194 L ${120 + hw + 1} 194 L ${120 + hw + 2} 226 L 123 226 L 120 218 L 117 226 L ${120 - hw - 2} 226 Z`;
  const tank = f >= 0.75;
  const pose = react === 'good' ? 'flex' : (react === 'bad' || m < 0.3 ? 'hang' : 'rest');
  const armW = L(15, 19, f);
  const arm = s => {
    const p0 = [120 + s * (sw - 4), 130];
    let p1, p2;
    if (pose === 'flex') { p1 = [120 + s * (sw + 18), 118]; p2 = [120 + s * (sw + 4), 92]; }
    else if (pose === 'hang') { p1 = [120 + s * (sw + 4), 166]; p2 = [120 + s * sw, 194]; }
    else { p1 = [120 + s * (sw + 10), 162]; p2 = [120 + s * (sw + 6), 188]; }
    const t = 0.36, u = 1 - t;
    const c1 = [u * p0[0] + t * p1[0], u * p0[1] + t * p1[1]];
    const pt = [u * u * p0[0] + 2 * u * t * p1[0] + t * t * p2[0], u * u * p0[1] + 2 * u * t * p1[1] + t * t * p2[1]];
    const mid = [0.25 * p0[0] + 0.5 * p1[0] + 0.25 * p2[0], 0.25 * p0[1] + 0.5 * p1[1] + 0.25 * p2[1]];
    const bc = [0.5 * p0[0] + 0.5 * p1[0], 0.5 * p0[1] + 0.5 * p1[1]];
    return {
      d: `M ${p0.join(' ')} Q ${p1.join(' ')} ${p2.join(' ')}`,
      sleeve: `M ${p0.join(' ')} Q ${r(c1[0])} ${r(c1[1])} ${r(pt[0])} ${r(pt[1])}`,
      bicep: `M ${r(0.7 * p0[0] + 0.3 * bc[0])} ${r(0.7 * p0[1] + 0.3 * bc[1])} L ${r(0.5 * bc[0] + 0.5 * mid[0])} ${r(0.5 * bc[1] + 0.5 * mid[1])}`,
    };
  };
  const aL = arm(-1), aR = arm(1);
  const headRx = L(54, 49, f);
  const hair = `M ${120 - headRx + 4} 62 Q ${120 - headRx + 2} 24 120 22 Q ${120 + headRx - 2} 24 ${120 + headRx - 4} 62 Q 150 46 134 46 Q 128 32 116 42 Q 100 40 ${120 - headRx + 4} 62 Z`;
  const band = `M ${120 - headRx - 1} 60 Q 120 46 ${120 + headRx + 1} 60 L ${120 + headRx + 1} 70 Q 120 56 ${120 - headRx - 1} 70 Z`;
  const knot = `M ${120 + headRx - 2} 62 L ${120 + headRx + 14} 54 L ${120 + headRx + 12} 64 L ${120 + headRx + 16} 74 Z`;
  const eyeRy = L(4.5, 10.5, m), hiY = L(80, 78, m), hiY2 = L(85, 86, m);
  const browL = `M 92 ${L(70, 68, m)} Q 102 ${L(69, 62, m)} 112 ${L(64, 68, m)}`;
  const browR = `M 148 ${L(70, 68, m)} Q 138 ${L(69, 62, m)} 128 ${L(64, 68, m)}`;
  const mouth = `M 112 104 Q 120 ${L(98, 113, m)} 128 104`;
  const happy = r(cl((m - 0.65) * 3));
  const musc = r(cl((f - 0.5) * 2));
  const good = react === 'good', bad = react === 'bad';

  return `<svg class="avatar" viewBox="0 0 240 290" aria-label="Maskotun">
<g class="fig ${react}">
<ellipse cx="120" cy="276" rx="46" ry="6" fill="#000" opacity=".12"/>
<path d="M 108 222 L 106 256" fill="none" stroke="#FFD6B0" stroke-width="${L(22, 17, f)}" stroke-linecap="round"/>
<path d="M 132 222 L 134 256" fill="none" stroke="#FFD6B0" stroke-width="${L(22, 17, f)}" stroke-linecap="round"/>
<ellipse cx="104" cy="266" rx="16" ry="8" fill="#fff" stroke="#2B2D42" stroke-width="2"/>
<ellipse cx="136" cy="266" rx="16" ry="8" fill="#fff" stroke="#2B2D42" stroke-width="2"/>
<path d="M 92 266 Q 104 260 116 266" fill="none" stroke="#FF7A1A" stroke-width="3" stroke-linecap="round"/>
<path d="M 124 266 Q 136 260 148 266" fill="none" stroke="#FF7A1A" stroke-width="3" stroke-linecap="round"/>
<g transform="rotate(${L(3, 0, m)} 120 200)">
<path d="${aL.d}" fill="none" stroke="#FFD6B0" stroke-width="${armW}" stroke-linecap="round" stroke-linejoin="round"/>
<path d="${aR.d}" fill="none" stroke="#FFD6B0" stroke-width="${armW}" stroke-linecap="round" stroke-linejoin="round"/>
<g stroke="#FFD6B0" stroke-width="${r(armW + 6)}" stroke-linecap="round" fill="none" opacity="${musc}"><path d="${aL.bicep}"/><path d="${aR.bicep}"/></g>
<path d="${aL.sleeve}" fill="none" stroke="#3D7BFF" stroke-width="${r(armW + 5)}" stroke-linecap="round" stroke-linejoin="round" opacity="${tank ? 0 : 1}"/>
<path d="${aR.sleeve}" fill="none" stroke="#3D7BFF" stroke-width="${r(armW + 5)}" stroke-linecap="round" stroke-linejoin="round" opacity="${tank ? 0 : 1}"/>
<path d="${shorts}" fill="#2B3A67"/>
<path d="${torso}" fill="#3D7BFF"/>
<ellipse cx="120" cy="170" rx="${r(ww * 0.6)}" ry="${L(14, 2, f)}" fill="#fff" opacity="${r((1 - f) * 0.2)}"/>
<g stroke="#2A5FD6" stroke-width="2.4" stroke-linecap="round" fill="none" opacity="${r(cl((f - 0.5) * 1.8))}">
<path d="M 106 140 Q 113 148 120 143"/><path d="M 134 140 Q 127 148 120 143"/><path d="M 120 154 L 120 180"/><path d="M 112 164 L 128 164"/></g>
<path d="M 108 122 Q 120 134 132 122 L 136 118 Q 120 142 104 118 Z" fill="#2A5FD6"/>
<g transform="rotate(${L(6, 0, m)} 120 120)">
<circle cx="${r(120 - headRx)}" cy="82" r="8" fill="#FFD6B0"/><circle cx="${r(120 + headRx)}" cy="82" r="8" fill="#FFD6B0"/>
<ellipse cx="120" cy="74" rx="${headRx}" ry="50" fill="#FFD6B0"/>
<path d="${hair}" fill="#7A5230"/>
<path d="M 112 28 Q 116 8 134 14" fill="none" stroke="#7A5230" stroke-width="7" stroke-linecap="round"/>
<path d="${band}" fill="#FF7A1A"/><path d="${knot}" fill="#FF7A1A"/>
<g stroke="#B08FBF" stroke-width="2" fill="none" stroke-linecap="round" opacity="${r(cl((0.35 - m) * 2.2))}"><path d="M 94 94 Q 102 98 110 94"/><path d="M 130 94 Q 138 98 146 94"/></g>
<path d="${browL}" fill="none" stroke="#6E4A2A" stroke-width="3" stroke-linecap="round"/>
<path d="${browR}" fill="none" stroke="#6E4A2A" stroke-width="3" stroke-linecap="round"/>
<g class="eye"><ellipse cx="102" cy="82" rx="9" ry="${eyeRy}" fill="#2B2D42"/><circle cx="105" cy="${hiY}" r="3.2" fill="#fff"/><circle cx="99" cy="${hiY2}" r="1.6" fill="#fff"/></g>
<g class="eye"><ellipse cx="138" cy="82" rx="9" ry="${eyeRy}" fill="#2B2D42"/><circle cx="141" cy="${hiY}" r="3.2" fill="#fff"/><circle cx="135" cy="${hiY2}" r="1.6" fill="#fff"/></g>
<circle cx="94" cy="98" r="7" fill="#FFA3A3" opacity="${r(0.45 + m * 0.4)}"/><circle cx="146" cy="98" r="7" fill="#FFA3A3" opacity="${r(0.45 + m * 0.4)}"/>
<path d="${mouth}" fill="none" stroke="#C84B4B" stroke-width="2.6" stroke-linecap="round" opacity="${r(1 - happy)}"/>
<path d="M 110 103 Q 115 112 120 104 Q 125 112 130 103" fill="none" stroke="#C84B4B" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" opacity="${happy}"/>
<path d="M 168 60 Q 174 68 168 72 Q 162 68 168 60 Z" fill="#6EC6FF" opacity="${r(cl((0.4 - m) * 2.5))}"/>
</g></g></g>
${good ? `<g fill="#FFC53D"><path class="spark" d="M 40 90 l 4 9 9 4 -9 4 -4 9 -4 -9 -9 -4 9 -4 z"/><path class="spark" d="M 196 50 l 5 11 11 5 -11 5 -5 11 -5 -11 -11 -5 11 -5 z"/><path class="spark" d="M 52 190 l 3 7 7 3 -7 3 -3 7 -3 -7 -7 -3 7 -3 z"/><path class="spark" d="M 190 160 l 4 9 9 4 -9 4 -4 9 -4 -9 -9 -4 9 -4 z"/></g>` : ''}
${bad ? `<g class="cloudy"><ellipse cx="120" cy="12" rx="26" ry="8" fill="#9AA3B2"/><circle cx="106" cy="9" r="8" fill="#9AA3B2"/><circle cx="124" cy="5" r="10" fill="#9AA3B2"/><circle cx="138" cy="10" r="7" fill="#9AA3B2"/><g stroke="#6EC6FF" stroke-width="2" stroke-linecap="round"><path d="M 106 22 l -3 7"/><path d="M 120 24 l -3 7"/><path d="M 134 22 l -3 7"/></g></g>` : ''}
</svg>`;
}

export function speechFor(f, m, react, tick = 0) {
  if (react === 'good') return ['İşte bu! Hissediyorum!', 'Bir adım daha yaklaştım!', 'Devam, bu tempo!', 'Göbek nereye gidiyor bakalım?'][tick % 4];
  if (react === 'bad') return 'Of... olur böyle şeyler. Sıradaki öğün yeni başlangıç.';
  if (m < 0.3) return 'Yorgunum... ama buradayım.';
  if (m < 0.65) return f > 0.5 ? 'Toparlıyoruz. Sıradaki öğün ne?' : 'Hadi bugünü iyi geçirelim.';
  return f > 0.7 ? 'Aynaya bak bir! Bu benim.' : 'Formdayım, hadi!';
}
