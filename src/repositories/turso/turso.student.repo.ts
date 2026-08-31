import { Client } from '@libsql/client';
import { v4 as uuidv4 } from 'uuid';
import { StudentRepository } from '../interfaces.js';
import { Student, StudentResponse, Parent, Subject } from '../../types/index.js';

export class TursoStudentRepository implements StudentRepository {
  constructor(private client: Client) {}

  async create(
    student: Omit<Student, 'id' | 'created_at' | 'updated_at'>,
    parent?: Parent | null,
    subjectIds?: string[]
  ): Promise<StudentResponse> {
    const studentId = uuidv4();
    const now = new Date().toISOString();

    const batchStatements: Array<{ sql: string; args: any[] }> = [];

    // 1. Insert student
    batchStatements.push({
      sql: `
        INSERT INTO students (id, user_id, full_name, birth_date, gender, address, school, grade, phone, notes, fee_model, fee_amount, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      args: [
        studentId,
        student.user_id,
        student.full_name,
        student.birth_date || null,
        student.gender || '',
        student.address || '',
        student.school || '',
        student.grade || '',
        student.phone || '',
        student.notes || '',
        student.fee_model,
        student.fee_amount,
        now,
        now
      ]
    });

    // 2. Insert parent
    let createdParent: Parent | null = null;
    if (parent) {
      const parentId = uuidv4();
      createdParent = {
        id: parentId,
        student_id: studentId,
        father_name: parent.father_name || '',
        mother_name: parent.mother_name || '',
        phones: parent.phones || [],
        email: parent.email || '',
        address: parent.address || '',
        occupation: parent.occupation || ''
      };

      batchStatements.push({
        sql: `
          INSERT INTO parents (id, student_id, father_name, mother_name, phones, email, address, occupation)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `,
        args: [
          parentId,
          studentId,
          createdParent.father_name,
          createdParent.mother_name,
          JSON.stringify(createdParent.phones),
          createdParent.email,
          createdParent.address,
          createdParent.occupation
        ]
      });
    }

    // 3. Insert student_subjects
    if (subjectIds && subjectIds.length > 0) {
      for (const subId of subjectIds) {
        batchStatements.push({
          sql: `INSERT OR IGNORE INTO student_subjects (student_id, subject_id) VALUES (?, ?)`,
          args: [studentId, subId]
        });
      }
    }

    await this.client.batch(batchStatements, 'write');

    // Fetch associated subjects
    let subjects: Subject[] = [];
    if (subjectIds && subjectIds.length > 0) {
      const placeholders = subjectIds.map(() => '?').join(',');
      const res = await this.client.execute({
        sql: `SELECT id, user_id, name FROM subjects WHERE id IN (${placeholders})`,
        args: subjectIds
      });
      subjects = res.rows.map((r) => ({
        id: String(r.id),
        user_id: String(r.user_id),
        name: String(r.name)
      }));
    }

    return {
      id: studentId,
      user_id: student.user_id,
      full_name: student.full_name,
      birth_date: student.birth_date || null,
      gender: student.gender,
      address: student.address,
      school: student.school,
      grade: student.grade,
      phone: student.phone,
      notes: student.notes,
      fee_model: student.fee_model,
      fee_amount: student.fee_amount,
      created_at: now,
      updated_at: now,
      parent: createdParent,
      subjects
    };
  }

  async update(
    student: Omit<Student, 'created_at' | 'updated_at'>,
    parent?: Parent | null,
    subjectIds?: string[]
  ): Promise<void> {
    const now = new Date().toISOString();
    const batchStatements: Array<{ sql: string; args: any[] }> = [];

    // 1. Update student
    batchStatements.push({
      sql: `
        UPDATE students
        SET full_name = ?, birth_date = ?, gender = ?, address = ?, school = ?, grade = ?, phone = ?, notes = ?, fee_model = ?, fee_amount = ?, updated_at = ?
        WHERE id = ? AND user_id = ?
      `,
      args: [
        student.full_name,
        student.birth_date || null,
        student.gender || '',
        student.address || '',
        student.school || '',
        student.grade || '',
        student.phone || '',
        student.notes || '',
        student.fee_model,
        student.fee_amount,
        now,
        student.id,
        student.user_id
      ]
    });

    // 2. Upsert parent
    if (parent) {
      const parentId = uuidv4();
      batchStatements.push({
        sql: `
          INSERT INTO parents (id, student_id, father_name, mother_name, phones, email, address, occupation)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT(student_id) DO UPDATE SET
            father_name = excluded.father_name,
            mother_name = excluded.mother_name,
            phones = excluded.phones,
            email = excluded.email,
            address = excluded.address,
            occupation = excluded.occupation
        `,
        args: [
          parentId,
          student.id,
          parent.father_name || '',
          parent.mother_name || '',
          JSON.stringify(parent.phones || []),
          parent.email || '',
          parent.address || '',
          parent.occupation || ''
        ]
      });
    }

    // 3. Update subjects (Delete & Re-insert)
    if (subjectIds !== undefined) {
      batchStatements.push({
        sql: `DELETE FROM student_subjects WHERE student_id = ?`,
        args: [student.id]
      });

      if (subjectIds.length > 0) {
        for (const subId of subjectIds) {
          batchStatements.push({
            sql: `INSERT OR IGNORE INTO student_subjects (student_id, subject_id) VALUES (?, ?)`,
            args: [student.id, subId]
          });
        }
      }
    }

    await this.client.batch(batchStatements, 'write');
  }

  async delete(id: string, userId: string): Promise<void> {
    await this.client.execute({
      sql: `DELETE FROM students WHERE id = ? AND user_id = ?`,
      args: [id, userId]
    });
  }

  async getAll(userId: string): Promise<StudentResponse[]> {
    const studentsRes = await this.client.execute({
      sql: `
        SELECT id, user_id, full_name, birth_date, gender, address, school, grade, phone, notes, fee_model, fee_amount, created_at, updated_at
        FROM students
        WHERE user_id = ?
        ORDER BY full_name ASC
      `,
      args: [userId]
    });

    if (studentsRes.rows.length === 0) return [];

    const studentIds = studentsRes.rows.map((r) => String(r.id));
    const placeholders = studentIds.map(() => '?').join(',');

    // Fetch parents
    const parentsRes = await this.client.execute({
      sql: `SELECT id, student_id, father_name, mother_name, phones, email, address, occupation FROM parents WHERE student_id IN (${placeholders})`,
      args: studentIds
    });

    const parentMap = new Map<string, Parent>();
    for (const p of parentsRes.rows) {
      let parsedPhones: string[] = [];
      try {
        parsedPhones = JSON.parse(String(p.phones || '[]'));
      } catch (e) {
        parsedPhones = [];
      }

      parentMap.set(String(p.student_id), {
        id: String(p.id),
        student_id: String(p.student_id),
        father_name: String(p.father_name || ''),
        mother_name: String(p.mother_name || ''),
        phones: parsedPhones,
        email: String(p.email || ''),
        address: String(p.address || ''),
        occupation: String(p.occupation || '')
      });
    }

    // Fetch subjects
    const subjectsRes = await this.client.execute({
      sql: `
        SELECT ss.student_id, s.id, s.name, s.user_id
        FROM student_subjects ss
        JOIN subjects s ON ss.subject_id = s.id
        WHERE ss.student_id IN (${placeholders})
      `,
      args: studentIds
    });

    const subjectsMap = new Map<string, Subject[]>();
    for (const row of subjectsRes.rows) {
      const stId = String(row.student_id);
      if (!subjectsMap.has(stId)) {
        subjectsMap.set(stId, []);
      }
      subjectsMap.get(stId)!.push({
        id: String(row.id),
        user_id: String(row.user_id),
        name: String(row.name)
      });
    }

    return studentsRes.rows.map((r) => {
      const id = String(r.id);
      return {
        id,
        user_id: String(r.user_id),
        full_name: String(r.full_name),
        birth_date: r.birth_date ? String(r.birth_date) : null,
        gender: String(r.gender || ''),
        address: String(r.address || ''),
        school: String(r.school || ''),
        grade: String(r.grade || ''),
        phone: String(r.phone || ''),
        notes: String(r.notes || ''),
        fee_model: String(r.fee_model) as any,
        fee_amount: Number(r.fee_amount || 0),
        created_at: String(r.created_at),
        updated_at: String(r.updated_at),
        parent: parentMap.get(id) || null,
        subjects: subjectsMap.get(id) || []
      };
    });
  }

  async getById(id: string, userId: string): Promise<StudentResponse | null> {
    const studentRes = await this.client.execute({
      sql: `
        SELECT id, user_id, full_name, birth_date, gender, address, school, grade, phone, notes, fee_model, fee_amount, created_at, updated_at
        FROM students
        WHERE id = ? AND user_id = ?
      `,
      args: [id, userId]
    });

    if (studentRes.rows.length === 0) return null;
    const r = studentRes.rows[0];

    // Fetch parent
    const parentRes = await this.client.execute({
      sql: `SELECT id, student_id, father_name, mother_name, phones, email, address, occupation FROM parents WHERE student_id = ?`,
      args: [id]
    });

    let parent: Parent | null = null;
    if (parentRes.rows.length > 0) {
      const p = parentRes.rows[0];
      let parsedPhones: string[] = [];
      try {
        parsedPhones = JSON.parse(String(p.phones || '[]'));
      } catch (e) {
        parsedPhones = [];
      }
      parent = {
        id: String(p.id),
        student_id: String(p.student_id),
        father_name: String(p.father_name || ''),
        mother_name: String(p.mother_name || ''),
        phones: parsedPhones,
        email: String(p.email || ''),
        address: String(p.address || ''),
        occupation: String(p.occupation || '')
      };
    }

    // Fetch subjects
    const subjectsRes = await this.client.execute({
      sql: `
        SELECT s.id, s.user_id, s.name
        FROM student_subjects ss
        JOIN subjects s ON ss.subject_id = s.id
        WHERE ss.student_id = ?
      `,
      args: [id]
    });

    const subjects = subjectsRes.rows.map((row) => ({
      id: String(row.id),
      user_id: String(row.user_id),
      name: String(row.name)
    }));

    return {
      id: String(r.id),
      user_id: String(r.user_id),
      full_name: String(r.full_name),
      birth_date: r.birth_date ? String(r.birth_date) : null,
      gender: String(r.gender || ''),
      address: String(r.address || ''),
      school: String(r.school || ''),
      grade: String(r.grade || ''),
      phone: String(r.phone || ''),
      notes: String(r.notes || ''),
      fee_model: String(r.fee_model) as any,
      fee_amount: Number(r.fee_amount || 0),
      created_at: String(r.created_at),
      updated_at: String(r.updated_at),
      parent,
      subjects
    };
  }
}
