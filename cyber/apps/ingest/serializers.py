from rest_framework import serializers
from apps.ingest.models import ProactiveAlert

class ProactiveAlertSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProactiveAlert
        fields = '__all__'
