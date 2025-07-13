from rest_framework import serializers
from .models import Book
from django.contrib.auth.models import User
from django.contrib.auth import authenticate
from rest_framework import serializers
from .models import Order, OrderItem

class BookSerializer(serializers.ModelSerializer):
    class Meta:
        model = Book
        fields = '__all__'  # Tüm alanları al

class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'first_name', 'last_name']

class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True)
    password_confirm = serializers.CharField(write_only=True)
    
    class Meta:
        model = User
        fields = ['username', 'email', 'password', 'password_confirm', 'first_name', 'last_name']
    
    def validate(self, data):
        if data['password'] != data['password_confirm']:
            raise serializers.ValidationError("Şifreler eşleşmiyor!")
        return data
    
    def create(self, validated_data):
        validated_data.pop('password_confirm')
        user = User.objects.create_user(**validated_data)
        return user

class LoginSerializer(serializers.Serializer):
    username = serializers.CharField()
    password = serializers.CharField()
    
    def validate(self, data):
        username = data.get('username')
        password = data.get('password')
        
        if username and password:
            user = authenticate(username=username, password=password)
            if not user:
                raise serializers.ValidationError("Kullanıcı adı veya şifre hatalı!")
            data['user'] = user
        return data       

class OrderItemSerializer(serializers.ModelSerializer):
    book_title = serializers.CharField(source='book.title', read_only=True)
    book_author = serializers.CharField(source='book.author', read_only=True)
    total_price = serializers.ReadOnlyField()
    
    class Meta:
        model = OrderItem
        fields = ['id', 'book', 'book_title', 'book_author', 'quantity', 'price', 'total_price']

class OrderSerializer(serializers.ModelSerializer):
    items = OrderItemSerializer(many=True, read_only=True)
    user_username = serializers.CharField(source='user.username', read_only=True)
    
    class Meta:
        model = Order
        fields = ['id', 'user', 'user_username', 'total_price', 'status', 
                 'shipping_address', 'phone', 'created_at', 'updated_at', 'items']
        read_only_fields = ['user', 'created_at', 'updated_at']

class CreateOrderSerializer(serializers.Serializer):
    shipping_address = serializers.CharField(
        max_length=500, 
        min_length=10,
        error_messages={
            'required': 'Teslimat adresi gereklidir!',
            'min_length': 'Adres en az 10 karakter olmalıdır!'
        }
    )
    phone = serializers.CharField(
        max_length=20,
        min_length=10,
        error_messages={
            'required': 'Telefon numarası gereklidir!',
            'min_length': 'Telefon numarası en az 10 karakter olmalıdır!'
        }
    )
    cart_items = serializers.ListField(
        child=serializers.DictField(
            child=serializers.CharField()
        ),
        min_length=1,
        error_messages={
            'min_length': 'Sepetinizde en az bir ürün olmalıdır!'
        }
    )
    
    def validate_phone(self, value):
        # Türkiye telefon numarası formatı kontrolü
        import re
        phone_pattern = r'^(\+90|0)?[5][0-9]{2}[0-9]{3}[0-9]{4}$'
        cleaned_phone = re.sub(r'[\s\-\(\)]', '', value)
        
        if not re.match(phone_pattern, cleaned_phone):
            raise serializers.ValidationError("Geçerli bir telefon numarası giriniz!")
        return cleaned_phone