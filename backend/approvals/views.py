from django.shortcuts import get_object_or_404
from rest_framework import status, permissions
from rest_framework.views import APIView
from rest_framework.response import Response

from .models import DocumentApproval, ApprovalStatus
from .serializers import DocumentApprovalSerializer
from audit.models import log_audit_event, EventType
from notifications.models import create_notification, NotificationType


def get_client_ip(request):
    x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
    if x_forwarded_for:
        return x_forwarded_for.split(',')[0].strip()
    return request.META.get('REMOTE_ADDR')


class ApprovalListView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        user = request.user
        org = user.active_organization
        if not org:
            return Response([])

        # Filter approvals belonging to the sender organization
        qs = DocumentApproval.objects.filter(share__sender_organization=org)
        status_param = request.query_params.get('status')
        if status_param:
            qs = qs.filter(status=status_param)

        qs = qs.select_related('share', 'share__document', 'share__sender', 'share__recipient_organization', 'requested_by', 'decision_by').order_by('-created_at')
        return Response(DocumentApprovalSerializer(qs, many=True).data)


class ApprovalDecisionView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        approval = get_object_or_404(DocumentApproval, pk=pk)
        user = request.user
        sender_org = approval.share.sender_organization

        # Check that user is an Admin, Security Officer, or Manager in the sender org
        user_role = user.get_role_in_org(sender_org)
        if user_role not in ['ADMIN', 'SECURITY_OFFICER', 'MANAGER']:
            return Response({'error': 'You do not have approval permissions in this organization.'}, status=status.HTTP_403_FORBIDDEN)

        decision = request.data.get('decision') # 'APPROVE' or 'REJECT'
        notes = request.data.get('notes', '')

        if decision == 'APPROVE':
            approval.approve(user, notes)
            log_audit_event(
                event_type=EventType.APPROVAL_GRANTED,
                actor=user,
                organization=sender_org,
                resource_type='APPROVAL',
                resource_id=approval.id,
                resource_name=f"Approved Share: {approval.share.document.title}",
                ip_address=get_client_ip(request),
                details={'notes': notes}
            )
            create_notification(
                recipient=approval.requested_by,
                title="Cross-Org Share Approved",
                message=f"Your share request for '{approval.share.document.title}' to {approval.share.recipient_organization.name} was approved.",
                notification_type=NotificationType.APPROVAL_DECIDED
            )
            # If target recipient is known, also notify them of the incoming share
            if approval.share.recipient_user:
                create_notification(
                    recipient=approval.share.recipient_user,
                    title="New Secure Document Shared With You",
                    message=f"{approval.share.sender.full_name or approval.share.sender.email} from {sender_org.name} shared '{approval.share.document.title}'.",
                    notification_type=NotificationType.INCOMING_SHARE
                )
        elif decision == 'REJECT':
            approval.reject(user, notes)
            log_audit_event(
                event_type=EventType.APPROVAL_REJECTED,
                actor=user,
                organization=sender_org,
                resource_type='APPROVAL',
                resource_id=approval.id,
                resource_name=f"Rejected Share: {approval.share.document.title}",
                ip_address=get_client_ip(request),
                details={'notes': notes}
            )
            create_notification(
                recipient=approval.requested_by,
                title="Cross-Org Share Rejected",
                message=f"Your share request for '{approval.share.document.title}' was rejected by compliance: {notes}",
                notification_type=NotificationType.APPROVAL_DECIDED
            )
        else:
            return Response({'error': "Invalid decision. Must be 'APPROVE' or 'REJECT'."}, status=status.HTTP_400_BAD_REQUEST)

        return Response(DocumentApprovalSerializer(approval).data)
