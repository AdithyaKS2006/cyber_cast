"""
Train LightGBM + Isolation Forest models on the CrimeCast dataset.
Run: /home/adithya-k-s/PROJECTS/cyber/venv/bin/python ml_models/scripts/train_lgbm.py
"""
import sys, os, time
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'cybersandbox.settings.development')

import django
django.setup()

import numpy as np
import pandas as pd
from sklearn.preprocessing import LabelEncoder

from apps.ml_engine.lgbm_classifier import LightGBMThreatClassifier, IsolationForestAnomalyDetector
from apps.ml_engine.models import MLModel


def train_all():
    print("=" * 60)
    print("  CrimeCast — LightGBM Model Training Pipeline")
    print("=" * 60)

    data_path = 'ml_models/training_data/training_data.csv'
    if not os.path.exists(data_path):
        print(f"\n[ERROR] Training data not found at {data_path}")
        print("Run: python ml_models/scripts/generate_training_data.py first")
        sys.exit(1)

    print(f"\n[1/3] Loading training data from {data_path}...")
    df = pd.read_csv(data_path)
    X = df.drop('label', axis=1).values.astype(np.float32)
    y = df['label'].values
    print(f"      Loaded {len(X):,} samples | {X.shape[1]} features | {len(set(y))} classes")
    print(f"      Class distribution:")
    for cls, cnt in sorted(pd.Series(y).value_counts().items()):
        print(f"        {cls:<20} {cnt:>5} samples")

    # ── Train LightGBM ──────────────────────────────────────────────
    print("\n[2/3] Training LightGBM Threat Classifier (v2.0.0)...")
    print("      Algorithm: Microsoft LightGBM GBDT")
    print("      Features: 500 trees, num_leaves=63, early_stopping=50")

    lgbm = LightGBMThreatClassifier()
    t0 = time.time()
    metrics = lgbm.train(X, y)
    elapsed = time.time() - t0

    print(f"\n      ✅ Training complete in {elapsed:.1f}s")
    print(f"      Accuracy  : {metrics['accuracy']:.4f} ({metrics['accuracy']*100:.1f}%)")
    print(f"      F1 Score  : {metrics['f1_score']:.4f}")
    print(f"      Precision : {metrics['precision']:.4f}")
    print(f"      Recall    : {metrics['recall']:.4f}")

    if metrics.get('feature_importance'):
        print("\n      Top 5 features by importance:")
        for feat, imp in list(metrics.get('feature_importance', {}).items())[:5]:
            print(f"        {feat:<30} {imp:.4f}")

    # Save to DB
    MLModel.objects.update_or_create(
        name='LightGBMThreatClassifier-v2',
        model_type='lightgbm',
        defaults={
            'version': '2.0.0',
            'status': 'active',
            'accuracy': metrics['accuracy'],
            'f1_score': metrics['f1_score'],
            'precision': metrics.get('precision', 0),
            'recall': metrics.get('recall', 0),
            'training_samples': len(X),
            'feature_count': X.shape[1],
            'training_duration_seconds': metrics.get('training_duration_seconds', 0),
            'model_file_path': lgbm.model_path,
            'feature_importance': lgbm.get_feature_importance(),
        }
    )
    print("      Saved to MLModel database registry ✅")

    # ── Train Isolation Forest ───────────────────────────────────────
    print("\n[3/3] Training Isolation Forest Anomaly Detector...")
    print("      Algorithm: sklearn IsolationForest (unsupervised)")
    print("      Parameters: n_estimators=200, contamination=0.1")

    iso = IsolationForestAnomalyDetector()
    iso_metrics = iso.train(X)
    print(f"      ✅ Isolation Forest trained in {iso_metrics['training_duration_seconds']:.1f}s")
    print(f"      Saved to {iso.model_path} ✅")

    # Quick sanity check
    print("\n── Sanity Check ──────────────────────────────────────────")
    test_vec = X[0:1]
    lgbm_result = lgbm.predict_raw(test_vec)
    iso_result = iso.predict(test_vec[0])
    print(f"  Sample[0] → LGBM: {lgbm_result['predicted_class']} ({lgbm_result['confidence']*100:.1f}%)")
    print(f"  Sample[0] → IsAnomaly: {iso_result['is_anomaly']}, Score: {iso_result['anomaly_score']:.3f}")

    print("\n" + "=" * 60)
    print("  ✅ ALL MODELS TRAINED AND SAVED SUCCESSFULLY")
    print("  LightGBM v2.0.0 is now the primary classifier")
    print("  Isolation Forest v1.0 handles zero-day detection")
    print("=" * 60)


if __name__ == '__main__':
    train_all()
