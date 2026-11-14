import { FormEvent, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ErrorBox, Field, formatDateTime, Page, StatusBadge } from '../components/Layout';
import { appointmentApi, errorMessage, patientApi } from '../services/api';
import type { Appointment, Gender, Patient, PatientInput } from '../types';

const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

const empty: PatientInput = {
  first_name: '', last_name: '', date_of_birth: '', gender: 'male', phone: '',
  email: null, address: null, blood_group: null, medical_history: null,
};

export function PatientListPage() {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    const t = setTimeout(() => {
      patientApi.list(search).then(setPatients).catch((e: unknown) => setError(errorMessage(e)));
    }, 250);
    return () => clearTimeout(t);
  }, [search]);

  return (
    <Page title="Patients" actions={<Link to="/patients/new" className="btn">Add patient</Link>}>
      <ErrorBox message={error} />
      <input className="input mb-4 max-w-sm" placeholder="Search by name or phone…" value={search} onChange={(e) => setSearch(e.target.value)} />
      <div className="card overflow-x-auto p-0">
        <table className="w-full">
          <thead className="border-b border-slate-200 bg-slate-50">
            <tr><th className="th">Name</th><th className="th">Gender</th><th className="th">DOB</th><th className="th">Phone</th><th className="th">Blood</th></tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {patients.map((p) => (
              <tr key={p.id} className="hover:bg-slate-50">
                <td className="td"><Link to={`/patients/${p.id}`} className="font-medium text-teal-700">{p.first_name} {p.last_name}</Link></td>
                <td className="td capitalize">{p.gender}</td>
                <td className="td">{p.date_of_birth}</td>
                <td className="td">{p.phone}</td>
                <td className="td">{p.blood_group ?? '—'}</td>
              </tr>
            ))}
            {!patients.length && <tr><td className="td text-slate-400" colSpan={5}>No patients found.</td></tr>}
          </tbody>
        </table>
      </div>
    </Page>
  );
}

export function PatientFormPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [form, setForm] = useState<PatientInput>(empty);
  const [error, setError] = useState('');

  useEffect(() => {
    if (id) patientApi.get(Number(id)).then(setForm).catch((e: unknown) => setError(errorMessage(e)));
  }, [id]);

  const set = <K extends keyof PatientInput>(key: K, value: PatientInput[K]) => setForm((f) => ({ ...f, [key]: value }));
  const opt = (v: string): string | null => (v.trim() ? v : null);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      const saved = id ? await patientApi.update(Number(id), form) : await patientApi.create(form);
      navigate(`/patients/${saved.id}`);
    } catch (err) {
      setError(errorMessage(err));
    }
  };

  return (
    <Page title={id ? 'Edit patient' : 'New patient'}>
      <form onSubmit={submit} className="card max-w-3xl">
        <ErrorBox message={error} />
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="First name *"><input className="input" required value={form.first_name} onChange={(e) => set('first_name', e.target.value)} /></Field>
          <Field label="Last name *"><input className="input" required value={form.last_name} onChange={(e) => set('last_name', e.target.value)} /></Field>
          <Field label="Date of birth *"><input className="input" type="date" required value={form.date_of_birth} onChange={(e) => set('date_of_birth', e.target.value)} /></Field>
          <Field label="Gender *">
            <select className="input" value={form.gender} onChange={(e) => set('gender', e.target.value as Gender)}>
              <option value="male">Male</option><option value="female">Female</option><option value="other">Other</option>
            </select>
          </Field>
          <Field label="Phone *"><input className="input" required minLength={5} value={form.phone} onChange={(e) => set('phone', e.target.value)} /></Field>
          <Field label="Email"><input className="input" type="email" value={form.email ?? ''} onChange={(e) => set('email', opt(e.target.value))} /></Field>
          <Field label="Blood group">
            <select className="input" value={form.blood_group ?? ''} onChange={(e) => set('blood_group', opt(e.target.value))}>
              <option value="">Unknown</option>
              {BLOOD_GROUPS.map((b) => <option key={b}>{b}</option>)}
            </select>
          </Field>
          <Field label="Address"><input className="input" value={form.address ?? ''} onChange={(e) => set('address', opt(e.target.value))} /></Field>
        </div>
        <div className="mt-4">
          <Field label="Medical history"><textarea className="input" rows={4} value={form.medical_history ?? ''} onChange={(e) => set('medical_history', opt(e.target.value))} /></Field>
        </div>
        <div className="mt-6 flex gap-2">
          <button className="btn">Save</button>
          <button type="button" className="btn-ghost" onClick={() => navigate(-1)}>Cancel</button>
        </div>
      </form>
    </Page>
  );
}

export function PatientDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [patient, setPatient] = useState<Patient | null>(null);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [error, setError] = useState('');

  useEffect(() => {
    const pid = Number(id);
    patientApi.get(pid).then(setPatient).catch((e: unknown) => setError(errorMessage(e)));
    appointmentApi.list({ patient_id: pid }).then(setAppointments).catch(() => undefined);
  }, [id]);

  const remove = async () => {
    if (!patient || !window.confirm('Delete this patient and all their appointments?')) return;
    try {
      await patientApi.remove(patient.id);
      navigate('/patients');
    } catch (err) {
      setError(errorMessage(err));
    }
  };

  if (!patient) return <ErrorBox message={error} />;

  const rows: [string, string][] = [
    ['Date of birth', patient.date_of_birth], ['Gender', patient.gender], ['Phone', patient.phone],
    ['Email', patient.email ?? '—'], ['Blood group', patient.blood_group ?? '—'], ['Address', patient.address ?? '—'],
  ];

  return (
    <Page
      title={`${patient.first_name} ${patient.last_name}`}
      actions={<>
        <Link to={`/appointments/new?patient=${patient.id}`} className="btn">Book</Link>
        <Link to={`/patients/${patient.id}/edit`} className="btn-ghost">Edit</Link>
        <button onClick={remove} className="btn-danger">Delete</button>
      </>}
    >
      <ErrorBox message={error} />
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="card">
          <dl className="grid grid-cols-2 gap-3 text-sm">
            {rows.map(([k, v]) => (<div key={k}><dt className="text-slate-500">{k}</dt><dd className="font-medium capitalize text-slate-800">{v}</dd></div>))}
          </dl>
          <h3 className="mt-5 text-sm text-slate-500">Medical history</h3>
          <p className="whitespace-pre-wrap text-sm text-slate-800">{patient.medical_history || '—'}</p>
        </div>
        <div className="card">
          <h2 className="mb-3 font-semibold text-slate-700">Appointment history</h2>
          {appointments.length ? (
            <ul className="divide-y divide-slate-100 text-sm">
              {appointments.map((a) => (
                <li key={a.id} className="flex items-center justify-between py-2">
                  <Link to={`/appointments/${a.id}/edit`} className="text-teal-700">{formatDateTime(a.scheduled_at)} · {a.doctor.full_name}</Link>
                  <StatusBadge status={a.status} />
                </li>
              ))}
            </ul>
          ) : <p className="text-sm text-slate-500">No appointments yet.</p>}
        </div>
      </div>
    </Page>
  );
}
