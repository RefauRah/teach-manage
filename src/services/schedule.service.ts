import {
  ScheduleRepository,
  StudentRepository,
  SubjectRepository
} from '../repositories/interfaces.js';
import { Schedule, ScheduleResponse } from '../types/index.js';

export class ScheduleService {
  constructor(
    private scheduleRepo: ScheduleRepository,
    private studentRepo: StudentRepository,
    private subjectRepo: SubjectRepository
  ) {}

  async createSchedule(
    userId: string,
    req: Omit<Schedule, 'id' | 'created_at' | 'updated_at'>
  ): Promise<Schedule> {
    const student = await this.studentRepo.getById(req.student_id, userId);
    if (!student) {
      throw new Error('student not found or unauthorized');
    }

    const subject = await this.subjectRepo.getById(req.subject_id);
    if (!subject || subject.user_id !== userId) {
      throw new Error('subject not found or unauthorized');
    }

    if (req.day_of_week < 0 || req.day_of_week > 6) {
      throw new Error('day of week must be between 0 (Sunday) and 6 (Saturday)');
    }

    return this.scheduleRepo.create({
      student_id: req.student_id,
      subject_id: req.subject_id,
      day_of_week: req.day_of_week,
      start_time: req.start_time,
      end_time: req.end_time,
      is_active: req.is_active !== undefined ? req.is_active : true
    });
  }

  async getSchedules(userId: string): Promise<ScheduleResponse[]> {
    return this.scheduleRepo.getAll(userId);
  }

  async updateSchedule(userId: string, id: string, req: Schedule): Promise<void> {
    const existing = await this.scheduleRepo.getById(id);
    if (!existing) {
      throw new Error('schedule not found');
    }

    const student = await this.studentRepo.getById(existing.student_id, userId);
    if (!student) {
      throw new Error('unauthorized access to schedule');
    }

    if (req.student_id !== existing.student_id) {
      const newStudent = await this.studentRepo.getById(req.student_id, userId);
      if (!newStudent) {
        throw new Error('new student not found or unauthorized');
      }
    }

    if (req.subject_id !== existing.subject_id) {
      const newSubject = await this.subjectRepo.getById(req.subject_id);
      if (!newSubject || newSubject.user_id !== userId) {
        throw new Error('new subject not found or unauthorized');
      }
    }

    if (req.day_of_week < 0 || req.day_of_week > 6) {
      throw new Error('day of week must be between 0 (Sunday) and 6 (Saturday)');
    }

    await this.scheduleRepo.update({
      ...existing,
      student_id: req.student_id,
      subject_id: req.subject_id,
      day_of_week: req.day_of_week,
      start_time: req.start_time,
      end_time: req.end_time,
      is_active: req.is_active
    });
  }

  async deleteSchedule(userId: string, id: string): Promise<void> {
    const existing = await this.scheduleRepo.getById(id);
    if (!existing) {
      throw new Error('schedule not found');
    }

    const student = await this.studentRepo.getById(existing.student_id, userId);
    if (!student) {
      throw new Error('unauthorized access to schedule');
    }

    await this.scheduleRepo.delete(id);
  }
}
