<p align="center">
  <img src="frontend/public/csky-logo.png" alt="CodeHost Logo" width="180" />
</p>

<h1 align="center">CodeHost</h1>

<p align="center">
  <strong>Next-Generation Cloud Platform & PaaS Built for Developers & Students</strong><br>
  <em>Deploy any repository, template, or Dockerfile in seconds with zero configuration and zero surprise bills.</em>
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

## ⚡ Overview

**CodeHost** is a minimalist, developer-first Platform as a Service (PaaS) engineered to remove cloud complexity. Built on high-performance container virtualization, automated SSL edge routing, and a zero-surprise prepaid credit model, CodeHost lets you launch web applications, APIs, worker services, and databases in under 30 seconds without ever touching an SSH terminal.

- 🌐 **Live Website**: [https://code-host.online](https://code-host.online)
- 📚 **Platform Documentation**: [https://code-host.online/docs](https://code-host.online/docs)
- 💬 **Discord Community**: [https://discord.gg/gsh2qpEXT4](https://discord.gg/gsh2qpEXT4)

---

## 🚀 Key Features

### 1. 1-Click Starter Template Marketplace
Skip project boilerplate completely. Launch pre-configured, production-ready fullstack apps and APIs in one click:
- **Next.js 15 Fullstack**: App router, Tailwind CSS, TypeScript, and Docker containerization.
- **FastAPI AI Server**: Python 3.11, Pydantic v2, CORS, and Swagger UI.
- **Express TypeScript Microservice**: Production health checks, structured logging, and JSON body parsing.
- **Django REST Framework**: PostgreSQL-ready, migrations pre-wired, and admin dashboard.
- **Go Fiber High-Performance API**: Ultra-fast routing and sub-millisecond responses.
- **Flask Python Lightweight App**: Minimalistic WSGI application sandbox.

### 2. Universal Git & Zip Deployment
- **Git Push to Deploy**: Connect any public or private GitHub repository with branch and subdirectory support.
- **Drag-and-Drop Zip Uploads**: Deploy single or multi-file archives directly from your browser.
- **Automatic Framework Detection**: Zero-Dockerfile detection for 20+ stacks (Next.js, Node.js, Python, Go, Rust, PHP, Bun, Deno, .NET, Ruby, and custom Dockerfiles).

### 3. Scale-to-Zero Engine & Idle Sleep
- Inactive containers automatically hibernate after periods of zero HTTP traffic to preserve your credits.
- Instant cold-start wakeups in `< 800ms` when a new request hits your subdomain.

### 4. Managed 1-Click Databases
- Deploy isolated **PostgreSQL**, **MySQL**, **Redis**, and **MongoDB** instances alongside your application.
- Instant internal DNS connections (`postgres://user:pass@internal-db:5432/app`) with automated volume persistence.

### 5. Automated Custom Domains & Free SSL
- Every project receives a free `https://your-app.code-host.online` subdomain with automatic Let's Encrypt TLS encryption.
- Connect your own custom apex domains or subdomains with CNAME verification.

### 6. Transparent Prepaid Billing & Hackathon Pass
- **Zero Surprise Bills**: No automatic card recurring charges. 1 Credit = ₹1.60 ($0.02). Buy preset bundles or any custom amount from ₹16.
- **Free Tier Forever**: 1 active project at 128MB RAM, 0.5 CPU, 1GB NVMe, and free SSL for ₹0.
- **Weekend Hackathon Pass**: ₹49 for 72 hours of dedicated Pro compute (2 vCPUs, 2GB RAM, 5GB NVMe, priority build sandboxes) for hackathons and demos.

### 7. Full-Featured Email Notification Suite
Automated branded email notifications via SMTP:
- Payment receipts and credit top-up invoices.
- Container status alerts (Running, Stopped, Failed, Building).
- Low credit warnings before containers auto-hibernate.
- Weekend Hackathon Pass activation and expiry reminders.
- Account verification and onboarding walkthroughs.

---

## 🏛️ System Architecture

```
                                  [ User Traffic ]
                                         │
                                         ▼
                      ┌──────────────────────────────────────┐
                      │          Nginx Reverse Proxy         │
                      │  - Automatic Let's Encrypt TLS       │
                      │  - Subdomain & Custom Domain Routing │
                      └──────────────────┬───────────────────┘
                                         │
                 ┌───────────────────────┴───────────────────────┐
                 ▼                                               ▼
  ┌──────────────────────────────┐                ┌──────────────────────────────┐
  │     Frontend Web Client      │                │       Control Plane API      │
  │  - Next.js 16 + Turbopack    │                │  - Express + TypeScript      │
  │  - Tailwind CSS + GSAP       │◄──WebSocket───►│  - JWT + OAuth (Google/GH)   │
  │  - Razorpay Checkout.js      │                │  - PostgreSQL (Prisma ORM)   │
  └──────────────────────────────┘                │  - Nodemailer SMTP Service   │
                                                  └──────────────┬───────────────┘
                                                                 │
                                                                 ▼
                                                  ┌──────────────────────────────┐
                                                  │       Execution Engine       │
                                                  │  - Docker Engine Isolation   │
                                                  │  - BuildKit Multi-Stage      │
                                                  │  - Cgroup RAM/CPU Quotas     │
                                                  │  - Real-time Log Streaming   │
                                                  └──────────────────────────────┘
```

---

## 🛠️ Tech Stack

| Layer | Technologies |
|---|---|
| **Frontend** | Next.js 16 (App Router), TypeScript, Tailwind CSS, Lucide Icons, GSAP, Canvas Confetti |
| **Backend** | Express.js, TypeScript, Socket.IO, Nodemailer, Razorpay SDK |
| **Database & Cache** | PostgreSQL 15, Prisma ORM, Redis 7 |
| **Infrastructure** | Docker Engine, Docker Compose, Nginx Reverse Proxy, Ubuntu Linux VPS |
| **Payments** | Razorpay (UPI, Google Pay, PhonePe, Debit/Credit Cards, NetBanking) |

---

## 💳 Pricing & Resource Tiers

| Tier | Price / Month | Credits | RAM | vCPU | NVMe Storage | Projects |
|---|---|---|---|---|---|---|
| **Free** | **₹0** (Forever) | 0 | 128 MB | 0.5 | 1 GB | 1 |
| **Basic** | **₹80** | 50 | 256 MB | 1.0 | 2 GB | 3 |
| **Pro** | **₹240** | 150 | 512 MB | 2.0 | 5 GB | 5 |
| **Business** | **₹640** | 400 | 1.0 GB | 4.0 | 10 GB | 10 |
| **Hackathon Pass** | **₹49** (72h) | — | 2.0 GB | 2.0 | 5 GB | 1 |

*Note: Custom credit amounts can be purchased anytime starting at ₹16 (10 credits).*

---

## ⚡ Quickstart (Self-Hosting & Local Development)

### 1. Prerequisites
- **Docker Engine & Docker Compose** (v24+)
- **Node.js 20+** and **npm** or **pnpm**
- **Git**

### 2. Clone the Repository
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
Configure the necessary variables:
```env
# Database
DATABASE_URL="postgresql://codehost:codehost_secret@db:5432/codehost?schema=public"

# Authentication & Application
JWT_SECRET="your-super-secure-jwt-secret"
APP_URL="http://localhost:3000"
API_URL="http://localhost:4000"

# Payments (Razorpay)
RAZORPAY_KEY_ID="rzp_test_..."
RAZORPAY_KEY_SECRET="your_razorpay_secret"

# Email Delivery (SMTP)
SMTP_HOST="smtp.gmail.com"
SMTP_PORT=587
SMTP_USER="your-email@gmail.com"
SMTP_PASS="your-app-password"
```

### 4. Boot the Infrastructure
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

## 📁 Repository Structure

```text
CodeHost/
├── backend/                  # Express TypeScript API server
│   ├── src/
│   │   ├── lib/              # Email templates and utility helpers
│   │   ├── routes/           # Auth, Projects, Deployments, Billing, Admin
│   │   └── services/         # Docker runner, buildpack detection, Razorpay
├── frontend/                 # Next.js 16 Web Application
│   ├── public/               # Static assets and brand logos
│   └── src/
│       ├── app/              # App router pages (Landing, Dashboard, Billing, Docs)
│       └── components/       # Panel layouts, navbar, and terminal consoles
├── packages/                 # Shared monorepo packages
│   ├── config/               # Shared environment schemas and tier definitions
│   ├── database/             # Prisma schema and client exports
│   ├── docker/               # Dockerode singleton configuration
│   └── logger/               # Pino structured logging
├── infra/                    # Docker Compose files, Nginx proxy, and SSL configs
└── README.md                 # Project documentation
```

---

## 🛡️ Security & Container Isolation

- **Sandboxed Execution**: Every project runs in an unprivileged, isolated Docker container with strict memory limits and CPU constraints.
- **Resource Clamping**: Built-in OOM (Out Of Memory) protection and process limits prevent noisy-neighbor attacks.
- **Safe Networking**: Containers communicate strictly through isolated Docker bridges with no access to the host host-level network.

---

## 🤝 Contributing

Contributions, feature suggestions, and bug reports are warmly welcome!
1. Fork the Project.
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`).
3. Commit your Changes (`git commit -m 'feat: Add AmazingFeature'`).
4. Push to the Branch (`git push origin feature/AmazingFeature`).
5. Open a Pull Request.

---

## 📄 License

Distributed under the **MIT License**. See `LICENSE` for more information.

Developed with ❤️ by [Arsh Pathan](https://github.com/ArshPathan) and the CodeHost Community.
