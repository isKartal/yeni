from django.urls import path
from . import views

urlpatterns = [
    # Kitap API'leri
    path('books/', views.get_books, name='get_books'),
    path('books/<int:pk>/', views.get_book, name='get_book'),

    # Kullanıcı API'leri
    path('auth/register/', views.register_user, name='register'),
    path('auth/login/', views.login_user, name='login'),
    path('auth/logout/', views.logout_user, name='logout'),
    path('auth/profile/', views.user_profile, name='profile'),
]