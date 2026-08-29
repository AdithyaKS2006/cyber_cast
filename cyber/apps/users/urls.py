from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView
from . import views

urlpatterns = [
    path('auth/login/', views.CustomTokenObtainPairView.as_view(), name='token_obtain'),
    path('auth/logout/', views.LogoutView.as_view(), name='logout'),
    path('auth/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('auth/register/', views.RegisterView.as_view(), name='register'),
    path('users/me/', views.MeView.as_view(), name='me'),
    path('users/', views.UserListView.as_view(), name='user_list'),
    path('users/<uuid:pk>/', views.UserDetailView.as_view(), name='user_detail'),
    path('users/<uuid:pk>/role/', views.UserRoleUpdateView.as_view(), name='user_role_update'),
    path('users/invite/', views.invite_user, name='invite_user'),
    path('users/sessions/<int:session_id>/revoke/', views.revoke_session, name='revoke_session'),
    path('audit-log/', views.AuditLogView.as_view(), name='audit_log'),
    path('auth/password/change/', views.PasswordChangeView.as_view(), name='password_change'),
    path('auth/password/reset/request/', views.PasswordResetRequestView.as_view(), name='password_reset_request'),
    path('auth/password/reset/confirm/', views.PasswordResetConfirmView.as_view(), name='password_reset_confirm'),
    path('auth/mfa/enable/', views.MFAEnableView.as_view(), name='mfa_enable'),
    path('auth/mfa/verify/', views.MFAVerifyView.as_view(), name='mfa_verify'),
    path('leaderboard/', views.LeaderboardView.as_view(), name='leaderboard'),
    path('users/gdpr/export/', views.gdpr_export, name='gdpr_export'),
    path('users/gdpr/delete/', views.gdpr_delete_account, name='gdpr_delete'),
]
