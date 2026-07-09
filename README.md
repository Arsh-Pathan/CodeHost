<p align="center">
  <img src="frontend/public/csky-logo.png" alt="CodeHost Logo" width="200" />
</p>

<h1 align="center">CodeHost</h1>

<p align="center">
  <strong>A minimalist, beginner-friendly Cloud Hosting (PaaS) platform designed for students and developers.</strong><br>
  <em>Deploy your project in one click — even if you don't know what a terminal is.</em>
</p>

<p align="center">
  <a href="https://discord.gg/gsh2qpEXT4"><img src="https://img.shields.io/badge/Discord-Join%20Server-5865F2?style=for-the-badge&logo=discord&logoColor=white" alt="Discord"></a>
  <img src="https://img.shields.io/badge/License-MIT-green?style=for-the-badge" alt="License">
  <img src="https://img.shields.io/badge/Node.js-20+-blue?style=for-the-badge&logo=nodedotjs" alt="Node.js">
  <img src="https://img.shields.io/badge/Docker-Supported-2496ED?style=for-the-badge&logo=docker" alt="Docker">
</p>

---

## ✨ Key Features

- 🚀 **One-Click Deployment**: Upload a `.zip` file or connect a **GitHub Repository** to get a live URL in seconds.
- 🐙 **GitHub Integration**: Deploy directly from any public GitHub repository with branch and subdirectory support.
- 🔮 **Auto-Detection**: Automatically detects 20+ frameworks and languages (Next.js, React, Nuxt, Angular, SvelteKit, Astro, Django, FastAPI, Flask, Go, Rust, Java, Laravel, Deno, Bun, .NET, and more).
- 🛠️ **Modern Build Stack**: Smart package manager detection (npm/yarn/pnpm) and optimized multi-stage Docker builds.
- 🌍 **Subdomain Hosting**: Projects are hosted at `{project}.code-host.online`.
- 📊 **Real-time Logs**: Stream build and runtime logs directly to your browser via WebSockets.
- 🔒 **Safe by Default**: Sandboxed container isolation with strict resource limits.
- 🛡️ **Admin Console**: Enhanced panel for monitoring platform health, users, and detailed deployment stats.
- 🔑 **Multi-Provider Auth**: Sign in with email/password, Google, or GitHub.
- 💳 **Prepaid Billing**: Comprehensive system with Razorpay integration, wallet credits, and tiered resource allocation.

---

## 🏗️ Architecture

CodeHost follows a robust distributed architecture:

- 🧠 **Control Plane**: Central brain managing users, projects, and scheduling.
- ⚡ **Data Plane**: Worker nodes running the **CodeHost Agent**, responsible for building and running containers.
- 🚦 **Reverse Proxy**: Dynamic routing managed by Nginx Proxy.

### Tech Stack
- **Backend**: Node.js (TypeScript) + Express
- **Frontend**: Next.js + Tailwind CSS
- **Database**: PostgreSQL (Prisma ORM)
- **Real-time**: Socket.IO
- **Auth**: JWT + Google OAuth + GitHub OAuth + Nodemailer
- **Infrastructure**: Docker + Nginx + Redis

---

## 🚀 Quick Start (Local & VPS)

### 1. Prerequisites
- Docker and Docker Compose
- Node.js 20+

### 2. Environment Setup
Create a `.env` file in the `infra/` folder. You can copy the template:
```bash
cd infra/
cp .env.example .env
```
Fill out the variables inside `infra/.env` (Database, JWT secrets, OAuth keys, etc.).

### 3. Launch
```bash
docker network create codehost_internal
cd infra/
docker compose up -d
```

### 4. Run Database Migration
After the stack is running, apply the Prisma migration to initialize your database:
```bash
docker exec -it codehost-api npx prisma migrate deploy --schema=./database/prisma/schema.prisma
```

---

## 📁 Project Structure

```text
CodeHost/
├── backend/    # Express backend managing deployments & auth
├── frontend/   # Next.js frontend and Admin Console
├── packages/   # Shared logic for database, docker, logger, and config
└── infra/      # Deployment orchestration and proxy configuration
```

---

## 💳 Billing & Resource Tiers

| Tier | RAM | CPU | Storage | Credits/Month |
|------|-----|-----|---------|---------------|
| **Free** | 128MB | 0.5 | 1GB | ₹0 |
| **Basic** | 256MB | 1.0 | 2GB | ₹100 |
| **Pro** | 512MB | 2.0 | 5GB | ₹300 |
| **Business** | 1GB | 4.0 | 10GB | ₹800 |

- **Prepaid Model**: Buy credits (1 credit = ₹2), then select a tier for each project.
- **Auto-stop**: If your wallet balance is insufficient for a monthly charge, the project container is automatically stopped.
- **Payment Methods**: Seamless integration with Razorpay (UPI, Google Pay, Cards, Netbanking).

---

## 👑 Administrative Actions

To promote a user to Admin, run this directly on your server:

```bash
docker exec -it codehost-db psql -U codehost -d codehost -c "UPDATE \"User\" SET role = 'ADMIN' WHERE email = 'your@email.com';"
```

### Wallet Management (Admin)
Admins can manually adjust user balances via the database if necessary:
```bash
# Add 500 credits to a user
docker exec -it codehost-db psql -U codehost -d codehost -c "UPDATE \"Wallet\" SET balance = balance + 500 WHERE \"userId\" = 'user-uuid';"
```

---

## 📄 License

MIT © [Arsh Pathan](https://github.com/ArshPathan)
