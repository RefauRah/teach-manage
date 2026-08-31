import {
  User,
  Subject,
  Student,
  StudentResponse,
  Parent,
  Schedule,
  ScheduleResponse,
  ActiveScheduleRow,
  Session,
  SessionResponse,
  Report,
  ReportResponse
} from '../types/index.js';

export interface UserRepository {
  create(user: Omit<User, 'id' | 'created_at' | 'updated_at'>): Promise<User>;
  getByEmail(email: string): Promise<User | null>;
  getById(id: string): Promise<User | null>;
}

export interface SubjectRepository {
  create(subject: { user_id: string; name: string }): Promise<Subject>;
  getAll(userId: string): Promise<Subject[]>;
  getById(id: string): Promise<Subject | null>;
  update(subject: { id: string; user_id: string; name: string }): Promise<void>;
  delete(id: string, userId: string): Promise<void>;
}

export interface StudentRepository {
  create(
    student: Omit<Student, 'id' | 'created_at' | 'updated_at'>,
    parent?: Parent | null,
    subjectIds?: string[]
  ): Promise<StudentResponse>;
  update(
    student: Omit<Student, 'created_at' | 'updated_at'>,
    parent?: Parent | null,
    subjectIds?: string[]
  ): Promise<void>;
  delete(id: string, userId: string): Promise<void>;
  getAll(userId: string): Promise<StudentResponse[]>;
  getById(id: string, userId: string): Promise<StudentResponse | null>;
}

export interface ScheduleRepository {
  create(schedule: Omit<Schedule, 'id' | 'created_at' | 'updated_at'>): Promise<Schedule>;
  getById(id: string): Promise<Schedule | null>;
  getAll(userId: string): Promise<ScheduleResponse[]>;
  update(schedule: Schedule): Promise<void>;
  delete(id: string): Promise<void>;
  getActiveWithStudentDetails(userId: string): Promise<ActiveScheduleRow[]>;
}

export interface SessionRepository {
  create(session: Omit<Session, 'id' | 'created_at' | 'updated_at'>): Promise<Session>;
  getById(id: string): Promise<Session | null>;
  getAll(
    userId: string,
    startDate?: string,
    endDate?: string,
    studentId?: string
  ): Promise<SessionResponse[]>;
  update(session: Session): Promise<void>;
  delete(id: string): Promise<void>;
  bulkCreate(sessions: Omit<Session, 'id' | 'created_at' | 'updated_at'>[]): Promise<void>;
  checkExists(
    studentId: string,
    subjectId: string,
    sessionDate: string,
    startTime: string
  ): Promise<boolean>;
}

export interface ReportRepository {
  create(report: Omit<Report, 'id' | 'created_at' | 'updated_at'>): Promise<Report>;
  update(report: Omit<Report, 'created_at' | 'updated_at'>): Promise<void>;
  getBySessionId(sessionId: string, userId: string): Promise<ReportResponse | null>;
  getById(id: string, userId: string): Promise<ReportResponse | null>;
}
