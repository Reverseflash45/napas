/* Grafik SVG sederhana. Spesifikasi tanda mengikuti panduan dataviz:
   garis 2px, kisi garis rambut padat, sel bercelah 2px, label selektif. */
import { BAKU_NASIONAL, BULAN, BULAN_PANJANG, PEDOMAN_WHO, angka1, kelasDari } from "./inti";

const NS = "http://www.w3.org/2000/svg";
export const warnaKelas = (k: number) => (k < 0 ? "var(--garis)" : `var(--k${k})`);

/* ---------- tooltip bersama ---------- */
const tip = document.createElement("div");
tip.className = "tooltip";
tip.hidden = true;
tip.setAttribute("role", "status");
document.body.append(tip);

/** Isi tooltip lewat textContent (nama daerah dsb. diperlakukan sebagai data). */
export function tampilkanTip(x: number, y: number, kuat: string, lemah: string) {
  tip.replaceChildren();
  const b = document.createElement("b");
  b.textContent = kuat;
  tip.append(b, document.createTextNode(lemah));
  tip.hidden = false;
  const w = tip.offsetWidth;
  const h = tip.offsetHeight;
  const kiri = Math.min(window.innerWidth - w - 8, Math.max(8, x + 14));
  const atas = y - h - 12 < 8 ? y + 16 : y - h - 12;
  tip.style.left = `${kiri}px`;
  tip.style.top = `${atas}px`;
}
export const sembunyikanTip = () => {
  tip.hidden = true;
};

function el<K extends keyof SVGElementTagNameMap>(nama: K, attr: Record<string, string | number> = {}, teks?: string) {
  const e = document.createElementNS(NS, nama);
  for (const [k, v] of Object.entries(attr)) e.setAttribute(k, String(v));
  if (teks !== undefined) e.textContent = teks;
  return e;
}

const langkahRapi = (maks: number) => {
  const kasar = maks / 5;
  const p = 10 ** Math.floor(Math.log10(kasar));
  const n = kasar / p;
  return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10) * p;
};

/* ---------- tren tahunan: daerah vs median nasional ---------- */
export function garisTren(wadah: HTMLElement, tahun: number[], daerah: (number | null)[], median: (number | null)[], namaDaerah: string) {
  const W = Math.max(300, wadah.clientWidth);
  const H = Math.round(Math.min(280, Math.max(200, W * 0.5)));
  const m = { t: 14, r: 46, b: 26, l: 34 };
  const maks = Math.max(BAKU_NASIONAL + 5, ...daerah.map((x) => x ?? 0), ...median.map((x) => x ?? 0));
  const step = langkahRapi(maks);
  const atas = Math.ceil(maks / step) * step;
  const x = (i: number) => m.l + (i / (tahun.length - 1)) * (W - m.l - m.r);
  const y = (v: number) => H - m.b - (v / atas) * (H - m.t - m.b);
  const svg = el("svg", { class: "grafik", viewBox: `0 0 ${W} ${H}`, role: "img", "aria-label": `Rata-rata PM2.5 tahunan ${namaDaerah} dan median nasional, ${tahun[0]}–${tahun.at(-1)}` });
  for (let v = 0; v <= atas + 1e-9; v += step) {
    svg.append(el("line", { class: v === 0 ? "sumbu-garis" : "kisi", x1: m.l, x2: W - m.r, y1: y(v), y2: y(v) }));
    svg.append(el("text", { x: m.l - 6, y: y(v) + 4, "text-anchor": "end" }, String(v)));
  }
  // garis acuan: pedoman WHO dan baku nasional (garis rambut padat, diberi label)
  for (const [v, label] of [
    [BAKU_NASIONAL, "baku RI 15"],
    [PEDOMAN_WHO, "WHO 5"],
  ] as const) {
    svg.append(el("line", { class: "acuan", x1: m.l, x2: W - m.r, y1: y(v), y2: y(v) }));
    // label di kiri, di atas garisnya, supaya tidak bertabrakan dengan label nilai di ujung kanan
    svg.append(el("text", { class: "label-acuan", x: m.l + 4, y: y(v) - 4 }, label));
  }
  const tikTahun = W < 480 ? [0, 12, tahun.length - 1] : [0, 7, 12, 17, 21, tahun.length - 1];
  for (const t of tikTahun.filter((i) => i < tahun.length)) {
    svg.append(el("text", { x: x(t), y: H - 6, "text-anchor": t === 0 ? "start" : t === tahun.length - 1 ? "end" : "middle" }, String(tahun[t])));
  }
  const jalur = (d: (number | null)[]) =>
    d
      .map((v, i) => (v === null ? "" : `${i === 0 || d[i - 1] === null ? "M" : "L"}${x(i).toFixed(1)},${y(v).toFixed(1)}`))
      .join("");
  svg.append(el("path", { class: "garis-median", d: jalur(median) }));
  svg.append(el("path", { class: "garis-sorot", d: jalur(daerah) }));
  const akhir = daerah.length - 1;
  if (daerah[akhir] !== null) {
    svg.append(el("circle", { class: "titik-ujung", cx: x(akhir), cy: y(daerah[akhir]!), r: 4.5 }));
    svg.append(el("text", { class: "label-kuat", x: x(akhir) + 8, y: y(daerah[akhir]!) + 4 }, angka1(daerah[akhir]!)));
  }
  // garis silang + tooltip: menunjuk tahun terdekat
  const silang = el("line", { class: "silang", y1: m.t, y2: H - m.b, visibility: "hidden" });
  svg.append(silang);
  const area = el("rect", { x: m.l, y: m.t, width: W - m.l - m.r, height: H - m.t - m.b, fill: "transparent", tabindex: 0, "aria-label": "Geser untuk melihat nilai per tahun" });
  svg.append(area);
  let fokusI = tahun.length - 1;
  const tunjuk = (i: number, cx: number, cy: number) => {
    fokusI = i;
    silang.setAttribute("x1", String(x(i)));
    silang.setAttribute("x2", String(x(i)));
    silang.setAttribute("visibility", "visible");
    const v = daerah[i];
    const md = median[i];
    tampilkanTip(cx, cy, `${v === null ? "–" : angka1(v)} µg/m³`, ` ${namaDaerah}, ${tahun[i]}. Median nasional ${md === null ? "–" : angka1(md)}`);
  };
  area.addEventListener("pointermove", (e) => {
    const r = svg.getBoundingClientRect();
    const px = ((e.clientX - r.left) / r.width) * W;
    const i = Math.max(0, Math.min(tahun.length - 1, Math.round(((px - m.l) / (W - m.l - m.r)) * (tahun.length - 1))));
    tunjuk(i, e.clientX, e.clientY);
  });
  const lepas = () => {
    silang.setAttribute("visibility", "hidden");
    sembunyikanTip();
  };
  area.addEventListener("pointerleave", lepas);
  area.addEventListener("blur", lepas);
  area.addEventListener("keydown", (e) => {
    if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
    e.preventDefault();
    const i = Math.max(0, Math.min(tahun.length - 1, fokusI + (e.key === "ArrowRight" ? 1 : -1)));
    const r = svg.getBoundingClientRect();
    tunjuk(i, r.left + (x(i) / W) * r.width, r.top + 20);
  });
  wadah.replaceChildren(svg);
}

/* ---------- kalender bulanan: tahun × bulan ---------- */
export function kalender(wadah: HTMLElement, bulanan: (number | null)[], mulaiTahun: number, namaDaerah: string) {
  const nTahun = Math.ceil(bulanan.length / 12);
  const W = Math.max(300, wadah.clientWidth);
  const kiri = 38;
  const atas = 18;
  const celah = 2;
  const lebarSel = (W - kiri) / 12;
  const tinggiSel = Math.max(9, Math.min(16, lebarSel * 0.42));
  const H = atas + nTahun * tinggiSel + 2;
  const svg = el("svg", { class: "grafik", viewBox: `0 0 ${W} ${H}`, role: "img", "aria-label": `Rata-rata PM2.5 bulanan ${namaDaerah}, ${mulaiTahun}–${mulaiTahun + nTahun - 1}` });
  BULAN.forEach((b, i) => svg.append(el("text", { x: kiri + i * lebarSel + lebarSel / 2, y: 12, "text-anchor": "middle" }, W < 420 ? b[0] : b)));
  for (let t = 0; t < nTahun; t++) {
    const th = mulaiTahun + t;
    if (t % 3 === 0 || t === nTahun - 1) svg.append(el("text", { x: kiri - 6, y: atas + t * tinggiSel + tinggiSel / 2 + 4, "text-anchor": "end" }, String(th)));
    for (let b = 0; b < 12; b++) {
      const v = bulanan[t * 12 + b];
      const sel = el("rect", {
        class: "sel",
        x: kiri + b * lebarSel + celah / 2,
        y: atas + t * tinggiSel + celah / 2,
        width: lebarSel - celah,
        height: tinggiSel - celah,
        rx: 2,
        fill: warnaKelas(kelasDari(v)),
        "data-i": t * 12 + b,
      });
      svg.append(sel);
    }
  }
  const tunjuk = (target: Element | null, cx: number, cy: number) => {
    const i = Number((target as SVGElement | null)?.getAttribute?.("data-i") ?? NaN);
    if (Number.isNaN(i)) return sembunyikanTip();
    const v = bulanan[i];
    tampilkanTip(cx, cy, `${v === null ? "–" : angka1(v)} µg/m³`, ` ${BULAN_PANJANG[i % 12]} ${mulaiTahun + Math.floor(i / 12)}`);
  };
  svg.addEventListener("pointermove", (e) => tunjuk(e.target as Element, e.clientX, e.clientY));
  svg.addEventListener("pointerleave", sembunyikanTip);
  wadah.replaceChildren(svg);
}

/* ---------- kolom: berapa daerah-bulan berasap tiap tahun ---------- */
export function kolom(wadah: HTMLElement, tahun: number[], nilai: number[], labelSatuan: string) {
  const W = Math.max(300, wadah.clientWidth);
  const H = Math.round(Math.min(300, Math.max(210, W * 0.42)));
  const m = { t: 22, r: 8, b: 26, l: 34 };
  const maks = Math.max(...nilai);
  const step = langkahRapi(maks);
  const puncak = Math.ceil(maks / step) * step;
  const slot = (W - m.l - m.r) / tahun.length;
  const lebar = Math.min(24, slot - 2);
  const y = (v: number) => H - m.b - (v / puncak) * (H - m.t - m.b);
  const svg = el("svg", { class: "grafik", viewBox: `0 0 ${W} ${H}`, role: "img", "aria-label": `Jumlah ${labelSatuan} per tahun, ${tahun[0]}–${tahun.at(-1)}` });
  for (let v = 0; v <= puncak + 1e-9; v += step) {
    svg.append(el("line", { class: v === 0 ? "sumbu-garis" : "kisi", x1: m.l, x2: W - m.r, y1: y(v), y2: y(v) }));
    svg.append(el("text", { x: m.l - 6, y: y(v) + 4, "text-anchor": "end" }, String(v)));
  }
  const atasNilai = [...nilai].sort((a, b) => b - a)[3] ?? 0;
  tahun.forEach((t, i) => {
    const v = nilai[i];
    const cx = m.l + i * slot + slot / 2;
    if (v > 0) {
      const h = H - m.b - y(v);
      const r = Math.min(4, h / 2, lebar / 2);
      // ujung data membulat 4px, pangkal di garis dasar tetap persegi
      const x0 = cx - lebar / 2;
      const y0 = y(v);
      svg.append(
        el("path", {
          class: "sel",
          d: `M${x0},${H - m.b}V${y0 + r}Q${x0},${y0} ${x0 + r},${y0}H${x0 + lebar - r}Q${x0 + lebar},${y0} ${x0 + lebar},${y0 + r}V${H - m.b}Z`,
          fill: "var(--sorot)",
          "data-i": i,
        }),
      );
      if (v >= atasNilai && v > 0) svg.append(el("text", { class: "label-kuat", x: cx, y: y0 - 6, "text-anchor": "middle" }, String(v)));
    }
    if ((i % 4 === 0 && i < tahun.length - 2) || i === tahun.length - 1) svg.append(el("text", { x: cx, y: H - 6, "text-anchor": "middle" }, String(t)));
  });
  // area sentuh selebar slot, supaya tahun dengan nilai kecil tetap mudah ditunjuk
  const area = el("rect", { x: m.l, y: m.t, width: W - m.l - m.r, height: H - m.t - m.b, fill: "transparent" });
  svg.append(area);
  area.addEventListener("pointermove", (e) => {
    const r = svg.getBoundingClientRect();
    const px = ((e.clientX - r.left) / r.width) * W;
    const i = Math.max(0, Math.min(tahun.length - 1, Math.floor((px - m.l) / slot)));
    tampilkanTip(e.clientX, e.clientY, `${nilai[i]} ${labelSatuan}`, ` tahun ${tahun[i]}`);
  });
  area.addEventListener("pointerleave", sembunyikanTip);
  wadah.replaceChildren(svg);
}

/* ---------- dumbbell: 1998 → 2024 ---------- */
export type BarisDumbbell = { nama: string; awal: number; akhir: number };

export function dumbbell(wadah: HTMLElement, baris: BarisDumbbell[], tahunAwal: number, tahunAkhir: number) {
  const W = Math.max(300, wadah.clientWidth);
  const kiri = Math.min(170, W * 0.42);
  const tinggi = 34;
  const atas = 8;
  const H = atas + baris.length * tinggi + 26;
  const maks = Math.max(...baris.map((b) => b.akhir), BAKU_NASIONAL);
  const step = langkahRapi(maks);
  const puncak = Math.ceil(maks / step) * step;
  const x = (v: number) => kiri + (v / puncak) * (W - kiri - 48);
  const svg = el("svg", { class: "grafik", viewBox: `0 0 ${W} ${H}`, role: "img", "aria-label": `Perubahan PM2.5 dari ${tahunAwal} ke ${tahunAkhir}` });
  for (let v = 0; v <= puncak + 1e-9; v += step) {
    svg.append(el("line", { class: v === 0 ? "sumbu-garis" : "kisi", x1: x(v), x2: x(v), y1: atas, y2: H - 22 }));
    svg.append(el("text", { x: x(v), y: H - 6, "text-anchor": "middle" }, String(v)));
  }
  baris.forEach((b, i) => {
    const cy = atas + i * tinggi + tinggi / 2;
    svg.append(el("text", { class: "label-kuat", x: kiri - 10, y: cy + 4, "text-anchor": "end" }, b.nama));
    svg.append(el("line", { x1: x(b.awal), x2: x(b.akhir), y1: cy, y2: cy, stroke: "var(--sumbu)", "stroke-width": 2 }));
    svg.append(el("circle", { cx: x(b.awal), cy, r: 5, fill: "var(--k1)", stroke: "var(--kartu)", "stroke-width": 2 }));
    svg.append(el("circle", { cx: x(b.akhir), cy, r: 5, fill: "var(--k5)", stroke: "var(--kartu)", "stroke-width": 2 }));
    svg.append(el("text", { x: x(b.akhir) + 9, y: cy + 4 }, angka1(b.akhir)));
  });
  wadah.replaceChildren(svg);
}
