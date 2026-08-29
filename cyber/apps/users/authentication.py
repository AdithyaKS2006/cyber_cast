from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework_simplejwt.exceptions import InvalidToken, AuthenticationFailed


class CookieJWTAuthentication(JWTAuthentication):
    """
    Authenticates via JWT stored in HttpOnly cookies.
    CSRF enforcement is intentionally skipped — JWTs in HttpOnly cookies
    with SameSite=Lax are already CSRF-safe, and double-enforcement
    breaks mutation requests from the React frontend.
    """
    def authenticate(self, request):
        header = self.get_header(request)

        if header is not None:
            raw_token = self.get_raw_token(header)
        else:
            raw_token = request.COOKIES.get('access_token') or None

        if raw_token is None:
            return None

        try:
            validated_token = self.get_validated_token(raw_token)
        except InvalidToken:
            raise AuthenticationFailed('Token is invalid or expired')

        return self.get_user(validated_token), validated_token
