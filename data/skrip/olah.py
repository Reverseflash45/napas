"""Rata-rata PM2.5 per kabupaten/kota dari kubus.npz (ACAG V6.GL.03, 0.1°).

Tiap daerah = rata-rata sel grid berbobot luas irisan sel dengan poligon
daerah (pada proyeksi lintang-bujur, dikoreksi cos lintang). Daerah yang
lebih kecil dari satu sel tetap dapat nilai dari sel yang mengirisnya.

Keluaran (ke folder proyek):
  public/data/tahunan.json   {tahun:[1998..2024], nilai:{id:[x10,...]}}
  public/data/bulanan.json   {mulai:"1998-01", nilai:{id:[x10,...]}}   (dimuat saat daerah dipilih)
"""
import json, os, sys
import numpy as np
from shapely.geometry import box, shape
from shapely.prepared import prep

D = os.path.dirname(os.path.abspath(__file__))
KUBUS = os.path.join(D, "..", "mentah", "kubus.npz")
PROYEK = sys.argv[1] if len(sys.argv) > 1 else os.path.abspath(os.path.join(D, "..", ".."))
BATAS = sys.argv[2] if len(sys.argv) > 2 else os.path.join(D, "..", "mentah", "adm2_id.geojson")

k = np.load(KUBUS)
lat, lon = k["lat"].astype(float), k["lon"].astype(float)
tahunan, bulanan = k["tahunan"].copy(), k["bulanan"].copy()
# Sel laut/tanpa data bernilai -999 (bukan NaN). Wajib dibuang sebelum dirata-rata,
# kalau tidak, daerah pesisir ikut terseret turun.
for arr in (tahunan, bulanan):
    arr[arr <= -100] = np.nan
print("sisa nilai negatif:", int((tahunan < 0).sum()), int((bulanan < 0).sum()), "min", float(np.nanmin(bulanan)))
dlat = float(np.median(np.diff(lat)))
dlon = float(np.median(np.diff(lon)))
print("grid", tahunan.shape, bulanan.shape, "langkah", round(dlat, 4), round(dlon, 4))

fitur = json.load(open(BATAS, encoding="utf-8"))["features"]
NLAT, NLON = len(lat), len(lon)

bobot = {}  # id -> (indeks datar sel, bobot)
for f in fitur:
    g = shape(f["geometry"])
    if not g.is_valid:
        g = g.buffer(0)
    x0, y0, x1, y1 = g.bounds
    i0 = max(0, int(np.floor((y0 - lat[0]) / dlat)) - 1)
    i1 = min(NLAT - 1, int(np.ceil((y1 - lat[0]) / dlat)) + 1)
    j0 = max(0, int(np.floor((x0 - lon[0]) / dlon)) - 1)
    j1 = min(NLON - 1, int(np.ceil((x1 - lon[0]) / dlon)) + 1)
    pg = prep(g)
    idx, w = [], []
    for i in range(i0, i1 + 1):
        for j in range(j0, j1 + 1):
            sel = box(lon[j] - dlon / 2, lat[i] - dlat / 2, lon[j] + dlon / 2, lat[i] + dlat / 2)
            if not pg.intersects(sel):
                continue
            a = g.intersection(sel).area * np.cos(np.radians(lat[i]))
            if a > 0:
                idx.append(i * NLON + j)
                w.append(a)
    if not idx:
        raise SystemExit(f"tidak ada sel untuk {f['properties']['id']}")
    bobot[f["properties"]["id"]] = (np.array(idx), np.array(w))

print("daerah", len(bobot), "sel per daerah: min", min(len(v[0]) for v in bobot.values()), "maks", max(len(v[0]) for v in bobot.values()))


def rata(stack):
    datar = stack.reshape(stack.shape[0], -1)
    hasil = {}
    kosong = []
    for did, (idx, w) in bobot.items():
        nilai = datar[:, idx]  # [waktu, sel]
        ada = ~np.isnan(nilai)
        ww = np.where(ada, w, 0.0)
        jml = ww.sum(axis=1)
        m = np.where(jml > 0, np.nansum(np.where(ada, nilai, 0) * ww, axis=1) / np.where(jml > 0, jml, 1), np.nan)
        if np.isnan(m).any():
            kosong.append((did, int(np.isnan(m).sum())))
        hasil[did] = [None if np.isnan(x) else int(round(x * 10)) for x in m]
    return hasil, kosong


th, k1 = rata(tahunan)
bl, k2 = rata(bulanan)
print("nilai kosong tahunan", k1[:5], "bulanan", k2[:5])

os.makedirs(os.path.join(PROYEK, "public", "data"), exist_ok=True)
with open(os.path.join(PROYEK, "public", "data", "tahunan.json"), "w", encoding="utf-8") as f:
    json.dump({"tahun": list(range(1998, 1998 + tahunan.shape[0])), "nilai": th}, f, separators=(",", ":"))
with open(os.path.join(PROYEK, "public", "data", "bulanan.json"), "w", encoding="utf-8") as f:
    json.dump({"mulai": "1998-01", "nilai": bl}, f, separators=(",", ":"))

# ringkasan cepat untuk pemeriksaan
def nama(i):
    return i
akhir = {d: v[-1] / 10 for d, v in th.items() if v[-1] is not None}
urut = sorted(akhir.items(), key=lambda x: x[1])
print("2024 terbersih", urut[:5])
print("2024 terkotor", urut[-5:])
for d in ["kota-jakarta-pusat", "kota-palangka-raya", "kota-pekanbaru", "kota-kupang", "kab-rote-ndao", "kota-surabaya", "kota-jayapura", "kota-mojokerto"]:
    if d in th:
        print(d, "1998", th[d][0] / 10, "2015", th[d][17] / 10, "2024", th[d][-1] / 10, "| Okt 2015", bl[d][17 * 12 + 9] / 10)
