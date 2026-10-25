from django.contrib.auth.models import AbstractUser
from django.db import models


class User(AbstractUser):
    """
    Custom User model for SecureShare.
    Uses email as unique identifier for cross-organization interactions.
    """
    email = models.EmailField(unique=True, verbose_name="Email Address")
    full_name = models.CharField(max_length=255, blank=True, verbose_name="Full Name")
    job_title = models.CharField(max_length=150, blank=True, verbose_name="Job Title")
    department = models.CharField(max_length=150, blank=True, verbose_name="Department")
    
    # Security tracking
    failed_login_attempts = models.PositiveIntegerField(default=0)
    last_failed_login = models.DateTimeField(null=True, blank=True)
    is_locked = models.BooleanField(default=False)
    
    # Active organization pointer for user session context
    active_organization = models.ForeignKey(
        'organizations.Organization',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='active_users'
    )

    def save(self, *args, **kwargs):
        if not self.full_name and (self.first_name or self.last_name):
            self.full_name = f"{self.first_name} {self.last_name}".strip()
        super().save(*args, **kwargs)

    def get_role_in_org(self, organization):
        from organizations.models import OrganizationMembership
        membership = OrganizationMembership.objects.filter(
            user=self,
            organization=organization,
            is_active=True
        ).first()
        return membership.role if membership else None

    def __str__(self):
        return f"{self.full_name or self.username} ({self.email})"
