from rest_framework import serializers
from .models import SecureDocument, DocumentVersion, DocumentClassification, DocumentStatus


class DocumentVersionSerializer(serializers.ModelSerializer):
    uploaded_by_email = serializers.EmailField(source='uploaded_by.email', read_only=True)
    uploaded_by_name = serializers.CharField(source='uploaded_by.full_name', read_only=True)

    class Meta:
        model = DocumentVersion
        fields = [
            'id', 'version_number', 'file_name', 'file_size', 
            'mime_type', 'sha256_hash', 'uploaded_by', 
            'uploaded_by_email', 'uploaded_by_name', 
            'change_summary', 'created_at'
        ]
        read_only_fields = ['id', 'version_number', 'sha256_hash', 'uploaded_by', 'created_at']


class SecureDocumentSerializer(serializers.ModelSerializer):
    organization_name = serializers.CharField(source='organization.name', read_only=True)
    owner_email = serializers.EmailField(source='owner.email', read_only=True)
    owner_name = serializers.CharField(source='owner.full_name', read_only=True)
    latest_version = DocumentVersionSerializer(read_only=True)
    versions = DocumentVersionSerializer(many=True, read_only=True)
    versions_count = serializers.SerializerMethodField()
    is_owner = serializers.SerializerMethodField()

    class Meta:
        model = SecureDocument
        fields = [
            'id', 'organization', 'organization_name', 'owner', 
            'owner_email', 'owner_name', 'title', 'description', 
            'classification', 'status', 'created_at', 'updated_at', 
            'latest_version', 'versions', 'versions_count', 'is_owner'
        ]
        read_only_fields = ['id', 'organization', 'owner', 'created_at', 'updated_at']

    def get_versions_count(self, obj):
        return obj.versions.count()

    def get_is_owner(self, obj):
        request = self.context.get('request')
        if request and request.user:
            return obj.owner_id == request.user.id
        return False
