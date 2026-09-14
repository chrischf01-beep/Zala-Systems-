import type { UserSignupEvent } from '@netlify/functions';

export default {
  userSignup(event: UserSignupEvent) {
    const user = event.user;
    const currentRoles = Array.isArray(user.appMetadata?.roles) ? user.appMetadata.roles : [];
    return {
      user: {
        ...user,
        appMetadata: { ...user.appMetadata, roles: currentRoles.length ? currentRoles : ['member'] },
      },
    };
  },
};
