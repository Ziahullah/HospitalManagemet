export interface User {
  id: number;
  email: string;
  full_name: string | null;
  role: 'admin' | 'staff';
  is_active: boolean;
  avatar_url: string | null;
  created_at: string;
}

export interface Tokens {
  access_token: string;
  refresh_token: string;
}

export type Gender = 'male' | 'female' | 'other';

export interface PatientInput {
  first_name: string;
  last_name: string;
  date_of_birth: string;
  gender: Gender;
  phone: string;
  email: string | null;
  address: string | null;
  blood_group: string | null;
  medical_history: string | null;
}

export interface Patient extends PatientInput {
  id: number;
  created_at: string;
}

export interface DoctorInput {
  full_name: string;
  specialization: string;
  phone: string;
  email: string;
  consultation_fee: string;
  is_available: boolean;
}

export interface Doctor extends DoctorInput {
  id: number;
  created_at: string;
}

export type AppointmentStatus = 'scheduled' | 'completed' | 'cancelled';

export interface AppointmentInput {
  patient_id: number;
  doctor_id: number;
  scheduled_at: string;
  reason: string;
  notes: string | null;
  status?: AppointmentStatus;
}

export interface Appointment extends AppointmentInput {
  id: number;
  status: AppointmentStatus;
  patient: { id: number; first_name: string; last_name: string };
  doctor: { id: number; full_name: string; specialization: string };
}

export interface DashboardStats {
  total_patients: number;
  total_doctors: number;
  available_doctors: number;
  scheduled_appointments: number;
  completed_appointments: number;
  todays_appointments: Appointment[];
}
