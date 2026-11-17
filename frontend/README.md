# CodeHost Frontend (`web`)

The official Next.js 16 web application and developer console for the CodeHost cloud platform.

Built with **Next.js 16 (App Router)**, **React 19**, **Tailwind CSS v4**, **Socket.IO Client**, and **Lucide Icons**.

---

## Key Features & Interfaces

- **Marketing Landing Page (`/`)**:
  - Starter template showcase with one-click deployment links.
  - Interactive resource tier calculator and feature comparison.
  - Real-time platform server counter (`GET /stats/public`).
- **Dashboard (`/dashboard`)**:
  - Active server capacity banner with **Unlock +1 Slot (25 cr)** action and **Buy Credits** modal trigger.
  - Quick Top-Up & Scale credit packs widget.
  - Live server status cards with memory and status indicators.
- **Project Creation Wizard (`/dashboard/new`)**:
  - One-click verified starter templates (Next.js, FastAPI, Express, Django, Go Fiber, Flask).
  - Git repository push or drag-and-drop ZIP archive uploads.
  - Compute tier selector with live credit balance deficit warnings and top-up actions.
- **Interactive Project Console (`/dashboard/project/[id]`)**:
  - Real-time authenticated Socket.IO log terminal with pre-loaded historical logs on refresh.
  - Free-tier auto-hibernation notice with one-click **Wake Server** and **Upgrade to 24/7** actions.
  - Live container CPU and memory usage telemetry.
  - Integrated in-browser file manager (read, write, delete project files).
  - Environment variable editor, custom domain manager, and custom Dockerfile overrides.
- **Credit Top-Up & Checkout Modal (`components/CreditTopUpModal.tsx`)**:
  - Dynamic Razorpay payment gateway integration supporting UPI, NetBanking, and Cards.
  - Preset packages: 50 Credits (Starter ₹80), 100 Credits (Developer ₹160), 300 Credits (Team ₹400), 600 Credits (Pro Scale ₹720).
  - Weekend Hackathon Pass (₹49 for 72h Pro access) and custom credit purchase modes.
- **Student Accreditation & Certificates (`/certificate/[id]`)**:
  - Verifiable cloud deployment certificate page with QR code verification and dynamic OpenGraph social share previews.
- **Documentation & Status Pages**:
  - Full platform documentation (`/docs`).
  - Public system health and uptime monitors (`/status`, `/uptime`).

---

## Environment Variables

Create `.env.local` in the `frontend` directory:

```env
# URL of the backend API control plane
NEXT_PUBLIC_API_URL="http://localhost:4000"
```

In production, the API defaults to `https://api.code-host.online`.

---

## Development & Build

```bash
# Run local development server with Turbopack
npm run dev

# Generate optimized production build
npm run build

# Start production server
npm run start
```
