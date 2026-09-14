import { getDatabase } from '@netlify/database';
import type { UserSignupEvent } from '@netlify/functions';

export default {
  async userSignup(event: UserSignupEvent) {
    const user = event.user;
    const metadata = user.userMetadata ?? {};
    const email = (user.email ?? '').trim().toLowerCase();
    const requestedUsername = String(metadata.username ?? '').trim().toLowerCase();
    const username = requestedUsername || `${email.split('@')[0]}-${user.id.slice(0, 6)}`;
    const database = getDatabase();

    await database.sql`
      INSERT INTO identity_profiles (
        id, email, username, full_name, phone, language, profile, betting_company
      ) VALUES (
        ${user.id}, ${email}, ${username}, ${String(metadata.full_name ?? '').trim()},
        ${String(metadata.phone ?? '').trim()}, ${metadata.language === 'sw' ? 'sw' : 'en'},
        ${['aggressive', 'conservative'].includes(String(metadata.profile)) ? String(metadata.profile) : 'balanced'},
        ${String(metadata.betting_company ?? '').trim()}
      )
      ON CONFLICT (id) DO NOTHING
    `;

    const currentRoles = Array.isArray(user.appMetadata?.roles) ? user.appMetadata.roles : [];
    return {
      user: {
        ...user,
        appMetadata: { ...user.appMetadata, roles: currentRoles.length ? currentRoles : ['member'] },
      },
    };
  },
};
