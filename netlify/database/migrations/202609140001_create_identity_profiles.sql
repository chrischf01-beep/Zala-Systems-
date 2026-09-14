CREATE TABLE IF NOT EXISTS identity_profiles (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  username TEXT UNIQUE NOT NULL,
  full_name TEXT NOT NULL DEFAULT '',
  phone TEXT NOT NULL DEFAULT '',
  language TEXT NOT NULL DEFAULT 'en' CHECK (language IN ('en', 'sw')),
  profile TEXT NOT NULL DEFAULT 'balanced' CHECK (profile IN ('aggressive', 'balanced', 'conservative')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'inactive', 'suspended', 'expired')),
  plan TEXT CHECK (plan IN ('daily', 'weekly', 'monthly')),
  member_start TIMESTAMPTZ,
  member_expiry TIMESTAMPTZ,
  betting_company TEXT NOT NULL DEFAULT '',
  user_code TEXT UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS identity_profiles_email_idx ON identity_profiles (LOWER(email));
