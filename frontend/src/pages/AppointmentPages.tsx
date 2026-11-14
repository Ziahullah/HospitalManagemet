import { FormEvent, useEffect, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { ErrorBox, Field, formatDateTime, Page, StatusBadge } from '../components/Layout';
import { appointmentApi, doctorApi, errorMessage, patientApi } from '../services/api';
import type { Appointment, AppointmentStatus, Doctor, Patient } from '../types';

const toLocalInput = (iso: string): string => {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

export function AppointmentListPage() {
  const [items, setItems] = useState<Appointment[]>([]);
  const [status, setStatus] = useState<AppointmentStatus | ''>('');
  const [error, setError] = useState('');

  const load = () =>
    appointmentApi.list({ status: status || undefined }).then(setItems).catch((e: unknown) => setError(errorMessage(e)));

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  const remove = async (a: Appointment) => {
    if (!window.confirm('Delete this appointment?')) return;
    try {
      await appointmentApi.remove(a.id);
      await load();
    } catch (err) {
      setError(errorMessage(err));
    }
  };

  return (
    <Page title="Appointments" actions={<Link to="/appointments/new" className="btn">Book appointment</Link>}>
      <ErrorBox message={error} />
      <select className="input mb-4 max-w-xs" value={status} onChange={(e) => setStatus(e.target.value as AppointmentStatus | '')}>
        <option value="">All statuses</option>
        <option value="scheduled">Scheduled</option>
        <option value="completed">Completed</option>
        <option value="cancelled">Cancelled</option>
      </select>
      <div className="card overflow-x-auto p-0">
        <table className="w-full">
          <thead className="border-b border-slate-200 bg-slate-50">
            <tr><th className="th">When</th><th className="th">Patient</th><th className="th">Doctor</th><th className="th">Reason</th><th className="th">Status</th><th className="th" /></tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {items.map((a) => (
              <tr key={a.id} className="hover:bg-slate-50">
                <td className="td whitespace-nowrap">{formatDateTime(a.scheduled_at)}</td>
                <td className="td"><Link className="text-teal-700" to={`/patients/${a.patient.id}`}>{a.patient.first_name} {a.patient.last_name}</Link></td>
                <td className="td">{a.doctor.full_name}<div className="text-xs text-slate-400">{a.doctor.specialization}</div></td>
                <td className="td">{a.reason}</td>
                <td className="td"><StatusBadge status={a.status} /></td>
                <td className="td whitespace-nowrap text-right">
                  <Link to={`/appointments/${a.id}/edit`} className="mr-3 text-teal-700">Edit</Link>
                  <button onClick={() => remove(a)} className="text-rose-600">Delete</button>
                </td>
              </tr>
            ))}
            {!items.length && <tr><td className="td text-slate-400" colSpan={6}>No appointments.</td></tr>}
          </tbody>
        </table>
      </div>
    </Page>
  );
}

export function AppointmentFormPage() {
  const { id } = useParams();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [patientId, setPatientId] = useState(params.get('patient') ?? '');
  const [doctorId, setDoctorId] = useState('');
  const [when, setWhen] = useState('');
  const [reason, setReason] = useState('');
  const [notes, setNotes] = useState('');
  const [status, setStatus] = useState<AppointmentStatus>('scheduled');
  const [error, setError] = useState('');

  useEffect(() => {
    patientApi.list().then(setPatients).catch(() => undefined);
    doctorApi.list().then(setDoctors).catch(() => undefined);
    if (id) {
      appointmentApi.get(Number(id)).then((a) => {
        setPatientId(String(a.patient_id));
        setDoctorId(String(a.doctor_id));
        setWhen(toLocalInput(a.scheduled_at));
        setReason(a.reason);
        setNotes(a.notes ?? '');
        setStatus(a.status);
      }).catch((e: unknown) => setError(errorMessage(e)));
    }
  }, [id]);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    const payload = {
      patient_id: Number(patientId),
      doctor_id: Number(doctorId),
      scheduled_at: new Date(when).toISOString(),
      reason,
      notes: notes.trim() ? notes : null,
    };
    try {
      if (id) await appointmentApi.update(Number(id), { ...payload, status });
      else await appointmentApi.create(payload);
      navigate('/appointments');
    } catch (err) {
      setError(errorMessage(err));
    }
  };

  return (
    <Page title={id ? 'Edit appointment' : 'Book appointment'}>
      <form onSubmit={submit} className="card max-w-3xl">
        <ErrorBox message={error} />
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Patient *">
            <select className="input" required value={patientId} onChange={(e) => setPatientId(e.target.value)}>
              <option value="">Select patient…</option>
              {patients.map((p) => <option key={p.id} value={p.id}>{p.first_name} {p.last_name} ({p.phone})</option>)}
            </select>
          </Field>
          <Field label="Doctor *">
            <select className="input" required value={doctorId} onChange={(e) => setDoctorId(e.target.value)}>
              <option value="">Select doctor…</option>
              {doctors.map((d) => (
                <option key={d.id} value={d.id} disabled={!d.is_available && String(d.id) !== doctorId}>
                  {d.full_name} — {d.specialization}{d.is_available ? '' : ' (unavailable)'}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Date & time *"><input className="input" type="datetime-local" required value={when} onChange={(e) => setWhen(e.target.value)} /></Field>
          <Field label="Reason *"><input className="input" required value={reason} onChange={(e) => setReason(e.target.value)} /></Field>
          {id && (
            <Field label="Status">
              <select className="input" value={status} onChange={(e) => setStatus(e.target.value as AppointmentStatus)}>
                <option value="scheduled">Scheduled</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </Field>
          )}
        </div>
        <div className="mt-4">
          <Field label="Notes"><textarea className="input" rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} /></Field>
        </div>
        <p className="mt-3 text-xs text-slate-400">A doctor can't have two scheduled appointments within 30 minutes of each other.</p>
        <div className="mt-6 flex gap-2">
          <button className="btn">Save</button>
          <button type="button" className="btn-ghost" onClick={() => navigate(-1)}>Cancel</button>
        </div>
      </form>
    </Page>
  );
}
