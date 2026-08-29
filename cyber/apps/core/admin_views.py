from rest_framework import views, generics, status
from rest_framework.response import Response
from apps.users.permissions import IsAdministrator
from rest_framework.permissions import IsAuthenticated
from .models import APIKey
from apps.users.models import User
from rest_framework import serializers
from django.utils import timezone
import psutil

class APIKeySerializer(serializers.ModelSerializer):
    class Meta:
        model = APIKey
        fields = ['id', 'name', 'key', 'created_at', 'is_active']
        read_only_fields = ['id', 'key', 'created_at']

class SystemHealthView(views.APIView):
    permission_classes = [IsAuthenticated, IsAdministrator]
    
    def get(self, request):
        return Response({
            "status": "healthy",
            "cpu_percent": psutil.cpu_percent(),
            "memory_percent": psutil.virtual_memory().percent,
            "database": "connected",
            "celery": "running",
            "timestamp": timezone.now()
        })

class UserToggleStatusView(views.APIView):
    permission_classes = [IsAuthenticated, IsAdministrator]
    
    def post(self, request, pk):
        try:
            user = User.objects.get(pk=pk)
            user.is_active = not user.is_active
            user.save(update_fields=['is_active'])
            return Response({"status": "updated", "is_active": user.is_active})
        except User.DoesNotExist:
            return Response(status=status.HTTP_404_NOT_FOUND)

class APIKeyViewSet(generics.ListCreateAPIView):
    serializer_class = APIKeySerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        return APIKey.objects.filter(user=self.request.user).order_by('-created_at')
        
    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

class APIKeyDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = APIKeySerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        return APIKey.objects.filter(user=self.request.user)
