// Sepet için basit bir array kullanacağız
let cart = [];

// Token yönetimi
function getToken() {
    return localStorage.getItem('access_token');
}

function setTokens(tokens) {
    localStorage.setItem('access_token', tokens.access);
    localStorage.setItem('refresh_token', tokens.refresh);
}

function clearTokens() {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
}

function isLoggedIn() {
    return !!getToken();
}

// Token yenileme fonksiyonu
async function refreshToken() {
    const refreshTokenValue = localStorage.getItem('refresh_token');
    if (!refreshTokenValue) {
        return false;
    }
    
    try {
        const response = await fetch('http://127.0.0.1:8000/api/auth/token/refresh/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                refresh: refreshTokenValue
            })
        });
        
        if (response.ok) {
            const data = await response.json();
            localStorage.setItem('access_token', data.access);
            return true;
        }
    } catch (error) {
        console.error('Token refresh error:', error);
    }
    
    return false;
}

// API çağrıları için wrapper
async function makeAuthenticatedRequest(url, options = {}) {
    let token = getToken();
    
    if (!token) {
        throw new Error('No token available');
    }
    
    // İlk deneme
    let response = await fetch(url, {
        ...options,
        headers: {
            ...options.headers,
            'Authorization': `Bearer ${token}`
        }
    });
    
    // Token geçersizse yenilemeyi dene
    if (response.status === 401) {
        const refreshed = await refreshToken();
        if (refreshed) {
            token = getToken();
            response = await fetch(url, {
                ...options,
                headers: {
                    ...options.headers,
                    'Authorization': `Bearer ${token}`
                }
            });
        } else {
            // Refresh de başarısızsa çıkış yap
            logout();
            throw new Error('Authentication failed');
        }
    }
    
    return response;
}

// Sayfa yüklendiğinde çalışacak fonksiyonlar
document.addEventListener('DOMContentLoaded', function() {
    loadBooks();
    setupCartToggle();
    setupAuthForms();
    checkUserStatus();
});

function checkUserStatus() {
    if (isLoggedIn()) {
        showUserInfo();
        updateFooterLinks();
        checkSellerStatus();
        setupSearchSystem(); // Arama sistemini kur
    } else {
        updateFooterLinks();
        setupSearchSystem(); // Arama sistemini kur
    }
}

// Footer linklerini kullanıcı durumuna göre güncelle
function updateFooterLinks() {
    const footerAccountLink = document.getElementById('footer-account-link');
    if (footerAccountLink) {
        if (isLoggedIn()) {
            footerAccountLink.textContent = 'Profilim';
            footerAccountLink.onclick = () => showUserProfile();
        } else {
            footerAccountLink.textContent = 'Hesabım';
            footerAccountLink.onclick = () => showLogin();
        }
    }
}

// Kullanıcı hesap tıklaması
function handleAccountClick() {
    if (isLoggedIn()) {
        showUserProfile();
    } else {
        showLogin();
    }
}

// Kullanıcı profil sayfası göster
function showUserProfile() {
    if (!isLoggedIn()) {
        showLogin();
        return;
    }
    
    hideAllSections();
    
    // Profil sayfası yoksa oluştur
    let profileSection = document.getElementById('profile-section');
    if (!profileSection) {
        createProfileSection();
        profileSection = document.getElementById('profile-section');
    }
    
    if (profileSection) {
        profileSection.style.display = 'block';
        displayUserProfile();
    }
}

// Profil bölümünü oluştur
function createProfileSection() {
    const main = document.querySelector('main');
    const profileHTML = `
        <div id="profile-section" style="display: none;">
            <div class="profile-container">
                <h2>Profilim</h2>
                <div class="profile-info">
                    <div class="user-details">
                        <h3>Hesap Bilgileri</h3>
                        <div id="user-details-content"></div>
                    </div>
                    <div class="profile-actions">
                        <button onclick="showOrders()" class="profile-btn orders-btn">
                            📦 Siparişlerim
                        </button>
                        <button onclick="showCart()" class="profile-btn cart-btn">
                            🛒 Sepetim
                        </button>
                        <button onclick="showBooks()" class="profile-btn browse-btn">
                            📚 Ürünlere Dön
                        </button>
                        <button onclick="logout()" class="profile-btn logout-btn">
                            🚪 Çıkış Yap
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;
    main.insertAdjacentHTML('beforeend', profileHTML);
}

// Kullanıcı profil bilgilerini göster
function displayUserProfile() {
    const userInfo = JSON.parse(localStorage.getItem('user_info'));
    const userDetailsContent = document.getElementById('user-details-content');
    
    if (userInfo && userDetailsContent) {
        userDetailsContent.innerHTML = `
            <div class="detail-item">
                <label>Kullanıcı Adı:</label>
                <span>${userInfo.username}</span>
            </div>
            <div class="detail-item">
                <label>Email:</label>
                <span>${userInfo.email || 'Belirtilmemiş'}</span>
            </div>
            <div class="detail-item">
                <label>Ad:</label>
                <span>${userInfo.first_name || 'Belirtilmemiş'}</span>
            </div>
            <div class="detail-item">
                <label>Soyad:</label>
                <span>${userInfo.last_name || 'Belirtilmemiş'}</span>
            </div>
            <div class="detail-item">
                <label>Hesap Durumu:</label>
                <span class="status-active">✅ Aktif</span>
            </div>
        `;
    }
}

// Kitapları API'den getir
async function loadBooks() {
    try {
        const response = await fetch('http://127.0.0.1:8000/api/books/');
        const books = await response.json();
        displayBooks(books);
    } catch (error) {
        console.error('Kitaplar yüklenemedi:', error);
        document.getElementById('books-container').innerHTML = 
            '<p>Kitaplar yüklenirken hata oluştu.</p>';
    }
}

// Kitapları sayfada göster
function displayBooks(books) {
    const container = document.getElementById('books-container');
    
    if (books.length === 0) {
        container.innerHTML = '<p>Henüz kitap eklenmemiş.</p>';
        return;
    }
    
    container.innerHTML = ''; // Önce temizle
    
    books.forEach(book => {
        const bookCard = document.createElement('div');
        bookCard.className = 'book-card';
        
        // Stok durumu kontrolü - Müşteri dostu mesajlar
        const isOutOfStock = book.stock <= 0;
        const isLowStock = book.stock > 0 && book.stock <= 3;
        const isVeryLowStock = book.stock === 1;
        
        let stockWarning = '';
        let buttonContent = '';
        
        if (isOutOfStock) {
            stockWarning = '<div class="stock-warning out-of-stock">❌ Stokta Yok</div>';
            buttonContent = '<button class="add-to-cart-btn disabled" disabled>Stokta Yok</button>';
        } else if (isVeryLowStock) {
            stockWarning = '<div class="stock-warning very-low-stock">🔥 Son 1 adet!</div>';
            buttonContent = `<button class="add-to-cart-btn urgent" onclick="addToCart(${book.id})">Hemen Al!</button>`;
        } else if (isLowStock) {
            stockWarning = '<div class="stock-warning low-stock">⚡ Tükenmek Üzere!</div>';
            buttonContent = `<button class="add-to-cart-btn" onclick="addToCart(${book.id})">Sepete Ekle</button>`;
        } else {
            stockWarning = '<div class="stock-info">✅ Stokta Mevcut</div>';
            buttonContent = `<button class="add-to-cart-btn" onclick="addToCart(${book.id})">Sepete Ekle</button>`;
        }
        
        const sellerInfo = book.seller_name ? `<div class="seller-info">Satıcı: ${book.seller_name}</div>` : '';

        bookCard.innerHTML = `
            <div class="book-title">${book.title}</div>
            <div class="book-author">Yazar: ${book.author}</div>
            <div class="book-price">${book.price} TL</div>
            <p>${book.description}</p>
            ${sellerInfo}
            ${stockWarning}
            ${buttonContent}
        `;
        
        if (isOutOfStock) {
            bookCard.classList.add('out-of-stock-card');
        } else if (isVeryLowStock) {
            bookCard.classList.add('urgent-stock-card');
        }
        
        container.appendChild(bookCard);
    });
}

// Sepete kitap ekle
function addToCart(bookId) {
    fetch(`http://127.0.0.1:8000/api/books/${bookId}/`)
        .then(response => response.json())
        .then(book => {
            // Stok kontrolü
            if (book.stock <= 0) {
                alert(`❌ Üzgünüz! ${book.title} şu anda stokta yok.`);
                return;
            }
            
            // Sepette zaten var mı kontrol et
            const existingItem = cart.find(item => item.id === bookId);
            
            if (existingItem) {
                // Sepetteki miktar + 1, stoktan fazla mı?
                if (existingItem.quantity >= book.stock) {
                    alert(`⚠️ ${book.title} için maksimum ${book.stock} adet sipariş verebilirsiniz!\n\nŞu anda sepetinizde ${existingItem.quantity} adet var.`);
                    return;
                }
                existingItem.quantity++;
                
                // Müşteri dostu stok mesajları
                if (existingItem.quantity === book.stock) {
                    alert(`✅ ${book.title} sepete eklendi!\n🔥 Bu ürünün son adedini de aldınız!`);
                } else if (book.stock - existingItem.quantity === 1) {
                    alert(`✅ ${book.title} sepete eklendi!\n⚡ Bu üründen sadece 1 adet daha alabilirsiniz!`);
                } else if (book.stock - existingItem.quantity <= 2) {
                    alert(`✅ ${book.title} sepete eklendi!\n⚡ Bu ürün tükenmek üzere!`);
                } else {
                    alert(`✅ ${book.title} sepete eklendi!\nSepetinizde: ${existingItem.quantity} adet`);
                }
            } else {
                cart.push({
                    id: book.id,
                    title: book.title,
                    author: book.author,
                    price: book.price,
                    quantity: 1,
                    stock: book.stock // Stok bilgisini de saklayalım
                });
                
                // Müşteri dostu stok mesajları
                if (book.stock === 1) {
                    alert(`✅ ${book.title} sepete eklendi!\n🔥 Bu ürünün son adedini aldınız!`);
                } else if (book.stock === 2) {
                    alert(`✅ ${book.title} sepete eklendi!\n⚡ Bu üründen sadece 1 adet daha kaldı!`);
                } else if (book.stock <= 3) {
                    alert(`✅ ${book.title} sepete eklendi!\n⚡ Bu ürün tükenmek üzere!`);
                } else {
                    alert(`✅ ${book.title} sepete eklendi!`);
                }
            }
            
            updateCartDisplay();
            loadBooks(); // Kitap listesini yenile (stok durumları güncellensin)
        })
        .catch(error => {
            console.error('Sepete eklenemedi:', error);
            alert('❌ Bir hata oluştu! Lütfen tekrar deneyin.');
        });
}

// Sepet görünümünü güncelle
function updateCartDisplay() {
    const cartCount = document.getElementById('cart-count');
    if (cartCount) {
        const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
        cartCount.textContent = `Sepet (${totalItems})`;
    }
    
    // Sepet içeriğini güncelle
    displayCartItems();
}

// Sepet öğelerini göster
function displayCartItems() {
    const cartItems = document.getElementById('cart-items');
    const cartTotal = document.getElementById('cart-total');
    
    if (cart.length === 0) {
        cartItems.innerHTML = '<p>Sepetiniz boş</p>';
        cartTotal.textContent = 'Toplam: 0 TL';
        return;
    }
    
    cartItems.innerHTML = '';
    let total = 0;
    
    cart.forEach((item, index) => {
        const cartItem = document.createElement('div');
        cartItem.className = 'cart-item';
        cartItem.innerHTML = `
            <div class="cart-item-info">
                <strong>${item.title}</strong><br>
                <small>${item.author}</small>
                <div class="cart-item-price">${item.price} TL</div>
            </div>
            <div class="cart-item-controls">
                <div class="quantity-controls">
                    <button onclick="decreaseQuantity(${index})" class="quantity-btn minus-btn" 
                            ${item.quantity <= 1 ? 'disabled' : ''}>-</button>
                    <span class="quantity-display">${item.quantity}</span>
                    <button onclick="increaseQuantity(${index})" class="quantity-btn plus-btn" 
                            ${item.quantity >= (item.stock || 99) ? 'disabled' : ''}>+</button>
                </div>
                <div class="item-total">${(item.quantity * item.price).toFixed(2)} TL</div>
                <button onclick="removeFromCart(${index})" class="remove-btn">🗑️</button>
            </div>
        `;
        cartItems.appendChild(cartItem);
        total += item.price * item.quantity;
    });
    
    cartTotal.textContent = `Toplam: ${total.toFixed(2)} TL`;
}

// Sepette miktar arttırma
function increaseQuantity(index) {
    const item = cart[index];
    if (!item) return;
    
    // Stok kontrolü
    if (item.quantity >= (item.stock || 99)) {
        alert(`${item.title} için maksimum ${item.stock} adet sipariş verebilirsiniz!`);
        return;
    }
    
    item.quantity++;
    updateCartDisplay();
}

// Sepette miktar azaltma
function decreaseQuantity(index) {
    const item = cart[index];
    if (!item) return;
    
    if (item.quantity > 1) {
        item.quantity--;
        updateCartDisplay();
    } else {
        // Miktar 1'se, kaldırma onayı iste
        if (confirm(`${item.title} ürününü sepetten çıkarmak istediğinizden emin misiniz?`)) {
            removeFromCart(index);
        }
    }
}

// Sepetten kaldır
function removeFromCart(index) {
    cart.splice(index, 1);
    updateCartDisplay();
}

// Sepet göster/gizle
function setupCartToggle() {
    const cartCount = document.getElementById('cart-count');
    
    if (cartCount) {
        cartCount.addEventListener('click', function() {
            showCart();
        });
    }
}

// Auth formlarını ayarla
function setupAuthForms() {
    const loginForm = document.getElementById('login-form');
    const registerForm = document.getElementById('register-form');
    
    if (loginForm) {
        loginForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const username = document.getElementById('login-username').value;
            const password = document.getElementById('login-password').value;
            
            try {
                const response = await fetch('http://127.0.0.1:8000/api/auth/login/', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ username, password })
                });
                
                const data = await response.json();
                
                if (response.ok) {
                    setTokens(data.tokens);
                    localStorage.setItem('user_info', JSON.stringify(data.user));
                    showUserInfo();
                    showBooks();
                    alert('Giriş başarılı!');
                    // Formu temizle
                    loginForm.reset();
                } else {
                    alert('Hata: ' + (data.non_field_errors ? data.non_field_errors[0] : 'Giriş başarısız'));
                }
            } catch (error) {
                console.error('Login error:', error);
                alert('Bağlantı hatası!');
            }
        });
    }
    
    if (registerForm) {
        registerForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const formData = {
                username: document.getElementById('register-username').value,
                email: document.getElementById('register-email').value,
                first_name: document.getElementById('register-firstname').value,
                last_name: document.getElementById('register-lastname').value,
                password: document.getElementById('register-password').value,
                password_confirm: document.getElementById('register-password-confirm').value,
            };
            
            // Form validation
            if (formData.password !== formData.password_confirm) {
                alert('Şifreler eşleşmiyor!');
                return;
            }
            
            if (formData.password.length < 6) {
                alert('Şifre en az 6 karakter olmalıdır!');
                return;
            }
            
            // Loading durumu
            const submitBtn = e.target.querySelector('button[type="submit"]');
            const originalText = submitBtn.textContent;
            submitBtn.textContent = 'Kaydediliyor...';
            submitBtn.disabled = true;
            
            try {
                const response = await fetch('http://127.0.0.1:8000/api/auth/register/', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(formData)
                });
                
                const data = await response.json();
                
                if (response.ok) {
                    // Kayıt başarılı - giriş sayfasına yönlendir
                    alert('🎉 Kayıt başarılı!\n\nHesabınız oluşturuldu. Şimdi giriş yapabilirsiniz.');
                    
                    // Formu temizle
                    registerForm.reset();
                    
                    // Giriş formuna geç
                    showLoginForm();
                    
                    // Kullanıcı adını giriş formuna otomatik doldur
                    const loginUsernameField = document.getElementById('login-username');
                    if (loginUsernameField) {
                        loginUsernameField.value = formData.username;
                        loginUsernameField.focus();
                    }
                    
                } else {
                    // Hata mesajlarını daha iyi göster
                    let errorMessage = 'Kayıt sırasında hata oluştu:\n';
                    for (let field in data) {
                        if (Array.isArray(data[field])) {
                            errorMessage += `${field}: ${data[field].join(', ')}\n`;
                        } else {
                            errorMessage += `${field}: ${data[field]}\n`;
                        }
                    }
                    alert(errorMessage);
                }
            } catch (error) {
                console.error('Register error:', error);
                alert('Bağlantı hatası! Lütfen tekrar deneyin.');
            } finally {
                // Loading'i kaldır
                submitBtn.textContent = originalText;
                submitBtn.disabled = false;
            }
        });
    }
}

// UI fonksiyonları
function showLogin() {
    hideAllSections();
    const authSection = document.getElementById('auth-section');
    if (authSection) {
        authSection.style.display = 'block';
        showLoginForm(); // Default olarak login formunu göster
        
        // Formları temizle
        const loginForm = document.getElementById('login-form');
        const registerForm = document.getElementById('register-form');
        if (loginForm) loginForm.reset();
        if (registerForm) registerForm.reset();
    }
}

function showLoginForm() {
    const loginForm = document.getElementById('login-form');
    const registerForm = document.getElementById('register-form');
    const tabButtons = document.querySelectorAll('.tab-btn');
    
    if (loginForm) loginForm.style.display = 'block';
    if (registerForm) registerForm.style.display = 'none';
    
    if (tabButtons.length >= 2) {
        tabButtons[0].classList.add('active');
        tabButtons[1].classList.remove('active');
    }
}

function showRegisterForm() {
    const loginForm = document.getElementById('login-form');
    const registerForm = document.getElementById('register-form');
    const tabButtons = document.querySelectorAll('.tab-btn');
    
    if (loginForm) loginForm.style.display = 'none';
    if (registerForm) registerForm.style.display = 'block';
    
    if (tabButtons.length >= 2) {
        tabButtons[0].classList.remove('active');
        tabButtons[1].classList.add('active');
    }
}

function showUserInfo() {
    const userInfo = JSON.parse(localStorage.getItem('user_info'));
    const usernameElement = document.getElementById('username');
    const userInfoElement = document.getElementById('user-info');
    const loginLink = document.getElementById('login-link');
    
    if (userInfo && usernameElement && userInfoElement && loginLink) {
        usernameElement.textContent = `Hoş geldin, ${userInfo.username}!`;
        userInfoElement.style.display = 'inline';
        loginLink.style.display = 'none';
        updateFooterLinks(); // Footer'ı da güncelle
    }
}

function logout() {
    clearTokens();
    localStorage.removeItem('user_info');
    
    const userInfoElement = document.getElementById('user-info');
    const loginLink = document.getElementById('login-link');
    
    if (userInfoElement) userInfoElement.style.display = 'none';
    if (loginLink) loginLink.style.display = 'inline';
    
    cart = []; // Sepeti temizle
    updateCartDisplay();
    updateFooterLinks(); // Footer'ı güncelle
    showBooks();
    alert('Çıkış yapıldı!');
}

function hideAllSections() {
    const sections = ['books-container', 'cart-section', 'auth-section', 'checkout-section', 'orders-section', 'profile-section', 'become-seller-section', 'seller-dashboard-section', 'add-product-section', 'search-results-section'];
    sections.forEach(sectionId => {
        const element = document.getElementById(sectionId);
        if (element) {
            element.style.display = 'none';
        }
    });
    
    clearSectionContents();
}

function clearSectionContents() {
    // Sipariş listesini temizle
    const ordersList = document.getElementById('orders-list');
    if (ordersList) {
        ordersList.innerHTML = '';
    }
    
    // Checkout formunu temizle  
    const checkoutForm = document.getElementById('checkout-form');
    if (checkoutForm) {
        checkoutForm.reset();
    }
    
    // Checkout özetini temizle
    const checkoutItems = document.getElementById('checkout-items');
    const checkoutTotal = document.getElementById('checkout-total');
    if (checkoutItems) checkoutItems.innerHTML = '';
    if (checkoutTotal) checkoutTotal.innerHTML = '';
}

function showBooks() {
    hideAllSections();
    const booksContainer = document.getElementById('books-container');
    if (booksContainer) {
        booksContainer.style.display = 'grid';
        // Kitapları yeniden yükle (fresh data)
        loadBooks();
    }
}

function showCart() {
    hideAllSections();
    const cartSection = document.getElementById('cart-section');
    if (cartSection) {
        cartSection.style.display = 'block';
        displayCartItems(); // Her seferinde fresh cart göster
    }
}

// Sipariş fonksiyonları
function showOrders() {
    if (!isLoggedIn()) {
        alert('Siparişleri görmek için giriş yapmalısınız!');
        showLogin();
        return;
    }
    
    hideAllSections();
    const ordersSection = document.getElementById('orders-section');
    if (ordersSection) {
        ordersSection.style.display = 'block';
        // Her seferinde fresh data yükle
        const ordersList = document.getElementById('orders-list');
        if (ordersList) {
            ordersList.innerHTML = '<p class="loading">Siparişler yükleniyor...</p>';
        }
        loadUserOrders();
    }
}

function showCheckout() {
    if (!isLoggedIn()) {
        alert('Sipariş vermek için giriş yapmalısınız!');
        showLogin();
        return;
    }
    
    if (cart.length === 0) {
        alert('Sepetiniz boş!');
        return;
    }
    
    hideAllSections();
    const checkoutSection = document.getElementById('checkout-section');
    if (checkoutSection) {
        checkoutSection.style.display = 'block';
        // Fresh checkout data
        displayCheckoutSummary();
        setupCheckoutForm();
        
        // Form alanlarını temizle
        const form = document.getElementById('checkout-form');
        if (form) {
            form.reset();
        }
    }
}

function displayCheckoutSummary() {
    const checkoutItems = document.getElementById('checkout-items');
    const checkoutTotal = document.getElementById('checkout-total');
    
    if (!checkoutItems || !checkoutTotal) return;
    
    checkoutItems.innerHTML = '';
    let total = 0;
    
    cart.forEach(item => {
        const itemDiv = document.createElement('div');
        itemDiv.className = 'checkout-item';
        itemDiv.innerHTML = `
            <span>${item.title}</span>
            <span>${item.quantity} × ${item.price} TL = ${item.quantity * item.price} TL</span>
        `;
        checkoutItems.appendChild(itemDiv);
        total += item.quantity * item.price;
    });
    
    checkoutTotal.innerHTML = `<strong>Toplam: ${total} TL</strong>`;
}

function setupCheckoutForm() {
    const checkoutForm = document.getElementById('checkout-form');
    if (!checkoutForm) return;
    
    // Önceki event listener'ı kaldır
    checkoutForm.removeEventListener('submit', handleCheckoutSubmit);
    checkoutForm.addEventListener('submit', handleCheckoutSubmit);
}

async function handleCheckoutSubmit(e) {
    e.preventDefault();
    
    const shippingAddress = document.getElementById('shipping-address').value.trim();
    const phone = document.getElementById('phone').value.trim();
    
    // Validation
    if (!shippingAddress || shippingAddress.length < 10) {
        alert('Lütfen geçerli bir teslimat adresi giriniz! (En az 10 karakter)');
        return;
    }
    
    if (!phone || phone.length < 10) {
        alert('Lütfen geçerli bir telefon numarası giriniz!');
        return;
    }
    
    // Telefon numarası formatı kontrolü
    const phonePattern = /^(\+90|0)?[5][0-9]{2}[0-9]{3}[0-9]{4}$/;
    const cleanedPhone = phone.replace(/[\s\-\(\)]/g, '');
    
    if (!phonePattern.test(cleanedPhone)) {
        alert('Lütfen geçerli bir Türkiye telefon numarası giriniz!\nÖrnek: 0555 123 45 67');
        return;
    }
    
    if (cart.length === 0) {
        alert('Sepetiniz boş!');
        return;
    }
    
    // Loading göster
    const submitBtn = e.target.querySelector('button[type="submit"]');
    const originalText = submitBtn.textContent;
    submitBtn.textContent = 'İşleniyor...';
    submitBtn.disabled = true;
    
    try {
        const cartItems = cart.map(item => ({
            book_id: item.id.toString(),
            quantity: item.quantity.toString()
        }));
        
        const response = await fetch('http://127.0.0.1:8000/api/orders/create/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${getToken()}`
            },
            body: JSON.stringify({
                shipping_address: shippingAddress,
                phone: cleanedPhone,
                cart_items: cartItems
            })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            alert('Sipariş başarıyla oluşturuldu! Sipariş numaranız: #' + data.order.id);
            cart = []; // Sepeti temizle
            updateCartDisplay();
            
            // Formu temizle
            document.getElementById('checkout-form').reset();
            
            // 2 saniye sonra siparişlere yönlendir
            setTimeout(() => {
                showOrders();
            }, 2000);
        } else {
            alert('Hata: ' + (data.error || 'Sipariş oluşturulamadı'));
        }
    } catch (error) {
        console.error('Order creation error:', error);
        alert('Bağlantı hatası! Lütfen tekrar deneyin.');
    } finally {
        // Loading'i kaldır
        submitBtn.textContent = originalText;
        submitBtn.disabled = false;
    }
}

async function loadUserOrders() {
    console.log('loadUserOrders çağrıldı');
    
    if (!isLoggedIn()) {
        console.log('Kullanıcı giriş yapmamış');
        document.getElementById('orders-list').innerHTML = '<p>Giriş yapmanız gerekiyor.</p>';
        return;
    }
    
    try {
        console.log('API çağrısı yapılıyor...');
        console.log('Token:', getToken());
        
        const response = await fetch('http://127.0.0.1:8000/api/orders/', {
            headers: {
                'Authorization': `Bearer ${getToken()}`,
                'Content-Type': 'application/json'
            }
        });
        
        console.log('Response status:', response.status);
        
        if (!response.ok) {
            if (response.status === 401) {
                console.log('Token geçersiz, çıkış yapılıyor');
                alert('Oturum süreniz dolmuş. Lütfen tekrar giriş yapın.');
                logout();
                return;
            }
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const orders = await response.json();
        console.log('Orders alındı:', orders);
        console.log('Orders sayısı:', orders.length);
        
        displayOrders(orders);
        return orders;
        
    } catch (error) {
        console.error('Orders loading error:', error);
        const ordersListElement = document.getElementById('orders-list');
        if (ordersListElement) {
            ordersListElement.innerHTML = `
                <p class="error">Siparişler yüklenemedi.</p>
                <p>Hata: ${error.message}</p>
                <button onclick="loadUserOrders()" class="retry-btn">Tekrar Dene</button>
            `;
        }
    }
}

function displayOrders(orders) {
    console.log('displayOrders çağrıldı, orders:', orders);
    console.log('Orders array uzunluğu:', orders.length);
    
    const ordersList = document.getElementById('orders-list');
    if (!ordersList) {
        console.error('orders-list elementi bulunamadı!');
        return;
    }
    
    if (orders.length === 0) {
        ordersList.innerHTML = '<p class="no-orders">Henüz sipariş vermediniz.</p>';
        return;
    }
    
    ordersList.innerHTML = '';
    
    orders.forEach((order, index) => {
        console.log(`Sipariş ${index + 1}:`, order);
        console.log(`Sipariş ID: ${order.id}, Durum: ${order.status}`);
        
        const orderDiv = document.createElement('div');
        orderDiv.className = 'order-card';
        
        const statusText = getStatusText(order.status);
        const orderDate = new Date(order.created_at).toLocaleDateString('tr-TR');
        
        // Debug için console'a yazdır
        console.log('Sipariş:', order.id, 'Durum:', order.status, 'İptal edilebilir mi:', order.status === 'pending');
        
        // İptal butonunu göster/gizle
        const canCancel = order.status === 'pending';
        
        // HTML içeriğini oluştur
        const orderHTML = `
            <div class="order-header">
                <h3>Sipariş #${order.id}</h3>
                <span class="order-status status-${order.status}">${statusText}</span>
            </div>
            <div class="order-info">
                <p><strong>Tarih:</strong> ${orderDate}</p>
                <p><strong>Toplam:</strong> ${order.total_price} TL</p>
                <p><strong>Durum:</strong> ${statusText}</p>
            </div>
            <div class="order-items">
                <h4>Sipariş İçeriği:</h4>
                ${order.items && order.items.length > 0 ? order.items.map(item => `
                    <div class="order-item">
                        <span>${item.book_title || 'Bilinmeyen Kitap'} (${item.book_author || 'Bilinmeyen Yazar'})</span>
                        <span>${item.quantity} × ${item.price} TL = ${item.total_price || (item.quantity * item.price)} TL</span>
                    </div>
                `).join('') : '<p>Sipariş detayları yüklenemedi</p>'}
            </div>
            <div class="order-address">
                <p><strong>Teslimat Adresi:</strong> ${order.shipping_address || 'Belirtilmemiş'}</p>
                <p><strong>Telefon:</strong> ${order.phone || 'Belirtilmemiş'}</p>
            </div>
            ${canCancel ? `
                <div class="order-actions">
                    <button onclick="cancelOrder(${order.id})" class="cancel-btn">
                        🗑️ Siparişi İptal Et
                    </button>
                    <small class="cancel-note">* Sadece beklemedeki siparişler iptal edilebilir</small>
                </div>
            ` : `
                <div class="order-actions">
                    <p class="no-cancel-info">
                        ${order.status === 'cancelled' ? '❌ Bu sipariş zaten iptal edilmiş.' : 
                          order.status === 'delivered' ? '✅ Bu sipariş teslim edilmiş.' :
                          order.status === 'shipped' ? '🚚 Bu sipariş kargoya verilmiş, iptal edilemez.' :
                          '⏳ Bu sipariş artık iptal edilemez.'}
                    </p>
                </div>
            `}
        `;
        
        console.log(`Sipariş ${order.id} HTML oluşturuluyor...`);
        orderDiv.innerHTML = orderHTML;
        
        console.log(`Sipariş ${order.id} DOM'a ekleniyor...`);
        ordersList.appendChild(orderDiv);
        
        console.log(`Sipariş ${order.id} başarıyla eklendi!`);
    });
    
    console.log('Tüm siparişler işlendi!');
}

function getStatusText(status) {
    const statusMap = {
        'pending': 'Beklemede',
        'confirmed': 'Onaylandı',
        'shipped': 'Kargoya Verildi',
        'delivered': 'Teslim Edildi',
        'cancelled': 'İptal Edildi'
    };
    return statusMap[status] || status;
}

// Sipariş iptal fonksiyonu
async function cancelOrder(orderId) {
    console.log('İptal işlemi başlıyor, Sipariş ID:', orderId);
    
    if (!isLoggedIn()) {
        alert('Giriş yapmanız gerekiyor!');
        showLogin();
        return;
    }
    
    if (!confirm('Bu siparişi iptal etmek istediğinizden emin misiniz?\nİptal edilen siparişler geri alınamaz!')) {
        return;
    }
    
    try {
        console.log('API çağrısı yapılıyor...');
        
        const response = await fetch(`http://127.0.0.1:8000/api/orders/${orderId}/cancel/`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${getToken()}`
            }
        });
        
        console.log('Response status:', response.status);
        const data = await response.json();
        console.log('Response data:', data);
        
        if (response.ok) {
            alert('✅ Sipariş başarıyla iptal edildi!\n💰 Ödeme iadesi 3-5 iş günü içinde hesabınıza yansıyacaktır.');
            
            // Siparişleri yeniden yükle
            const ordersList = document.getElementById('orders-list');
            if (ordersList) {
                ordersList.innerHTML = '<p class="loading">Siparişler güncelleniyor...</p>';
            }
            loadUserOrders();
        } else {
            if (response.status === 401) {
                alert('🔒 Oturum süreniz dolmuş. Lütfen tekrar giriş yapın.');
                logout();
            } else {
                alert('❌ Hata: ' + (data.error || data.detail || 'Sipariş iptal edilemedi'));
            }
        }
    } catch (error) {
        console.error('Cancel order error:', error);
        alert('🌐 Bağlantı hatası! Lütfen internet bağlantınızı kontrol edin.');
    }
}

// Satıcı durumunu kontrol et
function checkSellerStatus() {
    if (!isLoggedIn()) return;
    
    fetch('http://127.0.0.1:8000/api/seller/profile/', {
        headers: {
            'Authorization': `Bearer ${getToken()}`
        }
    })
    .then(response => {
        if (response.ok) {
            return response.json();
        }
        throw new Error('Satıcı değil');
    })
    .then(seller => {
        // Satıcı ise menüyü güncelle
        const sellerNav = document.getElementById('seller-nav');
        const becomeSellerNav = document.getElementById('become-seller-nav');
        if (sellerNav) sellerNav.style.display = 'inline';
        if (becomeSellerNav) becomeSellerNav.style.display = 'none';
        
        // Satıcı bilgilerini sakla
        localStorage.setItem('seller_info', JSON.stringify(seller));
    })
    .catch(() => {
        // Satıcı değil, "Satıcı Ol" butonunu göster
        const sellerNav = document.getElementById('seller-nav');
        const becomeSellerNav = document.getElementById('become-seller-nav');
        if (sellerNav) sellerNav.style.display = 'none';
        if (becomeSellerNav) becomeSellerNav.style.display = 'inline';
    });
}

// Satıcı ol sayfasını göster
function showBecomeSeller() {
    hideAllSections();
    const becomeSellerSection = document.getElementById('become-seller-section');
    if (becomeSellerSection) {
        becomeSellerSection.style.display = 'block';
        setupBecomeSellerForm();
    }
}

// Satıcı panelini göster
function showSellerDashboard() {
    if (!isLoggedIn()) {
        alert('Giriş yapmanız gerekiyor!');
        showLogin();
        return;
    }
    
    hideAllSections();
    const sellerDashboard = document.getElementById('seller-dashboard-section');
    if (sellerDashboard) {
        sellerDashboard.style.display = 'block';
        loadSellerDashboard();
    }
}

// Ürün ekleme sayfasını göster
function showAddProduct() {
    hideAllSections();
    const addProductSection = document.getElementById('add-product-section');
    if (addProductSection) {
        addProductSection.style.display = 'block';
        setupAddProductForm();
    }
}

// Satıcı ol formunu ayarla
function setupBecomeSellerForm() {
    const form = document.getElementById('become-seller-form');
    if (!form) return;
    
    form.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const formData = {
            store_name: document.getElementById('store-name').value.trim(),
            description: document.getElementById('store-description').value.trim(),
            phone: document.getElementById('seller-phone').value.trim(),
            address: document.getElementById('seller-address').value.trim()
        };
        
        // Validation
        if (!formData.store_name || !formData.phone || !formData.address) {
            alert('Lütfen zorunlu alanları doldurun!');
            return;
        }
        
        try {
            const response = await fetch('http://127.0.0.1:8000/api/seller/become/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${getToken()}`
                },
                body: JSON.stringify(formData)
            });
            
            const data = await response.json();
            
            if (response.ok) {
                alert('🎉 Tebrikler! Satıcı hesabınız oluşturuldu!\n\nArtık ürün satabilirsiniz.');
                localStorage.setItem('seller_info', JSON.stringify(data.seller));
                checkSellerStatus(); // Menüyü güncelle
                showSellerDashboard();
            } else {
                alert('Hata: ' + (data.error || 'Satıcı hesabı oluşturulamadı'));
            }
        } catch (error) {
            alert('Bağlantı hatası!');
        }
    });
}

// Satıcı dashboard'unu yükle
async function loadSellerDashboard() {
    try {
        const response = await fetch('http://127.0.0.1:8000/api/seller/profile/', {
            headers: {
                'Authorization': `Bearer ${getToken()}`
            }
        });
        
        if (response.ok) {
            const seller = await response.json();
            document.getElementById('store-name-display').textContent = seller.store_name;
            document.getElementById('total-products').textContent = seller.total_books;
        }
    } catch (error) {
        console.error('Satıcı bilgileri yüklenemedi:', error);
    }
}

// Ürünlerimi göster
function showMyProducts() {
    const productsList = document.getElementById('my-products-list');
    if (productsList.style.display === 'none') {
        productsList.style.display = 'block';
        loadMyProducts();
    } else {
        productsList.style.display = 'none';
    }
}

// Satıcının ürünlerini yükle
async function loadMyProducts() {
    try {
        const response = await fetch('http://127.0.0.1:8000/api/seller/books/', {
            headers: {
                'Authorization': `Bearer ${getToken()}`
            }
        });
        
        const books = await response.json();
        displayMyProducts(books);
    } catch (error) {
        console.error('Ürünler yüklenemedi:', error);
    }
}

// Satıcının ürünlerini göster
function displayMyProducts(books) {
    const container = document.getElementById('products-container');
    
    if (books.length === 0) {
        container.innerHTML = '<p style="text-align: center; color: #7f8c8d;">Henüz ürün eklememişsiniz.</p>';
        return;
    }
    
    container.innerHTML = '';
    
    books.forEach(book => {
        const productCard = document.createElement('div');
        productCard.className = 'seller-product-card';
        productCard.innerHTML = `
            <div class="product-info">
                <div class="product-title">${book.title}</div>
                <div class="product-details">
                    Yazar: ${book.author} | Fiyat: ${book.price} TL | Stok: ${book.stock}
                </div>
            </div>
            <div class="product-actions">
                <button class="edit-btn" onclick="editProduct(${book.id})">Düzenle</button>
                <button class="delete-btn" onclick="deleteProduct(${book.id})">Sil</button>
            </div>
        `;
        container.appendChild(productCard);
    });
}

// Ürün ekleme formunu ayarla
function setupAddProductForm() {
    const form = document.getElementById('add-product-form');
    if (!form) return;
    
    form.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const formData = {
            title: document.getElementById('book-title').value.trim(),
            author: document.getElementById('book-author').value.trim(),
            price: parseFloat(document.getElementById('book-price').value),
            stock: parseInt(document.getElementById('book-stock').value),
            description: document.getElementById('book-description').value.trim()
        };
        
        // Validation
        if (!formData.title || !formData.author || !formData.description) {
            alert('Lütfen tüm alanları doldurun!');
            return;
        }
        
        if (formData.price <= 0) {
            alert('Fiyat 0\'dan büyük olmalıdır!');
            return;
        }
        
        if (formData.stock < 0) {
            alert('Stok negatif olamaz!');
            return;
        }
        
        try {
            const response = await fetch('http://127.0.0.1:8000/api/seller/books/add/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${getToken()}`
                },
                body: JSON.stringify(formData)
            });
            
            const data = await response.json();
            
            if (response.ok) {
                alert('✅ Ürün başarıyla eklendi!');
                form.reset();
                showSellerDashboard();
            } else {
                alert('Hata: ' + (data.error || 'Ürün eklenemedi'));
            }
        } catch (error) {
            alert('Bağlantı hatası!');
        }
    });
}

// Ürün sil
async function deleteProduct(bookId) {
    if (!confirm('Bu ürünü silmek istediğinizden emin misiniz?')) {
        return;
    }
    
    try {
        const response = await fetch(`http://127.0.0.1:8000/api/seller/books/${bookId}/delete/`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${getToken()}`
            }
        });
        
        const data = await response.json();
        
        if (response.ok) {
            alert('✅ Ürün silindi!');
            loadMyProducts(); // Listeyi yenile
            loadSellerDashboard(); // İstatistikleri güncelle
        } else {
            alert('Hata: ' + (data.error || 'Ürün silinemedi'));
        }
    } catch (error) {
        alert('Bağlantı hatası!');
    }
}

function editProduct(bookId) {
    alert('Ürün düzenleme özelliği yakında eklenecek!');
}

// Arama değişkenleri
let currentSearchQuery = '';
let currentFilters = {};
let currentPage = 1;
let searchTimeout = null;

// Arama sistemi kurulumu
function setupSearchSystem() {
    const searchInput = document.getElementById('search-input');
    const searchBtn = document.getElementById('search-btn');
    
    if (searchInput) {
        // Anlık arama önerileri
        searchInput.addEventListener('input', function() {
            clearTimeout(searchTimeout);
            const query = this.value.trim();
            
            if (query.length >= 2) {
                searchTimeout = setTimeout(() => {
                    loadSearchSuggestions(query);
                }, 300);
            } else {
                hideSuggestions();
            }
        });
        
        // Enter tuşu ile arama
        searchInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                e.preventDefault();
                performSearch();
            }
        });
        
        // Focus çıkınca önerileri gizle (biraz gecikme ile)
        searchInput.addEventListener('blur', function() {
            setTimeout(hideSuggestions, 200);
        });
    }
    
    // Filtre değişikliklerini dinle
    const filterInputs = ['min-price', 'max-price', 'in-stock-only', 'sort-by'];
    filterInputs.forEach(id => {
        const element = document.getElementById(id);
        if (element) {
            element.addEventListener('change', applyFilters);
        }
    });
}

// Arama önerilerini yükle
async function loadSearchSuggestions(query) {
    try {
        const response = await fetch(`http://127.0.0.1:8000/api/search/suggestions/?q=${encodeURIComponent(query)}`);
        const data = await response.json();
        
        displaySuggestions(data.suggestions);
    } catch (error) {
        console.error('Öneriler yüklenemedi:', error);
    }
}

// Önerileri göster
function displaySuggestions(suggestions) {
    const suggestionsContainer = document.getElementById('search-suggestions');
    
    if (suggestions.length === 0) {
        hideSuggestions();
        return;
    }
    
    suggestionsContainer.innerHTML = '';
    
    suggestions.forEach(suggestion => {
        const suggestionItem = document.createElement('div');
        suggestionItem.className = 'suggestion-item';
        suggestionItem.textContent = suggestion;
        suggestionItem.addEventListener('click', () => {
            document.getElementById('search-input').value = suggestion;
            hideSuggestions();
            performSearch();
        });
        suggestionsContainer.appendChild(suggestionItem);
    });
    
    suggestionsContainer.style.display = 'block';
}

// Önerileri gizle
function hideSuggestions() {
    const suggestionsContainer = document.getElementById('search-suggestions');
    if (suggestionsContainer) {
        suggestionsContainer.style.display = 'none';
    }
}

// Arama yap
function performSearch() {
    const query = document.getElementById('search-input').value.trim();
    currentSearchQuery = query;
    currentPage = 1;
    
    if (query.length === 0) {
        clearSearch();
        return;
    }
    
    hideSuggestions();
    hideAllSections();
    
    const searchSection = document.getElementById('search-results-section');
    if (searchSection) {
        searchSection.style.display = 'block';
        loadSearchResults();
    }
}

// Arama sonuçlarını yükle
async function loadSearchResults(append = false) {
    try {
        // Filtrelerileri al
        const minPrice = document.getElementById('min-price')?.value || '';
        const maxPrice = document.getElementById('max-price')?.value || '';
        const inStockOnly = document.getElementById('in-stock-only')?.checked || false;
        const sortBy = document.getElementById('sort-by')?.value || 'newest';
        
        // URL oluştur
        const params = new URLSearchParams({
            q: currentSearchQuery,
            page: currentPage,
            sort: sortBy
        });
        
        if (minPrice) params.append('min_price', minPrice);
        if (maxPrice) params.append('max_price', maxPrice);
        if (inStockOnly) params.append('in_stock', 'true');
        
        const response = await fetch(`http://127.0.0.1:8000/api/search/?${params}`);
        const data = await response.json();
        
        displaySearchResults(data, append);
    } catch (error) {
        console.error('Arama sonuçları yüklenemedi:', error);
        document.getElementById('search-results-container').innerHTML = 
            '<p class="error">Arama sonuçları yüklenirken hata oluştu.</p>';
    }
}

// Arama sonuçlarını göster
function displaySearchResults(data, append = false) {
    const container = document.getElementById('search-results-container');
    const infoContainer = document.getElementById('search-info');
    const loadMoreContainer = document.getElementById('load-more-container');
    const titleContainer = document.getElementById('search-results-title');
    
    // Başlık güncelle
    if (titleContainer) {
        if (currentSearchQuery) {
            titleContainer.textContent = `"${currentSearchQuery}" için arama sonuçları`;
        } else {
            titleContainer.textContent = 'Filtrelenmiş sonuçlar';
        }
    }
    
    // Bilgi göster
    if (infoContainer) {
        infoContainer.textContent = `${data.total_count} sonuç bulundu`;
    }
    
    // Sonuçları göster
    if (!append) {
        container.innerHTML = '';
    }
    
    if (data.results.length === 0 && !append) {
        container.innerHTML = '<p class="no-results">Arama kriterlerinize uygun sonuç bulunamadı.</p>';
        loadMoreContainer.style.display = 'none';
        return;
    }
    
    // Kitap kartları oluştur
    data.results.forEach(book => {
        const bookCard = createBookCard(book);
        container.appendChild(bookCard);
    });
    
    // Daha fazla yükle butonu
    if (data.has_more) {
        loadMoreContainer.style.display = 'block';
    } else {
        loadMoreContainer.style.display = 'none';
    }
}

// Kitap kartı oluştur (displayBooks'taki ile aynı mantık)
function createBookCard(book) {
    const bookCard = document.createElement('div');
    bookCard.className = 'book-card';
    
    // Stok durumu kontrolü
    const isOutOfStock = book.stock <= 0;
    const isLowStock = book.stock > 0 && book.stock <= 3;
    const isVeryLowStock = book.stock === 1;
    
    let stockWarning = '';
    let buttonContent = '';
    
    if (isOutOfStock) {
        stockWarning = '<div class="stock-warning out-of-stock">❌ Stokta Yok</div>';
        buttonContent = '<button class="add-to-cart-btn disabled" disabled>Stokta Yok</button>';
    } else if (isVeryLowStock) {
        stockWarning = '<div class="stock-warning very-low-stock">🔥 Son 1 adet!</div>';
        buttonContent = `<button class="add-to-cart-btn urgent" onclick="addToCart(${book.id})">Hemen Al!</button>`;
    } else if (isLowStock) {
        stockWarning = '<div class="stock-warning low-stock">⚡ Tükenmek Üzere!</div>';
        buttonContent = `<button class="add-to-cart-btn" onclick="addToCart(${book.id})">Sepete Ekle</button>`;
    } else {
        stockWarning = '<div class="stock-info">✅ Stokta Mevcut</div>';
        buttonContent = `<button class="add-to-cart-btn" onclick="addToCart(${book.id})">Sepete Ekle</button>`;
    }
    
    // Satıcı bilgisi
    const sellerInfo = book.seller_name ? `<div class="seller-info">Satıcı: ${book.seller_name}</div>` : '';
    
    bookCard.innerHTML = `
        <div class="book-title">${book.title}</div>
        <div class="book-author">Yazar: ${book.author}</div>
        <div class="book-price">${book.price} TL</div>
        <p>${book.description}</p>
        ${sellerInfo}
        ${stockWarning}
        ${buttonContent}
    `;
    
    if (isOutOfStock) {
        bookCard.classList.add('out-of-stock-card');
    } else if (isVeryLowStock) {
        bookCard.classList.add('urgent-stock-card');
    }
    
    return bookCard;
}

// Filtreleri uygula
function applyFilters() {
    currentPage = 1;
    loadSearchResults();
}

// Daha fazla sonuç yükle
function loadMoreResults() {
    currentPage++;
    loadSearchResults(true);
}

// Aramayı temizle
function clearSearch() {
    document.getElementById('search-input').value = '';
    document.getElementById('min-price').value = '';
    document.getElementById('max-price').value = '';
    document.getElementById('in-stock-only').checked = false;
    document.getElementById('sort-by').value = 'newest';
    
    currentSearchQuery = '';
    currentPage = 1;
    
    showBooks();
}

// Satıcı bilgisi stili ekle
const sellerInfoStyle = `
.seller-info {
    color: #666;
    font-size: 14px;
    margin: 5px 0;
    font-style: italic;
}

.no-results {
    text-align: center;
    color: #7f8c8d;
    font-size: 1.2rem;
    padding: 50px;
    background: #f8f9fa;
    border-radius: 10px;
    margin: 20px 0;
}
`;

// Stil ekle
const styleSheet = document.createElement('style');
styleSheet.textContent = sellerInfoStyle;
document.head.appendChild(styleSheet);