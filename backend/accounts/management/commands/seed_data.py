import uuid
from django.core.management.base import BaseCommand
from django.utils import timezone
from django.conf import settings
from accounts.models import User
from organizations.models import Organization, OrganizationMembership, VerificationStatus, OrgRole
from documents.models import SecureDocument, DocumentVersion, DocumentClassification, DocumentStatus
from documents.crypto import EncryptionManager
from sharing.models import DocumentShare, ShareType, SharePermission, ShareStatus
from approvals.models import DocumentApproval, ApprovalStatus
from audit.models import AuditEvent, EventType, log_audit_event
from security_center.models import SecurityAlert, AlertType, AlertSeverity
from notifications.models import Notification, NotificationType


class Command(BaseCommand):
    help = "Seeds database with enterprise cross-organization data, encrypted files, and audit logs."

    def handle(self, *args, **options):
        self.stdout.write("Seeding SecureShare data...")

        # 1. Organizations
        org_aegis, _ = Organization.objects.get_or_create(
            name="Aegis Aerospace & Defense",
            defaults={
                'domain': 'aegis-defense.gov',
                'description': 'Defense contracting, aerospace guidance, and mission-critical cybersecurity.',
                'verification_status': VerificationStatus.VERIFIED,
                'verified_at': timezone.now(),
                'verification_notes': 'Federal contractor verification confirmed via GovID.'
            }
        )

        org_nexus, _ = Organization.objects.get_or_create(
            name="Nexus BioTech Labs",
            defaults={
                'domain': 'nexus-bio.org',
                'description': 'Advanced biomedical research and genomic sequence synthesis.',
                'verification_status': VerificationStatus.VERIFIED,
                'verified_at': timezone.now(),
                'verification_notes': 'Verified institutional research entity.'
            }
        )

        org_apex, _ = Organization.objects.get_or_create(
            name="Apex Global Financial",
            defaults={
                'domain': 'apex-global.com',
                'description': 'Cross-border clearing, compliance, and institutional asset custody.',
                'verification_status': VerificationStatus.VERIFIED,
                'verified_at': timezone.now(),
                'verification_notes': 'FINRA & SEC regulatory verification confirmed.'
            }
        )

        # 2. Users
        def create_seed_user(username, email, full_name, job_title, department, org, role):
            user, created = User.objects.get_or_create(
                username=username,
                defaults={
                    'email': email,
                    'full_name': full_name,
                    'job_title': job_title,
                    'department': department,
                    'active_organization': org,
                    'is_staff': True
                }
            )
            user.set_password('SecureShare123!')
            user.active_organization = org
            user.save()

            OrganizationMembership.objects.get_or_create(
                user=user,
                organization=org,
                defaults={'role': role, 'is_active': True}
            )
            return user

        u_alex = create_seed_user(
            'alex.vance', 'alex@aegis.gov', 'Alex Vance', 
            'Chief Information Security Officer', 'Cyber Defense Ops', org_aegis, OrgRole.SECURITY_OFFICER
        )

        u_elena = create_seed_user(
            'elena.rostova', 'elena@aegis.gov', 'Dr. Elena Rostova', 
            'Lead Propulsion Architect', 'Defense Engineering', org_aegis, OrgRole.ADMIN
        )

        u_marcus = create_seed_user(
            'marcus.chen', 'marcus@nexus.org', 'Dr. Marcus Chen', 
            'Head of Genomic Synthesis', 'Bioinformatics', org_nexus, OrgRole.MANAGER
        )

        u_sarah = create_seed_user(
            'sarah.jenkins', 'sarah@apex.com', 'Sarah Jenkins', 
            'Compliance Director', 'Risk & Regulatory Audit', org_apex, OrgRole.MEMBER
        )

        # Also give Elena a secondary membership in Nexus for multi-org testing
        OrganizationMembership.objects.get_or_create(
            user=u_elena,
            organization=org_nexus,
            defaults={'role': OrgRole.MEMBER, 'is_active': True}
        )

        # 3. Encrypted Documents in Vault
        settings.ENCRYPTED_VAULT_DIR.mkdir(parents=True, exist_ok=True)

        sample_docs = [
            {
                'title': 'Quantum-Resistant Envelope Cryptography Specifications.pdf',
                'description': 'Technical architecture for post-quantum AES-256-GCM envelope encryption protocols and key rotation standards.',
                'classification': DocumentClassification.HIGHLY_CONFIDENTIAL,
                'org': org_aegis,
                'owner': u_elena,
                'content': b"TOP SECRET // AEGIS DEFENSE SYSTEM\nQuantum-Resistant Envelope Cryptography Protocol v4.2\nApproved for Cross-Institutional Evaluation under NDA.\nMaster Key Derivation: AES-256-GCM with hardware-backed KMS.\nDEK nonces are single-use 96-bit random vectors.",
                'file_name': 'Quantum_Crypt_Specs_v4.pdf',
                'mime_type': 'application/pdf',
            },
            {
                'title': 'Genomic Synthesis Biomarker Dataset 2026.csv',
                'description': 'Sequencing datasets for synthetic viral vector resistance testing.',
                'classification': DocumentClassification.CONFIDENTIAL,
                'org': org_nexus,
                'owner': u_marcus,
                'content': b"Biomarker_ID,Sequence_Hash,Target_Expression,Tolerance_Ratio\nBIO-991,a7f920bc,Positive,0.9984\nBIO-992,33b8a1c0,Negative,0.1205\nBIO-993,fc12089e,Positive,0.9851",
                'file_name': 'Genomic_Synthesis_2026.csv',
                'mime_type': 'text/csv',
            },
            {
                'title': 'Inter-Organization Security Baseline Standards.pdf',
                'description': 'Mandatory security baselines and role-based access governance protocols.',
                'classification': DocumentClassification.INTERNAL,
                'org': org_aegis,
                'owner': u_alex,
                'content': b"AEGIS DEFENSE DIRECTIVE #804:\nAll outgoing documents classified as CONFIDENTIAL require explicit Security Officer approval before external transmission.",
                'file_name': 'Security_Baselines_2026.pdf',
                'mime_type': 'application/pdf',
            },
            {
                'title': 'Public Institutional Collaboration Charter.txt',
                'description': 'Open framework for inter-agency research collaboration and data privacy.',
                'classification': DocumentClassification.PUBLIC,
                'org': org_nexus,
                'owner': u_marcus,
                'content': b"PUBLIC NOTICE:\nNexus BioTech Labs adheres to strict open research ethics and cryptographic data integrity.",
                'file_name': 'Collaboration_Charter.txt',
                'mime_type': 'text/plain',
            }
        ]

        created_docs = []
        for d in sample_docs:
            doc, _ = SecureDocument.objects.get_or_create(
                organization=d['org'],
                title=d['title'],
                defaults={
                    'owner': d['owner'],
                    'description': d['description'],
                    'classification': d['classification'],
                    'status': DocumentStatus.ACTIVE
                }
            )

            # Check if version exists
            if not doc.versions.exists():
                crypto_res = EncryptionManager.encrypt_file_data(d['content'])
                vault_filename = f"{uuid.uuid4()}.enc"
                vault_path = str(settings.ENCRYPTED_VAULT_DIR / vault_filename)
                with open(vault_path, 'wb') as f:
                    f.write(crypto_res['encrypted_data'])

                DocumentVersion.objects.create(
                    document=doc,
                    version_number=1,
                    file_name=d['file_name'],
                    file_size=len(d['content']),
                    mime_type=d['mime_type'],
                    encrypted_file_path=vault_path,
                    encrypted_dek=crypto_res['encrypted_dek'],
                    dek_nonce=crypto_res['dek_nonce'],
                    file_nonce=crypto_res['file_nonce'],
                    sha256_hash=crypto_res['sha256_hash'],
                    uploaded_by=d['owner'],
                    change_summary='Baseline version'
                )

                log_audit_event(
                    event_type=EventType.DOC_UPLOAD,
                    actor=d['owner'],
                    organization=d['org'],
                    resource_id=doc.id,
                    resource_name=doc.title,
                    details={'file_name': d['file_name'], 'sha256': crypto_res['sha256_hash']}
                )
            created_docs.append(doc)

        # 4. Active Cross-Organization Share (Aegis Elena -> Nexus Marcus)
        quantum_doc = created_docs[0]
        active_share, _ = DocumentShare.objects.get_or_create(
            document=quantum_doc,
            sender=u_elena,
            recipient_organization=org_nexus,
            defaults={
                'sender_organization': org_aegis,
                'recipient_user': u_marcus,
                'recipient_email': u_marcus.email,
                'permission': SharePermission.DOWNLOAD_DOCUMENT,
                'can_share_onward': False,
                'status': ShareStatus.ACTIVE,
                'expires_at': timezone.now() + timezone.timedelta(days=30)
            }
        )

        # 5. Pending Approval Share (Nexus Marcus -> Apex Sarah, requires approval)
        genomic_doc = created_docs[1]
        pending_share, p_created = DocumentShare.objects.get_or_create(
            document=genomic_doc,
            sender=u_marcus,
            recipient_organization=org_apex,
            defaults={
                'sender_organization': org_nexus,
                'recipient_user': u_sarah,
                'recipient_email': u_sarah.email,
                'permission': SharePermission.VIEW_DOCUMENT,
                'requires_approval': True,
                'status': ShareStatus.PENDING_APPROVAL
            }
        )
        if p_created:
            DocumentApproval.objects.get_or_create(
                share=pending_share,
                defaults={
                    'requested_by': u_marcus,
                    'status': ApprovalStatus.PENDING
                }
            )

        # 6. Security Center Alerts
        SecurityAlert.objects.get_or_create(
            organization=org_aegis,
            title="Unauthorized Cross-Org Download Blocked",
            defaults={
                'alert_type': AlertType.UNAUTHORIZED_ACCESS_ATTEMPT,
                'severity': AlertSeverity.HIGH,
                'description': "An external entity attempted to query encrypted vault object Quantum_Crypt_Specs_v4.pdf without valid certificate token.",
                'status': 'ACTIVE'
            }
        )

        SecurityAlert.objects.get_or_create(
            organization=org_nexus,
            title="External Share Requires Compliance Sign-off",
            defaults={
                'alert_type': AlertType.SUSPICIOUS_ROLE_CHANGE,
                'severity': AlertSeverity.MEDIUM,
                'description': "Cross-organization transfer of Confidential Genomic Synthesis dataset to Apex Global Financial awaiting compliance review.",
                'status': 'ACTIVE'
            }
        )

        # 7. Notifications
        Notification.objects.get_or_create(
            recipient=u_marcus,
            title="Cross-Org Document Shared With You",
            defaults={
                'message': "Dr. Elena Rostova from Aegis Aerospace shared 'Quantum-Resistant Envelope Cryptography Specifications.pdf' with your team.",
                'notification_type': NotificationType.INCOMING_SHARE,
                'is_read': False
            }
        )

        Notification.objects.get_or_create(
            recipient=u_alex,
            title="Security Audit Notice",
            defaults={
                'message': "AES-256-GCM Cryptographic integrity health check completed with zero violations across all active document vaults.",
                'notification_type': NotificationType.SECURITY_ALERT,
                'is_read': False
            }
        )

        self.stdout.write(self.style.SUCCESS("Database seeded successfully with demo organizations, accounts, encrypted documents, and audit logs!"))
