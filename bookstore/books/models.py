from django.db import models

class Book(models.Model):
    title = models.CharField(max_length=200)  # Kitap adı
    author = models.CharField(max_length=100)  # Yazar
    price = models.DecimalField(max_digits=10, decimal_places=2)  # Fiyat
    description = models.TextField()  # Açıklama
    stock = models.IntegerField(default=0)  # Stok
    created_at = models.DateTimeField(auto_now_add=True)  # Tarih
    
    def __str__(self):
        return self.title  # Admin panelde kitap adını göster
    
