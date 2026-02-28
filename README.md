# 🚀 CodeHost

**CodeHost** is a minimalist, beginner-friendly Cloud Hosting (PaaS) platform designed for students and developers who want to deploy their code online without touching a terminal.

> “Deploy your project in one click — even if you don’t know what a terminal is.”

---

## ✨ Key Features

- 🖱️ **One-Click Deployment**: Upload a `.zip` file and get a live URL in seconds.
- 📂 **Auto-Detection**: Automatically detects project types (Node.js, Python, or Static HTML).
- 🌐 **Path-Based Hosting**: Projects are hosted at `host.yourdomain.com/{username}/{project}`.
- 📊 **Real-time Logs**: Stream build and runtime logs directly to your browser via WebSockets.
- 🛡️ **Safe by Default**: Sandboxed container isolation with strict resource limits (128MB RAM).
- 🔐 **Admin Console**: Built-in panel for monitoring platform health, users, and deployments.
- 🎨 **Student-Friendly UI**: A calm, non-technical interface built with Next.js and Shadcn/UI.

---

## 🏗️ Architecture

CodeHost follows a distributed architecture:

- **Control Plane**: Central brain managing users, projects, and scheduling.
- **Data Plane**: Worker nodes running the **CodeHost Agent**, responsible for building and running containers.
- **Reverse Proxy**: Dynamic routing managed by **Traefik**.

### Tech Stack

- **Backend**: Node.js (TypeScript) + Express
- **Frontend**: Next.js + Tailwind CSS + Shadcn/UI
- **Database**: PostgreSQL (Prisma ORM)
- **Real-time**: Socket.IO
- **Infrastructure**: Docker + Traefik + Redis

---

## 🛠️ Quick Start (Local & VPS)

### 1. Prerequisites

- Docker and Docker Compose
- Node.js 20+

### 2. Environment Setup

Create a `.env` file in the root:

```env
JWT_SECRET=your_secret
JWT_REFRESH_SECRET=your_refresh_secret
DOMAIN=host.arsh-io.website
PORT=9000
PORT_SUFFIX=:9000
DB_USER=codehost
DB_PASS=securepass
DB_NAME=codehost
```

### 3. Launch

To run the unified stack, use the following command. It's important to use `--env-file .env` so that your custom settings (like `PORT=9000`) are correctly applied by Docker Compose:

```bash
docker compose --env-file .env -f infra/docker/docker-compose.yml up --build -d
```

### 4. Firewall (UFW)

If you are on a VPS, ensure you allow traffic on your custom port:

```bash
sudo ufw allow 9000/tcp
```

---

## 📂 Project Structure

- `apps/api`: Express backend managing the deployment lifecycle.
- `apps/web`: Next.js frontend and Admin Console.
- `packages/`: Shared logic for database, docker, logger, and config.
- `infra/docker`: Deployment orchestration and proxy configuration.

---

## 🛡️ Administrative Access

To promote a user to Admin, replace `your@email.com` with the actual user's email:

```bash
docker exec -it codehost-db psql -U ${DB_USER:-codehost} -d ${DB_NAME:-codehost} -c "UPDATE \"User\" SET role = 'ADMIN' WHERE email = 'your@email.com';"
```

---

## 📜 License

MIT © [Arsh Pathan](https://github.com/ArshPathan)
