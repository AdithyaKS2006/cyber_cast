#!/usr/bin/env python3
"""
Offline Cyber Guru ML Model Trainer Script
"""

import os
import sys
import joblib

# Ensure project root is in sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../..")))

from ml_models.guru_engine import OfflineCyberGuruEngine

def train_and_save():
    print("=" * 60)
    print("  Cyber Guru Offline ML Model Trainer")
    print("=" * 60)
    
    engine = OfflineCyberGuruEngine()
    engine.fit()
    
    output_dir = os.path.join(os.path.dirname(__file__), "..", "saved_models")
    os.makedirs(output_dir, exist_ok=True)
    
    model_path = os.path.join(output_dir, "guru_nlp_v1.pkl")
    joblib.dump(engine, model_path)
    print(f"[✓] Successfully saved Cyber Guru model to: {model_path}")
    print("=" * 60)

if __name__ == "__main__":
    train_and_save()
