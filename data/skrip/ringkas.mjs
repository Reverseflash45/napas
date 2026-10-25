// Ringkasan nasional dari public/data/{tahunan,bulanan}.json, supaya halaman
// awal tidak perlu memuat data bulanan.
//   node data/skrip/ringkas.mjs  →  public/data/ringkasan.json
import { readFileSync, writeFileSync } from "node:fs";

const th = JSON.parse(readFileSync("public/data/tahunan.json", "utf8"));
const bl = JSON.parse(readFileSync("public/data/bulanan.json", "utf8"));
const ids = Object.keys(th.nilai);
const median = (a) => {
  const s = a.filter((x) => x !== null).sort((p, q) => p - q);
  const m = s.length >> 1;
  return s.length % 2 ? s[m] : Math.round((s[m - 1] + s[m]) / 2);
};

const medianTahunan = th.tahun.map((_, t) => median(ids.map((i) => th.nilai[i][t])));
const nBulan = bl.nilai[ids[0]].length;
const medianBulanan = Array.from({ length: nBulan }, (_, m) => median(ids.map((i) => bl.nilai[i][m])));

// "daerah-bulan berasap": bulan dengan rata-rata > 75 µg/m³ (×10 = 750)
const asapPerTahun = th.tahun.map((_, t) => {
  let n = 0;
  for (const i of ids) for (let m = t * 12; m < t * 12 + 12; m++) if (bl.nilai[i][m] > 750) n++;
  return n;
});

// puncak bulanan tiap daerah: [indeks bulan, nilai×10]
const puncak = Object.fromEntries(
  ids.map((i) => {
    let mi = 0;
    bl.nilai[i].forEach((x, k) => {
      if (x > bl.nilai[i][mi]) mi = k;
    });
    return [i, [mi, bl.nilai[i][mi]]];
  }),
);

writeFileSync("public/data/ringkasan.json", JSON.stringify({ tahun: th.tahun, medianTahunan, medianBulanan, asapPerTahun, puncak }));
console.log("ringkasan:", asapPerTahun.join(","));
