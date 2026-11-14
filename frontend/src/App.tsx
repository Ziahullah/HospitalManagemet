import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { ProtectedLayout } from './components/Layout';
import { AuthProvider } from './context/AuthContext';
import { AppointmentFormPage, AppointmentListPage } from './pages/AppointmentPages';
import { AuthCallbackPage, LoginPage, RegisterPage } from './pages/AuthPages';
import { DashboardPage } from './pages/DashboardPage';
import { DoctorFormPage, DoctorListPage } from './pages/DoctorPages';
import { PatientDetailPage, PatientFormPage, PatientListPage } from './pages/PatientPages';
import { ProfilePage } from './pages/ProfilePage';

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/auth/callback" element={<AuthCallbackPage />} />
          <Route element={<ProtectedLayout />}>
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/patients" element={<PatientListPage />} />
            <Route path="/patients/new" element={<PatientFormPage />} />
            <Route path="/patients/:id" element={<PatientDetailPage />} />
            <Route path="/patients/:id/edit" element={<PatientFormPage />} />
            <Route path="/doctors" element={<DoctorListPage />} />
            <Route path="/doctors/new" element={<DoctorFormPage />} />
            <Route path="/doctors/:id/edit" element={<DoctorFormPage />} />
            <Route path="/appointments" element={<AppointmentListPage />} />
            <Route path="/appointments/new" element={<AppointmentFormPage />} />
            <Route path="/appointments/:id/edit" element={<AppointmentFormPage />} />
            <Route path="/profile" element={<ProfilePage />} />
          </Route>
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
