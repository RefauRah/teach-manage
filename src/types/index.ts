export type FeeModel = 'per_session' | 'monthly' | 'per_hour';
export type SessionStatus = 'completed' | 'cancelled' | 'rescheduled';

// User Models
export interface User {
  id: string;
  name: string;
  email: string;
  password_hash?: string;
  created_at: Date | string;
  updated_at: Date | string;
}

export interface RegisterRequest {
  name: string;
  email: string;
  password: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface AuthResponse {
  token: string;
  refresh_token: string;
  user: {
    id: string;
    name: string;
    email: string;
    created_at: Date | string;
    updated_at: Date | string;
  };
}

// Subject Models
export interface Subject {
  id: string;
  user_id: string;
  name: string;
}

// Parent Models
export interface Parent {
  id?: string;
  student_id?: string;
  father_name: string;
  mother_name: string;
  phones: string[];
  email: string;
  address: string;
  occupation: string;
}

// Student Models
export interface Student {
  id: string;
  user_id: string;
  full_name: string;
  birth_date: string | null;
  gender: string;
  address: string;
  school: string;
  grade: string;
  phone: string;
  notes: string;
  fee_model: FeeModel;
  fee_amount: number;
  created_at: Date | string;
  updated_at: Date | string;
}

export interface StudentRequest {
  full_name: string;
  birth_date?: string | null;
  gender?: string;
  address?: string;
  school?: string;
  grade?: string;
  phone?: string;
  notes?: string;
  fee_model: FeeModel;
  fee_amount: number;
  subjects?: string[];

  // Parent information nested
  father_name?: string;
  mother_name?: string;
  phones?: string[];
  email?: string;
  parent_address?: string;
  occupation?: string;
}

export interface StudentResponse {
  id: string;
  user_id: string;
  full_name: string;
  birth_date: string | null;
  gender: string;
  address: string;
  school: string;
  grade: string;
  phone: string;
  notes: string;
  fee_model: FeeModel;
  fee_amount: number;
  created_at: Date | string;
  updated_at: Date | string;
  parent?: Parent | null;
  subjects: Subject[];
}

// Schedule Models
export interface Schedule {
  id: string;
  student_id: string;
  subject_id: string;
  day_of_week: number; // 0 = Minggu, 1 = Senin, ..., 6 = Sabtu
  start_time: string; // HH:mm:ss or HH:mm
  end_time: string;
  is_active: boolean;
  created_at?: Date | string;
  updated_at?: Date | string;
}

export interface ScheduleResponse {
  id: string;
  student_id: string;
  subject_id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  is_active: boolean;
  student_name: string;
  subject_name: string;
}

export interface ActiveScheduleRow {
  id: string;
  student_id: string;
  subject_id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  fee_model: FeeModel;
  fee_amount: number;
}

// Session Models
export interface Session {
  id: string;
  student_id: string;
  subject_id: string;
  schedule_id?: string | null;
  session_date: string | Date;
  start_time: string;
  end_time: string;
  status: SessionStatus;
  fee_calculated: number;
  created_at?: Date | string;
  updated_at?: Date | string;
}

export interface SessionResponse {
  id: string;
  student_id: string;
  subject_id: string;
  schedule_id?: string | null;
  session_date: string | Date;
  start_time: string;
  end_time: string;
  status: SessionStatus;
  fee_calculated: number;
  created_at: Date | string;
  updated_at: Date | string;
  student_name: string;
  subject_name: string;
  has_report: boolean;
}

export interface GenerateSessionsRequest {
  start_date: string; // YYYY-MM-DD
  end_date: string;   // YYYY-MM-DD
}

// Report Models
export interface Report {
  id: string;
  session_id: string;
  material_taught: string;
  comprehension_score: number; // 1-5
  comprehension_notes: string;
  homework: string;
  behavior_notes: string;
  recommendations: string;
  teacher_signature: string;
  parent_signature?: string | null;
  created_at?: Date | string;
  updated_at?: Date | string;
}

export interface ReportResponse {
  id: string;
  session_id: string;
  material_taught: string;
  comprehension_score: number;
  comprehension_notes: string;
  homework: string;
  behavior_notes: string;
  recommendations: string;
  teacher_signature: string;
  parent_signature?: string | null;
  created_at: Date | string;
  updated_at: Date | string;
  student_name: string;
  subject_name: string;
  session_date: Date | string;
  start_time: string;
  end_time: string;
}

// Recap Models
export interface StudentRecap {
  student_id: string;
  student_name: string;
  completed_count: number;
  cancelled_count: number;
  rescheduled_count: number;
  fee_model: FeeModel | string;
  fee_amount: number;
  total_earnings: number;
}

export interface MonthlyRecapResponse {
  year: number;
  month: number;
  total_sessions: number;
  completed_sessions: number;
  cancelled_sessions: number;
  rescheduled_sessions: number;
  total_earnings: number;
  students: StudentRecap[];
}

export interface MonthlyTrendItem {
  label: string; // e.g. "Agu 2026"
  earnings: number;
}

// Authenticated Request Payload
export interface AuthenticatedUserPayload {
  userId: string;
  email?: string;
}
