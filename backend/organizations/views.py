from rest_framework import status, permissions
from rest_framework.views import APIView
from rest_framework.response import Response
from django.shortcuts import get_object_or_404
from django.utils import timezone
from .models import Organization, OrganizationMembership, VerificationStatus, OrgRole
from .serializers import OrganizationSerializer, OrganizationMembershipSerializer
from audit.models import log_audit_event, EventType
from accounts.models import User


class OrganizationListCreateView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        qs = Organization.objects.all().order_by('name')
        verified_only = request.query_params.get('verified')
        if verified_only == 'true':
            qs = qs.filter(verification_status=VerificationStatus.VERIFIED)
        return Response(OrganizationSerializer(qs, many=True).data)

    def post(self, request):
        serializer = OrganizationSerializer(data=request.data)
        if serializer.is_valid():
            org = serializer.save()
            # Assign creator as ADMIN
            OrganizationMembership.objects.create(
                user=request.user,
                organization=org,
                role=OrgRole.ADMIN
            )
            # Switch active organization to new org if none set
            if not request.user.active_organization:
                request.user.active_organization = org
                request.user.save(update_fields=['active_organization'])
            
            log_audit_event(
                event_type=EventType.ROLE_CHANGE,
                actor=request.user,
                organization=org,
                details={'action': 'created_organization', 'org_name': org.name}
            )
            return Response(OrganizationSerializer(org).data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class OrganizationDetailView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, pk):
        org = get_object_or_404(Organization, pk=pk)
        return Response(OrganizationSerializer(org).data)


class OrganizationMembersView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, pk):
        org = get_object_or_404(Organization, pk=pk)
        members = OrganizationMembership.objects.filter(organization=org, is_active=True).select_related('user')
        return Response(OrganizationMembershipSerializer(members, many=True).data)

    def post(self, request, pk):
        org = get_object_or_404(Organization, pk=pk)
        # Check permissions: requester must be ADMIN or MANAGER
        role = request.user.get_role_in_org(org)
        if role not in [OrgRole.ADMIN, OrgRole.MANAGER]:
            return Response({'error': 'Only Organization Admins or Managers can add members.'}, status=status.HTTP_403_FORBIDDEN)

        email = request.data.get('email', '').strip()
        new_role = request.data.get('role', OrgRole.MEMBER)

        user = User.objects.filter(email__iexact=email).first()
        if not user:
            return Response({'error': f'User with email {email} not found in SecureShare.'}, status=status.HTTP_404_NOT_FOUND)

        membership, created = OrganizationMembership.objects.get_or_create(
            user=user,
            organization=org,
            defaults={'role': new_role, 'is_active': True}
        )
        if not created:
            membership.role = new_role
            membership.is_active = True
            membership.save()

        log_audit_event(
            event_type=EventType.MEMBER_INVITED,
            actor=request.user,
            organization=org,
            details={'target_user': email, 'assigned_role': new_role}
        )

        return Response(OrganizationMembershipSerializer(membership).data, status=status.HTTP_201_CREATED)


class OrganizationVerifyView(APIView):
    """Platform Admin or Security Officer can verify an organization's identity."""
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        org = get_object_or_404(Organization, pk=pk)
        org.verification_status = VerificationStatus.VERIFIED
        org.verified_at = timezone.now()
        org.verified_by = request.user
        org.verification_notes = request.data.get('notes', 'Verified by compliance officer.')
        org.save()
        
        log_audit_event(
            event_type=EventType.ROLE_CHANGE,
            actor=request.user,
            organization=org,
            details={'action': 'organization_verified'}
        )
        return Response(OrganizationSerializer(org).data)
