from rest_framework import serializers
from .models import Report

class ReportSerializer(serializers.ModelSerializer):
    class Meta:
        model = Report
        fields = '__all__'
        read_only_fields = ['id', 'generated_by', 'created_at', 'status', 'file_path']

class GenerateReportSerializer(serializers.Serializer):
    date_from = serializers.DateField(required=False)
    date_to = serializers.DateField(required=False)
    severity_filter = serializers.ListField(child=serializers.CharField(), required=False)
    format = serializers.ChoiceField(choices=['pdf', 'json', 'stix'])
    sections = serializers.ListField(child=serializers.CharField(), required=False)

class ScheduleReportSerializer(serializers.Serializer):
    frequency = serializers.ChoiceField(choices=['daily', 'weekly', 'monthly'])
    time = serializers.TimeField()
    email_recipients = serializers.ListField(child=serializers.EmailField())
    report_config = serializers.JSONField()
