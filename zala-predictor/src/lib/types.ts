export type Language = 'en' | 'sw';
export type Profile = 'aggressive' | 'balanced' | 'conservative';
export type Theme = 'dark' | 'light';

export type PlanId = 'daily' | 'weekly' | 'monthly';
export type MembershipStatus = 'pending' | 'active' | 'inactive' | 'suspended' | 'expired';
export type PaymentStatus = 'pending' | 'approved' | 'rejected';
export type PaymentMethod = 'mpesa' | 'airtel' | 'halopesa';
export type NotificationType = 'system' | 'payment' | 'membership' | 'expiry';

export interface User {
  id: string;
  email: string;
  username: string;
  full_name: string;
  language: Language;
  profile: Profile;
  created_at: number;
  phone: string;
  user_code: string | null;
  is_admin: boolean;
  status: MembershipStatus;
  plan: PlanId | null;
  member_start: number | null;
  member_expiry: number | null;
  betting_company: string;
}

export interface Payment {
  id: string;
  user_id: string;
  plan: PlanId;
  amount: number;
  method: PaymentMethod;
  phone: string;
  sender_name: string;
  reference: string;
  screenshot: string;
  status: PaymentStatus;
  reject_reason: string;
  created_at: number;
  decided_at: number | null;
}

export interface Broadcast {
  id: string;
  audience: 'all' | string;
  type: NotificationType;
  title: string;
  body: string;
  created_at: number;
}

export interface ActivityLog {
  id: string;
  action: string;
  details: string;
  target: string;
  created_at: number;
}

export interface SiteSettings {
  registration_enabled: boolean;
  payments_enabled: boolean;
  membership_enabled: boolean;
  maintenance_mode: boolean;
  site_name: string;
  welcome_message: string;
  support_email: string;
  support_phone: string;
  whatsapp: string;
}

export interface PredictionRecord {
  id: string;
  user_id: string;
  session_id: string;
  prediction: number;
  expected: number;
  min_value: number;
  max_value: number;
  confidence: number;
  volatility: number;
  momentum: number;
  fib_weight: number;
  bayes_mean: number;
  model: string;
  runs: number;
  created_at: number;
}
