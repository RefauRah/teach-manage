import express, { Express } from 'express';
import cors from 'cors';
import morgan from 'morgan';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

import { connectTurso, tursoClient } from './database/turso.js';

// Repositories
import {
  UserRepository,
  SubjectRepository,
  StudentRepository,
  ScheduleRepository,
  SessionRepository,
  ReportRepository
} from './repositories/interfaces.js';

import { TursoUserRepository } from './repositories/turso/turso.user.repo.js';
import { TursoSubjectRepository } from './repositories/turso/turso.subject.repo.js';
import { TursoStudentRepository } from './repositories/turso/turso.student.repo.js';
import { TursoScheduleRepository } from './repositories/turso/turso.schedule.repo.js';
import { TursoSessionRepository } from './repositories/turso/turso.session.repo.js';
import { TursoReportRepository } from './repositories/turso/turso.report.repo.js';

// Services
import { AuthService } from './services/auth.service.js';
import { SubjectService } from './services/subject.service.js';
import { StudentService } from './services/student.service.js';
import { ScheduleService } from './services/schedule.service.js';
import { SessionService } from './services/session.service.js';
import { ReportService } from './services/report.service.js';
import { RecapService } from './services/recap.service.js';

// Controllers & Routes
import { AuthController } from './controllers/auth.controller.js';
import { SubjectController } from './controllers/subject.controller.js';
import { StudentController } from './controllers/student.controller.js';
import { ScheduleController } from './controllers/schedule.controller.js';
import { SessionController } from './controllers/session.controller.js';
import { ReportController } from './controllers/report.controller.js';
import { RecapController } from './controllers/recap.controller.js';
import { setupRoutes } from './routes/index.js';
import { errorHandler } from './middleware/error.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export async function createApp(): Promise<Express> {
  // Connect to Turso / SQLite and execute migrations
  await connectTurso();

  const userRepo: UserRepository = new TursoUserRepository(tursoClient);
  const subjectRepo: SubjectRepository = new TursoSubjectRepository(tursoClient);
  const studentRepo: StudentRepository = new TursoStudentRepository(tursoClient);
  const scheduleRepo: ScheduleRepository = new TursoScheduleRepository(tursoClient);
  const sessionRepo: SessionRepository = new TursoSessionRepository(tursoClient);
  const reportRepo: ReportRepository = new TursoReportRepository(tursoClient);

  // Initialize Services
  const authService = new AuthService(userRepo);
  const subjectService = new SubjectService(subjectRepo);
  const studentService = new StudentService(studentRepo);
  const scheduleService = new ScheduleService(scheduleRepo, studentRepo, subjectRepo);
  const sessionService = new SessionService(sessionRepo, studentRepo, scheduleRepo);
  const reportService = new ReportService(reportRepo, sessionRepo, studentRepo);
  const recapService = new RecapService(sessionRepo, studentRepo);

  // Initialize Controllers
  const authController = new AuthController(authService);
  const subjectController = new SubjectController(subjectService);
  const studentController = new StudentController(studentService);
  const scheduleController = new ScheduleController(scheduleService);
  const sessionController = new SessionController(sessionService);
  const reportController = new ReportController(reportService);
  const recapController = new RecapController(recapService);

  const app = express();

  // Middlewares
  app.use(morgan('dev'));
  app.use(
    cors({
      origin: '*',
      allowedHeaders: ['Origin', 'Content-Type', 'Accept', 'Authorization'],
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']
    })
  );
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // Routes
  const routes = setupRoutes({
    auth: authController,
    subject: subjectController,
    student: studentController,
    schedule: scheduleController,
    session: sessionController,
    report: reportController,
    recap: recapController
  });
  app.use(routes);

  // Static Frontend Serving (Vite build or Web directory)
  const distPublicPath = path.resolve(process.cwd(), 'dist/public');
  const webPath = path.resolve(process.cwd(), 'web');

  if (fs.existsSync(distPublicPath)) {
    app.use(express.static(distPublicPath));
    app.get('*', (req, res, next) => {
      if (req.path.startsWith('/api') || req.path.startsWith('/health')) {
        return next();
      }
      res.sendFile(path.join(distPublicPath, 'index.html'));
    });
  } else if (fs.existsSync(webPath)) {
    app.use(express.static(webPath));
    app.get('*', (req, res, next) => {
      if (req.path.startsWith('/api') || req.path.startsWith('/health')) {
        return next();
      }
      res.sendFile(path.join(webPath, 'index.html'));
    });
  }

  // Global Error Handler
  app.use(errorHandler);

  return app;
}
