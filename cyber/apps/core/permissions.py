from rest_framework import permissions

class IsOwnerOrAdmin(permissions.BasePermission):
    """
    Object-level permission to only allow owners of an object or admins to edit it.
    Assumes the model instance has an `owner`, `submitted_by`, `lead_analyst`, or `author` attribute.
    """
    
    def has_object_permission(self, request, view, obj):
        # Read permissions are allowed to any request (if the view allows it),
        # so we'll always allow GET, HEAD or OPTIONS requests.
        if request.method in permissions.SAFE_METHODS:
            return True

        # Write permissions are only allowed to the owner or admins.
        if request.user.role == 'admin' or request.user.is_superuser:
            return True
            
        # Check various possible owner fields
        if hasattr(obj, 'submitted_by') and obj.submitted_by == request.user:
            return True
        if hasattr(obj, 'lead_analyst') and obj.lead_analyst == request.user:
            return True
        if hasattr(obj, 'author') and obj.author == request.user:
            return True
        if hasattr(obj, 'owner') and obj.owner == request.user:
            return True
            
        return False
