# INITIAL.md - Define Your Product

> Fill this out, then run `/generate-prp INITIAL.md`

---

## PRODUCT

**Name:** MediCare HMS

**Description:** A simple hospital management system for small clinics and hospitals. Front-desk and admin staff register patients, maintain the doctor directory, and book and track appointments from a single dashboard.

**Type:** SaaS

---

## TECH STACK

| Layer | Choice |
|-------|--------|
| Backend | FastAPI + Python |
| Frontend | React + TypeScript + Vite |
| Database | PostgreSQL |
| Auth | JWT + Google OAuth |
| UI | Tailwind + Framer Motion |
| Payments | None |

---

## MODULES

### Module 1: Authentication (Built-in)

**Models:** User, RefreshToken

**Endpoints:**
- POST /auth/register, /auth/login, /auth/refresh
- GET /auth/me, /auth/google, /auth/google/callback

**Pages:** /login, /register, /profile

---

### Module 2: Patients

**Description:** Register and manage patient records.

**Models:**
```
Patient:
  - id, created_by (FK users)
  - first_name: str, last_name: str
  - date_of_birth: date
  - gender: enum(male, female, other)
  - phone: str, email: str | None
  - address: str | None
  - blood_group: str | None
  - medical_history: text | None
  - created_at, updated_at
```

**Endpoints:**
```
GET    /api/v1/patients        - List (search by name/phone)
POST   /api/v1/patients        - Create
GET    /api/v1/patients/{id}   - Get one
PUT    /api/v1/patients/{id}   - Update
DELETE /api/v1/patients/{id}   - Delete
```

**Pages:**
```
/patients           - List
/patients/new       - Create
/patients/{id}      - Detail (with appointment history)
/patients/{id}/edit - Edit
```

---

### Module 3: Doctors

**Description:** Directory of doctors with specialization and availability.

**Models:**
```
Doctor:
  - id, created_by (FK users)
  - full_name: str
  - specialization: str
  - phone: str, email: str
  - consultation_fee: decimal
  - is_available: bool
  - created_at, updated_at
```

**Endpoints:**
```
GET    /api/v1/doctors        - List (filter by specialization / availability)
POST   /api/v1/doctors        - Create
GET    /api/v1/doctors/{id}   - Get one
PUT    /api/v1/doctors/{id}   - Update
DELETE /api/v1/doctors/{id}   - Delete
```

**Pages:**
```
/doctors           - List
/doctors/new       - Create
/doctors/{id}      - Detail
/doctors/{id}/edit - Edit
```

---

### Module 4: Appointments

**Description:** Book appointments between a patient and a doctor and track their status.

**Models:**
```
Appointment:
  - id, created_by (FK users)
  - patient_id (FK patients), doctor_id (FK doctors)
  - scheduled_at: datetime
  - reason: str
  - status: enum(scheduled, completed, cancelled)
  - notes: text | None
  - created_at, updated_at
```

**Rules:**
- Doctor must be available to accept a new booking
- A doctor cannot have two scheduled appointments at the same time

**Endpoints:**
```
GET    /api/v1/appointments        - List (filter by status / patient / doctor)
POST   /api/v1/appointments        - Create
GET    /api/v1/appointments/{id}   - Get one
PUT    /api/v1/appointments/{id}   - Update (incl. status)
DELETE /api/v1/appointments/{id}   - Delete
```

**Pages:**
```
/appointments           - List
/appointments/new       - Book
/appointments/{id}/edit - Edit / change status
```

---

### Module 5: Dashboard

**Endpoints:** GET /api/v1/dashboard/stats

**Pages:** /dashboard (counts + today's appointments)

---

## MVP SCOPE

Must Have:
- [x] User registration/login
- [x] Patient records CRUD
- [x] Doctor directory CRUD
- [x] Appointment booking with conflict check
- [x] Dashboard stats

---

## ACCEPTANCE CRITERIA

- [ ] Users can register and login
- [ ] Users can CRUD patients, doctors and appointments
- [ ] Double-booking a doctor is rejected
- [ ] 80%+ test coverage
- [ ] Docker builds successfully

---

## RUN

```bash
/generate-prp INITIAL.md
/execute-prp PRPs/medicare-hms-prp.md
```
