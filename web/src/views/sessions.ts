import { API } from '../services/api.js';
import { Session, Student, Subject } from '../types/index.js';
import { showToast } from '../utils/toast.js';
import { openReportModal } from './reports.js';

export async function renderSessions(container: HTMLElement): Promise<void> {
  const now = new Date();
  const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
  const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().slice(0, 10);

  container.innerHTML = `
    <div class="page-header">
      <div>
        <h1 class="page-title">Sesi Mengajar & Absensi</h1>
        <p class="page-subtitle">Pencatatan sesi bimbingan belajar, evaluasi materi, dan kalkulasi honorarium</p>
      </div>
      <div class="header-actions">
        <button class="btn btn-secondary" id="btn-generate-sessions">
          <i class="fa-solid fa-wand-magic-sparkles text-primary"></i>
          <span>Generate dari Jadwal</span>
        </button>
        <button class="btn btn-primary" id="btn-add-session">
          <i class="fa-solid fa-plus"></i>
          <span>Catat Sesi Manual</span>
        </button>
      </div>
    </div>

    <!-- Filter Card -->
    <div class="card mb-4">
      <div class="card-body py-3">
        <div class="filter-toolbar">
          <div class="filter-item">
            <label for="filter-start-date">Dari:</label>
            <input type="date" id="filter-start-date" class="form-control form-control-sm" value="${firstDay}" />
          </div>
          <div class="filter-item">
            <label for="filter-end-date">Sampai:</label>
            <input type="date" id="filter-end-date" class="form-control form-control-sm" value="${lastDay}" />
          </div>
          <div class="filter-item">
            <label for="filter-student">Murid:</label>
            <select id="filter-student" class="form-control form-control-sm">
              <option value="">Semua Murid</option>
            </select>
          </div>
          <div class="filter-item-action">
            <button class="btn btn-primary btn-sm" id="btn-apply-filter">
              <i class="fa-solid fa-filter"></i> Filter Sesi
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Sessions Table Card -->
    <div class="card">
      <div class="card-body">
        <div class="table-responsive">
          <table class="table">
            <thead>
              <tr>
                <th>Tanggal Sesi</th>
                <th>Nama Murid</th>
                <th>Mata Pelajaran</th>
                <th>Waktu</th>
                <th>Status Absensi</th>
                <th>Honorarium</th>
                <th>Laporan Hasil Belajar</th>
                <th style="text-align: right;">Aksi</th>
              </tr>
            </thead>
            <tbody id="sessions-table-body">
              <tr>
                <td colspan="8" class="text-center py-4">
                  <i class="fa-solid fa-spinner fa-spin"></i> Memuat daftar sesi...
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- Modal Container -->
    <div id="session-modal-container"></div>
  `;

  // Populate student filter
  let cachedStudents: Student[] = [];
  try {
    cachedStudents = await API.get<Student[]>('/students');
    const studentSelect = container.querySelector('#filter-student') as HTMLSelectElement;
    if (studentSelect && cachedStudents) {
      studentSelect.innerHTML =
        `<option value="">Semua Murid</option>` +
        cachedStudents
          .map((st) => `<option value="${st.id}">${st.full_name}</option>`)
          .join('');
    }
  } catch (e) {
    console.error('Failed to populate student filter', e);
  }

  const applyFilterBtn = container.querySelector('#btn-apply-filter');
  if (applyFilterBtn) {
    applyFilterBtn.addEventListener('click', () => loadSessions(container));
  }

  const generateBtn = container.querySelector('#btn-generate-sessions');
  if (generateBtn) {
    generateBtn.addEventListener('click', () => openGenerateModal(container));
  }

  const addBtn = container.querySelector('#btn-add-session');
  if (addBtn) {
    addBtn.addEventListener('click', () => openSessionModal(container, cachedStudents));
  }

  await loadSessions(container, cachedStudents);
}

async function loadSessions(container: HTMLElement, students: Student[] = []): Promise<void> {
  const tbody = container.querySelector('#sessions-table-body');
  if (!tbody) return;

  const startDate = (container.querySelector('#filter-start-date') as HTMLInputElement)?.value;
  const endDate = (container.querySelector('#filter-end-date') as HTMLInputElement)?.value;
  const studentId = (container.querySelector('#filter-student') as HTMLSelectElement)?.value;

  let query = `?start_date=${startDate}&end_date=${endDate}`;
  if (studentId) query += `&student_id=${studentId}`;

  try {
    const sessions = await API.get<Session[]>(`/sessions${query}`);
    if (!sessions || sessions.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="8" class="text-center py-4 text-secondary">
            Belum ada catatan sesi mengajar pada rentang tanggal ini.
          </td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = sessions
      .map((s) => {
        const dateFormatted = new Date(s.session_date).toLocaleDateString('id-ID', {
          weekday: 'short',
          day: '2-digit',
          month: 'short',
          year: 'numeric'
        });

        let statusBadge = `<span class="badge status-badge-completed"><i class="fa-solid fa-check"></i> Selesai</span>`;
        if (s.status === 'cancelled') statusBadge = `<span class="badge status-badge-cancelled"><i class="fa-solid fa-xmark"></i> Batal</span>`;
        if (s.status === 'rescheduled') statusBadge = `<span class="badge status-badge-rescheduled"><i class="fa-solid fa-clock-rotate-left"></i> Reschedule</span>`;

        return `
          <tr>
            <td><strong>${dateFormatted}</strong></td>
            <td>
              <strong>${s.student_name}</strong>
            </td>
            <td><span class="badge badge-pill badge-primary">${s.subject_name}</span></td>
            <td>
              <span class="text-xs" style="color: var(--text-secondary);">
                <i class="fa-regular fa-clock"></i> ${s.start_time.slice(0, 5)} - ${s.end_time.slice(0, 5)}
              </span>
            </td>
            <td>${statusBadge}</td>
            <td><strong>Rp ${Number(s.fee_calculated).toLocaleString('id-ID')}</strong></td>
            <td>
              <button class="btn ${s.has_report ? 'btn-success-light' : 'btn-outline'} btn-sm btn-report-action" data-id="${s.id}">
                <i class="fa-solid ${s.has_report ? 'fa-file-circle-check text-success' : 'fa-file-pen'}"></i>
                <span>${s.has_report ? 'Lihat Laporan' : 'Tulis Laporan'}</span>
              </button>
            </td>
            <td style="text-align: right;">
              <div class="table-actions">
                <button class="btn-icon btn-edit-session" data-id="${s.id}" title="Edit Sesi">
                  <i class="fa-solid fa-pen-to-square"></i>
                </button>
                <button class="btn-icon text-danger btn-delete-session" data-id="${s.id}" title="Hapus">
                  <i class="fa-solid fa-trash"></i>
                </button>
              </div>
            </td>
          </tr>
        `;
      })
      .join('');

    // Attach Report Trigger
    container.querySelectorAll('.btn-report-action').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        const id = (e.currentTarget as HTMLElement).getAttribute('data-id')!;
        openReportModal(container, id, () => loadSessions(container, students));
      });
    });

    // Attach Edit Trigger
    container.querySelectorAll('.btn-edit-session').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        const id = (e.currentTarget as HTMLElement).getAttribute('data-id')!;
        const session = sessions.find((item) => item.id === id);
        if (session) openSessionModal(container, students, session);
      });
    });

    // Attach Delete Trigger
    container.querySelectorAll('.btn-delete-session').forEach((btn) => {
      btn.addEventListener('click', async (e) => {
        const id = (e.currentTarget as HTMLElement).getAttribute('data-id')!;
        if (confirm('Apakah Anda yakin ingin menghapus catatan sesi ini?')) {
          try {
            await API.del(`/sessions/${id}`);
            showToast('Sesi berhasil dihapus', 'success');
            await loadSessions(container, students);
          } catch (err: any) {
            showToast(err.message || 'Gagal menghapus sesi', 'danger');
          }
        }
      });
    });
  } catch (err: any) {
    tbody.innerHTML = `
      <tr>
        <td colspan="8" class="text-center py-4 text-danger">
          Gagal memuat daftar sesi: ${err.message}
        </td>
      </tr>
    `;
  }
}

async function openSessionModal(
  container: HTMLElement,
  students: Student[],
  session?: Session
): Promise<void> {
  const modalContainer = container.querySelector('#session-modal-container');
  if (!modalContainer) return;

  const isEdit = !!session;

  if (students.length === 0) {
    try {
      students = await API.get<Student[]>('/students');
    } catch (e) {
      console.error('Failed to load students for session modal', e);
    }
  }

  const sessionDateValue = session?.session_date
    ? new Date(session.session_date).toISOString().slice(0, 10)
    : new Date().toISOString().slice(0, 10);

  modalContainer.innerHTML = `
    <div class="modal-backdrop">
      <div class="modal-content glass">
        <div class="modal-header">
          <h3>${isEdit ? 'Edit Sesi Mengajar' : 'Catat Sesi Mengajar Manual'}</h3>
          <button class="btn-icon" id="btn-close-modal"><i class="fa-solid fa-xmark"></i></button>
        </div>
        <form id="session-form">
          <div class="modal-body">
            <div class="form-group">
              <label for="se-student">Pilih Murid *</label>
              <select id="se-student" class="form-control" required ${isEdit ? 'disabled' : ''}>
                <option value="">-- Pilih Murid --</option>
                ${students
                  .map(
                    (st) => `
                  <option value="${st.id}" ${session?.student_id === st.id ? 'selected' : ''}>${st.full_name}</option>
                `
                  )
                  .join('')}
              </select>
            </div>

            <div class="form-group">
              <label for="se-subject">Mata Pelajaran *</label>
              <select id="se-subject" class="form-control" required ${isEdit ? 'disabled' : ''}>
                <option value="">-- Pilih Murid Terlebih Dahulu --</option>
              </select>
            </div>

            <div class="form-group">
              <label for="se-date">Tanggal Sesi *</label>
              <input type="date" id="se-date" class="form-control" value="${sessionDateValue}" required />
            </div>

            <div class="form-grid">
              <div class="form-group">
                <label for="se-start-time">Jam Mulai *</label>
                <input type="time" id="se-start-time" class="form-control" value="${session?.start_time ? session.start_time.slice(0, 5) : '15:00'}" required />
              </div>
              <div class="form-group">
                <label for="se-end-time">Jam Selesai *</label>
                <input type="time" id="se-end-time" class="form-control" value="${session?.end_time ? session.end_time.slice(0, 5) : '16:30'}" required />
              </div>
            </div>

            <div class="form-group">
              <label for="se-status">Status Absensi *</label>
              <select id="se-status" class="form-control" required>
                <option value="completed" ${session?.status === 'completed' ? 'selected' : ''}>Selesai (Completed - Dihitung Honor)</option>
                <option value="cancelled" ${session?.status === 'cancelled' ? 'selected' : ''}>Dibatalkan (Cancelled - Tanpa Honor)</option>
                <option value="rescheduled" ${session?.status === 'rescheduled' ? 'selected' : ''}>Dijadwalkan Ulang (Rescheduled)</option>
              </select>
            </div>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" id="btn-cancel-modal">Batal</button>
            <button type="submit" class="btn btn-primary">${isEdit ? 'Simpan Perubahan' : 'Catat Sesi'}</button>
          </div>
        </form>
      </div>
    </div>
  `;

  const studentSelect = modalContainer.querySelector('#se-student') as HTMLSelectElement;
  const subjectSelect = modalContainer.querySelector('#se-subject') as HTMLSelectElement;

  const updateSubjectOptions = (studentId: string, selectedSubId?: string) => {
    const selectedStudent = students.find((s) => s.id === studentId);
    if (!selectedStudent || selectedStudent.subjects.length === 0) {
      subjectSelect.innerHTML = `<option value="">(Murid belum memiliki mata pelajaran)</option>`;
      return;
    }

    subjectSelect.innerHTML = selectedStudent.subjects
      .map(
        (sub) => `
      <option value="${sub.id}" ${sub.id === selectedSubId ? 'selected' : ''}>${sub.name}</option>
    `
      )
      .join('');
  };

  if (session) {
    updateSubjectOptions(session.student_id, session.subject_id);
  }

  studentSelect.addEventListener('change', () => {
    updateSubjectOptions(studentSelect.value);
  });

  const closeModal = () => {
    modalContainer.innerHTML = '';
  };

  modalContainer.querySelector('#btn-close-modal')?.addEventListener('click', closeModal);
  modalContainer.querySelector('#btn-cancel-modal')?.addEventListener('click', closeModal);

  const form = modalContainer.querySelector('#session-form') as HTMLFormElement;
  form?.addEventListener('submit', async (e) => {
    e.preventDefault();

    const studentId = session ? session.student_id : studentSelect.value;
    const subjectId = session ? session.subject_id : subjectSelect.value;
    const sessionDate = (modalContainer.querySelector('#se-date') as HTMLInputElement).value;
    const startTime = (modalContainer.querySelector('#se-start-time') as HTMLInputElement).value;
    const endTime = (modalContainer.querySelector('#se-end-time') as HTMLInputElement).value;
    const status = (modalContainer.querySelector('#se-status') as HTMLSelectElement).value;

    const payload = {
      student_id: studentId,
      subject_id: subjectId,
      session_date: sessionDate,
      start_time: startTime.length === 5 ? `${startTime}:00` : startTime,
      end_time: endTime.length === 5 ? `${endTime}:00` : endTime,
      status
    };

    try {
      if (isEdit) {
        await API.put(`/sessions/${session!.id}`, payload);
        showToast('Catatan sesi berhasil diperbarui', 'success');
      } else {
        await API.post('/sessions', payload);
        showToast('Sesi mengajar baru berhasil dicatat', 'success');
      }
      closeModal();
      await loadSessions(container, students);
    } catch (err: any) {
      showToast(err.message || 'Gagal menyimpan sesi', 'danger');
    }
  });
}

function openGenerateModal(container: HTMLElement): void {
  const modalContainer = container.querySelector('#session-modal-container');
  if (!modalContainer) return;

  const now = new Date();
  const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
  const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().slice(0, 10);

  modalContainer.innerHTML = `
    <div class="modal-backdrop">
      <div class="modal-content glass">
        <div class="modal-header">
          <h3>Generate Sesi Otomatis dari Jadwal Mingguan</h3>
          <button class="btn-icon" id="btn-close-modal"><i class="fa-solid fa-xmark"></i></button>
        </div>
        <form id="generate-form">
          <div class="modal-body">
            <p class="text-sm text-secondary mb-3">
              Fitur ini akan membuatkan seluruh sesi pertemuan secara otomatis berdasarkan template <strong>Jadwal Rutin Mingguan</strong> yang berstatus aktif dalam rentang tanggal yang Anda tentukan. Sesi yang sudah tercatat sebelumnya tidak akan diduplikasi.
            </p>
            <div class="form-grid">
              <div class="form-group">
                <label for="gen-start-date">Dari Tanggal *</label>
                <input type="date" id="gen-start-date" class="form-control" value="${firstDay}" required />
              </div>
              <div class="form-group">
                <label for="gen-end-date">Sampai Tanggal *</label>
                <input type="date" id="gen-end-date" class="form-control" value="${lastDay}" required />
              </div>
            </div>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" id="btn-cancel-modal">Batal</button>
            <button type="submit" class="btn btn-primary"><i class="fa-solid fa-wand-magic-sparkles"></i> Mulai Generate</button>
          </div>
        </form>
      </div>
    </div>
  `;

  const closeModal = () => {
    modalContainer.innerHTML = '';
  };

  modalContainer.querySelector('#btn-close-modal')?.addEventListener('click', closeModal);
  modalContainer.querySelector('#btn-cancel-modal')?.addEventListener('click', closeModal);

  const form = modalContainer.querySelector('#generate-form') as HTMLFormElement;
  form?.addEventListener('submit', async (e) => {
    e.preventDefault();

    const startDate = (modalContainer.querySelector('#gen-start-date') as HTMLInputElement).value;
    const endDate = (modalContainer.querySelector('#gen-end-date') as HTMLInputElement).value;

    try {
      const res = await API.post<{ message: string; generated_count: number }>('/sessions/generate', {
        start_date: startDate,
        end_date: endDate
      });
      showToast(`Berhasil men-generate ${res.generated_count} sesi baru!`, 'success');
      closeModal();
      await loadSessions(container);
    } catch (err: any) {
      showToast(err.message || 'Gagal men-generate sesi', 'danger');
    }
  });
}
