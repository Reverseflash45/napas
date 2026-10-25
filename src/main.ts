import "@fontsource-variable/ibm-plex-sans";
import "./gaya.css";
import type { Topology } from "topojson-specification";
import daerahJson from "./daerah.json";
import { dumbbell, garisTren, kalender, kolom, warnaKelas } from "./grafik";
import {
  ARTI_KELAS,
  BAKU_NASIONAL,
  BULAN_PANJANG,
  type Daerah,
  LABEL_KELAS,
  PEDOMAN_WHO,
  angka1,
  cari,
  dariSimpan,
  kaliWHO,
  kelasDari,
  tambahanUmur,
} from "./inti";
import { buatPeta } from "./peta";

type Tahunan = { tahun: number[]; nilai: Record<string, (number | null)[]> };
type Bulanan = { mulai: string; nilai: Record<string, (number | null)[]> };
type Ringkasan = { tahun: number[]; medianTahunan: number[]; medianBulanan: number[]; asapPerTahun: number[]; puncak: Record<string, [number, number]> };

const DAERAH = (daerahJson as { daerah: Daerah[] }).daerah;
const daerahDari = new Map(DAERAH.map((d) => [d.id, d]));
const $ = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T;

const [tahunan, ringkasan, topo] = await Promise.all([
  fetch("/data/tahunan.json").then((r) => r.json() as Promise<Tahunan>),
  fetch("/data/ringkasan.json").then((r) => r.json() as Promise<Ringkasan>),
  fetch("/data/peta.json").then((r) => r.json() as Promise<Topology>),
]);
let bulanan: Bulanan | null = null;
let janjiBulanan: Promise<Bulanan> | null = null;
const muatBulanan = () =>
  (janjiBulanan ??= fetch("/data/bulanan.json")
    .then((r) => r.json() as Promise<Bulanan>)
    .then((b) => (bulanan = b)));

const TAHUN = tahunan.tahun;
const AKHIR = TAHUN.length - 1;
const nilaiTahun = (id: string, t: number) => dariSimpan(tahunan.nilai[id]?.[t]);
const medianTahunan = ringkasan.medianTahunan.map((x) => x / 10);
const namaPendek = (d: Daerah) => d.nama;

/* peringkat tahun terakhir: 1 = paling kotor */
const urutAkhir = Object.keys(tahunan.nilai)
  .filter((id) => daerahDari.has(id))
  .sort((a, b) => (nilaiTahun(b, AKHIR) ?? 0) - (nilaiTahun(a, AKHIR) ?? 0));
const peringkat = new Map(urutAkhir.map((id, i) => [id, i + 1]));
const N = urutAkhir.length;

/* ---------- teks yang dihitung dari data ---------- */
const hitung = (t: number, f: (v: number) => boolean) => urutAkhir.filter((id) => f(nilaiTahun(id, t) ?? NaN)).length;
const memenuhiAwal = hitung(0, (v) => v <= PEDOMAN_WHO);
let tahunTerakhirAda = 0;
TAHUN.forEach((_, t) => {
  if (hitung(t, (v) => v <= PEDOMAN_WHO) > 0) tahunTerakhirAda = t;
});
const diAtasBaku = hitung(AKHIR, (v) => v > BAKU_NASIONAL);
$("teks-peta").textContent =
  `Pada ${TAHUN[0]} masih ada ${memenuhiAwal} kabupaten/kota yang rata-rata PM2.5-nya memenuhi pedoman WHO (5 µg/m³). ` +
  `Setelah ${TAHUN[tahunTerakhirAda]} tidak ada lagi. Tahun ${TAHUN[AKHIR]}, ${diAtasBaku} dari ${N} daerah bahkan melewati baku mutu nasional 15 µg/m³. ` +
  `Median kabupaten/kota naik dari ${angka1(medianTahunan[0])} ke ${angka1(medianTahunan[AKHIR])} µg/m³.`;

const iTerparah = ringkasan.asapPerTahun.indexOf(Math.max(...ringkasan.asapPerTahun));
const rekor = Object.entries(ringkasan.puncak).sort((a, b) => b[1][1] - a[1][1])[0];
const rekorD = daerahDari.get(rekor[0])!;
const tahunAsap = TAHUN.filter((_, i) => ringkasan.asapPerTahun[i] >= 50);
$("teks-asap").textContent =
  `Bulan-bulan paling pekat hampir selalu September dan Oktober, saat kebakaran hutan dan lahan gambut di Sumatra dan Kalimantan memuncak di akhir kemarau, ` +
  `terutama di tahun-tahun El Niño. Lonjakan besar terlihat pada ${tahunAsap.slice(0, -1).join(", ")}, dan ${tahunAsap.at(-1)}. ` +
  `${TAHUN[iTerparah]} paling parah: ${ringkasan.asapPerTahun[iTerparah]} kali sebuah daerah mencatat rata-rata sebulan di atas 75 µg/m³. ` +
  `Rekor bulanan tertinggi ada di ${rekorD.nama}, ${BULAN_PANJANG[rekor[1][0] % 12]} ${TAHUN[0] + Math.floor(rekor[1][0] / 12)}: ${angka1(rekor[1][1] / 10)} µg/m³, ` +
  `hampir ${Math.round(rekor[1][1] / 10 / PEDOMAN_WHO)} kali pedoman WHO.`;

const naik = urutAkhir
  .map((id) => ({ id, awal: nilaiTahun(id, 0) ?? 0, akhir: nilaiTahun(id, AKHIR) ?? 0 }))
  .sort((a, b) => b.akhir - b.awal - (a.akhir - a.awal))
  .slice(0, 10);
const tigaKota = naik.slice(0, 3).map((x) => daerahDari.get(x.id)!.nama.replace(/^Kota /, ""));
$("teks-kota").textContent =
  `Kenaikan paling tajam terjadi di kota-kota besar, terutama Jabodetabek dan Medan. ${tigaKota.join(", ")} naik ` +
  `${angka1(Math.min(...naik.slice(0, 3).map((x) => x.akhir - x.awal)))}–${angka1(Math.max(...naik.slice(0, 3).map((x) => x.akhir - x.awal)))} µg/m³ sejak ${TAHUN[0]}; ${tigaKota[0]} kira-kira ` +
  `${angka1(naik[0].akhir / naik[0].awal)} kali lipat. Data satelit ini tidak memisahkan sumbernya; studi sumber polusi Jakarta (Vital Strategies dan ITB, 2020) menunjuk asap kendaraan sebagai penyumbang terbesar, disusul pembakaran batu bara, pembakaran terbuka, dan debu.`;

/* ---------- legenda ---------- */
$("legenda").innerHTML = LABEL_KELAS.map((l, k) => `<li><i style="background:${warnaKelas(k)}"></i>${l}<small>${ARTI_KELAS[k]}</small></li>`).join("");

/* ---------- peta & tahun ---------- */
let tahunKini = AKHIR;
const peta = buatPeta(
  $("wadah-peta"),
  topo,
  (id) => daerahDari.get(id)?.nama ?? id,
  (id) => nilaiTahun(id, tahunKini),
  () => String(TAHUN[tahunKini]),
  (id) => pilihDaerah(id, true),
);

const petaMini = buatPeta(
  $("peta-mini"),
  topo,
  (id) => daerahDari.get(id)?.nama ?? id,
  (id) => nilaiTahun(id, AKHIR),
  () => String(TAHUN[AKHIR]),
  (id) => pilihDaerah(id, true),
);
petaMini.warnai((id) => nilaiTahun(id, AKHIR));

function gambarTahun() {
  peta.warnai((id) => nilaiTahun(id, tahunKini));
  $("label-tahun").textContent = String(TAHUN[tahunKini]);
  const memenuhi = hitung(tahunKini, (v) => v <= PEDOMAN_WHO);
  const lewat = hitung(tahunKini, (v) => v > BAKU_NASIONAL);
  $("ringkas-peta").textContent =
    `${TAHUN[tahunKini]}: median ${angka1(medianTahunan[tahunKini])} µg/m³. ${memenuhi} daerah memenuhi pedoman WHO, ${lewat} melewati baku mutu nasional.`;
  gambarTabel();
}

function gambarTabel() {
  const urut = [...urutAkhir].sort((a, b) => (nilaiTahun(b, tahunKini) ?? 0) - (nilaiTahun(a, tahunKini) ?? 0));
  const baris = urut
    .map((id, i) => {
      const d = daerahDari.get(id)!;
      const v = nilaiTahun(id, tahunKini);
      return `<tr><td class="angka">${i + 1}</td><td><button type="button" data-pilih="${id}">${d.nama}</button></td><td>${d.prov}</td><td class="angka"><span class="sw" style="background:${warnaKelas(kelasDari(v))}"></span>${v === null ? "–" : angka1(v)}</td></tr>`;
    })
    .join("");
  $("tabel").innerHTML = `<caption class="tersembunyi">Rata-rata PM2.5 ${TAHUN[tahunKini]} per kabupaten/kota, dari yang paling tinggi</caption>
    <thead><tr><th class="angka">#</th><th>Kabupaten/kota</th><th>Provinsi</th><th class="angka">µg/m³ (${TAHUN[tahunKini]})</th></tr></thead><tbody>${baris}</tbody>`;
}

const penggeser = $<HTMLInputElement>("tahun");
penggeser.addEventListener("input", () => {
  tahunKini = Number(penggeser.value) - TAHUN[0];
  hentikanPutar();
  gambarTahun();
});

let putaran = 0;
const tombolPutar = $<HTMLButtonElement>("putar");
function hentikanPutar() {
  if (!putaran) return;
  clearInterval(putaran);
  putaran = 0;
  tombolPutar.querySelector("span")!.textContent = `Putar ${TAHUN[0]}–${TAHUN[AKHIR]}`;
}
tombolPutar.addEventListener("click", () => {
  if (putaran) return hentikanPutar();
  tahunKini = 0;
  tombolPutar.querySelector("span")!.textContent = "Berhenti";
  const langkah = () => {
    penggeser.value = String(TAHUN[tahunKini]);
    gambarTahun();
    if (tahunKini >= AKHIR) return hentikanPutar();
    tahunKini++;
  };
  langkah();
  putaran = window.setInterval(langkah, 550);
});
$("tabel").addEventListener("click", (e) => {
  const id = (e.target as HTMLElement).closest<HTMLElement>("[data-pilih]")?.dataset.pilih;
  if (id) pilihDaerah(id, true);
});

/* ---------- pencarian ---------- */
const kotak = $<HTMLInputElement>("kotak-cari");
const saran = $<HTMLUListElement>("saran");
let hasilCari: Daerah[] = [];
let aktif = -1;

function gambarSaran() {
  hasilCari = cari(DAERAH, kotak.value);
  aktif = hasilCari.length ? 0 : -1;
  saran.hidden = !hasilCari.length;
  kotak.setAttribute("aria-expanded", String(!saran.hidden));
  saran.replaceChildren(
    ...hasilCari.map((d, i) => {
      const li = document.createElement("li");
      li.id = `saran-${i}`;
      li.setAttribute("role", "option");
      li.setAttribute("aria-selected", String(i === aktif));
      li.dataset.id = d.id;
      const nama = document.createElement("span");
      nama.textContent = namaPendek(d);
      const prov = document.createElement("small");
      prov.textContent = d.prov;
      li.append(nama, prov);
      return li;
    }),
  );
  kotak.setAttribute("aria-activedescendant", aktif >= 0 ? `saran-${aktif}` : "");
}
function tandaiAktif() {
  saran.querySelectorAll("li").forEach((li, i) => li.setAttribute("aria-selected", String(i === aktif)));
  kotak.setAttribute("aria-activedescendant", aktif >= 0 ? `saran-${aktif}` : "");
}
kotak.addEventListener("input", gambarSaran);
kotak.addEventListener("keydown", (e) => {
  if (e.key === "ArrowDown" && hasilCari.length) {
    e.preventDefault();
    aktif = (aktif + 1) % hasilCari.length;
    tandaiAktif();
  } else if (e.key === "ArrowUp" && hasilCari.length) {
    e.preventDefault();
    aktif = (aktif - 1 + hasilCari.length) % hasilCari.length;
    tandaiAktif();
  } else if (e.key === "Enter" && aktif >= 0) {
    e.preventDefault();
    pilihDaerah(hasilCari[aktif].id, false);
  } else if (e.key === "Escape") {
    saran.hidden = true;
    kotak.setAttribute("aria-expanded", "false");
  }
});
saran.addEventListener("pointerdown", (e) => {
  const id = (e.target as HTMLElement).closest<HTMLElement>("li")?.dataset.id;
  if (id) {
    e.preventDefault();
    pilihDaerah(id, false);
  }
});
kotak.addEventListener("blur", () => {
  saran.hidden = true;
  kotak.setAttribute("aria-expanded", "false");
});

const PINTASAN = ["kota-jakarta-pusat", "kota-surabaya", "kota-medan", "kota-kediri", "kota-palangka-raya", "kota-jayapura"];
$("pintasan").innerHTML = PINTASAN.filter((id) => daerahDari.has(id))
  .map((id) => `<li><button type="button" data-pilih="${id}">${daerahDari.get(id)!.nama.replace(/^Kota /, "")}</button></li>`)
  .join("");
$("pintasan").addEventListener("click", (e) => {
  const id = (e.target as HTMLElement).closest<HTMLElement>("[data-pilih]")?.dataset.pilih;
  if (id) pilihDaerah(id, false);
});

/* ---------- kartu daerah ---------- */
let terpilih: string | null = null;
const kartu = $("daerah");

function pilihDaerah(id: string, gulir: boolean) {
  const d = daerahDari.get(id);
  if (!d) return;
  terpilih = id;
  kotak.value = d.nama;
  saran.hidden = true;
  kotak.setAttribute("aria-expanded", "false");
  history.replaceState(null, "", `#daerah=${id}`);
  peta.pilih(id);
  petaMini.pilih(id);
  gambarKartu();
  if (gulir) kartu.scrollIntoView({ block: "start" });
  void muatBulanan().then(() => terpilih === id && gambarKalender());
}

function gambarKartu() {
  if (!terpilih) return;
  const d = daerahDari.get(terpilih)!;
  const v = nilaiTahun(terpilih, AKHIR) ?? 0;
  const v0 = nilaiTahun(terpilih, 0) ?? 0;
  const k = kelasDari(v);
  const umur = tambahanUmur(v);
  const selisih = v - v0;
  kartu.hidden = false;
  kartu.innerHTML = `<div>
      <p class="nama">${d.nama}</p><p class="prov">${d.prov}</p>
      <div class="angka-besar"><b>${angka1(v)}</b><span>µg/m³, rata-rata ${TAHUN[AKHIR]}</span></div>
      <div class="kelas-pil"><i style="background:${warnaKelas(k)}"></i>Kelas ${LABEL_KELAS[k]}: ${ARTI_KELAS[k]}</div>
      <ul class="fakta">
        <li><b>${angka1(kaliWHO(v))} kali pedoman WHO</b><small>Pedoman WHO untuk rata-rata tahunan: 5 µg/m³</small></li>
        <li><b>${v > BAKU_NASIONAL ? "Di atas" : "Di bawah"} baku mutu nasional</b><small>Baku mutu tahunan Indonesia: 15 µg/m³ (PP 22/2021)</small></li>
        <li><b>Peringkat ${peringkat.get(terpilih)} dari ${N}</b><small>diurutkan dari yang paling kotor tahun ${TAHUN[AKHIR]}</small></li>
        <li><b>+${angka1(umur)} tahun harapan hidup</b><small>rata-rata, kalau udaranya sebersih pedoman WHO (perkiraan AQLI)</small></li>
        <li><b>${selisih >= 0 ? "Naik" : "Turun"} ${angka1(Math.abs(selisih))} µg/m³ sejak ${TAHUN[0]}</b><small>${TAHUN[0]}: ${angka1(v0)} µg/m³</small></li>
      </ul>
      <div class="aksi-daerah"><button type="button" class="tombol-teks" id="salin">Salin tautan</button><a href="#peta" class="tombol-teks">Lihat di peta</a></div>
    </div>
    <div class="kanan-daerah">
      <div>
        <p class="judul-grafik">Rata-rata tahunan, ${TAHUN[0]}–${TAHUN[AKHIR]}</p>
        <ul class="kunci"><li><i class="garis-kunci" style="background:var(--sorot)"></i>${d.nama}</li><li><i class="garis-kunci" style="background:var(--median)"></i>median ${N} kabupaten/kota</li></ul>
        <div id="grafik-tren"></div>
      </div>
      <div>
        <p class="judul-grafik">Kalender udara: rata-rata tiap bulan</p>
        <p class="ket-grafik" id="ket-kalender">Memuat data bulanan…</p>
        <div id="grafik-kalender"></div>
      </div>
    </div>`;
  garisTren($("grafik-tren"), TAHUN, tahunan.nilai[terpilih].map(dariSimpan), medianTahunan, d.nama);
  if (bulanan) gambarKalender();
  $("salin").addEventListener("click", async (e) => {
    const t = e.currentTarget as HTMLButtonElement;
    try {
      await navigator.clipboard.writeText(location.href);
      t.textContent = "Tautan disalin";
    } catch {
      t.textContent = "Salin dari bilah alamat";
    }
  });
}

function gambarKalender() {
  if (!terpilih || !bulanan) return;
  const d = daerahDari.get(terpilih)!;
  const deret = bulanan.nilai[terpilih].map(dariSimpan);
  const [iP, vP] = ringkasan.puncak[terpilih];
  $("ket-kalender").textContent = `Bulan terparah: ${BULAN_PANJANG[iP % 12]} ${TAHUN[0] + Math.floor(iP / 12)}, ${angka1(vP / 10)} µg/m³. Warna sama dengan peta.`;
  kalender($("grafik-kalender"), deret, TAHUN[0], d.nama);
}

/* ---------- grafik cerita ---------- */
function gambarCerita() {
  kolom($("grafik-asap"), TAHUN, ringkasan.asapPerTahun, "daerah-bulan");
  dumbbell(
    $("grafik-kota"),
    naik.map((x) => ({ nama: daerahDari.get(x.id)!.nama.replace(/^Kota /, ""), awal: x.awal, akhir: x.akhir })),
    TAHUN[0],
    TAHUN[AKHIR],
  );
}

/* ---------- mulai ---------- */
gambarTahun();
gambarCerita();
const awal = new URLSearchParams(location.hash.slice(1)).get("daerah");
if (awal && daerahDari.has(awal)) pilihDaerah(awal, false);

let lebarLalu = window.innerWidth;
let jedaUkur = 0;
window.addEventListener("resize", () => {
  if (Math.abs(window.innerWidth - lebarLalu) < 40) return;
  lebarLalu = window.innerWidth;
  clearTimeout(jedaUkur);
  jedaUkur = window.setTimeout(() => {
    gambarCerita();
    if (terpilih) {
      garisTren($("grafik-tren"), TAHUN, tahunan.nilai[terpilih].map(dariSimpan), medianTahunan, daerahDari.get(terpilih)!.nama);
      gambarKalender();
    }
  }, 150);
});
