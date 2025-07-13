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
        updateFooterLinks(); // Footer'ı da güncelle
    } else {
        updateFooterLinks(); // Footer'ı güncelle
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
        
        bookCard.innerHTML = `
            <div class="book-title">${book.title}</div>
            <div class="book-author">Yazar: ${book.author}</div>
            <div class="book-price">${book.price} TL</div>
            <p>${book.description}</p>
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
    // Önce kitap bilgilerini al
    fetch(`http://127.0.0.1:8000/api/books/${bookId}/`)
        .then(response => response.json())
        .then(book => {
            // Sepette zaten var mı kontrol et
            const existingItem = cart.find(item => item.id === bookId);
            
            if (existingItem) {
                existingItem.quantity++;
            } else {
                cart.push({
                    id: book.id,
                    title: book.title,
                    author: book.author,
                    price: book.price,
                    quantity: 1
                });
            }
            
            updateCartDisplay();
            alert(`${book.title} sepete eklendi!`);
        })
        .catch(error => {
            console.error('Sepete eklenemedi:', error);
            alert('Bir hata oluştu!');
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
    const sections = ['books-container', 'cart-section', 'auth-section', 'checkout-section', 'orders-section', 'profile-section'];
    sections.forEach(sectionId => {
        const element = document.getElementById(sectionId);
        if (element) {
            element.style.display = 'none';
        }
    });
    
    // İçerikleri de temizle
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
    
    const shippingAddress = document.getElementById('shipping-address').value;
    const phone = document.getElementById('phone').value;
    
    if (!shippingAddress || !phone) {
        alert('Lütfen tüm alanları doldurun!');
        return;
    }
    
    // Sepet verilerini sipariş formatına çevir
    const cartItems = cart.map(item => ({
        book_id: item.id.toString(),
        quantity: item.quantity.toString()
    }));
    
    try {
        const response = await fetch('http://127.0.0.1:8000/api/orders/create/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${getToken()}`
            },
            body: JSON.stringify({
                shipping_address: shippingAddress,
                phone: phone,
                cart_items: cartItems
            })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            alert('Sipariş başarıyla oluşturuldu!');
            cart = []; // Sepeti temizle
            updateCartDisplay();
            showOrders(); // Siparişlere git
        } else {
            alert('Hata: ' + (data.error || 'Sipariş oluşturulamadı'));
        }
    } catch (error) {
        console.error('Order creation error:', error);
        alert('Bağlantı hatası!');
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
        console.log('Response headers:', response.headers);
        
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
    const ordersList = document.getElementById('orders-list');
    if (!ordersList) return;
    
    if (orders.length === 0) {
        ordersList.innerHTML = '<p>Henüz sipariş vermediniz.</p>';
        return;
    }
    
    ordersList.innerHTML = '';
    
    orders.forEach(order => {
        const orderDiv = document.createElement('div');
        orderDiv.className = 'order-card';
        
        const statusText = getStatusText(order.status);
        const orderDate = new Date(order.created_at).toLocaleDateString('tr-TR');
        
        orderDiv.innerHTML = `
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
                ${order.items.map(item => `
                    <div class="order-item">
                        <span>${item.book_title} (${item.book_author})</span>
                        <span>${item.quantity} × ${item.price} TL</span>
                    </div>
                `).join('')}
            </div>
            <div class="order-address">
                <p><strong>Teslimat Adresi:</strong> ${order.shipping_address}</p>
                <p><strong>Telefon:</strong> ${order.phone}</p>
            </div>
        `;
        
        ordersList.appendChild(orderDiv);
    });
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