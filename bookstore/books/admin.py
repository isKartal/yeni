from django.contrib import admin
from .models import Book, Order, OrderItem, Seller

@admin.register(Book)
class BookAdmin(admin.ModelAdmin):
    list_display = ['title', 'author', 'price', 'stock', 'seller', 'is_active']
    list_filter = ['author', 'created_at', 'seller', 'is_active']
    search_fields = ['title', 'author', 'seller__store_name']

@admin.register(Order)
class OrderAdmin(admin.ModelAdmin):
    list_display = ['id', 'user', 'total_price', 'status', 'created_at']
    list_filter = ['status', 'created_at']
    search_fields = ['user__username', 'id']
    readonly_fields = ['created_at', 'updated_at']

@admin.register(OrderItem)
class OrderItemAdmin(admin.ModelAdmin):
    list_display = ['order', 'book', 'quantity', 'price', 'total_price']
    list_filter = ['order__status']    

@admin.register(Seller)
class SellerAdmin(admin.ModelAdmin):
    list_display = ['store_name', 'user', 'phone', 'is_approved', 'created_at']
    list_filter = ['is_approved', 'created_at']
    search_fields = ['store_name', 'user__username']
    readonly_fields = ['created_at']    