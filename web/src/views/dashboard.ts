import { API } from '../services/api.js';
import { Session, Student } from '../types/index.js';
import { showToast } from '../utils/toast.js';
import { openReportModal } from './reports.js';

declare const Chart: any;

export async function renderDashboard(
  container: HTMLElement,
  navigate: (path: string) => void
): Promise<void> {
  const now = new Date();
  const todayStr = now.toISOString().slice(0, 10);
  const hour = now.getHours();

  let greeting = 'Selamat Pagi';
  if (hour >= 12 && hour < 15) greeting = 'Selamat Siang';
  else if (hour >= 15 && hour < 18) greeting = 'Selamat Sore';
  else if (hour >= 18) greeting = 'Selamat Malam';

  const user = API.getCurrentUser();
  const teacherName = user?.name || 'Bapak/Ibu Guru';

  const fullDateFormatted = now.toLocaleDateString('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });

  container.innerHTML = `
    <!-- Teacher Hero Banner -->
    <div class="teacher-welcome-banner">
      <div class="banner-content">
        <div class="banner-text">
          <div class="banner-date-badge">
            <i class="fa-solid fa-calendar-check"></i>
            <span>${fullDateFormatted}</span>
          </div>
          <h2>${greeting}, ${teacherName}! 👋</h2>
          <p>Kelola jadwal les privat, pantau kehadiran murid, catat hasil belajar, dan hitung honorarium Anda secara otomatis.</p>
        </div>
        <div class="banner-actions">
          <button class="btn btn-secondary" id="btn-quick-add-student">
            <i class="fa-solid fa-user-plus"></i> Tambah Murid
          </button>
          <button class="btn btn-success" id="btn-quick-add-session">
            <i class="fa-solid fa-plus"></i> Catat Sesi Hari Ini
          </button>
        </div>
      </div>
    </div>

    <!-- Quick Stats Cards -->
    <div class="stats-grid mb-4">
      <div class="stat-card">
        <div class="stat-icon" style="background: #eef2ff; color: #4f46e5;">
          <i class="fa-solid fa-user-graduate"></i>
        </div>
        <div class="stat-info">
          <span class="stat-label">Total Murid Les</span>
          <h3 class="stat-value" id="dash-total-students">-</h3>
        </div>
      </div>

      <div class="stat-card">
        <div class="stat-icon" style="background: #ecfdf5; color: #10b981;">
          <i class="fa-solid fa-circle-check"></i>
        </div>
        <div class="stat-info">
          <span class="stat-label">Sesi Selesai Bulan Ini</span>
          <h3 class="stat-value" id="dash-completed-sessions">-</h3>
        </div>
      </div>

      <div class="stat-card">
        <div class="stat-icon" style="background: #f0f9ff; color: #0284c7;">
          <i class="fa-solid fa-calendar-day"></i>
        </div>
        <div class="stat-info">
          <span class="stat-label">Jadwal Mengajar Hari Ini</span>
          <h3 class="stat-value" id="dash-today-sessions">-</h3>
        </div>
      </div>

      <div class="stat-card highlight">
        <div class="stat-icon" style="background: #eef2ff; color: #4f46e5;">
          <i class="fa-solid fa-wallet"></i>
        </div>
        <div class="stat-info">
          <span class="stat-label">Estimasi Honor Bulan Ini</span>
          <h3 class="stat-value" style="color: #4f46e5;" id="dash-total-earnings">-</h3>
        </div>
      </div>
    </div>

    <!-- Today's Schedule & Quick Actions -->
    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: 24px; margin-bottom: 24px;">
      <!-- Today's Schedule -->
      <div class="card" style="grid-column: span 1;">
        <div class="card-header">
          <h3 class="card-title">
            <i class="fa-solid fa-clock text-primary"></i> Sesi Les Hari Ini
          </h3>
          <button class="btn btn-outline btn-sm" id="btn-see-all-sessions">Lihat Semua</button>
        </div>
        <div class="card-body">
          <div id="today-schedule-container" class="today-schedule-list">
            <div class="text-center py-4 text-secondary">
              <i class="fa-solid fa-spinner fa-spin"></i> Memuat jadwal...
            </div>
          </div>
        </div>
      </div>

      <!-- Monthly Trend Chart -->
      <div class="card" style="grid-column: span 1;">
        <div class="card-header">
          <h3 class="card-title">
            <i class="fa-solid fa-chart-line text-primary"></i> Tren Honorarium 6 Bulan
          </h3>
          <button class="btn btn-outline btn-sm" id="btn-see-recap">Detail Rekap</button>
        </div>
        <div class="card-body">
          <div style="height: 220px; position: relative;">
            <canvas id="dashboard-trend-chart"></canvas>
          </div>
        </div>
      </div>
    </div>
  `;

  // Quick navigation handlers
  container.querySelector('#btn-quick-add-student')?.addEventListener('click', () => navigate('/students'));
  container.querySelector('#btn-quick-add-session')?.addEventListener('click', () => navigate('/sessions'));
  container.querySelector('#btn-see-all-sessions')?.addEventListener('click', () => navigate('/sessions'));
  container.querySelector('#btn-see-recap')?.addEventListener('click', () => navigate('/recap'));

  await loadDashboardData(container);
}

async function loadDashboardData(container: HTMLElement): Promise<void> {
  const now = new Date();
  const todayStr = now.toISOString().slice(0, 10);
  const currentMonth = now.getMonth() + 1;
  const currentYear = now.getFullYear();

  try {
    const [students, todaySessions, recap, trends] = await Promise.all([
      API.get<Student[]>('/students'),
      API.get<Session[]>(`/sessions?start_date=${todayStr}&end_date=${todayStr}`),
      API.get<any>(`/recap/monthly?year=${currentYear}&month=${currentMonth}`),
      API.get<{ label: string; earnings: number }[]>('/recap/trend?months=6')
    ]);

    // Populate Stats
    const totalStudentsEl = container.querySelector('#dash-total-students');
    if (totalStudentsEl) totalStudentsEl.textContent = String(students?.length || 0);

    const completedSessionsEl = container.querySelector('#dash-completed-sessions');
    if (completedSessionsEl) completedSessionsEl.textContent = String(recap?.completed_sessions || 0);

    const todaySessionsEl = container.querySelector('#dash-today-sessions');
    if (todaySessionsEl) todaySessionsEl.textContent = String(todaySessions?.length || 0);

    const earningsEl = container.querySelector('#dash-total-earnings');
    if (earningsEl) {
      earningsEl.textContent = `Rp ${Number(recap?.total_earnings || 0).toLocaleString('id-ID')}`;
    }

    // Populate Today's Schedule
    const todayList = container.querySelector('#today-schedule-container');
    if (todayList) {
      if (!todaySessions || todaySessions.length === 0) {
        todayList.innerHTML = `
          <div style="text-align: center; padding: 24px 10px; color: var(--text-secondary);">
            <div style="width: 50px; height: 50px; background: #eef2ff; color: #4f46e5; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 12px; font-size: 1.3rem;">
              <i class="fa-solid fa-mug-hot"></i>
            </div>
            <h4 style="font-weight: 600; margin-bottom: 4px; color: var(--text-primary);">Tidak ada sesi mengajar hari ini</h4>
            <p style="font-size: 0.82rem; margin-bottom: 12px;">Anda dapat beristirahat atau membuat sesi baru dari template jadwal.</p>
          </div>
        `;
      } else {
        todayList.innerHTML = todaySessions
          .map((s) => {
            const student = students.find((st) => st.id === s.student_id);
            const phone = student?.phone || (student?.parent?.phones && student.parent.phones[0]) || '';
            const waNumber = phone.replace(/\D/g, '').replace(/^0/, '62');

            return `
              <div class="today-schedule-item">
                <div style="display: flex; align-items: center; gap: 14px;">
                  <div class="today-time-badge">
                    <i class="fa-regular fa-clock"></i>
                    <span>${s.start_time.slice(0, 5)} - ${s.end_time.slice(0, 5)}</span>
                  </div>
                  <div class="today-student-info">
                    <h4>${s.student_name}</h4>
                    <p>
                      <span class="badge badge-pill badge-primary">${s.subject_name}</span>
                      <span>Honor: <strong>Rp ${Number(s.fee_calculated).toLocaleString('id-ID')}</strong></span>
                    </p>
                  </div>
                </div>

                <div style="display: flex; align-items: center; gap: 8px;">
                  ${
                    waNumber
                      ? `<a href="https://wa.me/${waNumber}" target="_blank" class="btn-whatsapp" title="WhatsApp Murid/Orangtua">
                          <i class="fa-brands fa-whatsapp"></i> Chat WA
                        </a>`
                      : ''
                  }
                  <button class="btn btn-sm ${s.has_report ? 'btn-success-light' : 'btn-outline'} btn-dash-report" data-id="${s.id}">
                    <i class="fa-solid ${s.has_report ? 'fa-check' : 'fa-pen'}"></i>
                    <span>${s.has_report ? 'Laporan' : 'Tulis Laporan'}</span>
                  </button>
                </div>
              </div>
            `;
          })
          .join('');

        todayList.querySelectorAll('.btn-dash-report').forEach((btn) => {
          btn.addEventListener('click', (e) => {
            const id = (e.currentTarget as HTMLElement).getAttribute('data-id')!;
            openReportModal(container, id, () => loadDashboardData(container));
          });
        });
      }
    }

    // Render Trend Chart
    const canvas = container.querySelector('#dashboard-trend-chart') as HTMLCanvasElement;
    if (canvas && typeof Chart !== 'undefined' && trends) {
      new Chart(canvas, {
        type: 'line',
        data: {
          labels: trends.map((t) => t.label),
          datasets: [
            {
              label: 'Honorarium (Rp)',
              data: trends.map((t) => t.earnings),
              borderColor: '#4f46e5',
              backgroundColor: 'rgba(79, 70, 229, 0.08)',
              fill: true,
              tension: 0.35,
              borderWidth: 2.5,
              pointBackgroundColor: '#4f46e5',
              pointRadius: 4
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: false }
          },
          scales: {
            y: {
              beginAtZero: true,
              ticks: {
                callback: (val: any) => `Rp ${Number(val).toLocaleString('id-ID')}`
              }
            }
          }
        }
      });
    }
  } catch (err: any) {
    showToast(err.message || 'Gagal memuat statistik dashboard', 'danger');
  }
}
