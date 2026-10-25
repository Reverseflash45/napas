# Napas

Seberapa kotor udara di daerahmu? Rata-rata partikel halus **PM2.5** di 514 kabupaten/kota Indonesia, 1998–2024, dari data satelit yang dikalibrasi alat ukur darat.

**Buka:** https://napas.raffstw.my.id

- Cari kabupaten/kota, lalu lihat:
  - rata-rata 2024 dan berapa kali lipat pedoman WHO
  - posisinya terhadap baku mutu nasional dan peringkatnya
  - perkiraan tambahan harapan hidup (AQLI)
- **Kalender udara:** rata-rata tiap bulan selama 27 tahun. Musim asap September–Oktober terlihat jelas di Sumatra dan Kalimantan.
- **Peta** per tahun dengan tombol putar 1998–2024, plus tabel lengkap 514 daerah.
- Tautan bisa dibagikan: `#daerah=kota-surabaya`.

Temuan: pada 2024 tidak ada satu pun kabupaten/kota yang memenuhi pedoman WHO (5 µg/m³), dan 264 dari 514 melewati baku mutu nasional (15 µg/m³).

## Data

| Data | Sumber |
|---|---|
| PM2.5 bulanan & tahunan, 0,1°, 1998–2024 | [ACAG, Washington University in St. Louis](https://www.satpm.org/v6-gl-03), versi V6.GL.03. Shen dkk. (2024), *ACS ES&T Air*, doi:10.1021/acsestair.3c00054. CC BY 4.0 |
| Batas kabupaten/kota | [geoBoundaries](https://www.geoboundaries.org) ADM2 (BPS, OCHA), CC BY 3.0 IGO |
| Tambahan harapan hidup | [Air Quality Life Index](https://aqli.epic.uchicago.edu): 0,98 tahun per 10 µg/m³ |
| Pembanding | Pedoman WHO 2021 (5 µg/m³ tahunan); baku mutu ambien PP 22/2021 (15 µg/m³ tahunan) |

Nilai tiap daerah adalah rata-rata petak 0,1° yang mengiris batas wilayahnya, ditimbang dengan luas irisan. Petak laut di data sumber bernilai −999 dan dibuang sebelum dirata-rata.

Angka ini perkiraan rata-rata, bukan pengukuran langsung. Data bulanan dan tahunan tidak menangkap lonjakan harian.

## Mengulang pengolahan data

```bash
pip install netCDF4 shapely numpy
python data/skrip/unduh.py      # ~1,8 GB diunduh, dipotong ke kotak Indonesia → data/mentah/kubus.npz
python data/skrip/olah.py . path/ke/adm2_id.geojson   # → public/data/tahunan.json, bulanan.json
node data/skrip/ringkas.mjs     # → public/data/ringkasan.json
```

## Jalankan

```bash
npm install
npm run dev
npm test      # logika + keutuhan data (514 daerah lengkap, tidak ada nilai negatif)
npm run build
```

---

Dibikin sama [Rafi](https://www.raffstw.my.id).
