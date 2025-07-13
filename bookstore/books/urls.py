from django.urls import path
from . import views
from rest_framework_simplejwt.views import TokenRefreshView

urlpatterns = [
    # Kitap API'leri
    path('books/', views.get_books, name='get_books'),
    path('books/<int:pk>/', views.get_book, name='get_book'),

    # Kullanıcı API'leri
    path('auth/register/', views.register_user, name='register'),
    path('auth/login/', views.login_user, name='login'),
    path('auth/logout/', views.logout_user, name='logout'),
    path('auth/profile/', views.user_profile, name='profile'),

    # Sipariş API'leri
    path('orders/', views.user_orders, name='user_orders'),
    path('orders/create/', views.create_order, name='create_order'),
    path('orders/<int:pk>/', views.order_detail, name='order_detail'),
    path('orders/<int:pk>/cancel/', views.cancel_order, name='cancel_order'),
    path('orders/<int:pk>/status/', views.order_status, name='order_status'),

    # Satıcı API'leri
    path('seller/become/', views.become_seller, name='become_seller'),
    path('seller/profile/', views.seller_profile, name='seller_profile'),
    path('seller/books/', views.my_books, name='my_books'),
    path('seller/books/add/', views.add_book, name='add_book'),
    path('seller/books/<int:pk>/update/', views.update_book, name='update_book'),
    path('seller/books/<int:pk>/delete/', views.delete_book, name='delete_book'),

     # JWT Token URLs
    path('auth/token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
]