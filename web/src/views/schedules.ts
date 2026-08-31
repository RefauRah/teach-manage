import { API } from '../services/api.js';
import { Schedule, Student, Subject } from '../types/index.js';
import { showToast } from '../utils/toast.js';

const DAYS = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];

export async function renderSchedules(container: HTMLElement): Promise<void> {
  container.innerHTML = `
    <div class="page-header">
      <div>
        <h1 class="page-title">Jadwal Rutin Mingguan</h1>
        <p class="page-subtitle">Atur template jadwal les berkala (Senin s/d Minggu) untuk pembuatan sesi otomatis setiap minggunya</p>
      </div>
      <div class="header-actions">
        <button class="btn btn-primary" id="btn-add-schedule">
          <i class="fa-solid fa-calendar-plus"></i>
          <span>Tambah Jadwal Rutin</span>
        </button>
      </div>
    </div>

    <!-- Weekly Schedule Board Grid -->
    <div class="schedule-calendar-grid" id="schedule-calendar-container">
      ${DAYS.map(
        (dayName, dayIndex) => `
        <div class="day-column" data-day="${dayIndex}">
          <div class="day-header">
            <h4>${dayName}</h4>
            <span class="badge badge-pill badge-primary" id="day-count-${dayIndex}">0</span>
          </div>
          <div class="day-slots" id="day-slots-${dayIndex}">
            <div class="text-xs text-secondary py-4 text-center">Memuat...</div>
          </div>
          <button class="btn btn-secondary btn-sm btn-block mt-2 btn-add-day-schedule" data-day="${dayIndex}" style="font-size: 0.78rem;">
            <i class="fa-solid fa-plus"></i> Tambah di ${dayName}
          </button>
        </div>
      `
      ).join('')}
    </div>

    <!-- Modal Container -->
    <div id="schedule-modal-container"></div>
  `;

  const addBtn = container.querySelector('#btn-add-schedule');
  if (addBtn) {
    addBtn.addEventListener('click', () => openScheduleModal(container));
  }

  container.querySelectorAll('.btn-add-day-schedule').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      const dayIndex = parseInt((e.currentTarget as HTMLElement).getAttribute('data-day')!, 10);
      openScheduleModal(container, undefined, dayIndex);
    });
  });

  await loadSchedules(container);
}

async function loadSchedules(container: HTMLElement): Promise<void> {
  try {
    const schedules = await API.get<Schedule[]>('/schedules');

    // Group by day of week
    const dayMap = new Map<number, Schedule[]>();
    for (let i = 0; i < 7; i++) {
      dayMap.set(i, []);
    }

    if (schedules) {
      for (const sc of schedules) {
        dayMap.get(sc.day_of_week)?.push(sc);
      }
    }

    for (let i = 0; i < 7; i++) {
      const countEl = container.querySelector(`#day-count-${i}`);
      const slotsEl = container.querySelector(`#day-slots-${i}`);
      const daySchedules = dayMap.get(i) || [];

      if (countEl) countEl.textContent = String(daySchedules.length);
      if (slotsEl) {
        if (daySchedules.length === 0) {
          slotsEl.innerHTML = `<div class="empty-slot text-xs text-muted py-6 text-center">Tidak ada jadwal</div>`;
        } else {
          slotsEl.innerHTML = daySchedules
            .map(
              (sc) => `
            <div class="schedule-card ${sc.is_active ? '' : 'inactive'}" data-id="${sc.id}">
              <div class="schedule-card-header">
                <strong>${sc.student_name}</strong>
                <span class="badge badge-pill ${sc.is_active ? 'badge-success' : 'badge-danger'}" style="font-size: 0.7rem; padding: 2px 6px;">
                  ${sc.is_active ? 'Aktif' : 'Nonaktif'}
                </span>
              </div>
              <div class="schedule-card-subject">${sc.subject_name}</div>
              <div class="schedule-card-time">
                <i class="fa-regular fa-clock"></i>
                <span>${sc.start_time.slice(0, 5)} - ${sc.end_time.slice(0, 5)}</span>
              </div>
              <div class="schedule-card-actions">
                <button class="btn-icon btn-edit-schedule" data-id="${sc.id}" title="Edit"><i class="fa-solid fa-pen"></i></button>
                <button class="btn-icon text-danger btn-delete-schedule" data-id="${sc.id}" title="Hapus"><i class="fa-solid fa-trash"></i></button>
              </div>
            </div>
          `
            )
            .join('');
        }
      }
    }

    // Attach Edit Listeners
    container.querySelectorAll('.btn-edit-schedule').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        const id = (e.currentTarget as HTMLElement).getAttribute('data-id')!;
        const sc = schedules.find((item) => item.id === id);
        if (sc) openScheduleModal(container, sc);
      });
    });

    // Attach Delete Listeners
    container.querySelectorAll('.btn-delete-schedule').forEach((btn) => {
      btn.addEventListener('click', async (e) => {
        const id = (e.currentTarget as HTMLElement).getAttribute('data-id')!;
        if (confirm('Apakah Anda yakin ingin menghapus jadwal rutin ini?')) {
          try {
            await API.del(`/schedules/${id}`);
            showToast('Jadwal berhasil dihapus', 'success');
            await loadSchedules(container);
          } catch (err: any) {
            showToast(err.message || 'Gagal menghapus jadwal', 'danger');
          }
        }
      });
    });
  } catch (err: any) {
    showToast(err.message || 'Gagal memuat jadwal rutin', 'danger');
  }
}

async function openScheduleModal(
  container: HTMLElement,
  schedule?: Schedule,
  defaultDayIndex?: number
): Promise<void> {
  const modalContainer = container.querySelector('#schedule-modal-container');
  if (!modalContainer) return;

  const isEdit = !!schedule;

  let students: Student[] = [];
  try {
    students = await API.get<Student[]>('/students');
  } catch (e) {
    console.error('Failed to load students for schedule modal', e);
  }

  const selectedDay = schedule?.day_of_week ?? defaultDayIndex ?? 1;

  modalContainer.innerHTML = `
    <div class="modal-backdrop">
      <div class="modal-content glass">
        <div class="modal-header">
          <h3>${isEdit ? 'Edit Jadwal Rutin' : 'Tambah Jadwal Rutin Mingguan'}</h3>
          <button class="btn-icon" id="btn-close-modal"><i class="fa-solid fa-xmark"></i></button>
        </div>
        <form id="schedule-form">
          <div class="modal-body">
            <div class="form-group">
              <label for="sc-student">Pilih Murid *</label>
              <select id="sc-student" class="form-control" required>
                <option value="">-- Pilih Murid --</option>
                ${students
                  .map(
                    (st) => `
                  <option value="${st.id}" ${schedule?.student_id === st.id ? 'selected' : ''}>
                    ${st.full_name} (${st.school || 'Umum'})
                  </option>
                `
                  )
                  .join('')}
              </select>
            </div>

            <div class="form-group">
              <label for="sc-subject">Pilih Mata Pelajaran *</label>
              <select id="sc-subject" class="form-control" required>
                <option value="">-- Pilih Murid Terlebih Dahulu --</option>
              </select>
            </div>

            <div class="form-group">
              <label for="sc-day">Pilih Hari *</label>
              <select id="sc-day" class="form-control" required>
                ${DAYS.map(
                  (d, i) => `
                  <option value="${i}" ${selectedDay === i ? 'selected' : ''}>${d}</option>
                `
                ).join('')}
              </select>
            </div>

            <div class="form-grid">
              <div class="form-group">
                <label for="sc-start-time">Jam Mulai *</label>
                <input type="time" id="sc-start-time" class="form-control" value="${schedule?.start_time ? schedule.start_time.slice(0, 5) : '15:00'}" required />
              </div>
              <div class="form-group">
                <label for="sc-end-time">Jam Selesai *</label>
                <input type="time" id="sc-end-time" class="form-control" value="${schedule?.end_time ? schedule.end_time.slice(0, 5) : '16:30'}" required />
              </div>
            </div>

            <div class="form-group">
              <label class="checkbox-pill">
                <input type="checkbox" id="sc-is-active" ${schedule ? (schedule.is_active ? 'checked' : '') : 'checked'} />
                <span>Jadwal Aktif (Dapat Digenerate Sesi)</span>
              </label>
            </div>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" id="btn-cancel-modal">Batal</button>
            <button type="submit" class="btn btn-primary">${isEdit ? 'Simpan Perubahan' : 'Tambah Jadwal'}</button>
          </div>
        </form>
      </div>
    </div>
  `;

  const studentSelect = modalContainer.querySelector('#sc-student') as HTMLSelectElement;
  const subjectSelect = modalContainer.querySelector('#sc-subject') as HTMLSelectElement;

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

  if (schedule) {
    updateSubjectOptions(schedule.student_id, schedule.subject_id);
  }

  studentSelect.addEventListener('change', () => {
    updateSubjectOptions(studentSelect.value);
  });

  const closeModal = () => {
    modalContainer.innerHTML = '';
  };

  modalContainer.querySelector('#btn-close-modal')?.addEventListener('click', closeModal);
  modalContainer.querySelector('#btn-cancel-modal')?.addEventListener('click', closeModal);

  const form = modalContainer.querySelector('#schedule-form') as HTMLFormElement;
  form?.addEventListener('submit', async (e) => {
    e.preventDefault();

    const studentId = studentSelect.value;
    const subjectId = subjectSelect.value;
    const dayOfWeek = parseInt((modalContainer.querySelector('#sc-day') as HTMLSelectElement).value, 10);
    const startTime = (modalContainer.querySelector('#sc-start-time') as HTMLInputElement).value;
    const endTime = (modalContainer.querySelector('#sc-end-time') as HTMLInputElement).value;
    const isActive = (modalContainer.querySelector('#sc-is-active') as HTMLInputElement).checked;

    if (!studentId || !subjectId) {
      showToast('Pilih murid dan mata pelajaran terlebih dahulu', 'warning');
      return;
    }

    const payload = {
      student_id: studentId,
      subject_id: subjectId,
      day_of_week: dayOfWeek,
      start_time: startTime.length === 5 ? `${startTime}:00` : startTime,
      end_time: endTime.length === 5 ? `${endTime}:00` : endTime,
      is_active: isActive
    };

    try {
      if (isEdit) {
        await API.put(`/schedules/${schedule!.id}`, payload);
        showToast('Jadwal rutin berhasil diperbarui', 'success');
      } else {
        await API.post('/schedules', payload);
        showToast('Jadwal rutin baru berhasil ditambahkan', 'success');
      }
      closeModal();
      await loadSchedules(container);
    } catch (err: any) {
      showToast(err.message || 'Gagal menyimpan jadwal', 'danger');
    }
  });
}
