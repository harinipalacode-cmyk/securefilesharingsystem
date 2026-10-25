import uuid
from django.db import models
from django.conf import settings


class NotificationType(models.TextChoices):
    INCOMING_SHARE = 'INCOMING_SHARE', 'Incoming Document Share'
    SHARE_ACCEPTED = 'SHARE_ACCEPTED', 'Share Accepted'
    SHARE_REJECTED = 'SHARE_REJECTED', 'Share Rejected'
    APPROVAL_REQUIRED = 'APPROVAL_REQUIRED', 'Approval Required'
    APPROVAL_DECIDED = 'APPROVAL_DECIDED', 'Approval Decided'
    SHARE_REVOKED = 'SHARE_REVOKED', 'Share Revoked'
    ACCESS_REQUEST = 'ACCESS_REQUEST', 'Access Request Submitted'
    SECURITY_ALERT = 'SECURITY_ALERT', 'Security Alert'


class Notification(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    recipient = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='notifications'
    )
    title = models.CharField(max_length=255)
    message = models.TextField()
    notification_type = models.CharField(
        max_length=50,
        choices=NotificationType.choices,
        default=NotificationType.INCOMING_SHARE
    )
    link_url = models.CharField(max_length=255, blank=True)
    is_read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"Notification for {self.recipient.email}: {self.title} (Read: {self.is_read})"


def create_notification(recipient, title: str, message: str, notification_type: str, link_url: str = ''):
    """
    Safely creates in-app notification without plaintext document contents or secrets.
    """
    if not recipient:
        return None
    return Notification.objects.create(
        recipient=recipient,
        title=title,
        message=message,
        notification_type=notification_type,
        link_url=link_url
    )
