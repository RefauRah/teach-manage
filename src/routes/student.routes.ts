import { Router } from 'express';
import { StudentController } from '../controllers/student.controller.js';

export function createStudentRouter(studentController: StudentController): Router {
  const router = Router();
  router.get('/', studentController.getAll);
  router.post('/', studentController.create);
  router.get('/:id', studentController.getById);
  router.put('/:id', studentController.update);
  router.delete('/:id', studentController.delete);
  return router;
}
