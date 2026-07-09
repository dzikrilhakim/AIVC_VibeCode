const API = '/baju'
let allProducts = []
let cart = JSON.parse(localStorage.getItem('vibe_cart')) || []
let currentView = localStorage.getItem('vibe_view') || 'grid'

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
    const inCart = cart.some(c => c.id === p.id)
    const grad = imgGradient(p.id, p.nama)

    const kategoriColors = { Kemeja: 'bg-blue-50 text-blue-600', Kaos: 'bg-emerald-50 text-emerald-600', Jaket: 'bg-amber-50 text-amber-600' }
    const badgeColor = kategoriColors[p.kategori] || 'bg-gray-50 text-gray-600'

    return `<div data-detail="${p.id}" class="group bg-white rounded-3xl border border-gray-100 overflow-hidden cursor-pointer hover:shadow-2xl hover:shadow-pink-300/40 hover:-translate-y-2 transition-all duration-500 animate-slide-up">
        <div class="relative aspect-[4/5] overflow-hidden bg-gradient-to-br ${grad}">
            ${imgHtml(p)}
            <div class="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"></div>
            <div class="absolute inset-0 bg-gradient-to-br from-white/0 to-white/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"></div>
            <span class="absolute top-4 left-4 px-3 py-1.5 ${badgeColor} text-[10px] font-bold rounded-full z-10 shadow-md backdrop-blur-sm">${p.kategori}</span>
            <div class="absolute top-4 right-4 bg-white/90 backdrop-blur-lg rounded-full w-10 h-10 flex items-center justify-center shadow-lg opacity-0 group-hover:opacity-100 transition-all duration-300" title="Rating">
                <i class="fa-solid fa-star text-yellow-400 text-sm"></i>
            </div>
            <div class="absolute bottom-4 left-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 translate-y-4 group-hover:translate-y-0 transition-all duration-300 z-10">
                <button data-add-cart="${p.id}" class="flex-1 px-3 py-2.5 bg-white/95 backdrop-blur rounded-full flex items-center justify-center text-gray-900 hover:bg-pink-500 hover:text-white transition-all font-semibold text-sm shadow-lg">
                    <i class="fa-solid ${inCart ? 'fa-check' : 'fa-plus'}"></i>
                </button>
                <button onclick="event.stopPropagation();hapusBaju(${p.id})" class="px-3 py-2.5 bg-white/95 backdrop-blur rounded-full flex items-center justify-center text-gray-400 hover:bg-red-500 hover:text-white transition-all shadow-lg">
                    <i class="fa-solid fa-trash-can"></i>
                </button>
            </div>
        </div>
        <div class="p-5">
            <div class="mb-2">
                <h3 class="font-bold text-gray-900 text-sm leading-tight line-clamp-2 group-hover:text-pink-600 transition-colors">${p.nama}</h3>
                <p class="text-xs text-gray-500 mt-0.5 font-medium">${p.merk}</p>
            </div>
            <div class="flex items-end justify-between mt-4 pt-4 border-t border-gray-100">
                <div>
                    <p class="text-[10px] text-gray-500 uppercase tracking-wider font-bold mb-0.5">Harga</p>
                    <span class="font-black text-pink-600 text-lg">${rupiah(p.harga)}</span>
                </div>
                ${p.stok <= 3 ? `<span class="text-[10px] font-bold text-amber-600 bg-amber-100 px-2.5 py-1.5 rounded-lg">⚠️ Sisa ${p.stok}</span>` : `<span class="text-[10px] text-green-600 font-semibold">✓ Stok: ${p.stok}</span>`}
            </div>
        </div>
    </div>`
}

function createListItem(p) {
    const inCart = cart.some(c => c.id === p.id)

    return `<div data-detail="${p.id}" class="flex gap-4 bg-white rounded-3xl border border-gray-100 p-4 sm:p-5 cursor-pointer hover:shadow-xl hover:border-pink-200 hover:-translate-y-1 transition-all duration-300">
        <div class="w-20 h-20 sm:w-28 sm:h-28 rounded-2xl overflow-hidden flex-shrink-0 bg-gradient-to-br ${imgGradient(p.id, p.nama)} shadow-lg">
            ${imgHtml(p, 'rounded-2xl')}
        </div>
        <div class="flex-1 min-w-0 flex flex-col justify-between">
            <div>
                <div class="flex items-start justify-between gap-2 mb-2">
                    <div>
                        <h3 class="font-bold text-gray-900 text-base line-clamp-1">${p.nama}</h3>
                        <p class="text-xs text-gray-500 font-medium mt-0.5">${p.merk} • ${p.ukuran} • ${p.warna}</p>
                    </div>
                    <span class="font-black text-pink-600 text-lg whitespace-nowrap">${rupiah(p.harga)}</span>
                </div>
                <div class="flex items-center gap-2 mt-2.5">
                    <span class="px-2.5 py-1 bg-gradient-to-r from-pink-100 to-rose-100 text-pink-700 text-[10px] font-bold rounded-full">${p.kategori}</span>
                    ${p.stok <= 3 ? `<span class="text-[10px] font-bold text-amber-600">Sisa ${p.stok}</span>` : `<span class="text-[10px] text-green-600 font-semibold">Stok: ${p.stok}</span>`}
                </div>
                ${p.deskripsi ? `<p class="text-xs text-gray-500 mt-2 line-clamp-1">${p.deskripsi}</p>` : ''}
            </div>
        </div>
        <div class="flex flex-col gap-2 self-center flex-shrink-0">
            <button data-add-cart="${p.id}" class="w-10 h-10 rounded-full flex items-center justify-center transition-all font-bold ${inCart ? 'bg-gradient-to-br from-pink-500 to-rose-600 text-white shadow-lg shadow-pink-300/50' : 'bg-gray-100 text-gray-600 hover:bg-pink-100 hover:text-pink-600'}">
                <i class="fa-solid ${inCart ? 'fa-check' : 'fa-plus'} text-sm"></i>
            </button>
            <button onclick="event.stopPropagation();hapusBaju(${p.id})" class="w-10 h-10 rounded-full flex items-center justify-center bg-gray-100 text-gray-400 hover:bg-red-100 hover:text-red-600 transition-all font-bold">
                <i class="fa-solid fa-trash-can text-sm"></i>
            </button>
        </div>
    </div>`
}

function addToCart(id) {
    const p = allProducts.find(b => b.id === id)
    if (!p) return

    const existing = cart.find(c => c.id === id)
    if (existing) {
        cart = cart.filter(c => c.id !== id)
        showToast(`<i class="fa-solid fa-xmark"></i> ${p.nama} dihapus dari keranjang`)
    } else {
        cart.push({ id: p.id, nama: p.nama, harga: p.harga, merk: p.merk })
        showToast(`${p.nama} ditambahkan ke keranjang`)
    }

    localStorage.setItem('vibe_cart', JSON.stringify(cart))
    updateCartBadge()
    render()
}

function updateCartBadge() {
    const badge = document.getElementById('cart-badge')
    if (cart.length > 0) {
        badge.classList.remove('hidden')
        badge.textContent = cart.length
    } else {
        badge.classList.add('hidden')
    }
}

function toggleCart() {
    if (cart.length === 0) {
        showToast('Keranjang masih kosong')
        return
    }
    const items = cart.map((c, idx) => `<div class="flex justify-between items-center py-3 px-4 bg-gradient-to-r from-gray-50 to-pink-50 rounded-xl mb-2 hover:shadow-md transition-all">
        <div class="flex-1">
            <span class="font-semibold text-sm text-gray-900">${c.nama}</span>
            <p class="text-xs text-gray-500 mt-0.5">${c.merk}</p>
        </div>
        <div class="flex items-center gap-3">
            <span class="text-sm font-bold text-pink-600">${rupiah(c.harga)}</span>
            <button onclick="removeFromCart(${idx})" class="w-7 h-7 rounded-full flex items-center justify-center text-gray-400 hover:bg-red-100 hover:text-red-500 transition-all">
                <i class="fa-solid fa-trash-can text-xs"></i>
            </button>
        </div>
    </div>`).join('')
    const total = cart.reduce((s, c) => s + c.harga, 0)

    openRawModal(`
        <div class="text-center mb-6 animate-scale-in">
            <div class="w-16 h-16 bg-gradient-to-br from-pink-100 to-rose-100 rounded-3xl flex items-center justify-center mx-auto mb-3 animate-bounce shadow-lg shadow-pink-300/50">
                <i class="fa-solid fa-shopping-cart text-2xl text-pink-600"></i>
            </div>
            <h3 class="text-2xl font-black text-gray-900">Keranjang Belanja</h3>
            <p class="text-sm text-gray-500 mt-1">${cart.length} item dalam keranjang</p>
        </div>
        <div class="space-y-0 mb-4 max-h-56 overflow-y-auto custom-scrollbar">${items}</div>
        <div class="flex justify-between items-center pt-4 pb-4 border-t-2 border-b-2 border-gray-200 mb-4">
            <span class="font-bold text-gray-900 text-lg">Total:</span>
            <span class="font-black text-pink-600 text-2xl">${rupiah(total)}</span>
        </div>
        <button onclick="openCheckout()" class="w-full py-4 bg-gradient-to-r from-pink-500 to-rose-600 text-white font-bold rounded-2xl hover:shadow-lg hover:shadow-pink-400/50 hover:-translate-y-1 transition-all mb-2 flex items-center justify-center gap-2">
            <i class="fa-solid fa-credit-card"></i> Lanjut ke Checkout
        </button>
        <button onclick="clearCart()" class="w-full py-2 text-sm text-gray-400 hover:text-red-500 transition-colors font-medium">
            <i class="fa-solid fa-trash-can mr-1"></i> Kosongkan Keranjang
        </button>
    `)
}

function removeFromCart(index) {
    const item = cart[index]
    cart.splice(index, 1)
    localStorage.setItem('vibe_cart', JSON.stringify(cart))
    updateCartBadge()
    showToast(`<i class="fa-solid fa-trash-can"></i> ${item.nama} dihapus`)
    if (cart.length > 0) toggleCart()
    else closeModal()
}

function openCheckout() {
    const total = cart.reduce((s, c) => s + c.harga, 0)
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
                <label class="block text-sm font-bold text-gray-900 mb-3">Pilih Metode Pembayaran</label>
                <div class="space-y-2">
                    <label class="flex items-center gap-3 p-4 bg-gradient-to-r from-white to-pink-50 rounded-2xl border-2 border-transparent hover:border-pink-300 cursor-pointer transition-all has-[:checked]:border-pink-500 has-[:checked]:bg-gradient-to-r has-[:checked]:from-pink-50 has-[:checked]:to-rose-50 shadow-sm hover:shadow-md">
                        <input type="radio" name="payment" value="cash" checked class="w-5 h-5 text-pink-600">
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
                        <input type="radio" name="payment" value="dana" class="w-5 h-5 text-pink-600">
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
                        <input type="radio" name="payment" value="gopay" class="w-5 h-5 text-pink-600">
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
                        <input type="radio" name="payment" value="ewallet_other" class="w-5 h-5 text-pink-600">
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
                        <input type="radio" name="payment" value="bank" class="w-5 h-5 text-pink-600">
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
            </div>
            
            <button onclick="completeCheckout()" class="w-full py-4 bg-gradient-to-r from-pink-500 to-rose-600 text-white font-bold rounded-2xl hover:shadow-lg hover:shadow-pink-400/50 hover:-translate-y-1 transition-all flex items-center justify-center gap-2 mb-2">
                <i class="fa-solid fa-check-circle"></i> Lanjutkan Pembayaran
            </button>
            <button onclick="closeModal()" class="w-full py-2 text-sm text-gray-400 hover:text-gray-600 transition-colors font-medium">
                Kembali
            </button>
        `)
    }, 100)
}

function completeCheckout() {
    const paymentMethod = document.querySelector('input[name="payment"]:checked')?.value || 'cash'
    const total = cart.reduce((s, c) => s + c.harga, 0)
    const paymentLabels = {
        cash: 'Tunai',
        dana: 'Dana',
        gopay: 'GoPay',
        ewallet_other: 'E-Wallet Lainnya',
        bank: 'Transfer Bank'
    }
    closeModal()
    localStorage.removeItem('vibe_cart')
    cart = []
    updateCartBadge()
    showToast(`<i class="fa-solid fa-check-circle text-emerald-400"></i> Pembayaran via ${paymentLabels[paymentMethod]} - ${rupiah(total)}`)
}

function clearCart() {
    localStorage.removeItem('vibe_cart')
    cart = []
    updateCartBadge()
    closeModal()
    showToast(`<i class="fa-solid fa-trash-can text-red-400"></i> Keranjang dikosongkan`)
}

function openModal(id) {
    const p = allProducts.find(b => b.id === id)
    if (!p) return
    const inCart = cart.some(c => c.id === id)
    const grad = imgGradient(p.id, p.nama)
    const initials = p.nama.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()
    const fallbackId = `mfallback-${p.id}`

    let imgSection
    if (p.gambar_url) {
        imgSection = `<div class="sm:w-56 h-56 rounded-2xl overflow-hidden flex-shrink-0 relative bg-gradient-to-br ${grad}">
            <img src="${p.gambar_url}" alt="${p.nama}" loading="lazy"
                onerror="this.style.display='none';document.getElementById('${fallbackId}').style.display='flex'"
                class="absolute inset-0 w-full h-full object-cover">
            <div id="${fallbackId}" class="absolute inset-0 bg-gradient-to-br ${grad} hidden items-center justify-center">
                <span class="text-7xl font-black text-white/20 select-none">${initials}</span>
            </div>
        </div>`
    } else {
        imgSection = `<div class="sm:w-56 h-56 rounded-2xl bg-gradient-to-br ${grad} flex items-center justify-center flex-shrink-0">
            <span class="text-7xl font-black text-white/20 select-none">${initials}</span>
        </div>`
    }

    openRawModal(`
        <div class="flex flex-col sm:flex-row gap-6">
            ${imgSection}
            <div class="flex-1">
                <div class="flex items-start justify-between gap-2">
                    <div>
                        <h2 class="text-2xl font-bold text-gray-900">${p.nama}</h2>
                        <p class="text-gray-400 mt-0.5">${p.merk}</p>
                    </div>
                    <span class="text-2xl font-bold text-pink-600 whitespace-nowrap">${rupiah(p.harga)}</span>
                </div>
                ${p.deskripsi ? `<p class="text-sm text-gray-500 mt-4 leading-relaxed">${p.deskripsi}</p>` : ''}
                <div class="grid grid-cols-2 gap-3 mt-5">
                    <div class="bg-gray-50 rounded-xl p-3">
                        <p class="text-[10px] text-gray-400 uppercase tracking-wider">Ukuran</p>
                        <p class="font-semibold text-sm text-gray-800 mt-0.5">${p.ukuran}</p>
                    </div>
                    <div class="bg-gray-50 rounded-xl p-3">
                        <p class="text-[10px] text-gray-400 uppercase tracking-wider">Warna</p>
                        <p class="font-semibold text-sm text-gray-800 mt-0.5">${p.warna}</p>
                    </div>
                    <div class="bg-gray-50 rounded-xl p-3">
                        <p class="text-[10px] text-gray-400 uppercase tracking-wider">Kategori</p>
                        <p class="font-semibold text-sm text-gray-800 mt-0.5">${p.kategori}</p>
                    </div>
                    <div class="bg-gray-50 rounded-xl p-3">
                        <p class="text-[10px] text-gray-400 uppercase tracking-wider">Stok</p>
                        <p class="font-semibold text-sm ${p.stok > 3 ? 'text-emerald-600' : 'text-amber-600'} mt-0.5">${p.stok} unit</p>
                    </div>
                </div>
                <div class="flex gap-2 mt-6">
                    <button data-add-cart="${p.id}" class="flex-1 py-3 rounded-xl font-semibold text-sm transition-all ${inCart ? 'bg-gray-100 text-gray-500' : 'bg-gradient-to-r from-pink-500 to-rose-700 text-white hover:shadow-lg'}">
                        ${inCart ? '<i class="fa-solid fa-check mr-2"></i>Di Keranjang' : '<i class="fa-solid fa-plus mr-2"></i>Tambah ke Keranjang'}
                    </button>
                    <button onclick="closeModal();openEditForm(${p.id})" class="px-4 py-3 rounded-xl font-semibold text-sm bg-sky-50 text-sky-500 hover:bg-sky-100 hover:text-sky-600 transition-all" title="Edit">
                        <i class="fa-solid fa-pen-to-square"></i>
                    </button>
                    <button onclick="hapusBaju(${p.id})" class="px-4 py-3 rounded-xl font-semibold text-sm bg-red-50 text-red-500 hover:bg-red-100 hover:text-red-600 transition-all" title="Hapus">
                        <i class="fa-solid fa-trash-can"></i>
                    </button>
                </div>
            </div>
        </div>
    `)

    document.querySelector('[data-add-cart]')?.addEventListener('click', () => {
        addToCart(id)
        closeModal()
    })
}

function openRawModal(html) {
    document.getElementById('modal-content').innerHTML = html
    document.getElementById('modal').classList.remove('hidden')
    document.body.style.overflow = 'hidden'
}

function closeModal() {
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
            <div class="grid grid-cols-3 gap-3">
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
                    <label class="block text-xs font-semibold text-gray-500 mb-1">Warna <span class="text-red-400">*</span></label>
                    <input type="text" name="warna" required placeholder="cth: Merah" class="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-pink-200 focus:border-pink-400 transition-all placeholder:text-gray-300">
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
            <div class="grid grid-cols-3 gap-3">
                <div>
                    <label class="block text-xs font-semibold text-gray-500 mb-1">Ukuran <span class="text-red-400">*</span></label>
                    <select name="ukuran" required class="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-pink-200 focus:border-pink-400 transition-all">
                        ${['S','M','L','XL','XXL'].map(s => `<option value="${s}" ${p.ukuran===s?'selected':''}>${s}</option>`).join('')}
                    </select>
                </div>
                <div>
                    <label class="block text-xs font-semibold text-gray-500 mb-1">Warna <span class="text-red-400">*</span></label>
                    <input type="text" name="warna" required value="${p.warna}" class="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-pink-200 focus:border-pink-400 transition-all">
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

// Init
document.addEventListener('DOMContentLoaded', () => {
    loadCategories()
    setView(currentView)
    updateCartBadge()
    fetchProducts()

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') closeModal()
    })
})
