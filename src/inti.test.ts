import { describe, expect, it } from "vitest";
import daerahJson from "./daerah.json";
import { type Daerah, BATAS_KELAS, LABEL_KELAS, ARTI_KELAS, bulanTerparah, cari, kelasDari, median, normal, tambahanUmur } from "./inti";

const DAERAH = (daerahJson as { daerah: Daerah[] }).daerah;

describe("kelas", () => {
  it("batas kelas mengikuti ambang WHO", () => {
    expect(kelasDari(4.9)).toBe(0);
    expect(kelasDari(5)).toBe(0);
    expect(kelasDari(5.01)).toBe(1);
    expect(kelasDari(15)).toBe(2);
    expect(kelasDari(36)).toBe(5);
    expect(kelasDari(160)).toBe(6);
    expect(kelasDari(null)).toBe(-1);
  });
  it("label dan arti sejumlah kelas", () => {
    expect(LABEL_KELAS).toHaveLength(BATAS_KELAS.length + 1);
    expect(ARTI_KELAS).toHaveLength(BATAS_KELAS.length + 1);
  });
});

describe("AQLI", () => {
  it("0,98 tahun per 10 µg/m³ di atas pedoman", () => {
    expect(tambahanUmur(15)).toBeCloseTo(0.98, 5);
    expect(tambahanUmur(3)).toBe(0);
  });
});

describe("pencarian", () => {
  it("menemukan kota dengan atau tanpa awalan", () => {
    expect(cari(DAERAH, "surabaya")[0].nama).toBe("Kota Surabaya");
    expect(cari(DAERAH, "Kota Kupang")[0].nama).toBe("Kota Kupang");
    expect(cari(DAERAH, "palangka")[0].id).toBe("kota-palangka-raya");
    expect(cari(DAERAH, "Kab Kupang")[0].nama).toBe("Kab. Kupang");
  });
  it("normal membuang awalan dan tanda baca", () => {
    expect(normal("Kab. Aceh Barat")).toBe("aceh barat");
  });
  it("kueri kosong tidak mengembalikan apa-apa", () => {
    expect(cari(DAERAH, "  ")).toEqual([]);
  });
});

describe("statistik", () => {
  it("median melewati null", () => {
    expect(median([3, null, 1, 2])).toBe(2);
    expect(median([4, 1, 2, 3])).toBe(2.5);
    expect(median([null])).toBe(null);
  });
  it("bulan terparah", () => {
    const b = Array(24).fill(10);
    b[21] = 200; // Okt 1999
    expect(bulanTerparah(b)).toEqual({ tahun: 1999, bulan: 9, nilai: 200 });
  });
});
