import uuid
from django.db import models
from django.conf import settings
from organizations.models import Organization


class AlertSeverity(models.TextChoices):
    LOW = 'LOW', 'Low'
    MEDIUM = 'MEDIUM', 'Medium'
    HIGH = 'HIGH', 'High'
    CRITICAL = 'CRITICAL', 'Critical'


class AlertType(models.TextChoices):
    UNAUTHORIZED_ACCESS_ATTEMPT = 'UNAUTHORIZED_ACCESS_ATTEMPT', 'Unauthorized Document Access'
    INTEGRITY_FAILURE = 'INTEGRITY_FAILURE', 'Document Cryptographic Integrity Violation'
    FAILED_LOGINS_THRESHOLD = 'FAILED_LOGINS_THRESHOLD', 'Repeated Failed Authentication Attempts'
    SENSITIVE_SHARE_REVOKED = 'SENSITIVE_SHARE_REVOKED', 'Sensitive Document Share Revocation'
    EXPIRED_SHARE_ACTIVITY = 'EXPIRED_SHARE_ACTIVITY', 'Access Attempt on Expired Share'
    SUSPICIOUS_ROLE_CHANGE = 'SUSPICIOUS_ROLE_CHANGE', 'Privileged Organization Role Escalation'


class SecurityAlert(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    organization = models.ForeignKey(
        Organization,
        on_delete=models.CASCADE,
        related_name='security_alerts'
    )
    alert_type = models.CharField(max_length=50, choices=AlertType.choices)
    severity = models.CharField(
        max_length=20,
        choices=AlertSeverity.choices,
        default=AlertSeverity.MEDIUM
    )
    title = models.CharField(max_length=255)
    description = models.TextField()
    
    status = models.CharField(
        max_length=20,
        choices=[('ACTIVE', 'Active'), ('RESOLVED', 'Resolved')],
        default='ACTIVE'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    resolved_at = models.DateTimeField(null=True, blank=True)
    resolved_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='resolved_alerts'
    )
    resolution_notes = models.TextField(blank=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"[{self.severity}] {self.title} ({self.status}) - {self.organization.name}"


def trigger_security_alert(
    organization,
    alert_type: str,
    severity: str,
    title: str,
    description: str
):
    """Utility to log and track real operational security alerts for an organization."""
    return SecurityAlert.objects.create(
        organization=organization,
        alert_type=alert_type,
        severity=severity,
        title=title,
        description=description
    )
