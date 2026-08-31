import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth.js';
import { ReportService } from '../services/report.service.js';

export class ReportController {
  constructor(private reportService: ReportService) {}

  create = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        res.status(401).json({ error: 'unauthorized' });
        return;
      }

      const report = await this.reportService.createReport(userId, req.body);
      res.status(201).json(report);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
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
      await this.reportService.updateReport(userId, id, req.body);
      res.status(200).json({ message: 'report updated successfully' });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  };

  getBySessionId = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        res.status(401).json({ error: 'unauthorized' });
        return;
      }

      const sessionId = req.params.session_id as string;
      const report = await this.reportService.getReportBySessionId(userId, sessionId);
      if (!report) {
        res.status(404).json({ error: 'report not found for this session' });
        return;
      }

      res.status(200).json(report);
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
      const report = await this.reportService.getReportById(userId, id);
      if (!report) {
        res.status(404).json({ error: 'report not found' });
        return;
      }

      res.status(200).json(report);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  };

  downloadPDF = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        res.status(401).json({ error: 'unauthorized' });
        return;
      }

      const id = req.params.id as string;
      const pdfBuffer = await this.reportService.generateReportPDF(userId, id);

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="report-${id}.pdf"`);
      res.send(pdfBuffer);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  };
}
