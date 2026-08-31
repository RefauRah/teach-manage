import { describe, it, expect, beforeEach } from 'vitest';
import { createClient, Client } from '@libsql/client';
import fs from 'fs';
import path from 'path';

import { TursoUserRepository } from '../src/repositories/turso/turso.user.repo.js';
import { TursoSubjectRepository } from '../src/repositories/turso/turso.subject.repo.js';
import { TursoStudentRepository } from '../src/repositories/turso/turso.student.repo.js';
import { TursoScheduleRepository } from '../src/repositories/turso/turso.schedule.repo.js';
import { TursoSessionRepository } from '../src/repositories/turso/turso.session.repo.js';
import { TursoReportRepository } from '../src/repositories/turso/turso.report.repo.js';

describe('Turso SQLite Repositories', () => {
  let client: Client;
  let userRepo: TursoUserRepository;
  let subjectRepo: TursoSubjectRepository;
  let studentRepo: TursoStudentRepository;
  let scheduleRepo: TursoScheduleRepository;
  let sessionRepo: TursoSessionRepository;
  let reportRepo: TursoReportRepository;

  beforeEach(async () => {
    client = createClient({ url: 'file::memory:?cache=shared' });
    await client.execute('PRAGMA foreign_keys = ON;');

    const migrationSql = fs.readFileSync(
      path.resolve(process.cwd(), 'src/database/migrations/001_init_turso.sql'),
      'utf-8'
    );

    const statements = migrationSql
      .split(';')
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

    for (const stmt of statements) {
      await client.execute(stmt);
    }

    userRepo = new TursoUserRepository(client);
    subjectRepo = new TursoSubjectRepository(client);
    studentRepo = new TursoStudentRepository(client);
    scheduleRepo = new TursoScheduleRepository(client);
    sessionRepo = new TursoSessionRepository(client);
    reportRepo = new TursoReportRepository(client);
  });

  it('CRUD: User Registration and Retrieval', async () => {
    const user = await userRepo.create({
      name: 'Guru Test',
      email: 'guru@test.com',
      password_hash: 'hashed_pw'
    });

    expect(user.id).toBeDefined();
    expect(user.name).toBe('Guru Test');

    const byEmail = await userRepo.getByEmail('guru@test.com');
    expect(byEmail).not.toBeNull();
    expect(byEmail?.id).toBe(user.id);

    const byId = await userRepo.getById(user.id);
    expect(byId).not.toBeNull();
    expect(byId?.email).toBe('guru@test.com');
  });

  it('CRUD: Subject, Student with Parent & Subjects', async () => {
    const user = await userRepo.create({
      name: 'Guru Subject',
      email: 'subject@guru.com',
      password_hash: 'pw'
    });

    const math = await subjectRepo.create({ user_id: user.id, name: 'Matematika' });
    const physics = await subjectRepo.create({ user_id: user.id, name: 'Fisika' });

    expect(math.name).toBe('Matematika');

    const allSubjects = await subjectRepo.getAll(user.id);
    expect(allSubjects.length).toBe(2);

    // Create Student
    const student = await studentRepo.create(
      {
        user_id: user.id,
        full_name: 'Andi Santoso',
        birth_date: '2010-05-15',
        gender: 'L',
        address: 'Jl. Melati No. 10',
        school: 'SMP 1',
        grade: '8',
        phone: '0812345678',
        notes: 'Target nilai 90',
        fee_model: 'per_session',
        fee_amount: 150000
      },
      {
        father_name: 'Budi',
        mother_name: 'Siti',
        phones: ['0811111111', '0822222222'],
        email: 'budi@mail.com',
        address: 'Jl. Melati No. 10',
        occupation: 'Wiraswasta'
      },
      [math.id, physics.id]
    );

    expect(student.full_name).toBe('Andi Santoso');
    expect(student.parent?.father_name).toBe('Budi');
    expect(student.parent?.phones).toEqual(['0811111111', '0822222222']);
    expect(student.subjects.length).toBe(2);

    // Get Student by ID
    const fetched = await studentRepo.getById(student.id, user.id);
    expect(fetched).not.toBeNull();
    expect(fetched?.full_name).toBe('Andi Santoso');
    expect(fetched?.parent?.mother_name).toBe('Siti');
  });

  it('CRUD: Schedule, Session, and Report', async () => {
    const user = await userRepo.create({
      name: 'Guru Sesi',
      email: 'sesi@guru.com',
      password_hash: 'pw'
    });

    const sub = await subjectRepo.create({ user_id: user.id, name: 'Kimia' });
    const student = await studentRepo.create(
      {
        user_id: user.id,
        full_name: 'Citra Kirana',
        birth_date: null,
        gender: 'P',
        address: 'Jl. Anggrek',
        school: 'SMA 2',
        grade: '10',
        phone: '',
        notes: '',
        fee_model: 'per_session',
        fee_amount: 200000
      },
      null,
      [sub.id]
    );

    // Schedule
    const schedule = await scheduleRepo.create({
      student_id: student.id,
      subject_id: sub.id,
      day_of_week: 1, // Senin
      start_time: '14:00:00',
      end_time: '15:30:00',
      is_active: true
    });

    expect(schedule.id).toBeDefined();

    // Session
    const session = await sessionRepo.create({
      student_id: student.id,
      subject_id: sub.id,
      schedule_id: schedule.id,
      session_date: '2026-08-31',
      start_time: '14:00:00',
      end_time: '15:30:00',
      status: 'completed',
      fee_calculated: 200000
    });

    expect(session.status).toBe('completed');

    const allSessions = await sessionRepo.getAll(user.id);
    expect(allSessions.length).toBe(1);
    expect(allSessions[0].has_report).toBe(false);

    // Report
    const report = await reportRepo.create({
      session_id: session.id,
      material_taught: 'Struktur Atom dan Ikatan Kimia',
      comprehension_score: 5,
      comprehension_notes: 'Sangat paham dan aktif',
      homework: 'Latihan Hal 45 No 1-10',
      behavior_notes: 'Sangat fokus',
      recommendations: 'Lanjut ke bab berikutnya',
      teacher_signature: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
      parent_signature: null
    });

    expect(report.id).toBeDefined();
    expect(report.comprehension_score).toBe(5);

    const reportBySession = await reportRepo.getBySessionId(session.id, user.id);
    expect(reportBySession).not.toBeNull();
    expect(reportBySession?.material_taught).toBe('Struktur Atom dan Ikatan Kimia');

    const updatedSessions = await sessionRepo.getAll(user.id);
    expect(updatedSessions[0].has_report).toBe(true);
  });
});
