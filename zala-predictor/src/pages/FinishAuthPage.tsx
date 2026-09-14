import { useState, type FormEvent } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { acceptInvite, updateUser } from '@netlify/identity';
import { AuthShell } from '../components/AuthShell';
import { Button, Card, Input } from '../components/ui';
import { useAuthStore } from '../stores/authStore';

type AuthActionState = { mode: 'invite'; token: string } | { mode: 'recovery' };

export default function FinishAuthPage() {
  const state = useLocation().state as AuthActionState | null;
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (!state) return <Navigate to="/login" replace />;

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (password.length < 8 || !/[A-Z]/.test(password) || !/[a-z]/.test(password) || !/\d/.test(password)) {
      setError('Use at least 8 characters with uppercase, lowercase, and a number.');
      return;
    }
    if (password !== confirm) {
      setError('Passwords do not match.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      if (state.mode === 'invite') await acceptInvite(state.token, password);
      else await updateUser({ password });
      await useAuthStore.getState().hydrate();
      navigate('/dashboard', { replace: true });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to finish account setup. Request a new link and try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell>
      <Card strong className="p-6 sm:p-8">
        <h1 className="font-heading text-2xl font-bold">
          {state.mode === 'invite' ? 'Finish creating your account' : 'Choose a new password'}
        </h1>
        <p className="mt-2 text-sm text-muted">Your password is private and is never stored by this application.</p>
        <form onSubmit={submit} className="mt-6 space-y-4">
          {error && <p role="alert" className="rounded-lg border border-danger/40 bg-danger/10 px-3 py-2 text-sm text-danger">{error}</p>}
          <Input label="New password" type="password" revealPassword autoComplete="new-password" value={password} onChange={(event) => setPassword(event.target.value)} />
          <Input label="Confirm password" type="password" revealPassword autoComplete="new-password" value={confirm} onChange={(event) => setConfirm(event.target.value)} />
          <Button type="submit" size="lg" loading={loading} className="w-full">Save password</Button>
        </form>
      </Card>
    </AuthShell>
  );
}
