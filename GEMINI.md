## 1. Project Identity

**Name:** CodeHost
**Type:** SaaS Platform
**Category:** Beginner-Friendly Cloud Hosting (PaaS)
**Vision:**
Provide the simplest possible way for students to deploy code online without needing Linux, Docker, ports, or servers.

CodeHost is essentially:

> “Deploy your project in one click — even if you don’t know what a terminal is.”

Target competitors (in complexity order):

- Replit (too complex)
- Railway (still technical)
- Heroku (dead for students)
- Vercel (frontend only)

CodeHost focuses on **absolute beginners first**.

---

## 2. Core Product Rules (Never Break These)

1. Users must never see infrastructure concepts
   - no ports
   - no containers
   - no reverse proxy configs
   - no environment complexity

2. Every action must be explainable in one sentence

3. Default > Configuration
   The system chooses smart defaults automatically

4. Safe by default
   A malicious user cannot harm the VPS

5. Instant feedback
   Every long action streams logs live

6. One-click deployment
   Deploy button always exists

---

## 3. Free Tier Constraints

| Resource  | Limit                |
| --------- | -------------------- |
| RAM       | 128 MB               |
| Storage   | 256 MB               |
| CPU       | Shared               |
| Projects  | 1                    |
| Sleep     | 10 min inactivity    |
| Wake      | Automatic on request |
| Subdomain | `*.codehost.app`     |

System must enforce limits at container level.

---

## 4. Supported Project Types

The platform automatically detects project type using heuristics:

### Static Site

If contains:
index.html

Serve via static server

### Node App

If contains:
package.json

Run:
npm install
npm start OR node index.js

### Python App

If contains:
requirements.txt or main.py

Run:
pip install -r requirements.txt
python main.py

### Worker / Bot

If no open port detected → treat as background worker

---

## 5. High Level Architecture

CodeHost is a distributed system.

### Control Plane

Central brain

Services:

- API
- Scheduler
- Builder
- Database
- Queue

### Data Plane

Worker machines (VPS nodes)

Each VPS runs:

- CodeHost Agent
- Docker
- Resource Monitor
- Container Runner

The Control Plane never directly runs user code.

---

## 6. Services Definition

### API Service

Manages:
users
projects
deployments
auth
limits
logs metadata

### Builder Service

Responsible for:
cloning repos
building projects
creating container images

### Runner Service

Responsible for:
starting containers
stopping containers
sleep/wake logic
resource limits

### Proxy Service

Maps:
subdomain → container

Must dynamically update routes.

### Agent Service (per VPS)

Registers machine capacity
Executes instructions from control plane
Reports health + usage

---

## 7. Deployment Lifecycle

1. User clicks Deploy
2. API creates deployment record
3. Scheduler selects machine
4. Builder builds container image
5. Image transferred to target machine
6. Runner starts container
7. Proxy assigns subdomain
8. Logs streamed to frontend
9. Health check marks deployment live

---

## 8. Scaling Rules

System must support horizontal expansion.

When a new VPS joins:

- installs agent
- registers with control plane
- reports RAM & CPU
- scheduler begins placing workloads

No downtime allowed when adding machines.

---

## 9. Security Model

User code is untrusted.

Must implement:

Container isolation
CPU throttling
Memory hard limits
Network restrictions
No privileged containers
Build timeout
Outbound rate limiting

Prevent:
crypto mining
port scanning
fork bombs

---

## 10. Database Model (Conceptual)

Entities:

Users
Projects
Deployments
Machines
Containers
UsageRecords
BuildLogs

Relationships:
User → Projects (1:N)
Project → Deployments (1:N)
Machine → Containers (1:N)

---

## 11. UX Principles

The UI must feel:

Friendly
Minimal
Calm
Not technical

Avoid words:
container
port
reverse proxy
instance
process

Use instead:
App
Project
Run
Restart
Live
Sleeping

---

## 12. UI Pages

Dashboard
Project Page
Deploy Logs
Usage Meter
Create Project Wizard

The create wizard must be 3 steps max.

---

## 13. Tech Stack (Mandatory)

Backend: Node.js (TypeScript + NestJS)
Frontend: Next.js + Tailwind + shadcn/ui
Database: PostgreSQL
Cache/Queue: Redis
Containers: Docker
Realtime: WebSockets
Proxy: Traefik
Auth: JWT

Do not replace stack unless absolutely required.

---

## 14. Future Paid Plans (Design Compatibility)

Architecture must support:

More RAM tiers
Multiple projects
Custom domains
Always-on apps
Private repos
Team collaboration

Free plan limitations must be enforceable via config — not hardcoded.

---

## 15. Development Behavior for Autonomous Agents

When modifying code:

1. Preserve modular structure
2. Never couple services tightly
3. Prefer adding services over complicating one
4. Write readable code > clever code
5. Add logging for every async operation
6. Every feature must have clear API boundary

Before writing large code:
Always update architecture if required.

---

## 16. Definition of Done

A feature is complete only when:

User can understand it without documentation
Errors are human readable
Logs explain failures
System recovers automatically

---

## 17. Product North Star

> A first year student should deploy their project in under 30 seconds without asking a senior for help.

---
