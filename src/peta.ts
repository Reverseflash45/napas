/* Peta pilihan warna 514 kabupaten/kota (SVG, d3-geo). */
import type { Feature, FeatureCollection, Geometry } from "geojson";
import { type GeoProjection, geoMercator, geoPath, geoTransform } from "d3-geo";
import { feature } from "topojson-client";
import type { Topology } from "topojson-specification";
import { warnaKelas, sembunyikanTip, tampilkanTip } from "./grafik";
import { angka1, kelasDari } from "./inti";

type Prop = { id: string };

/** Semua titik sudut poligon; cukup untuk memaskan proyeksi tanpa menjalankan seluruh jalur d3. */
function titikSudut(fc: FeatureCollection<Geometry, Prop>): [number, number][] {
  const hasil: [number, number][] = [];
  for (const f of fc.features) {
    const g = f.geometry;
    const poligon = g.type === "Polygon" ? [g.coordinates] : g.type === "MultiPolygon" ? g.coordinates : [];
    for (const p of poligon) for (const r of p) for (const t of r) hasil.push(t as [number, number]);
  }
  return hasil;
}

/** Mercator tanpa pemotongan bola dan resampling d3. Indonesia tidak melintasi antimeridian dan titiknya
 * rapat, jadi hasilnya sama, tetapi path digambar beberapa kali lebih cepat. */
function proyeksiDatar(p: GeoProjection) {
  return geoTransform({
    point(x, y) {
      const [px, py] = p([x, y])!;
      this.stream.point(px, py);
    },
  });
}

export type Peta = {
  warnai: (nilai: (id: string) => number | null) => void;
  pilih: (id: string | null) => void;
};

export function buatPeta(
  wadah: HTMLElement,
  topo: Topology,
  namaDari: (id: string) => string,
  nilaiDari: (id: string) => number | null,
  keterangan: () => string,
  saatKlik: (id: string) => void,
): Peta {
  const fc = feature(topo, topo.objects.daerah) as unknown as FeatureCollection<Geometry, Prop>;
  const W = 1000;
  const H = 420;
  const proyeksi = geoMercator().fitExtent(
    [
      [4, 4],
      [W - 4, H - 4],
    ],
    { type: "MultiPoint", coordinates: titikSudut(fc) },
  );
  const jalur = geoPath(proyeksiDatar(proyeksi)).digits(1);
  const NS = "http://www.w3.org/2000/svg";
  const svg = document.createElementNS(NS, "svg");
  svg.setAttribute("class", "peta");
  svg.setAttribute("viewBox", `0 0 ${W} ${H}`);
  svg.setAttribute("role", "img");
  svg.setAttribute("aria-label", "Peta rata-rata PM2.5 per kabupaten/kota. Nilai lengkap ada di tabel di bawah peta.");
  const elemen = new Map<string, SVGPathElement>();
  for (const f of fc.features as Feature<Geometry, Prop>[]) {
    const p = document.createElementNS(NS, "path");
    p.setAttribute("d", jalur(f) ?? "");
    p.dataset.id = f.properties.id;
    svg.append(p);
    elemen.set(f.properties.id, p);
  }
  wadah.replaceChildren(svg);

  let terpilih: string | null = null;
  svg.addEventListener("pointermove", (e) => {
    const id = (e.target as SVGElement).dataset?.id;
    if (!id) return sembunyikanTip();
    const v = nilaiDari(id);
    tampilkanTip(e.clientX, e.clientY, `${v === null ? "–" : angka1(v)} µg/m³`, ` ${namaDari(id)}, ${keterangan()}`);
  });
  svg.addEventListener("pointerleave", sembunyikanTip);
  svg.addEventListener("click", (e) => {
    const id = (e.target as SVGElement).dataset?.id;
    if (id) saatKlik(id);
  });

  return {
    warnai(nilai) {
      for (const [id, p] of elemen) p.style.fill = warnaKelas(kelasDari(nilai(id)));
    },
    pilih(id) {
      if (terpilih) elemen.get(terpilih)?.classList.remove("pilih");
      terpilih = id;
      const p = id ? elemen.get(id) : null;
      if (p) {
        p.classList.add("pilih");
        p.parentNode?.append(p); // garis tepi di atas tetangganya
      }
    },
  };
}
