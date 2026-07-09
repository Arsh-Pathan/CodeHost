export interface TierConfig {
  name: string;
  memory: number;       // bytes
  cpus: number;         // cores
  storage: number;      // bytes
  creditsPerMonth: number;
  maxProjects: number;
  label: string;
}

export const RESOURCE_TIERS: Record<string, TierConfig> = {
  free: {
    name: 'free',
    memory: 128 * 1024 * 1024,
    cpus: 0.5,
    storage: 1 * 1024 * 1024 * 1024,
    creditsPerMonth: 0,
    maxProjects: 1,
    label: 'Free',
  },
  basic: {
    name: 'basic',
    memory: 256 * 1024 * 1024,
    cpus: 1,
    storage: 2 * 1024 * 1024 * 1024,
    creditsPerMonth: 50,
    maxProjects: 3,
    label: 'Basic',
  },
  pro: {
    name: 'pro',
    memory: 512 * 1024 * 1024,
    cpus: 2,
    storage: 5 * 1024 * 1024 * 1024,
    creditsPerMonth: 150,
    maxProjects: 5,
    label: 'Pro',
  },
  business: {
    name: 'business',
    memory: 1024 * 1024 * 1024,
    cpus: 4,
    storage: 10 * 1024 * 1024 * 1024,
    creditsPerMonth: 400,
    maxProjects: 10,
    label: 'Business',
  },
};

// 1 credit = ₹2
export const CREDIT_PRICE_INR = 2;

export const CREDIT_PACKAGES = [
  { credits: 100, priceInr: 200, label: '100 Credits', savings: null },
  { credits: 300, priceInr: 500, label: '300 Credits', savings: '17% savings' },
  { credits: 600, priceInr: 900, label: '600 Credits', savings: '25% savings' },
];
