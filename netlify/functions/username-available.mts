import { getDatabase } from '@netlify/database';
import type { Config } from '@netlify/functions';

export default async function usernameAvailable(req: Request) {
  const username = new URL(req.url).searchParams.get('username')?.trim().toLowerCase() ?? '';
  if (!/^[a-z0-9_.-]{3,30}$/.test(username)) return Response.json({ available: false });
  const database = getDatabase();
  const rows = await database.sql`SELECT 1 FROM identity_profiles WHERE LOWER(username) = ${username} LIMIT 1`;
  return Response.json({ available: rows.length === 0 });
}

export const config: Config = { path: '/api/username-available' };
