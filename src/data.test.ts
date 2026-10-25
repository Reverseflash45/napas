import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import daerahJson from "./daerah.json";

const baca = (f: string) => JSON.parse(readFileSync(new URL(`../public/data/${f}`, import.meta.url), "utf8"));
const tahunan = baca("tahunan.json") as { tahun: number[]; nilai: Record<string, (number | null)[]> };
const bulanan = baca("bulanan.json") as { mulai: string; nilai: Record<string, (number | null)[]> };
const ringkasan = baca("ringkasan.json") as { asapPerTahun: number[]; medianTahunan: number[] };
const peta = baca("peta.json") as { objects: { daerah: { geometries: { properties: { id: string } }[] } } };
const ids = (daerahJson as { daerah: { id: string }[] }).daerah.map((d) => d.id);

describe("data PM2.5", () => {
  it("semua 514 daerah punya deret tahunan 1998–2024 dan bulanan 324 bulan", () => {
    expect(ids).toHaveLength(514);
    expect(tahunan.tahun[0]).toBe(1998);
    expect(tahunan.tahun.at(-1)).toBe(2024);
    for (const id of ids) {
      expect(tahunan.nilai[id], id).toHaveLength(27);
      expect(bulanan.nilai[id], id).toHaveLength(324);
    }
  });

  it("tidak ada nilai kosong, negatif, atau mustahil (penanda laut -999 sudah dibuang)", () => {
    for (const id of ids) {
      for (const x of tahunan.nilai[id]) {
        expect(x, id).not.toBeNull();
        expect(x!, id).toBeGreaterThan(0);
        expect(x!, id).toBeLessThan(2000); // < 200 µg/m³ rata-rata setahun
      }
      for (const x of bulanan.nilai[id]) {
        expect(x!, id).toBeGreaterThan(0);
        expect(x!, id).toBeLessThan(10000); // < 1000 µg/m³ rata-rata sebulan
      }
    }
  });

  it("rata-rata 12 bulan mendekati nilai tahunan", () => {
    for (const id of ["kota-jakarta-pusat", "kota-palangka-raya", "kota-jayapura"]) {
      for (let t = 0; t < 27; t++) {
        const bln = bulanan.nilai[id].slice(t * 12, t * 12 + 12) as number[];
        const rata = bln.reduce((a, b) => a + b, 0) / 12;
        // produk tahunan dan bulanan dibuat terpisah, jadi boleh beda sedikit
        expect(Math.abs(rata - tahunan.nilai[id][t]!) / tahunan.nilai[id][t]!, `${id} ${1998 + t}`).toBeLessThan(0.25);
      }
    }
  });

  it("setiap id peta punya data", () => {
    for (const g of peta.objects.daerah.geometries) expect(tahunan.nilai[g.properties.id], g.properties.id).toBeDefined();
  });

  it("ringkasan konsisten", () => {
    expect(ringkasan.asapPerTahun).toHaveLength(27);
    expect(ringkasan.medianTahunan).toHaveLength(27);
    expect(Math.max(...ringkasan.asapPerTahun)).toBe(ringkasan.asapPerTahun[2015 - 1998]);
  });
});
