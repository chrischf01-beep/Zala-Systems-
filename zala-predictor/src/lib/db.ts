import { supabase, SCREENSHOT_BUCKET } from './supabase';
import {
  getUser as getIdentityUser,
  login,
  logout,
  requestPasswordRecovery,
  signup,
  AuthError as IdentityAuthError,
} from '@netlify/identity';
import type {
  ActivityLog,
  Broadcast,
  Language,
  MembershipStatus,
  Payment,
  PaymentMethod,
  PlanId,
  PredictionRecord,
  Profile,
  SiteSettings,
  User,
} from './types';

/**
 * Supabase-backed data layer. Every function that touches the database is async.
 * Pure helpers (effectiveStatus, hasAccess) stay synchronous.
 *
 * Security: this file only ever uses the anon key (see lib/supabase.ts). All
 * privileged operations (payment approval, admin deletes, user-code assignment)
 * run through SECURITY DEFINER RPCs guarded by is_admin() inside Postgres.
 */

export class AuthError extends Error {}

const NIL = '00000000-0000-0000-0000-000000000000';
const DAY = 86400000;

// ---- Row shapes (raw Postgres / PostgREST JSON) ----

interface ProfileRow {
  id: string;
  username: string;
  full_name: string;
  email: string;
  phone: string;
  language: Language;
  profile: Profile;
  is_admin: boolean;
  status: MembershipStatus;
  plan: PlanId | null;
  member_start: string | null;
  member_expiry: string | null;
  betting_company: string;
  user_code: string | null;
  created_at: string;
}

interface PaymentRow {
  id: string;
  user_id: string;
  plan: PlanId;
  amount: number;
  method: PaymentMethod;
  phone: string;
  sender_name: string;
  reference: string;
  screenshot: string;
  status: Payment['status'];
  reject_reason: string;
  created_at: string;
  decided_at: string | null;
}

interface NotificationRow {
  id: string;
  audience: string;
  type: Broadcast['type'];
  title: string;
  body: string;
  created_at: string;
}

interface LogRow {
  id: string;
  action: string;
  details: string;
  target: string;
  created_at: string;
}

interface PredictionRow {
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
  created_at: string;
}

interface SettingsRow extends SiteSettings {
  id: number;
}

// ---- Converters ----

function ms(v: string | null | undefined): number | null {
  return v == null ? null : new Date(v).getTime();
}

function iso(v: number | null | undefined): string | null {
  return v == null ? null : new Date(v).toISOString();
}

// ---- Mappers ----

export function toPublicUser(r: ProfileRow): User {
  return {
    id: r.id,
    email: r.email,
    username: r.username ?? '',
    full_name: r.full_name ?? '',
    language: r.language ?? 'en',
    profile: r.profile ?? 'balanced',
    created_at: ms(r.created_at) ?? Date.now(),
    phone: r.phone ?? '',
    user_code: r.user_code ?? null,
    is_admin: !!r.is_admin,
    status: r.status ?? 'pending',
    plan: r.plan ?? null,
    member_start: ms(r.member_start),
    member_expiry: ms(r.member_expiry),
    betting_company: r.betting_company ?? '',
  };
}

function toPayment(r: PaymentRow): Payment {
  return {
    id: r.id,
    user_id: r.user_id,
    plan: r.plan,
    amount: r.amount,
    method: r.method,
    phone: r.phone ?? '',
    sender_name: r.sender_name ?? '',
    reference: r.reference ?? '',
    screenshot: r.screenshot ?? '',
    status: r.status,
    reject_reason: r.reject_reason ?? '',
    created_at: ms(r.created_at) ?? Date.now(),
    decided_at: ms(r.decided_at),
  };
}

function toNotification(r: NotificationRow): Broadcast {
  return {
    id: r.id,
    audience: r.audience,
    type: r.type,
    title: r.title ?? '',
    body: r.body ?? '',
    created_at: ms(r.created_at) ?? Date.now(),
  };
}

function toLog(r: LogRow): ActivityLog {
  return {
    id: r.id,
    action: r.action,
    details: r.details ?? '',
    target: r.target ?? '',
    created_at: ms(r.created_at) ?? Date.now(),
  };
}

function toPrediction(r: PredictionRow): PredictionRecord {
  return {
    id: r.id,
    user_id: r.user_id,
    session_id: r.session_id ?? '',
    prediction: r.prediction,
    expected: r.expected,
    min_value: r.min_value,
    max_value: r.max_value,
    confidence: r.confidence,
    volatility: r.volatility,
    momentum: r.momentum,
    fib_weight: r.fib_weight,
    bayes_mean: r.bayes_mean,
    model: r.model ?? '',
    runs: r.runs,
    created_at: ms(r.created_at) ?? Date.now(),
  };
}

function toSettings(r: SettingsRow): SiteSettings {
  return {
    registration_enabled: r.registration_enabled,
    payments_enabled: r.payments_enabled,
    membership_enabled: r.membership_enabled,
    maintenance_mode: r.maintenance_mode,
    site_name: r.site_name,
    welcome_message: r.welcome_message,
    support_email: r.support_email,
    support_phone: r.support_phone,
    whatsapp: r.whatsapp,
  };
}

/** Derives the runtime status, collapsing an active-but-past-expiry user to 'expired'. */
export function effectiveStatus(u: Pick<User, 'status' | 'member_expiry'>): MembershipStatus {
  if (u.status === 'active' && u.member_expiry !== null && u.member_expiry <= Date.now()) {
    return 'expired';
  }
  return u.status;
}

export function hasAccess(u: User): boolean {
  if (u.is_admin) return true;
  return effectiveStatus(u) === 'active';
}

// ---- Auth ----

async function fetchProfile(id: string): Promise<User | null> {
  try {
    const response = await fetch('/api/profile', { credentials: 'same-origin' });
    if (response.ok) {
      const data = await response.json() as ProfileRow;
      if (data.id === id) return toPublicUser(data);
    }
  } catch {
    // Identity metadata keeps authentication usable while profile persistence initializes.
  }

  const identityUser = await getIdentityUser();
  if (!identityUser || identityUser.id !== id || !identityUser.email) return null;
  const metadata = identityUser.userMetadata ?? {};
  return {
    id,
    email: identityUser.email,
    username: String(metadata.username ?? identityUser.email.split('@')[0]),
    full_name: String(metadata.full_name ?? identityUser.name ?? ''),
    language: metadata.language === 'sw' ? 'sw' : 'en',
    profile: ['aggressive', 'conservative'].includes(String(metadata.profile)) ? metadata.profile as Profile : 'balanced',
    created_at: identityUser.createdAt ? new Date(identityUser.createdAt).getTime() : Date.now(),
    phone: String(metadata.phone ?? ''),
    user_code: null,
    is_admin: (identityUser.roles ?? []).includes('admin'),
    status: 'pending',
    plan: null,
    member_start: null,
    member_expiry: null,
    betting_company: String(metadata.betting_company ?? ''),
  };
}

export async function signIn(email: string, password: string): Promise<User> {
  let identityUser;
  try {
    identityUser = await login(email.trim().toLowerCase(), password);
  } catch (error) {
    if (error instanceof IdentityAuthError) throw new AuthError(error.status === 401 ? 'invalid_credentials' : error.message);
    throw error;
  }
  const profile = await fetchProfile(identityUser.id);
  if (!profile) throw new AuthError('no_profile');
  return profile;
}

export interface SignUpInput {
  email: string;
  username: string;
  full_name: string;
  password: string;
  language: Language;
  profile?: Profile;
  phone?: string;
  betting_company?: string;
}

export async function signUp(input: SignUpInput): Promise<User | null> {
  const username = input.username.trim();
  try {
    const availabilityResponse = await fetch(`/api/username-available?username=${encodeURIComponent(username)}`);
    if (availabilityResponse.ok) {
      const availability = await availabilityResponse.json() as { available: boolean };
      if (!availability.available) throw new AuthError('username_taken');
    }
  } catch (error) {
    if (error instanceof AuthError) throw error;
    // Identity still enforces unique emails if the optional username check is unavailable.
  }
  let identityUser;
  try {
    identityUser = await signup(input.email.trim().toLowerCase(), input.password, {
      username,
      full_name: input.full_name.trim(),
      phone: (input.phone ?? '').trim(),
      language: input.language,
      profile: input.profile ?? 'balanced',
      betting_company: (input.betting_company ?? '').trim(),
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message.toLowerCase() : '';
    if (msg.includes('already') || msg.includes('registered')) throw new AuthError('email_taken');
    throw new AuthError(error instanceof Error ? error.message : 'invalid_credentials');
  }
  if (!identityUser.confirmedAt) return null;
  return fetchProfile(identityUser.id);
}

export async function signOut(): Promise<void> {
  await logout();
}

export async function resetPassword(email: string): Promise<void> {
  await requestPasswordRecovery(email.trim().toLowerCase());
}

export async function getSessionUser(): Promise<User | null> {
  const identityUser = await getIdentityUser();
  const id = identityUser?.id;
  if (!id) return null;
  try {
    return await fetchProfile(id);
  } catch {
    return null;
  }
}

export async function refreshUser(id: string): Promise<User | null> {
  return fetchProfile(id);
}

// ---- Profiles ----

function profilePatch(patch: Partial<User>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  if ('username' in patch) out.username = patch.username;
  if ('full_name' in patch) out.full_name = patch.full_name;
  if ('phone' in patch) out.phone = patch.phone;
  if ('language' in patch) out.language = patch.language;
  if ('profile' in patch) out.profile = patch.profile;
  if ('is_admin' in patch) out.is_admin = patch.is_admin;
  if ('status' in patch) out.status = patch.status;
  if ('plan' in patch) out.plan = patch.plan;
  if ('member_start' in patch) out.member_start = iso(patch.member_start);
  if ('member_expiry' in patch) out.member_expiry = iso(patch.member_expiry);
  if ('betting_company' in patch) out.betting_company = patch.betting_company;
  if ('user_code' in patch) out.user_code = patch.user_code;
  return out;
}

export async function listUsers(): Promise<User[]> {
  const { data, error } = await supabase.from('profiles').select('*').order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []).map((r) => toPublicUser(r as ProfileRow));
}

export async function findUserById(id: string): Promise<User | null> {
  return fetchProfile(id);
}

export async function updateUser(id: string, patch: Partial<User>): Promise<User | null> {
  const body = profilePatch(patch);
  const response = await fetch('/api/profile', {
    method: 'PATCH', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
  });
  if (!response.ok) throw new Error('Unable to update profile');
  return toPublicUser(await response.json() as ProfileRow);
}

export async function deleteUser(id: string): Promise<void> {
  const identityUser = await getIdentityUser();
  if (identityUser?.id !== id) throw new Error('Unauthorized');
  const response = await fetch('/api/profile', { method: 'DELETE', credentials: 'same-origin' });
  if (!response.ok) throw new Error('Unable to delete account');
}

// ---- Payments ----

export async function listPayments(): Promise<Payment[]> {
  const { data, error } = await supabase.from('payments').select('*').order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []).map((r) => toPayment(r as PaymentRow));
}

export async function listPaymentsForUser(userId: string): Promise<Payment[]> {
  const { data, error } = await supabase
    .from('payments')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []).map((r) => toPayment(r as PaymentRow));
}

export async function findPayment(id: string): Promise<Payment | null> {
  const { data, error } = await supabase.from('payments').select('*').eq('id', id).maybeSingle();
  if (error) throw new Error(error.message);
  return data ? toPayment(data as PaymentRow) : null;
}

export interface AddPaymentInput {
  user_id: string;
  plan: PlanId;
  amount: number;
  method: PaymentMethod;
  phone: string;
  sender_name: string;
  reference: string;
}

export async function addPayment(input: AddPaymentInput, file?: File | null): Promise<Payment> {
  let screenshot = '';
  if (file) {
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const path = `${input.user_id}/${Date.now()}_${safeName}`;
    const { error } = await supabase.storage
      .from(SCREENSHOT_BUCKET)
      .upload(path, file, { contentType: file.type, upsert: false });
    if (error) throw new Error(error.message);
    screenshot = path;
  }

  const { data, error } = await supabase
    .from('payments')
    .insert({
      user_id: input.user_id,
      plan: input.plan,
      amount: Math.round(input.amount),
      method: input.method,
      phone: input.phone.trim(),
      sender_name: input.sender_name.trim(),
      reference: input.reference.trim(),
      screenshot,
      status: 'pending',
    })
    .select('*')
    .single();
  if (error) throw new Error(error.message);
  const payment = toPayment(data as PaymentRow);
  await addLog({
    action: 'payment.submitted',
    details: `Payment of ${payment.amount} TSh submitted (${payment.plan})`,
    target: payment.user_id,
  });
  return payment;
}

export async function approvePayment(paymentId: string): Promise<void> {
  const { error } = await supabase.rpc('approve_payment', { p_payment_id: paymentId });
  if (error) throw new Error(error.message);
}

export async function rejectPayment(paymentId: string, reason: string): Promise<void> {
  const { error } = await supabase.rpc('reject_payment', { p_payment_id: paymentId, p_reason: reason.trim() });
  if (error) throw new Error(error.message);
}

// ---- Membership admin helpers ----

export async function extendMembership(userId: string, days: number): Promise<User | null> {
  const current = await fetchProfile(userId);
  if (!current) return null;
  const now = Date.now();
  const base =
    current.status === 'active' && current.member_expiry !== null && current.member_expiry > now
      ? current.member_expiry
      : now;
  const updated = await updateUser(userId, {
    status: 'active',
    member_start: current.member_start ?? now,
    member_expiry: base + days * DAY,
  });
  await addLog({
    action: 'membership.extended',
    details: `Extended membership by ${days} day(s)`,
    target: current.email,
  });
  return updated;
}

export async function setExpiry(userId: string, timestamp: number): Promise<User | null> {
  const updated = await updateUser(userId, { member_expiry: timestamp });
  await addLog({
    action: 'membership.expiry_set',
    details: `Expiry set to ${new Date(timestamp).toISOString()}`,
    target: updated?.email ?? userId,
  });
  return updated;
}

export async function setUserStatus(userId: string, status: MembershipStatus): Promise<User | null> {
  const updated = await updateUser(userId, { status });
  await addLog({ action: 'user.status_changed', details: `Status set to ${status}`, target: updated?.email ?? userId });
  return updated;
}

// ---- Notifications ----

export async function listNotifications(): Promise<Broadcast[]> {
  const { data, error } = await supabase.from('notifications').select('*').order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []).map((r) => toNotification(r as NotificationRow));
}

export async function listNotificationsForUser(userId: string): Promise<Broadcast[]> {
  const all = await listNotifications();
  return all.filter((n) => n.audience === 'all' || n.audience === userId);
}

export async function addNotification(data: Omit<Broadcast, 'id' | 'created_at'>): Promise<Broadcast> {
  const { error } = await supabase.from('notifications').insert({
    audience: data.audience,
    type: data.type,
    title: data.title,
    body: data.body,
  });
  if (error) throw new Error(error.message);
  return { ...data, id: '', created_at: Date.now() };
}

export async function removeNotification(id: string): Promise<void> {
  const { error } = await supabase.from('notifications').delete().eq('id', id);
  if (error) throw new Error(error.message);
}

// ---- Activity logs ----

export async function listLogs(): Promise<ActivityLog[]> {
  const { data, error } = await supabase.from('activity_logs').select('*').order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []).map((r) => toLog(r as LogRow));
}

export async function addLog(data: Omit<ActivityLog, 'id' | 'created_at'>): Promise<void> {
  // Fire-and-forget: never block a user action on an audit write, and never
  // surface an RLS/insert failure to the caller.
  await supabase.from('activity_logs').insert({
    action: data.action,
    details: data.details,
    target: data.target,
  });
}

export async function deleteLog(id: string): Promise<void> {
  const { error } = await supabase.from('activity_logs').delete().eq('id', id);
  if (error) throw new Error(error.message);
}

export async function clearLogs(): Promise<void> {
  const { error } = await supabase.from('activity_logs').delete().neq('id', NIL);
  if (error) throw new Error(error.message);
}

// ---- Settings ----

export const SITE_DEFAULTS: SiteSettings = {
  registration_enabled: true,
  payments_enabled: true,
  membership_enabled: true,
  maintenance_mode: false,
  site_name: 'Zala Predictor',
  welcome_message: 'Predict with mathematics, not guesswork.',
  support_email: '',
  support_phone: '',
  whatsapp: '',
};

export async function getSettings(): Promise<SiteSettings> {
  const { data, error } = await supabase.from('settings').select('*').eq('id', 1).maybeSingle();
  if (error || !data) return { ...SITE_DEFAULTS };
  return toSettings(data as SettingsRow);
}

export async function saveSettings(patch: Partial<SiteSettings>): Promise<SiteSettings> {
  const { error } = await supabase.from('settings').update(patch).eq('id', 1);
  if (error) throw new Error(error.message);
  return getSettings();
}

// ---- Predictions ----

export async function listPredictionsForUser(userId: string): Promise<PredictionRecord[]> {
  const { data, error } = await supabase
    .from('predictions')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []).map((r) => toPrediction(r as PredictionRow));
}

export async function addPrediction(record: Omit<PredictionRecord, 'id' | 'created_at'>): Promise<PredictionRecord> {
  const { data, error } = await supabase
    .from('predictions')
    .insert({
      user_id: record.user_id,
      session_id: record.session_id,
      prediction: record.prediction,
      expected: record.expected,
      min_value: record.min_value,
      max_value: record.max_value,
      confidence: record.confidence,
      volatility: record.volatility,
      momentum: record.momentum,
      fib_weight: record.fib_weight,
      bayes_mean: record.bayes_mean,
      model: record.model,
      runs: record.runs,
    })
    .select('*')
    .single();
  if (error) throw new Error(error.message);
  return toPrediction(data as PredictionRow);
}

export async function removePrediction(id: string): Promise<void> {
  const { error } = await supabase.from('predictions').delete().eq('id', id);
  if (error) throw new Error(error.message);
}

// ---- Backup ----

export async function exportDatabase(): Promise<Record<string, unknown>> {
  const [users, payments, notifications, logs] = await Promise.all([
    listUsers(),
    listPayments(),
    listNotifications(),
    listLogs(),
  ]);
  return {
    exported_at: new Date().toISOString(),
    users,
    payments,
    notifications,
    logs,
  };
}
