<p align="center">
  <img src="frontend/public/logo.svg" alt="Code Host Logo" width="120" />
</p>

<h1 align="center">Code Host</h1>

<p align="center">
  <strong>Next-Generation Cloud Platform and PaaS Built for Developers and Students</strong><br>
  <em>Deploy repositories, templates, and Docker containers in seconds with automated TLS, isolated virtualization, and transparent prepaid credits.</em>
</p>

<p align="center">
  <a href="https://code-host.online"><img src="https://img.shields.io/badge/Production-Live%20Platform-2563EB?style=for-the-badge&logo=vercel&logoColor=white" alt="Live Platform"></a>
  <a href="https://discord.gg/gsh2qpEXT4"><img src="https://img.shields.io/badge/Discord-Join%20Community-5865F2?style=for-the-badge&logo=discord&logoColor=white" alt="Discord"></a>
  <img src="https://img.shields.io/badge/License-MIT-10B981?style=for-the-badge" alt="License">
  <img src="https://img.shields.io/badge/Node.js-20+-339933?style=for-the-badge&logo=nodedotjs&logoColor=white" alt="Node.js">
  <img src="https://img.shields.io/badge/Next.js-16-000000?style=for-the-badge&logo=nextdotjs&logoColor=white" alt="Next.js">
  <img src="https://img.shields.io/badge/Docker-Containers-2496ED?style=for-the-badge&logo=docker&logoColor=white" alt="Docker">
</p>

---

## Overview

**Code Host** is a developer-first Platform as a Service (PaaS) engineered to remove cloud complexity. Built on high-performance container virtualization, automated TLS edge routing, and a zero-surprise prepaid credit model, Code Host allows developers and engineering teams to launch web applications, APIs, worker services, and databases in under 30 seconds without manual server administration.

- **Live Platform**: [https://code-host.online](https://code-host.online)
- **Documentation**: [https://code-host.online/docs](https://code-host.online/docs)
- **Community**: [https://discord.gg/gsh2qpEXT4](https://discord.gg/gsh2qpEXT4)

---

## Key Platform Capabilities

### 1. One-Click Starter Template Marketplace
Launch pre-configured, production-ready fullstack applications and APIs with zero setup:
- **Next.js 15 Fullstack**: App Router, Tailwind CSS, TypeScript, and Docker containerization.
- **FastAPI AI Server**: Python 3.11, Pydantic v2, CORS, and Swagger UI.
- **Express TypeScript Microservice**: Production health checks, structured logging, and JSON parsing.
- **Django REST Framework**: PostgreSQL-ready, migrations configured, and built-in admin panel.
- **Go Fiber High-Performance API**: Lightweight routing engine with sub-millisecond response benchmarks.
- **Flask Python Lightweight App**: Minimal WSGI application sandbox for microservices and prototyping.

### 2. Universal Git and Zip Deployment
- **Git Push to Deploy**: Connect any public or private GitHub repository with branch and subdirectory support.
- **Drag-and-Drop Archives**: Deploy single or multi-file zip archives directly through the browser console.
- **Automatic Framework Detection**: Zero-configuration detection for over 20 stacks including Next.js, Node.js, Python, Go, Rust, PHP, Bun, Deno, .NET, Ruby, and custom Dockerfiles.

### 3. Scale-to-Zero Engine and Traffic Sleep
- Idle containers automatically hibernate after prolonged periods of zero HTTP traffic to conserve account credits.
- Instant cold-start wakeups in under 800 milliseconds when incoming requests hit your assigned subdomain.

### 4. Managed One-Click Databases
- Provision isolated instances of PostgreSQL, MySQL, Redis, and MongoDB alongside your compute workloads.
- Automatic internal DNS resolution with persistent volume storage for database workloads.

### 5. Automated Subdomains and Free TLS/SSL
- Every deployed service receives a free `https://<service-name>.code-host.online` subdomain with automatic Let's Encrypt TLS encryption.
- Connect custom root domains or subdomains with CNAME and DNS verification.

### 6. Transparent Prepaid Credits and Hackathon Pass
- **Predictable Billing**: No surprise charges or unexpected recurring bills. Buy preset bundles or any custom credit amount starting from INR 16.
- **Free Tier Forever**: Deploy an active sandbox with 128MB RAM, 0.5 CPU quota, 1GB NVMe storage, and free SSL at zero cost.
- **Weekend Hackathon Pass**: Dedicated compute (2 vCPUs, 2GB RAM, 5GB NVMe, priority build queues) for rapid hackathons and production demos.

### 7. Notification and Operations Suite
- Automated transactional email receipts and balance top-up confirmations.
- Real-time container health monitors and status change events.
- Proactive balance thresholds before services undergo auto-hibernation.
- Credential validation and verifiable deployment certificates.

---

## System Architecture

```text
                                  [ Incoming Traffic ]
                                           |
                                           v
                       +--------------------------------------+
                       |          Nginx Reverse Proxy         |
                       |  - Automatic Let's Encrypt TLS       |
                       |  - Subdomain and Edge Routing        |
                       +-------------------+------------------+
                                           |
                 +-------------------------+-------------------------+
                 v                                                   v
  +------------------------------+                    +------------------------------+
  |      Frontend Client         |                    |      Control Plane API       |
  |  - Next.js 16 + Turbopack    |                    |  - Express + TypeScript      |
  |  - Tailwind CSS + Lucide     |<--- WebSocket ---->|  - JWT + OAuth (Google, GH)  |
  |  - Razorpay Integration      |                    |  - PostgreSQL (Prisma ORM)   |
  +------------------------------+                    |  - Nodemailer SMTP Service   |
                                                      +--------------+---------------+
                                                                     |
                                                                     v
                                                      +------------------------------+
                                                      |       Execution Engine       |
                                                      |  - Docker Container Sandbox  |
                                                      |  - BuildKit Multi-Stage      |
                                                      |  - cgroup CPU/RAM Limits     |
                                                      |  - Live Log Streaming        |
                                                      +------------------------------+
```

---

## Tech Stack

| Layer | Technologies |
|---|---|
| **Frontend** | Next.js 16 (App Router), TypeScript, Tailwind CSS, Lucide Icons, Canvas Confetti |
| **Backend** | Express.js, TypeScript, Socket.IO, Nodemailer, Razorpay SDK |
| **Database and Cache** | PostgreSQL 15, Prisma ORM, Redis 7 |
| **Infrastructure** | Docker Engine, Docker Compose, Nginx Reverse Proxy, Ubuntu Linux VPS |
| **Payments** | Razorpay (UPI, Cards, NetBanking, Wallets) |

---

## Resource Plans and Compute Tiers

| Tier | Price / Month | Included Credits | RAM Quota | vCPU Quota | NVMe Storage | Active Projects |
|---|---|---|---|---|---|---|
| **Free** | **INR 0** (Forever) | 0 | 128 MB | 0.5 | 1 GB | 1 |
| **Basic** | **INR 80** | 50 | 256 MB | 1.0 | 2 GB | 3 |
| **Pro** | **INR 240** | 150 | 512 MB | 2.0 | 5 GB | 5 |
| **Business** | **INR 640** | 400 | 1.0 GB | 4.0 | 10 GB | 10 |
| **Hackathon Pass** | **INR 49** (72h) | — | 2.0 GB | 2.0 | 5 GB | 1 |

*Note: Custom credit top-ups can be purchased at any time starting from INR 16.*

---

## Local Development and Self-Hosting

### 1. Prerequisites
- Docker Engine and Docker Compose (v24 or newer)
- Node.js 20 or newer with npm
- Git

### 2. Clone Repository
```bash
git clone https://github.com/Arsh-Pathan/CodeHost.git
cd CodeHost
```

### 3. Environment Configuration
Copy the sample environment file in `infra/`:
```bash
cd infra
cp .env.example .env
```

Configure your environment variables:
```env
# Database
DATABASE_URL="postgresql://codehost:codehost_secret@db:5432/codehost?schema=public"

# Authentication and App URLs
JWT_SECRET="your-secure-jwt-secret"
APP_URL="http://localhost:3000"
API_URL="http://localhost:4000"

# Payments
RAZORPAY_KEY_ID="rzp_test_..."
RAZORPAY_KEY_SECRET="your_razorpay_secret"

# Email Delivery (SMTP)
SMTP_HOST="smtp.gmail.com"
SMTP_PORT=587
SMTP_USER="your-email@gmail.com"
SMTP_PASS="your-app-password"
```

### 4. Boot Services
```bash
# Create shared internal bridge network
docker network create codehost_internal

# Launch containers
docker compose up -d
```

### 5. Apply Database Schema
```bash
docker exec -it codehost-api npx prisma migrate deploy --schema=./database/prisma/schema.prisma
```

---

## Repository Structure

```text
CodeHost/
├── backend/                  # Express TypeScript API server
│   ├── src/
│   │   ├── lib/              # Email templates and utility helpers
│   │   ├── routes/           # Auth, Projects, Deployments, Billing, Admin
│   │   └── services/         # Docker runner, buildpack detection, Razorpay
├── frontend/                 # Next.js 16 Web Application
│   ├── public/               # Static assets, icons, and SVG logos
│   └── src/
│       ├── app/              # App Router pages (Landing, Dashboard, Billing, Docs)
│       └── components/       # Layouts, navigation, brand components, consoles
├── packages/                 # Shared monorepo packages
│   ├── config/               # Shared environment schemas and tier definitions
│   ├── database/             # Prisma schema and client exports
│   ├── docker/               # Dockerode singleton configuration
│   └── logger/               # Pino structured logging
├── infra/                    # Docker Compose files, Nginx proxy, and SSL configs
└── README.md                 # Project documentation
```

---

## Security and Container Isolation

- **Sandboxed Execution**: Workloads run inside unprivileged, isolated Docker containers with memory limits and CPU quotas.
- **Resource Clamping**: Kernel cgroup enforcement prevents noisy-neighbor resource starvation.
- **Network Isolation**: Workloads communicate strictly through isolated Docker bridges without access to the host network.

---

## Contributing

Contributions, issues, and feature requests are welcome:
1. Fork the repository.
2. Create your branch (`git checkout -b feature/your-feature`).
3. Commit your changes (`git commit -m 'feat: add your feature'`).
4. Push to your branch (`git push origin feature/your-feature`).
5. Open a Pull Request.

---

## License

Distributed under the **MIT License**. See `LICENSE` for details.

Developed by [Arsh Pathan](https://github.com/ArshPathan) and the Code Host Community.
