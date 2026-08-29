"""Celery periodic tasks for ML engine — drift detection and retraining hooks."""
import logging
import os
from celery import shared_task

logger = logging.getLogger(__name__)


@shared_task(name='apps.ml_engine.tasks.retrain_model')
def retrain_model(model_id: str = None):
    """
    Retrain an ML model in the background.
    Kicks off the training pipeline for the specified model type.
    """
    from apps.ml_engine.models import MLModel
    from apps.ml_engine.classifiers import LightGBMClassifier, RandomForestAttackClassifier, SVMAttackClassifier
    import numpy as np
    import pandas as pd
    from django.conf import settings

    model = MLModel.objects.filter(id=model_id).first() if model_id else MLModel.objects.filter(champion=True).first()
    if not model:
        logger.warning("No model found for retraining.")
        return {'status': 'no_model'}

    # Load training data
    data_path = os.path.join(settings.ML_TRAINING_DATA_DIR, 'training_data.csv')
    if not os.path.exists(data_path):
        logger.warning(f"Training data not found at {data_path}")
        return {'status': 'no_training_data'}

    df = pd.read_csv(data_path)
    feature_cols = [c for c in df.columns if c != 'attack_class']
    X = df[feature_cols].values
    y = df['attack_class'].values

    classifier_map = {
        'lightgbm': (LightGBMClassifier, 'lightgbm_v1.pkl'),
        'lightgbm': (RandomForestAttackClassifier, 'lightgbm_v1.pkl'),
        'svm': (SVMAttackClassifier, 'svm_v1.pkl'),
    }

    cls_class, filename = classifier_map.get(model.model_type, (None, None))
    if not cls_class:
        logger.warning(f"Unknown model type: {model.model_type}")
        return {'status': 'unknown_type'}

    model_path = os.path.join(settings.ML_MODELS_DIR, filename)
    classifier = cls_class(model_path=model_path)
    metrics = classifier.train(X, y)

    model.accuracy = metrics.get('accuracy', 0.0)
    model.f1_score = metrics.get('f1_score', 0.0)
    model.precision = metrics.get('precision', 0.0)
    model.recall = metrics.get('recall', 0.0)
    model.training_samples = len(X)
    model.feature_count = X.shape[1]
    model.training_duration_seconds = metrics.get('training_duration_seconds', 0.0)
    model.model_file_path = model_path
    model.save()

    logger.info(f"Retrained {model.model_type} model. Accuracy: {metrics.get('accuracy', 0):.4f}")
    return {'status': 'complete', 'accuracy': metrics.get('accuracy', 0)}


@shared_task(name='apps.ml_engine.tasks.check_model_drift')
def check_model_drift():
    """
    Weekly drift check: compare champion model accuracy against recent predictions.
    If accuracy drops below threshold, flags model for retraining.
    """
    from apps.ml_engine.models import MLModel, MLPrediction
    from django.utils import timezone
    from datetime import timedelta

    now = timezone.now()
    week_ago = now - timedelta(days=7)

    champion = MLModel.objects.filter(champion=True).first()
    if not champion:
        logger.warning('No champion model found for drift check.')
        return {'status': 'no_champion'}

    recent_preds = MLPrediction.objects.filter(
        model=champion, created_at__gte=week_ago
    )
    total = recent_preds.count()

    if total < 50:
        logger.info(f'Insufficient predictions ({total}) for drift check — skipping.')
        return {'status': 'insufficient_data', 'count': total}

    # Simple accuracy proxy: predictions with high confidence treated as correct
    high_confidence = recent_preds.filter(confidence__gte=0.75).count()
    accuracy = high_confidence / total

    logger.info(f'Drift check: champion={champion.name}, accuracy={accuracy:.2%}, samples={total}')

    if accuracy < 0.70:
        logger.warning(f'Model drift detected for {champion.name}. Accuracy: {accuracy:.2%}')
        return {'status': 'drift_detected', 'accuracy': accuracy, 'model': champion.name}

    return {'status': 'ok', 'accuracy': accuracy, 'model': champion.name}


@shared_task(name='apps.ml_engine.tasks.check_all_model_drift')
def check_all_model_drift():
    """
    Daily drift check for all active models.
    Sends admin notifications when drift is detected.
    """
    from apps.ml_engine.models import MLModel
    from apps.ml_engine.drift_monitor import DriftMonitor

    drifted_models = []

    for model in MLModel.objects.filter(status='active'):
        monitor = DriftMonitor(model.name)
        result = monitor.check_drift()

        if result.get('drifted'):
            logger.warning(f"Model drift detected for {model.name}: {result}")
            drifted_models.append({'model': model.name, 'result': result})

            # Send notification to all validators and admins
            try:
                from apps.core.notification_service import notify_validators
                notify_validators(
                    notification_type='ml_drift',
                    title=f'ML Model Drift Alert — {model.name}',
                    message=(
                        f"{model.name} accuracy dropped by {result.get('drift_amount', 0):.1%}. "
                        "Retraining recommended."
                    ),
                    link_page='admin/ml-models',
                )
            except Exception as notify_error:
                logger.error(f"Failed to send drift notification for {model.name}: {notify_error}")

    return {
        'status': 'complete',
        'drifted_count': len(drifted_models),
        'drifted_models': drifted_models,
    }
