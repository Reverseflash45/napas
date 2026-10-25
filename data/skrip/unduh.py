"""Unduh PM2.5 bulanan & tahunan ACAG V6.GL.03 (0.1°, global), potong ke kotak Indonesia.

Hasil: kubus.npz berisi
  bulanan  float32 [324, NLAT, NLON]  (1998-01 … 2024-12)
  tahunan  float32 [27,  NLAT, NLON]  (1998 … 2024)
  lat, lon
File .nc mentah dihapus setelah dipotong.
"""
import concurrent.futures as cf
import os, sys, time, urllib.request
import netCDF4
import numpy as np

D = os.path.dirname(os.path.abspath(__file__))
TMP = os.path.join(D, "..", "mentah", "nc")
os.makedirs(TMP, exist_ok=True)
URL = "https://satpmdata.s3.amazonaws.com/V6GL03/CNNPM25c0p10/{jenis}/GL/V6GL03.CNNPM25.0p10.GL.{a}-{b}.nc"
LAT = (-11.5, 6.5)
LON = (94.0, 142.0)
TAHUN = range(1998, 2025)


def potong(path):
    d = netCDF4.Dataset(path)
    lat = d.variables["lat"][:]
    lon = d.variables["lon"][:]
    i = np.where((lat >= LAT[0]) & (lat <= LAT[1]))[0]
    j = np.where((lon >= LON[0]) & (lon <= LON[1]))[0]
    a = d.variables["PM25"][i.min() : i.max() + 1, j.min() : j.max() + 1]
    out = np.ma.filled(a.astype(np.float32), np.nan), lat[i.min() : i.max() + 1], lon[j.min() : j.max() + 1]
    d.close()
    return out


def ambil(tugas):
    jenis, a, b = tugas
    url = URL.format(jenis=jenis, a=a, b=b)
    path = os.path.join(TMP, f"{jenis}-{a}.nc")
    for coba in range(4):
        try:
            urllib.request.urlretrieve(url, path)
            arr, lat, lon = potong(path)
            os.remove(path)
            return tugas, arr, lat, lon
        except Exception as e:  # noqa: BLE001
            if coba == 3:
                raise RuntimeError(f"{url}: {e}")
            time.sleep(2 + coba * 3)


def main():
    tugas = [("Annual", f"{t}01", f"{t}12") for t in TAHUN]
    tugas += [("Monthly", f"{t}{m:02d}", f"{t}{m:02d}") for t in TAHUN for m in range(1, 13)]
    hasil = {}
    lat = lon = None
    mulai = time.time()
    with cf.ThreadPoolExecutor(max_workers=6) as ex:
        for k, (t, arr, la, lo) in enumerate(ex.map(ambil, tugas), 1):
            hasil[t] = arr
            lat, lon = la, lo
            if k % 25 == 0 or k == len(tugas):
                print(f"{k}/{len(tugas)} file, {time.time() - mulai:.0f} dtk", flush=True)
    tahunan = np.stack([hasil[("Annual", f"{t}01", f"{t}12")] for t in TAHUN])
    bulanan = np.stack([hasil[("Monthly", f"{t}{m:02d}", f"{t}{m:02d}")] for t in TAHUN for m in range(1, 13)])
    np.savez_compressed(os.path.join(D, "..", "mentah", "kubus.npz"), tahunan=tahunan, bulanan=bulanan, lat=lat, lon=lon)
    print("selesai", tahunan.shape, bulanan.shape, "lat", float(lat.min()), float(lat.max()), "lon", float(lon.min()), float(lon.max()))


if __name__ == "__main__":
    sys.exit(main())
