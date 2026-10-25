from rest_framework import serializers
from .models import AuditEvent, EventType


class AuditEventSerializer(serializers.ModelSerializer):
    actor_name = serializers.CharField(source='actor.full_name', read_only=True, default='')
    event_type_display = serializers.CharField(source='get_event_type_display', read_only=True)

    class Meta:
        model = AuditEvent
        fields = [
            'id', 'timestamp', 'actor', 'actor_name', 'actor_email',
            'organization', 'event_type', 'event_type_display',
            'resource_type', 'resource_id', 'resource_name',
            'ip_address', 'outcome', 'details'
        ]
        read_only_fields = ['id', 'timestamp']
