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

### 3. Scale-to-Zero Engine & 24/7 Always-On Compute
- **Free Tier Hibernation**: Free-tier containers automatically sleep after 30 minutes of zero HTTP traffic to conserve shared host memory and compute.
- **Instant Cold Starts**: Wakes up in under 800 milliseconds on incoming web requests or via one-click manual resume from the console.
- **24/7 Always-On for Paid Workloads**: Projects on Basic, Pro, Business, or the Weekend Hackathon Pass run 24/7 uninterrupted without hibernation.

### 4. Managed One-Click Databases
- Provision isolated instances of PostgreSQL, MySQL, Redis, and MongoDB alongside your compute workloads.
- Automatic internal DNS resolution with persistent volume storage for database workloads.

### 5. Automated Subdomains and Free TLS/SSL
- **Free HTTPS Subdomain**: Every deployed service receives a free `https://<service-name>.code-host.online` subdomain with automatic Let's Encrypt TLS encryption.
- **Custom Domains**: Connect custom apex or subdomains with CNAME/A records and automated TLS certificates on all paid tiers (Basic, Pro, Business).

### 6. Transparent Prepaid Credits, Starter Pack & Hackathon Pass
- **Zero Surprises**: No recurring credit card surprises. Buy credits as needed via Razorpay (UPI, NetBanking, Cards). 1 credit = ₹1.60 ($0.02).
- **Preset Packages & Volume Savings**:
  - **Starter Pack**: 50 credits (₹80 / $1.00) — covers 1 full month of Basic Tier hosting.
  - **Developer Pack**: 100 credits (₹160 / $2.00) — standard bundle for prototyping.
  - **Team Pack**: 300 credits (₹400 / $5.00) — 17% savings for multi-app setups.
  - **Pro Scale**: 600 credits (₹720 / $9.00) — 25% savings for heavy production workloads.
  - **Custom Amount**: Purchase any amount starting from just ₹16 (10 credits).
- **Self-Serve Server Slot Unlocks**: Instantly unlock additional permanent server capacity directly from the dashboard for 25 credits per slot.
- **Free Tier Forever**: Deploy a sandbox with 128MB RAM, 0.5 CPU, 1GB NVMe storage, and free SSL at zero cost.
- **Weekend Hackathon Pass**: Dedicated compute (2 vCPUs, 512MB RAM, 5GB NVMe, priority build queues, 24/7 always-on) for ₹49 (72 hours).

### 7. Reliability, Security & Notification Suite
- **Authenticated Real-Time Streams**: Cryptographically authenticated Socket.IO terminal logs and live container metrics.
- **Deployment Concurrency Locks**: Atomic per-project build locks prevent overlapping deployment races.
- **Container Lifecycle Reconciliation**: Automatic synchronization recovers crashed or OOM-killed containers and updates dashboard state.
- **Professional Transactional Emails**: Corporate branded emails featuring the official CodeHost logo, itemized payment receipts, pre-renewal low-credit warnings, and zero emojis.
- **Verifiable Deployment Certificates**: Cryptographically verified student achievement credentials shareable directly on LinkedIn and resumes.

### 8. AI-Native Deployment (MCP Server & `llms.txt`)
- **Model Context Protocol (MCP)**: Streamable HTTP JSON-RPC 2.0 server at `/mcp` (`https://api.code-host.online/mcp`) exposing 10 tools (`codehost_login`, `list_projects`, `get_project`, `create_project`, `deploy_github`, `write_project_files`, `deploy_files`, `get_project_logs`, `control_project`, `get_wallet_and_tiers`) so LLMs can write code and deploy directly.
- **LLM-Readable Context**: Machine-friendly documentation served at `/llms.txt` and `/llms-full.txt`, explicitly permitted in `robots.txt` and indexed in `sitemap.xml`.

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

| Tier | Price / Month | Included Credits | RAM Quota | vCPU Quota | NVMe Storage | Active Projects | Uptime Policy | Custom Domains | Daily Builds |
|---|---|---|---|---|---|---|---|---|---|
| **Free** | **INR 0** (Forever) | 0 | 128 MB | 0.5 | 1 GB | 1 (+1 slot / 25 cr) | Sleep after 30m idle | Subdomain only | 10 / day |
| **Basic** | **INR 80** | 50 | 256 MB | 1.0 | 2 GB | 3 | 24/7 Always-On | Custom Apex & Sub | Unlimited |
| **Pro** | **INR 240** | 150 | 512 MB | 2.0 | 5 GB | 5 | 24/7 Always-On | Custom Apex & Sub | Unlimited |
| **Business** | **INR 640** | 400 | 1.0 GB | 4.0 | 10 GB | 10 | 24/7 Always-On | Custom Apex & Sub | Unlimited |
| **Hackathon Pass** | **INR 49** (72h) | +50 bonus | 512 MB | 2.0 | 5 GB | Up to 5 | 24/7 Always-On | Included (Free TLS) | Unlimited |

*Note: Custom credit top-ups can be purchased at any time starting from INR 16 (10 credits). Additional server slots can be unlocked on-demand for 25 credits.*

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
POSTGRES_USER="codehost"
POSTGRES_PASSWORD="change-me-strong-password"
POSTGRES_DB="codehost"
DATABASE_URL="postgresql://codehost:change-me-strong-password@postgres:5432/codehost?schema=public"

# Authentication and App URLs
JWT_SECRET="your-secure-jwt-secret"
JWT_REFRESH_SECRET="your-secure-refresh-secret"
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
# Create shared proxy network expected by infra/docker-compose.yml
docker network create proxy

# Launch containers
docker compose up -d
```

### 5. Apply Database Schema
```bash
docker exec -it codehost-api npx prisma migrate deploy --schema=./database/prisma/schema.prisma
```

### 6. Run Automated Tests and Build Verification
```bash
# Run unit and integration test suites
npm test --workspaces --if-present

# Compile TypeScript and production builds
npm run build --workspaces --if-present
```

---

## Repository Structure

```text
CodeHost/
├── backend/                  # Express TypeScript API server (@codehost/api)
│   ├── src/
│   │   ├── lib/              # Email templates, validation, socket registry
│   │   ├── routes/           # Auth, Projects, Deployments, Billing, MCP, Admin
│   │   └── services/         # Docker builder/runner, lifecycle, Razorpay
├── billing/                  # Standalone billing micro-worker
├── database/                 # Top-level Prisma schema, migrations, client (@codehost/database)
├── frontend/                 # Next.js 16 Web Application (@codehost/web)
│   ├── public/               # Static assets, Devicon SVGs, llms.txt
│   └── src/
│       ├── app/              # App Router pages (Landing, Dashboard, Billing, Docs)
│       └── components/       # Layouts, navigation, brand components, consoles
├── packages/                 # Shared monorepo packages
│   ├── config/               # Environment schemas and resource tier definitions
│   ├── docker/               # Dockerode singleton and log demuxer
│   ├── logger/               # Pino structured logging with field redaction
│   ├── redis/                # Shared Redis client
│   └── types/                # Shared TypeScript interfaces
├── infra/                    # Docker Compose, Nginx proxy, monitoring configs
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
