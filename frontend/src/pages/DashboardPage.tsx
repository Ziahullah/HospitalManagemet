import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ErrorBox, formatDateTime, Page, StatusBadge } from '../components/Layout';
import { useAuth } from '../context/AuthContext';
import { dashboardApi, errorMessage } from '../services/api';
import type { DashboardStats } from '../types';

export function DashboardPage() {
  const { user } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    dashboardApi.stats().then(setStats).catch((e: unknown) => setError(errorMessage(e)));
  }, []);

  const tiles = stats
    ? [
        { label: 'Patients', value: stats.total_patients, to: '/patients' },
        { label: 'Doctors', value: `${stats.available_doctors} / ${stats.total_doctors}`, sub: 'available', to: '/doctors' },
        { label: 'Scheduled', value: stats.scheduled_appointments, to: '/appointments' },
        { label: 'Completed', value: stats.completed_appointments, to: '/appointments' },
      ]
    : [];

  return (
    <Page title={`Welcome${user?.full_name ? `, ${user.full_name}` : ''}`} actions={<Link to="/appointments/new" className="btn">Book appointment</Link>}>
      <ErrorBox message={error} />
      <div className="mb-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {tiles.map((t) => (
          <Link key={t.label} to={t.to} className="card transition hover:-translate-y-0.5 hover:shadow-md">
            <div className="text-sm text-slate-500">{t.label}</div>
            <div className="mt-1 text-3xl font-bold text-slate-800">{t.value}</div>
            {t.sub && <div className="text-xs text-slate-400">{t.sub}</div>}
          </Link>
        ))}
      </div>
      <div className="card">
        <h2 className="mb-4 font-semibold text-slate-700">Today's appointments (UTC day)</h2>
        {stats?.todays_appointments.length ? (
          <ul className="divide-y divide-slate-100">
            {stats.todays_appointments.map((a) => (
              <li key={a.id} className="flex flex-wrap items-center justify-between gap-2 py-3 text-sm">
                <span>
                  <b>{formatDateTime(a.scheduled_at)}</b> · {a.patient.first_name} {a.patient.last_name} with {a.doctor.full_name}
                </span>
                <StatusBadge status={a.status} />
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-slate-500">No appointments today.</p>
        )}
      </div>
    </Page>
  );
}
