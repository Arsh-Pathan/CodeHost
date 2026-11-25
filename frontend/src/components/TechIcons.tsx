import React from 'react';

export interface TechIconProps {
  size?: number;
  className?: string;
}

function createDevicon(file: string, label: string) {
  return function TechIcon({ size = 24, className = '' }: TechIconProps) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={`/icons/tech/${file}`}
        alt={label}
        width={size}
        height={size}
        loading="lazy"
        className={`object-contain shrink-0 ${className}`.trim()}
      />
    );
  };
}

export const NextjsIcon = createDevicon('nextjs.svg', 'Next.js');
export const ReactIcon = createDevicon('react.svg', 'React');
export const VueIcon = createDevicon('vue.svg', 'Vue.js');
export const SvelteIcon = createDevicon('svelte.svg', 'Svelte');
export const AstroIcon = createDevicon('astro.svg', 'Astro');
export const NodejsIcon = createDevicon('nodejs.svg', 'Node.js');
export const PythonIcon = createDevicon('python.svg', 'Python');
export const FastAPIIcon = createDevicon('fastapi.svg', 'FastAPI');
export const DjangoIcon = createDevicon('django.svg', 'Django');
export const FlaskIcon = createDevicon('flask.svg', 'Flask');
export const GoIcon = createDevicon('go.svg', 'Go');
export const RustIcon = createDevicon('rust.svg', 'Rust');
export const SpringIcon = createDevicon('spring.svg', 'Spring Boot');
export const LaravelIcon = createDevicon('laravel.svg', 'Laravel');
export const RubyIcon = createDevicon('ruby.svg', 'Ruby on Rails');
export const DotNetIcon = createDevicon('dotnet.svg', '.NET');
export const BunIcon = createDevicon('bun.svg', 'Bun');
export const DenoIcon = createDevicon('deno.svg', 'Deno');
export const PostgresIcon = createDevicon('postgres.svg', 'PostgreSQL');
export const RedisIcon = createDevicon('redis.svg', 'Redis');
export const MongoIcon = createDevicon('mongodb.svg', 'MongoDB');
export const DockerIcon = createDevicon('docker.svg', 'Docker');
export const JavaIcon = createDevicon('java.svg', 'Java');
export const PhpIcon = createDevicon('php.svg', 'PHP');
