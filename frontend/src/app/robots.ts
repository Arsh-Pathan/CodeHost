import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  const baseUrl = 'https://code-host.online';

  return {
    rules: [
      {
        userAgent: '*',
        allow: ['/', '/docs', '/signup', '/login', '/terms', '/privacy'],
        disallow: ['/admin', '/api/', '/dashboard/'],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
