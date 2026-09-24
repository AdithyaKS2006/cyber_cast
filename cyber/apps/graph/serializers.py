from rest_framework import serializers
from apps.graph.models import MuleNode, MuleEdge


class MuleNodeSerializer(serializers.ModelSerializer):
    class Meta:
        model = MuleNode
        fields = [
            'id', 'account_hash', 'bank_ifsc', 'bank_name', 'node_type',
            'risk_score', 'freeze_status', 'total_volume', 'transaction_count',
            'first_seen', 'last_active', 'last_known_lat', 'last_known_lon'
        ]


class MuleEdgeSerializer(serializers.ModelSerializer):
    source_account_hash = serializers.CharField(source='source_node.account_hash', read_only=True)
    target_account_hash = serializers.CharField(source='target_node.account_hash', read_only=True)

    class Meta:
        model = MuleEdge
        fields = [
            'id', 'source_node', 'source_account_hash', 'target_node', 'target_account_hash',
            'amount', 'transaction_ref', 'timestamp', 'hop_number', 'linked_complaint'
        ]
