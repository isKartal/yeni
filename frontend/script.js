// Sepet için basit bir array kullanacağız
let cart = [];

// Sayfa yüklendiğinde kitapları getir
document.addEventListener('DOMContentLoaded', function() {
    loadBooks();
    setupCartToggle();
});

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
        bookCard.innerHTML = `
            <div class="book-title">${book.title}</div>
            <div class="book-author">Yazar: ${book.author}</div>
            <div class="book-price">${book.price} TL</div>
            <p>${book.description}</p>
            <button class="add-to-cart-btn" onclick="addToCart(${book.id})">
                Sepete Ekle
            </button>
        `;
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
    const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
    cartCount.textContent = `Sepet (${totalItems})`;
    
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
            <div>
                <strong>${item.title}</strong><br>
                <small>${item.author}</small>
            </div>
            <div>
                Adet: ${item.quantity} × ${item.price} TL
            </div>
            <div>
                <button onclick="removeFromCart(${index})">Kaldır</button>
            </div>
        `;
        cartItems.appendChild(cartItem);
        total += item.price * item.quantity;
    });
    
    cartTotal.textContent = `Toplam: ${total} TL`;
}

// Sepetten kaldır
function removeFromCart(index) {
    cart.splice(index, 1);
    updateCartDisplay();
}

// Sepet göster/gizle
function setupCartToggle() {
    const cartCount = document.getElementById('cart-count');
    const cartSection = document.getElementById('cart-section');
    const booksContainer = document.getElementById('books-container');
    
    cartCount.addEventListener('click', function() {
        if (cartSection.style.display === 'none') {
            cartSection.style.display = 'block';
            booksContainer.style.display = 'none';
            displayCartItems();
        } else {
            cartSection.style.display = 'none';
            booksContainer.style.display = 'grid';
        }
    });
}

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

// Sayfa başlangıcında kullanıcı durumunu kontrol et
document.addEventListener('DOMContentLoaded', function() {
    loadBooks();
    setupCartToggle();
    setupAuthForms();
    checkUserStatus();
});

function checkUserStatus() {
    if (isLoggedIn()) {
        showUserInfo();
    }
}

// Auth formlarını ayarla
function setupAuthForms() {
    // Giriş formu
    document.getElementById('login-form').addEventListener('submit', async function(e) {
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
            } else {
                alert('Hata: ' + (data.message || 'Giriş başarısız'));
            }
        } catch (error) {
            alert('Bağlantı hatası!');
        }
    });
    
    // Kayıt formu
    document.getElementById('register-form').addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const formData = {
            username: document.getElementById('register-username').value,
            email: document.getElementById('register-email').value,
            first_name: document.getElementById('register-firstname').value,
            last_name: document.getElementById('register-lastname').value,
            password: document.getElementById('register-password').value,
            password_confirm: document.getElementById('register-password-confirm').value,
        };
        
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
                setTokens(data.tokens);
                localStorage.setItem('user_info', JSON.stringify(data.user));
                showUserInfo();
                showBooks();
                alert('Kayıt başarılı!');
            } else {
                alert('Hata: ' + JSON.stringify(data));
            }
        } catch (error) {
            alert('Bağlantı hatası!');
        }
    });
}

// UI fonksiyonları
function showLogin() {
    hideAllSections();
    document.getElementById('auth-section').style.display = 'block';
}

function showLoginForm() {
    document.getElementById('login-form').style.display = 'block';
    document.getElementById('register-form').style.display = 'none';
    document.querySelectorAll('.tab-btn')[0].classList.add('active');
    document.querySelectorAll('.tab-btn')[1].classList.remove('active');
}

function showRegisterForm() {
    document.getElementById('login-form').style.display = 'none';
    document.getElementById('register-form').style.display = 'block';
    document.querySelectorAll('.tab-btn')[0].classList.remove('active');
    document.querySelectorAll('.tab-btn')[1].classList.add('active');
}

function showUserInfo() {
    const userInfo = JSON.parse(localStorage.getItem('user_info'));
    if (userInfo) {
        document.getElementById('username').textContent = `Hoş geldin, ${userInfo.username}!`;
        document.getElementById('user-info').style.display = 'inline';
        document.getElementById('login-link').style.display = 'none';
    }
}

function logout() {
    clearTokens();
    localStorage.removeItem('user_info');
    document.getElementById('user-info').style.display = 'none';
    document.getElementById('login-link').style.display = 'inline';
    cart = []; // Sepeti temizle
    updateCartDisplay();
    showBooks();
    alert('Çıkış yapıldı!');
}

function hideAllSections() {
    document.getElementById('books-container').style.display = 'none';
    document.getElementById('cart-section').style.display = 'none';
    document.getElementById('auth-section').style.display = 'none';
}

function showBooks() {
    hideAllSections();
    document.getElementById('books-container').style.display = 'grid';
}

// Mevcut showCart fonksiyonunu güncelle
function showCart() {
    hideAllSections();
    document.getElementById('cart-section').style.display = 'block';
    displayCartItems();
}