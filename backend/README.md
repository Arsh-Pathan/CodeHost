# @codehost/api

The central control plane and execution API for the CodeHost cloud platform. Built with Express, TypeScript, Socket.IO, Prisma ORM, Redis, and Dockerode.

---

## Architecture & Responsibilities

- **Authentication & Security**: JWT-based session verification with refresh token rotation and OAuth2 (Google, GitHub).
- **Container Virtualization**: Automatic Dockerfile generation, multi-stage image builds, cgroup memory/CPU limits, and Traefik/Nginx edge proxy routing.
- **Resource Lifecycle Management (`services/lifecycle.ts`)**:
  - **Free Tier Hibernation**: Auto-sleeps idle free-tier containers after 30 minutes of inactivity.
  - **Container State Reconciliation**: Periodically syncs crashed, exited, or OOM-killed Docker containers with the database status.
  - **Storage Quota Enforcement**: Compares project disk usage against configured tier storage quotas.
  - **Hourly Billing Engine**: Checks active paid-tier projects every hour and executes monthly 30-day credit deductions or safe pause actions.
  - **Pre-Renewal Low-Credit Alerts**: Automatically dispatches low-credit email notices 3 days prior to renewal.
- **Prepaid Credits & Payments (`services/razorpay.ts`)**:
  - Razorpay order creation, payment signature verification, and webhook processing.
  - Self-serve server slot unlocks (`POST /billing/unlock-slot`) at 25 credits per slot.
- **Real-Time Log & Metrics Streaming**:
  - Authenticated Socket.IO handshakes (`io.use`) verifying JWT and project ownership.
  - Real-time build logs and container CPU/memory usage telemetry.
- **Deployment Concurrency Guards**:
  - Redis distributed locks (`deploy-lock:<projectId>`) prevent overlapping build races.
  - Free-tier rate limiting (10 builds/day) to prevent abuse.
- **Transactional Email System (`lib/email.ts`)**:
  - Fully branded HTML email templates with official CodeHost logo branding and zero emojis.

---

## Route Overview

| Path | Purpose | Key Endpoints |
|---|---|---|
| `/auth` | Authentication & User Management | `/signup`, `/login`, `/me`, `/verify-email`, `/resend-verification` |
| `/auth/oauth` | Third-Party Single Sign-On | `/google`, `/github`, `/callback` |
| `/projects` | Project Lifecycle & Settings | `GET /`, `POST /`, `GET /:id`, `PUT /:id`, `DELETE /:id`, `GET /:id/logs` |
| `/deployments` | Git & Archive Deploy Pipeline | `POST /:projectId` (ZIP), `POST /:projectId/github`, `GET /:projectId` |
| `/billing` | Wallet, Tiers & Payments | `/wallet`, `/transactions`, `/tiers`, `/unlock-slot`, `/razorpay/create-order`, `/razorpay/verify-payment`, `/razorpay/webhook` |
| `/referrals` | Referral Program | `GET /`, `GET /stats` |
| `/certificates` | Student Credential Generator | `POST /issue`, `GET /:certNumber`, `GET /user` |
| `/files` | Web-Based File Manager | `GET /:projectId`, `POST /:projectId/read`, `POST /:projectId/write`, `DELETE /:projectId` |
| `/mcp` | Model Context Protocol Server | `GET /` (discovery), `POST /` (JSON-RPC 2.0 `initialize`, `tools/list`, `tools/call`, `resources/list`, `resources/read`) |
| `/admin` | Infrastructure & User Admin | `/stats`, `/health`, `/users`, `/projects`, `/system/metrics` |

---

## Development & Testing

```bash
# Start development server with hot-reload
npm run dev

# Compile TypeScript
npm run build

# Run automated unit and integration tests
npm test
```
