from rest_framework import serializers
from .models import Complaint, TransactionHop

class TransactionHopSerializer(serializers.ModelSerializer):
    class Meta:
        model = TransactionHop
        fields = '__all__'
        read_only_fields = ['id', 'complaint', 'created_at', 'updated_at']


class ComplaintListSerializer(serializers.ModelSerializer):
    class Meta:
        model = Complaint
        fields = [
            'id', 'complaint_number', 'victim_name', 'victim_district',
            'fraud_amount', 'fraud_method', 'status', 'priority', 'created_at'
        ]

class ComplaintDetailSerializer(serializers.ModelSerializer):
    transaction_hops = TransactionHopSerializer(many=True, read_only=True)
    
    class Meta:
        model = Complaint
        fields = '__all__'
        read_only_fields = ['id', 'complaint_number', 'created_at', 'updated_at']

class ComplaintCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Complaint
        fields = '__all__'
        read_only_fields = ['id', 'complaint_number', 'created_at', 'updated_at']
