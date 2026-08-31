import { describe, it, expect } from 'vitest';
import { SessionService } from '../src/services/session.service.js';

describe('Service Calculation Logic', () => {
  it('calculateFee: per_session, monthly, per_hour', () => {
    const sessionService = new SessionService({} as any, {} as any, {} as any);

    // per_session
    expect(sessionService.calculateFee('per_session', 150000, '14:00', '16:00')).toBe(150000);

    // monthly
    expect(sessionService.calculateFee('monthly', 800000, '14:00', '16:00')).toBe(0);

    // per_hour (2 hours)
    expect(sessionService.calculateFee('per_hour', 50000, '14:00:00', '16:00:00')).toBe(100000);

    // per_hour (1.5 hours)
    expect(sessionService.calculateFee('per_hour', 60000, '14:00', '15:30')).toBe(90000);
  });
});
