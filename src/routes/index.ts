import { Router } from 'express';
import { jwtMiddleware } from '../middleware/auth.js';
import { AuthController } from '../controllers/auth.controller.js';
import { StudentController } from '../controllers/student.controller.js';
import { SubjectController } from '../controllers/subject.controller.js';
import { ScheduleController } from '../controllers/schedule.controller.js';
import { SessionController } from '../controllers/session.controller.js';
import { ReportController } from '../controllers/report.controller.js';
import { RecapController } from '../controllers/recap.controller.js';

import { createAuthRouter } from './auth.routes.js';
import { createStudentRouter } from './student.routes.js';
import { createSubjectRouter } from './subject.routes.js';
import { createScheduleRouter } from './schedule.routes.js';
import { createSessionRouter } from './session.routes.js';
import { createReportRouter } from './report.routes.js';
import { createRecapRouter } from './recap.routes.js';

export interface RouteControllers {
  auth: AuthController;
  student: StudentController;
  subject: SubjectController;
  schedule: ScheduleController;
  session: SessionController;
  report: ReportController;
  recap: RecapController;
}

export function setupRoutes(controllers: RouteControllers): Router {
  const router = Router();

  // Health check route
  router.get('/health', (_req, res) => {
    res.send('OK');
  });

  // API Routes
  const api = Router();

  // Public Auth
  api.use('/auth', createAuthRouter(controllers.auth));

  // Protected Routes
  const protectedRouter = Router();
  protectedRouter.use(jwtMiddleware as any);

  protectedRouter.use('/students', createStudentRouter(controllers.student));
  protectedRouter.use('/subjects', createSubjectRouter(controllers.subject));
  protectedRouter.use('/schedules', createScheduleRouter(controllers.schedule));
  protectedRouter.use('/sessions', createSessionRouter(controllers.session));
  protectedRouter.use('/reports', createReportRouter(controllers.report));
  protectedRouter.use('/recap', createRecapRouter(controllers.recap));

  api.use(protectedRouter);
  router.use('/api', api);

  return router;
}
