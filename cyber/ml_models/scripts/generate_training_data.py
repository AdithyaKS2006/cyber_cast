"""
Generate synthetic training data for all attack classes.
Run: python ml_models/scripts/generate_training_data.py
"""
import numpy as np
import pandas as pd
import random
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from apps.ml_engine.feature_extractor import FeatureExtractor

np.random.seed(42)
random.seed(42)

N_PER_CLASS = {
    'Clean': 5000,
    'Phishing': 2000,
    'DDoS': 1500,
    'Brute Force': 1500,
    'SQL Injection': 1000,
    'Malware': 1200,
    'Data Extortion': 800,
    'Ransomware': 700,
    'Botnet': 900,
}

def generate_clean():
    return {
        'url': f'https://legitimate-site.com/page/{random.randint(1,100)}',
        'packets': [], 'login_data': {}, 'query': 'normal query',
        'packet_size_mean': random.gauss(512, 100),
        'packets_per_second': random.uniform(1, 50),
        'syn_ratio': random.uniform(0.01, 0.05),
        'ack_ratio': random.uniform(0.4, 0.6),
        'rst_ratio': random.uniform(0, 0.02),
        'unique_ports': random.randint(1, 5),
        'unique_ips': random.randint(1, 3),
    }

def generate_phishing():
    suspicious_domains = ['paypa1.secure-login.tk', 'bank-verify.xyz', 'update-account.ml', 'secure-bank-login.ga']
    return {
        'url': f'https://{random.choice(suspicious_domains)}/verify?token={random.randint(10000,99999)}&redirect=true',
        'packets': [], 'login_data': {}, 'query': '',
        'packet_size_mean': random.gauss(300, 50),
        'packets_per_second': random.uniform(0.5, 5),
        'syn_ratio': random.uniform(0.01, 0.05),
        'ack_ratio': random.uniform(0.4, 0.6),
    }

def generate_ddos():
    return {
        'url': '', 'packets': [], 'login_data': {}, 'query': '',
        'packet_size_mean': random.gauss(64, 10),
        'packet_size_std': random.gauss(5, 2),
        'packets_per_second': random.uniform(10000, 1000000),
        'bytes_per_second': random.uniform(100000, 10000000),
        'syn_ratio': random.uniform(0.8, 0.99),
        'ack_ratio': random.uniform(0, 0.05),
        'rst_ratio': random.uniform(0, 0.05),
        'unique_ips': random.randint(100, 100000),
        'unique_ports': random.randint(1, 3),
    }

def generate_brute_force():
    return {
        'url': '/login', 'packets': [], 'query': '',
        'login_data': {
            'attempts_last_minute': random.randint(20, 200),
            'attempts_last_hour': random.randint(500, 5000),
            'unique_usernames': random.randint(1, 50),
            'failed_ratio': random.uniform(0.85, 1.0),
            'time_between_attempts': random.uniform(0.1, 2.0),
            'ip_reputation': random.uniform(0, 30),
            'request_rate': random.uniform(10, 100),
        },
        'packet_size_mean': random.gauss(200, 30),
        'packets_per_second': random.uniform(10, 200),
    }

def generate_sql_injection():
    payloads = [
        "' OR 1=1 --",
        "'; DROP TABLE users; --",
        "' UNION SELECT username, password FROM users --",
        "1' AND 1=1 UNION ALL SELECT NULL,NULL,NULL --",
        "admin'/*",
    ]
    return {
        'url': f'/search?q={random.choice(payloads)}',
        'query': random.choice(payloads),
        'packets': [], 'login_data': {},
        'packet_size_mean': random.gauss(400, 80),
        'packets_per_second': random.uniform(1, 20),
    }

def generate_malware():
    return {
        'url': f'https://cdn-{random.randint(1,99)}.malware-dist.{random.choice(["ru","cn","xyz"])}/payload.exe',
        'packets': [], 'login_data': {}, 'query': '',
        'packet_size_mean': random.gauss(1200, 200),
        'packet_size_std': random.gauss(150, 30),
        'packets_per_second': random.uniform(5, 100),
        'syn_ratio': random.uniform(0.1, 0.3),
        'ack_ratio': random.uniform(0.3, 0.6),
        'payload_entropy': random.uniform(7.0, 8.0),
        'unique_ports': random.randint(2, 10),
    }

def generate_data_extortion():
    return {
        'url': '', 'packets': [], 'login_data': {}, 'query': '',
        'packet_size_mean': random.gauss(8000, 1000),
        'bytes_per_second': random.uniform(500000, 5000000),
        'packets_per_second': random.uniform(100, 1000),
        'unique_ports': random.randint(1, 3),
        'payload_entropy': random.uniform(7.5, 8.0),
        'duration': random.uniform(300, 7200),
    }

def generate_ransomware():
    return {
        'url': f'https://c2-server-{random.randint(1,99)}.{random.choice(["ru","cn","io"])}/beacon',
        'packets': [], 'login_data': {}, 'query': '',
        'packet_size_mean': random.gauss(128, 20),
        'inter_arrival_mean': 300.0 + random.gauss(0, 5),
        'inter_arrival_std': random.gauss(1, 0.2),
        'packets_per_second': random.uniform(0.001, 0.01),
        'payload_entropy': random.uniform(7.8, 8.0),
    }

def generate_botnet():
    return {
        'url': '', 'packets': [], 'login_data': {}, 'query': '',
        'packet_size_mean': random.gauss(100, 20),
        'inter_arrival_mean': random.uniform(30, 3600),
        'packets_per_second': random.uniform(0.01, 5),
        'unique_ips': random.randint(10, 1000),
        'syn_ratio': random.uniform(0.05, 0.15),
        'payload_entropy': random.uniform(6.5, 7.5),
    }

GENERATORS = {
    'Clean': generate_clean,
    'Phishing': generate_phishing,
    'DDoS': generate_ddos,
    'Brute Force': generate_brute_force,
    'SQL Injection': generate_sql_injection,
    'Malware': generate_malware,
    'Data Extortion': generate_data_extortion,
    'Ransomware': generate_ransomware,
    'Botnet': generate_botnet,
}

if __name__ == '__main__':
    print("Generating training data...")
    
    all_features = []
    all_labels = []
    
    for attack_class, n_samples in N_PER_CLASS.items():
        generator = GENERATORS[attack_class]
        print(f"  Generating {n_samples} samples for {attack_class}...")
        
        for _ in range(n_samples):
            data = generator()
            features = FeatureExtractor.extract(data)
            all_features.append(features)
            all_labels.append(attack_class)
    
    X = np.array(all_features)
    y = np.array(all_labels)
    
    df = pd.DataFrame(X, columns=FeatureExtractor.FEATURE_NAMES)
    df['label'] = y
    
    os.makedirs('ml_models/training_data', exist_ok=True)
    df.to_csv('ml_models/training_data/training_data.csv', index=False)
    
    print(f"\nGenerated {len(df)} samples across {len(N_PER_CLASS)} classes.")
    print(f"Class distribution:\n{df['label'].value_counts()}")
    print(f"\nSaved to ml_models/training_data/training_data.csv")
    print("\nNext step: run train_models.py")
