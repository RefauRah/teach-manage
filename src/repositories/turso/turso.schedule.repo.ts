import { Client } from '@libsql/client';
import { v4 as uuidv4 } from 'uuid';
import { ScheduleRepository } from '../interfaces.js';
import { Schedule, ScheduleResponse, ActiveScheduleRow } from '../../types/index.js';

export class TursoScheduleRepository implements ScheduleRepository {
  constructor(private client: Client) {}

  async create(schedule: Omit<Schedule, 'id' | 'created_at' | 'updated_at'>): Promise<Schedule> {
    const id = uuidv4();
    const now = new Date().toISOString();
    const isActive = schedule.is_active !== undefined ? (schedule.is_active ? 1 : 0) : 1;

    await this.client.execute({
      sql: `
        INSERT INTO schedules (id, student_id, subject_id, day_of_week, start_time, end_time, is_active, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      args: [
        id,
        schedule.student_id,
        schedule.subject_id,
        schedule.day_of_week,
        schedule.start_time,
        schedule.end_time,
        isActive,
        now,
        now
      ]
    });

    return {
      id,
      student_id: schedule.student_id,
      subject_id: schedule.subject_id,
      day_of_week: schedule.day_of_week,
      start_time: schedule.start_time,
      end_time: schedule.end_time,
      is_active: Boolean(isActive),
      created_at: now,
      updated_at: now
    };
  }

  async getById(id: string): Promise<Schedule | null> {
    const res = await this.client.execute({
      sql: `SELECT id, student_id, subject_id, day_of_week, start_time, end_time, is_active, created_at, updated_at FROM schedules WHERE id = ?`,
      args: [id]
    });

    if (res.rows.length === 0) return null;
    const r = res.rows[0];
    return {
      id: String(r.id),
      student_id: String(r.student_id),
      subject_id: String(r.subject_id),
      day_of_week: Number(r.day_of_week),
      start_time: String(r.start_time),
      end_time: String(r.end_time),
      is_active: Boolean(r.is_active),
      created_at: String(r.created_at),
      updated_at: String(r.updated_at)
    };
  }

  async getAll(userId: string): Promise<ScheduleResponse[]> {
    const res = await this.client.execute({
      sql: `
        SELECT sc.id, sc.student_id, sc.subject_id, sc.day_of_week, sc.start_time, sc.end_time, sc.is_active,
               st.full_name AS student_name, su.name AS subject_name
        FROM schedules sc
        JOIN students st ON sc.student_id = st.id
        JOIN subjects su ON sc.subject_id = su.id
        WHERE st.user_id = ?
        ORDER BY sc.day_of_week ASC, sc.start_time ASC
      `,
      args: [userId]
    });

    return res.rows.map((r) => ({
      id: String(r.id),
      student_id: String(r.student_id),
      subject_id: String(r.subject_id),
      day_of_week: Number(r.day_of_week),
      start_time: String(r.start_time),
      end_time: String(r.end_time),
      is_active: Boolean(r.is_active),
      student_name: String(r.student_name),
      subject_name: String(r.subject_name)
    }));
  }

  async update(schedule: Schedule): Promise<void> {
    const now = new Date().toISOString();
    const isActive = schedule.is_active ? 1 : 0;

    await this.client.execute({
      sql: `
        UPDATE schedules
        SET student_id = ?, subject_id = ?, day_of_week = ?, start_time = ?, end_time = ?, is_active = ?, updated_at = ?
        WHERE id = ?
      `,
      args: [
        schedule.student_id,
        schedule.subject_id,
        schedule.day_of_week,
        schedule.start_time,
        schedule.end_time,
        isActive,
        now,
        schedule.id
      ]
    });
  }

  async delete(id: string): Promise<void> {
    await this.client.execute({
      sql: `DELETE FROM schedules WHERE id = ?`,
      args: [id]
    });
  }

  async getActiveWithStudentDetails(userId: string): Promise<ActiveScheduleRow[]> {
    const res = await this.client.execute({
      sql: `
        SELECT sc.id, sc.student_id, sc.subject_id, sc.day_of_week, sc.start_time, sc.end_time,
               st.fee_model, st.fee_amount
        FROM schedules sc
        JOIN students st ON sc.student_id = st.id
        WHERE st.user_id = ? AND sc.is_active = 1
      `,
      args: [userId]
    });

    return res.rows.map((r) => ({
      id: String(r.id),
      student_id: String(r.student_id),
      subject_id: String(r.subject_id),
      day_of_week: Number(r.day_of_week),
      start_time: String(r.start_time),
      end_time: String(r.end_time),
      fee_model: String(r.fee_model) as any,
      fee_amount: Number(r.fee_amount || 0)
    }));
  }
}
