import {
  SessionRepository,
  StudentRepository,
  ScheduleRepository
} from '../repositories/interfaces.js';
import { Session, SessionResponse, FeeModel, SessionStatus } from '../types/index.js';

export class SessionService {
  constructor(
    private sessionRepo: SessionRepository,
    private studentRepo: StudentRepository,
    private scheduleRepo: ScheduleRepository
  ) {}

  async createSession(
    userId: string,
    req: {
      student_id: string;
      subject_id: string;
      session_date: string;
      start_time: string;
      end_time: string;
      status: SessionStatus;
    }
  ): Promise<Session> {
    const student = await this.studentRepo.getById(req.student_id, userId);
    if (!student) {
      throw new Error('student not found or unauthorized');
    }

    const subjectValid = student.subjects.some((sub) => sub.id === req.subject_id);
    if (!subjectValid) {
      throw new Error('subject is not associated with this student');
    }

    if (
      req.status !== 'completed' &&
      req.status !== 'cancelled' &&
      req.status !== 'rescheduled'
    ) {
      throw new Error('invalid status');
    }

    let fee = 0.0;
    if (req.status !== 'cancelled') {
      fee = this.calculateFee(
        student.fee_model,
        student.fee_amount,
        req.start_time,
        req.end_time
      );
    }

    return this.sessionRepo.create({
      student_id: req.student_id,
      subject_id: req.subject_id,
      schedule_id: null,
      session_date: req.session_date,
      start_time: req.start_time,
      end_time: req.end_time,
      status: req.status,
      fee_calculated: fee
    });
  }

  async getSessions(
    userId: string,
    startDate?: string,
    endDate?: string,
    studentId?: string
  ): Promise<SessionResponse[]> {
    return this.sessionRepo.getAll(userId, startDate, endDate, studentId);
  }

  async updateSession(userId: string, id: string, req: Session): Promise<void> {
    const existing = await this.sessionRepo.getById(id);
    if (!existing) {
      throw new Error('session not found');
    }

    const student = await this.studentRepo.getById(existing.student_id, userId);
    if (!student) {
      throw new Error('unauthorized access to session');
    }

    if (
      req.status !== 'completed' &&
      req.status !== 'cancelled' &&
      req.status !== 'rescheduled'
    ) {
      throw new Error('invalid status');
    }

    existing.session_date = req.session_date;
    existing.start_time = req.start_time;
    existing.end_time = req.end_time;
    existing.status = req.status;

    if (existing.status === 'cancelled') {
      existing.fee_calculated = 0.0;
    } else {
      existing.fee_calculated = this.calculateFee(
        student.fee_model,
        student.fee_amount,
        existing.start_time,
        existing.end_time
      );
    }

    await this.sessionRepo.update(existing);
  }

  async deleteSession(userId: string, id: string): Promise<void> {
    const existing = await this.sessionRepo.getById(id);
    if (!existing) {
      throw new Error('session not found');
    }

    const student = await this.studentRepo.getById(existing.student_id, userId);
    if (!student) {
      throw new Error('unauthorized access to session');
    }

    await this.sessionRepo.delete(id);
  }

  async generateSessionsFromSchedule(
    userId: string,
    startDateStr: string,
    endDateStr: string
  ): Promise<number> {
    const startDate = new Date(startDateStr + 'T00:00:00Z');
    const endDate = new Date(endDateStr + 'T00:00:00Z');

    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      throw new Error('invalid date format, must be YYYY-MM-DD');
    }

    if (endDate < startDate) {
      throw new Error('end date must be after or equal to start date');
    }

    const schedules = await this.scheduleRepo.getActiveWithStudentDetails(userId);
    if (schedules.length === 0) {
      return 0;
    }

    const sessionsToCreate: Omit<Session, 'id' | 'created_at' | 'updated_at'>[] = [];
    let count = 0;

    const current = new Date(startDate);
    while (current <= endDate) {
      const dayOfWeek = current.getUTCDay(); // 0 = Sunday...6 = Saturday
      const dateStr = current.toISOString().slice(0, 10);

      for (const sc of schedules) {
        if (sc.day_of_week === dayOfWeek) {
          const exists = await this.sessionRepo.checkExists(
            sc.student_id,
            sc.subject_id,
            dateStr,
            sc.start_time
          );

          if (!exists) {
            const fee = this.calculateFee(
              sc.fee_model,
              sc.fee_amount,
              sc.start_time,
              sc.end_time
            );

            sessionsToCreate.push({
              student_id: sc.student_id,
              subject_id: sc.subject_id,
              schedule_id: sc.id,
              session_date: dateStr,
              start_time: sc.start_time,
              end_time: sc.end_time,
              status: 'completed',
              fee_calculated: fee
            });
            count++;
          }
        }
      }

      current.setUTCDate(current.getUTCDate() + 1);
    }

    if (sessionsToCreate.length > 0) {
      await this.sessionRepo.bulkCreate(sessionsToCreate);
    }

    return count;
  }

  calculateFee(
    feeModel: FeeModel | string,
    feeAmount: number,
    startTime: string,
    endTime: string
  ): number {
    if (feeModel === 'per_session') {
      return Number(feeAmount);
    }
    if (feeModel === 'monthly') {
      return 0.0;
    }
    if (feeModel === 'per_hour') {
      const s = startTime.slice(0, 5).split(':');
      const e = endTime.slice(0, 5).split(':');
      if (s.length < 2 || e.length < 2) return 0.0;

      const startMinutes = parseInt(s[0], 10) * 60 + parseInt(s[1], 10);
      let endMinutes = parseInt(e[0], 10) * 60 + parseInt(e[1], 10);
      if (endMinutes < startMinutes) {
        endMinutes += 24 * 60;
      }

      const hours = (endMinutes - startMinutes) / 60;
      return hours * Number(feeAmount);
    }
    return 0.0;
  }
}
