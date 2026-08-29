from prometheus_client import Counter, Histogram, Gauge
import time

# Custom business metrics
ioc_classifications = Counter(
    'crimecast_ioc_classifications_total',
    'Total IoC classifications performed',
    ['attack_class', 'model_name']
)

ml_inference_duration = Histogram(
    'crimecast_ml_inference_seconds',
    'ML model inference time in seconds',
    ['model_name'],
    buckets=[0.01, 0.05, 0.1, 0.25, 0.5, 1.0, 2.5, 5.0]
)

active_websocket_connections = Gauge(
    'crimecast_websocket_connections',
    'Number of active WebSocket connections',
    ['consumer_type']
)

threat_feed_size = Gauge(
    'crimecast_threat_feed_size',
    'Total number of IoCs in threat feed',
    ['severity']
)

sandbox_jobs_total = Counter(
    'crimecast_sandbox_jobs_total',
    'Total sandbox detonation jobs',
    ['status', 'target_os']
)


# Context manager for timing ML inference
class measure_ml_inference:
    def __init__(self, model_name):
        self.model_name = model_name
        self.start = None

    def __enter__(self):
        self.start = time.time()
        return self

    def __exit__(self, *args):
        duration = time.time() - self.start
        ml_inference_duration.labels(model_name=self.model_name).observe(duration)
