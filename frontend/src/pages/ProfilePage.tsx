import { FormEvent, useState } from 'react';
import { ErrorBox, Field, Page } from '../components/Layout';
import { useAuth } from '../context/AuthContext';
import { authApi, errorMessage } from '../services/api';

export function ProfilePage() {
  const { user, setUser } = useAuth();
  const [name, setName] = useState(user?.full_name ?? '');
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setMsg('');
    setError('');
    try {
      setUser(await authApi.updateMe(name));
      setMsg('Profile saved.');
    } catch (err) {
      setError(errorMessage(err));
    }
  };

  return (
    <Page title="Profile">
      <form onSubmit={submit} className="card max-w-md space-y-4">
        <ErrorBox message={error} />
        {msg && <div className="rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{msg}</div>}
        <Field label="Email"><input className="input bg-slate-100" value={user?.email ?? ''} disabled /></Field>
        <Field label="Role"><input className="input bg-slate-100 capitalize" value={user?.role ?? ''} disabled /></Field>
        <Field label="Full name"><input className="input" value={name} onChange={(e) => setName(e.target.value)} /></Field>
        <button className="btn">Save</button>
      </form>
    </Page>
  );
}
