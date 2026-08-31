import { API } from '../services/api.js';
import { MonthlyRecap } from '../types/index.js';
import { showToast } from '../utils/toast.js';
import { skeletonTableRows } from '../utils/loading.js';

declare const Chart: any;

const MONTH_NAMES = [
  '',
  'Januari',
  'Februari',
  'Maret',
  'April',
  'Mei',
  'Juni',
  'Juli',
  'Agustus',
  'September',
  'Oktober',
  'November',
  'Desember'
];

export async function renderRecap(container: HTMLElement): Promise<void> {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;

  container.innerHTML = `
    <div class="page-header">
      <div>
        <h1 class="page-title">Rekap Bulanan & Honorarium</h1>
        <p class="page-subtitle">Rangkuman kinerja mengajar, rekap absensi, dan perhitungan honorarium bersih per murid</p>
      </div>
      <div class="header-actions">
        <button class="btn btn-secondary" id="btn-print-recap">
          <i class="fa-solid fa-print text-primary"></i>
          <span>Cetak / Simpan PDF</span>
        </button>
      </div>
    </div>

    <!-- Month & Year Selector Card -->
    <div class="card mb-4">
      <div class="card-body py-3">
        <div class="filter-toolbar">
          <div class="filter-item">
            <label for="recap-month">Bulan:</label>
            <select id="recap-month" class="form-control form-control-sm">
              ${MONTH_NAMES.slice(1)
                .map(
                  (m, i) => `
                <option value="${i + 1}" ${i + 1 === currentMonth ? 'selected' : ''}>${m}</option>
              `
                )
                .join('')}
            </select>
          </div>
          <div class="filter-item">
            <label for="recap-year">Tahun:</label>
            <select id="recap-year" class="form-control form-control-sm">
              ${[currentYear - 2, currentYear - 1, currentYear, currentYear + 1]
                .map(
                  (y) => `
                <option value="${y}" ${y === currentYear ? 'selected' : ''}>${y}</option>
              `
                )
                .join('')}
            </select>
          </div>
          <div class="filter-item-action">
            <button class="btn btn-primary btn-sm" id="btn-load-recap">
              <i class="fa-solid fa-arrows-rotate"></i> Tampilkan Rekap
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Recap Stats Cards -->
    <div class="stats-grid mb-4">
      <div class="stat-card">
        <div class="stat-icon" style="background: #eef2ff; color: #4f46e5;">
          <i class="fa-solid fa-calendar-days"></i>
        </div>
        <div class="stat-info">
          <span class="stat-label">Total Sesi Terjadwal</span>
          <h3 class="stat-value" id="recap-total-sessions">-</h3>
        </div>
      </div>

      <div class="stat-card">
        <div class="stat-icon" style="background: #ecfdf5; color: #10b981;">
          <i class="fa-solid fa-circle-check"></i>
        </div>
        <div class="stat-info">
          <span class="stat-label">Sesi Berhasil Selesai</span>
          <h3 class="stat-value" id="recap-completed-sessions">-</h3>
        </div>
      </div>

      <div class="stat-card">
        <div class="stat-icon" style="background: #fef2f2; color: #ef4444;">
          <i class="fa-solid fa-calendar-xmark"></i>
        </div>
        <div class="stat-info">
          <span class="stat-label">Sesi Dibatalkan</span>
          <h3 class="stat-value" id="recap-cancelled-sessions">-</h3>
        </div>
      </div>

      <div class="stat-card highlight">
        <div class="stat-icon" style="background: #eef2ff; color: #4f46e5;">
          <i class="fa-solid fa-money-bill-wave"></i>
        </div>
        <div class="stat-info">
          <span class="stat-label">Total Honorarium Bersih</span>
          <h3 class="stat-value" style="color: #4f46e5;" id="recap-total-earnings">-</h3>
        </div>
      </div>
    </div>

    <!-- Student Breakdown Table Card -->
    <div class="card mb-4">
      <div class="card-header">
        <h3 class="card-title"><i class="fa-solid fa-list-check text-primary"></i> Rincian Honorarium per Murid</h3>
      </div>
      <div class="card-body">
        <div class="table-responsive">
          <table class="table">
            <thead>
              <tr>
                <th>Nama Murid</th>
                <th>Model Kesepakatan Tarif</th>
                <th>Sesi Selesai</th>
                <th>Sesi Batal</th>
                <th>Reschedule</th>
                <th style="text-align: right;">Total Honorarium</th>
              </tr>
            </thead>
            <tbody id="recap-table-body">
              <tr>
                <td colspan="6" class="text-center py-4">
                  <i class="fa-solid fa-spinner fa-spin"></i> Memuat data rekap...
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- 6-Month Trend Chart Card -->
    <div class="card">
      <div class="card-header">
        <h3 class="card-title"><i class="fa-solid fa-chart-area text-primary"></i> Tren Penghasilan 6 Bulan Terakhir</h3>
      </div>
      <div class="card-body">
        <div style="height: 260px; position: relative;">
          <canvas id="recap-trend-chart"></canvas>
        </div>
      </div>
    </div>
  `;

  const loadBtn = container.querySelector('#btn-load-recap');
  if (loadBtn) {
    loadBtn.addEventListener('click', () => loadRecap(container));
  }

  const printBtn = container.querySelector('#btn-print-recap');
  if (printBtn) {
    printBtn.addEventListener('click', () => {
      window.print();
    });
  }

  await loadRecap(container);
}

async function loadRecap(container: HTMLElement): Promise<void> {
  const month = (container.querySelector('#recap-month') as HTMLSelectElement)?.value || '8';
  const year = (container.querySelector('#recap-year') as HTMLSelectElement)?.value || '2026';
  const tbody = container.querySelector('#recap-table-body');
  if (!tbody) return;
  tbody.innerHTML = skeletonTableRows(6, 3);

  try {
    const [recap, trends] = await Promise.all([
      API.get<MonthlyRecap>(`/recap/monthly?year=${year}&month=${month}`),
      API.get<{ label: string; earnings: number }[]>('/recap/trend?months=6')
    ]);

    // Update Summary Stats
    const totalSessions = container.querySelector('#recap-total-sessions');
    if (totalSessions) totalSessions.textContent = String(recap.total_sessions || 0);

    const compSessions = container.querySelector('#recap-completed-sessions');
    if (compSessions) compSessions.textContent = String(recap.completed_sessions || 0);

    const cancelSessions = container.querySelector('#recap-cancelled-sessions');
    if (cancelSessions) cancelSessions.textContent = String(recap.cancelled_sessions || 0);

    const totalEarnings = container.querySelector('#recap-total-earnings');
    if (totalEarnings) totalEarnings.textContent = `Rp ${Number(recap.total_earnings || 0).toLocaleString('id-ID')}`;

    // Render Student Breakdown
    if (!recap.students || recap.students.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="6" class="text-center py-4 text-secondary">
            Belum ada murid atau data sesi pada bulan ${MONTH_NAMES[parseInt(month, 10)]} ${year}.
          </td>
        </tr>
      `;
    } else {
      tbody.innerHTML = recap.students
        .map((st) => {
          let feeLabel = 'Per Sesi';
          if (st.fee_model === 'monthly') feeLabel = 'Bulanan';
          if (st.fee_model === 'per_hour') feeLabel = 'Per Jam';

          return `
            <tr>
              <td>
                <div style="display: flex; align-items: center; gap: 10px;">
                  <div style="width: 34px; height: 34px; border-radius: 50%; background: #eef2ff; color: #4f46e5; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 0.85rem;">
                    ${st.student_name.charAt(0).toUpperCase()}
                  </div>
                  <strong>${st.student_name}</strong>
                </div>
              </td>
              <td><span class="badge badge-pill badge-primary">${feeLabel} (Rp ${Number(st.fee_amount).toLocaleString('id-ID')})</span></td>
              <td><span class="text-success font-semibold" style="color: #10b981;"><i class="fa-solid fa-check"></i> ${st.completed_count} Sesi</span></td>
              <td><span class="text-danger font-semibold" style="color: #ef4444;">${st.cancelled_count}</span></td>
              <td><span class="text-warning font-semibold" style="color: #f59e0b;">${st.rescheduled_count}</span></td>
              <td style="text-align: right;"><strong style="font-size: 1rem; color: var(--primary);">Rp ${Number(st.total_earnings).toLocaleString('id-ID')}</strong></td>
            </tr>
          `;
        })
        .join('');
    }

    // Render Trend Chart
    const canvas = container.querySelector('#recap-trend-chart') as HTMLCanvasElement;
    if (canvas && typeof Chart !== 'undefined' && trends) {
      new Chart(canvas, {
        type: 'bar',
        data: {
          labels: trends.map((t) => t.label),
          datasets: [
            {
              label: 'Total Honorarium (Rp)',
              data: trends.map((t) => t.earnings),
              backgroundColor: 'rgba(79, 70, 229, 0.85)',
              borderColor: '#4f46e5',
              borderWidth: 1,
              borderRadius: 8
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
    showToast(err.message || 'Gagal memuat rekap', 'danger');
  }
}
