from rest_framework import serializers
from django.contrib.auth import authenticate
from .models import User
from organizations.models import Organization, OrganizationMembership


class OrganizationSimpleSerializer(serializers.ModelSerializer):
    class Meta:
        from organizations.models import Organization
        model = Organization
        fields = ['id', 'name', 'slug', 'domain', 'verification_status']


class UserSerializer(serializers.ModelSerializer):
    role = serializers.SerializerMethodField()
    active_organization_detail = OrganizationSimpleSerializer(source='active_organization', read_only=True)
    available_organizations = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = [
            'id', 'username', 'email', 'full_name', 'job_title', 
            'department', 'is_locked', 'active_organization', 
            'active_organization_detail', 'role', 'available_organizations',
            'is_staff'
        ]
        read_only_fields = ['id', 'is_locked', 'is_staff']

    def get_role(self, obj):
        if obj.active_organization:
            return obj.get_role_in_org(obj.active_organization)
        return None

    def get_available_organizations(self, obj):
        memberships = OrganizationMembership.objects.filter(user=obj, is_active=True).select_related('organization')
        return [
            {
                'id': str(m.organization.id),
                'name': m.organization.name,
                'slug': m.organization.slug,
                'domain': m.organization.domain,
                'role': m.role,
                'is_verified': m.organization.is_verified,
            }
            for m in memberships
        ]


class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=8)
    organization_name = serializers.CharField(write_only=True, required=False, allow_blank=True)

    class Meta:
        model = User
        fields = ['username', 'email', 'password', 'full_name', 'job_title', 'department', 'organization_name']

    def create(self, validated_data):
        org_name = validated_data.pop('organization_name', None)
        password = validated_data.pop('password')
        user = User(**validated_data)
        user.set_password(password)
        user.save()

        # If user registered with a new organization name
        if org_name:
            org = Organization.objects.create(name=org_name.strip())
            OrganizationMembership.objects.create(
                user=user,
                organization=org,
                role='ADMIN'
            )
            user.active_organization = org
            user.save(update_fields=['active_organization'])
        return user


class LoginSerializer(serializers.Serializer):
    username_or_email = serializers.CharField()
    password = serializers.CharField(write_only=True)

    def validate(self, attrs):
        identifier = attrs.get('username_or_email')
        password = attrs.get('password')

        user = None
        if '@' in identifier:
            user = User.objects.filter(email__iexact=identifier).first()
            if user:
                user = authenticate(username=user.username, password=password)
        else:
            user = authenticate(username=identifier, password=password)

        if not user:
            raise serializers.ValidationError("Invalid credentials or user does not exist.")
        if not user.is_active:
            raise serializers.ValidationError("This account has been disabled.")
        if user.is_locked:
            raise serializers.ValidationError("Account is locked due to security policy.")

        attrs['user'] = user
        return attrs
