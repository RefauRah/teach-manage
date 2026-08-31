import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth.js';
import { StudentService } from '../services/student.service.js';

export class StudentController {
  constructor(private studentService: StudentService) {}

  create = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        res.status(401).json({ error: 'unauthorized' });
        return;
      }

      const student = await this.studentService.createStudent(userId, req.body);
      res.status(201).json(student);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  };

  getAll = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        res.status(401).json({ error: 'unauthorized' });
        return;
      }

      const students = await this.studentService.getStudents(userId);
      res.status(200).json(students);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  };

  getById = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        res.status(401).json({ error: 'unauthorized' });
        return;
      }

      const id = req.params.id as string;
      const student = await this.studentService.getStudentById(userId, id);
      res.status(200).json(student);
    } catch (err: any) {
      res.status(404).json({ error: err.message });
    }
  };

  update = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        res.status(401).json({ error: 'unauthorized' });
        return;
      }

      const id = req.params.id as string;
      await this.studentService.updateStudent(userId, id, req.body);
      res.status(200).json({ message: 'student updated successfully' });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  };

  delete = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        res.status(401).json({ error: 'unauthorized' });
        return;
      }

      const id = req.params.id as string;
      await this.studentService.deleteStudent(userId, id);
      res.status(200).json({ message: 'student deleted successfully' });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  };
}
