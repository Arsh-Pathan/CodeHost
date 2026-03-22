# CodeHost

**CodeHost** is a minimalist, beginner-friendly Cloud Hosting (PaaS) platform designed for students and developers who want to deploy their code online without touching a terminal.

> "Deploy your project in one click — even if you don't know what a terminal is."

[![Discord](https://img.shields.io/badge/Discord-Join%20Server-5865F2?style=for-the-badge&logo=discord&logoColor=white)](https://discord.gg/gsh2qpEXT4)

---

## Key Features

- **One-Click Deployment**: Upload a `.zip` file or connect a **GitHub Repository** to get a live URL in seconds.
- **GitHub Integration**: Deploy directly from any public GitHub repository with branch and subdirectory support.
- **Auto-Detection**: Automatically detects project types (Node.js, Python, or Static HTML) with smart build heuristics.
- **Modern Build Stack**: Supports Node.js 20+ and handles modern React peer dependency conflicts automatically using `--legacy-peer-deps`.
- **Subdomain Hosting**: Projects are hosted at `{project}.yourdomain.com` (legacy path-based hosting also supported).
- **Real-time Logs**: Stream build and runtime logs directly to your browser via WebSockets.
- **Safe by Default**: Sandboxed container isolation with strict resource limits (128MB RAM).
- **Admin Console**: Enhanced panel for monitoring platform health, users, and detailed deployment stats.
- **Multi-Provider Auth**: Sign in with email/password, Google, or GitHub. Email verification included.

---

## Architecture

CodeHost follows a distributed architecture:

- **Control Plane**: Central brain managing users, projects, and scheduling.
- **Data Plane**: Worker nodes running the **CodeHost Agent**, responsible for building and running containers.
- **Reverse Proxy**: Dynamic routing managed by **Traefik**.

### Tech Stack

- **Backend**: Node.js (TypeScript) + Express
- **Frontend**: Next.js + Tailwind CSS
- **Database**: PostgreSQL (Prisma ORM)
- **Real-time**: Socket.IO
- **Auth**: JWT + Google OAuth + GitHub OAuth + Nodemailer
- **Infrastructure**: Docker + Traefik + Redis

---

## Quick Start (Local & VPS)

### 1. Prerequisites

- Docker and Docker Compose
- Node.js 20+

### 2. Environment Setup

Create a `.env` file in the project root:

```env
NODE_ENV=production
PORT=80
DOMAIN=your-domain.com

# Database
DB_USER=codehost
DB_PASS=securepass
DB_NAME=codehost
DATABASE_URL=postgresql://codehost:securepass@postgres:5432/codehost
REDIS_URL=redis://redis:6379

# JWT (generate with: openssl rand -base64 32)
JWT_SECRET=your-jwt-secret
JWT_REFRESH_SECRET=your-refresh-secret

# OAuth — Google (https://console.cloud.google.com/apis/credentials)
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=

# OAuth — GitHub (https://github.com/settings/developers)
GITHUB_CLIENT_ID=
GITHUB_CLIENT_SECRET=

# URLs
APP_URL=https://host.your-domain.com
API_URL=https://api.your-domain.com

# SMTP — Email verification (optional, links logged to console if not set)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
```

### 3. OAuth Provider Setup

#### Google

1. Go to [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
2. Create a new **OAuth 2.0 Client ID** (Web application)
3. Set **Authorized JavaScript origins**: `https://api.your-domain.com`
4. Set **Authorized redirect URIs**: `https://api.your-domain.com/auth/oauth/google/callback`
5. Copy the Client ID and Client Secret into your `.env`

#### GitHub

1. Go to [GitHub Developer Settings](https://github.com/settings/developers)
2. Click **New OAuth App**
3. Set **Homepage URL**: `https://host.your-domain.com`
4. Set **Authorization callback URL**: `https://api.your-domain.com/auth/oauth/github/callback`
5. Copy the Client ID, generate a Client Secret, and add both to your `.env`

#### SMTP (Gmail)

1. Enable **2-Step Verification** on your Google account
2. Go to [App Passwords](https://myaccount.google.com/apppasswords)
3. Create an app password named `CodeHost SMTP`
4. Use the 16-character password as `SMTP_PASS` (no spaces)

### 4. Launch

```bash
docker compose --env-file .env -f infra/docker/docker-compose.yml up --build -d
```

### 5. Run Database Migration

After the stack is running, apply the Prisma migration:

```bash
docker exec -it codehost-api npx prisma migrate deploy
```

### 6. Firewall (UFW)

If you are on a VPS, ensure you allow traffic:

```bash
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
```

---

## Project Structure

- `apps/api`: Express backend managing the deployment lifecycle and authentication.
- `apps/web`: Next.js frontend and Admin Console.
- `packages/`: Shared logic for database, docker, logger, and config.
- `infra/docker`: Deployment orchestration and proxy configuration.

---

## Administrative Access

To promote a user to Admin:

```bash
docker exec -it codehost-db psql -U ${DB_USER:-codehost} -d ${DB_NAME:-codehost} -c "UPDATE \"User\" SET role = 'ADMIN' WHERE email = 'your@email.com';"
```

---

## Authentication Flow

| Method | Email Verified | Password Required |
|--------|---------------|-------------------|
| Email + Password | Manual (via email link) | Yes |
| Google OAuth | Automatic | No |
| GitHub OAuth | Automatic | No |

- Unverified users can log in but cannot create projects or deploy
- OAuth auto-links accounts when the email matches an existing user
- Users can log in with either their **email** or **username**

---

## License

MIT © [Arsh Pathan](https://github.com/ArshPathan)
