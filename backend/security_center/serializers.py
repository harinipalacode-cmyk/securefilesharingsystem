from rest_framework import serializers
from .models import SecurityAlert, AlertSeverity, AlertType


class SecurityAlertSerializer(serializers.ModelSerializer):
    resolved_by_name = serializers.CharField(source='resolved_by.full_name', read_only=True)
    resolved_by_email = serializers.CharField(source='resolved_by.email', read_only=True)
    severity_display = serializers.CharField(source='get_severity_display', read_only=True)
    alert_type_display = serializers.CharField(source='get_alert_type_display', read_only=True)

    class Meta:
        model = SecurityAlert
        fields = [
            'id', 'organization', 'alert_type', 'alert_type_display',
            'severity', 'severity_display', 'title', 'description',
            'status', 'created_at', 'resolved_at', 'resolved_by',
            'resolved_by_name', 'resolved_by_email', 'resolution_notes'
        ]
        read_only_fields = ['id', 'organization', 'created_at', 'resolved_at', 'resolved_by']
