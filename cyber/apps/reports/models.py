import uuid
from django.db import models
from django.contrib.auth import get_user_model

User = get_user_model()

class Report(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    generated_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='generated_reports')
    created_at = models.DateTimeField(auto_now_add=True)
    report_format = models.CharField(max_length=10, choices=[('pdf', 'PDF'), ('json', 'JSON'), ('stix', 'STIX')])
    status = models.CharField(max_length=20, default='generating', choices=[
        ('generating', 'Generating'),
        ('completed', 'Completed'),
        ('failed', 'Failed')
    ])
    file_path = models.CharField(max_length=255, blank=True)
    
    class Meta:
        ordering = ['-created_at']
        
    def __str__(self):
        return f"Report {self.id} ({self.report_format})"
