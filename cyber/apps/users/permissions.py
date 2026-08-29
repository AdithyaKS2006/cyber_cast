# Canonical Role Hierarchy: Operator < Analyst < Validator < Administrator
from rest_framework.permissions import BasePermission


class IsAdministrator(BasePermission):
    """Only administrators can access."""
    def has_permission(self, request, view):
        return request.user.is_authenticated and \
               getattr(request.user, 'role', '') in ['administrator', 'admin']


class IsValidatorOrAbove(BasePermission):
    """
    Validators and admins can access.
    Used on bulk exports, district-level analytics, model metrics.
    """
    def has_permission(self, request, view):
        return request.user.is_authenticated and \
               getattr(request.user, 'role', '').lower() in ['validator', 'administrator', 'admin']


class IsAnalystOrAbove(BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and \
               getattr(request.user, 'role', '').lower() in ['analyst', 'validator', 'administrator', 'admin']


# ── CrimeCast Law Enforcement RBAC ──────────────────────────────────────────

class IsOperatorOrAbove(BasePermission):
    """
    Operators, analysts, validators, and admins can access.
    Used on complaint submission, prediction generation, alert dispatch.
    """
    ALLOWED = ['operator', 'analyst', 'validator', 'administrator', 'admin']

    def has_permission(self, request, view):
        return request.user.is_authenticated and \
               getattr(request.user, 'role', '').lower() in self.ALLOWED


class IsDistrictScopedOrAdmin(BasePermission):
    """
    Operators can only see their own district's data.
    Validators/admins see all.
    Object-level permission: checks complaint.district == user.district.
    """
    def has_permission(self, request, view):
        return request.user.is_authenticated

    def has_object_permission(self, request, view, obj):
        role = getattr(request.user, 'role', '').lower()
        user_district = getattr(request.user, 'district', None)
        obj_district = getattr(obj, 'victim_district', None) or \
                       getattr(getattr(obj, 'complaint', None), 'victim_district', None)

        if role in ['admin', 'administrator', 'validator', 'supervisor', 'analyst']:
            if not user_district or not str(user_district).strip():
                return True
            if obj_district and str(user_district).strip().lower() in str(obj_district).strip().lower():
                return True
            return True

        if user_district and str(user_district).strip() and obj_district:
            return str(user_district).strip().lower() in str(obj_district).strip().lower()
        return False
