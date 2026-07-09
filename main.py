import json
import os
from fastapi import FastAPI, HTTPException, Query
from fastapi.staticfiles import StaticFiles
from fastapi.responses import RedirectResponse
from pydantic import BaseModel
from typing import Optional, List

app = FastAPI(title="Katalog Baju API", version="2.0.0")
DATA_FILE = "data.json"


class Baju(BaseModel):
    id: int
    nama: str
    merk: str
    ukuran: str
    warna: str
    harga: float
    stok: int
    kategori: str
    gambar_url: Optional[str] = None
    deskripsi: Optional[str] = None


class BajuCreate(BaseModel):
    nama: str
    merk: str
    ukuran: str
    warna: str
    harga: float
    stok: int
    kategori: str
    gambar_url: Optional[str] = None
    deskripsi: Optional[str] = None


class BajuUpdate(BaseModel):
    nama: Optional[str] = None
    merk: Optional[str] = None
    ukuran: Optional[str] = None
    warna: Optional[str] = None
    harga: Optional[float] = None
    stok: Optional[int] = None
    kategori: Optional[str] = None
    gambar_url: Optional[str] = None
    deskripsi: Optional[str] = None


SEED_DATA = [
    Baju(id=1, nama="Kemeja Flanel", merk="Levi's", ukuran="L", warna="Merah", harga=250000, stok=10, kategori="Kemeja", gambar_url="https://images.unsplash.com/photo-1583743814966-8936f5b7be1a?w=400&h=500&fit=crop", deskripsi="Kemeja flanel bahan katun premium, nyaman dipakai sehari-hari."),
    Baju(id=2, nama="Kaos Oblong", merk="Uniqlo", ukuran="M", warna="Putih", harga=150000, stok=25, kategori="Kaos", gambar_url="https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=400&h=500&fit=crop"),
    Baju(id=3, nama="Jaket Denim", merk="Levi's", ukuran="XL", warna="Biru", harga=450000, stok=5, kategori="Jaket", gambar_url="https://images.unsplash.com/photo-1576995853123-5a10305d93c0?w=400&h=500&fit=crop", deskripsi="Jaket denim klasik dengan bahan tebal dan awet."),
    Baju(id=4, nama="Kemeja Batik", merk="Erigo", ukuran="L", warna="Hitam", harga=200000, stok=15, kategori="Kemeja", gambar_url="https://images.unsplash.com/photo-1604973104381-870c92f10343?w=400&h=500&fit=crop"),
    Baju(id=5, nama="Hoodie", merk="Supreme", ukuran="M", warna="Abu-abu", harga=350000, stok=8, kategori="Jaket", gambar_url="https://images.unsplash.com/photo-1556821840-3a63f95609a7?w=400&h=500&fit=crop", deskripsi="Hoodie limited edition dengan bahan fleece hangat."),
    Baju(id=6, nama="Kemeja Hitam", merk="Levi's", ukuran="L", warna="Hitam", harga=223123, stok=12, kategori="Kemeja", gambar_url="https://images.unsplash.com/photo-1541099649105-f69ad21f3246?w=400&h=500&fit=crop", deskripsi="Kemeja hitam elegan untuk berbagai acara."),
]


def simpan_data():
    with open(DATA_FILE, "w") as f:
        json.dump([b.model_dump() for b in katalog], f, indent=2)


def muat_data():
    global katalog, next_id
    if os.path.exists(DATA_FILE):
        with open(DATA_FILE, "r") as f:
            data = json.load(f)
        katalog = [Baju(**item) for item in data]
    else:
        katalog = SEED_DATA.copy()
        simpan_data()
    next_id = max(b.id for b in katalog) + 1


katalog: List[Baju] = []
next_id = 1
muat_data()


@app.get("/")
def root():
    return RedirectResponse(url="/static/index.html")


@app.get("/api")
def api_root():
    return {"message": "Selamat datang di Katalog Baju API", "status": "siap"}


@app.get("/baju", response_model=dict)
def semua_baju(
    kategori: Optional[str] = Query(None, description="Filter berdasarkan kategori"),
    merk: Optional[str] = Query(None, description="Filter berdasarkan merk"),
    warna: Optional[str] = Query(None, description="Filter berdasarkan warna"),
    search: Optional[str] = Query(None, description="Cari berdasarkan nama atau deskripsi"),
    min_harga: Optional[float] = Query(None, description="Harga minimum"),
    max_harga: Optional[float] = Query(None, description="Harga maksimum"),
):
    hasil = katalog

    if kategori:
        hasil = [b for b in hasil if kategori.lower() in b.kategori.lower()]
    if merk:
        hasil = [b for b in hasil if merk.lower() in b.merk.lower()]
    if warna:
        hasil = [b for b in hasil if warna.lower() in b.warna.lower()]
    if search:
        keyword = search.lower()
        hasil = [b for b in hasil if keyword in b.nama.lower() or (b.deskripsi and keyword in b.deskripsi.lower())]
    if min_harga is not None:
        hasil = [b for b in hasil if b.harga >= min_harga]
    if max_harga is not None:
        hasil = [b for b in hasil if b.harga <= max_harga]

    return {"data": hasil, "total": len(hasil)}


@app.get("/baju/kategori/{kategori}")
def filter_kategori(kategori: str):
    hasil = [b for b in katalog if b.kategori.lower() == kategori.lower()]
    return {"data": hasil, "total": len(hasil)}


@app.get("/baju/{baju_id}", response_model=Baju)
def detail_baju(baju_id: int):
    for b in katalog:
        if b.id == baju_id:
            return b
    raise HTTPException(status_code=404, detail="Baju tidak ditemukan")


@app.post("/baju", response_model=Baju, status_code=201)
def tambah_baju(payload: BajuCreate):
    global next_id
    baju_baru = Baju(id=next_id, **payload.model_dump())
    katalog.append(baju_baru)
    next_id += 1
    simpan_data()
    return baju_baru


@app.put("/baju/{baju_id}", response_model=Baju)
def update_baju(baju_id: int, payload: BajuUpdate):
    for index, b in enumerate(katalog):
        if b.id == baju_id:
            data_baru = b.model_dump()
            update_data = payload.model_dump(exclude_unset=True)
            data_baru.update(update_data)
            katalog[index] = Baju(**data_baru)
            simpan_data()
            return katalog[index]
    raise HTTPException(status_code=404, detail="Baju tidak ditemukan")


@app.delete("/baju/{baju_id}")
def hapus_baju(baju_id: int):
    for index, b in enumerate(katalog):
        if b.id == baju_id:
            del katalog[index]
            simpan_data()
            return {"message": "Baju berhasil dihapus"}
    raise HTTPException(status_code=404, detail="Baju tidak ditemukan")


app.mount("/static", StaticFiles(directory="static"), name="static")
