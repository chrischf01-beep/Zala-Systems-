import { getDatabase } from '@netlify/database';
import { admin, getUser } from '@netlify/identity';
import type { Config } from '@netlify/functions';

const editable = new Set(['username', 'full_name', 'phone', 'language', 'profile', 'betting_company']);

export default async function profile(req: Request) {
  const identityUser = await getUser();
  if (!identityUser?.id || !identityUser.email) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const database = getDatabase();
  const roles = identityUser.roles ?? [];
  const isAdmin = roles.includes('admin');

  if (req.method === 'GET') {
    const rows = await database.sql`SELECT * FROM identity_profiles WHERE id = ${identityUser.id} LIMIT 1`;
    const row = rows[0];
    if (!row) return Response.json({ error: 'Profile not found' }, { status: 404 });
    return Response.json({ ...row, is_admin: isAdmin });
  }

  if (req.method === 'PATCH') {
    const input = await req.json() as Record<string, unknown>;
    const patch = Object.fromEntries(Object.entries(input).filter(([key]) => editable.has(key)));
    const current = await database.sql`SELECT * FROM identity_profiles WHERE id = ${identityUser.id} LIMIT 1`;
    if (!current[0]) return Response.json({ error: 'Profile not found' }, { status: 404 });
    const next = { ...current[0], ...patch } as Record<string, unknown>;
    const rows = await database.sql`
      UPDATE identity_profiles SET
        username = ${String(next.username).trim().toLowerCase()},
        full_name = ${String(next.full_name).trim()},
        phone = ${String(next.phone).trim()},
        language = ${next.language === 'sw' ? 'sw' : 'en'},
        profile = ${['aggressive', 'conservative'].includes(String(next.profile)) ? String(next.profile) : 'balanced'},
        betting_company = ${String(next.betting_company).trim()}
      WHERE id = ${identityUser.id}
      RETURNING *
    `;
    return Response.json({ ...rows[0], is_admin: isAdmin });
  }

  if (req.method === 'DELETE') {
    await database.sql`DELETE FROM identity_profiles WHERE id = ${identityUser.id}`;
    await admin.deleteUser(identityUser.id);
    return new Response(null, { status: 204 });
  }

  return Response.json({ error: 'Method not allowed' }, { status: 405 });
}

export const config: Config = { path: '/api/profile' };
