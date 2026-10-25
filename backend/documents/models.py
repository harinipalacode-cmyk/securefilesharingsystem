import uuid
from django.db import models
from django.conf import settings
from organizations.models import Organization


class DocumentClassification(models.TextChoices):
    PUBLIC = 'PUBLIC', 'Public'
    INTERNAL = 'INTERNAL', 'Internal'
    CONFIDENTIAL = 'CONFIDENTIAL', 'Confidential'
    HIGHLY_CONFIDENTIAL = 'HIGHLY_CONFIDENTIAL', 'Highly Confidential'


class DocumentStatus(models.TextChoices):
    ACTIVE = 'ACTIVE', 'Active'
    ARCHIVED = 'ARCHIVED', 'Archived'
    DELETED = 'DELETED', 'Deleted'


class SecureDocument(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    organization = models.ForeignKey(
        Organization,
        on_delete=models.CASCADE,
        related_name='documents'
    )
    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='owned_documents'
    )
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    classification = models.CharField(
        max_length=30,
        choices=DocumentClassification.choices,
        default=DocumentClassification.INTERNAL
    )
    status = models.CharField(
        max_length=20,
        choices=DocumentStatus.choices,
        default=DocumentStatus.ACTIVE
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    @property
    def latest_version(self):
        return self.versions.order_by('-version_number').first()

    def __str__(self):
        return f"{self.title} ({self.get_classification_display()}) - {self.organization.name}"


class DocumentVersion(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    document = models.ForeignKey(
        SecureDocument,
        on_delete=models.CASCADE,
        related_name='versions'
    )
    version_number = models.PositiveIntegerField(default=1)
    file_name = models.CharField(max_length=255)
    file_size = models.PositiveBigIntegerField()
    mime_type = models.CharField(max_length=150, default='application/octet-stream')
    
    # Encrypted storage details
    encrypted_file_path = models.CharField(max_length=500)
    encrypted_dek = models.TextField()
    dek_nonce = models.CharField(max_length=64)
    file_nonce = models.CharField(max_length=64)
    sha256_hash = models.CharField(max_length=64)
    
    uploaded_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name='uploaded_versions'
    )
    change_summary = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('document', 'version_number')
        ordering = ['-version_number']

    def __str__(self):
        return f"{self.document.title} v{self.version_number} ({self.file_name})"
