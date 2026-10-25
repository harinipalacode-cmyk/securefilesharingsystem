from rest_framework import serializers
from .models import DocumentApproval, ApprovalStatus
from sharing.serializers import DocumentShareSerializer


class DocumentApprovalSerializer(serializers.ModelSerializer):
    share_detail = DocumentShareSerializer(source='share', read_only=True)
    requested_by_name = serializers.CharField(source='requested_by.full_name', read_only=True)
    requested_by_email = serializers.CharField(source='requested_by.email', read_only=True)
    decision_by_name = serializers.CharField(source='decision_by.full_name', read_only=True)

    class Meta:
        model = DocumentApproval
        fields = [
            'id', 'share', 'share_detail', 'requested_by', 
            'requested_by_name', 'requested_by_email', 'status', 
            'decision_by', 'decision_by_name', 'decision_at', 
            'decision_notes', 'created_at'
        ]
        read_only_fields = ['id', 'share', 'requested_by', 'status', 'decision_by', 'decision_at', 'created_at']
