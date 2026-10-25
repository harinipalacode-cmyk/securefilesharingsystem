from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import status, permissions
from rest_framework.views import APIView
from rest_framework.response import Response

from .models import SecurityAlert, AlertSeverity
from .serializers import SecurityAlertSerializer
from documents.models import SecureDocument, DocumentStatus
from sharing.models import DocumentShare, ShareStatus, ShareType
from audit.models import AuditEvent, EventType


class SecurityAlertListView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        user = request.user
        org = user.active_organization
        if not org:
            return Response([])

        qs = SecurityAlert.objects.filter(organization=org)
        status_param = request.query_params.get('status')
        if status_param:
            qs = qs.filter(status=status_param)

        severity = request.query_params.get('severity')
        if severity:
            qs = qs.filter(severity=severity)

        qs = qs.select_related('resolved_by').order_by('-created_at')
        return Response(SecurityAlertSerializer(qs, many=True).data)


class SecurityAlertResolveView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        alert = get_object_or_404(SecurityAlert, pk=pk)
        org = alert.organization

        role = request.user.get_role_in_org(org)
        if role not in ['ADMIN', 'SECURITY_OFFICER']:
            return Response({'error': 'Only Admins or Security Officers can resolve security alerts.'}, status=status.HTTP_403_FORBIDDEN)

        notes = request.data.get('notes', 'Resolved by security personnel.')
        alert.status = 'RESOLVED'
        alert.resolved_at = timezone.now()
        alert.resolved_by = request.user
        alert.resolution_notes = notes
        alert.save()

        return Response(SecurityAlertSerializer(alert).data)


class SecurityMetricsView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        org = request.user.active_organization
        if not org:
            return Response({
                'active_alerts_count': 0,
                'critical_alerts_count': 0,
                'encrypted_documents_count': 0,
                'active_external_shares_count': 0,
                'failed_access_attempts_24h': 0,
            })

        active_alerts = SecurityAlert.objects.filter(organization=org, status='ACTIVE')
        critical_alerts = active_alerts.filter(severity=AlertSeverity.CRITICAL).count()

        encrypted_docs = SecureDocument.objects.filter(organization=org, status=DocumentStatus.ACTIVE).count()
        external_shares = DocumentShare.objects.filter(sender_organization=org, share_type=ShareType.EXTERNAL, status=ShareStatus.ACTIVE).count()

        last_24h = timezone.now() - timezone.timedelta(hours=24)
        failed_attempts = AuditEvent.objects.filter(
            organization=org,
            outcome='DENIED',
            timestamp__gte=last_24h
        ).count()

        return Response({
            'active_alerts_count': active_alerts.count(),
            'critical_alerts_count': critical_alerts,
            'encrypted_documents_count': encrypted_docs,
            'active_external_shares_count': external_shares,
            'failed_access_attempts_24h': failed_attempts,
            'encryption_standard': 'AES-256-GCM Envelope Encryption with Master KEK',
            'soc2_compliance_mode': True,
        })
