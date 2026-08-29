from django.db import models
from django.db.models import UUIDField, CharField, JSONField, ForeignKey, DateTimeField, CASCADE
from uuid import uuid4

class GuruChatSession(models.Model):
    id = UUIDField(primary_key=True, default=uuid4)
    user = ForeignKey('users.User', on_delete=CASCADE, related_name='guru_sessions')
    title = CharField(max_length=200, blank=True)
    history = JSONField(default=list)  # List of {"role": "user"/"assistant", "content": "..."}
    created_at = DateTimeField(auto_now_add=True)
    updated_at = DateTimeField(auto_now=True)
