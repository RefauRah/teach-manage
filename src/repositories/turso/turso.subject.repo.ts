import { Client } from '@libsql/client';
import { v4 as uuidv4 } from 'uuid';
import { SubjectRepository } from '../interfaces.js';
import { Subject } from '../../types/index.js';

export class TursoSubjectRepository implements SubjectRepository {
  constructor(private client: Client) {}

  async create(subject: { user_id: string; name: string }): Promise<Subject> {
    const id = uuidv4();
    await this.client.execute({
      sql: `INSERT INTO subjects (id, user_id, name) VALUES (?, ?, ?)`,
      args: [id, subject.user_id, subject.name]
    });

    return {
      id,
      user_id: subject.user_id,
      name: subject.name
    };
  }

  async getAll(userId: string): Promise<Subject[]> {
    const res = await this.client.execute({
      sql: `SELECT id, user_id, name FROM subjects WHERE user_id = ? ORDER BY name ASC`,
      args: [userId]
    });

    return res.rows.map((row) => ({
      id: String(row.id),
      user_id: String(row.user_id),
      name: String(row.name)
    }));
  }

  async getById(id: string): Promise<Subject | null> {
    const res = await this.client.execute({
      sql: `SELECT id, user_id, name FROM subjects WHERE id = ?`,
      args: [id]
    });

    if (res.rows.length === 0) return null;
    const row = res.rows[0];
    return {
      id: String(row.id),
      user_id: String(row.user_id),
      name: String(row.name)
    };
  }

  async update(subject: { id: string; user_id: string; name: string }): Promise<void> {
    await this.client.execute({
      sql: `UPDATE subjects SET name = ? WHERE id = ? AND user_id = ?`,
      args: [subject.name, subject.id, subject.user_id]
    });
  }

  async delete(id: string, userId: string): Promise<void> {
    await this.client.execute({
      sql: `DELETE FROM subjects WHERE id = ? AND user_id = ?`,
      args: [id, userId]
    });
  }
}
