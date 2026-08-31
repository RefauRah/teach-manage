import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth.js';
import { ScheduleService } from '../services/schedule.service.js';

export class ScheduleController {
  constructor(private scheduleService: ScheduleService) {}

  create = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        res.status(401).json({ error: 'unauthorized' });
        return;
      }

      const schedule = await this.scheduleService.createSchedule(userId, req.body);
      res.status(201).json(schedule);
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

      const schedules = await this.scheduleService.getSchedules(userId);
      res.status(200).json(schedules);
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
      await this.scheduleService.updateSchedule(userId, id, { id, ...req.body });
      res.status(200).json({ message: 'schedule updated successfully' });
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
      await this.scheduleService.deleteSchedule(userId, id);
      res.status(200).json({ message: 'schedule deleted successfully' });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  };
}
