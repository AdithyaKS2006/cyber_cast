from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from django.db.models import Q
from .models import User, UserSession, UserCertification, AuditLog


class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.fields['email'] = serializers.CharField(required=False, allow_blank=True)
        self.fields['username'] = serializers.CharField(required=False, allow_blank=True)
        self.fields['totp_code'] = serializers.CharField(required=False, allow_blank=True, max_length=6)
            
    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)
        token['role'] = user.role
        token['name'] = user.get_full_name()
        token['avatar'] = user.avatar_initials
        token['xp'] = user.xp_points
        return token
    
    def validate(self, attrs):
        login_id = attrs.get('email') or attrs.get('username')
        password = attrs.get('password')

        if not login_id:
            raise serializers.ValidationError('Email or username is required.')

        user = User.objects.filter(Q(email__iexact=login_id) | Q(username__iexact=login_id)).first()
        if user:
            is_valid_pw = user.check_password(password)
            if is_valid_pw:
                self.user = user
            else:
                raise serializers.ValidationError('Invalid credentials')
        else:
            raise serializers.ValidationError('Invalid credentials')

        if not self.user.is_active:
            raise serializers.ValidationError('Account is disabled')

        # MFA Verification
        if self.user.mfa_enabled:
            totp_code = attrs.get('totp_code')
            if not totp_code:
                # Signal to frontend that MFA is required
                raise serializers.ValidationError({'mfa_required': True, 'detail': 'MFA code is required.'})
            import pyotp
            totp = pyotp.TOTP(self.user.totp_secret)
            
            # Check if it's a valid TOTP
            if not totp.verify(totp_code):
                # If not, check if it's a valid backup code
                backup_codes = self.user.backup_codes or []
                if totp_code in backup_codes:
                    # Remove used backup code
                    backup_codes.remove(totp_code)
                    self.user.backup_codes = backup_codes
                    self.user.save(update_fields=['backup_codes'])
                else:
                    raise serializers.ValidationError({'totp_code': 'Invalid TOTP or Backup code.'})

        data = {}
        refresh = self.get_token(self.user)
        data['refresh'] = str(refresh)
        data['access'] = str(refresh.access_token)

        # Add current device parsing
        current_device = "Unknown Device"
        request = self.context.get('request')
        if request and hasattr(request, 'META'):
            user_agent = request.META.get('HTTP_USER_AGENT', '')
            try:
                from user_agents import parse
                ua = parse(user_agent)
                device_type = 'Mobile' if ua.is_mobile else 'Tablet' if ua.is_tablet else 'Desktop' if ua.is_pc else 'Device'
                current_device = f"{ua.os.family} {ua.os.version_string} ({device_type})"
            except ImportError:
                pass

        data['user'] = {
            'id': str(self.user.id),
            'name': self.user.get_full_name(),
            'email': self.user.email,
            'role': self.user.role,
            'avatar': self.user.avatar_initials,
            'xp': self.user.xp_points,
            'rank': self.user.rank,
            'current_device': current_device,
        }
        return data


class UserSerializer(serializers.ModelSerializer):
    full_name = serializers.SerializerMethodField()
    achievements_count = serializers.SerializerMethodField()
    current_device = serializers.SerializerMethodField()
    
    class Meta:
        model = User
        fields = [
            'id', 'username', 'email', 'first_name', 'last_name', 'full_name', 'role',
            'avatar_initials', 'reputation_score', 'xp_points', 'rank', 'achievements_count',
            'skill_threat_analysis', 'skill_malware',
            'skill_incident_response', 'skill_threat_hunting', 'skill_ai_ml',
            'theme', 'mfa_enabled', 'created_at', 'last_seen',
            'current_device'
        ]
        # SECURITY: role, email, username, mfa_enabled MUST be read-only to prevent
        # privilege escalation via PATCH /api/v1/users/me/
        read_only_fields = [
            'id', 'role', 'email', 'username', 'mfa_enabled',
            'reputation_score', 'xp_points', 'rank',
            'created_at', 'last_seen', 'avatar_initials',
        ]
    
    def get_full_name(self, obj):
        return obj.get_full_name() or obj.username

    def get_achievements_count(self, obj):
        return obj.certifications.count() if hasattr(obj, 'certifications') else 0
        
    def get_current_device(self, obj):
        # The request user is the one fetching their own profile
        request = self.context.get('request')
        if request and hasattr(request, 'META'):
            user_agent = request.META.get('HTTP_USER_AGENT', '')
            try:
                from user_agents import parse
                ua = parse(user_agent)
                device_type = 'Mobile' if ua.is_mobile else 'Tablet' if ua.is_tablet else 'Desktop' if ua.is_pc else 'Device'
                return f"{ua.os.family} {ua.os.version_string} ({device_type})"
            except ImportError:
                # Fallback to fetching latest active session
                session = obj.sessions.filter(is_active=True).order_by('-last_active').first()
                if session:
                    return session.device.split('|')[0].strip() if '|' in session.device else session.device
        return "Unknown Device"


class MeUpdateSerializer(serializers.ModelSerializer):
    """
    Safe serializer for PATCH /api/v1/users/me/.
    Only exposes non-security-sensitive profile fields.
    Role, email, username, mfa_enabled are NOT writable here.
    """
    class Meta:
        model = User
        fields = [
            'first_name', 'last_name', 'theme',
            'skill_threat_analysis', 'skill_malware',
            'skill_incident_response', 'skill_threat_hunting', 'skill_ai_ml',
            'notifications_email', 'notifications_slack',
        ]


class UserRegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=8)
    confirm_password = serializers.CharField(write_only=True)
    
    class Meta:
        model = User
        fields = ['username', 'email', 'first_name', 'last_name', 'password', 'confirm_password']
    
    def validate(self, attrs):
        if attrs['password'] != attrs.pop('confirm_password'):
            raise serializers.ValidationError({'password': 'Passwords do not match'})
        # SECURITY: Self-serve registration ALWAYS assigns lowest-privilege 'analyst' role.
        # Role escalation must be performed via admin-only endpoint /api/v1/users/<uuid>/role/.
        attrs['role'] = 'analyst'
        return attrs
    
    def create(self, validated_data):
        user = User.objects.create_user(**validated_data)
        return user


class UserSessionSerializer(serializers.ModelSerializer):
    class Meta:
        model = UserSession
        fields = ['id', 'device', 'ip_address', 'is_active', 'created_at', 'last_active']


class CertificationSerializer(serializers.ModelSerializer):
    class Meta:
        model = UserCertification
        fields = '__all__'
        read_only_fields = ['user']





class AuditLogSerializer(serializers.ModelSerializer):
    user_name = serializers.CharField(source='user.get_full_name', read_only=True)
    actor_masked = serializers.SerializerMethodField()
    
    class Meta:
        model = AuditLog
        fields = '__all__'
    
    def get_actor_masked(self, obj):
        if not obj.user:
            return 'System'
        name = obj.user.get_full_name()
        parts = name.split()
        if len(parts) >= 2:
            return f"{parts[0][0]}. {parts[1][:2]}***"
        return name[:3] + '***'

class PasswordChangeSerializer(serializers.Serializer):
    current_password = serializers.CharField(write_only=True)
    new_password = serializers.CharField(write_only=True, min_length=8)
    confirm_password = serializers.CharField(write_only=True)
    
    def validate(self, attrs):
        if attrs['new_password'] != attrs['confirm_password']:
            raise serializers.ValidationError({"new_password": "New passwords do not match."})
        return attrs

class PasswordResetRequestSerializer(serializers.Serializer):
    email = serializers.EmailField()

class PasswordResetConfirmSerializer(serializers.Serializer):
    token = serializers.CharField()
    new_password = serializers.CharField(write_only=True, min_length=8)
    confirm_password = serializers.CharField(write_only=True)

    def validate(self, attrs):
        if attrs['new_password'] != attrs['confirm_password']:
            raise serializers.ValidationError({"new_password": "New passwords do not match."})
        return attrs

class MFAVerifySerializer(serializers.Serializer):
    totp_code = serializers.CharField(max_length=6, min_length=6)
