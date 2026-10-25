/* Logika murni (tanpa DOM) supaya bisa diuji. */

/** Pedoman WHO 2021 untuk PM2.5 rata-rata tahunan. */
export const PEDOMAN_WHO = 5;
/** Baku mutu udara ambien nasional PM2.5 tahunan (PP 22/2021, Lampiran VII). */
export const BAKU_NASIONAL = 15;

/* Kelas peta: batas atas tiap kelas. Mengikuti pedoman WHO (5) dan target
   antaranya (IT-4 10, IT-3 15, IT-2 25, IT-1 35); kelas 35–75 dan >75
   untuk bulan-bulan berasap. */
export const BATAS_KELAS = [5, 10, 15, 25, 35, 75] as const;
export const LABEL_KELAS = ["≤ 5", "5–10", "10–15", "15–25", "25–35", "35–75", "> 75"];
export const ARTI_KELAS = [
  "memenuhi pedoman WHO",
  "target antara WHO ke-4",
  "baku mutu tahunan Indonesia",
  "target antara WHO ke-2",
  "target antara WHO ke-1",
  "di atas semua target WHO",
  "asap pekat",
];

export function kelasDari(nilai: number | null): number {
  if (nilai === null || Number.isNaN(nilai)) return -1;
  for (let i = 0; i < BATAS_KELAS.length; i++) if (nilai <= BATAS_KELAS[i]) return i;
  return BATAS_KELAS.length;
}

/** Tambahan harapan hidup bila PM2.5 turun ke pedoman WHO.
    Air Quality Life Index (EPIC, Univ. Chicago): 0,98 tahun per 10 µg/m³. */
export function tambahanUmur(nilai: number): number {
  return Math.max(0, nilai - PEDOMAN_WHO) * 0.098;
}

export const kaliWHO = (nilai: number) => nilai / PEDOMAN_WHO;

const fmt1 = new Intl.NumberFormat("id-ID", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
export const angka1 = (x: number) => fmt1.format(x);

/** Data disimpan ×10 sebagai bilangan bulat. */
export const dariSimpan = (x: number | null | undefined) => (x === null || x === undefined ? null : x / 10);

export const BULAN = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];
export const BULAN_PANJANG = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];

/** Median nilai yang ada (null dilewati). */
export function median(xs: (number | null)[]): number | null {
  const a = xs.filter((x): x is number => x !== null).sort((p, q) => p - q);
  if (!a.length) return null;
  const m = a.length >> 1;
  return a.length % 2 ? a[m] : (a[m - 1] + a[m]) / 2;
}

/** Huruf kecil, tanpa tanda baca/awalan "Kab."/"Kota", untuk pencarian. */
export function normal(s: string) {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/\b(kab|kabupaten|kota|adm|administrasi)\b\.?/g, " ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export type Daerah = { id: string; nama: string; prov: string; pulau: string; titik: [number, number] };

/** Cari daerah: awalan kata lebih dulu, lalu yang memuat. */
export function cari(daftar: Daerah[], kueri: string, batas = 8): Daerah[] {
  const q = normal(kueri);
  if (!q) return [];
  // "Kota Kupang" vs "Kab. Kupang": awalan yang diketik menentukan mana yang didahulukan
  const mau = /^\s*kota\b/i.test(kueri) ? "Kota" : /^\s*kab/i.test(kueri) ? "Kab." : null;
  const skor = (d: Daerah) => {
    const n = normal(d.nama);
    const beda = mau && !d.nama.startsWith(mau) ? 0.5 : 0;
    if (n === q) return 0 + beda;
    if (n.startsWith(q)) return 1 + beda;
    if (n.split(" ").some((k) => k.startsWith(q))) return 2 + beda;
    if (n.includes(q)) return 3 + beda;
    if (normal(d.prov).startsWith(q)) return 4;
    return 9;
  };
  return daftar
    .map((d) => ({ d, s: skor(d) }))
    .filter((x) => x.s < 9)
    .sort((a, b) => a.s - b.s || a.d.nama.localeCompare(b.d.nama, "id"))
    .slice(0, batas)
    .map((x) => x.d);
}

/** Bulan dengan nilai tertinggi dalam deret bulanan (indeks dari Jan 1998). */
export function bulanTerparah(bulanan: (number | null)[], mulaiTahun = 1998) {
  let iMaks = -1;
  let maks = -Infinity;
  bulanan.forEach((x, i) => {
    if (x !== null && x > maks) {
      maks = x;
      iMaks = i;
    }
  });
  return iMaks < 0 ? null : { tahun: mulaiTahun + Math.floor(iMaks / 12), bulan: iMaks % 12, nilai: maks };
}
