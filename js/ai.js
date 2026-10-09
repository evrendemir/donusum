// Claude API (tarayıcıdan doğrudan) ile plan okuma — fotoğraf veya metin -> blocks JSON
import { S } from './state.js';
import { compressImage } from './ui.js';

export const AI_MODELS = [
  { id: 'claude-sonnet-5-5', name: 'Sonnet 5.5 (daha isabetli)' },
  { id: 'claude-haiku-5-5', name: 'Haiku 5.5 (daha ucuz, hızlı)' },
];
export function aiReady() { return !!(S.settings?.aiKey); }

const SYSTEM = `Sen bir diyetisyen beslenme programını yapılandırılmış veriye çeviren asistansın. Kullanıcı sana programın fotoğrafını ve/veya metnini verir. Görevin SADECE geçerli bir JSON döndürmek (açıklama, kod bloğu, başka metin YOK).

Şema:
{
  "blocks": [
    { "days": [0,1,2,3,4],            // 0=Pazartesi ... 6=Pazar. Bu bloğun geçerli olduğu günler
      "meals": [
        { "name": "Kahvaltı" | "Öğle" | "Akşam" | "Ara öğün",
          "time": "08:30",            // başlangıç saati; yoksa null
          "onlyDays": [1,3] | null,   // öğün sadece belirli günlerdeyse
          "options": ["...", "..."]   // birbirinin ALTERNATİFİ olan seçenekler
        }
      ]
    }
  ],
  "notes": ["program geneli notlar, ör. su, elma sirkesi, yasaklar"]
}

Kurallar:
- Program hafta içi / hafta sonu ya da gün gün ayrılmışsa her bölüm ayrı bir block olsun. Ayrım yoksa tek block, days: [0,1,2,3,4,5,6].
- Bir öğünde "1.Seçenek / 2.Seçenek" gibi alternatif gruplar varsa her grup TEK bir option olsun; grubun kalemlerini " · " ile birleştir (ör. "6 köfte et veya tavuk · Bol salata · 6 yk bulgur").
- Satır içindeki "veya"lar (ör. "badem veya fındık") aynı option içinde kalır; onları ayrı option yapma. Sadece tek satırlık öğünlerde "A veya B" açıkça iki alternatifse ikiye ayır.
- Miktarları ve parantez notlarını koru ("(haftada 2)", "(kod 0 veya 1)").
- "1.Ara Öğün", "2.Ara Öğün" -> name "Ara öğün", sırasıyla ayrı öğün.
- Saat aralığından başlangıcı al ("12.30-13.30" -> "12:30").
- Okunamayan yerleri tahmin etme; emin değilsen option'ı "[okunamadı]" ile işaretle.
- Türkçe karakterleri koru.`;

function blobToBase64(blob) {
  return new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(String(r.result).split(',')[1]); r.onerror = rej; r.readAsDataURL(blob); });
}

export async function aiParsePlan({ images = [], text = '' }) {
  const key = S.settings?.aiKey; if (!key) throw new Error('API anahtarı yok');
  const model = S.settings?.aiModel || AI_MODELS[0].id;
  const content = [];
  for (const f of images) {
    const blob = await compressImage(f, 1600, 0.85);
    content.push({ type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: await blobToBase64(blob) } });
  }
  content.push({ type: 'text', text: (text ? `Program metni:\n\n${text}\n\n` : '') + (images.length ? `Ekteki ${images.length} fotoğraftaki beslenme programını` : 'Yukarıdaki beslenme programını') + ' şemaya göre JSON olarak çıkar.' });
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-api-key': key, 'anthropic-version': '2023-06-01', 'anthropic-dangerous-direct-browser-access': 'true' },
    body: JSON.stringify({ model, max_tokens: 6000, system: SYSTEM, messages: [{ role: 'user', content }] }),
  });
  if (!res.ok) {
    let msg = res.status + '';
    try { msg = (await res.json()).error?.message || msg; } catch {}
    if (res.status === 401) throw new Error('API anahtarı geçersiz (Ben › Yapay zeka)');
    if (res.status === 429 || res.status === 529) throw new Error('Servis yoğun, biraz sonra tekrar dene');
    throw new Error('AI hatası: ' + msg);
  }
  const data = await res.json();
  const raw = (data.content || []).filter(c => c.type === 'text').map(c => c.text).join('\n');
  const a = raw.indexOf('{'), b = raw.lastIndexOf('}');
  if (a < 0 || b < 0) throw new Error('AI anlaşılır bir cevap vermedi');
  let json;
  try { json = JSON.parse(raw.slice(a, b + 1)); } catch { throw new Error('AI cevabı çözülemedi'); }
  if (!Array.isArray(json.blocks) || !json.blocks.length) throw new Error('Programda öğün bulunamadı');
  return { blocks: json.blocks, notes: json.notes || [], usage: data.usage };
}

export async function aiTest() {
  const key = S.settings?.aiKey; if (!key) throw new Error('Anahtar girilmemiş');
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-api-key': key, 'anthropic-version': '2023-06-01', 'anthropic-dangerous-direct-browser-access': 'true' },
    body: JSON.stringify({ model: S.settings?.aiModel || AI_MODELS[0].id, max_tokens: 10, messages: [{ role: 'user', content: 'Merhaba de.' }] }),
  });
  if (res.status === 401) throw new Error('Anahtar geçersiz');
  if (!res.ok) throw new Error('Hata ' + res.status);
  return true;
}
