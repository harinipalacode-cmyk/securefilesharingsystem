import uuid
from django.db import models
from django.conf import settings
from organizations.models import Organization


class EventType(models.TextChoices):
    # Authentication
    AUTH_LOGIN_SUCCESS = 'AUTH_LOGIN_SUCCESS', 'User Login Successful'
    AUTH_LOGIN_FAILED = 'AUTH_LOGIN_FAILED', 'User Login Failed'
    AUTH_REGISTER = 'AUTH_REGISTER', 'User Registered'
    AUTH_LOGOUT = 'AUTH_LOGOUT', 'User Logout'
    
    # Document operations
    DOC_UPLOAD = 'DOC_UPLOAD', 'Document Uploaded'
    DOC_VERSION_CREATE = 'DOC_VERSION_CREATE', 'New Version Uploaded'
    DOC_METADATA_VIEW = 'DOC_METADATA_VIEW', 'Metadata Viewed'
    DOC_DOWNLOAD = 'DOC_DOWNLOAD', 'Document Decrypted and Downloaded'
    DOC_INTEGRITY_CHECK = 'DOC_INTEGRITY_CHECK', 'Cryptographic Integrity Verified'
    DOC_ARCHIVE = 'DOC_ARCHIVE', 'Document Archived'
    
    # Sharing operations
    SHARE_INTERNAL_CREATE = 'SHARE_INTERNAL_CREATE', 'Internal Share Created'
    SHARE_EXTERNAL_CREATE = 'SHARE_EXTERNAL_CREATE', 'Cross-Organization Share Created'
    SHARE_ACCEPT = 'SHARE_ACCEPT', 'Share Invitation Accepted'
    SHARE_REJECT = 'SHARE_REJECT', 'Share Invitation Rejected'
    SHARE_REVOKE = 'SHARE_REVOKE', 'Share Revoked'
    SHARE_EXPIRED = 'SHARE_EXPIRED', 'Share Access Denied (Expired)'
    
    # Approval & Access requests
    ACCESS_REQUEST_CREATE = 'ACCESS_REQUEST_CREATE', 'Access Request Submitted'
    APPROVAL_GRANTED = 'APPROVAL_GRANTED', 'Share Approval Granted'
    APPROVAL_REJECTED = 'APPROVAL_REJECTED', 'Share Approval Rejected'
    
    # Administration & Security
    ROLE_CHANGE = 'ROLE_CHANGE', 'Organization Role Changed'
    MEMBER_INVITED = 'MEMBER_INVITED', 'Organization Member Invited'
    UNAUTHORIZED_ACCESS_ATTEMPT = 'UNAUTHORIZED_ACCESS_ATTEMPT', 'Unauthorized Access Attempt Denied'
    INTEGRITY_FAILURE = 'INTEGRITY_FAILURE', 'Document Tampering / Integrity Failure'


class AuditEvent(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    timestamp = models.DateTimeField(auto_now_add=True, db_index=True)
    
    # Actor details
    actor = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='audit_actions'
    )
    actor_email = models.CharField(max_length=255, blank=True)
    
    # Organization scope
    organization = models.ForeignKey(
        Organization,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='audit_events'
    )
    
    event_type = models.CharField(max_length=50, choices=EventType.choices, db_index=True)
    resource_type = models.CharField(max_length=50, default='DOCUMENT')
    resource_id = models.CharField(max_length=100, blank=True)
    resource_name = models.CharField(max_length=255, blank=True)
    
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    outcome = models.CharField(
        max_length=20,
        choices=[('SUCCESS', 'Success'), ('DENIED', 'Denied'), ('FAILED', 'Failed')],
        default='SUCCESS'
    )
    details = models.JSONField(default=dict, blank=True)

    class Meta:
        ordering = ['-timestamp']
        indexes = [
            models.Index(fields=['organization', '-timestamp']),
            models.Index(fields=['event_type', '-timestamp']),
        ]

    def __str__(self):
        return f"[{self.timestamp.strftime('%Y-%m-%d %H:%M:%S')}] {self.event_type} - {self.actor_email or 'Anonymous'} ({self.outcome})"


def log_audit_event(
    event_type: str,
    outcome: str = 'SUCCESS',
    actor=None,
    organization=None,
    resource_type: str = 'DOCUMENT',
    resource_id: str = '',
    resource_name: str = '',
    ip_address: str = None,
    details: dict = None
):
    """
    Standard utility to record immutable audit events without logging sensitive contents or secrets.
    """
    safe_details = details.copy() if details else {}
    # Ensure no secrets or tokens are logged
    for forbidden_key in ['password', 'token', 'key', 'dek', 'kek', 'secret']:
        safe_details.pop(forbidden_key, None)

    actor_email = ''
    if actor and hasattr(actor, 'email'):
        actor_email = actor.email
    elif isinstance(actor, str):
        actor_email = actor

    return AuditEvent.objects.create(
        event_type=event_type,
        outcome=outcome,
        actor=actor if (actor and hasattr(actor, 'pk') and actor.pk) else None,
        actor_email=actor_email,
        organization=organization,
        resource_type=resource_type,
        resource_id=str(resource_id),
        resource_name=resource_name,
        ip_address=ip_address,
        details=safe_details
    )
