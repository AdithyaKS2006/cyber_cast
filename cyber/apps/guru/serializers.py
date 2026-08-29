from rest_framework import serializers
from .models import GuruChatSession

class GuruChatSessionSerializer(serializers.ModelSerializer):
    class Meta:
        model = GuruChatSession
        fields = '__all__'
        read_only_fields = ['user']
