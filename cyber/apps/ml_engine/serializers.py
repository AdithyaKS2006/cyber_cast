from rest_framework import serializers
from .models import MLModel, MLPrediction, ThreatScoringConfig, AutoHuntConfig
class MLModelSerializer(serializers.ModelSerializer):
    class Meta:
        model = MLModel
        fields = '__all__'

class MLPredictionSerializer(serializers.ModelSerializer):
    class Meta:
        model = MLPrediction
        fields = '__all__'

class ThreatScoringConfigSerializer(serializers.ModelSerializer):
    class Meta:
        model = ThreatScoringConfig
        fields = '__all__'

class AutoHuntConfigSerializer(serializers.ModelSerializer):
    class Meta:
        model = AutoHuntConfig
        fields = '__all__'

