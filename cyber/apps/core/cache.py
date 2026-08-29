from django.core.cache import cache
from functools import wraps
import hashlib
import json
from rest_framework.response import Response

def cache_response(timeout=300, key_prefix=''):
    def decorator(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            # Build a cache key from request path and params
            request = args[1] if len(args) > 1 and hasattr(args[1], 'GET') else None
            if request:
                path = request.get_full_path()
            else:
                path = json.dumps(str(args) + str(kwargs), sort_keys=True)
            cache_key = f"{key_prefix}:{hashlib.sha256(str(path).encode()).hexdigest()}"

            cached = cache.get(cache_key)
            if cached is not None:
                return Response(cached)

            result = func(*args, **kwargs)
            if isinstance(result, Response):
                cache.set(cache_key, result.data, timeout)
            else:
                cache.set(cache_key, result, timeout)
            return result
        return wrapper
    return decorator
