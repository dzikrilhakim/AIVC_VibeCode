let currentUser = null
try { currentUser = JSON.parse(localStorage.getItem('vibe_user')) } catch (e) { currentUser = null }

const API = '/baju'
let allProducts = []
let cart = []
let currentView = localStorage.getItem('vibe_view') || 'grid'

function getCartKey() {
    const u = currentUser ? currentUser.username : 'guest'
    return 'vibe_cart_' + u
}

function loadCart() {
    try { cart = JSON.parse(localStorage.getItem(getCartKey())) || [] } catch (e) { cart = [] }
    updateCartBadge()
}

loadCart()

const debounce = (fn, ms = 300) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms) } }
const debouncedFilter = debounce(applyFilter)

function rupiah(n) { return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(n) }

async function fetchProducts() {
    const el = document.getElementById('loading')
    const grid = document.getElementById('product-grid')
    const empty = document.getElementById('empty-state')
    el.classList.remove('hidden')
    grid.classList.add('hidden')
    empty.classList.add('hidden')

    try {
        const params = new URLSearchParams()
        const search = document.getElementById('search-input').value.trim()
        const kategori = document.getElementById('kategori-filter').value
        const harga = document.getElementById('harga-filter').value

        if (search) params.set('search', search)
        if (kategori) params.set('kategori', kategori)
        if (harga) {
            const [min, max] = harga.split('-')
            params.set('min_harga', min)
            params.set('max_harga', max)
        }

        const url = `${API}${params.toString() ? '?' + params.toString() : ''}`
        const res = await fetch(url)
        const json = await res.json()
        allProducts = json.data || []
        render()
    } catch (e) {
        console.error(e)
        document.getElementById('result-count').textContent = 'Gagal memuat data'
    } finally {
        el.classList.add('hidden')
    }
}

function render() {
    const grid = document.getElementById('product-grid')
    const empty = document.getElementById('empty-state')
    const count = document.getElementById('result-count')
    const total = document.getElementById('total-items')

    total.textContent = allProducts.length

    if (allProducts.length === 0) {
        grid.classList.add('hidden')
        empty.classList.remove('hidden')
        count.textContent = 'Tidak ada hasil'
        return
    }

    empty.classList.add('hidden')
    grid.classList.remove('hidden')
    count.textContent = `Menampilkan ${allProducts.length} item`

    if (currentView === 'list') {
        grid.className = 'flex flex-col gap-4 hidden'
        grid.innerHTML = allProducts.map((p, i) => `<div style="animation-delay: ${i * 0.1}s" class="animate-slide-up">${createListItem(p)}</div>`).join('')
    } else {
        grid.className = 'grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6 hidden'
        grid.innerHTML = allProducts.map((p, i) => `<div style="animation-delay: ${i * 0.08}s">${createCard(p)}</div>`).join('')
    }

    grid.classList.remove('hidden')

    document.querySelectorAll('[data-add-cart]').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation()
            addToCart(parseInt(btn.dataset.addCart))
        })
    })
    document.querySelectorAll('[data-detail]').forEach(el => {
        el.addEventListener('click', () => openModal(parseInt(el.dataset.detail)))
    })
    document.querySelectorAll('[data-admin]').forEach(el => {
        el.classList.toggle('hidden', !isAdmin())
    })
    document.querySelectorAll('[data-cart]').forEach(el => {
        el.classList.toggle('hidden', !canOrder())
    })
}

function imgGradient(id, nama) {
    const colors = ['from-pink-400 to-rose-500', 'from-sky-400 to-blue-500', 'from-emerald-400 to-teal-500', 'from-violet-400 to-purple-500', 'from-amber-400 to-orange-500']
    return colors[id % colors.length]
}

function imgHtml(p, cls = '') {
    const grad = imgGradient(p.id, p.nama)
    const initials = p.nama.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()
    const fallbackId = `fallback-${p.id}`
    if (p.gambar_url) {
        return `<div class="relative w-full h-full ${cls}">
            <img src="${p.gambar_url}" alt="${p.nama}" loading="lazy"
                onerror="this.style.display='none';document.getElementById('${fallbackId}').style.display='flex'"
                class="absolute inset-0 w-full h-full object-cover">
            <div id="${fallbackId}" class="absolute inset-0 bg-gradient-to-br ${grad} hidden items-center justify-center">
                <span class="text-5xl sm:text-6xl font-black text-white/20 select-none">${initials}</span>
            </div>
        </div>`
    }
    return `<div class="relative w-full h-full bg-gradient-to-br ${grad} flex items-center justify-center ${cls}">
        <span class="text-5xl sm:text-6xl font-black text-white/20 select-none">${initials}</span>
    </div>`
}

function createCard(p) {
    const grad = imgGradient(p.id, p.nama)

    const kategoriColors = { Kemeja: 'bg-blue-50 text-blue-600', Kaos: 'bg-emerald-50 text-emerald-600', Jaket: 'bg-amber-50 text-amber-600' }
    const badgeColor = kategoriColors[p.kategori] || 'bg-gray-50 text-gray-600'

    return `<div data-detail="${p.id}" class="group bg-white rounded-3xl border border-gray-100 overflow-hidden cursor-pointer hover:shadow-2xl hover:shadow-pink-300/40 hover:-translate-y-2 transition-all duration-500 animate-slide-up">
        <div class="relative aspect-[4/5] overflow-hidden bg-gradient-to-br ${grad}">
            ${imgHtml(p)}
            <div class="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"></div>
            <span class="absolute top-4 left-4 px-3 py-1.5 ${badgeColor} text-[10px] font-bold rounded-full z-10 shadow-md backdrop-blur-sm">${p.kategori}</span>
            <div class="absolute top-4 right-4 bg-white/90 backdrop-blur-lg rounded-full w-10 h-10 flex items-center justify-center shadow-lg opacity-0 group-hover:opacity-100 transition-all duration-300" title="Detail">
                <i class="fa-solid fa-eye text-pink-500 text-sm"></i>
            </div>
            <div class="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 z-10">
                <span class="px-5 py-2.5 bg-white/95 backdrop-blur rounded-full text-gray-800 text-xs font-bold shadow-xl hover:scale-105 transition-transform flex items-center gap-2">
                    <i class="fa-solid fa-expand"></i> Lihat Detail
                </span>
            </div>
            <div class="absolute bottom-4 left-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 translate-y-4 group-hover:translate-y-0 transition-all duration-300 z-10">
                ${canOrder() ? `<button data-add-cart="${p.id}" class="flex-1 px-3 py-2.5 bg-white/95 backdrop-blur rounded-full flex items-center justify-center gap-1.5 text-gray-700 hover:bg-pink-500 hover:text-white transition-all font-semibold text-sm shadow-lg">
                    <i class="fa-solid fa-plus text-xs"></i> Keranjang
                </button>` : ''}
                <button onclick="event.stopPropagation();hapusBaju(${p.id})" class="px-3 py-2.5 bg-white/95 backdrop-blur rounded-full flex items-center justify-center text-gray-400 hover:bg-red-500 hover:text-white transition-all shadow-lg" data-admin>
                    <i class="fa-solid fa-trash-can"></i>
                </button>
            </div>
        </div>
        <div class="p-5">
            <div class="flex items-start justify-between mb-2">
                <div class="flex-1 min-w-0">
                    <h3 class="font-bold text-gray-900 text-sm leading-tight line-clamp-2 group-hover:text-pink-600 transition-colors">${p.nama}</h3>
                    <p class="text-xs text-gray-500 mt-0.5 font-medium truncate">${p.merk}</p>
                </div>
                <span class="ml-2 px-2 py-0.5 bg-gradient-to-r from-pink-100 to-rose-100 text-pink-700 text-[10px] font-bold rounded-full whitespace-nowrap">${p.kategori}</span>
            </div>
            <div class="flex items-end justify-between mt-4 pt-4 border-t border-gray-100">
                <div>
                    <p class="text-[10px] text-gray-500 uppercase tracking-wider font-bold mb-0.5">Harga</p>
                    <span class="font-black text-pink-600 text-lg">${rupiah(p.harga)}</span>
                </div>
                ${p.stok <= 3 ? `<span class="text-[10px] font-bold text-amber-600 bg-amber-100 px-2.5 py-1.5 rounded-lg flex items-center gap-1"><i class="fa-solid fa-circle-exclamation"></i> Sisa ${p.stok}</span>` : `<span class="text-[10px] text-green-600 font-semibold flex items-center gap-1"><i class="fa-solid fa-box"></i> Stok: ${p.stok}</span>`}
            </div>
        </div>
    </div>`
}

function createListItem(p) {
    return `<div data-detail="${p.id}" class="flex gap-4 bg-white rounded-3xl border border-gray-100 p-4 sm:p-5 cursor-pointer hover:shadow-xl hover:border-pink-200 hover:-translate-y-1 transition-all duration-300">
        <div class="w-20 h-20 sm:w-28 sm:h-28 rounded-2xl overflow-hidden flex-shrink-0 bg-gradient-to-br ${imgGradient(p.id, p.nama)} shadow-lg">
            ${imgHtml(p, 'rounded-2xl')}
        </div>
        <div class="flex-1 min-w-0 flex flex-col justify-between">
            <div>
                <div class="flex items-start justify-between gap-2 mb-2">
                    <div class="flex-1 min-w-0">
                        <h3 class="font-bold text-gray-900 text-base line-clamp-1 group-hover:text-pink-600 transition-colors">${p.nama}</h3>
                        <p class="text-xs text-gray-500 font-medium mt-0.5">${p.merk} • ${p.ukuran}</p>
                    </div>
                    <span class="font-black text-pink-600 text-lg whitespace-nowrap">${rupiah(p.harga)}</span>
                </div>
                <div class="flex items-center gap-2 mt-2.5">
                    <span class="px-2.5 py-1 bg-gradient-to-r from-pink-100 to-rose-100 text-pink-700 text-[10px] font-bold rounded-full">${p.kategori}</span>
                    ${p.stok <= 3 ? `<span class="text-[10px] font-bold text-amber-600 flex items-center gap-1"><i class="fa-solid fa-circle-exclamation"></i> Sisa ${p.stok}</span>` : `<span class="text-[10px] text-green-600 font-semibold flex items-center gap-1"><i class="fa-solid fa-box"></i> Stok: ${p.stok}</span>`}
                </div>
                ${p.deskripsi ? `<p class="text-xs text-gray-500 mt-2 line-clamp-1">${p.deskripsi}</p>` : ''}
            </div>
        </div>
        <div class="flex flex-col gap-2 self-center flex-shrink-0">
            ${canOrder() ? `<button data-add-cart="${p.id}" class="w-10 h-10 rounded-full flex items-center justify-center transition-all font-bold bg-gradient-to-r from-pink-50 to-rose-50 text-pink-600 hover:from-pink-500 hover:to-rose-600 hover:text-white hover:shadow-lg hover:shadow-pink-400">
                <i class="fa-solid fa-plus text-sm"></i>
            </button>` : `<button onclick="event.stopPropagation();openModal(${p.id})" class="w-10 h-10 rounded-full flex items-center justify-center bg-gray-100 text-gray-400 hover:bg-pink-100 hover:text-pink-600 transition-all font-bold">
                <i class="fa-solid fa-expand text-sm"></i>
            </button>`}
            <button onclick="event.stopPropagation();hapusBaju(${p.id})" class="w-10 h-10 rounded-full flex items-center justify-center bg-gray-100 text-gray-400 hover:bg-red-100 hover:text-red-600 transition-all font-bold" data-admin>
                <i class="fa-solid fa-trash-can text-sm"></i>
            </button>
        </div>
    </div>`
}

function addToCart(id) {
    if (!canOrder()) return
    const p = allProducts.find(b => b.id === id)
    if (!p) return
    const existing = cart.find(c => c.id === id)
    if (existing) {
        existing.jumlah = (existing.jumlah || 1) + 1
        showToast(`<i class="fa-solid fa-check-circle text-emerald-400"></i> ${p.nama} x${existing.jumlah} di keranjang`)
    } else {
        cart.push({ id: p.id, nama: p.nama, harga: p.harga, merk: p.merk, jumlah: 1 })
        showToast(`<i class="fa-solid fa-cart-plus text-pink-400"></i> ${p.nama} ditambahkan ke keranjang`)
    }
    localStorage.setItem(getCartKey(), JSON.stringify(cart))
    updateCartBadge()
    render()
}

function updateCartBadge() {
    const badge = document.getElementById('cart-badge')
    const total = cart.reduce((s, c) => s + (c.jumlah || 1), 0)
    if (total > 0) {
        badge.classList.remove('hidden', 'animate-bounce')
        badge.textContent = total
        void badge.offsetWidth
        badge.classList.add('animate-bounce')
    } else {
        badge.classList.add('hidden')
        badge.classList.remove('animate-bounce')
    }
}

function toggleCart() {
    if (!canOrder()) return
    if (cart.length === 0) {
        openRawModal('' +
            '<div class="text-center py-8 animate-scale-in">' +
                '<div class="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">' +
                    '<i class="fa-solid fa-bag-shopping text-3xl text-gray-300"></i>' +
                '</div>' +
                '<h3 class="text-lg font-bold text-gray-900">Keranjang Kosong</h3>' +
                '<p class="text-sm text-gray-400 mt-1">Belum ada barang nih, yuk belanja!</p>' +
                '<button onclick="closeModal()" class="mt-6 px-6 py-3 bg-gradient-to-r from-pink-500 to-rose-600 text-white font-semibold rounded-xl hover:shadow-lg transition-all text-sm">Mulai Belanja</button>' +
            '</div>' +
        '')
        return
    }
    var totalItems = cart.reduce(function(s, c) { return s + (c.jumlah || 1) }, 0)
    var items = cart.map(function(c, idx) {
        var jml = c.jumlah || 1
        return '<div class="flex justify-between items-center py-3 px-4 bg-gradient-to-r from-gray-50 to-pink-50 rounded-xl mb-2 hover:shadow-md transition-all">' +
            '<div class="flex-1 min-w-0">' +
                '<span class="font-semibold text-sm text-gray-900">' + c.nama + '</span>' +
                '<p class="text-xs text-gray-500 mt-0.5">' + (c.merk || '') + '</p>' +
            '</div>' +
            '<div class="flex items-center gap-2">' +
                '<div class="flex items-center gap-1 bg-white rounded-lg border border-gray-200 px-1">' +
                    '<button onclick="decreaseCartItem(' + idx + ')" class="w-7 h-7 rounded-lg flex items-center justify-center text-gray-500 hover:bg-pink-100 hover:text-pink-600 transition-all font-bold">' + '\u2212' + '</button>' +
                    '<span class="w-6 text-center text-xs font-bold text-gray-900">' + jml + '</span>' +
                    '<button onclick="increaseCartItem(' + idx + ')" class="w-7 h-7 rounded-lg flex items-center justify-center text-gray-500 hover:bg-pink-100 hover:text-pink-600 transition-all font-bold">+</button>' +
                '</div>' +
                '<span class="text-sm font-bold text-pink-600 w-16 text-right">' + rupiah(c.harga * jml) + '</span>' +
                '<button onclick="removeFromCart(' + idx + ')" class="w-7 h-7 rounded-full flex items-center justify-center text-gray-400 hover:bg-red-100 hover:text-red-500 transition-all">' +
                    '<i class="fa-solid fa-trash-can text-xs"></i>' +
                '</button>' +
            '</div>' +
        '</div>'
    }).join('')
    var total = cart.reduce(function(s, c) { return s + c.harga * (c.jumlah || 1) }, 0)

    openRawModal('' +
        '<div class="text-center mb-6 animate-scale-in">' +
            '<div class="w-16 h-16 bg-gradient-to-br from-pink-100 to-rose-100 rounded-3xl flex items-center justify-center mx-auto mb-3 animate-bounce shadow-lg shadow-pink-300/50">' +
                '<i class="fa-solid fa-shopping-cart text-2xl text-pink-600"></i>' +
            '</div>' +
            '<h3 class="text-2xl font-black text-gray-900">Keranjang Belanja</h3>' +
            '<p class="text-sm text-gray-500 mt-1">' + totalItems + ' barang dalam keranjang</p>' +
        '</div>' +
        '<div class="space-y-0 mb-4 max-h-56 overflow-y-auto custom-scrollbar">' + items + '</div>' +
        '<div class="flex justify-between items-center pt-4 pb-4 border-t-2 border-b-2 border-gray-200 mb-4">' +
            '<span class="font-bold text-gray-900 text-lg">Total:</span>' +
            '<span class="font-black text-pink-600 text-2xl">' + rupiah(total) + '</span>' +
        '</div>' +
        '<button onclick="openCheckout()" class="w-full py-4 bg-gradient-to-r from-pink-500 to-rose-600 text-white font-bold rounded-2xl hover:shadow-lg hover:shadow-pink-400/50 hover:-translate-y-1 transition-all mb-2 flex items-center justify-center gap-2">' +
            '<i class="fa-solid fa-credit-card"></i> Lanjut ke Checkout' +
        '</button>' +
        '<button onclick="clearCart()" class="w-full py-2 text-sm text-gray-400 hover:text-red-500 transition-colors font-medium">' +
            '<i class="fa-solid fa-trash-can mr-1"></i> Kosongkan Keranjang' +
        '</button>' +
    '')
}

function increaseCartItem(idx) {
    var c = cart[idx]
    if (!c) return
    c.jumlah = (c.jumlah || 1) + 1
    localStorage.setItem(getCartKey(), JSON.stringify(cart))
    updateCartBadge()
    toggleCart()
}

function decreaseCartItem(idx) {
    var c = cart[idx]
    if (!c) return
    if ((c.jumlah || 1) <= 1) {
        removeFromCart(idx)
        return
    }
    c.jumlah--
    localStorage.setItem(getCartKey(), JSON.stringify(cart))
    updateCartBadge()
    toggleCart()
}

function removeFromCart(index) {
    const item = cart[index]
    cart.splice(index, 1)
    localStorage.setItem(getCartKey(), JSON.stringify(cart))
    updateCartBadge()
    showToast(`<i class="fa-solid fa-trash-can"></i> ${item.nama} dihapus`)
    if (cart.length > 0) toggleCart()
    else closeModal()
}

function openCheckout() {
    const total = cart.reduce((s, c) => s + c.harga * (c.jumlah || 1), 0)
    closeModal()
    setTimeout(() => {
        openRawModal(`
            <div class="text-center mb-8 animate-scale-in">
                <div class="w-16 h-16 bg-gradient-to-br from-pink-100 to-rose-100 rounded-3xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-pink-300/50">
                    <i class="fa-solid fa-lock text-2xl text-pink-600"></i>
                </div>
                <h3 class="text-2xl font-black text-gray-900">Proses Pembayaran</h3>
                <p class="text-sm text-gray-500 mt-1">Total: <span class="font-bold text-pink-600 text-lg">${rupiah(total)}</span></p>
            </div>

            <div class="mb-6">
                <label class="block text-sm font-bold text-gray-900 mb-2">Alamat Pengiriman</label>
                <div class="flex gap-2 mb-2">
                    <input id="checkout-search" type="text" placeholder="Cari tempat di peta..." class="flex-1 px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-pink-200 focus:border-pink-400 transition-all placeholder:text-gray-300">
                    <button onclick="searchLocation()" class="px-4 py-2.5 bg-pink-500 text-white text-sm font-semibold rounded-xl hover:bg-pink-600 transition-all flex-shrink-0">Cari</button>
                </div>
                <div id="checkout-map" class="w-full h-48 rounded-xl border-2 border-gray-200 mb-2 z-0"></div>
                <div id="checkout-results" class="mb-2"></div>
                <div class="grid grid-cols-3 gap-2 mb-2">
                    <input id="checkout-jalan" type="text" placeholder="Nama Jalan" class="col-span-2 px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-pink-200 focus:border-pink-400 transition-all placeholder:text-gray-300" value="${localStorage.getItem('vibe_jalan') || ''}">
                    <input id="checkout-norumah" type="text" placeholder="No. Rumah" class="px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-pink-200 focus:border-pink-400 transition-all placeholder:text-gray-300" value="${localStorage.getItem('vibe_norumah') || ''}">
                </div>
                <input id="checkout-kampung" type="text" placeholder="Kampung / Kelurahan / Kecamatan" class="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-pink-200 focus:border-pink-400 transition-all placeholder:text-gray-300 mb-2" value="${localStorage.getItem('vibe_kampung') || ''}">
                <input id="checkout-nohp" type="tel" placeholder="No. HP (untuk kurir)" class="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-pink-200 focus:border-pink-400 transition-all placeholder:text-gray-300 mb-2" value="${localStorage.getItem('vibe_nohp') || ''}">
                <textarea id="checkout-alamat" rows="2" placeholder="Keterangan tambahan (opsional)..." class="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-pink-200 focus:border-pink-400 transition-all placeholder:text-gray-300 resize-none">${localStorage.getItem('vibe_alamat') || ''}</textarea>
            </div>
            
            <div class="mb-6">
                <label class="block text-sm font-bold text-gray-900 mb-3">Pilih Metode Pembayaran</label>
                <div class="space-y-2">
                    <label class="flex items-center gap-3 p-4 bg-gradient-to-r from-white to-pink-50 rounded-2xl border-2 border-transparent hover:border-pink-300 cursor-pointer transition-all has-[:checked]:border-pink-500 has-[:checked]:bg-gradient-to-r has-[:checked]:from-pink-50 has-[:checked]:to-rose-50 shadow-sm hover:shadow-md">
                        <input type="radio" name="payment" value="cash" checked onclick="updatePaymentDetail()" class="w-5 h-5 text-pink-600">
                        <span class="flex items-center gap-3 flex-1">
                            <div class="w-10 h-10 bg-gradient-to-br from-amber-100 to-orange-100 rounded-xl flex items-center justify-center">
                                <i class="fa-solid fa-money-bill-1 text-xl text-orange-600"></i>
                            </div>
                            <div>
                                <span class="font-bold text-gray-900 block">Tunai</span>
                                <span class="text-xs text-gray-500">Bayar saat pengiriman</span>
                            </div>
                        </span>
                    </label>
                    <label class="flex items-center gap-3 p-4 bg-white rounded-2xl border-2 border-gray-200 hover:border-pink-300 cursor-pointer transition-all has-[:checked]:border-pink-500 has-[:checked]:bg-gradient-to-r has-[:checked]:from-pink-50 has-[:checked]:to-rose-50 shadow-sm hover:shadow-md">
                        <input type="radio" name="payment" value="dana" onclick="updatePaymentDetail()" class="w-5 h-5 text-pink-600">
                        <span class="flex items-center gap-3 flex-1">
                            <div class="w-10 h-10 bg-gradient-to-br from-blue-100 to-blue-200 rounded-xl flex items-center justify-center">
                                <i class="fa-solid fa-wallet text-xl text-blue-600"></i>
                            </div>
                            <div>
                                <span class="font-bold text-gray-900 block">Dana</span>
                                <span class="text-xs text-gray-500">E-wallet terpercaya</span>
                            </div>
                        </span>
                    </label>
                    <label class="flex items-center gap-3 p-4 bg-white rounded-2xl border-2 border-gray-200 hover:border-pink-300 cursor-pointer transition-all has-[:checked]:border-pink-500 has-[:checked]:bg-gradient-to-r has-[:checked]:from-pink-50 has-[:checked]:to-rose-50 shadow-sm hover:shadow-md">
                        <input type="radio" name="payment" value="gopay" onclick="updatePaymentDetail()" class="w-5 h-5 text-pink-600">
                        <span class="flex items-center gap-3 flex-1">
                            <div class="w-10 h-10 bg-gradient-to-br from-sky-100 to-cyan-100 rounded-xl flex items-center justify-center">
                                <i class="fa-solid fa-mobile text-xl text-cyan-600"></i>
                            </div>
                            <div>
                                <span class="font-bold text-gray-900 block">GoPay</span>
                                <span class="text-xs text-gray-500">Gojek digital wallet</span>
                            </div>
                        </span>
                    </label>
                    <label class="flex items-center gap-3 p-4 bg-white rounded-2xl border-2 border-gray-200 hover:border-pink-300 cursor-pointer transition-all has-[:checked]:border-pink-500 has-[:checked]:bg-gradient-to-r has-[:checked]:from-pink-50 has-[:checked]:to-rose-50 shadow-sm hover:shadow-md">
                        <input type="radio" name="payment" value="ewallet_other" onclick="updatePaymentDetail()" class="w-5 h-5 text-pink-600">
                        <span class="flex items-center gap-3 flex-1">
                            <div class="w-10 h-10 bg-gradient-to-br from-purple-100 to-pink-100 rounded-xl flex items-center justify-center">
                                <i class="fa-solid fa-credit-card text-xl text-purple-600"></i>
                            </div>
                            <div>
                                <span class="font-bold text-gray-900 block">E-Wallet Lainnya</span>
                                <span class="text-xs text-gray-500">OVO, LinkAja, dll</span>
                            </div>
                        </span>
                    </label>
                    <label class="flex items-center gap-3 p-4 bg-white rounded-2xl border-2 border-gray-200 hover:border-pink-300 cursor-pointer transition-all has-[:checked]:border-pink-500 has-[:checked]:bg-gradient-to-r has-[:checked]:from-pink-50 has-[:checked]:to-rose-50 shadow-sm hover:shadow-md">
                        <input type="radio" name="payment" value="bank" onclick="updatePaymentDetail()" class="w-5 h-5 text-pink-600">
                        <span class="flex items-center gap-3 flex-1">
                            <div class="w-10 h-10 bg-gradient-to-br from-indigo-100 to-blue-100 rounded-xl flex items-center justify-center">
                                <i class="fa-solid fa-bank text-xl text-indigo-600"></i>
                            </div>
                            <div>
                                <span class="font-bold text-gray-900 block">Transfer Bank</span>
                                <span class="text-xs text-gray-500">BCA, Mandiri, BRI, dll</span>
                            </div>
                        </span>
                    </label>
                </div>
                <div id="payment-detail" class="mt-4 hidden">
                    <div id="pd-dana" class="hidden">
                        <label class="block text-sm font-bold text-gray-900 mb-2">Nomor Dana</label>
                        <input id="pd-dana-input" type="text" placeholder="08xxxxxxxxxx" class="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-pink-200 focus:border-pink-400 transition-all placeholder:text-gray-300">
                    </div>
                    <div id="pd-gopay" class="hidden">
                        <label class="block text-sm font-bold text-gray-900 mb-2">Nomor GoPay</label>
                        <input id="pd-gopay-input" type="text" placeholder="08xxxxxxxxxx" class="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-pink-200 focus:border-pink-400 transition-all placeholder:text-gray-300">
                    </div>
                    <div id="pd-ewallet_other" class="hidden space-y-3">
                        <div>
                            <label class="block text-sm font-bold text-gray-900 mb-2">Pilih E-Wallet</label>
                            <select id="pd-ewallet-select" class="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-pink-200 focus:border-pink-400 transition-all">
                                <option value="OVO">OVO</option>
                                <option value="LinkAja">LinkAja</option>
                                <option value="ShopeePay">ShopeePay</option>
                                <option value="iSaku">iSaku</option>
                                <option value="DANA">DANA</option>
                            </select>
                        </div>
                        <div>
                            <label class="block text-sm font-bold text-gray-900 mb-2">Nomor</label>
                            <input id="pd-ewallet-input" type="text" placeholder="08xxxxxxxxxx" class="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-pink-200 focus:border-pink-400 transition-all placeholder:text-gray-300">
                        </div>
                    </div>
                    <div id="pd-bank" class="hidden space-y-3">
                        <div>
                            <label class="block text-sm font-bold text-gray-900 mb-2">Pilih Bank</label>
                            <select id="pd-bank-select" class="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-pink-200 focus:border-pink-400 transition-all">
                                <option value="BCA">BCA</option>
                                <option value="Mandiri">Mandiri</option>
                                <option value="BRI">BRI</option>
                                <option value="BNI">BNI</option>
                                <option value="BSI">BSI</option>
                                <option value="CIMB Niaga">CIMB Niaga</option>
                                <option value="Danamon">Danamon</option>
                                <option value="Permata">Permata</option>
                            </select>
                        </div>
                        <div>
                            <label class="block text-sm font-bold text-gray-900 mb-2">No. Rekening</label>
                            <input id="pd-bank-input" type="text" placeholder="Nomor rekening" class="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-pink-200 focus:border-pink-400 transition-all placeholder:text-gray-300">
                        </div>
                    </div>
                </div>
            </div>
            
            <button onclick="completeCheckout()" class="w-full py-4 bg-gradient-to-r from-pink-500 to-rose-600 text-white font-bold rounded-2xl hover:shadow-lg hover:shadow-pink-400/50 hover:-translate-y-1 transition-all flex items-center justify-center gap-2 mb-2">
                <i class="fa-solid fa-check-circle"></i> Lanjutkan Pembayaran
            </button>
            <button onclick="closeModal()" class="w-full py-2 text-sm text-gray-400 hover:text-gray-600 transition-colors font-medium">
                Kembali
            </button>
        `)
        setTimeout(() => {
            initCheckoutMap()
            document.getElementById('checkout-search')?.addEventListener('keydown', function(e) {
                if (e.key === 'Enter') searchLocation()
            })
        }, 300)
    }, 100)
}

function initCheckoutMap() {
    const container = document.getElementById('checkout-map')
    if (!container) return
    if (container._leaflet_map) return
    if (typeof L === 'undefined') return
    var map = L.map('checkout-map', { zoomControl: true, attributionControl: false }).setView([-6.2088, 106.8456], 12)
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19 }).addTo(map)
    map.on('click', onCheckoutMapClick)
    container._leaflet_map = map
    setTimeout(function() { map.invalidateSize() }, 400)
}

function onCheckoutMapClick(e) {
    const { lat, lng } = e.latlng
    setCheckoutMarker(lat, lng)
    document.getElementById('checkout-jalan').value = lat.toFixed(6) + ', ' + lng.toFixed(6)
    fetch('https://nominatim.openstreetmap.org/reverse?lat=' + lat + '&lon=' + lng + '&format=json&addressdetails=1&accept-language=id')
        .then(function(r) { return r.json() })
        .then(function(data) {
            const a = data.address || {}
            const jalan = a.road || a.pedestrian || a.street || ''
            const norumah = a.house_number || ''
            const kampung = a.suburb || a.village || a.town || a.city || a.municipality || a.county || ''
            document.getElementById('checkout-jalan').value = jalan
            document.getElementById('checkout-norumah').value = norumah
            document.getElementById('checkout-kampung').value = kampung
            localStorage.setItem('vibe_jalan', jalan)
            localStorage.setItem('vibe_norumah', norumah)
            localStorage.setItem('vibe_kampung', kampung)
        })
        .catch(function() {})
}

function setCheckoutMarker(lat, lng) {
    const map = document.getElementById('checkout-map')?._leaflet_map
    if (!map) return
    if (window._checkoutMarker) {
        window._checkoutMarker.setLatLng([lat, lng])
    } else {
        window._checkoutMarker = L.marker([lat, lng]).addTo(map)
    }
}

function searchLocation() {
    const q = document.getElementById('checkout-search').value.trim()
    if (!q) return
    fetch('https://nominatim.openstreetmap.org/search?q=' + encodeURIComponent(q) + '&format=json&limit=5&accept-language=id&addressdetails=1')
        .then(function(r) { return r.json() })
        .then(function(data) {
            const container = document.getElementById('checkout-results')
            if (!container) return
            if (data.length === 0) {
                container.innerHTML = '<p class="text-xs text-gray-400 italic">Tidak ditemukan</p>'
                return
            }
            window._searchResults = data
            container.innerHTML = data.map(function(item, i) {
                return '<div onclick="selectSearchResult(' + i + ')" class="px-3 py-2.5 bg-white border border-gray-100 rounded-xl text-xs text-gray-700 hover:bg-pink-50 hover:border-pink-200 cursor-pointer transition-all mb-1 shadow-sm">' + item.display_name + '</div>'
            }).join('')
        })
        .catch(function() {
            showToast('Gagal mencari lokasi, periksa koneksi internet')
        })
}

function selectSearchResult(idx) {
    const data = window._searchResults?.[idx]
    if (!data) return
    const lat = parseFloat(data.lat)
    const lng = parseFloat(data.lon)
    const map = document.getElementById('checkout-map')?._leaflet_map
    if (map) map.setView([lat, lng], 15)
    setCheckoutMarker(lat, lng)
    const a = data.address || {}
    const jalan = a.road || a.pedestrian || a.street || ''
    const norumah = a.house_number || ''
    const kampung = a.suburb || a.village || a.town || a.city || a.municipality || a.county || ''
    document.getElementById('checkout-jalan').value = jalan
    document.getElementById('checkout-norumah').value = norumah
    document.getElementById('checkout-kampung').value = kampung
    localStorage.setItem('vibe_jalan', jalan)
    localStorage.setItem('vibe_norumah', norumah)
    localStorage.setItem('vibe_kampung', kampung)
    document.getElementById('checkout-results').innerHTML = ''
    document.getElementById('checkout-search').value = (jalan || kampung).split(',')[0]
}

function updatePaymentDetail() {
    var val = document.querySelector('input[name="payment"]:checked')?.value
    var container = document.getElementById('payment-detail')
    if (!container) return
    container.classList.toggle('hidden', val === 'cash' || !val)
    document.querySelectorAll('#payment-detail > div').forEach(function(el) { el.classList.add('hidden') })
    var target = document.getElementById('pd-' + val)
    if (target) target.classList.remove('hidden')
}

function completeCheckout() {
    const paymentMethod = document.querySelector('input[name="payment"]:checked')?.value || 'cash'
    const jalan = document.getElementById('checkout-jalan')?.value.trim() || ''
    const norumah = document.getElementById('checkout-norumah')?.value.trim() || ''
    const kampung = document.getElementById('checkout-kampung')?.value.trim() || ''
    const catatan = document.getElementById('checkout-alamat')?.value.trim() || ''
    const nohp = document.getElementById('checkout-nohp')?.value.trim() || ''
    const alamat = [jalan, norumah ? 'No. ' + norumah : '', kampung, catatan].filter(Boolean).join(', ')
    if (!jalan && !kampung) {
        showToast('Harap isi alamat pengiriman (minimal jalan atau kampung)')
        return
    }
    if (!nohp) {
        showToast('Harap isi nomor HP untuk kurir')
        return
    }
    var paymentDetail = ''
    if (paymentMethod === 'dana') {
        paymentDetail = document.getElementById('pd-dana-input')?.value.trim() || ''
        if (!paymentDetail) { showToast('Masukkan nomor Dana'); return }
    } else if (paymentMethod === 'gopay') {
        paymentDetail = document.getElementById('pd-gopay-input')?.value.trim() || ''
        if (!paymentDetail) { showToast('Masukkan nomor GoPay'); return }
    } else if (paymentMethod === 'ewallet_other') {
        var ew = document.getElementById('pd-ewallet-select')?.value || ''
        var no = document.getElementById('pd-ewallet-input')?.value.trim() || ''
        if (!no) { showToast('Masukkan nomor e-wallet'); return }
        paymentDetail = ew + ' - ' + no
    } else if (paymentMethod === 'bank') {
        var bank = document.getElementById('pd-bank-select')?.value || ''
        var rek = document.getElementById('pd-bank-input')?.value.trim() || ''
        if (!rek) { showToast('Masukkan nomor rekening'); return }
        paymentDetail = bank + ' - ' + rek
    }
    window._checkoutData = {
        paymentMethod: paymentMethod,
        paymentDetail: paymentDetail,
        nohp: nohp,
        items: cart.map(function(c) { return { id: c.id, nama: c.nama, harga: c.harga, merk: c.merk, jumlah: c.jumlah || 1 } }),
        total: cart.reduce(function(s, c) { return s + c.harga * (c.jumlah || 1) }, 0),
        alamat: alamat
    }

    localStorage.setItem('vibe_jalan', jalan)
    localStorage.setItem('vibe_norumah', norumah)
    localStorage.setItem('vibe_kampung', kampung)
    localStorage.setItem('vibe_nohp', nohp)
    localStorage.setItem('vibe_alamat', alamat)
    closeModal()
    setTimeout(function() {
        var total = window._checkoutData.total
        openRawModal('' +
            '<div class="text-center mb-6 animate-scale-in">' +
                '<div class="w-16 h-16 bg-gradient-to-br from-green-100 to-emerald-100 rounded-3xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-green-300/50">' +
                    '<i class="fa-solid fa-truck text-2xl text-emerald-600"></i>' +
                '</div>' +
                '<h3 class="text-2xl font-black text-gray-900">Pilih Pengiriman</h3>' +
                '<p class="text-sm text-gray-500 mt-1">Total: <span class="font-bold text-emerald-600 text-lg">' + rupiah(total) + '</span></p>' +
            '</div>' +
            '<div class="space-y-3 mb-6">' +
                '<div onclick="confirmOrder(5, \'Reguler\')" class="flex items-center gap-4 p-4 bg-white rounded-2xl border-2 border-gray-200 hover:border-green-300 cursor-pointer transition-all hover:shadow-md">' +
                    '<div class="w-12 h-12 bg-gradient-to-br from-green-100 to-emerald-100 rounded-xl flex items-center justify-center flex-shrink-0">' +
                        '<i class="fa-solid fa-truck-fast text-xl text-emerald-600"></i>' +
                    '</div>' +
                    '<div class="flex-1">' +
                        '<span class="font-bold text-gray-900 block">Reguler</span>' +
                        '<span class="text-xs text-gray-500">Estimasi sampai 3-5 hari</span>' +
                    '</div>' +
                    '<span class="text-sm font-bold text-emerald-600">' + rupiah(0) + '</span>' +
                '</div>' +
                '<div onclick="confirmOrder(7, \'Kargo\')" class="flex items-center gap-4 p-4 bg-white rounded-2xl border-2 border-gray-200 hover:border-green-300 cursor-pointer transition-all hover:shadow-md">' +
                    '<div class="w-12 h-12 bg-gradient-to-br from-blue-100 to-cyan-100 rounded-xl flex items-center justify-center flex-shrink-0">' +
                        '<i class="fa-solid fa-truck text-xl text-blue-600"></i>' +
                    '</div>' +
                    '<div class="flex-1">' +
                        '<span class="font-bold text-gray-900 block">Kargo</span>' +
                        '<span class="text-xs text-gray-500">Estimasi sampai 5-7 hari</span>' +
                    '</div>' +
                    '<span class="text-sm font-bold text-emerald-600">' + rupiah(0) + '</span>' +
                '</div>' +
                '<div onclick="confirmOrder(14, \'Hemat\')" class="flex items-center gap-4 p-4 bg-white rounded-2xl border-2 border-gray-200 hover:border-green-300 cursor-pointer transition-all hover:shadow-md">' +
                    '<div class="w-12 h-12 bg-gradient-to-br from-amber-100 to-orange-100 rounded-xl flex items-center justify-center flex-shrink-0">' +
                        '<i class="fa-solid fa-truck text-xl text-amber-600"></i>' +
                    '</div>' +
                    '<div class="flex-1">' +
                        '<span class="font-bold text-gray-900 block">Hemat</span>' +
                        '<span class="text-xs text-gray-500">Estimasi sampai 7-14 hari</span>' +
                    '</div>' +
                    '<span class="text-sm font-bold text-emerald-600">' + rupiah(0) + '</span>' +
                '</div>' +
            '</div>' +
            '<button onclick="closeModal()" class="w-full py-2 text-sm text-gray-400 hover:text-gray-600 transition-colors font-medium">' +
                'Batal' +
            '</button>' +
        '')
    }, 100)
}

function confirmOrder(deliveryDays, deliveryLabel) {
    var data = window._checkoutData
    if (!data) return
    var now = new Date()
    var arrival = new Date(now)
    arrival.setDate(arrival.getDate() + deliveryDays)
    var orders = JSON.parse(localStorage.getItem('vibe_orders') || '[]')
    orders.unshift({
        id: Date.now(),
        items: data.items,
        total: data.total,
        nohp: data.nohp,
        paymentMethod: data.paymentMethod,
        paymentDetail: data.paymentDetail,
        deliveryLabel: deliveryLabel,
        deliveryDays: deliveryDays,
        estimatedArrival: arrival.toISOString(),
        address: data.alamat,
        orderDate: now.toISOString(),
        status: 'diproses'
    })
    localStorage.setItem('vibe_orders', JSON.stringify(orders))
    localStorage.removeItem(getCartKey())
    cart = []
    updateCartBadge()
    window._checkoutData = null

    closeModal()
    showToast('<i class="fa-solid fa-check-circle text-emerald-400"></i> Pesanan berhasil! Estimasi sampai ' + deliveryLabel.toLowerCase() + ' ' + deliveryDays + ' hari')
}

function openOrders() {
    document.getElementById('user-menu')?.classList.add('hidden')
    var orders = JSON.parse(localStorage.getItem('vibe_orders') || '[]')
    if (orders.length === 0) {
        showToast('Belum ada pesanan')
        return
    }
    var now = new Date()
    var html = orders.map(function(o) {
        var arrival = new Date(o.estimatedArrival)
        var remaining = Math.max(0, Math.ceil((arrival - now) / (1000 * 60 * 60 * 24)))
        var status, statusColor, statusIcon
        if (remaining <= 0) {
            status = 'Sampai'
            statusColor = 'text-emerald-600'
            statusIcon = 'fa-circle-check text-emerald-500'
        } else if (remaining <= 2) {
            status = 'Dikirim'
            statusColor = 'text-blue-600'
            statusIcon = 'fa-truck text-blue-500'
        } else {
            status = 'Diproses'
            statusColor = 'text-amber-600'
            statusIcon = 'fa-gear text-amber-500'
        }
        var items = o.items.map(function(c) {
            return '<div class="flex justify-between text-xs text-gray-600 py-0.5"><span>' + c.nama + ' <span class="text-gray-400">x' + c.jumlah + '</span></span><span>' + rupiah(c.harga * c.jumlah) + '</span></div>'
        }).join('')
        return '<div class="bg-white border border-gray-100 rounded-2xl p-4 mb-3 shadow-sm hover:shadow-md transition-all">' +
            '<div class="flex items-center justify-between mb-2">' +
                '<div class="flex items-center gap-2">' +
                    '<i class="fa-solid ' + statusIcon + '"></i>' +
                    '<span class="text-sm font-bold ' + statusColor + '">' + status + '</span>' +
                '</div>' +
                '<span class="text-[10px] text-gray-400">' + new Date(o.orderDate).toLocaleDateString('id-ID') + '</span>' +
            '</div>' +
            '<div class="bg-gray-50 rounded-xl p-3 mb-2 space-y-0.5">' + items + '</div>' +
            '<div class="flex items-center gap-2 text-[10px] text-gray-400 mb-1">' +
                '<i class="fa-solid fa-phone"></i>' +
                '<span>' + (o.nohp || '-') + '</span>' +
            '</div>' +
            '<div class="flex justify-between items-center pt-2 border-t border-gray-100">' +
                '<div>' +
                    '<p class="text-[10px] text-gray-400">' + o.deliveryLabel + ' • ' + o.deliveryDays + ' hari</p>' +
                    '<p class="text-[10px] text-gray-400">Estimasi: ' + arrival.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) + '</p>' +
                '</div>' +
                '<span class="font-bold text-pink-600 text-sm">' + rupiah(o.total) + '</span>' +
            '</div>' +
            '<p class="text-[10px] text-gray-400 mt-1.5 truncate">' + o.address + '</p>' +
        '</div>'
    }).join('')

    openRawModal('' +
        '<div class="text-center mb-5 animate-scale-in">' +
            '<div class="w-14 h-14 bg-gradient-to-br from-pink-100 to-rose-100 rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-lg shadow-pink-300/50">' +
                '<i class="fa-solid fa-box text-xl text-pink-600"></i>' +
            '</div>' +
            '<h3 class="text-xl font-black text-gray-900">Pesanan Saya</h3>' +
            '<p class="text-xs text-gray-500 mt-0.5">' + orders.length + ' pesanan</p>' +
        '</div>' +
        '<div class="space-y-0 max-h-96 overflow-y-auto custom-scrollbar">' + html + '</div>' +
        '<button onclick="closeModal()" class="w-full mt-4 py-3 bg-gray-100 text-gray-600 font-semibold rounded-2xl hover:bg-gray-200 transition-all text-sm">' +
            'Tutup' +
        '</button>' +
    '')
}

function clearCart() {
    localStorage.removeItem(getCartKey())
    cart = []
    updateCartBadge()
    closeModal()
    showToast(`<i class="fa-solid fa-trash-can text-red-400"></i> Keranjang dikosongkan`)
}

function openModal(id) {
    const p = allProducts.find(b => b.id === id)
    if (!p) return
    const grad = imgGradient(p.id, p.nama)
    const initials = p.nama.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()
    const fallbackId = `mfallback-${p.id}`

    let imgSection
    if (p.gambar_url) {
        imgSection = `<div class="sm:w-64 h-56 sm:h-72 rounded-2xl overflow-hidden flex-shrink-0 relative bg-gradient-to-br ${grad} shadow-lg">
            <img src="${p.gambar_url}" alt="${p.nama}" loading="lazy"
                onerror="this.style.display='none';document.getElementById('${fallbackId}').style.display='flex'"
                class="absolute inset-0 w-full h-full object-cover group-hover:scale-110 transition-transform duration-700">
            <div id="${fallbackId}" class="absolute inset-0 bg-gradient-to-br ${grad} hidden items-center justify-center">
                <span class="text-7xl font-black text-white/20 select-none">${initials}</span>
            </div>
            <div class="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent"></div>
            <span class="absolute top-3 left-3 px-3 py-1 bg-white/90 backdrop-blur text-pink-700 text-[10px] font-bold rounded-full shadow-md border border-white/50">${p.kategori}</span>
        </div>`
    } else {
        imgSection = `<div class="sm:w-64 h-56 sm:h-72 rounded-2xl bg-gradient-to-br ${grad} flex items-center justify-center flex-shrink-0 shadow-lg relative">
            <span class="text-8xl font-black text-white/20 select-none">${initials}</span>
            <span class="absolute top-3 left-3 px-3 py-1 bg-white/90 backdrop-blur text-pink-700 text-[10px] font-bold rounded-full shadow-md border border-white/50">${p.kategori}</span>
        </div>`
    }

    openRawModal(`
        <div class="flex flex-col sm:flex-row gap-4 sm:gap-6">
            ${imgSection}
            <div class="flex-1 flex flex-col min-w-0">
                <div class="flex items-start justify-between gap-3 mb-4">
                    <div class="flex-1 min-w-0">
                        <h2 class="text-xl sm:text-2xl font-bold text-gray-900 leading-tight">${p.nama}</h2>
                        <p class="text-sm text-gray-500 mt-0.5 font-medium">${p.merk}</p>
                    </div>
                    <span class="text-xl sm:text-2xl font-black text-pink-600 whitespace-nowrap">${rupiah(p.harga)}</span>
                </div>
                ${p.deskripsi ? `<p class="text-sm text-gray-600 leading-relaxed bg-gradient-to-r from-gray-50 to-pink-50 rounded-xl p-4 border border-pink-100 mb-4">${p.deskripsi}</p>` : ''}
                <div class="grid grid-cols-3 gap-2 sm:gap-3">
                    <div class="bg-gradient-to-br from-gray-50 to-pink-50 rounded-xl p-3 sm:p-4">
                        <div class="flex items-center gap-2 mb-1.5">
                            <div class="w-6 h-6 bg-pink-100 rounded-lg flex items-center justify-center flex-shrink-0">
                                <i class="fa-solid fa-ruler text-[10px] text-pink-600"></i>
                            </div>
                            <p class="text-[10px] text-gray-500 font-bold tracking-wider">UKURAN</p>
                        </div>
                        <p class="font-bold text-base sm:text-lg text-gray-800">${p.ukuran}</p>
                    </div>
                    <div class="bg-gradient-to-br from-gray-50 to-pink-50 rounded-xl p-3 sm:p-4">
                        <div class="flex items-center gap-2 mb-1.5">
                            <div class="w-6 h-6 bg-pink-100 rounded-lg flex items-center justify-center flex-shrink-0">
                                <i class="fa-solid fa-tag text-[10px] text-pink-600"></i>
                            </div>
                            <p class="text-[10px] text-gray-500 font-bold tracking-wider">KATEGORI</p>
                        </div>
                        <p class="font-bold text-base sm:text-lg text-gray-800">${p.kategori}</p>
                    </div>
                    <div class="bg-gradient-to-br from-gray-50 to-pink-50 rounded-xl p-3 sm:p-4">
                        <div class="flex items-center gap-2 mb-1.5">
                            <div class="w-6 h-6 bg-pink-100 rounded-lg flex items-center justify-center flex-shrink-0">
                                <i class="fa-solid fa-box text-[10px] text-pink-600"></i>
                            </div>
                            <p class="text-[10px] text-gray-500 font-bold tracking-wider">STOK</p>
                        </div>
                        <p class="font-bold text-base sm:text-lg ${p.stok > 3 ? 'text-emerald-600' : 'text-amber-600'}">${p.stok} unit</p>
                    </div>
                </div>
                <div class="flex flex-wrap gap-2 mt-auto pt-5">
                    ${canOrder() ? `<button data-modal-add-cart="${p.id}" class="flex-1 min-w-[140px] py-3.5 rounded-xl font-bold text-sm transition-all bg-gradient-to-r from-pink-500 to-rose-700 text-white hover:shadow-lg hover:shadow-pink-400 hover:-translate-y-0.5 flex items-center justify-center gap-2">
                        <i class="fa-solid fa-cart-plus"></i> Tambah
                    </button>` : `<button onclick="closeModal();openLoginForm()" class="flex-1 min-w-[140px] py-3.5 rounded-xl font-bold text-sm transition-all bg-gray-100 text-gray-600 hover:bg-pink-100 hover:text-pink-600 flex items-center justify-center gap-2">
                        <i class="fa-solid fa-right-to-bracket"></i> Masuk
                    </button>`}
                    <button onclick="closeModal();openEditForm(${p.id})" class="px-5 py-3.5 rounded-xl font-semibold text-sm bg-sky-50 text-sky-500 hover:bg-sky-100 hover:text-sky-600 transition-all flex items-center gap-2" title="Edit" data-admin>
                        <i class="fa-solid fa-pen-to-square"></i>
                    </button>
                    <button onclick="hapusBaju(${p.id})" class="px-5 py-3.5 rounded-xl font-semibold text-sm bg-red-50 text-red-500 hover:bg-red-100 hover:text-red-600 transition-all flex items-center gap-2" title="Hapus" data-admin>
                        <i class="fa-solid fa-trash-can"></i>
                    </button>
                </div>
            </div>
        </div>
    `)

    if (canOrder()) {
        const modalContent = document.getElementById('modal-content')
        modalContent.querySelector('[data-modal-add-cart]')?.addEventListener('click', () => {
            addToCart(id)
            closeModal()
        })
    }
}

function openRawModal(html) {
    document.getElementById('modal-content').innerHTML = html
    document.querySelectorAll('[data-admin]').forEach(el => {
        el.classList.toggle('hidden', !isAdmin())
    })
    document.querySelectorAll('[data-cart]').forEach(el => {
        el.classList.toggle('hidden', !canOrder())
    })
    document.getElementById('modal').classList.remove('hidden')
    document.body.style.overflow = 'hidden'
}

function closeModal() {
    const container = document.getElementById('checkout-map')
    if (container && container._leaflet_map) {
        container._leaflet_map.remove()
        delete container._leaflet_map
    }
    window._checkoutMarker = null
    window._searchResults = null
    document.getElementById('modal').classList.add('hidden')
    document.body.style.overflow = ''
}

function setView(v) {
    currentView = v
    localStorage.setItem('vibe_view', v)
    document.querySelectorAll('#view-grid, #view-list').forEach(b => {
        b.classList.toggle('bg-white', (v === 'grid' && b.id === 'view-grid') || (v === 'list' && b.id === 'view-list'))
        b.classList.toggle('shadow-sm', (v === 'grid' && b.id === 'view-grid') || (v === 'list' && b.id === 'view-list'))
        b.classList.toggle('text-gray-900', (v === 'grid' && b.id === 'view-grid') || (v === 'list' && b.id === 'view-list'))
        b.classList.toggle('text-gray-400', !((v === 'grid' && b.id === 'view-grid') || (v === 'list' && b.id === 'view-list')))
    })
    render()
}

function applyFilter() { fetchProducts() }

function resetFilter() {
    document.getElementById('search-input').value = ''
    document.getElementById('kategori-filter').value = ''
    document.getElementById('harga-filter').value = ''
    fetchProducts()
}

async function loadCategories() {
    try {
        const res = await fetch(API)
        const json = await res.json()
        const cats = [...new Set((json.data || []).map(b => b.kategori))]
        const sel = document.getElementById('kategori-filter')
        cats.forEach(c => { const o = document.createElement('option'); o.value = c; o.textContent = c; sel.appendChild(o) })
    } catch (e) { /* ignore */ }
}

function openAddForm() {
    openRawModal(`
        <div class="text-center mb-6">
            <div class="w-14 h-14 bg-pink-50 rounded-full flex items-center justify-center mx-auto mb-3">
                <i class="fa-solid fa-plus text-xl text-pink-500"></i>
            </div>
            <h3 class="text-lg font-bold text-gray-900">Tambah Baju Baru</h3>
            <p class="text-sm text-gray-400">Lengkapi detail produk di bawah</p>
        </div>
        <form id="add-form" onsubmit="submitAddForm(event)" class="space-y-3">
            <div class="grid grid-cols-2 gap-3">
                <div>
                    <label class="block text-xs font-semibold text-gray-500 mb-1">Nama Baju <span class="text-red-400">*</span></label>
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
                <textarea name="deskripsi" rows="2" placeholder="Deskripsi singkat tentang produk..." class="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-pink-200 focus:border-pink-400 transition-all placeholder:text-gray-300 resize-none"></textarea>
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
        showToast(`<i class="fa-solid fa-check-circle text-emerald-400"></i> ${data.nama} berhasil ditambahkan!`)
        fetchProducts()
    } catch (err) {
        showToast(`<i class="fa-solid fa-circle-exclamation text-red-400"></i> Gagal: ${err.message}`)
    } finally {
        txt.classList.remove('hidden')
        load.classList.add('hidden')
        btn.disabled = false
    }
}

function openEditForm(id) {
    const p = allProducts.find(b => b.id === id)
    if (!p) return
    openRawModal(`
        <div class="text-center mb-6">
            <div class="w-14 h-14 bg-sky-50 rounded-full flex items-center justify-center mx-auto mb-3">
                <i class="fa-solid fa-pen-to-square text-xl text-sky-500"></i>
            </div>
            <h3 class="text-lg font-bold text-gray-900">Edit Baju</h3>
            <p class="text-sm text-gray-400">Ubah detail produk</p>
        </div>
        <form id="edit-form" onsubmit="submitEditForm(event, ${id})" class="space-y-3">
            <div class="grid grid-cols-2 gap-3">
                <div>
                    <label class="block text-xs font-semibold text-gray-500 mb-1">Nama Baju <span class="text-red-400">*</span></label>
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
        showToast(`<i class="fa-solid fa-pen-to-square text-sky-400"></i> ${data.nama} berhasil diperbarui!`)
        fetchProducts()
    } catch (err) {
        showToast(`<i class="fa-solid fa-circle-exclamation text-red-400"></i> Gagal: ${err.message}`)
    } finally {
        txt.classList.remove('hidden')
        load.classList.add('hidden')
        btn.disabled = false
    }
}

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
                <h3 class="text-lg font-bold text-gray-900">Hapus Baju?</h3>
                <p class="text-sm text-gray-400 mt-2">"${p.nama}" akan dihapus permanen dari katalog.</p>
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
        showToast(`<i class="fa-solid fa-trash-can text-red-400"></i> ${p.nama} berhasil dihapus`)
        fetchProducts()
    } catch (err) {
        showToast(`<i class="fa-solid fa-circle-exclamation text-red-400"></i> Gagal: ${err.message}`)
    }
}

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

// ─────────────────────────── Auth ───────────────────────────
const isLoggedIn = () => currentUser !== null
const isAdmin = () => currentUser && currentUser.username === 'admin'
const canOrder = () => isLoggedIn() && !isAdmin()

function openLoginForm() {
    document.getElementById('auth-modal').classList.remove('hidden')
    document.body.style.overflow = 'hidden'
    showAuthForm('login')
}

function closeLoginForm() {
    document.getElementById('auth-modal').classList.add('hidden')
    document.body.style.overflow = ''
    document.getElementById('user-menu')?.classList.add('hidden')
}

function toggleAuthMode() {
    const login = document.getElementById('auth-login')
    const reg = document.getElementById('auth-register')
    const isLogin = !login.classList.contains('hidden')
    login.classList.toggle('hidden', isLogin)
    reg.classList.toggle('hidden', !isLogin)
}

function togglePassword(inputId, btn) {
    const input = document.getElementById(inputId)
    const icon = btn.querySelector('i')
    if (input.type === 'password') {
        input.type = 'text'
        icon.className = 'fa-regular fa-eye-slash'
    } else {
        input.type = 'password'
        icon.className = 'fa-regular fa-eye'
    }
}

function toggleUserMenu() {
    const menu = document.getElementById('user-menu')
    menu.classList.toggle('hidden')
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
        currentUser = user
        localStorage.setItem('vibe_user', JSON.stringify(user))
        closeLoginForm()
        updateAuthUI()
        loadCart()
        render()
        showToast('Selamat datang, ' + user.nama + '!')
    } catch (err) {
        showToast(err.message)
    } finally {
        txt.classList.remove('hidden')
        load.classList.add('hidden')
        btn.disabled = false
    }
}

async function submitRegister(e) {
    e.preventDefault()
    const form = document.getElementById('register-form')
    const btn = document.getElementById('register-submit-btn')
    const txt = document.getElementById('register-submit-text')
    const load = document.getElementById('register-submit-loading')
    const data = Object.fromEntries(new FormData(form).entries())

    txt.classList.add('hidden')
    load.classList.remove('hidden')
    btn.disabled = true

    try {
        const res = await fetch('/auth/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        })
        if (!res.ok) {
            const err = await res.json()
            throw new Error(err.detail || 'Registrasi gagal')
        }
        const user = await res.json()
        currentUser = user
        localStorage.setItem('vibe_user', JSON.stringify(user))
        closeLoginForm()
        updateAuthUI()
        loadCart()
        render()
        showToast('Akun berhasil dibuat! Selamat datang, ' + user.nama + '!')
    } catch (err) {
        showToast(err.message)
    } finally {
        txt.classList.remove('hidden')
        load.classList.add('hidden')
        btn.disabled = false
    }
}

function logout() {
    currentUser = null
    cart = []
    updateCartBadge()
    localStorage.removeItem('vibe_user')
    document.getElementById('user-menu')?.classList.add('hidden')
    updateAuthUI()
    render()
    showToast('Berhasil keluar')
}

function updateAuthUI() {
    const loginBtn = document.getElementById('login-btn')
    const avatar = document.getElementById('user-avatar')
    if (currentUser) {
        loginBtn?.classList.add('hidden')
        avatar?.classList.remove('hidden')
        const nameEl = document.getElementById('user-initial')
        const menuName = document.getElementById('user-menu-name')
        const menuUser = document.getElementById('user-menu-username')
        if (nameEl) nameEl.textContent = currentUser.nama.charAt(0).toUpperCase()
        if (menuName) menuName.textContent = currentUser.nama
        if (menuUser) menuUser.textContent = '@' + currentUser.username
    } else {
        loginBtn?.classList.remove('hidden')
        avatar?.classList.add('hidden')
    }
    document.querySelectorAll('[data-admin]').forEach(el => {
        el.classList.toggle('hidden', !isAdmin())
    })
    document.querySelectorAll('[data-cart]').forEach(el => {
        el.classList.toggle('hidden', !canOrder())
    })
}

function showAuthForm(mode) {
    const login = document.getElementById('auth-login')
    const reg = document.getElementById('auth-register')
    if (mode === 'login') {
        login.classList.remove('hidden')
        reg.classList.add('hidden')
    } else {
        login.classList.add('hidden')
        reg.classList.remove('hidden')
    }
}

document.addEventListener('click', (e) => {
    const menu = document.getElementById('user-menu')
    const avatar = document.getElementById('user-avatar')
    if (menu && avatar && !avatar.contains(e.target) && !menu.classList.contains('hidden')) {
        menu.classList.add('hidden')
    }
})

// Init
document.addEventListener('DOMContentLoaded', () => {
    loadCategories()
    setView(currentView)
    updateCartBadge()
    updateAuthUI()
    fetchProducts()

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            closeModal()
            closeLoginForm()
        }
    })
})
