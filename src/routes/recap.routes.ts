import { Router } from 'express';
import { RecapController } from '../controllers/recap.controller.js';

export function createRecapRouter(recapController: RecapController): Router {
  const router = Router();
  router.get('/monthly', recapController.getMonthly);
  router.get('/trend', recapController.getTrend);
  return router;
}
