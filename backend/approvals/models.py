import uuid
from django.db import models
from django.conf import settings
from sharing.models import DocumentShare, ShareStatus


class ApprovalStatus(models.TextChoices):
    PENDING = 'PENDING', 'Pending Approval'
    APPROVED = 'APPROVED', 'Approved'
    REJECTED = 'REJECTED', 'Rejected'


class DocumentApproval(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    share = models.OneToOneField(
        DocumentShare,
        on_delete=models.CASCADE,
        related_name='approval_record'
    )
    requested_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='approval_requests'
    )
    status = models.CharField(
        max_length=20,
        choices=ApprovalStatus.choices,
        default=ApprovalStatus.PENDING
    )
    decision_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='decided_approvals'
    )
    decision_at = models.DateTimeField(null=True, blank=True)
    decision_notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def approve(self, approver_user, notes=''):
        self.status = ApprovalStatus.APPROVED
        self.decision_by = approver_user
        from django.utils import timezone
        self.decision_at = timezone.now()
        self.decision_notes = notes
        self.save()
        
        # Transition share status to PENDING_ACCEPTANCE for recipient
        self.share.status = ShareStatus.PENDING_ACCEPTANCE
        self.share.save(update_fields=['status'])

    def reject(self, approver_user, notes=''):
        self.status = ApprovalStatus.REJECTED
        self.decision_by = approver_user
        from django.utils import timezone
        self.decision_at = timezone.now()
        self.decision_notes = notes
        self.save()
        
        # Transition share status to REJECTED
        self.share.status = ShareStatus.REJECTED
        self.share.save(update_fields=['status'])

    def __str__(self):
        return f"Approval for Share {self.share_id}: {self.status}"
