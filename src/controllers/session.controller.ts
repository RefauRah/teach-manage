import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth.js';
import { SessionService } from '../services/session.service.js';

export class SessionController {
  constructor(private sessionService: SessionService) {}

  create = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        res.status(401).json({ error: 'unauthorized' });
        return;
      }

      const session = await this.sessionService.createSession(userId, req.body);
      res.status(201).json(session);
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

      const { start_date, end_date, student_id } = req.query;
      const sessions = await this.sessionService.getSessions(
        userId,
        start_date as string | undefined,
        end_date as string | undefined,
        student_id as string | undefined
      );
      res.status(200).json(sessions);
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
      await this.sessionService.updateSession(userId, id, { id, ...req.body });
      res.status(200).json({ message: 'session updated successfully' });
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
      await this.sessionService.deleteSession(userId, id);
      res.status(200).json({ message: 'session deleted successfully' });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  };

  generate = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        res.status(401).json({ error: 'unauthorized' });
        return;
      }

      const { start_date, end_date } = req.body;
      if (!start_date || !end_date) {
        res.status(400).json({ error: 'start_date and end_date are required' });
        return;
      }

      const count = await this.sessionService.generateSessionsFromSchedule(
        userId,
        start_date,
        end_date
      );

      res.status(200).json({
        message: 'sessions generated successfully',
        generated_count: count
      });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  };
}
