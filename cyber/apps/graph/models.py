import uuid
from django.db import models
from apps.complaints.models import Complaint


class MuleNode(models.Model):
    NODE_TYPE_CHOICES = [
        ('VICTIM', 'Victim Account'),
        ('LAYER_1', 'Layer 1 Mule Account'),
        ('LAYER_2', 'Layer 2 Mule Account'),
        ('LAYER_3', 'Layer 3 Mule Account'),
        ('CASHOUT', 'Terminal Cash-Out Account'),
        ('CONFIRMED_MULE', 'Confirmed Multi-Case Mule Account'),
        ('UNKNOWN', 'Unknown Account'),
    ]


    FREEZE_STATUS_CHOICES = [
        ('UNFROZEN', 'Unfrozen'),
        ('PENDING', 'Freeze Pending'),
        ('FROZEN', 'Frozen'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    account_hash = models.CharField(max_length=64, unique=True, help_text="SHA-256 hash of Account Number + IFSC")
    bank_ifsc = models.CharField(max_length=20)
    bank_name = models.CharField(max_length=100, blank=True)
    node_type = models.CharField(max_length=20, choices=NODE_TYPE_CHOICES, default='UNKNOWN')
    risk_score = models.FloatField(default=0.0)
    freeze_status = models.CharField(max_length=20, choices=FREEZE_STATUS_CHOICES, default='UNFROZEN')
    total_volume = models.DecimalField(max_digits=16, decimal_places=2, default=0.00)
    transaction_count = models.IntegerField(default=0)
    first_seen = models.DateTimeField(auto_now_add=True)
    last_active = models.DateTimeField(auto_now=True)
    last_known_lat = models.FloatField(null=True, blank=True)
    last_known_lon = models.FloatField(null=True, blank=True)

    def __str__(self):
        return f"MuleNode({self.account_hash[:8]}... | {self.node_type} | Risk: {self.risk_score:.2f})"


class MuleEdge(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    source_node = models.ForeignKey(MuleNode, on_delete=models.CASCADE, related_name='outgoing')
    target_node = models.ForeignKey(MuleNode, on_delete=models.CASCADE, related_name='incoming')
    amount = models.DecimalField(max_digits=14, decimal_places=2)
    transaction_ref = models.CharField(max_length=100)
    timestamp = models.DateTimeField()
    hop_number = models.PositiveIntegerField()
    linked_complaint = models.ForeignKey(Complaint, on_delete=models.SET_NULL, null=True, blank=True, related_name='graph_edges')

    class Meta:
        unique_together = ('source_node', 'target_node', 'transaction_ref')

    def __str__(self):
        return f"MuleEdge(Hop {self.hop_number}: {self.source_node.account_hash[:6]} -> {self.target_node.account_hash[:6]} | ₹{self.amount})"
