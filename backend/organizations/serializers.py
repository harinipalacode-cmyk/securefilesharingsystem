from rest_framework import serializers
from .models import Organization, OrganizationMembership, OrganizationInvitation, VerificationStatus, OrgRole


class OrganizationSerializer(serializers.ModelSerializer):
    members_count = serializers.SerializerMethodField()
    is_verified = serializers.BooleanField(read_only=True)

    class Meta:
        model = Organization
        fields = [
            'id', 'name', 'slug', 'domain', 'description', 
            'verification_status', 'is_verified', 'verified_at', 
            'members_count', 'created_at'
        ]
        read_only_fields = ['id', 'slug', 'verification_status', 'verified_at', 'created_at']

    def get_members_count(self, obj):
        return obj.memberships.filter(is_active=True).count()


class OrganizationMembershipSerializer(serializers.ModelSerializer):
    user_email = serializers.EmailField(source='user.email', read_only=True)
    user_name = serializers.CharField(source='user.full_name', read_only=True)

    class Meta:
        model = OrganizationMembership
        fields = ['id', 'user', 'user_email', 'user_name', 'organization', 'role', 'is_active', 'joined_at']
        read_only_fields = ['id', 'joined_at']


class OrganizationInvitationSerializer(serializers.ModelSerializer):
    invited_by_name = serializers.CharField(source='invited_by.full_name', read_only=True)

    class Meta:
        model = OrganizationInvitation
        fields = ['id', 'organization', 'email', 'role', 'invited_by', 'invited_by_name', 'status', 'created_at', 'expires_at']
        read_only_fields = ['id', 'invited_by', 'status', 'created_at']
