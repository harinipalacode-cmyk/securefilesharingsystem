import os
import uuid
from django.conf import settings
from django.http import HttpResponse
from django.shortcuts import get_object_or_404
from rest_framework import status, permissions
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, FormParser

from .models import SecureDocument, DocumentVersion, DocumentClassification, DocumentStatus
from .serializers import SecureDocumentSerializer, DocumentVersionSerializer
from .crypto import EncryptionManager, DocumentIntegrityError
from sharing.models import DocumentShare, SharePermission, ShareStatus
from audit.models import log_audit_event, EventType
from security_center.models import trigger_security_alert, AlertType, AlertSeverity


def get_client_ip(request):
    x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
    if x_forwarded_for:
        return x_forwarded_for.split(',')[0].strip()
    return request.META.get('REMOTE_ADDR')


def check_document_access(user, document, required_permission=SharePermission.VIEW_METADATA):
    """
    Evaluates whether user has access to document:
    1. Owner always has full access.
    2. Member of same organization has access based on status.
    3. External or cross-org recipient has access if an ACTIVE, non-expired DocumentShare exists.
    """
    if document.owner_id == user.id:
        return True, "Owner", None

    # Check same organization membership
    if user.active_organization_id and user.active_organization_id == document.organization_id:
        # Organization members have access to active internal documents
        if document.status == DocumentStatus.ACTIVE:
            return True, "Organization Member", None

    # Check valid DocumentShare
    share = DocumentShare.objects.filter(
        document=document,
        status=ShareStatus.ACTIVE
    ).filter(
        recipient_user=user
    ).first()

    if not share and user.email:
        share = DocumentShare.objects.filter(
            document=document,
            status=ShareStatus.ACTIVE,
            recipient_email__iexact=user.email
        ).first()

    if not share and user.active_organization:
        share = DocumentShare.objects.filter(
            document=document,
            status=ShareStatus.ACTIVE,
            recipient_organization=user.active_organization
        ).first()

    if share:
        is_valid, reason = share.is_valid_for_access()
        if not is_valid:
            return False, reason, share

        # Check permission level
        if required_permission == SharePermission.DOWNLOAD_DOCUMENT:
            if share.permission not in [SharePermission.DOWNLOAD_DOCUMENT, SharePermission.UPLOAD_VERSION]:
                return False, "Share permission does not allow downloading document content.", share
        elif required_permission == SharePermission.UPLOAD_VERSION:
            if share.permission != SharePermission.UPLOAD_VERSION:
                return False, "Share permission does not allow uploading new versions.", share

        return True, "Active Share Grant", share

    return False, "No active access grant or share authorization.", None


class DocumentListCreateView(APIView):
    permission_classes = [permissions.IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]

    def get(self, request):
        user = request.user
        org = user.active_organization

        # Filter documents: owned by user, or in user's active org, or shared with user
        q_filter = SecureDocument.objects.filter(status=DocumentStatus.ACTIVE)
        if org:
            q_filter = q_filter.filter(organization=org)
        else:
            q_filter = q_filter.filter(owner=user)

        # Also get documents shared with user
        shared_doc_ids = DocumentShare.objects.filter(
            status=ShareStatus.ACTIVE
        ).filter(
            recipient_user=user
        ).values_list('document_id', flat=True)

        combined_docs = (q_filter | SecureDocument.objects.filter(id__in=shared_doc_ids)).distinct().order_by('-created_at')

        classification = request.query_params.get('classification')
        if classification:
            combined_docs = combined_docs.filter(classification=classification)

        search = request.query_params.get('search')
        if search:
            combined_docs = combined_docs.filter(title__icontains=search)

        serializer = SecureDocumentSerializer(combined_docs, many=True, context={'request': request})
        return Response(serializer.data)

    def post(self, request):
        user = request.user
        org = user.active_organization
        if not org:
            return Response({'error': 'Active organization required to upload documents.'}, status=status.HTTP_400_BAD_REQUEST)

        file_obj = request.FILES.get('file')
        if not file_obj:
            return Response({'error': 'No file uploaded.'}, status=status.HTTP_400_BAD_REQUEST)

        title = request.data.get('title', file_obj.name)
        description = request.data.get('description', '')
        classification = request.data.get('classification', DocumentClassification.INTERNAL)

        # 1. Read plaintext bytes
        plaintext = file_obj.read()
        file_size = len(plaintext)
        mime_type = file_obj.content_type or 'application/octet-stream'

        # 2. Envelope encryption AES-256-GCM
        crypto_res = EncryptionManager.encrypt_file_data(plaintext)

        # 3. Save ciphertext to vault
        encrypted_vault = settings.ENCRYPTED_VAULT_DIR
        encrypted_vault.mkdir(parents=True, exist_ok=True)
        filename = f"{uuid.uuid4()}.enc"
        encrypted_file_path = str(encrypted_vault / filename)

        with open(encrypted_file_path, 'wb') as f:
            f.write(crypto_res['encrypted_data'])

        # 4. Create SecureDocument
        document = SecureDocument.objects.create(
            organization=org,
            owner=user,
            title=title,
            description=description,
            classification=classification,
            status=DocumentStatus.ACTIVE
        )

        # 5. Create DocumentVersion
        version = DocumentVersion.objects.create(
            document=document,
            version_number=1,
            file_name=file_obj.name,
            file_size=file_size,
            mime_type=mime_type,
            encrypted_file_path=encrypted_file_path,
            encrypted_dek=crypto_res['encrypted_dek'],
            dek_nonce=crypto_res['dek_nonce'],
            file_nonce=crypto_res['file_nonce'],
            sha256_hash=crypto_res['sha256_hash'],
            uploaded_by=user,
            change_summary='Initial encrypted upload'
        )

        # 6. Immutable audit log
        log_audit_event(
            event_type=EventType.DOC_UPLOAD,
            actor=user,
            organization=org,
            resource_type='DOCUMENT',
            resource_id=document.id,
            resource_name=document.title,
            ip_address=get_client_ip(request),
            details={
                'file_name': file_obj.name,
                'file_size': file_size,
                'sha256': crypto_res['sha256_hash'],
                'classification': classification,
                'encryption': 'AES-256-GCM Envelope Encryption'
            }
        )

        return Response(
            SecureDocumentSerializer(document, context={'request': request}).data,
            status=status.HTTP_201_CREATED
        )


class DocumentDetailView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, pk):
        document = get_object_or_404(SecureDocument, pk=pk)
        has_access, reason, _ = check_document_access(request.user, document, SharePermission.VIEW_METADATA)
        if not has_access:
            log_audit_event(
                event_type=EventType.UNAUTHORIZED_ACCESS_ATTEMPT,
                outcome='DENIED',
                actor=request.user,
                organization=document.organization,
                resource_id=document.id,
                resource_name=document.title,
                ip_address=get_client_ip(request),
                details={'reason': reason, 'attempted_action': 'VIEW_METADATA'}
            )
            return Response({'error': reason}, status=status.HTTP_403_FORBIDDEN)

        log_audit_event(
            event_type=EventType.DOC_METADATA_VIEW,
            actor=request.user,
            organization=document.organization,
            resource_id=document.id,
            resource_name=document.title,
            ip_address=get_client_ip(request)
        )
        return Response(SecureDocumentSerializer(document, context={'request': request}).data)

    def patch(self, request, pk):
        document = get_object_or_404(SecureDocument, pk=pk)
        if document.owner_id != request.user.id and request.user.get_role_in_org(document.organization) != 'ADMIN':
            return Response({'error': 'Only owner or org admin can edit document metadata.'}, status=status.HTTP_403_FORBIDDEN)

        serializer = SecureDocumentSerializer(document, data=request.data, partial=True, context={'request': request})
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def delete(self, request, pk):
        document = get_object_or_404(SecureDocument, pk=pk)
        if document.owner_id != request.user.id and request.user.get_role_in_org(document.organization) != 'ADMIN':
            return Response({'error': 'Only owner or org admin can archive/delete.'}, status=status.HTTP_403_FORBIDDEN)

        document.status = DocumentStatus.ARCHIVED
        document.save(update_fields=['status'])

        log_audit_event(
            event_type=EventType.DOC_ARCHIVE,
            actor=request.user,
            organization=document.organization,
            resource_id=document.id,
            resource_name=document.title,
            ip_address=get_client_ip(request)
        )
        return Response({'message': 'Document archived.'})


class DocumentDownloadView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, pk):
        document = get_object_or_404(SecureDocument, pk=pk)
        ip = get_client_ip(request)

        # Check access permission
        has_access, reason, share = check_document_access(request.user, document, SharePermission.DOWNLOAD_DOCUMENT)
        if not has_access:
            log_audit_event(
                event_type=EventType.UNAUTHORIZED_ACCESS_ATTEMPT,
                outcome='DENIED',
                actor=request.user,
                organization=document.organization,
                resource_id=document.id,
                resource_name=document.title,
                ip_address=ip,
                details={'reason': reason, 'attempted_action': 'DOC_DOWNLOAD'}
            )
            trigger_security_alert(
                organization=document.organization,
                alert_type=AlertType.UNAUTHORIZED_ACCESS_ATTEMPT,
                severity=AlertSeverity.HIGH,
                title=f"Unauthorized download attempt: {document.title}",
                description=f"User {request.user.email} attempted to download '{document.title}' without valid grant. Reason: {reason}."
            )
            return Response({'error': reason}, status=status.HTTP_403_FORBIDDEN)

        # Select version
        version_id = request.query_params.get('version_id')
        if version_id:
            version = get_object_or_404(DocumentVersion, id=version_id, document=document)
        else:
            version = document.latest_version
            if not version:
                return Response({'error': 'No file versions found for this document.'}, status=status.HTTP_404_NOT_FOUND)

        # Read encrypted ciphertext from vault
        if not os.path.exists(version.encrypted_file_path):
            return Response({'error': 'Ciphertext vault file is missing or inaccessible on server.'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        with open(version.encrypted_file_path, 'rb') as f:
            ciphertext = f.read()

        # Decrypt using Envelope Encryption & verify AES-GCM tag + SHA-256
        try:
            plaintext = EncryptionManager.decrypt_file_data(
                ciphertext=ciphertext,
                encrypted_dek_b64=version.encrypted_dek,
                dek_nonce_b64=version.dek_nonce,
                file_nonce_b64=version.file_nonce,
                expected_sha256=version.sha256_hash
            )
        except DocumentIntegrityError as e:
            # Cryptographic failure or tampering detected!
            log_audit_event(
                event_type=EventType.INTEGRITY_FAILURE,
                outcome='FAILED',
                actor=request.user,
                organization=document.organization,
                resource_id=document.id,
                resource_name=document.title,
                ip_address=ip,
                details={'error': str(e), 'version': version.version_number}
            )
            trigger_security_alert(
                organization=document.organization,
                alert_type=AlertType.INTEGRITY_FAILURE,
                severity=AlertSeverity.CRITICAL,
                title=f"Cryptographic Integrity Failure: {document.title}",
                description=f"AES-GCM decryption/checksum verification failed for version {version.version_number}. File ciphertext may have been tampered with!"
            )
            return Response({'error': 'Cryptographic integrity failure. File cannot be decrypted safely.'}, status=status.HTTP_400_BAD_REQUEST)

        # Log successful download
        log_audit_event(
            event_type=EventType.DOC_DOWNLOAD,
            actor=request.user,
            organization=document.organization,
            resource_id=document.id,
            resource_name=document.title,
            ip_address=ip,
            details={
                'version_number': version.version_number,
                'file_name': version.file_name,
                'sha256': version.sha256_hash,
                'share_id': str(share.id) if share else None
            }
        )

        response = HttpResponse(plaintext, content_type=version.mime_type)
        response['Content-Disposition'] = f'attachment; filename="{version.file_name}"'
        response['X-Integrity-SHA256'] = version.sha256_hash
        return response


class DocumentUploadVersionView(APIView):
    permission_classes = [permissions.IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]

    def post(self, request, pk):
        document = get_object_or_404(SecureDocument, pk=pk)
        has_access, reason, _ = check_document_access(request.user, document, SharePermission.UPLOAD_VERSION)
        if not has_access:
            return Response({'error': reason}, status=status.HTTP_403_FORBIDDEN)

        file_obj = request.FILES.get('file')
        if not file_obj:
            return Response({'error': 'No file uploaded.'}, status=status.HTTP_400_BAD_REQUEST)

        change_summary = request.data.get('change_summary', '')
        plaintext = file_obj.read()
        file_size = len(plaintext)
        mime_type = file_obj.content_type or 'application/octet-stream'

        # Envelope encrypt
        crypto_res = EncryptionManager.encrypt_file_data(plaintext)
        filename = f"{uuid.uuid4()}.enc"
        encrypted_file_path = str(settings.ENCRYPTED_VAULT_DIR / filename)

        with open(encrypted_file_path, 'wb') as f:
            f.write(crypto_res['encrypted_data'])

        # Increment version
        last_v = document.versions.order_by('-version_number').first()
        next_v_num = (last_v.version_number + 1) if last_v else 1

        version = DocumentVersion.objects.create(
            document=document,
            version_number=next_v_num,
            file_name=file_obj.name,
            file_size=file_size,
            mime_type=mime_type,
            encrypted_file_path=encrypted_file_path,
            encrypted_dek=crypto_res['encrypted_dek'],
            dek_nonce=crypto_res['dek_nonce'],
            file_nonce=crypto_res['file_nonce'],
            sha256_hash=crypto_res['sha256_hash'],
            uploaded_by=request.user,
            change_summary=change_summary
        )

        log_audit_event(
            event_type=EventType.DOC_VERSION_CREATE,
            actor=request.user,
            organization=document.organization,
            resource_id=document.id,
            resource_name=document.title,
            ip_address=get_client_ip(request),
            details={
                'version_number': next_v_num,
                'file_name': file_obj.name,
                'sha256': crypto_res['sha256_hash']
            }
        )

        return Response(DocumentVersionSerializer(version).data, status=status.HTTP_201_CREATED)


class DocumentIntegrityCheckView(APIView):
    """
    On-demand cryptographic integrity verification endpoint.
    Verifies that the encrypted file in vault matches the stored SHA256 and has not been tampered with.
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        document = get_object_or_404(SecureDocument, pk=pk)
        has_access, reason, _ = check_document_access(request.user, document, SharePermission.VIEW_METADATA)
        if not has_access:
            return Response({'error': reason}, status=status.HTTP_403_FORBIDDEN)

        version = document.latest_version
        if not version or not os.path.exists(version.encrypted_file_path):
            return Response({'error': 'Vault file not found.'}, status=status.HTTP_404_NOT_FOUND)

        with open(version.encrypted_file_path, 'rb') as f:
            ciphertext = f.read()

        try:
            plaintext = EncryptionManager.decrypt_file_data(
                ciphertext=ciphertext,
                encrypted_dek_b64=version.encrypted_dek,
                dek_nonce_b64=version.dek_nonce,
                file_nonce_b64=version.file_nonce,
                expected_sha256=version.sha256_hash
            )
            log_audit_event(
                event_type=EventType.DOC_INTEGRITY_CHECK,
                actor=request.user,
                organization=document.organization,
                resource_id=document.id,
                resource_name=document.title,
                ip_address=get_client_ip(request),
                details={'version': version.version_number, 'status': 'VERIFIED_VALID'}
            )
            return Response({
                'status': 'INTEGRITY_VERIFIED',
                'version_number': version.version_number,
                'sha256': version.sha256_hash,
                'cipher_algorithm': 'AES-256-GCM',
                'envelope_protection': 'MASTER_KEK + DEK',
                'message': 'Cryptographic authentication tag and SHA-256 hash verified intact. No tampering detected.'
            })
        except DocumentIntegrityError as e:
            trigger_security_alert(
                organization=document.organization,
                alert_type=AlertType.INTEGRITY_FAILURE,
                severity=AlertSeverity.CRITICAL,
                title=f"Integrity check failed: {document.title}",
                description=str(e)
            )
            return Response({
                'status': 'INTEGRITY_VIOLATION',
                'error': str(e)
            }, status=status.HTTP_400_BAD_REQUEST)
