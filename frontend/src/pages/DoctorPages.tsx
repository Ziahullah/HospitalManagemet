import { FormEvent, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ErrorBox, Field, Page } from '../components/Layout';
import { doctorApi, errorMessage } from '../services/api';
import type { Doctor, DoctorInput } from '../types';

const empty: DoctorInput = { full_name: '', specialization: '', phone: '', email: '', consultation_fee: '0', is_available: true };

export function DoctorListPage() {
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [specialization, setSpecialization] = useState('');
  const [onlyAvailable, setOnlyAvailable] = useState(false);
  const [error, setError] = useState('');

  const load = () =>
    doctorApi
      .list({ specialization: specialization || undefined, available: onlyAvailable ? true : undefined })
      .then(setDoctors)
      .catch((e: unknown) => setError(errorMessage(e)));

  useEffect(() => {
    const t = setTimeout(load, 250);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [specialization, onlyAvailable]);

  const remove = async (d: Doctor) => {
    if (!window.confirm(`Delete ${d.full_name}? Their appointments will be removed too.`)) return;
    try {
      await doctorApi.remove(d.id);
      await load();
    } catch (err) {
      setError(errorMessage(err));
    }
  };

  return (
    <Page title="Doctors" actions={<Link to="/doctors/new" className="btn">Add doctor</Link>}>
      <ErrorBox message={error} />
      <div className="mb-4 flex flex-wrap items-center gap-4">
        <input className="input max-w-xs" placeholder="Filter by specialization…" value={specialization} onChange={(e) => setSpecialization(e.target.value)} />
        <label className="flex items-center gap-2 text-sm text-slate-600">
          <input type="checkbox" checked={onlyAvailable} onChange={(e) => setOnlyAvailable(e.target.checked)} /> Available only
        </label>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {doctors.map((d) => (
          <div key={d.id} className="card">
            <div className="flex items-start justify-between">
              <div>
                <div className="font-semibold text-slate-800">{d.full_name}</div>
                <div className="text-sm text-teal-700">{d.specialization}</div>
              </div>
              <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${d.is_available ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-600'}`}>
                {d.is_available ? 'Available' : 'Unavailable'}
              </span>
            </div>
            <div className="mt-3 space-y-1 text-sm text-slate-600">
              <div>📞 {d.phone}</div>
              <div>✉️ {d.email}</div>
              <div>💵 Fee: {Number(d.consultation_fee).toFixed(2)}</div>
            </div>
            <div className="mt-4 flex gap-2">
              <Link to={`/doctors/${d.id}/edit`} className="btn-ghost">Edit</Link>
              <button onClick={() => remove(d)} className="btn-ghost text-rose-600">Delete</button>
            </div>
          </div>
        ))}
        {!doctors.length && <p className="text-sm text-slate-500">No doctors found.</p>}
      </div>
    </Page>
  );
}

export function DoctorFormPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [form, setForm] = useState<DoctorInput>(empty);
  const [error, setError] = useState('');

  useEffect(() => {
    if (id) doctorApi.get(Number(id)).then(setForm).catch((e: unknown) => setError(errorMessage(e)));
  }, [id]);

  const set = <K extends keyof DoctorInput>(key: K, value: DoctorInput[K]) => setForm((f) => ({ ...f, [key]: value }));

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      if (id) await doctorApi.update(Number(id), form);
      else await doctorApi.create(form);
      navigate('/doctors');
    } catch (err) {
      setError(errorMessage(err));
    }
  };

  return (
    <Page title={id ? 'Edit doctor' : 'New doctor'}>
      <form onSubmit={submit} className="card max-w-3xl">
        <ErrorBox message={error} />
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Full name *"><input className="input" required value={form.full_name} onChange={(e) => set('full_name', e.target.value)} /></Field>
          <Field label="Specialization *"><input className="input" required value={form.specialization} onChange={(e) => set('specialization', e.target.value)} /></Field>
          <Field label="Phone *"><input className="input" required minLength={5} value={form.phone} onChange={(e) => set('phone', e.target.value)} /></Field>
          <Field label="Email *"><input className="input" type="email" required value={form.email} onChange={(e) => set('email', e.target.value)} /></Field>
          <Field label="Consultation fee"><input className="input" type="number" min="0" step="0.01" value={form.consultation_fee} onChange={(e) => set('consultation_fee', e.target.value)} /></Field>
          <label className="flex items-center gap-2 self-end pb-2 text-sm text-slate-700">
            <input type="checkbox" checked={form.is_available} onChange={(e) => set('is_available', e.target.checked)} /> Available for appointments
          </label>
        </div>
        <div className="mt-6 flex gap-2">
          <button className="btn">Save</button>
          <button type="button" className="btn-ghost" onClick={() => navigate(-1)}>Cancel</button>
        </div>
      </form>
    </Page>
  );
}
