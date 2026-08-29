from django.db import models
import uuid

class MLModel(models.Model):
    MODEL_TYPES = [
        ('lightgbm', 'LightGBM'),
        ('lightgbm', 'LightGBM'),
        ('svm', 'Support Vector Machine'),
        ('lightgbm', 'LightGBM'),
    ]
    STATUS = [
        ('active', 'Active'),
        ('staging', 'Staging'),
        ('deprecated', 'Deprecated'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=100)
    model_type = models.CharField(max_length=30, choices=MODEL_TYPES)
    version = models.CharField(max_length=20)
    status = models.CharField(max_length=20, choices=STATUS, default='staging')
    model_type_label = models.CharField(max_length=20, default='Champion')
    
    # Versioning and A/B testing fields
    champion = models.BooleanField(default=False)  # Only one model per type can be champion
    traffic_split = models.FloatField(default=1.0)   # Percentage of traffic to send to this model
    ab_test_group = models.CharField(max_length=10, blank=True)  # 'champion' or 'challenger'
    
    # Performance metrics
    accuracy = models.FloatField(default=0.0)
    f1_score = models.FloatField(default=0.0)
    false_positive_rate = models.FloatField(default=0.0)
    precision = models.FloatField(default=0.0)
    recall = models.FloatField(default=0.0)
    roc_auc = models.FloatField(default=0.0)
    
    # Training info
    training_samples = models.IntegerField(default=0)
    feature_count = models.IntegerField(default=0)
    training_duration_seconds = models.FloatField(default=0.0)
    model_file_path = models.CharField(max_length=500)
    hyperparameters = models.JSONField(default=dict)
    feature_importance = models.JSONField(default=dict)
    
    trained_at = models.DateTimeField(auto_now_add=True)
    
    def save(self, *args, **kwargs):
        # Enforce only one champion per model type
        if self.champion:
            MLModel.objects.filter(
                model_type=self.model_type,
                champion=True
            ).exclude(pk=self.pk).update(champion=False)
        super().save(*args, **kwargs)
    
    class Meta:
        ordering = ['-trained_at']


class MLPrediction(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    model = models.ForeignKey(MLModel, on_delete=models.CASCADE, related_name='predictions')
    input_features = models.JSONField()
    predicted_class = models.CharField(max_length=50)
    confidence = models.FloatField()
    class_probabilities = models.JSONField()
    shap_values = models.JSONField(default=dict)
    processing_time_ms = models.FloatField()
    created_at = models.DateTimeField(auto_now_add=True)

class ThreatScoringConfig(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    organization_id = models.CharField(max_length=50, default='default')
    base_weight = models.FloatField(default=1.0)
    ml_confidence_weight = models.FloatField(default=1.5)
    historical_penalty = models.FloatField(default=0.8)
    custom_rules = models.JSONField(default=dict)
    updated_at = models.DateTimeField(auto_now=True)

class AutoHuntConfig(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    organization_id = models.CharField(max_length=50, default='default')
    is_enabled = models.BooleanField(default=True)
    schedule_cron = models.CharField(max_length=50, default='0 0 * * *')
    target_models = models.JSONField(default=list)
    confidence_threshold = models.FloatField(default=0.85)
    updated_at = models.DateTimeField(auto_now=True)
