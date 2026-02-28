export type ProjectStatus = 'idle' | 'building' | 'running' | 'failed' | 'stopped';

export interface User {
  id: string;
  email: string;
}

export interface Project {
  id: string;
  name: string;
  userId: string;
  status: ProjectStatus;
  createdAt: Date;
}
