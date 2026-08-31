import { Request, Response } from 'express';
import { AuthService } from '../services/auth.service.js';

export class AuthController {
  constructor(private authService: AuthService) {}

  register = async (req: Request, res: Response): Promise<void> => {
    try {
      const { name, email, password } = req.body;
      if (!name || !email || !password) {
        res.status(400).json({ error: 'name, email, and password are required' });
        return;
      }

      const resp = await this.authService.register({ name, email, password });
      res.status(201).json(resp);
    } catch (err: any) {
      res.status(400).json({ error: err.message || 'Registration failed' });
    }
  };

  login = async (req: Request, res: Response): Promise<void> => {
    try {
      const { email, password } = req.body;
      if (!email || !password) {
        res.status(400).json({ error: 'email and password are required' });
        return;
      }

      const resp = await this.authService.login({ email, password });
      res.status(200).json(resp);
    } catch (err: any) {
      res.status(401).json({ error: err.message || 'Login failed' });
    }
  };

  refresh = async (req: Request, res: Response): Promise<void> => {
    try {
      const { refresh_token } = req.body;
      if (!refresh_token) {
        res.status(400).json({ error: 'refresh_token is required' });
        return;
      }

      const resp = await this.authService.refreshToken(refresh_token);
      res.status(200).json(resp);
    } catch (err: any) {
      res.status(401).json({ error: err.message || 'Token refresh failed' });
    }
  };
}
