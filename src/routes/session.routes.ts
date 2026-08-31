import { Router } from 'express';
import { SessionController } from '../controllers/session.controller.js';

export function createSessionRouter(sessionController: SessionController): Router {
  const router = Router();
  router.get('/', sessionController.getAll);
  router.post('/', sessionController.create);
  router.post('/generate', sessionController.generate);
  router.put('/:id', sessionController.update);
  router.delete('/:id', sessionController.delete);
  return router;
}
