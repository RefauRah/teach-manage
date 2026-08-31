import { Client } from '@libsql/client';
import { v4 as uuidv4 } from 'uuid';
import { UserRepository } from '../interfaces.js';
import { User } from '../../types/index.js';

export class TursoUserRepository implements UserRepository {
  constructor(private client: Client) {}

  async create(user: Omit<User, 'id' | 'created_at' | 'updated_at'>): Promise<User> {
    const id = uuidv4();
    const now = new Date().toISOString();

    await this.client.execute({
      sql: `
        INSERT INTO users (id, name, email, password_hash, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?)
      `,
      args: [id, user.name, user.email, user.password_hash || '', now, now]
    });

    return {
      id,
      name: user.name,
      email: user.email,
      password_hash: user.password_hash,
      created_at: now,
      updated_at: now
    };
  }

  async getByEmail(email: string): Promise<User | null> {
    const res = await this.client.execute({
      sql: `SELECT id, name, email, password_hash, created_at, updated_at FROM users WHERE email = ?`,
      args: [email]
    });

    if (res.rows.length === 0) return null;
    const row = res.rows[0];
    return {
      id: String(row.id),
      name: String(row.name),
      email: String(row.email),
      password_hash: String(row.password_hash),
      created_at: String(row.created_at),
      updated_at: String(row.updated_at)
    };
  }

  async getById(id: string): Promise<User | null> {
    const res = await this.client.execute({
      sql: `SELECT id, name, email, password_hash, created_at, updated_at FROM users WHERE id = ?`,
      args: [id]
    });

    if (res.rows.length === 0) return null;
    const row = res.rows[0];
    return {
      id: String(row.id),
      name: String(row.name),
      email: String(row.email),
      password_hash: String(row.password_hash),
      created_at: String(row.created_at),
      updated_at: String(row.updated_at)
    };
  }
}
