export type ProjectStatus = 'idle' | 'queued' | 'building' | 'running' | 'failed' | 'stopped';
export type UserRole = 'USER' | 'ADMIN';
export type ResourceTier = 'free' | 'basic' | 'pro' | 'business';

export interface User {
  id: string;
  email: string;
  username: string;
  role: UserRole;
  tier: ResourceTier;
  tierExpiresAt?: Date | null;
  serverLimit: number;
  emailVerified: boolean;
  createdAt: Date;
}

export interface Project {
  id: string;
  name: string;
  userId: string;
  status: ProjectStatus;
  tier: ResourceTier;
  port?: number | null;
  customDomain?: string | null;
  createdAt: Date;
  updatedAt: Date;
}
