import { Client } from '@libsql/client';
import { v4 as uuidv4 } from 'uuid';
import { SessionRepository } from '../interfaces.js';
import { Session, SessionResponse } from '../../types/index.js';

export class TursoSessionRepository implements SessionRepository {
  constructor(private client: Client) {}

  async create(session: Omit<Session, 'id' | 'created_at' | 'updated_at'>): Promise<Session> {
    const id = uuidv4();
    const now = new Date().toISOString();

    await this.client.execute({
      sql: `
        INSERT INTO sessions (id, student_id, subject_id, schedule_id, session_date, start_time, end_time, status, fee_calculated, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      args: [
        id,
        session.student_id,
        session.subject_id,
        session.schedule_id || null,
        session.session_date,
        session.start_time,
        session.end_time,
        session.status,
        session.fee_calculated,
        now,
        now
      ]
    });

    return {
      id,
      student_id: session.student_id,
      subject_id: session.subject_id,
      schedule_id: session.schedule_id || null,
      session_date: session.session_date,
      start_time: session.start_time,
      end_time: session.end_time,
      status: session.status,
      fee_calculated: session.fee_calculated,
      created_at: now,
      updated_at: now
    };
  }

  async getById(id: string): Promise<Session | null> {
    const res = await this.client.execute({
      sql: `SELECT id, student_id, subject_id, schedule_id, session_date, start_time, end_time, status, fee_calculated, created_at, updated_at FROM sessions WHERE id = ?`,
      args: [id]
    });

    if (res.rows.length === 0) return null;
    const r = res.rows[0];
    return {
      id: String(r.id),
      student_id: String(r.student_id),
      subject_id: String(r.subject_id),
      schedule_id: r.schedule_id ? String(r.schedule_id) : null,
      session_date: String(r.session_date),
      start_time: String(r.start_time),
      end_time: String(r.end_time),
      status: String(r.status) as any,
      fee_calculated: Number(r.fee_calculated || 0),
      created_at: String(r.created_at),
      updated_at: String(r.updated_at)
    };
  }

  async getAll(
    userId: string,
    startDate?: string,
    endDate?: string,
    studentId?: string
  ): Promise<SessionResponse[]> {
    let sql = `
      SELECT s.id, s.student_id, s.subject_id, s.schedule_id, s.session_date, s.start_time, s.end_time, s.status, s.fee_calculated, s.created_at, s.updated_at,
             st.full_name AS student_name, su.name AS subject_name,
             (CASE WHEN rep.id IS NOT NULL THEN 1 ELSE 0 END) as has_report
      FROM sessions s
      JOIN students st ON s.student_id = st.id
      JOIN subjects su ON s.subject_id = su.id
      LEFT JOIN reports rep ON rep.session_id = s.id
      WHERE st.user_id = ?
    `;
    const args: any[] = [userId];

    if (startDate) {
      sql += ` AND s.session_date >= ?`;
      args.push(startDate);
    }

    if (endDate) {
      sql += ` AND s.session_date <= ?`;
      args.push(endDate);
    }

    if (studentId) {
      sql += ` AND s.student_id = ?`;
      args.push(studentId);
    }

    sql += ' ORDER BY s.session_date DESC, s.start_time DESC';

    const res = await this.client.execute({ sql, args });

    return res.rows.map((r) => ({
      id: String(r.id),
      student_id: String(r.student_id),
      subject_id: String(r.subject_id),
      schedule_id: r.schedule_id ? String(r.schedule_id) : null,
      session_date: String(r.session_date),
      start_time: String(r.start_time),
      end_time: String(r.end_time),
      status: String(r.status) as any,
      fee_calculated: Number(r.fee_calculated || 0),
      created_at: String(r.created_at),
      updated_at: String(r.updated_at),
      student_name: String(r.student_name),
      subject_name: String(r.subject_name),
      has_report: Boolean(r.has_report)
    }));
  }

  async update(session: Session): Promise<void> {
    const now = new Date().toISOString();
    await this.client.execute({
      sql: `
        UPDATE sessions
        SET student_id = ?, subject_id = ?, schedule_id = ?, session_date = ?, start_time = ?, end_time = ?, status = ?, fee_calculated = ?, updated_at = ?
        WHERE id = ?
      `,
      args: [
        session.student_id,
        session.subject_id,
        session.schedule_id || null,
        session.session_date,
        session.start_time,
        session.end_time,
        session.status,
        session.fee_calculated,
        now,
        session.id
      ]
    });
  }

  async delete(id: string): Promise<void> {
    await this.client.execute({
      sql: `DELETE FROM sessions WHERE id = ?`,
      args: [id]
    });
  }

  async bulkCreate(sessions: Omit<Session, 'id' | 'created_at' | 'updated_at'>[]): Promise<void> {
    if (sessions.length === 0) return;

    const now = new Date().toISOString();
    const batchStatements = sessions.map((s) => {
      const id = uuidv4();
      return {
        sql: `
          INSERT INTO sessions (id, student_id, subject_id, schedule_id, session_date, start_time, end_time, status, fee_calculated, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `,
        args: [
          id,
          s.student_id,
          s.subject_id,
          s.schedule_id || null,
          s.session_date,
          s.start_time,
          s.end_time,
          s.status,
          s.fee_calculated,
          now,
          now
        ]
      };
    });

    await this.client.batch(batchStatements, 'write');
  }

  async checkExists(
    studentId: string,
    subjectId: string,
    sessionDate: string,
    startTime: string
  ): Promise<boolean> {
    const res = await this.client.execute({
      sql: `
        SELECT 1 FROM sessions
        WHERE student_id = ? AND subject_id = ? AND session_date = ? AND start_time = ?
        LIMIT 1
      `,
      args: [studentId, subjectId, sessionDate, startTime]
    });

    return res.rows.length > 0;
  }
}
