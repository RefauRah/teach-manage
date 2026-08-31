export type FeeModel = 'per_session' | 'monthly' | 'per_hour';
export type SessionStatus = 'completed' | 'cancelled' | 'rescheduled';

export interface User {
  id: string;
  name: string;
  email: string;
}

export interface Subject {
  id: string;
  user_id?: string;
  name: string;
}

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

export interface Student {
  id: string;
  user_id?: string;
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
  created_at?: string;
  updated_at?: string;
  parent?: Parent | null;
  subjects: Subject[];
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
  father_name?: string;
  mother_name?: string;
  phones?: string[];
  email?: string;
  parent_address?: string;
  occupation?: string;
}

export interface Schedule {
  id: string;
  student_id: string;
  subject_id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  is_active: boolean;
  student_name?: string;
  subject_name?: string;
}

export interface Session {
  id: string;
  student_id: string;
  subject_id: string;
  schedule_id?: string | null;
  session_date: string;
  start_time: string;
  end_time: string;
  status: SessionStatus;
  fee_calculated: number;
  student_name: string;
  subject_name: string;
  has_report: boolean;
}

export interface Report {
  id?: string;
  session_id: string;
  material_taught: string;
  comprehension_score: number;
  comprehension_notes?: string;
  homework?: string;
  behavior_notes?: string;
  recommendations?: string;
  teacher_signature: string;
  parent_signature?: string | null;
  student_name?: string;
  subject_name?: string;
  session_date?: string;
  start_time?: string;
  end_time?: string;
}

export interface StudentRecap {
  student_id: string;
  student_name: string;
  completed_count: number;
  cancelled_count: number;
  rescheduled_count: number;
  fee_model: string;
  fee_amount: number;
  total_earnings: number;
}

export interface MonthlyRecap {
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
  label: string;
  earnings: number;
}
