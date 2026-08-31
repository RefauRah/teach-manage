import { Router } from 'express';
import { SubjectController } from '../controllers/subject.controller.js';

export function createSubjectRouter(subjectController: SubjectController): Router {
  const router = Router();
  router.get('/', subjectController.getAll);
  router.post('/', subjectController.create);
  router.put('/:id', subjectController.update);
  router.delete('/:id', subjectController.delete);
  return router;
}
