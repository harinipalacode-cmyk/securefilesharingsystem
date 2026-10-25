import csv
from django.http import HttpResponse
from rest_framework import status, permissions
from rest_framework.views import APIView
from rest_framework.response import Response

from .models import AuditEvent
from .serializers import AuditEventSerializer


class AuditEventListView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        user = request.user
        org = user.active_organization
        if not org:
            return Response([])

        qs = AuditEvent.objects.filter(organization=org)

        event_type = request.query_params.get('event_type')
        if event_type:
            qs = qs.filter(event_type=event_type)

        outcome = request.query_params.get('outcome')
        if outcome:
            qs = qs.filter(outcome=outcome)

        search = request.query_params.get('search')
        if search:
            qs = qs.filter(resource_name__icontains=search) | qs.filter(actor_email__icontains=search)

        limit = int(request.query_params.get('limit', 100))
        qs = qs.order_by('-timestamp')[:limit]

        return Response(AuditEventSerializer(qs, many=True).data)


class AuditExportView(APIView):
    """Exports immutable audit trail into CSV for SOC2 / ISO 27001 compliance export."""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        org = request.user.active_organization
        if not org:
            return Response({'error': 'Active organization required.'}, status=status.HTTP_400_BAD_REQUEST)

        # Check permission: ADMIN or SECURITY_OFFICER
        role = request.user.get_role_in_org(org)
        if role not in ['ADMIN', 'SECURITY_OFFICER']:
            return Response({'error': 'Only Admins or Security Officers can export audit logs.'}, status=status.HTTP_403_FORBIDDEN)

        response = HttpResponse(content_type='text/csv')
        response['Content-Disposition'] = f'attachment; filename="secureshare-audit-{org.slug}.csv"'

        writer = csv.writer(response)
        writer.writerow(['ID', 'Timestamp (UTC)', 'Event Type', 'Outcome', 'Actor Email', 'IP Address', 'Resource Type', 'Resource Name', 'Details'])

        events = AuditEvent.objects.filter(organization=org).order_by('-timestamp')[:1000]
        for e in events:
            writer.writerow([
                str(e.id),
                e.timestamp.strftime('%Y-%m-%d %H:%M:%S'),
                e.event_type,
                e.outcome,
                e.actor_email,
                e.ip_address or '',
                e.resource_type,
                e.resource_name,
                str(e.details)
            ])

        return response
