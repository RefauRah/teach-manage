import { createClient, Client } from '@libsql/client';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { config } from '../config/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export let tursoClient: Client;

const DEFAULT_SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS subjects (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    UNIQUE(user_id, name)
);

CREATE TABLE IF NOT EXISTS students (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    full_name TEXT NOT NULL,
    birth_date TEXT,
    gender TEXT,
    address TEXT,
    school TEXT,
    grade TEXT,
    phone TEXT,
    notes TEXT,
    fee_model TEXT NOT NULL CHECK (fee_model IN ('per_session', 'monthly', 'per_hour')),
    fee_amount REAL NOT NULL DEFAULT 0.00,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS parents (
    id TEXT PRIMARY KEY,
    student_id TEXT NOT NULL REFERENCES students(id) ON DELETE CASCADE UNIQUE,
    father_name TEXT,
    mother_name TEXT,
    phones TEXT DEFAULT '[]',
    email TEXT,
    address TEXT,
    occupation TEXT
);

CREATE TABLE IF NOT EXISTS student_subjects (
    student_id TEXT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    subject_id TEXT NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
    PRIMARY KEY (student_id, subject_id)
);

CREATE TABLE IF NOT EXISTS schedules (
    id TEXT PRIMARY KEY,
    student_id TEXT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    subject_id TEXT NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
    day_of_week INTEGER NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
    start_time TEXT NOT NULL,
    end_time TEXT NOT NULL,
    is_active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS sessions (
    id TEXT PRIMARY KEY,
    student_id TEXT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    subject_id TEXT NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
    schedule_id TEXT REFERENCES schedules(id) ON DELETE SET NULL,
    session_date TEXT NOT NULL,
    start_time TEXT NOT NULL,
    end_time TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('completed', 'cancelled', 'rescheduled')),
    fee_calculated REAL NOT NULL DEFAULT 0.00,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS reports (
    id TEXT PRIMARY KEY,
    session_id TEXT NOT NULL REFERENCES sessions(id) ON DELETE CASCADE UNIQUE,
    material_taught TEXT NOT NULL,
    comprehension_score INTEGER CHECK (comprehension_score BETWEEN 1 AND 5),
    comprehension_notes TEXT,
    homework TEXT,
    behavior_notes TEXT,
    recommendations TEXT,
    teacher_signature TEXT NOT NULL,
    parent_signature TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);
`;

export async function connectTurso(): Promise<Client> {
  if (tursoClient) return tursoClient;

  tursoClient = createClient({
    url: config.tursoDatabaseUrl,
    authToken: config.tursoAuthToken || undefined
  });

  try {
    // Enable foreign keys in SQLite
    await tursoClient.execute('PRAGMA foreign_keys = ON;');
    console.log(`Turso / SQLite connection established (${config.tursoDatabaseUrl})`);

    // Run schema migrations
    await runTursoMigrations();
  } catch (err) {
    console.error('Error connecting to Turso / SQLite database:', err);
    throw err;
  }

  return tursoClient;
}

export async function runTursoMigrations(): Promise<void> {
  try {
    let sqlContent = DEFAULT_SCHEMA_SQL;

    let migrationPath = path.resolve(__dirname, 'migrations/001_init_turso.sql');
    if (!fs.existsSync(migrationPath)) {
      migrationPath = path.resolve(process.cwd(), 'src/database/migrations/001_init_turso.sql');
    }

    if (fs.existsSync(migrationPath)) {
      sqlContent = fs.readFileSync(migrationPath, 'utf-8');
    }

    // Split SQL into individual statements
    const statements = sqlContent
      .split(';')
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

    for (const stmt of statements) {
      await tursoClient.execute(stmt);
    }

    console.log('Turso / SQLite migrations executed successfully');
  } catch (err) {
    console.error('Error executing Turso migrations:', err);
    throw err;
  }
}
