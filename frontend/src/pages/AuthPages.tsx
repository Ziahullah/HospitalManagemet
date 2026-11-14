import { motion } from 'framer-motion';
import { FormEvent, useEffect, useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { ErrorBox, Field } from '../components/Layout';
import { useAuth } from '../context/AuthContext';
import { authApi, errorMessage } from '../services/api';

function AuthShell({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-teal-50 via-white to-sky-50 p-4">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="card w-full max-w-sm">
        <div className="mb-1 text-center text-2xl">🏥</div>
        <h1 className="mb-6 text-center text-xl font-bold text-slate-800">{title}</h1>
        {children}
      </motion.div>
    </div>
  );
}

export function LoginPage() {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  if (user) return <Navigate to="/dashboard" replace />;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      await login(email, password);
      navigate('/dashboard');
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthShell title="Sign in to MediCare">
      <ErrorBox message={error} />
      <form onSubmit={submit} className="space-y-4">
        <Field label="Email"><input className="input" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} /></Field>
        <Field label="Password"><input className="input" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} /></Field>
        <button className="btn w-full" disabled={busy}>{busy ? 'Signing in…' : 'Sign in'}</button>
      </form>
      <a href={`${import.meta.env.VITE_API_URL ?? ''}/api/v1/auth/google`} className="btn-ghost mt-3 w-full">Continue with Google</a>
      <p className="mt-4 text-center text-sm text-slate-500">
        No account? <Link to="/register" className="font-medium text-teal-700">Register</Link>
      </p>
    </AuthShell>
  );
}

export function RegisterPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      await authApi.register(email, password, fullName);
      await login(email, password);
      navigate('/dashboard');
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthShell title="Create staff account">
      <ErrorBox message={error} />
      <form onSubmit={submit} className="space-y-4">
        <Field label="Full name"><input className="input" value={fullName} onChange={(e) => setFullName(e.target.value)} /></Field>
        <Field label="Email"><input className="input" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} /></Field>
        <Field label="Password (min 8 chars)"><input className="input" type="password" minLength={8} required value={password} onChange={(e) => setPassword(e.target.value)} /></Field>
        <button className="btn w-full" disabled={busy}>{busy ? 'Creating…' : 'Register'}</button>
      </form>
      <p className="mt-4 text-center text-sm text-slate-500">
        Have an account? <Link to="/login" className="font-medium text-teal-700">Sign in</Link>
      </p>
    </AuthShell>
  );
}

export function AuthCallbackPage() {
  const { loginWithTokens } = useAuth();
  const navigate = useNavigate();
  useEffect(() => {
    const params = new URLSearchParams(window.location.hash.slice(1));
    const access = params.get('access_token');
    const refresh = params.get('refresh_token');
    if (access && refresh) {
      loginWithTokens({ access_token: access, refresh_token: refresh })
        .then(() => navigate('/dashboard', { replace: true }))
        .catch(() => navigate('/login', { replace: true }));
    } else {
      navigate('/login', { replace: true });
    }
  }, [loginWithTokens, navigate]);
  return <div className="p-10 text-slate-500">Signing you in…</div>;
}
