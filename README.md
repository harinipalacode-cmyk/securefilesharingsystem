# SecureShare — Cross-Organization Secure Document Exchange & Collaboration Platform

SecureShare is an enterprise cross-organization secure document exchange and collaboration platform featuring **AES-256-GCM envelope encryption**, zero-knowledge encrypted vaults, dual-control approval queues, Security Operations Center (SOC) threat monitoring, and immutable compliance audit trails.

---

## Architecture Overview

```
                      +-----------------------------------+
                      |   React 19 Frontend (Vite)       |
                      |   - Encrypted Vault & Decrypt UI  |
                      |   - Cross-Org Sharing & Approvals |
                      |   - SOC Incident Center & Audits  |
                      +-----------------+-----------------+
                                        | (REST API + Token Auth)
                                        v
                      +-----------------------------------+
                      |   Django REST Framework Backend   |
                      +-----------------+-----------------+
                                        |
       +--------------------------------+--------------------------------+
       |                                |                                |
       v                                v                                v
+-------------+              +---------------------+           +-------------------+
|  Envelope   |              | Cross-Organization  |           |   Immutable SOC   |
| Cryptography|              | Governance Engine   |           |    Audit Trail    |
| AES-256-GCM |              | Dual-Control Review |           | Tamper Detection  |
| Master KEK  |              | Permissions & Trust |           | SOC2 / ISO 27001  |
+-------------+              +---------------------+           +-------------------+
```

---

## Key Features

1. **Envelope Encryption (AES-256-GCM)**:
   - Plaintext files are never stored on disk.
   - Every file version is encrypted with a unique 256-bit Data Encryption Key (DEK) and 96-bit cryptographically random nonces.
   - DEKs are encrypted using a Master Key Encryption Key (KEK).
   - Authenticated encryption (GCM tag) and SHA-256 hash checks prevent any server-side tampering.

2. **Cross-Organization Document Sharing**:
   - Federated institution sharing between verified partner organizations.
   - Granular permission levels: *Download & Decrypt*, *View Metadata Only*, and *Upload New Revision*.
   - Optional expiration limits and instant revocation with audit logging.

3. **Dual-Control Approval Queue**:
   - Configurable compliance sign-off requiring Organization Security Officers or Managers to approve cross-organizational transfers of confidential assets before activation.

4. **Security Operations Center (SOC)**:
   - Live threat monitoring tracking unauthorized access probes, role escalations, and cryptographic integrity alerts.
   - One-click incident investigation and resolution workflows.

5. **Immutable Audit Trail**:
   - Chronological, tamper-evident recording of all uploads, downloads, cryptographic checks, logins, and revocations.
   - Built-in SOC2/ISO 27001 CSV export for regulatory auditors.

---

## Running the Platform

### Terminal 1: Backend Server (Django)
```powershell
cd backend
.\venv\Scripts\python.exe manage.py runserver
```
*API will run at `http://127.0.0.1:8000/`*
*OpenAPI / Swagger documentation available at `http://127.0.0.1:8000/api/docs/`*

### Terminal 2: Frontend Server (Vite + React)
```powershell
cd frontend
npm.cmd run dev
```
*Web application will run at `http://localhost:5173/`*

---

## Pre-Configured Demo Accounts

The database is pre-seeded with verified test organizations and users:

| User Email | Role | Organization | Focus Scenario |
| :--- | :--- | :--- | :--- |
| `alex@aegis.gov` | **Security Officer** | Aegis Aerospace & Defense | SOC alerts, audit logs, integrity checks |
| `elena@aegis.gov` | **Admin / Lead Architect** | Aegis Aerospace & Defense | Document owner, vault uploads, sharing |
| `marcus@nexus.org` | **Manager** | Nexus BioTech Labs | Cross-org recipient, approvals reviewer |
| `sarah@apex.com` | **Member / Auditor** | Apex Global Financial | Regulatory compliance, access requests |

> **Password for all demo accounts:** `SecureShare123!`
> 
> *Tip: The login page features a 1-click **Demo Profile Switcher** to easily jump between identities.*
