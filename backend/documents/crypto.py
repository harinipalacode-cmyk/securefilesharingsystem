"""
Cryptographic services for SecureShare document encryption.
Implements envelope encryption using AES-256-GCM with authenticated encryption.
"""

import os
import base64
import hashlib
from django.conf import settings
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from cryptography.exceptions import InvalidTag


class DocumentIntegrityError(Exception):
    """Raised when document ciphertext fails AES-GCM authentication or checksum verification."""
    pass


class EncryptionManager:
    """
    Manages envelope encryption for documents using AES-256-GCM.
    
    1. Generates unique 256-bit Data Encryption Key (DEK) per document version.
    2. Uses 96-bit (12 bytes) cryptographically secure random nonces. Never reuses nonces.
    3. Encrypts plaintext file with DEK.
    4. Encrypts DEK with master Key Encryption Key (KEK).
    5. Verifies GCM authentication tag upon decryption.
    """
    
    @staticmethod
    def _get_kek() -> bytes:
        master_kek = getattr(settings, 'MASTER_KEK', None)
        if not master_kek:
            # Fallback derivation for development
            master_kek = hashlib.sha256(settings.SECRET_KEY.encode('utf-8')).digest()
        elif isinstance(master_kek, str):
            master_kek = master_kek.encode('utf-8')[:32].ljust(32, b'0')
        return master_kek

    @classmethod
    def encrypt_file_data(cls, plaintext: bytes) -> dict:
        """
        Encrypts plaintext bytes using envelope encryption.
        Returns dict containing:
        - encrypted_data: bytes (ciphertext + GCM tag)
        - encrypted_dek: base64 str (DEK encrypted with KEK)
        - dek_nonce: base64 str (nonce used to encrypt DEK)
        - file_nonce: base64 str (nonce used to encrypt file)
        - sha256_hash: str (SHA-256 hex digest of plaintext)
        """
        # Calculate SHA256 of plaintext
        sha256_hash = hashlib.sha256(plaintext).hexdigest()
        
        # 1. Generate unique DEK (32 bytes = 256 bits)
        dek = os.urandom(32)
        
        # 2. Encrypt plaintext with DEK and unique 12-byte nonce
        file_nonce = os.urandom(12)
        aesgcm_file = AESGCM(dek)
        # encrypt returns ciphertext + 16-byte auth tag appended
        ciphertext = aesgcm_file.encrypt(file_nonce, plaintext, None)
        
        # 3. Encrypt DEK with KEK
        kek = cls._get_kek()
        dek_nonce = os.urandom(12)
        aesgcm_kek = AESGCM(kek)
        encrypted_dek_bytes = aesgcm_kek.encrypt(dek_nonce, dek, None)
        
        return {
            'encrypted_data': ciphertext,
            'encrypted_dek': base64.b64encode(encrypted_dek_bytes).decode('utf-8'),
            'dek_nonce': base64.b64encode(dek_nonce).decode('utf-8'),
            'file_nonce': base64.b64encode(file_nonce).decode('utf-8'),
            'sha256_hash': sha256_hash
        }

    @classmethod
    def decrypt_file_data(
        cls,
        ciphertext: bytes,
        encrypted_dek_b64: str,
        dek_nonce_b64: str,
        file_nonce_b64: str,
        expected_sha256: str = None
    ) -> bytes:
        """
        Decrypts ciphertext by unwrapping DEK and verifying AES-GCM tag.
        Raises DocumentIntegrityError if authentication tag fails or checksum mismatch.
        """
        try:
            kek = cls._get_kek()
            encrypted_dek = base64.b64decode(encrypted_dek_b64)
            dek_nonce = base64.b64decode(dek_nonce_b64)
            file_nonce = base64.b64decode(file_nonce_b64)
            
            # 1. Decrypt DEK with KEK
            aesgcm_kek = AESGCM(kek)
            dek = aesgcm_kek.decrypt(dek_nonce, encrypted_dek, None)
            
            # 2. Decrypt ciphertext with DEK
            aesgcm_file = AESGCM(dek)
            plaintext = aesgcm_file.decrypt(file_nonce, ciphertext, None)
            
            # 3. Verify SHA-256 if provided
            if expected_sha256:
                actual_sha256 = hashlib.sha256(plaintext).hexdigest()
                if actual_sha256 != expected_sha256:
                    raise DocumentIntegrityError("Decrypted file content SHA-256 does not match stored hash.")
                    
            return plaintext
        except InvalidTag:
            raise DocumentIntegrityError("AES-GCM authentication tag verification failed. File may be corrupted or tampered with.")
        except Exception as e:
            if isinstance(e, DocumentIntegrityError):
                raise
            raise DocumentIntegrityError(f"Decryption failed: {str(e)}")
