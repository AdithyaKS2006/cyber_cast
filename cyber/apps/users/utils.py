import functools
import logging

from django_ratelimit.decorators import ratelimit

logger = logging.getLogger('crimecast')


def safe_ratelimit(key='ip', rate='5/h', method='POST'):
    """Rate limit decorator that fails open if cache unavailable."""
    def decorator(view_func):
        @functools.wraps(view_func)
        def wrapper(request, *args, **kwargs):
            try:
                return ratelimit(key=key, rate=rate, method=method, block=True)(view_func)(request, *args, **kwargs)
            except Exception as e:
                err_msg = str(e).lower()
                if 'cache' in err_msg or 'redis' in err_msg or 'connection' in err_msg:
                    logger.warning(
                        "Rate limiting unavailable (cache error): %s. Allowing request.", e
                    )
                    return view_func(request, *args, **kwargs)
                raise
        return wrapper
    return decorator
