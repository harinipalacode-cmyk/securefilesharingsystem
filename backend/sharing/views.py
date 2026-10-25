from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import status, permissions
from rest_framework.views import APIView
from rest_framework.response import Response

from .models import DocumentShare, AccessRequest, ShareType, SharePermission, ShareStatus
from .serializers import DocumentShareSerializer, AccessRequestSerializer
from documents.models import SecureDocument, DocumentClassification
from organizations.models import Organization
from accounts.models import User
from approvals.models import DocumentApproval, ApprovalStatus
from audit.models import log_audit_event, EventType
from notifications.models import create_notification, NotificationType
from security_center.models import trigger_security_alert, AlertType, AlertSeverity


def get_client_ip(request):
    x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
    if x_forwarded_for:
        return x_forwarded_for.split(',')[0].strip()
    return request.META.get('REMOTE_ADDR')


class ShareListCreateView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        user = request.user
        org = user.active_organization
        view_type = request.query_params.get('view', 'received')

        if view_type == 'sent':
            qs = DocumentShare.objects.filter(sender=user)
            if org:
                qs = DocumentShare.objects.filter(sender_organization=org)
        else: # received
            qs = DocumentShare.objects.filter(
                recipient_user=user
            ) | DocumentShare.objects.filter(
                recipient_email__iexact=user.email
            )
            if org:
                qs = qs | DocumentShare.objects.filter(
                    recipient_organization=org,
                    recipient_user__isnull=True
                )

        status_param = request.query_params.get('status')
        if status_param:
            qs = qs.filter(status=status_param)

        qs = qs.select_related('document', 'sender', 'sender_organization', 'recipient_organization', 'recipient_user').order_by('-created_at')
        return Response(DocumentShareSerializer(qs, many=True).data)

    def post(self, request):
        user = request.user
        sender_org = user.active_organization
        if not sender_org:
            return Response({'error': 'Active organization required to share documents.'}, status=status.HTTP_400_BAD_REQUEST)

        document_id = request.data.get('document_id')
        document = get_object_or_404(SecureDocument, pk=document_id)

        # Check permission: user must be owner or have can_share_onward
        if document.owner_id != user.id and document.organization_id != sender_org.id:
            # Check if user has received share with can_share_onward
            existing_share = DocumentShare.objects.filter(
                document=document,
                status=ShareStatus.ACTIVE,
                can_share_onward=True
            ).filter(recipient_user=user).first()
            if not existing_share:
                return Response({'error': 'You do not have permission to share this document.'}, status=status.HTTP_403_FORBIDDEN)

        recipient_org_id = request.data.get('recipient_organization_id')
        if not recipient_org_id:
            return Response({'error': 'recipient_organization_id is required.'}, status=status.HTTP_400_BAD_REQUEST)
        recipient_org = get_object_or_404(Organization, pk=recipient_org_id)

        recipient_email = request.data.get('recipient_email', '').strip()
        recipient_user = None
        if recipient_email:
            recipient_user = User.objects.filter(email__iexact=recipient_email).first()

        permission = request.data.get('permission', SharePermission.DOWNLOAD_DOCUMENT)
        can_share_onward = request.data.get('can_share_onward', False)
        requires_approval = request.data.get('requires_approval', False)
        expires_at = request.data.get('expires_at')

        # Create Share
        share = DocumentShare(
            document=document,
            sender_organization=sender_org,
            sender=user,
            recipient_organization=recipient_org,
            recipient_user=recipient_user,
            recipient_email=recipient_email,
            permission=permission,
            can_share_onward=can_share_onward,
            requires_approval=requires_approval,
            expires_at=expires_at if expires_at else None
        )
        share.save()

        event_type = EventType.SHARE_INTERNAL_CREATE if share.share_type == ShareType.INTERNAL else EventType.SHARE_EXTERNAL_CREATE
        log_audit_event(
            event_type=event_type,
            actor=user,
            organization=sender_org,
            resource_type='SHARE',
            resource_id=share.id,
            resource_name=f"{document.title} -> {recipient_org.name}",
            ip_address=get_client_ip(request),
            details={
                'document_title': document.title,
                'recipient_org': recipient_org.name,
                'recipient_email': recipient_email,
                'permission': permission,
                'requires_approval': requires_approval
            }
        )

        # If requires_approval, create DocumentApproval record
        if requires_approval:
            DocumentApproval.objects.create(
                share=share,
                requested_by=user,
                status=ApprovalStatus.PENDING
            )
            # Notify org security officers/managers
            from organizations.models import OrganizationMembership, OrgRole
            officers = OrganizationMembership.objects.filter(
                organization=sender_org,
                role__in=[OrgRole.SECURITY_OFFICER, OrgRole.ADMIN, OrgRole.MANAGER],
                is_active=True
            ).select_related('user')
            for officer in officers:
                create_notification(
                    recipient=officer.user,
                    title="Cross-Org Share Approval Required",
                    message=f"{user.full_name or user.email} requested approval to share '{document.title}' with {recipient_org.name}.",
                    notification_type=NotificationType.APPROVAL_REQUIRED
                )
        else:
            # If recipient exists, notify them
            if recipient_user:
                create_notification(
                    recipient=recipient_user,
                    title="New Secure Document Shared With You",
                    message=f"{user.full_name or user.email} from {sender_org.name} shared '{document.title}' with you.",
                    notification_type=NotificationType.INCOMING_SHARE
                )

        return Response(DocumentShareSerializer(share).data, status=status.HTTP_201_CREATED)


class ShareDetailView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, pk):
        share = get_object_or_404(DocumentShare, pk=pk)
        return Response(DocumentShareSerializer(share).data)


class ShareAcceptView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        share = get_object_or_404(DocumentShare, pk=pk)
        user = request.user

        if share.recipient_user and share.recipient_user_id != user.id and share.recipient_email != user.email:
            return Response({'error': 'You are not the designated recipient.'}, status=status.HTTP_403_FORBIDDEN)

        if share.status not in [ShareStatus.PENDING_ACCEPTANCE, ShareStatus.PENDING_APPROVAL]:
            return Response({'error': f'Share cannot be accepted in status {share.status}.'}, status=status.HTTP_400_BAD_REQUEST)

        share.status = ShareStatus.ACTIVE
        if not share.recipient_user:
            share.recipient_user = user
        share.save()

        log_audit_event(
            event_type=EventType.SHARE_ACCEPT,
            actor=user,
            organization=share.recipient_organization,
            resource_type='SHARE',
            resource_id=share.id,
            resource_name=share.document.title,
            ip_address=get_client_ip(request)
        )

        create_notification(
            recipient=share.sender,
            title="Share Invitation Accepted",
            message=f"{user.full_name or user.email} accepted access to '{share.document.title}'.",
            notification_type=NotificationType.SHARE_ACCEPTED
        )

        return Response(DocumentShareSerializer(share).data)


class ShareRejectView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        share = get_object_or_404(DocumentShare, pk=pk)
        share.status = ShareStatus.REJECTED
        share.save(update_fields=['status'])

        log_audit_event(
            event_type=EventType.SHARE_REJECT,
            actor=request.user,
            organization=share.recipient_organization,
            resource_type='SHARE',
            resource_id=share.id,
            resource_name=share.document.title,
            ip_address=get_client_ip(request)
        )

        create_notification(
            recipient=share.sender,
            title="Share Invitation Rejected",
            message=f"{request.user.full_name or request.user.email} declined access to '{share.document.title}'.",
            notification_type=NotificationType.SHARE_REJECTED
        )

        return Response(DocumentShareSerializer(share).data)


class ShareRevokeView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        share = get_object_or_404(DocumentShare, pk=pk)
        user = request.user

        # Permitted if sender or sender org admin/security officer
        can_revoke = (share.sender_id == user.id) or (user.get_role_in_org(share.sender_organization) in ['ADMIN', 'SECURITY_OFFICER'])
        if not can_revoke:
            return Response({'error': 'You do not have permission to revoke this share.'}, status=status.HTTP_403_FORBIDDEN)

        reason = request.data.get('reason', 'Revoked by data custodian or security officer.')
        share.status = ShareStatus.REVOKED
        share.revoked_at = timezone.now()
        share.revoked_by = user
        share.revocation_reason = reason
        share.save()

        log_audit_event(
            event_type=EventType.SHARE_REVOKE,
            actor=user,
            organization=share.sender_organization,
            resource_type='SHARE',
            resource_id=share.id,
            resource_name=share.document.title,
            ip_address=get_client_ip(request),
            details={'reason': reason}
        )

        # Trigger security alert if confidential
        if share.document.classification in [DocumentClassification.CONFIDENTIAL, DocumentClassification.HIGHLY_CONFIDENTIAL]:
            trigger_security_alert(
                organization=share.sender_organization,
                alert_type=AlertType.SENSITIVE_SHARE_REVOKED,
                severity=AlertSeverity.MEDIUM,
                title=f"Sensitive Share Revoked: {share.document.title}",
                description=f"Share grant to {share.recipient_organization.name} was revoked by {user.email}. Reason: {reason}"
            )

        if share.recipient_user:
            create_notification(
                recipient=share.recipient_user,
                title="Document Access Revoked",
                message=f"Access to '{share.document.title}' was revoked by {share.sender_organization.name}.",
                notification_type=NotificationType.SHARE_REVOKED
            )

        return Response(DocumentShareSerializer(share).data)


class AccessRequestListCreateView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        user = request.user
        org = user.active_organization
        # Either requests made by user, or requests targeting user's org documents
        qs = AccessRequest.objects.filter(requester=user)
        if org:
            qs = qs | AccessRequest.objects.filter(document__organization=org)
        qs = qs.select_related('document', 'requester', 'organization').order_by('-created_at')
        return Response(AccessRequestSerializer(qs.distinct(), many=True).data)

    def post(self, request):
        user = request.user
        org = user.active_organization
        if not org:
            return Response({'error': 'Active organization required.'}, status=status.HTTP_400_BAD_REQUEST)

        document_id = request.data.get('document_id')
        document = get_object_or_404(SecureDocument, pk=document_id)
        reason = request.data.get('reason', '')
        permission = request.data.get('requested_permission', SharePermission.DOWNLOAD_DOCUMENT)

        req = AccessRequest.objects.create(
            document=document,
            requester=user,
            organization=org,
            requested_permission=permission,
            reason=reason
        )

        log_audit_event(
            event_type=EventType.ACCESS_REQUEST_CREATE,
            actor=user,
            organization=org,
            resource_type='DOCUMENT',
            resource_id=document.id,
            resource_name=document.title,
            ip_address=get_client_ip(request),
            details={'reason': reason}
        )

        # Notify document owner
        create_notification(
            recipient=document.owner,
            title="Document Access Request",
            message=f"{user.full_name or user.email} from {org.name} requested access to '{document.title}'.",
            notification_type=NotificationType.ACCESS_REQUEST
        )

        return Response(AccessRequestSerializer(req).data, status=status.HTTP_201_CREATED)


class AccessRequestReviewView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        req = get_object_or_404(AccessRequest, pk=pk)
        document = req.document
        user = request.user

        if document.owner_id != user.id and user.get_role_in_org(document.organization) not in ['ADMIN', 'MANAGER']:
            return Response({'error': 'Only owner or org admin/manager can review access requests.'}, status=status.HTTP_403_FORBIDDEN)

        decision = request.data.get('decision') # 'APPROVED' or 'REJECTED'
        notes = request.data.get('notes', '')

        if decision == 'APPROVED':
            req.status = 'APPROVED'
            req.reviewed_by = user
            req.reviewed_at = timezone.now()
            req.review_notes = notes
            req.save()

            # Automatically create active DocumentShare for requester
            share = DocumentShare.objects.create(
                document=document,
                sender_organization=document.organization,
                sender=user,
                recipient_organization=req.organization,
                recipient_user=req.requester,
                recipient_email=req.requester.email,
                permission=req.requested_permission,
                status=ShareStatus.ACTIVE
            )
            create_notification(
                recipient=req.requester,
                title="Access Request Approved",
                message=f"Your access request for '{document.title}' was approved.",
                notification_type=NotificationType.INCOMING_SHARE
            )
        else:
            req.status = 'REJECTED'
            req.reviewed_by = user
            req.reviewed_at = timezone.now()
            req.review_notes = notes
            req.save()

            create_notification(
                recipient=req.requester,
                title="Access Request Declined",
                message=f"Your access request for '{document.title}' was declined: {notes}",
                notification_type=NotificationType.SHARE_REJECTED
            )

        return Response(AccessRequestSerializer(req).data)
