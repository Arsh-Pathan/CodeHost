import { MetadataRoute } from 'next';

const PUBLIC_ALLOW = [
  '/',
  '/docs',
  '/llms.txt',
  '/llms-full.txt',
  '/status',
  '/certificate/',
  '/signup',
  '/login',
  '/terms',
  '/privacy',
];

const PRIVATE_DISALLOW = ['/admin', '/api/', '/dashboard/', '/auth/', '/verify-email'];

const AI_CRAWLERS = [
  'GPTBot',
  'OAI-SearchBot',
  'ChatGPT-User',
  'ClaudeBot',
  'Claude-Web',
  'PerplexityBot',
  'Google-Extended',
  'Applebot-Extended',
  'cohere-ai',
];

export default function robots(): MetadataRoute.Robots {
  const baseUrl = 'https://code-host.online';

  return {
    rules: [
      {
        userAgent: '*',
        allow: PUBLIC_ALLOW,
        disallow: PRIVATE_DISALLOW,
      },
      ...AI_CRAWLERS.map((userAgent) => ({
        userAgent,
        allow: PUBLIC_ALLOW,
        disallow: PRIVATE_DISALLOW,
      })),
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
