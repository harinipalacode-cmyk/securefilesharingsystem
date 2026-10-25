from rest_framework import serializers
from .models import DocumentShare, AccessRequest, ShareType, SharePermission, ShareStatus
from documents.models import SecureDocument
from organizations.models import Organization
from accounts.models import User


class DocumentShareSerializer(serializers.ModelSerializer):
    document_title = serializers.CharField(source='document.title', read_only=True)
    document_classification = serializers.CharField(source='document.classification', read_only=True)
    sender_org_name = serializers.CharField(source='sender_organization.name', read_only=True)
    sender_email = serializers.CharField(source='sender.email', read_only=True)
    sender_name = serializers.CharField(source='sender.full_name', read_only=True)
    recipient_org_name = serializers.CharField(source='recipient_organization.name', read_only=True)
    recipient_user_name = serializers.CharField(source='recipient_user.full_name', read_only=True, default='')
    is_expired = serializers.BooleanField(read_only=True)

    class Meta:
        model = DocumentShare
        fields = [
            'id', 'document', 'document_title', 'document_classification',
            'share_type', 'sender_organization', 'sender_org_name',
            'sender', 'sender_email', 'sender_name',
            'recipient_organization', 'recipient_org_name',
            'recipient_user', 'recipient_user_name', 'recipient_email',
            'permission', 'can_share_onward', 'requires_approval',
            'status', 'expires_at', 'is_expired', 'created_at', 'updated_at',
            'revoked_at', 'revocation_reason'
        ]
        read_only_fields = ['id', 'share_type', 'sender_organization', 'sender', 'status', 'created_at', 'updated_at']


class AccessRequestSerializer(serializers.ModelSerializer):
    document_title = serializers.CharField(source='document.title', read_only=True)
    requester_email = serializers.CharField(source='requester.email', read_only=True)
    requester_name = serializers.CharField(source='requester.full_name', read_only=True)
    org_name = serializers.CharField(source='organization.name', read_only=True)

    class Meta:
        model = AccessRequest
        fields = [
            'id', 'document', 'document_title', 'requester',
            'requester_email', 'requester_name', 'organization', 'org_name',
            'requested_permission', 'reason', 'status', 'reviewed_by',
            'reviewed_at', 'review_notes', 'created_at'
        ]
        read_only_fields = ['id', 'requester', 'organization', 'status', 'reviewed_by', 'reviewed_at', 'created_at']
