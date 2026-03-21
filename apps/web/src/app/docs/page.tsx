import Link from 'next/link';
import { LogoWithText } from '@/components/Logo';
import { ArrowLeft, ArrowRight, Terminal, Upload, Globe, Cpu, FileCode, Settings, AlertTriangle } from 'lucide-react';

export const metadata = {
  title: 'Documentation — CodeHost',
  description: 'Learn how to deploy your projects on CodeHost. Step-by-step guides, supported technologies, and troubleshooting.',
};

function SidebarLink({ href, children, indent }: { href: string; children: React.ReactNode; indent?: boolean }) {
  return (
    <a href={href} className={`block text-sm font-medium text-slate-400 hover:text-[#2563EB] transition-colors ${indent ? 'pl-4' : ''}`}>
      {children}
    </a>
  );
}

function CodeBlock({ children }: { children: string }) {
  return (
    <div className="bg-[#0F171A] rounded-2xl p-6 font-mono text-sm text-blue-300 overflow-x-auto">
      <pre className="whitespace-pre-wrap">{children}</pre>
    </div>
  );
}

function InlineCode({ children }: { children: React.ReactNode }) {
  return (
    <code className="px-1.5 py-0.5 bg-slate-100 text-[#2563EB] rounded-md text-sm font-mono font-semibold">{children}</code>
  );
}

function StepCard({ number, title, children }: { number: string; title: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-6">
      <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-[#2563EB]/10 text-[#2563EB] flex items-center justify-center text-sm font-black">
        {number}
      </div>
      <div className="flex-1 min-w-0">
        <h4 className="text-lg font-black text-[#0F172A] mb-2">{title}</h4>
        <div className="text-slate-600 leading-relaxed">{children}</div>
      </div>
    </div>
  );
}

export default function DocsPage() {
  return (
    <div className="min-h-screen bg-white font-sans text-slate-900 selection:bg-blue-100 selection:text-blue-900">
      {/* Nav */}
      <nav className="fixed top-0 w-full z-50 bg-white/60 backdrop-blur-2xl px-8 py-5 flex items-center justify-between">
        <LogoWithText />
        <div className="hidden md:flex items-center space-x-8">
          <Link href="/#features" className="text-sm font-medium text-slate-400 hover:text-slate-900 transition-colors">Features</Link>
          <Link href="/#pricing" className="text-sm font-medium text-slate-400 hover:text-slate-900 transition-colors">Pricing</Link>
          <Link href="/docs" className="text-sm font-medium text-[#2563EB] transition-colors">Docs</Link>
        </div>
        <div className="flex items-center space-x-3">
          <Link href="/login" className="text-sm font-medium text-slate-500 hover:text-slate-900 px-4 py-2 transition-colors">Login</Link>
          <Link href="/signup" className="px-5 py-2 bg-[#0F172A] text-white text-xs font-semibold rounded-lg hover:bg-slate-800 transition-all">
            Get Started
          </Link>
        </div>
      </nav>

      <div className="pt-32 pb-24 px-6 max-w-7xl mx-auto flex gap-16">
        {/* Sidebar */}
        <aside className="hidden lg:block w-56 flex-shrink-0 sticky top-32 self-start space-y-6">
          <Link href="/" className="inline-flex items-center space-x-2 text-sm font-medium text-slate-400 hover:text-slate-900 transition-colors mb-8">
            <ArrowLeft size={14} />
            <span>Home</span>
          </Link>

          <div className="space-y-2">
            <p className="text-[10px] font-black text-slate-900 uppercase tracking-widest mb-3">Getting Started</p>
            <SidebarLink href="#what-is-codehost">What is CodeHost?</SidebarLink>
            <SidebarLink href="#getting-started">Quick Start</SidebarLink>
            <SidebarLink href="#authentication">Authentication</SidebarLink>
            <SidebarLink href="#how-to-deploy">How to Deploy</SidebarLink>
          </div>

          <div className="space-y-2">
            <p className="text-[10px] font-black text-slate-900 uppercase tracking-widest mb-3">Reference</p>
            <SidebarLink href="#supported-technologies">Supported Technologies</SidebarLink>
            <SidebarLink href="#project-requirements">Project Requirements</SidebarLink>
            <SidebarLink href="#dashboard">Dashboard</SidebarLink>
            <SidebarLink href="#custom-configuration">Custom Configuration</SidebarLink>
          </div>

          <div className="space-y-2">
            <p className="text-[10px] font-black text-slate-900 uppercase tracking-widest mb-3">Help</p>
            <SidebarLink href="#deployment-status">Deployment Status</SidebarLink>
            <SidebarLink href="#troubleshooting">Troubleshooting</SidebarLink>
            <SidebarLink href="#limits">Limits & Quotas</SidebarLink>
          </div>
        </aside>

        {/* Main content */}
        <main className="flex-1 min-w-0 max-w-3xl">
          <h1 className="text-4xl md:text-5xl font-black tracking-tight text-[#0F172A] mb-4">Documentation</h1>
          <p className="text-lg text-slate-500 font-medium mb-16 max-w-2xl">
            Everything you need to deploy your projects on CodeHost. No terminal, no Docker knowledge, no complex setup.
          </p>

          <div className="space-y-20">
            {/* What is CodeHost */}
            <section id="what-is-codehost">
              <div className="flex items-center space-x-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-[#2563EB]/10 flex items-center justify-center">
                  <Globe size={20} className="text-[#2563EB]" />
                </div>
                <h2 className="text-2xl font-black text-[#0F172A]">What is CodeHost?</h2>
              </div>
              <p className="text-slate-600 leading-relaxed mb-4">
                CodeHost is a minimalist cloud hosting platform (PaaS) designed for students and developers who want to deploy their projects online without dealing with servers, terminals, or Docker. Upload a <InlineCode>.zip</InlineCode> file of your project and get a live URL in seconds.
              </p>
              <p className="text-slate-600 leading-relaxed">
                Under the hood, CodeHost auto-detects your project type, generates a Docker container, builds your app, and routes traffic to it via a reverse proxy — all with zero configuration from you.
              </p>
            </section>

            {/* Getting Started */}
            <section id="getting-started">
              <div className="flex items-center space-x-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-[#00BFA5]/10 flex items-center justify-center">
                  <ArrowRight size={20} className="text-[#00BFA5]" />
                </div>
                <h2 className="text-2xl font-black text-[#0F172A]">Getting Started</h2>
              </div>
              <div className="space-y-8">
                <StepCard number="1" title="Create an account">
                  <p>
                    Head to <Link href="/signup" className="text-[#2563EB] font-semibold hover:underline">/signup</Link> and create your account. You can sign up with your email and password, or use <strong>Continue with Google</strong> or <strong>Continue with GitHub</strong> for one-click registration. You&apos;ll be logged in automatically.
                  </p>
                  <p className="mt-2">
                    If you sign up with email, you&apos;ll need to <strong>verify your email address</strong> before you can create projects. Check your inbox for a verification link. OAuth users (Google/GitHub) are verified automatically.
                  </p>
                </StepCard>

                <StepCard number="2" title="Create a new project">
                  <p>
                    From your dashboard, click <strong>&ldquo;New Project&rdquo;</strong>. Enter a project name — lowercase letters, numbers, and dashes only (minimum 3 characters). This name becomes part of your public URL, so pick something meaningful.
                  </p>
                </StepCard>

                <StepCard number="3" title="Upload your code">
                  <p>
                    On the project dashboard, use the <strong>&ldquo;Deploy Zip&rdquo;</strong> uploader in the Console tab. Select a <InlineCode>.zip</InlineCode> file of your project (max 50MB). Your code will be uploaded and the build process starts automatically.
                  </p>
                </StepCard>

                <StepCard number="4" title="Go live">
                  <p>
                    Once the build succeeds, your project is automatically deployed and accessible at:
                  </p>
                  <div className="mt-3">
                    <CodeBlock>{`code-host.online/{your-username}/{project-name}`}</CodeBlock>
                  </div>
                </StepCard>
              </div>
            </section>

            {/* Authentication */}
            <section id="authentication">
              <div className="flex items-center space-x-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-[#8B5CF6]/10 flex items-center justify-center">
                  <Settings size={20} className="text-[#8B5CF6]" />
                </div>
                <h2 className="text-2xl font-black text-[#0F172A]">Authentication</h2>
              </div>
              <p className="text-slate-600 leading-relaxed mb-6">
                CodeHost supports multiple ways to sign in. Choose the method that works best for you.
              </p>

              <h3 className="text-lg font-black text-[#0F172A] mb-3">Sign-in Methods</h3>
              <div className="space-y-4 mb-8">
                <div className="flex items-start gap-4 p-5 rounded-2xl bg-slate-50 border border-slate-100">
                  <span className="text-[10px] font-black text-[#2563EB] uppercase tracking-widest bg-blue-50 px-2 py-1 rounded-lg flex-shrink-0">Email</span>
                  <p className="text-sm text-slate-600">Register with your email, username, and password. You&apos;ll receive a verification email — click the link to unlock all features. You can log in with either your email or username.</p>
                </div>
                <div className="flex items-start gap-4 p-5 rounded-2xl bg-slate-50 border border-slate-100">
                  <span className="text-[10px] font-black text-[#2563EB] uppercase tracking-widest bg-blue-50 px-2 py-1 rounded-lg flex-shrink-0">Google</span>
                  <p className="text-sm text-slate-600">Click &ldquo;Continue with Google&rdquo; to sign in with your Google account. Your email is automatically verified, and a username is generated from your email address.</p>
                </div>
                <div className="flex items-start gap-4 p-5 rounded-2xl bg-slate-50 border border-slate-100">
                  <span className="text-[10px] font-black text-[#2563EB] uppercase tracking-widest bg-blue-50 px-2 py-1 rounded-lg flex-shrink-0">GitHub</span>
                  <p className="text-sm text-slate-600">Click &ldquo;Continue with GitHub&rdquo; to sign in with your GitHub account. Your primary verified email from GitHub is used. Email is automatically verified.</p>
                </div>
              </div>

              <h3 className="text-lg font-black text-[#0F172A] mb-3">Email Verification</h3>
              <p className="text-slate-600 leading-relaxed mb-4">
                Users who sign up with email and password must verify their email before they can create projects or deploy code. After registering, check your inbox for a verification link (valid for 24 hours). You can resend the verification email from the dashboard banner if needed.
              </p>
              <p className="text-slate-600 leading-relaxed mb-4">
                <strong>Unverified users can still log in</strong> and browse the dashboard, but project creation and deployments are restricted until verification is complete.
              </p>

              <h3 className="text-lg font-black text-[#0F172A] mb-3">Account Linking</h3>
              <p className="text-slate-600 leading-relaxed">
                If you sign up with email and later use Google or GitHub OAuth with the <strong>same email address</strong>, your accounts are automatically linked. You&apos;ll be able to sign in with either method going forward. This also marks your email as verified.
              </p>
            </section>

            {/* How to Deploy */}
            <section id="how-to-deploy">
              <div className="flex items-center space-x-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-[#FFB300]/10 flex items-center justify-center">
                  <Upload size={20} className="text-[#FFB300]" />
                </div>
                <h2 className="text-2xl font-black text-[#0F172A]">How Deployment Works</h2>
              </div>
              <p className="text-slate-600 leading-relaxed mb-6">
                When you upload a <InlineCode>.zip</InlineCode> file, the following pipeline runs automatically:
              </p>
              <div className="space-y-4 mb-8">
                <div className="flex items-start gap-4 p-5 rounded-2xl bg-slate-50 border border-slate-100">
                  <span className="text-[10px] font-black text-[#2563EB] uppercase tracking-widest bg-blue-50 px-2 py-1 rounded-lg flex-shrink-0">1. Upload</span>
                  <p className="text-sm text-slate-600">Your zip file is uploaded to CodeHost servers. You&apos;ll see a progress bar during the upload.</p>
                </div>
                <div className="flex items-start gap-4 p-5 rounded-2xl bg-slate-50 border border-slate-100">
                  <span className="text-[10px] font-black text-[#2563EB] uppercase tracking-widest bg-blue-50 px-2 py-1 rounded-lg flex-shrink-0">2. Detect</span>
                  <p className="text-sm text-slate-600">CodeHost inspects your project files and auto-detects the project type: Node.js, Python, or Static HTML.</p>
                </div>
                <div className="flex items-start gap-4 p-5 rounded-2xl bg-slate-50 border border-slate-100">
                  <span className="text-[10px] font-black text-[#2563EB] uppercase tracking-widest bg-blue-50 px-2 py-1 rounded-lg flex-shrink-0">3. Build</span>
                  <p className="text-sm text-slate-600">A Dockerfile is generated, dependencies installed, and a Docker image is built. Build output streams live to your console.</p>
                </div>
                <div className="flex items-start gap-4 p-5 rounded-2xl bg-slate-50 border border-slate-100">
                  <span className="text-[10px] font-black text-[#2563EB] uppercase tracking-widest bg-blue-50 px-2 py-1 rounded-lg flex-shrink-0">4. Run</span>
                  <p className="text-sm text-slate-600">A container is created from the image with resource limits applied. Traefik routes traffic to your container automatically.</p>
                </div>
                <div className="flex items-start gap-4 p-5 rounded-2xl bg-slate-50 border border-slate-100">
                  <span className="text-[10px] font-black text-[#2563EB] uppercase tracking-widest bg-blue-50 px-2 py-1 rounded-lg flex-shrink-0">5. Live</span>
                  <p className="text-sm text-slate-600">Your app is accessible at its public URL. Runtime logs and resource usage stream to your dashboard in real-time.</p>
                </div>
              </div>

              <h3 className="text-lg font-black text-[#0F172A] mb-3">Auto-Detection Logic</h3>
              <p className="text-slate-600 leading-relaxed mb-4">CodeHost determines your project type using these rules, in priority order:</p>
              <div className="overflow-x-auto">
                <table className="w-full text-sm border-collapse">
                  <thead>
                    <tr className="text-left border-b border-slate-200">
                      <th className="py-3 pr-4 text-[10px] font-black text-slate-900 uppercase tracking-widest">Priority</th>
                      <th className="py-3 pr-4 text-[10px] font-black text-slate-900 uppercase tracking-widest">Detection</th>
                      <th className="py-3 text-[10px] font-black text-slate-900 uppercase tracking-widest">Result</th>
                    </tr>
                  </thead>
                  <tbody className="text-slate-600">
                    <tr className="border-b border-slate-50">
                      <td className="py-3 pr-4 font-semibold">1</td>
                      <td className="py-3 pr-4">Dockerfile Override set in Settings</td>
                      <td className="py-3">Uses your custom Dockerfile</td>
                    </tr>
                    <tr className="border-b border-slate-50">
                      <td className="py-3 pr-4 font-semibold">2</td>
                      <td className="py-3 pr-4"><InlineCode>Dockerfile</InlineCode> found in zip root</td>
                      <td className="py-3">Uses your Dockerfile as-is</td>
                    </tr>
                    <tr className="border-b border-slate-50">
                      <td className="py-3 pr-4 font-semibold">3</td>
                      <td className="py-3 pr-4"><InlineCode>package.json</InlineCode> found</td>
                      <td className="py-3">Node.js project (<InlineCode>node:18-alpine</InlineCode>)</td>
                    </tr>
                    <tr className="border-b border-slate-50">
                      <td className="py-3 pr-4 font-semibold">4</td>
                      <td className="py-3 pr-4"><InlineCode>requirements.txt</InlineCode> or <InlineCode>main.py</InlineCode> found</td>
                      <td className="py-3">Python project (<InlineCode>python:3.11-slim</InlineCode>)</td>
                    </tr>
                    <tr>
                      <td className="py-3 pr-4 font-semibold">5</td>
                      <td className="py-3 pr-4">None of the above</td>
                      <td className="py-3">Static site (<InlineCode>nginx:alpine</InlineCode>)</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </section>

            {/* Supported Technologies */}
            <section id="supported-technologies">
              <div className="flex items-center space-x-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-[#8B5CF6]/10 flex items-center justify-center">
                  <Cpu size={20} className="text-[#8B5CF6]" />
                </div>
                <h2 className="text-2xl font-black text-[#0F172A]">Supported Technologies</h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                {/* Node.js */}
                <div className="p-6 rounded-2xl border border-slate-100 bg-white hover:shadow-lg hover:shadow-blue-500/5 transition-all">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center mb-4">
                    <span className="text-lg font-black text-emerald-600">JS</span>
                  </div>
                  <h4 className="text-base font-black text-[#0F172A] mb-2">Node.js</h4>
                  <p className="text-sm text-slate-500 mb-3">Express, Fastify, Next.js, and any Node.js server.</p>
                  <div className="space-y-1 text-xs text-slate-400 font-mono">
                    <p>Base: <InlineCode>node:18-alpine</InlineCode></p>
                    <p>Port: <InlineCode>3000</InlineCode></p>
                    <p>Build: <InlineCode>npm install</InlineCode></p>
                    <p>Start: <InlineCode>npm start</InlineCode></p>
                  </div>
                </div>

                {/* Python */}
                <div className="p-6 rounded-2xl border border-slate-100 bg-white hover:shadow-lg hover:shadow-blue-500/5 transition-all">
                  <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center mb-4">
                    <span className="text-lg font-black text-blue-600">PY</span>
                  </div>
                  <h4 className="text-base font-black text-[#0F172A] mb-2">Python</h4>
                  <p className="text-sm text-slate-500 mb-3">Flask, FastAPI, Django, or any Python application.</p>
                  <div className="space-y-1 text-xs text-slate-400 font-mono">
                    <p>Base: <InlineCode>python:3.11-slim</InlineCode></p>
                    <p>Port: <InlineCode>8080</InlineCode></p>
                    <p>Build: <InlineCode>pip install -r requirements.txt</InlineCode></p>
                    <p>Start: <InlineCode>python main.py</InlineCode></p>
                  </div>
                </div>

                {/* Static */}
                <div className="p-6 rounded-2xl border border-slate-100 bg-white hover:shadow-lg hover:shadow-blue-500/5 transition-all">
                  <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center mb-4">
                    <span className="text-lg font-black text-amber-600">{"<>"}</span>
                  </div>
                  <h4 className="text-base font-black text-[#0F172A] mb-2">Static HTML</h4>
                  <p className="text-sm text-slate-500 mb-3">Plain HTML/CSS/JS sites, portfolios, and landing pages.</p>
                  <div className="space-y-1 text-xs text-slate-400 font-mono">
                    <p>Base: <InlineCode>nginx:alpine</InlineCode></p>
                    <p>Port: <InlineCode>80</InlineCode></p>
                    <p>Build: none</p>
                    <p>Served by Nginx</p>
                  </div>
                </div>
              </div>
            </section>

            {/* Project Requirements */}
            <section id="project-requirements">
              <div className="flex items-center space-x-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-[#E53935]/10 flex items-center justify-center">
                  <FileCode size={20} className="text-[#E53935]" />
                </div>
                <h2 className="text-2xl font-black text-[#0F172A]">Project Requirements</h2>
              </div>

              <h3 className="text-lg font-black text-[#0F172A] mb-3">File Format</h3>
              <ul className="list-disc pl-6 space-y-2 text-slate-600 leading-relaxed mb-8">
                <li>Upload as a <InlineCode>.zip</InlineCode> file only.</li>
                <li>Maximum file size: <strong>50MB</strong>.</li>
                <li>Your project files should be at the root of the zip — not nested inside a subfolder.</li>
              </ul>

              <h3 className="text-lg font-black text-[#0F172A] mb-3">Node.js Projects</h3>
              <ul className="list-disc pl-6 space-y-2 text-slate-600 leading-relaxed mb-8">
                <li>Must include a <InlineCode>package.json</InlineCode> at the root.</li>
                <li>The <InlineCode>start</InlineCode> script in your package.json should start your server.</li>
                <li>Your server <strong>must listen on the <InlineCode>PORT</InlineCode> environment variable</strong> or default to port 3000.</li>
                <li>Do <strong>not</strong> include <InlineCode>node_modules</InlineCode> in your zip. CodeHost runs <InlineCode>npm install</InlineCode> for you.</li>
              </ul>
              <CodeBlock>{`// Example: server.js
const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;

app.get('/', (req, res) => res.send('Hello from CodeHost!'));
app.listen(PORT, () => console.log(\`Server running on port \${PORT}\`));`}</CodeBlock>

              <h3 className="text-lg font-black text-[#0F172A] mt-8 mb-3">Python Projects</h3>
              <ul className="list-disc pl-6 space-y-2 text-slate-600 leading-relaxed mb-8">
                <li>Include a <InlineCode>requirements.txt</InlineCode> for dependencies, or at minimum a <InlineCode>main.py</InlineCode> entry point.</li>
                <li>Your app should listen on port <strong>8080</strong> by default.</li>
                <li>The default start command is <InlineCode>python main.py</InlineCode> — you can override this in Settings.</li>
              </ul>

              <h3 className="text-lg font-black text-[#0F172A] mb-3">Static Sites</h3>
              <ul className="list-disc pl-6 space-y-2 text-slate-600 leading-relaxed">
                <li>Include an <InlineCode>index.html</InlineCode> at the root.</li>
                <li>All files are served directly by Nginx.</li>
                <li>No build step is needed.</li>
              </ul>
            </section>

            {/* Dashboard */}
            <section id="dashboard">
              <div className="flex items-center space-x-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-[#2563EB]/10 flex items-center justify-center">
                  <Terminal size={20} className="text-[#2563EB]" />
                </div>
                <h2 className="text-2xl font-black text-[#0F172A]">Dashboard</h2>
              </div>
              <p className="text-slate-600 leading-relaxed mb-6">
                After creating a project, you land on its dashboard. Here&apos;s what each tab does:
              </p>

              <div className="space-y-6">
                <div className="p-6 rounded-2xl border border-slate-100">
                  <h4 className="text-base font-black text-[#0F172A] mb-2">Console</h4>
                  <p className="text-sm text-slate-600">
                    Live terminal output showing build progress and runtime logs in real-time via WebSockets. This is also where you&apos;ll find the <strong>Deploy Zip</strong> uploader and <strong>Live Resources</strong> panel showing CPU and memory usage.
                  </p>
                </div>
                <div className="p-6 rounded-2xl border border-slate-100">
                  <h4 className="text-base font-black text-[#0F172A] mb-2">File Manager</h4>
                  <p className="text-sm text-slate-600">
                    Browse and edit your uploaded project files directly in the browser. Useful for making quick fixes without re-uploading.
                  </p>
                </div>
                <div className="p-6 rounded-2xl border border-slate-100">
                  <h4 className="text-base font-black text-[#0F172A] mb-2">Network</h4>
                  <p className="text-sm text-slate-600">
                    View your project&apos;s public subdomain URL, internal routing info, and connection protocol. This is where you find the link to share with others.
                  </p>
                </div>
                <div className="p-6 rounded-2xl border border-slate-100">
                  <h4 className="text-base font-black text-[#0F172A] mb-2">History</h4>
                  <p className="text-sm text-slate-600">
                    View your last 10 deployments with their build status (success, failed, or building) and timestamps.
                  </p>
                </div>
                <div className="p-6 rounded-2xl border border-slate-100">
                  <h4 className="text-base font-black text-[#0F172A] mb-2">Settings</h4>
                  <p className="text-sm text-slate-600">
                    Override build commands, start commands, environment variables, and provide a custom Dockerfile. Changes take effect on the next deployment.
                  </p>
                </div>
              </div>
            </section>

            {/* Custom Configuration */}
            <section id="custom-configuration">
              <div className="flex items-center space-x-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-[#0F172A]/10 flex items-center justify-center">
                  <Settings size={20} className="text-[#0F172A]" />
                </div>
                <h2 className="text-2xl font-black text-[#0F172A]">Custom Configuration</h2>
              </div>
              <p className="text-slate-600 leading-relaxed mb-6">
                While CodeHost handles most configuration automatically, you can override defaults in the <strong>Settings</strong> tab:
              </p>

              <h3 className="text-lg font-black text-[#0F172A] mb-3">Build Command</h3>
              <p className="text-slate-600 leading-relaxed mb-4">
                Override the default build step. For Node.js this defaults to <InlineCode>npm install</InlineCode>. You can change it to something like <InlineCode>npm install && npm run build</InlineCode>.
              </p>

              <h3 className="text-lg font-black text-[#0F172A] mb-3">Start Command</h3>
              <p className="text-slate-600 leading-relaxed mb-4">
                Override how your app starts. Default is <InlineCode>npm start</InlineCode> for Node.js or <InlineCode>python main.py</InlineCode> for Python. Make sure your command starts a process that listens on the <InlineCode>PORT</InlineCode> environment variable.
              </p>

              <h3 className="text-lg font-black text-[#0F172A] mb-3">Environment Variables</h3>
              <p className="text-slate-600 leading-relaxed mb-4">
                Add custom environment variables as a JSON object. These are injected into your container at build time.
              </p>
              <CodeBlock>{`{
  "NODE_ENV": "production",
  "API_KEY": "your-secret-key",
  "DATABASE_URL": "postgresql://..."
}`}</CodeBlock>

              <h3 className="text-lg font-black text-[#0F172A] mt-8 mb-3">Dockerfile Override</h3>
              <p className="text-slate-600 leading-relaxed mb-4">
                For full control, paste a complete Dockerfile in the Settings tab. This bypasses all auto-detection and uses your Dockerfile exactly as provided. This is useful for advanced setups or unsupported runtimes.
              </p>
            </section>

            {/* Deployment Status */}
            <section id="deployment-status">
              <div className="flex items-center space-x-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                  <Globe size={20} className="text-emerald-500" />
                </div>
                <h2 className="text-2xl font-black text-[#0F172A]">Deployment Status & Logs</h2>
              </div>

              <h3 className="text-lg font-black text-[#0F172A] mb-3">Project Statuses</h3>
              <div className="overflow-x-auto mb-8">
                <table className="w-full text-sm border-collapse">
                  <thead>
                    <tr className="text-left border-b border-slate-200">
                      <th className="py-3 pr-4 text-[10px] font-black text-slate-900 uppercase tracking-widest">Status</th>
                      <th className="py-3 text-[10px] font-black text-slate-900 uppercase tracking-widest">Meaning</th>
                    </tr>
                  </thead>
                  <tbody className="text-slate-600">
                    <tr className="border-b border-slate-50">
                      <td className="py-3 pr-4"><span className="inline-flex items-center space-x-1.5"><span className="w-2 h-2 rounded-full bg-emerald-500"></span><span className="font-semibold">Running</span></span></td>
                      <td className="py-3">Your project is live and serving requests.</td>
                    </tr>
                    <tr className="border-b border-slate-50">
                      <td className="py-3 pr-4"><span className="inline-flex items-center space-x-1.5"><span className="w-2 h-2 rounded-full bg-blue-500"></span><span className="font-semibold">Building</span></span></td>
                      <td className="py-3">A deployment is being built. Watch the Console tab for progress.</td>
                    </tr>
                    <tr className="border-b border-slate-50">
                      <td className="py-3 pr-4"><span className="inline-flex items-center space-x-1.5"><span className="w-2 h-2 rounded-full bg-slate-400"></span><span className="font-semibold">Idle</span></span></td>
                      <td className="py-3">Project created but no code has been deployed yet.</td>
                    </tr>
                    <tr className="border-b border-slate-50">
                      <td className="py-3 pr-4"><span className="inline-flex items-center space-x-1.5"><span className="w-2 h-2 rounded-full bg-amber-500"></span><span className="font-semibold">Stopped</span></span></td>
                      <td className="py-3">Manually stopped. Click Restart to bring it back.</td>
                    </tr>
                    <tr>
                      <td className="py-3 pr-4"><span className="inline-flex items-center space-x-1.5"><span className="w-2 h-2 rounded-full bg-red-500"></span><span className="font-semibold">Failed</span></span></td>
                      <td className="py-3">The build or container failed to start. Check logs for details.</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <h3 className="text-lg font-black text-[#0F172A] mb-3">Reading Build Logs</h3>
              <p className="text-slate-600 leading-relaxed mb-4">
                Build logs stream in real-time to the Console tab. Here&apos;s what a typical successful deploy looks like:
              </p>
              <CodeBlock>{`> Reading your code...
> Determining the best way to run your app...
> Detected Node.js (Express)
> Building your app...
> npm install: added 58 packages in 4s
> Success! Preparing to launch...
> Your app is now live!`}</CodeBlock>
            </section>

            {/* Troubleshooting */}
            <section id="troubleshooting">
              <div className="flex items-center space-x-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-[#E53935]/10 flex items-center justify-center">
                  <AlertTriangle size={20} className="text-[#E53935]" />
                </div>
                <h2 className="text-2xl font-black text-[#0F172A]">Troubleshooting</h2>
              </div>

              <div className="space-y-8">
                <div>
                  <h3 className="text-base font-black text-[#0F172A] mb-2">Build fails immediately</h3>
                  <ul className="list-disc pl-6 space-y-2 text-slate-600 text-sm">
                    <li>Make sure your project files are at the <strong>root of the zip</strong>, not inside a nested folder.</li>
                    <li>Check that your <InlineCode>package.json</InlineCode> or <InlineCode>requirements.txt</InlineCode> is valid and complete.</li>
                    <li>If using a custom Dockerfile, verify the syntax is correct.</li>
                  </ul>
                </div>

                <div>
                  <h3 className="text-base font-black text-[#0F172A] mb-2">App starts but is unreachable</h3>
                  <ul className="list-disc pl-6 space-y-2 text-slate-600 text-sm">
                    <li>Your server must listen on <InlineCode>0.0.0.0</InlineCode>, not <InlineCode>127.0.0.1</InlineCode> or <InlineCode>localhost</InlineCode>.</li>
                    <li>Use the <InlineCode>PORT</InlineCode> environment variable: Node.js should listen on port 3000, Python on 8080.</li>
                    <li>Check the Network tab for your project&apos;s correct URL.</li>
                  </ul>
                </div>

                <div>
                  <h3 className="text-base font-black text-[#0F172A] mb-2">Container keeps crashing</h3>
                  <ul className="list-disc pl-6 space-y-2 text-slate-600 text-sm">
                    <li>Check the Console for error logs — stderr messages are highlighted in red.</li>
                    <li>Your app might be exceeding the 128MB memory limit. Optimize memory usage or check for memory leaks.</li>
                    <li>Make sure your start command runs a long-lived process, not a script that exits.</li>
                  </ul>
                </div>

                <div>
                  <h3 className="text-base font-black text-[#0F172A] mb-2">Wrong project type detected</h3>
                  <ul className="list-disc pl-6 space-y-2 text-slate-600 text-sm">
                    <li>CodeHost detects based on file presence. Remove conflicting files (e.g., an unused <InlineCode>package.json</InlineCode>).</li>
                    <li>For full control, use the <strong>Dockerfile Override</strong> option in Settings.</li>
                  </ul>
                </div>

                <div>
                  <h3 className="text-base font-black text-[#0F172A] mb-2">Upload rejected</h3>
                  <ul className="list-disc pl-6 space-y-2 text-slate-600 text-sm">
                    <li>Only <InlineCode>.zip</InlineCode> files are accepted.</li>
                    <li>Maximum file size is 50MB. Remove <InlineCode>node_modules</InlineCode>, <InlineCode>.git</InlineCode>, and other unnecessary files before zipping.</li>
                  </ul>
                </div>
              </div>
            </section>

            {/* Limits */}
            <section id="limits">
              <div className="flex items-center space-x-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-[#FFB300]/10 flex items-center justify-center">
                  <Cpu size={20} className="text-[#FFB300]" />
                </div>
                <h2 className="text-2xl font-black text-[#0F172A]">Limits & Quotas</h2>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-sm border-collapse">
                  <thead>
                    <tr className="text-left border-b border-slate-200">
                      <th className="py-3 pr-4 text-[10px] font-black text-slate-900 uppercase tracking-widest">Resource</th>
                      <th className="py-3 text-[10px] font-black text-slate-900 uppercase tracking-widest">Free Tier</th>
                    </tr>
                  </thead>
                  <tbody className="text-slate-600">
                    <tr className="border-b border-slate-50">
                      <td className="py-3 pr-4 font-semibold">Projects</td>
                      <td className="py-3">1 active project</td>
                    </tr>
                    <tr className="border-b border-slate-50">
                      <td className="py-3 pr-4 font-semibold">Memory (RAM)</td>
                      <td className="py-3">128MB per container</td>
                    </tr>
                    <tr className="border-b border-slate-50">
                      <td className="py-3 pr-4 font-semibold">Upload Size</td>
                      <td className="py-3">50MB max per zip</td>
                    </tr>
                    <tr className="border-b border-slate-50">
                      <td className="py-3 pr-4 font-semibold">Deployment History</td>
                      <td className="py-3">Last 10 deployments stored</td>
                    </tr>
                    <tr className="border-b border-slate-50">
                      <td className="py-3 pr-4 font-semibold">Subdomain</td>
                      <td className="py-3">Shared CodeHost subdomain</td>
                    </tr>
                    <tr>
                      <td className="py-3 pr-4 font-semibold">SSL</td>
                      <td className="py-3">Automatic via Traefik</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </section>

            {/* CTA */}
            <section className="pt-12 border-t border-slate-100">
              <div className="p-10 rounded-[2.5rem] bg-[#0F172A] text-center">
                <h3 className="text-2xl font-black text-white mb-3">Ready to deploy?</h3>
                <p className="text-slate-400 font-medium mb-8">Get your project online in under a minute.</p>
                <Link href="/signup" className="inline-flex items-center space-x-2 px-8 py-4 bg-[#2563EB] text-white text-sm font-semibold rounded-xl hover:bg-blue-500 transition-all">
                  <span>Start Hosting Free</span>
                  <ArrowRight size={16} />
                </Link>
              </div>
            </section>
          </div>
        </main>
      </div>

      {/* Footer */}
      <footer className="py-12 px-6 bg-white border-t border-slate-100 text-slate-400 font-medium">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6 text-xs font-bold text-slate-300">
          <p>&copy; 2026 Arsh Pathan. All rights reserved.</p>
          <div className="flex space-x-6">
            <Link href="/terms" className="hover:text-slate-500">Terms</Link>
            <Link href="/privacy" className="hover:text-slate-500">Privacy</Link>
            <Link href="/docs" className="text-slate-500">Docs</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
