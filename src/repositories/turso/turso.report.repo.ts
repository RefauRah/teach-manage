import { Client } from '@libsql/client';
import { v4 as uuidv4 } from 'uuid';
import { ReportRepository } from '../interfaces.js';
import { Report, ReportResponse } from '../../types/index.js';

export class TursoReportRepository implements ReportRepository {
  constructor(private client: Client) {}

  async create(report: Omit<Report, 'id' | 'created_at' | 'updated_at'>): Promise<Report> {
    const id = uuidv4();
    const now = new Date().toISOString();

    await this.client.execute({
      sql: `
        INSERT INTO reports (id, session_id, material_taught, comprehension_score, comprehension_notes, homework, behavior_notes, recommendations, teacher_signature, parent_signature, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      args: [
        id,
        report.session_id,
        report.material_taught,
        report.comprehension_score,
        report.comprehension_notes || '',
        report.homework || '',
        report.behavior_notes || '',
        report.recommendations || '',
        report.teacher_signature,
        report.parent_signature || null,
        now,
        now
      ]
    });

    return {
      id,
      session_id: report.session_id,
      material_taught: report.material_taught,
      comprehension_score: report.comprehension_score,
      comprehension_notes: report.comprehension_notes,
      homework: report.homework,
      behavior_notes: report.behavior_notes,
      recommendations: report.recommendations,
      teacher_signature: report.teacher_signature,
      parent_signature: report.parent_signature,
      created_at: now,
      updated_at: now
    };
  }

  async update(report: Omit<Report, 'created_at' | 'updated_at'>): Promise<void> {
    const now = new Date().toISOString();

    await this.client.execute({
      sql: `
        UPDATE reports
        SET material_taught = ?, comprehension_score = ?, comprehension_notes = ?, homework = ?, behavior_notes = ?, recommendations = ?, teacher_signature = ?, parent_signature = ?, updated_at = ?
        WHERE id = ?
      `,
      args: [
        report.material_taught,
        report.comprehension_score,
        report.comprehension_notes || '',
        report.homework || '',
        report.behavior_notes || '',
        report.recommendations || '',
        report.teacher_signature,
        report.parent_signature || null,
        now,
        report.id
      ]
    });
  }

  async getBySessionId(sessionId: string, userId: string): Promise<ReportResponse | null> {
    const res = await this.client.execute({
      sql: `
        SELECT r.id, r.session_id, r.material_taught, r.comprehension_score, r.comprehension_notes, r.homework, r.behavior_notes, r.recommendations, r.teacher_signature, r.parent_signature, r.created_at, r.updated_at,
               st.full_name AS student_name, su.name AS subject_name, se.session_date, se.start_time, se.end_time
        FROM reports r
        JOIN sessions se ON r.session_id = se.id
        JOIN students st ON se.student_id = st.id
        JOIN subjects su ON se.subject_id = su.id
        WHERE r.session_id = ? AND st.user_id = ?
      `,
      args: [sessionId, userId]
    });

    if (res.rows.length === 0) return null;
    const r = res.rows[0];

    return {
      id: String(r.id),
      session_id: String(r.session_id),
      material_taught: String(r.material_taught),
      comprehension_score: Number(r.comprehension_score),
      comprehension_notes: String(r.comprehension_notes || ''),
      homework: String(r.homework || ''),
      behavior_notes: String(r.behavior_notes || ''),
      recommendations: String(r.recommendations || ''),
      teacher_signature: String(r.teacher_signature || ''),
      parent_signature: r.parent_signature ? String(r.parent_signature) : null,
      created_at: String(r.created_at),
      updated_at: String(r.updated_at),
      student_name: String(r.student_name),
      subject_name: String(r.subject_name),
      session_date: String(r.session_date),
      start_time: String(r.start_time),
      end_time: String(r.end_time)
    };
  }

  async getById(id: string, userId: string): Promise<ReportResponse | null> {
    const res = await this.client.execute({
      sql: `
        SELECT r.id, r.session_id, r.material_taught, r.comprehension_score, r.comprehension_notes, r.homework, r.behavior_notes, r.recommendations, r.teacher_signature, r.parent_signature, r.created_at, r.updated_at,
               st.full_name AS student_name, su.name AS subject_name, se.session_date, se.start_time, se.end_time
        FROM reports r
        JOIN sessions se ON r.session_id = se.id
        JOIN students st ON se.student_id = st.id
        JOIN subjects su ON se.subject_id = su.id
        WHERE r.id = ? AND st.user_id = ?
      `,
      args: [id, userId]
    });

    if (res.rows.length === 0) return null;
    const r = res.rows[0];

    return {
      id: String(r.id),
      session_id: String(r.session_id),
      material_taught: String(r.material_taught),
      comprehension_score: Number(r.comprehension_score),
      comprehension_notes: String(r.comprehension_notes || ''),
      homework: String(r.homework || ''),
      behavior_notes: String(r.behavior_notes || ''),
      recommendations: String(r.recommendations || ''),
      teacher_signature: String(r.teacher_signature || ''),
      parent_signature: r.parent_signature ? String(r.parent_signature) : null,
      created_at: String(r.created_at),
      updated_at: String(r.updated_at),
      student_name: String(r.student_name),
      subject_name: String(r.subject_name),
      session_date: String(r.session_date),
      start_time: String(r.start_time),
      end_time: String(r.end_time)
    };
  }
}
