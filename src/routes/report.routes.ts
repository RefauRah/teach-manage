import { Router } from 'express';
import { ReportController } from '../controllers/report.controller.js';

export function createReportRouter(reportController: ReportController): Router {
  const router = Router();
  router.post('/', reportController.create);
  router.put('/:id', reportController.update);
  router.get('/:id', reportController.getById);
  router.get('/session/:session_id', reportController.getBySessionId);
  router.get('/:id/pdf', reportController.downloadPDF);
  return router;
}
