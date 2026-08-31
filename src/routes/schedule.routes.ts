import { Router } from 'express';
import { ScheduleController } from '../controllers/schedule.controller.js';

export function createScheduleRouter(scheduleController: ScheduleController): Router {
  const router = Router();
  router.get('/', scheduleController.getAll);
  router.post('/', scheduleController.create);
  router.put('/:id', scheduleController.update);
  router.delete('/:id', scheduleController.delete);
  return router;
}
