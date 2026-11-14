import { motion } from 'framer-motion';
import { ReactNode } from 'react';
import { Navigate, NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const links = [
  { to: '/dashboard', label: 'Dashboard' },
  { to: '/patients', label: 'Patients' },
  { to: '/doctors', label: 'Doctors' },
  { to: '/appointments', label: 'Appointments' },
  { to: '/profile', label: 'Profile' },
];

export function ProtectedLayout() {
  const { user, isLoading, logout } = useAuth();
  if (isLoading) return <div className="p-10 text-slate-500">Loading…</div>;
  if (!user) return <Navigate to="/login" replace />;

  return (
    <div className="min-h-screen bg-slate-50 md:flex">
      <aside className="border-b border-slate-200 bg-white md:min-h-screen md:w-60 md:border-b-0 md:border-r">
        <div className="px-5 py-5 text-lg font-bold text-teal-700">🏥 MediCare HMS</div>
        <nav className="flex gap-1 overflow-x-auto px-3 pb-3 md:flex-col">
          {links.map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              className={({ isActive }) =>
                `whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium ${
                  isActive ? 'bg-teal-50 text-teal-700' : 'text-slate-600 hover:bg-slate-100'
                }`
              }
            >
              {l.label}
            </NavLink>
          ))}
          <button onClick={logout} className="whitespace-nowrap rounded-lg px-3 py-2 text-left text-sm text-rose-600 hover:bg-rose-50">
            Log out
          </button>
        </nav>
      </aside>
      <main className="flex-1 p-4 md:p-8">
        <Outlet />
      </main>
    </div>
  );
}

export function Page({ title, actions, children }: { title: string; actions?: ReactNode; children: ReactNode }) {
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-slate-800">{title}</h1>
        <div className="flex gap-2">{actions}</div>
      </div>
      {children}
    </motion.div>
  );
}

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-slate-600">{label}</span>
      {children}
    </label>
  );
}

export function ErrorBox({ message }: { message: string }) {
  if (!message) return null;
  return <div className="mb-4 rounded-lg bg-rose-50 px-4 py-3 text-sm text-rose-700">{message}</div>;
}

const statusStyles: Record<string, string> = {
  scheduled: 'bg-sky-100 text-sky-700',
  completed: 'bg-emerald-100 text-emerald-700',
  cancelled: 'bg-slate-200 text-slate-600',
};

export function StatusBadge({ status }: { status: string }) {
  return <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${statusStyles[status] ?? ''}`}>{status}</span>;
}

export const formatDateTime = (iso: string): string =>
  new Date(iso).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' });
