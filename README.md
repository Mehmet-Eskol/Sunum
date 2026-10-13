# Gömülü Yazılıma Giriş — Eğitim Sunumu

HTML, CSS ve saf JavaScript ile hazırlanmış, kütüphane gerektirmeyen interaktif bir eğitim sunumu.

## İçerik (20 slayt)

1. Kapak — *veri akan devre izleri animasyonu*
2. Gündem
3. Gömülü sistem nedir? — *Algıla → Karar ver → Harekete geç animasyonu*
4. Kullanım alanları
5. Mikrodenetleyici (MCU) vs Mikroişlemci (MPU)
6. MCU mimarisi — *etkileşimli blok şeması, veri yolunda akan paketler*
7. Geliştirme araç zinciri — *derleme hattında ilerleyen dosya*
8. İlk program: LED yakıp söndürme — *LED simülasyonu*
9. Register ve bit işlemleri — *tıklanabilir 8-bit register*
10. Kesmeler (Interrupts) — *canlı zaman çizelgesi*
11. Zamanlayıcılar ve PWM — *dalga formu, LED parlaklığı ve fan hızı*
12. Haberleşme protokolleri: UART, I²C, SPI, CAN — *hatlarda akan veri bitleri*
13. RTOS — *canlı görev zamanlayıcı (Gantt) animasyonu*
14. Bellek düzeni ve `volatile` — *büyüyen stack/heap ve çakışma animasyonu*
15. Gerçek hayattan örnekler — *termostat, ABS, akıllı bileklik, çamaşır makinesi, kalp pili*
16. Vaka: Drone uçuş kontrolcüsü — *canlı PID simülasyonu (rüzgâr / PID aç-kapat)*
17. Tarihten dersler — *Ariane 5, Mars Pathfinder, Therac-25, Toyota*
18. En iyi uygulamalar
19. Mini quiz
20. Teşekkürler & kaynaklar

Konu slaytlarında "🌍 Gerçek hayatta" kutuları, anlatılan kavramın günlük hayattaki karşılığını gösterir.

## Çalıştırma

Herhangi bir kurulum gerekmez; `index.html` dosyasını tarayıcıda açmanız yeterli.
GitHub Pages ile yayınlamak için: **Settings → Pages → Branch** altından bu dalı seçin.

## Kısayollar

| Tuş | İşlev |
| --- | --- |
| `→` / `Boşluk` / `PageDown` | Sonraki slayt |
| `←` / `PageUp` | Önceki slayt |
| `Home` / `End` | İlk / son slayt |
| `F` | Tam ekran |
| `O` | Genel bakış (slayt listesi) |
| `Esc` | Genel bakışı kapat |

Dokunmatik ekranlarda sağa/sola kaydırarak gezinebilirsiniz. Adres çubuğundaki `#5` gibi bir değerle doğrudan bir slayta gidebilirsiniz.

## Dosyalar

- `index.html` — slayt içerikleri
- `style.css` — tema ve düzen (duyarlı tasarım)
- `script.js` — gezinme ve etkileşimli demolar
