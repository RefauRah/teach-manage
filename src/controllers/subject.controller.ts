import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth.js';
import { SubjectService } from '../services/subject.service.js';

export class SubjectController {
  constructor(private subjectService: SubjectService) {}

  create = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        res.status(401).json({ error: 'unauthorized' });
        return;
      }

      const { name } = req.body;
      const subject = await this.subjectService.createSubject(userId, name);
      res.status(201).json(subject);
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

      const subjects = await this.subjectService.getSubjects(userId);
      res.status(200).json(subjects);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
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
      const { name } = req.body;
      await this.subjectService.updateSubject(userId, id, name);
      res.status(200).json({ message: 'subject updated successfully' });
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
      await this.subjectService.deleteSubject(userId, id);
      res.status(200).json({ message: 'subject deleted successfully' });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  };
}
