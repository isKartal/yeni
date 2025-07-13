from django.db import models
from django.contrib.auth.models import User

class Book(models.Model):
    title = models.CharField(max_length=200)  # Kitap adı
    author = models.CharField(max_length=100)  # Yazar
    price = models.DecimalField(max_digits=10, decimal_places=2)  # Fiyat
    description = models.TextField()  # Açıklama
    stock = models.IntegerField(default=0)  # Stok
    created_at = models.DateTimeField(auto_now_add=True)  # Tarih
    
    # YENİ: Satıcı bilgisi eklendi
    seller = models.ForeignKey('Seller', on_delete=models.CASCADE, related_name='books', null=True, blank=True)
    is_active = models.BooleanField(default=True)  # Ürün aktif mi?
    
    def __str__(self):
        return self.title  # Admin panelde kitap adını göster
    
    class Meta:
        ordering = ['-created_at']
    
class Order(models.Model):
    STATUS_CHOICES = [
        ('pending', 'Beklemede'),
        ('confirmed', 'Onaylandı'),
        ('shipped', 'Kargoya Verildi'),
        ('delivered', 'Teslim Edildi'),
        ('cancelled', 'İptal Edildi'),
    ]
    
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='orders')
    total_price = models.DecimalField(max_digits=10, decimal_places=2)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    # Adres bilgileri
    shipping_address = models.TextField()
    phone = models.CharField(max_length=20)
    
    def __str__(self):
        return f"Sipariş #{self.id} - {self.user.username}"
    
    class Meta:
        ordering = ['-created_at']

class OrderItem(models.Model):
    order = models.ForeignKey(Order, on_delete=models.CASCADE, related_name='items')
    book = models.ForeignKey(Book, on_delete=models.CASCADE)
    quantity = models.IntegerField()
    price = models.DecimalField(max_digits=10, decimal_places=2)  # Sipariş anındaki fiyat
    
    def __str__(self):
        return f"{self.book.title} x {self.quantity}"
    
    @property
    def total_price(self):
        return self.quantity * self.price
    
class Seller(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='seller_profile')
    store_name = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    phone = models.CharField(max_length=20)
    address = models.TextField()
    is_approved = models.BooleanField(default=True)  # Basit sistem için otomatik onay
    created_at = models.DateTimeField(auto_now_add=True)
    
    def __str__(self):
        return f"{self.store_name} - {self.user.username}"
    
    class Meta:
        verbose_name = "Satıcı"
        verbose_name_plural = "Satıcılar"    