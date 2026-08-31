import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth.js';
import { RecapService } from '../services/recap.service.js';

export class RecapController {
  constructor(private recapService: RecapService) {}

  getMonthly = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        res.status(401).json({ error: 'unauthorized' });
        return;
      }

      const now = new Date();
      const year = req.query.year ? parseInt(req.query.year as string, 10) : now.getFullYear();
      const month = req.query.month
        ? parseInt(req.query.month as string, 10)
        : now.getMonth() + 1;

      if (isNaN(year)) {
        res.status(400).json({ error: 'invalid year parameter' });
        return;
      }

      if (isNaN(month) || month < 1 || month > 12) {
        res.status(400).json({ error: 'invalid month parameter' });
        return;
      }

      const recap = await this.recapService.getMonthlyRecap(userId, year, month);
      res.status(200).json(recap);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  };

  getTrend = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        res.status(401).json({ error: 'unauthorized' });
        return;
      }

      const months = req.query.months ? parseInt(req.query.months as string, 10) : 6;
      if (isNaN(months) || months <= 0) {
        res.status(400).json({ error: 'invalid months parameter' });
        return;
      }

      const trend = await this.recapService.getMonthlyTrend(userId, months);
      res.status(200).json(trend);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  };
}
