# Dönüşüm

Kişisel diyet + yürüyüş + antrenman takip PWA'sı. Tombul maskot, sen plana uydukça ve hareket ettikçe fit ve kaslı bir karaktere dönüşür.

- Tamamen çevrimdışı, veriler sadece cihazda (IndexedDB). Hesap yok, sunucu yok.
- Haftalık diyetisyen planı: PDF yükle / metin yapıştır / elle gir.
- Öğün başına Uydum / Kısmen / Saptım + haftada 1 joker, not ve fotoğraf.
- Zincirler: günlük yürüyüş, haftada 2 antrenman, temiz beslenme günleri.
- XP, seviyeler, rozetler; tartı günü ve kilo grafiği.
- Hatırlatıcılar iPhone Takvim'e `.ics` olarak eklenir.
- Yedek: fotoğraflar dahil tek `.zip`.

## Kurulum (iPhone)

Safari'de siteyi aç → Paylaş → **Ana Ekrana Ekle**.

## Geliştirme

Statik dosyalar; herhangi bir HTTP sunucusu yeter: `python3 -m http.server 8765`.
`node tools/e2e.mjs` duman testini çalıştırır (Playwright gerekir).
