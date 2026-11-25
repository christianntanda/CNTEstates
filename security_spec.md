# CNTEstates Firestore Security Specification & Adversarial TDD Matrix

## 1. Data Invariants & Access Model

### Authentication & Verification
- Every data operation requires an authenticated Firebase user with a verified email (`request.auth != null && request.auth.token.email_verified == true`).
- Platform administrators are resolved exclusively via `/admins/{uid}` document existence or the bootstrapped owner email (`christian.ntanda@gmail.com`). Client writes to `/admins/{uid}` are unconditionally forbidden (`allow write: if false;`).
- Global default-deny catch-all (`match /{document=**} { allow read, write: if false; }`) precedes all collection rules.

### Multi-Tenant Isolation
- Tenant workspaces live under `/organizations/{orgId}` with `ownerId == request.auth.uid`.
- Every tenant subcollection (`members`, `properties`, `units`, `tickets`, `invoices`, `auditLogs`) verifies parent organization ownership (`isOrgOwner(orgId)`) on single-document `get`, `create`, `update`, and `delete` operations.
- Collection queries (`allow list`) never invoke `get()` or `exists()` and strictly require `resource.data.ownerId == request.auth.uid || isAdmin()` (or `resource.data.uid == request.auth.uid || isAdmin()` on `members`).

### Immutability & Terminal State Locking
- `createdAt`, `id`, `organizationId`, and `ownerId` are immutable after creation; `createdAt` and `updatedAt` must equal `request.time`.
- `/organizations/{orgId}/tickets/{ticketId}` is locked once `resource.data.status == 'closed'` (non-admins cannot edit or reopen).
- `/organizations/{orgId}/invoices/{invoiceId}` is locked once `resource.data.invoiceStatus in ['paid', 'void', 'cancelled']` (non-admins cannot alter or delete settled/voided invoices).
- `/organizations/{orgId}/auditLogs/{logId}` is strictly append-only (`allow update, delete: if false;`).

### PII Protection
- `/users/{userId}` stores personal email addresses and preferences. `allow get` is restricted strictly to `isOwner(userId) || isAdmin()`; `allow list` is restricted strictly to `isAdmin()`.

---

## 2. The "Dirty Dozen" — 12 Adversarial JSON Attack Payloads

| # | Attack Vector | Target Collection | Malicious JSON Payload | Expected Result |
|---|---|---|---|---|
| 1 | **Identity Spoofing (Owner Hijack)** | `POST /organizations/org_attacker` | `{ "id": "org_attacker", "ownerId": "victim_uid_999", "name": "Hijacked Org", ... }` | **DENY** (`incoming().ownerId != request.auth.uid`) |
| 2 | **Cross-Tenant Subcollection Injection** | `POST /organizations/org_victim/properties/prop_1` | `{ "id": "prop_1", "organizationId": "org_victim", "ownerId": "attacker_uid", ... }` | **DENY** (`!isOrgOwner("org_victim")`) |
| 3 | **Shadow Field / Privilege Escalation** | `PATCH /users/user_1` | `{ "displayName": "Alice", "isAdmin": true, "role": "super_admin", "updatedAt": "<serverTime>" }` | **DENY** (`affectedKeys().hasOnly(...)` & `keys().hasOnly(...)`) |
| 4 | **Email Spoofing** | `POST /users/user_1` | `{ "uid": "user_1", "email": "christian.ntanda@gmail.com", ... }` (while `token.email == "attacker@example.com"`) | **DENY** (`incoming().email != request.auth.token.email`) |
| 5 | **PII Enumeration (Blanket List)** | `LIST /users` | Authenticated non-admin queries `collection(db, 'users')` | **DENY** (`allow list: if isAdmin();`) |
| 6 | **State Shortcutting on Ticket Creation** | `POST /organizations/org_1/tickets/tkt_1` | `{ "id": "tkt_1", "status": "closed", ... }` | **DENY** (`create` restricts initial `status` to `['new', 'assigned', 'in_progress']`) |
| 7 | **Terminal State Reopening (Closed Ticket)** | `PATCH /organizations/org_1/tickets/tkt_closed` | `{ "status": "in_progress", "updatedAt": "<serverTime>" }` (when existing `status == 'closed'`) | **DENY** (`existing().status != 'closed'`) |
| 8 | **Settled Invoice Tampering** | `PATCH /organizations/org_1/invoices/inv_paid` | `{ "total": 0, "amountDue": 0, "updatedAt": "<serverTime>" }` (when existing `invoiceStatus == 'paid'`) | **DENY** (`!(existing().invoiceStatus in ['paid', 'void', 'cancelled'])`) |
| 9 | **Value Poisoning (Negative Rent / Over-Occupancy)** | `POST /organizations/org_1/properties/prop_bad` | `{ "totalUnits": 10, "occupiedUnits": 999, ... }` or `Unit { "monthlyRent": -500 }` | **DENY** (`occupiedUnits <= totalUnits`, `monthlyRent >= 0`) |
| 10 | **Path / ID Poisoning** | `POST /organizations/org_1/properties/..%2Fadmin` | `{ "id": "../admin", "organizationId": "org_1", ... }` | **DENY** (`isValidId` regex `^[a-zA-Z0-9_\-]+$` rejects traversal) |
| 11 | **Timestamp Backdating** | `POST /organizations/org_1/auditLogs/log_1` | `{ "id": "log_1", "createdAt": "2020-01-01T00:00:00Z", ... }` | **DENY** (`incoming().createdAt == request.time`) |
| 12 | **Audit Log Deletion / Admin Escalation** | `DELETE /organizations/org_1/auditLogs/log_1` or `POST /admins/attacker_uid` | `{ "uid": "attacker_uid", "email": "a@b.com", "grantedAt": "<serverTime>" }` | **DENY** (`allow update, delete: if false;` on auditLogs; `allow write: if false;` on admins) |
