from rest_framework.decorators import api_view
from rest_framework.response import Response
from .models import Book, Order, OrderItem
from .serializers import BookSerializer
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth.models import User
from .serializers import UserSerializer, RegisterSerializer, LoginSerializer, OrderSerializer, CreateOrderSerializer, OrderItemSerializer
from rest_framework import status
from django.db import transaction

@api_view(['GET'])
def get_books(request):
    """Tüm kitapları getir"""
    books = Book.objects.all()
    serializer = BookSerializer(books, many=True)
    return Response(serializer.data)

@api_view(['GET'])
def get_book(request, pk):
    """Tek kitap getir"""
    try:
        book = Book.objects.get(pk=pk)
        serializer = BookSerializer(book)
        return Response(serializer.data)
    except Book.DoesNotExist:
        return Response({'error': 'Kitap bulunamadı'}, status=404)
    
@api_view(['POST'])
@permission_classes([AllowAny])
def register_user(request):
    """Kullanıcı kaydı"""
    serializer = RegisterSerializer(data=request.data)
    if serializer.is_valid():
        user = serializer.save()
        refresh = RefreshToken.for_user(user)
        return Response({
            'message': 'Kayıt başarılı!',
            'user': UserSerializer(user).data,
            'tokens': {
                'refresh': str(refresh),
                'access': str(refresh.access_token),
            }
        })
    return Response(serializer.errors, status=400)

@api_view(['POST'])
@permission_classes([AllowAny])
def login_user(request):
    """Kullanıcı girişi"""
    serializer = LoginSerializer(data=request.data)
    if serializer.is_valid():
        user = serializer.validated_data['user']
        refresh = RefreshToken.for_user(user)
        return Response({
            'message': 'Giriş başarılı!',
            'user': UserSerializer(user).data,
            'tokens': {
                'refresh': str(refresh),
                'access': str(refresh.access_token),
            }
        })
    return Response(serializer.errors, status=400)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def user_profile(request):
    """Kullanıcı profili"""
    serializer = UserSerializer(request.user)
    return Response(serializer.data)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def logout_user(request):
    """Kullanıcı çıkışı"""
    try:
        refresh_token = request.data["refresh"]
        token = RefreshToken(refresh_token)
        token.blacklist()
        return Response({'message': 'Çıkış başarılı!'})
    except Exception as e:
        return Response({'error': 'Bir hata oluştu'}, status=400)
    
@api_view(['POST'])
@permission_classes([IsAuthenticated])
def create_order(request):
    """Sipariş oluştur"""
    serializer = CreateOrderSerializer(data=request.data)
    if serializer.is_valid():
        try:
            with transaction.atomic():
                cart_items = serializer.validated_data['cart_items']
                
                # Sepet boş mu kontrol et
                if not cart_items:
                    return Response({'error': 'Sepetiniz boş!'}, status=400)
                
                # Önce tüm kitapları kontrol et
                total_price = 0
                validated_items = []
                
                for item in cart_items:
                    try:
                        book_id = int(item['book_id'])
                        quantity = int(item['quantity'])
                        
                        if quantity <= 0:
                            return Response({'error': 'Geçersiz adet!'}, status=400)
                        
                        book = Book.objects.get(id=book_id)
                        
                        # Stok kontrolü
                        if book.stock < quantity:
                            return Response({
                                'error': f'{book.title} için yeterli stok yok! Mevcut stok: {book.stock}, İstenen: {quantity}'
                            }, status=400)
                        
                        # Fiyat kontrolü (negatif fiyat kontrolü)
                        if book.price <= 0:
                            return Response({'error': f'{book.title} için geçersiz fiyat!'}, status=400)
                        
                        validated_items.append({
                            'book': book,
                            'quantity': quantity,
                            'price': book.price
                        })
                        
                        total_price += book.price * quantity
                        
                    except (ValueError, TypeError):
                        return Response({'error': 'Geçersiz veri formatı!'}, status=400)
                    except Book.DoesNotExist:
                        return Response({'error': f'ID {book_id} olan kitap bulunamadı!'}, status=400)
                
                # Minimum sipariş tutarı kontrolü
                if total_price < 10:  # 10 TL minimum
                    return Response({'error': 'Minimum sipariş tutarı 10 TL olmalıdır!'}, status=400)
                
                # Sipariş oluştur
                order = Order.objects.create(
                    user=request.user,
                    shipping_address=serializer.validated_data['shipping_address'].strip(),
                    phone=serializer.validated_data['phone'].strip(),
                    total_price=total_price
                )
                
                # Sipariş öğelerini oluştur ve stokları güncelle
                for item_data in validated_items:
                    OrderItem.objects.create(
                        order=order,
                        book=item_data['book'],
                        quantity=item_data['quantity'],
                        price=item_data['price']
                    )
                    
                    # Stoktan düş
                    item_data['book'].stock -= item_data['quantity']
                    item_data['book'].save()
                
                return Response({
                    'message': 'Sipariş başarıyla oluşturuldu!',
                    'order': OrderSerializer(order).data
                }, status=201)
                
        except Exception as e:
            return Response({'error': f'Beklenmeyen hata: {str(e)}'}, status=500)
    
    return Response(serializer.errors, status=400)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def user_orders(request):
    """Kullanıcının siparişleri"""
    print(f"DEBUG - Giriş yapan kullanıcı: {request.user}")
    print(f"DEBUG - Kullanıcı ID: {request.user.id}")
    
    orders = Order.objects.filter(user=request.user)
    print(f"DEBUG - Bulunan sipariş sayısı: {orders.count()}")
    
    # Tüm siparişleri listele
    all_orders = Order.objects.all()
    print(f"DEBUG - Sistemdeki toplam sipariş sayısı: {all_orders.count()}")
    for order in all_orders:
        print(f"DEBUG - Sipariş {order.id}: Kullanıcı {order.user} (ID: {order.user.id})")
    
    serializer = OrderSerializer(orders, many=True)
    return Response(serializer.data)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def order_detail(request, pk):
    """Sipariş detayı"""
    try:
        order = Order.objects.get(pk=pk, user=request.user)
        serializer = OrderSerializer(order)
        return Response(serializer.data)
    except Order.DoesNotExist:
        return Response({'error': 'Sipariş bulunamadı'}, status=404)    
    
@api_view(['POST'])
@permission_classes([IsAuthenticated])
def cancel_order(request, pk):
    """Sipariş iptal et"""
    try:
        order = Order.objects.get(pk=pk, user=request.user)
        
        # Sadece beklemede olan siparişler iptal edilebilir
        if order.status != 'pending':
            return Response({
                'error': 'Sadece beklemede olan siparişler iptal edilebilir!'
            }, status=400)
        
        with transaction.atomic():
            # Sipariş durumunu iptal et
            order.status = 'cancelled'
            order.save()
            
            # Stokları geri ver
            for item in order.items.all():
                book = item.book
                book.stock += item.quantity
                book.save()
        
        return Response({
            'message': 'Sipariş başarıyla iptal edildi!',
            'order': OrderSerializer(order).data
        })
        
    except Order.DoesNotExist:
        return Response({'error': 'Sipariş bulunamadı!'}, status=404)
    except Exception as e:
        return Response({'error': f'İptal işlemi başarısız: {str(e)}'}, status=500)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def order_status(request, pk):
    """Sipariş durumu kontrolü"""
    try:
        order = Order.objects.get(pk=pk, user=request.user)
        return Response({
            'id': order.id,
            'status': order.status,
            'can_cancel': order.status == 'pending',
            'created_at': order.created_at,
            'total_price': order.total_price
        })
    except Order.DoesNotExist:
        return Response({'error': 'Sipariş bulunamadı!'}, status=404)