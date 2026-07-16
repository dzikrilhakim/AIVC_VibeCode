const API = '/baju'
let allProducts = []
let isAuth = localStorage.getItem('admin_auth') === 'true'

const debounce = (fn, ms = 300) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms) } }
const debouncedFilter = debounce(applyFilter)

function rupiah(n) { return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(n) }

// ─────────────────────────── Auth ───────────────────────────

function togglePassword() {
    const input = document.getElementById('login-password')
    const icon = document.querySelector('[onclick="togglePassword()"] i')
    if (input.type === 'password') {
        input.type = 'text'
        icon.className = 'fa-regular fa-eye-slash'
    } else {
        input.type = 'password'
        icon.className = 'fa-regular fa-eye'
    }
}

async function submitLogin(e) {
    e.preventDefault()
    const form = document.getElementById('login-form')
    const btn = document.getElementById('login-submit-btn')
    const txt = document.getElementById('login-submit-text')
    const load = document.getElementById('login-submit-loading')
    const data = Object.fromEntries(new FormData(form).entries())

    txt.classList.add('hidden')
    load.classList.remove('hidden')
    btn.disabled = true

    try {
        const res = await fetch('/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        })
        if (!res.ok) {
            const err = await res.json()
            throw new Error(err.detail || 'Login gagal')
        }
        const user = await res.json()
        isAuth = true
        localStorage.setItem('admin_auth', 'true')
        document.getElementById('login-overlay').classList.add('hidden')
        document.body.style.overflow = ''
        document.getElementById('admin-name').textContent = user.nama
        showToast('Selamat datang, ' + user.nama + '!')
        fetchProducts()
    } catch (err) {
        showToast(err.message)
    } finally {
        txt.classList.remove('hidden')
        load.classList.add('hidden')
        btn.disabled = false
    }
}

function logout() {
    isAuth = false
    localStorage.removeItem('admin_auth')
    document.getElementById('login-overlay').classList.remove('hidden')
    document.body.style.overflow = 'hidden'
    showToast('Berhasil keluar')
}

// ─────────────────────────── Products ───────────────────────────

async function fetchProducts() {
    const loading = document.getElementById('loading')
    const tableContainer = document.getElementById('table-container')
    const empty = document.getElementById('empty-state')
    loading.classList.remove('hidden')
    tableContainer.classList.add('hidden')
    empty.classList.add('hidden')

    try {
        const search = document.getElementById('search-input').value.trim()
        const params = new URLSearchParams()
        if (search) params.set('search', search)
        const url = `${API}${params.toString() ? '?' + params.toString() : ''}`
        const res = await fetch(url)
        const json = await res.json()
        allProducts = json.data || []
        render()
    } catch (e) {
        console.error(e)
        document.getElementById('result-count').textContent = 'Gagal memuat data'
    } finally {
        loading.classList.add('hidden')
    }
}

function render() {
    const tbody = document.getElementById('product-table-body')
    const empty = document.getElementById('empty-state')
    const tableContainer = document.getElementById('table-container')
    const count = document.getElementById('result-count')

    count.textContent = allProducts.length + ' produk'

    if (allProducts.length === 0) {
        tableContainer.classList.add('hidden')
        empty.classList.remove('hidden')
        return
    }

    empty.classList.add('hidden')
    tableContainer.classList.remove('hidden')

    tbody.innerHTML = allProducts.map((p, i) => {
        const initials = p.nama.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()
        const colors = ['from-pink-400 to-rose-500', 'from-sky-400 to-blue-500', 'from-emerald-400 to-teal-500', 'from-violet-400 to-purple-500', 'from-amber-400 to-orange-500']
        const grad = colors[p.id % colors.length]
        const bgClass = i % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'

        return `<tr class="${bgClass} hover:bg-pink-50/30 transition-colors border-b border-gray-50">
            <td class="px-4 py-3.5">
                <div class="flex items-center gap-3">
                    <div class="w-10 h-10 rounded-xl bg-gradient-to-br ${grad} flex items-center justify-center flex-shrink-0 shadow-sm">
                        <span class="text-xs font-black text-white/30">${initials}</span>
                    </div>
                    <div>
                        <span class="font-bold text-gray-900 text-sm block">${p.nama}</span>
                        <span class="text-xs text-gray-400 block sm:hidden">${p.kategori} · ${p.merk}</span>
                    </div>
                </div>
            </td>
            <td class="px-4 py-3.5 hidden md:table-cell">
                <span class="px-2.5 py-1 bg-gradient-to-r from-pink-100 to-rose-100 text-pink-700 text-[10px] font-bold rounded-full">${p.kategori}</span>
            </td>
            <td class="px-4 py-3.5 text-gray-600 text-sm hidden sm:table-cell">${p.merk}</td>
            <td class="px-4 py-3.5 text-right font-bold text-pink-600 text-sm">${rupiah(p.harga)}</td>
            <td class="px-4 py-3.5 text-center hidden sm:table-cell">
                <span class="text-sm font-semibold ${p.stok <= 3 ? 'text-amber-600' : 'text-emerald-600'}">${p.stok}</span>
            </td>
            <td class="px-4 py-3.5">
                <div class="flex items-center justify-center gap-1.5">
                    <button onclick="openEditForm(${p.id})" class="p-2 rounded-lg text-gray-400 hover:bg-sky-50 hover:text-sky-500 transition-all" title="Edit">
                        <i class="fa-solid fa-pen-to-square text-sm"></i>
                    </button>
                    <button onclick="hapusBaju(${p.id})" class="p-2 rounded-lg text-gray-400 hover:bg-red-50 hover:text-red-500 transition-all" title="Hapus">
                        <i class="fa-solid fa-trash-can text-sm"></i>
                    </button>
                </div>
            </td>
        </tr>`
    }).join('')
}

function applyFilter() { fetchProducts() }

// ─────────────────────────── Modal ───────────────────────────

function openRawModal(html) {
    document.getElementById('modal-content').innerHTML = html
    document.getElementById('modal').classList.remove('hidden')
    document.body.style.overflow = 'hidden'
}

function closeModal() {
    document.getElementById('modal').classList.add('hidden')
    document.body.style.overflow = ''
}

// ─────────────────────────── Add ───────────────────────────

function openAddForm() {
    openRawModal(`
        <div class="text-center mb-6">
            <div class="w-14 h-14 bg-pink-50 rounded-full flex items-center justify-center mx-auto mb-3">
                <i class="fa-solid fa-plus text-xl text-pink-500"></i>
            </div>
            <h3 class="text-lg font-bold text-gray-900">Tambah Produk Baru</h3>
            <p class="text-sm text-gray-400">Lengkapi detail produk di bawah</p>
        </div>
        <form id="add-form" onsubmit="submitAddForm(event)" class="space-y-3">
            <div class="grid grid-cols-2 gap-3">
                <div>
                    <label class="block text-xs font-semibold text-gray-500 mb-1">Nama <span class="text-red-400">*</span></label>
                    <input type="text" name="nama" required placeholder="cth: Kemeja Flanel" class="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-pink-200 focus:border-pink-400 transition-all placeholder:text-gray-300">
                </div>
                <div>
                    <label class="block text-xs font-semibold text-gray-500 mb-1">Merk <span class="text-red-400">*</span></label>
                    <input type="text" name="merk" required placeholder="cth: Levi's" class="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-pink-200 focus:border-pink-400 transition-all placeholder:text-gray-300">
                </div>
            </div>
            <div class="grid grid-cols-2 gap-3">
                <div>
                    <label class="block text-xs font-semibold text-gray-500 mb-1">Ukuran <span class="text-red-400">*</span></label>
                    <select name="ukuran" required class="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-pink-200 focus:border-pink-400 transition-all">
                        <option value="">Pilih</option>
                        <option value="S">S</option>
                        <option value="M">M</option>
                        <option value="L">L</option>
                        <option value="XL">XL</option>
                        <option value="XXL">XXL</option>
                    </select>
                </div>
                <div>
                    <label class="block text-xs font-semibold text-gray-500 mb-1">Kategori <span class="text-red-400">*</span></label>
                    <select name="kategori" required class="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-pink-200 focus:border-pink-400 transition-all">
                        <option value="">Pilih</option>
                        <option value="Kemeja">Kemeja</option>
                        <option value="Kaos">Kaos</option>
                        <option value="Jaket">Jaket</option>
                        <option value="Celana">Celana</option>
                        <option value="Aksesoris">Aksesoris</option>
                    </select>
                </div>
            </div>
            <div class="grid grid-cols-2 gap-3">
                <div>
                    <label class="block text-xs font-semibold text-gray-500 mb-1">Harga (Rp) <span class="text-red-400">*</span></label>
                    <input type="number" name="harga" required min="0" placeholder="cth: 150000" class="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-pink-200 focus:border-pink-400 transition-all placeholder:text-gray-300">
                </div>
                <div>
                    <label class="block text-xs font-semibold text-gray-500 mb-1">Stok <span class="text-red-400">*</span></label>
                    <input type="number" name="stok" required min="0" placeholder="cth: 10" class="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-pink-200 focus:border-pink-400 transition-all placeholder:text-gray-300">
                </div>
            </div>
            <div>
                <label class="block text-xs font-semibold text-gray-500 mb-1">URL Gambar</label>
                <input type="url" name="gambar_url" placeholder="https://images.unsplash.com/photo-..." class="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-pink-200 focus:border-pink-400 transition-all placeholder:text-gray-300">
            </div>
            <div>
                <label class="block text-xs font-semibold text-gray-500 mb-1">Deskripsi</label>
                <textarea name="deskripsi" rows="2" placeholder="Deskripsi singkat..." class="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-pink-200 focus:border-pink-400 transition-all placeholder:text-gray-300 resize-none"></textarea>
            </div>
            <div class="flex gap-3 pt-2">
                <button type="button" onclick="closeModal()" class="flex-1 py-3 bg-gray-100 text-gray-600 font-semibold rounded-xl hover:bg-gray-200 transition-all text-sm">Batal</button>
                <button type="submit" id="submit-btn" class="flex-1 py-3 bg-gradient-to-r from-pink-500 to-rose-700 text-white font-semibold rounded-xl hover:shadow-lg transition-all text-sm">
                    <span id="submit-text">Simpan</span>
                    <span id="submit-loading" class="hidden"><i class="fa-solid fa-spinner animate-spin"></i> Menyimpan...</span>
                </button>
            </div>
        </form>
    `)
}

async function submitAddForm(e) {
    e.preventDefault()
    const form = document.getElementById('add-form')
    const btn = document.getElementById('submit-btn')
    const txt = document.getElementById('submit-text')
    const load = document.getElementById('submit-loading')

    const data = Object.fromEntries(new FormData(form).entries())
    data.harga = parseInt(data.harga)
    data.stok = parseInt(data.stok)
    if (!data.gambar_url) delete data.gambar_url
    if (!data.deskripsi) delete data.deskripsi

    txt.classList.add('hidden')
    load.classList.remove('hidden')
    btn.disabled = true

    try {
        const res = await fetch(API, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        })
        if (!res.ok) throw new Error('Gagal menyimpan')
        closeModal()
        showToast(data.nama + ' berhasil ditambahkan!')
        fetchProducts()
    } catch (err) {
        showToast('Gagal: ' + err.message)
    } finally {
        txt.classList.remove('hidden')
        load.classList.add('hidden')
        btn.disabled = false
    }
}

// ─────────────────────────── Edit ───────────────────────────

function openEditForm(id) {
    const p = allProducts.find(b => b.id === id)
    if (!p) return

    openRawModal(`
        <div class="text-center mb-6">
            <div class="w-14 h-14 bg-sky-50 rounded-full flex items-center justify-center mx-auto mb-3">
                <i class="fa-solid fa-pen-to-square text-xl text-sky-500"></i>
            </div>
            <h3 class="text-lg font-bold text-gray-900">Edit Produk</h3>
            <p class="text-sm text-gray-400">Ubah detail produk</p>
        </div>
        <form id="edit-form" onsubmit="submitEditForm(event, ${id})" class="space-y-3">
            <div class="grid grid-cols-2 gap-3">
                <div>
                    <label class="block text-xs font-semibold text-gray-500 mb-1">Nama <span class="text-red-400">*</span></label>
                    <input type="text" name="nama" required value="${p.nama}" class="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-pink-200 focus:border-pink-400 transition-all">
                </div>
                <div>
                    <label class="block text-xs font-semibold text-gray-500 mb-1">Merk <span class="text-red-400">*</span></label>
                    <input type="text" name="merk" required value="${p.merk}" class="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-pink-200 focus:border-pink-400 transition-all">
                </div>
            </div>
            <div class="grid grid-cols-2 gap-3">
                <div>
                    <label class="block text-xs font-semibold text-gray-500 mb-1">Ukuran <span class="text-red-400">*</span></label>
                    <select name="ukuran" required class="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-pink-200 focus:border-pink-400 transition-all">
                        ${['S','M','L','XL','XXL'].map(s => `<option value="${s}" ${p.ukuran===s?'selected':''}>${s}</option>`).join('')}
                    </select>
                </div>
                <div>
                    <label class="block text-xs font-semibold text-gray-500 mb-1">Kategori <span class="text-red-400">*</span></label>
                    <select name="kategori" required class="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-pink-200 focus:border-pink-400 transition-all">
                        ${['Kemeja','Kaos','Jaket','Celana','Aksesoris'].map(k => `<option value="${k}" ${p.kategori===k?'selected':''}>${k}</option>`).join('')}
                    </select>
                </div>
            </div>
            <div class="grid grid-cols-2 gap-3">
                <div>
                    <label class="block text-xs font-semibold text-gray-500 mb-1">Harga (Rp) <span class="text-red-400">*</span></label>
                    <input type="number" name="harga" required min="0" value="${p.harga}" class="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-pink-200 focus:border-pink-400 transition-all">
                </div>
                <div>
                    <label class="block text-xs font-semibold text-gray-500 mb-1">Stok <span class="text-red-400">*</span></label>
                    <input type="number" name="stok" required min="0" value="${p.stok}" class="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-pink-200 focus:border-pink-400 transition-all">
                </div>
            </div>
            <div>
                <label class="block text-xs font-semibold text-gray-500 mb-1">URL Gambar</label>
                <input type="url" name="gambar_url" value="${p.gambar_url||''}" class="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-pink-200 focus:border-pink-400 transition-all">
            </div>
            <div>
                <label class="block text-xs font-semibold text-gray-500 mb-1">Deskripsi</label>
                <textarea name="deskripsi" rows="2" class="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-pink-200 focus:border-pink-400 transition-all resize-none">${p.deskripsi||''}</textarea>
            </div>
            <div class="flex gap-3 pt-2">
                <button type="button" onclick="closeModal()" class="flex-1 py-3 bg-gray-100 text-gray-600 font-semibold rounded-xl hover:bg-gray-200 transition-all text-sm">Batal</button>
                <button type="submit" id="edit-submit-btn" class="flex-1 py-3 bg-gradient-to-r from-pink-500 to-rose-700 text-white font-semibold rounded-xl hover:shadow-lg transition-all text-sm">
                    <span id="edit-submit-text">Simpan Perubahan</span>
                    <span id="edit-submit-loading" class="hidden"><i class="fa-solid fa-spinner animate-spin"></i> Menyimpan...</span>
                </button>
            </div>
        </form>
    `)
}

async function submitEditForm(e, id) {
    e.preventDefault()
    const form = document.getElementById('edit-form')
    const btn = document.getElementById('edit-submit-btn')
    const txt = document.getElementById('edit-submit-text')
    const load = document.getElementById('edit-submit-loading')

    const data = Object.fromEntries(new FormData(form).entries())
    data.harga = parseInt(data.harga)
    data.stok = parseInt(data.stok)
    if (!data.gambar_url) delete data.gambar_url
    if (!data.deskripsi) delete data.deskripsi

    txt.classList.add('hidden')
    load.classList.remove('hidden')
    btn.disabled = true

    try {
        const res = await fetch(`${API}/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        })
        if (!res.ok) throw new Error('Gagal menyimpan perubahan')
        closeModal()
        showToast(data.nama + ' berhasil diperbarui!')
        fetchProducts()
    } catch (err) {
        showToast('Gagal: ' + err.message)
    } finally {
        txt.classList.remove('hidden')
        load.classList.add('hidden')
        btn.disabled = false
    }
}

// ─────────────────────────── Delete ───────────────────────────

async function hapusBaju(id) {
    const p = allProducts.find(b => b.id === id)
    if (!p) return

    const confirmed = await new Promise(resolve => {
        window._hapusConfirm = resolve
        openRawModal(`
            <div class="text-center">
                <div class="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
                    <i class="fa-solid fa-triangle-exclamation text-2xl text-red-400"></i>
                </div>
                <h3 class="text-lg font-bold text-gray-900">Hapus Produk?</h3>
                <p class="text-sm text-gray-400 mt-2">"${p.nama}" akan dihapus permanen.</p>
                <div class="flex gap-3 mt-6">
                    <button onclick="closeModal();window._hapusConfirm(false)" class="flex-1 py-3 bg-gray-100 text-gray-600 font-semibold rounded-xl hover:bg-gray-200 transition-all text-sm">Batal</button>
                    <button onclick="closeModal();window._hapusConfirm(true)" class="flex-1 py-3 bg-red-500 text-white font-semibold rounded-xl hover:bg-red-600 transition-all text-sm">
                        <i class="fa-solid fa-trash-can mr-1.5"></i>Hapus
                    </button>
                </div>
            </div>
        `)
    })

    if (!confirmed) return

    try {
        const res = await fetch(`${API}/${id}`, { method: 'DELETE' })
        if (!res.ok) throw new Error('Gagal menghapus')
        showToast(p.nama + ' berhasil dihapus')
        fetchProducts()
    } catch (err) {
        showToast('Gagal: ' + err.message)
    }
}

// ─────────────────────────── Toast ───────────────────────────

function showToast(msg) {
    const t = document.getElementById('toast')
    const tm = document.getElementById('toast-message')
    tm.innerHTML = msg
    t.classList.remove('invisible', 'opacity-0', 'translate-y-4')
    t.classList.add('opacity-100', 'translate-y-0')
    clearTimeout(t._hide)
    t._hide = setTimeout(() => {
        t.classList.add('invisible', 'opacity-0', 'translate-y-4')
        t.classList.remove('opacity-100', 'translate-y-0')
    }, 2500)
}

// ─────────────────────────── Init ───────────────────────────

document.addEventListener('DOMContentLoaded', () => {
    if (isAuth) {
        document.getElementById('login-overlay').classList.add('hidden')
        document.body.style.overflow = ''
        fetchProducts()
    }

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') closeModal()
    })
})