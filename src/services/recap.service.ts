import {
  SessionRepository,
  StudentRepository
} from '../repositories/interfaces.js';
import {
  MonthlyRecapResponse,
  MonthlyTrendItem,
  StudentRecap
} from '../types/index.js';

export class RecapService {
  constructor(
    private sessionRepo: SessionRepository,
    private studentRepo: StudentRepository
  ) {}

  async getMonthlyRecap(
    userId: string,
    year: number,
    month: number
  ): Promise<MonthlyRecapResponse> {
    const start = new Date(Date.UTC(year, month - 1, 1));
    const end = new Date(Date.UTC(year, month, 0)); // last day of month

    const startDateStr = start.toISOString().slice(0, 10);
    const endDateStr = end.toISOString().slice(0, 10);

    const [sessions, students] = await Promise.all([
      this.sessionRepo.getAll(userId, startDateStr, endDateStr),
      this.studentRepo.getAll(userId)
    ]);

    const recapMap = new Map<string, StudentRecap>();
    for (const st of students) {
      recapMap.set(st.id, {
        student_id: st.id,
        student_name: st.full_name,
        fee_model: st.fee_model,
        fee_amount: Number(st.fee_amount || 0),
        completed_count: 0,
        cancelled_count: 0,
        rescheduled_count: 0,
        total_earnings: 0.0
      });
    }

    let completed = 0;
    let cancelled = 0;
    let rescheduled = 0;

    for (const se of sessions) {
      let r = recapMap.get(se.student_id);
      if (!r) {
        r = {
          student_id: se.student_id,
          student_name: se.student_name,
          fee_model: 'per_session',
          fee_amount: 0,
          completed_count: 0,
          cancelled_count: 0,
          rescheduled_count: 0,
          total_earnings: 0.0
        };
        recapMap.set(se.student_id, r);
      }

      switch (se.status) {
        case 'completed':
          r.completed_count++;
          completed++;
          r.total_earnings += Number(se.fee_calculated || 0);
          break;
        case 'cancelled':
          r.cancelled_count++;
          cancelled++;
          break;
        case 'rescheduled':
          r.rescheduled_count++;
          rescheduled++;
          r.total_earnings += Number(se.fee_calculated || 0);
          break;
      }
    }

    const studentRecaps: StudentRecap[] = [];
    let totalEarnings = 0.0;

    for (const r of recapMap.values()) {
      if (r.fee_model === 'monthly') {
        const totalStudentSessions =
          r.completed_count + r.cancelled_count + r.rescheduled_count;
        if (totalStudentSessions > 0) {
          r.total_earnings = Number(r.fee_amount || 0);
        } else {
          r.total_earnings = 0.0;
        }
      }
      totalEarnings += r.total_earnings;
      studentRecaps.push(r);
    }

    return {
      year,
      month,
      total_sessions: sessions.length,
      completed_sessions: completed,
      cancelled_sessions: cancelled,
      rescheduled_sessions: rescheduled,
      total_earnings: totalEarnings,
      students: studentRecaps
    };
  }

  async getMonthlyTrend(userId: string, limit = 6): Promise<MonthlyTrendItem[]> {
    if (limit <= 0) limit = 6;

    const now = new Date();
    const trend: MonthlyTrendItem[] = [];

    const monthLabels = [
      '',
      'Jan',
      'Feb',
      'Mar',
      'Apr',
      'Mei',
      'Jun',
      'Jul',
      'Agt',
      'Sep',
      'Okt',
      'Nov',
      'Des'
    ];

    for (let i = limit - 1; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const year = d.getFullYear();
      const month = d.getMonth() + 1;

      const recap = await this.getMonthlyRecap(userId, year, month);
      const label = `${monthLabels[month]} ${year}`;

      trend.push({
        label,
        earnings: recap.total_earnings
      });
    }

    return trend;
  }
}
