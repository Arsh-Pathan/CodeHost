import fs from 'fs-extra';
import path from 'path';
import { execSync } from 'child_process';
import AdmZip from 'adm-zip';
import tar from 'tar-fs';
import { docker } from '@codehost/docker';
import { logger } from '@codehost/logger';
import { prisma } from '@codehost/database';

import { io } from '../index.js';

export class BuilderService {
  private static extractZip(zipPath: string, extractPath: string) {
    const zip = new AdmZip(zipPath);
    zip.extractAllTo(extractPath, true);
  }

  private static cloneRepo(repoUrl: string, branch: string, targetDir: string, subdir?: string): string {
    // Sanitize inputs to prevent command injection
    const sanitizedUrl = repoUrl.replace(/[;&|`$()]/g, '');
    const sanitizedBranch = branch.replace(/[;&|`$()]/g, '');

    try {
      execSync(
        `git clone --depth 1 --branch "${sanitizedBranch}" "${sanitizedUrl}" "${targetDir}"`,
        { timeout: 120000, stdio: 'pipe' }
      );
    } catch (error: any) {
      if (error.message && (error.message.includes('not found') || error.message.includes('ENOENT'))) {
        throw new Error('Git is not installed in the deployment environment. Please contact support.');
      }
      throw new Error(`Failed to clone repository: ${error.stderr?.toString() || error.message}`);
    }

    // If a subdirectory is specified, return the path to it
    if (subdir) {
      const subdirPath = path.join(targetDir, subdir);
      if (!fs.existsSync(subdirPath)) {
        throw new Error(`Subdirectory "${subdir}" not found in repository`);
      }
      return subdirPath;
    }
    return targetDir;
  }

  /** Safely read a file from the source directory, returns empty string on failure */
  private static async readFileSafe(sourceDir: string, filename: string): Promise<string> {
    try {
      return await fs.readFile(path.join(sourceDir, filename), 'utf8');
    } catch {
      return '';
    }
  }

  /** Helper to wrap a start command as a Docker CMD instruction */
  private static cmdFrom(startCmd: string): string {
    if (startCmd.startsWith('[')) return `CMD ${startCmd}`;
    return `CMD ["sh", "-c", "${startCmd}"]`;
  }

  private static async detectAndGenerateDockerfile(sourceDir: string, project: any): Promise<string> {
    const files = await fs.readdir(sourceDir);
    let dockerfile = '';

    // ── 1. Manual Dockerfile Override ────────────────────────────────
    if (project.dockerfileOverride && project.dockerfileOverride.trim().length > 0) {
      logger.info('Using user-provided Dockerfile override');
      dockerfile = project.dockerfileOverride;
    }
    // ── 2. Explicit Dockerfile in source ─────────────────────────────
    else if (files.includes('Dockerfile')) {
      logger.info('Using Dockerfile found in source');
      dockerfile = await fs.readFile(path.join(sourceDir, 'Dockerfile'), 'utf8');
    }
    // ── 3. Node.js / JavaScript frameworks (package.json) ────────────
    else if (files.includes('package.json')) {
      dockerfile = await this.detectNodeProject(sourceDir, files, project);
    }
    // ── 4. Bun projects (bun.lockb without package.json already handled above) ──
    else if (files.includes('bun.lockb') || files.includes('bunfig.toml')) {
      dockerfile = this.detectBunProject(project);
    }
    // ── 5. Deno projects ─────────────────────────────────────────────
    else if (files.includes('deno.json') || files.includes('deno.jsonc')) {
      dockerfile = await this.detectDenoProject(sourceDir, files, project);
    }
    // ── 6. Python projects ───────────────────────────────────────────
    else if (files.includes('requirements.txt') || files.includes('pyproject.toml') || files.includes('main.py') || files.includes('app.py') || files.includes('manage.py')) {
      dockerfile = await this.detectPythonProject(sourceDir, files, project);
    }
    // ── 7. Go projects ───────────────────────────────────────────────
    else if (files.includes('go.mod')) {
      dockerfile = this.detectGoProject(project);
    }
    // ── 8. Rust projects ─────────────────────────────────────────────
    else if (files.includes('Cargo.toml')) {
      dockerfile = this.detectRustProject(project);
    }
    // ── 9. Java projects (Maven / Gradle) ────────────────────────────
    else if (files.includes('pom.xml') || files.includes('build.gradle') || files.includes('build.gradle.kts')) {
      dockerfile = this.detectJavaProject(files, project);
    }
    // ── 10. Ruby projects ────────────────────────────────────────────
    else if (files.includes('Gemfile')) {
      dockerfile = await this.detectRubyProject(sourceDir, project);
    }
    // ── 11. PHP projects ─────────────────────────────────────────────
    else if (files.includes('composer.json')) {
      dockerfile = await this.detectPhpProject(sourceDir, project);
    }
    // ── 12. .NET / C# projects ───────────────────────────────────────
    else if (files.some(f => f.endsWith('.csproj') || f.endsWith('.fsproj') || f.endsWith('.sln'))) {
      dockerfile = this.detectDotnetProject(files, project);
    }
    // ── 13. Static HTML fallback ─────────────────────────────────────
    else {
      logger.info('Defaulting to Static HTML project');
      dockerfile = `
FROM nginx:alpine
COPY . /usr/share/nginx/html
EXPOSE 80
      `;
    }

    // ── Inject env vars ──────────────────────────────────────────────
    if (project.envVars && typeof project.envVars === 'object') {
      const envLines = Object.entries(project.envVars)
        .map(([key, value]) => `ENV ${key}="${value}"`)
        .join('\n');
      if (envLines) {
        const lines = dockerfile.trim().split('\n');
        lines.splice(1, 0, envLines);
        dockerfile = lines.join('\n');
      }
    }

    await fs.writeFile(path.join(sourceDir, 'Dockerfile'), dockerfile.trim());
    return dockerfile;
  }

  // ═══════════════════════════════════════════════════════════════════
  //  NODE.JS FRAMEWORK DETECTION
  // ═══════════════════════════════════════════════════════════════════
  private static async detectNodeProject(sourceDir: string, files: string[], project: any): Promise<string> {
    let packageJson: any = {};
    try {
      packageJson = JSON.parse(await fs.readFile(path.join(sourceDir, 'package.json'), 'utf8'));
    } catch {
      logger.warn('Failed to parse package.json, using defaults');
    }

    const deps = { ...packageJson.dependencies, ...packageJson.devDependencies };
    const installCmd = project.buildCommand || (files.includes('yarn.lock') ? 'yarn install --frozen-lockfile' : files.includes('pnpm-lock.yaml') ? 'corepack enable && pnpm install --frozen-lockfile' : 'npm install --legacy-peer-deps');
    const buildScript = packageJson.scripts?.build ? 'npm run build' : '';
    const hasBuild = !!buildScript;

    // ── Next.js ──────────────────────────────────────────────────────
    if (deps['next']) {
      logger.info('Detected Next.js project');
      const startCmd = project.startCommand || 'node server.js';
      return `
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json yarn.lock* pnpm-lock.yaml* ./
RUN ${installCmd}
COPY . .
RUN ${hasBuild ? 'npm run build' : 'npx next build'}
FROM node:20-alpine
WORKDIR /app
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
ENV PORT=3000 HOSTNAME=0.0.0.0
EXPOSE 3000
${this.cmdFrom(startCmd)}
      `;
    }

    // ── Nuxt ─────────────────────────────────────────────────────────
    if (deps['nuxt']) {
      logger.info('Detected Nuxt project');
      const startCmd = project.startCommand || 'node .output/server/index.mjs';
      return `
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json yarn.lock* pnpm-lock.yaml* ./
RUN ${installCmd}
COPY . .
RUN ${hasBuild ? 'npm run build' : 'npx nuxi build'}
FROM node:20-alpine
WORKDIR /app
COPY --from=builder /app/.output ./.output
ENV PORT=3000 HOST=0.0.0.0 NITRO_PORT=3000 NITRO_HOST=0.0.0.0
EXPOSE 3000
${this.cmdFrom(startCmd)}
      `;
    }

    // ── Remix ────────────────────────────────────────────────────────
    if (deps['@remix-run/node'] || deps['@remix-run/react']) {
      logger.info('Detected Remix project');
      const startCmd = project.startCommand || 'npm start';
      return `
FROM node:20-alpine
WORKDIR /app
COPY package*.json yarn.lock* pnpm-lock.yaml* ./
RUN ${installCmd}
COPY . .
RUN ${hasBuild ? 'npm run build' : 'npx remix build'}
ENV PORT=3000
EXPOSE 3000
${this.cmdFrom(startCmd)}
      `;
    }

    // ── Gatsby ───────────────────────────────────────────────────────
    if (deps['gatsby']) {
      logger.info('Detected Gatsby project');
      return `
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json yarn.lock* pnpm-lock.yaml* ./
RUN ${installCmd}
COPY . .
RUN ${hasBuild ? 'npm run build' : 'npx gatsby build'}
FROM nginx:alpine
COPY --from=builder /app/public /usr/share/nginx/html
EXPOSE 80
      `;
    }

    // ── Angular ──────────────────────────────────────────────────────
    if (deps['@angular/core']) {
      logger.info('Detected Angular project');
      const projectName = packageJson.name || 'app';
      return `
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json yarn.lock* pnpm-lock.yaml* ./
RUN ${installCmd}
COPY . .
RUN ${hasBuild ? 'npm run build' : 'npx ng build --configuration production'}
FROM nginx:alpine
COPY --from=builder /app/dist/${projectName}/browser /usr/share/nginx/html
EXPOSE 80
      `;
    }

    // ── SvelteKit ────────────────────────────────────────────────────
    if (deps['@sveltejs/kit']) {
      logger.info('Detected SvelteKit project');
      const startCmd = project.startCommand || 'node build';
      return `
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json yarn.lock* pnpm-lock.yaml* ./
RUN ${installCmd}
COPY . .
RUN ${hasBuild ? 'npm run build' : 'npx vite build'}
FROM node:20-alpine
WORKDIR /app
COPY --from=builder /app/build ./build
COPY --from=builder /app/package.json ./
COPY --from=builder /app/node_modules ./node_modules
ENV PORT=3000
EXPOSE 3000
${this.cmdFrom(startCmd)}
      `;
    }

    // ── Astro ────────────────────────────────────────────────────────
    if (deps['astro']) {
      logger.info('Detected Astro project');
      // Check if Astro is SSR (has an adapter) or static
      const isSSR = deps['@astrojs/node'] || deps['@astrojs/vercel'] || deps['@astrojs/netlify'];
      if (isSSR) {
        const startCmd = project.startCommand || 'node dist/server/entry.mjs';
        return `
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json yarn.lock* pnpm-lock.yaml* ./
RUN ${installCmd}
COPY . .
RUN npm run build
FROM node:20-alpine
WORKDIR /app
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
ENV PORT=3000 HOST=0.0.0.0
EXPOSE 3000
${this.cmdFrom(startCmd)}
        `;
      }
      return `
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json yarn.lock* pnpm-lock.yaml* ./
RUN ${installCmd}
COPY . .
RUN ${hasBuild ? 'npm run build' : 'npx astro build'}
FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
EXPOSE 80
      `;
    }

    // ── NestJS ───────────────────────────────────────────────────────
    if (deps['@nestjs/core']) {
      logger.info('Detected NestJS project');
      const startCmd = project.startCommand || 'node dist/main.js';
      return `
FROM node:20-alpine
WORKDIR /app
COPY package*.json yarn.lock* pnpm-lock.yaml* ./
RUN ${installCmd}
COPY . .
RUN ${hasBuild ? 'npm run build' : 'npx nest build'}
ENV PORT=3000
EXPOSE 3000
${this.cmdFrom(startCmd)}
      `;
    }

    // ── Create React App ─────────────────────────────────────────────
    if (deps['react-scripts']) {
      logger.info('Detected Create React App project');
      return `
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json yarn.lock* pnpm-lock.yaml* ./
RUN ${installCmd}
COPY . .
RUN npm run build
FROM nginx:alpine
COPY --from=builder /app/build /usr/share/nginx/html
EXPOSE 80
      `;
    }

    // ── Vite (React, Vue, Svelte, etc.) ──────────────────────────────
    if (deps['vite']) {
      logger.info('Detected Vite project');
      return `
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json yarn.lock* pnpm-lock.yaml* ./
RUN ${installCmd}
COPY . .
RUN ${hasBuild ? 'npm run build' : 'npx vite build'}
FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
EXPOSE 80
      `;
    }

    // ── Generic Node.js server (Express, Fastify, Hapi, etc.) ────────
    const startCmd = project.startCommand || (packageJson.scripts?.start ? 'npm start' : null);
    if (startCmd) {
      const framework = deps['express'] ? 'Express' : deps['fastify'] ? 'Fastify' : deps['hapi'] || deps['@hapi/hapi'] ? 'Hapi' : deps['koa'] ? 'Koa' : 'Node.js';
      logger.info(`Detected ${framework} server project`);
      return `
FROM node:20-alpine
WORKDIR /app
COPY package*.json yarn.lock* pnpm-lock.yaml* ./
RUN ${installCmd}
COPY . .
${hasBuild ? `RUN npm run build\n` : ''}ENV PORT=3000
EXPOSE 3000
${this.cmdFrom(startCmd)}
      `;
    }

    // ── Node.js project with build but no start (static output) ──────
    if (hasBuild) {
      logger.info('Detected Node.js static build project');
      return `
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json yarn.lock* pnpm-lock.yaml* ./
RUN ${installCmd}
COPY . .
RUN npm run build
FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY --from=builder /app/build /usr/share/nginx/html
EXPOSE 80
      `;
    }

    // ── Bare Node.js fallback ────────────────────────────────────────
    logger.info('Detected generic Node.js project');
    return `
FROM node:20-alpine
WORKDIR /app
COPY package*.json yarn.lock* pnpm-lock.yaml* ./
RUN ${installCmd}
COPY . .
ENV PORT=3000
EXPOSE 3000
CMD ["node", "index.js"]
    `;
  }

  // ═══════════════════════════════════════════════════════════════════
  //  BUN PROJECTS
  // ═══════════════════════════════════════════════════════════════════
  private static detectBunProject(project: any): string {
    logger.info('Detected Bun project');
    const startCmd = project.startCommand || 'bun run start';
    return `
FROM oven/bun:latest
WORKDIR /app
COPY . .
RUN bun install
ENV PORT=3000
EXPOSE 3000
${this.cmdFrom(startCmd)}
    `;
  }

  // ═══════════════════════════════════════════════════════════════════
  //  DENO PROJECTS
  // ═══════════════════════════════════════════════════════════════════
  private static async detectDenoProject(sourceDir: string, files: string[], project: any): Promise<string> {
    logger.info('Detected Deno project');
    // Try to find the main entry file
    let entryFile = 'main.ts';
    if (files.includes('mod.ts')) entryFile = 'mod.ts';
    else if (files.includes('main.tsx')) entryFile = 'main.tsx';
    else if (files.includes('server.ts')) entryFile = 'server.ts';

    const startCmd = project.startCommand || `deno run --allow-all ${entryFile}`;
    return `
FROM denoland/deno:latest
WORKDIR /app
COPY . .
RUN deno cache ${entryFile}
ENV PORT=8000
EXPOSE 8000
${this.cmdFrom(startCmd)}
    `;
  }

  // ═══════════════════════════════════════════════════════════════════
  //  PYTHON FRAMEWORK DETECTION
  // ═══════════════════════════════════════════════════════════════════
  private static async detectPythonProject(sourceDir: string, files: string[], project: any): Promise<string> {
    // Read requirements to detect frameworks
    let requirements = '';
    if (files.includes('requirements.txt')) {
      requirements = (await this.readFileSafe(sourceDir, 'requirements.txt')).toLowerCase();
    }
    let pyproject = '';
    if (files.includes('pyproject.toml')) {
      pyproject = (await this.readFileSafe(sourceDir, 'pyproject.toml')).toLowerCase();
    }
    const allDeps = requirements + '\n' + pyproject;

    const installCmd = project.buildCommand || (
      files.includes('requirements.txt')
        ? 'pip install --no-cache-dir -r requirements.txt'
        : files.includes('pyproject.toml')
          ? 'pip install --no-cache-dir .'
          : 'echo "No dependencies to install"'
    );

    // ── Django ────────────────────────────────────────────────────────
    if (allDeps.includes('django') || files.includes('manage.py')) {
      logger.info('Detected Django project');
      const startCmd = project.startCommand || 'python manage.py runserver 0.0.0.0:8000';
      return `
FROM python:3.11-slim
WORKDIR /app
COPY requirements.txt* pyproject.toml* ./
RUN ${installCmd}
COPY . .
RUN python manage.py collectstatic --noinput 2>/dev/null || true
ENV PORT=8000
EXPOSE 8000
${this.cmdFrom(startCmd)}
      `;
    }

    // ── FastAPI ───────────────────────────────────────────────────────
    if (allDeps.includes('fastapi')) {
      logger.info('Detected FastAPI project');
      // Detect the main module
      const mainFile = files.includes('app.py') ? 'app' : files.includes('main.py') ? 'main' : 'main';
      const startCmd = project.startCommand || `uvicorn ${mainFile}:app --host 0.0.0.0 --port 8000`;
      return `
FROM python:3.11-slim
WORKDIR /app
COPY requirements.txt* pyproject.toml* ./
RUN ${installCmd}
COPY . .
ENV PORT=8000
EXPOSE 8000
${this.cmdFrom(startCmd)}
      `;
    }

    // ── Flask ─────────────────────────────────────────────────────────
    if (allDeps.includes('flask')) {
      logger.info('Detected Flask project');
      const mainFile = files.includes('app.py') ? 'app' : files.includes('main.py') ? 'main' : 'app';
      const startCmd = project.startCommand || `flask run --host=0.0.0.0 --port=5000`;
      return `
FROM python:3.11-slim
WORKDIR /app
COPY requirements.txt* pyproject.toml* ./
RUN ${installCmd}
COPY . .
ENV FLASK_APP=${mainFile}.py PORT=5000
EXPOSE 5000
${this.cmdFrom(startCmd)}
      `;
    }

    // ── Streamlit ─────────────────────────────────────────────────────
    if (allDeps.includes('streamlit')) {
      logger.info('Detected Streamlit project');
      const mainFile = files.includes('app.py') ? 'app.py' : 'main.py';
      const startCmd = project.startCommand || `streamlit run ${mainFile} --server.port=8501 --server.address=0.0.0.0`;
      return `
FROM python:3.11-slim
WORKDIR /app
COPY requirements.txt* pyproject.toml* ./
RUN ${installCmd}
COPY . .
ENV PORT=8501
EXPOSE 8501
${this.cmdFrom(startCmd)}
      `;
    }

    // ── Generic Python ────────────────────────────────────────────────
    logger.info('Detected Python project');
    const mainFile = files.includes('app.py') ? 'app.py' : 'main.py';
    const startCmd = project.startCommand || `python ${mainFile}`;
    return `
FROM python:3.11-slim
WORKDIR /app
COPY requirements.txt* pyproject.toml* ./
RUN ${installCmd}
COPY . .
ENV PORT=8080
EXPOSE 8080
${this.cmdFrom(startCmd)}
    `;
  }

  // ═══════════════════════════════════════════════════════════════════
  //  GO PROJECTS
  // ═══════════════════════════════════════════════════════════════════
  private static detectGoProject(project: any): string {
    logger.info('Detected Go project');
    const startCmd = project.startCommand || './app';
    return `
FROM golang:1.22-alpine AS builder
WORKDIR /app
COPY go.mod go.sum* ./
RUN go mod download
COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -o app .
FROM alpine:latest
RUN apk --no-cache add ca-certificates
WORKDIR /app
COPY --from=builder /app/app .
ENV PORT=8080
EXPOSE 8080
${this.cmdFrom(startCmd)}
    `;
  }

  // ═══════════════════════════════════════════════════════════════════
  //  RUST PROJECTS
  // ═══════════════════════════════════════════════════════════════════
  private static detectRustProject(project: any): string {
    logger.info('Detected Rust project');
    const startCmd = project.startCommand || './app';
    return `
FROM rust:1.77-alpine AS builder
RUN apk add --no-cache musl-dev
WORKDIR /app
COPY Cargo.toml Cargo.lock* ./
COPY src ./src
RUN cargo build --release
RUN cp target/release/$(grep '^name' Cargo.toml | head -1 | sed 's/.*= *"\\(.*\\)"/\\1/') /app/app 2>/dev/null || cp target/release/*  /app/app 2>/dev/null || true
FROM alpine:latest
RUN apk --no-cache add ca-certificates
WORKDIR /app
COPY --from=builder /app/app .
ENV PORT=8080
EXPOSE 8080
${this.cmdFrom(startCmd)}
    `;
  }

  // ═══════════════════════════════════════════════════════════════════
  //  JAVA PROJECTS (Maven / Gradle)
  // ═══════════════════════════════════════════════════════════════════
  private static detectJavaProject(files: string[], project: any): string {
    const isMaven = files.includes('pom.xml');
    const isGradle = files.includes('build.gradle') || files.includes('build.gradle.kts');
    const startCmd = project.startCommand || 'java -jar app.jar';

    if (isMaven) {
      logger.info('Detected Java Maven project');
      return `
FROM maven:3.9-eclipse-temurin-21 AS builder
WORKDIR /app
COPY pom.xml ./
RUN mvn dependency:go-offline -B
COPY src ./src
RUN mvn package -DskipTests -B
FROM eclipse-temurin:21-jre-alpine
WORKDIR /app
COPY --from=builder /app/target/*.jar app.jar
ENV PORT=8080
EXPOSE 8080
${this.cmdFrom(startCmd)}
      `;
    }

    logger.info('Detected Java Gradle project');
    const hasWrapper = files.includes('gradlew');
    const buildCmd = hasWrapper ? './gradlew build -x test' : 'gradle build -x test';
    return `
FROM gradle:8-jdk21 AS builder
WORKDIR /app
COPY . .
RUN ${buildCmd}
FROM eclipse-temurin:21-jre-alpine
WORKDIR /app
COPY --from=builder /app/build/libs/*.jar app.jar
ENV PORT=8080
EXPOSE 8080
${this.cmdFrom(startCmd)}
    `;
  }

  // ═══════════════════════════════════════════════════════════════════
  //  RUBY PROJECTS
  // ═══════════════════════════════════════════════════════════════════
  private static async detectRubyProject(sourceDir: string, project: any): Promise<string> {
    const gemfile = (await this.readFileSafe(sourceDir, 'Gemfile')).toLowerCase();
    const isRails = gemfile.includes('rails');

    if (isRails) {
      logger.info('Detected Ruby on Rails project');
      const startCmd = project.startCommand || 'rails server -b 0.0.0.0 -p 3000';
      return `
FROM ruby:3.3-slim
RUN apt-get update -qq && apt-get install -y build-essential libpq-dev nodejs && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY Gemfile Gemfile.lock* ./
RUN bundle install
COPY . .
RUN bundle exec rails assets:precompile 2>/dev/null || true
ENV PORT=3000 RAILS_ENV=production RAILS_SERVE_STATIC_FILES=true
EXPOSE 3000
${this.cmdFrom(startCmd)}
      `;
    }

    logger.info('Detected Ruby project');
    const startCmd = project.startCommand || 'ruby app.rb';
    return `
FROM ruby:3.3-slim
RUN apt-get update -qq && apt-get install -y build-essential && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY Gemfile Gemfile.lock* ./
RUN bundle install
COPY . .
ENV PORT=4567
EXPOSE 4567
${this.cmdFrom(startCmd)}
    `;
  }

  // ═══════════════════════════════════════════════════════════════════
  //  PHP PROJECTS
  // ═══════════════════════════════════════════════════════════════════
  private static async detectPhpProject(sourceDir: string, project: any): Promise<string> {
    const composerRaw = await this.readFileSafe(sourceDir, 'composer.json');
    let composerJson: any = {};
    try { composerJson = JSON.parse(composerRaw); } catch {}
    const allDeps = { ...composerJson.require, ...composerJson['require-dev'] };
    const isLaravel = !!allDeps['laravel/framework'];

    if (isLaravel) {
      logger.info('Detected Laravel project');
      const startCmd = project.startCommand || 'php artisan serve --host=0.0.0.0 --port=8000';
      return `
FROM php:8.3-cli
RUN apt-get update && apt-get install -y unzip libzip-dev && docker-php-ext-install zip pdo pdo_mysql && rm -rf /var/lib/apt/lists/*
COPY --from=composer:latest /usr/bin/composer /usr/bin/composer
WORKDIR /app
COPY . .
RUN composer install --no-dev --optimize-autoloader
ENV PORT=8000
EXPOSE 8000
${this.cmdFrom(startCmd)}
      `;
    }

    logger.info('Detected PHP project');
    return `
FROM php:8.3-apache
RUN a2enmod rewrite
WORKDIR /var/www/html
COPY . .
EXPOSE 80
    `;
  }

  // ═══════════════════════════════════════════════════════════════════
  //  .NET / C# PROJECTS
  // ═══════════════════════════════════════════════════════════════════
  private static detectDotnetProject(files: string[], project: any): string {
    logger.info('Detected .NET project');
    const csproj = files.find(f => f.endsWith('.csproj') || f.endsWith('.fsproj')) || '*.csproj';
    const startCmd = project.startCommand || 'dotnet app.dll';
    return `
FROM mcr.microsoft.com/dotnet/sdk:8.0 AS builder
WORKDIR /app
COPY ${csproj} ./
RUN dotnet restore
COPY . .
RUN dotnet publish -c Release -o out
FROM mcr.microsoft.com/dotnet/aspnet:8.0
WORKDIR /app
COPY --from=builder /app/out .
ENV ASPNETCORE_URLS=http://+:8080 PORT=8080
EXPOSE 8080
${this.cmdFrom(startCmd)}
    `;
  }

  public static async buildProject(
    deploymentId: string,
    projectId: string,
    zipPath?: string,
    gitOptions?: { repoUrl: string; branch: string; subdir?: string }
  ) {
    const storageDir = path.join(process.cwd(), 'storage', 'projects', projectId);
    const sourceDir = path.join(storageDir, 'source');
    const buildTempDir = path.join(process.cwd(), 'tmp', 'builds', deploymentId);
    const cloneTempDir = path.join(process.cwd(), 'tmp', 'clones', deploymentId);

    const emitLog = (message: string) => {
      io.to(`project:${projectId}`).emit('log', {
        type: 'build',
        message: message.trim(),
        timestamp: new Date().toISOString()
      });
    };

    try {
      const project = await prisma.project.findUnique({ where: { id: projectId } });
      if (!project) throw new Error('Project not found');

      await prisma.deployment.update({
        where: { id: deploymentId },
        data: { status: 'building' },
      });
      await prisma.project.update({
        where: { id: projectId },
        data: { status: 'building' },
      });

      if (zipPath) {
        emitLog('> Reading your code...');
        await fs.ensureDir(sourceDir);
        await fs.emptyDir(sourceDir);
        this.extractZip(zipPath, sourceDir);
      } else if (gitOptions) {
        emitLog(`> Cloning repository from GitHub...`);
        emitLog(`> Branch: ${gitOptions.branch}${gitOptions.subdir ? `, Directory: ${gitOptions.subdir}` : ''}`);
        await fs.ensureDir(sourceDir);
        await fs.emptyDir(sourceDir);
        await fs.ensureDir(cloneTempDir);

        try {
          const clonedPath = this.cloneRepo(
            gitOptions.repoUrl,
            gitOptions.branch,
            cloneTempDir,
            gitOptions.subdir
          );
          // Copy cloned content to sourceDir
          await fs.copy(clonedPath, sourceDir, { overwrite: true });
          emitLog('> Repository cloned successfully!');
        } finally {
          await fs.remove(cloneTempDir).catch(() => {});
        }
      }

      emitLog('> Determining the best way to run your app...');
      await this.detectAndGenerateDockerfile(sourceDir, project);

      // We need to pack the source for Docker build
      await fs.ensureDir(buildTempDir);
      const tarStream = tar.pack(sourceDir);
      const imageName = `codehost-project-${projectId.toLowerCase()}:${deploymentId}`;
      
      emitLog('> Building your app...');

      const stream = await docker.buildImage(tarStream, {
        t: imageName,
      });

      await new Promise((resolve, reject) => {
        docker.modem.followProgress(
          stream,
          (err, res) => {
            if (err) return reject(err);
            // Check the last result in the stream for internal build errors
            const lastMessage = Array.isArray(res) ? res[res.length - 1] : res;
            if (lastMessage && lastMessage.error) {
              return reject(new Error(lastMessage.error));
            }
            resolve(res);
          },
          (progress) => {
            if (progress.stream) {
              emitLog(progress.stream);
            }
            if (progress.error) {
              emitLog(`> Error during build: ${progress.error}`);
            }
          }
        );
      });

      emitLog('> Success! Preparing to launch...');
      logger.info(`Successfully built image ${imageName}`);
      return imageName;
    } catch (error: any) {
      emitLog(`> Something went wrong: ${error.message || 'Unknown error'}`);
      logger.error(`Build failed for deployment ${deploymentId}`, error);
      await prisma.deployment.update({
        where: { id: deploymentId },
        data: { status: 'failed' },
      });
      await prisma.project.update({
        where: { id: projectId },
        data: { status: 'failed' },
      });
      throw error;
    } finally {
      await fs.remove(buildTempDir).catch((e) => logger.warn(`Failed to cleanup buildTempDir ${buildTempDir}`, e));
      await fs.remove(cloneTempDir).catch(() => {});
    }
  }
}
