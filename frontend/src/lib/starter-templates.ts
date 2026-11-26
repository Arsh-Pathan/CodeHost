export interface StarterTemplateFile {
  path: string;
  content: string;
}

export interface StarterTemplateDefinition {
  id: string;
  name: string;
  tag: string;
  badge: string;
  description: string;
  files: StarterTemplateFile[];
}

export const STARTER_TEMPLATES_MAP: Record<string, StarterTemplateDefinition> = {
  nextjs: {
    id: 'nextjs',
    name: 'Next.js Fullstack Starter',
    tag: 'React & Next.js',
    badge: 'Popular',
    description: 'App Router starter pre-configured for standalone zero-DevOps production hosting.',
    files: [
      {
        path: 'package.json',
        content: JSON.stringify(
          {
            name: 'codehost-nextjs-starter',
            version: '1.0.0',
            private: true,
            scripts: {
              dev: 'next dev',
              build: 'next build',
              start: 'next start -H 0.0.0.0 -p 3000',
            },
            dependencies: {
              next: '^15.1.0',
              react: '^19.0.0',
              'react-dom': '^19.0.0',
            },
            devDependencies: {
              '@types/node': '^22.0.0',
              '@types/react': '^19.0.0',
              '@types/react-dom': '^19.0.0',
              typescript: '^5.6.0',
            },
          },
          null,
          2
        ),
      },
      {
        path: 'next.config.mjs',
        content: `/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
};

export default nextConfig;
`,
      },
      {
        path: 'tsconfig.json',
        content: JSON.stringify(
          {
            compilerOptions: {
              target: 'ES2017',
              lib: ['dom', 'dom.iterable', 'esnext'],
              allowJs: true,
              skipLibCheck: true,
              strict: false,
              noEmit: true,
              esModuleInterop: true,
              module: 'esnext',
              moduleResolution: 'bundler',
              resolveJsonModule: true,
              isolatedModules: true,
              jsx: 'preserve',
              incremental: true,
              plugins: [{ name: 'next' }],
            },
            include: ['next-env.d.ts', '**/*.ts', '**/*.tsx'],
            exclude: ['node_modules'],
          },
          null,
          2
        ),
      },
      {
        path: 'app/layout.tsx',
        content: `import type { ReactNode } from 'react';

export const metadata = {
  title: 'Next.js App on CodeHost',
  description: 'Deployed in seconds on CodeHost Cloud',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, fontFamily: 'system-ui, -apple-system, sans-serif', background: '#0f172a', color: '#f8fafc' }}>
        {children}
      </body>
    </html>
  );
}
`,
      },
      {
        path: 'app/page.tsx',
        content: `export default function HomePage() {
  return (
    <main style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '2rem', textAlign: 'center' }}>
      <span style={{ fontSize: '12px', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#60a5fa', marginBottom: '12px' }}>
        Live on CodeHost
      </span>
      <h1 style={{ fontSize: '2.5rem', fontWeight: 900, margin: '0 0 12px' }}>
        Next.js Starter Deployed
      </h1>
      <p style={{ color: '#94a3b8', maxWidth: '460px', lineHeight: 1.6 }}>
        Edit app/page.tsx directly inside the File Manager and click Deploy to push live updates.
      </p>
    </main>
  );
}
`,
      },
    ],
  },

  fastapi: {
    id: 'fastapi',
    name: 'Python FastAPI & AI Agent',
    tag: 'Python & FastAPI',
    badge: 'AI Ready',
    description: 'Async Python API microservice with interactive Swagger docs and /predict endpoint.',
    files: [
      {
        path: 'requirements.txt',
        content: `fastapi==0.115.6
uvicorn==0.34.0
`,
      },
      {
        path: 'main.py',
        content: `from fastapi import FastAPI
from pydantic import BaseModel

app = FastAPI(title="CodeHost FastAPI Microservice")


class PredictRequest(BaseModel):
    prompt: str = "Hello CodeHost"


@app.get("/")
async def root():
    return {
        "service": "CodeHost FastAPI Starter",
        "status": "online",
        "docs": "/docs",
    }


@app.get("/health")
async def health():
    return {"status": "ok"}


@app.get("/predict")
async def predict(prompt: str = "Hello CodeHost"):
    return {"status": "ok", "prompt": prompt, "response": f"Processed by CodeHost FastAPI: {prompt}"}
`,
      },
    ],
  },

  express: {
    id: 'express',
    name: 'Node Express Microservice',
    tag: 'Node.js & Express',
    badge: 'Real-time',
    description: 'Clean Express REST service with health check endpoint and environment awareness.',
    files: [
      {
        path: 'package.json',
        content: JSON.stringify(
          {
            name: 'codehost-express-starter',
            version: '1.0.0',
            type: 'module',
            scripts: {
              start: 'node src/server.js',
            },
            dependencies: {
              express: '^4.21.2',
            },
          },
          null,
          2
        ),
      },
      {
        path: 'src/server.js',
        content: `import express from 'express';

const app = express();
const port = Number(process.env.PORT) || 3000;

app.use(express.json());

app.get('/', (_req, res) => {
  res.json({
    service: 'CodeHost Express Starter',
    status: 'running',
    uptimeSeconds: Math.round(process.uptime()),
  });
});

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', uptime: process.uptime() });
});

app.listen(port, '0.0.0.0', () => {
  console.log(\`Express server listening on port \${port}\`);
});
`,
      },
    ],
  },

  portfolio: {
    id: 'portfolio',
    name: 'Modern Static Portfolio',
    tag: 'HTML5 & CDN',
    badge: 'Instant CDN',
    description: 'Zero-overhead static portfolio site served via Nginx with automatic HTTPS.',
    files: [
      {
        path: 'index.html',
        content: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Developer Portfolio — Hosted on CodeHost</title>
  <link rel="stylesheet" href="styles.css" />
</head>
<body>
  <main class="container">
    <span class="pill">Live on CodeHost</span>
    <h1>Hi, I build and ship on the web.</h1>
    <p class="subtitle">
      Student developer &amp; builder. Customize index.html and styles.css in your CodeHost File Manager to publish updates in seconds.
    </p>
    <div class="cards">
      <article class="card">
        <h2>Project Alpha</h2>
        <p>Full-stack web application deployed with zero DevOps setup.</p>
      </article>
      <article class="card">
        <h2>API Microservice</h2>
        <p>Containerized backend with automatic TLS and live logs.</p>
      </article>
    </div>
  </main>
</body>
</html>
`,
      },
      {
        path: 'styles.css',
        content: `* { box-sizing: border-box; margin: 0; padding: 0; }
body {
  min-height: 100vh;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  background: #0f172a;
  color: #f8fafc;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 2rem;
}
.container { max-width: 720px; width: 100%; }
.pill {
  display: inline-block;
  font-size: 12px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: #60a5fa;
  background: rgba(37, 99, 235, 0.14);
  border: 1px solid rgba(59, 130, 246, 0.35);
  padding: 6px 12px;
  border-radius: 999px;
  margin-bottom: 20px;
}
h1 { font-size: clamp(2rem, 4vw, 3rem); font-weight: 800; line-height: 1.15; margin-bottom: 16px; }
.subtitle { color: #94a3b8; font-size: 1.05rem; line-height: 1.65; margin-bottom: 32px; }
.cards { display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 16px; }
.card {
  background: #1e293b;
  border: 1px solid #334155;
  border-radius: 16px;
  padding: 20px;
}
.card h2 { font-size: 1.05rem; margin-bottom: 8px; }
.card p { color: #94a3b8; font-size: 0.9rem; line-height: 1.5; }
`,
      },
    ],
  },

  fiber: {
    id: 'fiber',
    name: 'Go Fiber Microservice',
    tag: 'Golang & Fiber',
    badge: 'Blazing Fast',
    description: 'Compiled Go microservice built with Fiber v2 into a lightweight Alpine binary.',
    files: [
      {
        path: 'go.mod',
        content: `module codehost-fiber-starter

go 1.22

require github.com/gofiber/fiber/v2 v2.52.5
`,
      },
      {
        path: 'main.go',
        content: `package main

import (
	"log"
	"os"

	"github.com/gofiber/fiber/v2"
)

func main() {
	app := fiber.New()

	app.Get("/", func(c *fiber.Ctx) error {
		return c.JSON(fiber.Map{
			"service": "CodeHost Go Fiber Starter",
			"status":  "online",
		})
	})

	app.Get("/health", func(c *fiber.Ctx) error {
		return c.JSON(fiber.Map{"status": "ok"})
	})

	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	log.Fatal(app.Listen(":" + port))
}
`,
      },
    ],
  },

  django: {
    id: 'django',
    name: 'Django Batteries-Included',
    tag: 'Python & Django',
    badge: 'Batteries',
    description: 'Ready-to-run Django project with pre-configured URL routing and health endpoint.',
    files: [
      {
        path: 'requirements.txt',
        content: `Django==5.1.4
gunicorn==23.0.0
`,
      },
      {
        path: 'manage.py',
        content: `#!/usr/bin/env python
import os
import sys


def main():
    os.environ.setdefault("DJANGO_SETTINGS_MODULE", "core.settings")
    from django.core.management import execute_from_command_line
    execute_from_command_line(sys.argv)


if __name__ == "__main__":
    main()
`,
      },
      {
        path: 'core/__init__.py',
        content: '',
      },
      {
        path: 'core/settings.py',
        content: `from pathlib import Path
import os

BASE_DIR = Path(__file__).resolve().parent.parent
SECRET_KEY = os.environ.get("DJANGO_SECRET_KEY", "codehost-starter-change-in-production")
DEBUG = os.environ.get("DJANGO_DEBUG", "True").lower() == "true"
ALLOWED_HOSTS = ["*"]

INSTALLED_APPS = [
    "django.contrib.contenttypes",
    "django.contrib.staticfiles",
]

DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.sqlite3",
        "NAME": BASE_DIR / "db.sqlite3",
    }
}

MIDDLEWARE = [
    "django.middleware.common.CommonMiddleware",
]

ROOT_URLCONF = "core.urls"
WSGI_APPLICATION = "core.wsgi.application"
STATIC_URL = "static/"
STATIC_ROOT = BASE_DIR / "staticfiles"
`,
      },
      {
        path: 'core/urls.py',
        content: `from django.http import JsonResponse
from django.urls import path


def index(_request):
    return JsonResponse({"service": "CodeHost Django Starter", "status": "online"})


def health(_request):
    return JsonResponse({"status": "ok"})


urlpatterns = [
    path("", index),
    path("health/", health),
]
`,
      },
      {
        path: 'core/wsgi.py',
        content: `import os
from django.core.wsgi import get_wsgi_application

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "core.settings")
application = get_wsgi_application()
`,
      },
    ],
  },
};
