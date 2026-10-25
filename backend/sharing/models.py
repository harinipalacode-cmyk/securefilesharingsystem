import uuid
from django.db import models
from django.conf import settings
from django.utils import timezone
from organizations.models import Organization
from documents.models import SecureDocument


class ShareType(models.TextChoices):
    INTERNAL = 'INTERNAL', 'Internal Share (Same Organization)'
    EXTERNAL = 'EXTERNAL', 'External Share (Cross Organization)'


class SharePermission(models.TextChoices):
    VIEW_METADATA = 'VIEW_METADATA', 'View Metadata'
    VIEW_DOCUMENT = 'VIEW_DOCUMENT', 'View Document'
    DOWNLOAD_DOCUMENT = 'DOWNLOAD_DOCUMENT', 'Download Document'
    UPLOAD_VERSION = 'UPLOAD_VERSION', 'Upload New Version'


class ShareStatus(models.TextChoices):
    PENDING_APPROVAL = 'PENDING_APPROVAL', 'Pending Security/Manager Approval'
    PENDING_ACCEPTANCE = 'PENDING_ACCEPTANCE', 'Pending Recipient Acceptance'
    ACTIVE = 'ACTIVE', 'Active'
    REJECTED = 'REJECTED', 'Rejected'
    REVOKED = 'REVOKED', 'Revoked'
    EXPIRED = 'EXPIRED', 'Expired'


class DocumentShare(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    document = models.ForeignKey(
        SecureDocument,
        on_delete=models.CASCADE,
        related_name='shares'
    )
    share_type = models.CharField(
        max_length=20,
        choices=ShareType.choices,
        editable=False
    )
    sender_organization = models.ForeignKey(
        Organization,
        on_delete=models.CASCADE,
        related_name='outgoing_shares'
    )
    sender = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='sent_shares'
    )
    recipient_organization = models.ForeignKey(
        Organization,
        on_delete=models.CASCADE,
        related_name='incoming_shares'
    )
    recipient_user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='received_shares'
    )
    recipient_email = models.EmailField(
        blank=True,
        help_text="Target recipient email address"
    )
    
    permission = models.CharField(
        max_length=30,
        choices=SharePermission.choices,
        default=SharePermission.DOWNLOAD_DOCUMENT
    )
    can_share_onward = models.BooleanField(
        default=False,
        help_text="Allow recipient to re-share document (disabled by default)"
    )
    requires_approval = models.BooleanField(
        default=False,
        help_text="Requires organization manager/security officer approval before activation"
    )
    
    status = models.CharField(
        max_length=30,
        choices=ShareStatus.choices,
        default=ShareStatus.PENDING_ACCEPTANCE
    )
    
    expires_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    revoked_at = models.DateTimeField(null=True, blank=True)
    revoked_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='revoked_shares'
    )
    revocation_reason = models.TextField(blank=True)

    def save(self, *args, **kwargs):
        # Enforce server-side determination of internal vs external
        if self.sender_organization_id == self.recipient_organization_id:
            self.share_type = ShareType.INTERNAL
        else:
            self.share_type = ShareType.EXTERNAL

        # If requires_approval and newly created, initial status is PENDING_APPROVAL
        if not self.pk and self.requires_approval:
            self.status = ShareStatus.PENDING_APPROVAL
        elif not self.pk and not self.requires_approval and self.status == ShareStatus.PENDING_ACCEPTANCE:
            # Internal shares can be automatically ACTIVE or PENDING_ACCEPTANCE
            # Let's keep PENDING_ACCEPTANCE for explicit acceptance, or if internal auto-activate
            if self.share_type == ShareType.INTERNAL:
                self.status = ShareStatus.ACTIVE

        super().save(*args, **kwargs)

    @property
    def is_expired(self):
        if self.expires_at and timezone.now() > self.expires_at:
            return True
        return False

    def is_valid_for_access(self):
        if self.status != ShareStatus.ACTIVE:
            return False, f"Share status is {self.get_status_display()}"
        if self.is_expired:
            if self.status != ShareStatus.EXPIRED:
                self.status = ShareStatus.EXPIRED
                self.save(update_fields=['status'])
            return False, "This share has expired"
        return True, "Valid"

    def __str__(self):
        return f"{self.share_type} [{self.status}] {self.document.title} -> {self.recipient_email or self.recipient_user}"


class AccessRequest(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    document = models.ForeignKey(
        SecureDocument,
        on_delete=models.CASCADE,
        related_name='access_requests'
    )
    requester = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='access_requests'
    )
    organization = models.ForeignKey(
        Organization,
        on_delete=models.CASCADE,
        related_name='access_requests'
    )
    requested_permission = models.CharField(
        max_length=30,
        choices=SharePermission.choices,
        default=SharePermission.DOWNLOAD_DOCUMENT
    )
    reason = models.TextField()
    status = models.CharField(
        max_length=20,
        choices=[
            ('PENDING', 'Pending'),
            ('APPROVED', 'Approved'),
            ('REJECTED', 'Rejected'),
        ],
        default='PENDING'
    )
    reviewed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='reviewed_access_requests'
    )
    reviewed_at = models.DateTimeField(null=True, blank=True)
    review_notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Access request by {self.requester.email} for {self.document.title} ({self.status})"
