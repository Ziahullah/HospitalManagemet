import axios, { AxiosError, InternalAxiosRequestConfig, isAxiosError } from 'axios';
import type {
  Appointment, AppointmentInput, AppointmentStatus, DashboardStats,
  Doctor, DoctorInput, Patient, PatientInput, Tokens, User,
} from '../types';

const baseURL = `${import.meta.env.VITE_API_URL ?? ''}/api/v1`;
const api = axios.create({ baseURL });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

interface RetryConfig extends InternalAxiosRequestConfig { _retry?: boolean }

api.interceptors.response.use(
  (res) => res,
  async (error: AxiosError) => {
    const config = error.config as RetryConfig | undefined;
    const refresh = localStorage.getItem('refresh_token');
    if (error.response?.status === 401 && config && !config._retry && refresh) {
      config._retry = true;
      try {
        const { data } = await axios.post<Tokens>(`${baseURL}/auth/refresh`, { refresh_token: refresh });
        saveTokens(data);
        return api(config);
      } catch {
        clearTokens();
      }
    }
    return Promise.reject(error);
  },
);

export const saveTokens = (t: Tokens): void => {
  localStorage.setItem('access_token', t.access_token);
  localStorage.setItem('refresh_token', t.refresh_token);
};
export const clearTokens = (): void => {
  localStorage.removeItem('access_token');
  localStorage.removeItem('refresh_token');
};

export const errorMessage = (err: unknown): string => {
  if (isAxiosError(err)) {
    const detail: unknown = err.response?.data?.detail;
    if (typeof detail === 'string') return detail;
    if (Array.isArray(detail)) {
      return detail.map((d: { loc?: string[]; msg?: string }) => `${d.loc?.slice(-1)[0] ?? ''}: ${d.msg ?? ''}`).join(', ');
    }
    return err.message;
  }
  return 'Something went wrong';
};

export const authApi = {
  login: async (email: string, password: string): Promise<Tokens> => {
    const form = new URLSearchParams({ username: email, password });
    return (await api.post<Tokens>('/auth/login', form)).data;
  },
  register: async (email: string, password: string, full_name: string): Promise<User> =>
    (await api.post<User>('/auth/register', { email, password, full_name })).data,
  me: async (): Promise<User> => (await api.get<User>('/auth/me')).data,
  updateMe: async (full_name: string): Promise<User> => (await api.put<User>('/auth/me', { full_name })).data,
};

export const patientApi = {
  list: async (search?: string): Promise<Patient[]> =>
    (await api.get<Patient[]>('/patients', { params: { search: search || undefined } })).data,
  get: async (id: number): Promise<Patient> => (await api.get<Patient>(`/patients/${id}`)).data,
  create: async (data: PatientInput): Promise<Patient> => (await api.post<Patient>('/patients', data)).data,
  update: async (id: number, data: PatientInput): Promise<Patient> =>
    (await api.put<Patient>(`/patients/${id}`, data)).data,
  remove: async (id: number): Promise<void> => { await api.delete(`/patients/${id}`); },
};

export const doctorApi = {
  list: async (params?: { specialization?: string; available?: boolean }): Promise<Doctor[]> =>
    (await api.get<Doctor[]>('/doctors', { params })).data,
  get: async (id: number): Promise<Doctor> => (await api.get<Doctor>(`/doctors/${id}`)).data,
  create: async (data: DoctorInput): Promise<Doctor> => (await api.post<Doctor>('/doctors', data)).data,
  update: async (id: number, data: DoctorInput): Promise<Doctor> =>
    (await api.put<Doctor>(`/doctors/${id}`, data)).data,
  remove: async (id: number): Promise<void> => { await api.delete(`/doctors/${id}`); },
};

export const appointmentApi = {
  list: async (params?: { status?: AppointmentStatus; patient_id?: number; doctor_id?: number }): Promise<Appointment[]> =>
    (await api.get<Appointment[]>('/appointments', { params })).data,
  get: async (id: number): Promise<Appointment> => (await api.get<Appointment>(`/appointments/${id}`)).data,
  create: async (data: AppointmentInput): Promise<Appointment> =>
    (await api.post<Appointment>('/appointments', data)).data,
  update: async (id: number, data: AppointmentInput): Promise<Appointment> =>
    (await api.put<Appointment>(`/appointments/${id}`, data)).data,
  remove: async (id: number): Promise<void> => { await api.delete(`/appointments/${id}`); },
};

export const dashboardApi = {
  stats: async (): Promise<DashboardStats> => (await api.get<DashboardStats>('/dashboard/stats')).data,
};

export default api;
