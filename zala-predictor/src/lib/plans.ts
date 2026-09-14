import type { PlanId } from './types';

export interface Plan {
  id: PlanId;
  priceTsh: number;
  days: number;
  labelKey: string;
  descKey: string;
}

export const PLANS: Plan[] = [
  { id: 'daily', priceTsh: 5000, days: 1, labelKey: 'member:plans.daily.label', descKey: 'member:plans.daily.desc' },
  { id: 'weekly', priceTsh: 1500, days: 7, labelKey: 'member:plans.weekly.label', descKey: 'member:plans.weekly.desc' },
  { id: 'monthly', priceTsh: 2500, days: 30, labelKey: 'member:plans.monthly.label', descKey: 'member:plans.monthly.desc' },
];

export const PLAN_MAP: Record<PlanId, Plan> = PLANS.reduce(
  (acc, p) => {
    acc[p.id] = p;
    return acc;
  },
  {} as Record<PlanId, Plan>
);

export function planById(id: PlanId | null | undefined): Plan | undefined {
  if (!id) return undefined;
  return PLAN_MAP[id];
}

export function formatTsh(amount: number): string {
  return `${amount.toLocaleString('en-US')} TSh`;
}
