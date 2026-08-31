import { API } from '../services/api.js';
import { Student, Subject } from '../types/index.js';
import { showToast } from '../utils/toast.js';
import { setButtonLoading, skeletonTableRows } from '../utils/loading.js';

export async function renderStudents(container: HTMLElement): Promise<void> {
  container.innerHTML = `
    <div class="page-header">
      <div>
        <h1 class="page-title">Daftar Murid Les Privat</h1>
        <p class="page-subtitle">Kelola data murid, mata pelajaran yang diambil, informasi orangtua, dan kesepakatan tarif</p>
      </div>
      <div class="header-actions">
        <button class="btn btn-primary" id="btn-add-student">
          <i class="fa-solid fa-user-plus"></i>
          <span>Tambah Murid Baru</span>
        </button>
      </div>
    </div>

    <!-- Filter & Search Toolbar Card -->
    <div class="card mb-4">
      <div class="card-body py-3">
        <div class="filter-toolbar">
          <div class="search-input-wrapper">
            <i class="fa-solid fa-magnifying-glass"></i>
            <input type="text" id="student-search-input" class="form-control form-control-sm" placeholder="Cari nama murid, sekolah, atau mata pelajaran..." />
          </div>
          <div class="filter-item">
            <label for="filter-fee-model">Model Tarif:</label>
            <select id="filter-fee-model" class="form-control form-control-sm">
              <option value="">Semua Tarif</option>
              <option value="per_session">Per Sesi</option>
              <option value="monthly">Bulanan</option>
              <option value="per_hour">Per Jam</option>
            </select>
          </div>
        </div>
      </div>
    </div>

    <!-- Students Table Card -->
    <div class="card">
      <div class="card-body">
        <div class="table-responsive">
          <table class="table">
            <thead>
              <tr>
                <th>Nama Murid & Sekolah</th>
                <th>Mata Pelajaran</th>
                <th>Model Tarif Honor</th>
                <th>Kontak & WhatsApp</th>
                <th>Orangtua / Wali</th>
                <th style="text-align: right;">Aksi</th>
              </tr>
            </thead>
            <tbody id="students-table-body">
              ${skeletonTableRows(6, 4)}
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- Modal Container -->
    <div id="student-modal-container"></div>
  `;

  const addBtn = container.querySelector('#btn-add-student');
  if (addBtn) {
    addBtn.addEventListener('click', () => openStudentModal(container));
  }

  const searchInput = container.querySelector('#student-search-input') as HTMLInputElement;
  const feeModelFilter = container.querySelector('#filter-fee-model') as HTMLSelectElement;

  searchInput?.addEventListener('input', () => filterAndRenderStudents(container));
  feeModelFilter?.addEventListener('change', () => filterAndRenderStudents(container));

  await loadStudents(container);
}

let cachedStudents: Student[] = [];

async function loadStudents(container: HTMLElement): Promise<void> {
  const tbody = container.querySelector('#students-table-body');
  if (tbody) tbody.innerHTML = skeletonTableRows(6, 4);
  try {
    cachedStudents = await API.get<Student[]>('/students');
    filterAndRenderStudents(container);
  } catch (err: any) {
    if (tbody) {
      tbody.innerHTML = `
        <tr>
          <td colspan="6" class="text-center py-4 text-danger">
            Gagal memuat data murid: ${err.message}
          </td>
        </tr>
      `;
    }
  }
}

function filterAndRenderStudents(container: HTMLElement): void {
  const tbody = container.querySelector('#students-table-body');
  if (!tbody) return;

  const searchQuery = (container.querySelector('#student-search-input') as HTMLInputElement)?.value.toLowerCase().trim() || '';
  const feeModel = (container.querySelector('#filter-fee-model') as HTMLSelectElement)?.value || '';

  const filtered = cachedStudents.filter((st) => {
    const matchSearch =
      st.full_name.toLowerCase().includes(searchQuery) ||
      (st.school && st.school.toLowerCase().includes(searchQuery)) ||
      (st.grade && st.grade.toLowerCase().includes(searchQuery)) ||
      st.subjects.some((sub) => sub.name.toLowerCase().includes(searchQuery));

    const matchFee = !feeModel || st.fee_model === feeModel;

    return matchSearch && matchFee;
  });

  if (filtered.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="6" class="text-center py-4 text-secondary">
          Tidak ada data murid yang sesuai.
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = filtered
    .map((st) => {
      let feeLabel = 'Per Sesi';
      if (st.fee_model === 'monthly') feeLabel = 'Bulanan';
      if (st.fee_model === 'per_hour') feeLabel = 'Per Jam';

      const subjectBadges =
        st.subjects.length > 0
          ? st.subjects.map((sub) => `<span class="badge badge-pill badge-primary">${sub.name}</span>`).join(' ')
          : '<span class="text-xs text-muted">Belum ada mata pelajaran</span>';

      const studentPhone = st.phone || (st.parent?.phones && st.parent.phones[0]) || '';
      const waNumber = studentPhone.replace(/\D/g, '').replace(/^0/, '62');

      const parentInfo = st.parent
        ? `<div><strong>${st.parent.father_name || st.parent.mother_name || '-'}</strong><div class="text-xs text-secondary">${st.parent.occupation || ''}</div></div>`
        : '<span class="text-xs text-muted">-</span>';

      return `
        <tr>
          <td>
            <div style="display: flex; align-items: center; gap: 12px;">
              <div style="width: 38px; height: 38px; border-radius: 50%; background: #eef2ff; color: #4f46e5; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 0.9rem;">
                ${st.full_name.charAt(0).toUpperCase()}
              </div>
              <div>
                <strong>${st.full_name}</strong>
                <div class="text-xs text-secondary">
                  ${st.school ? st.school : 'Umum'} ${st.grade ? `• Kelas ${st.grade}` : ''}
                </div>
              </div>
            </div>
          </td>
          <td>${subjectBadges}</td>
          <td>
            <div><strong>Rp ${Number(st.fee_amount).toLocaleString('id-ID')}</strong></div>
            <span class="badge badge-pill" style="background: #f1f5f9; color: #475569; font-size: 0.75rem;">${feeLabel}</span>
          </td>
          <td>
            ${
              waNumber
                ? `<a href="https://wa.me/${waNumber}" target="_blank" class="btn-whatsapp">
                    <i class="fa-brands fa-whatsapp"></i> Chat WA
                   </a>`
                : '<span class="text-xs text-muted">Tanpa No. HP</span>'
            }
          </td>
          <td>${parentInfo}</td>
          <td style="text-align: right;">
            <div class="table-actions">
              <button class="btn-icon btn-edit-student" data-id="${st.id}" title="Edit Data Murid">
                <i class="fa-solid fa-pen-to-square"></i>
              </button>
              <button class="btn-icon text-danger btn-delete-student" data-id="${st.id}" title="Hapus Murid">
                <i class="fa-solid fa-trash"></i>
              </button>
            </div>
          </td>
        </tr>
      `;
    })
    .join('');

  // Attach Edit Listeners
  container.querySelectorAll('.btn-edit-student').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      const id = (e.currentTarget as HTMLElement).getAttribute('data-id')!;
      const student = cachedStudents.find((s) => s.id === id);
      if (student) openStudentModal(container, student);
    });
  });

  // Attach Delete Listeners
  container.querySelectorAll('.btn-delete-student').forEach((btn) => {
    btn.addEventListener('click', async (e) => {
      const id = (e.currentTarget as HTMLElement).getAttribute('data-id')!;
      if (confirm('Apakah Anda yakin ingin menghapus data murid ini beserta riwayatnya?')) {
        const deleteBtn = e.currentTarget as HTMLButtonElement;
        const restore = setButtonLoading(deleteBtn, 'Menghapus...');
        try {
          await API.del(`/students/${id}`);
          showToast('Data murid berhasil dihapus', 'success');
          await loadStudents(container);
        } catch (err: any) {
          showToast(err.message || 'Gagal menghapus data murid', 'danger');
          restore();
        }
      }
    });
  });
}

async function openStudentModal(container: HTMLElement, student?: Student): Promise<void> {
  const modalContainer = container.querySelector('#student-modal-container');
  if (!modalContainer) return;

  const isEdit = !!student;

  // Load all subjects for teacher to assign
  let subjects: Subject[] = [];
  try {
    subjects = await API.get<Subject[]>('/subjects');
  } catch (e) {
    console.error('Failed to load subjects for modal', e);
  }

  const assignedSubjectIds = new Set((student?.subjects || []).map((s) => s.id));

  modalContainer.innerHTML = `
    <div class="modal-backdrop">
      <div class="modal-content glass modal-lg">
        <div class="modal-header">
          <h3>${isEdit ? 'Edit Data Murid' : 'Tambah Murid Baru'}</h3>
          <button class="btn-icon" id="btn-close-modal"><i class="fa-solid fa-xmark"></i></button>
        </div>
        <form id="student-form">
          <div class="modal-body">
            <!-- Section 1: Data Diri Murid -->
            <h4 class="form-section-title"><i class="fa-solid fa-user-graduate text-primary"></i> Data Diri Murid</h4>
            <div class="form-grid">
              <div class="form-group">
                <label for="st-name">Nama Lengkap Murid *</label>
                <input type="text" id="st-name" class="form-control" value="${student?.full_name || ''}" required placeholder="Contoh: Dimas Anggara" />
              </div>
              <div class="form-group">
                <label for="st-gender">Jenis Kelamin</label>
                <select id="st-gender" class="form-control">
                  <option value="L" ${student?.gender === 'L' ? 'selected' : ''}>Laki-laki</option>
                  <option value="P" ${student?.gender === 'P' ? 'selected' : ''}>Perempuan</option>
                </select>
              </div>
            </div>

            <div class="form-grid">
              <div class="form-group">
                <label for="st-school">Nama Sekolah</label>
                <input type="text" id="st-school" class="form-control" value="${student?.school || ''}" placeholder="Contoh: SMP Negeri 1 Jakarta" />
              </div>
              <div class="form-group">
                <label for="st-grade">Kelas / Tingkat</label>
                <input type="text" id="st-grade" class="form-control" value="${student?.grade || ''}" placeholder="Contoh: 8 (SMP)" />
              </div>
              <div class="form-group">
                <label for="st-phone">No. WhatsApp / HP Murid</label>
                <input type="tel" id="st-phone" class="form-control" value="${student?.phone || ''}" placeholder="Contoh: 081234567890" />
              </div>
            </div>

            <div class="form-group">
              <label for="st-address">Alamat Rumah / Lokasi Les</label>
              <textarea id="st-address" class="form-control" rows="2" placeholder="Alamat lengkap tempat bimbingan belajar...">${student?.address || ''}</textarea>
            </div>

            <!-- Section 2: Mata Pelajaran & Tarif -->
            <h4 class="form-section-title mt-4"><i class="fa-solid fa-book-open text-primary"></i> Mata Pelajaran & Kesepakatan Tarif</h4>
            <div class="form-group">
              <label>Pilih Mata Pelajaran yang Diambil *</label>
              <div style="display: flex; flex-wrap: wrap; gap: 8px; margin-top: 6px;" id="subject-checkboxes">
                ${
                  subjects.length > 0
                    ? subjects
                        .map(
                          (sub) => `
                    <label class="checkbox-pill">
                      <input type="checkbox" name="subjects" value="${sub.id}" ${assignedSubjectIds.has(sub.id) ? 'checked' : ''} />
                      <span>${sub.name}</span>
                    </label>
                  `
                        )
                        .join('')
                    : `<p class="text-xs text-secondary">Belum ada mata pelajaran. Silakan buat di menu Mata Pelajaran terlebih dahulu.</p>`
                }
              </div>
            </div>

            <div class="form-grid">
              <div class="form-group">
                <label for="st-fee-model">Model Kesepakatan Tarif *</label>
                <select id="st-fee-model" class="form-control" required>
                  <option value="per_session" ${student?.fee_model === 'per_session' ? 'selected' : ''}>Per Sesi Pertemuan (Flat)</option>
                  <option value="monthly" ${student?.fee_model === 'monthly' ? 'selected' : ''}>Bulanan (Flat per Bulan)</option>
                  <option value="per_hour" ${student?.fee_model === 'per_hour' ? 'selected' : ''}>Per Jam (Dihitung dari durasi sesi)</option>
                </select>
              </div>
              <div class="form-group">
                <label for="st-fee-amount">Besaran Tarif (Rp) *</label>
                <input type="number" id="st-fee-amount" class="form-control" value="${student?.fee_amount || 150000}" required min="0" step="1000" />
              </div>
            </div>

            <!-- Section 3: Data Orangtua -->
            <h4 class="form-section-title mt-4"><i class="fa-solid fa-users text-primary"></i> Data Orangtua / Wali</h4>
            <div class="form-grid">
              <div class="form-group">
                <label for="p-father">Nama Ayah</label>
                <input type="text" id="p-father" class="form-control" value="${student?.parent?.father_name || ''}" placeholder="Nama Ayah" />
              </div>
              <div class="form-group">
                <label for="p-mother">Nama Ibu</label>
                <input type="text" id="p-mother" class="form-control" value="${student?.parent?.mother_name || ''}" placeholder="Nama Ibu" />
              </div>
              <div class="form-group">
                <label for="p-phone">No. WhatsApp Orangtua</label>
                <input type="tel" id="p-phone" class="form-control" value="${student?.parent?.phones?.[0] || ''}" placeholder="08xxxxxxxxxx" />
              </div>
            </div>

            <div class="form-group">
              <label for="st-notes">Catatan Tambahan Guru (Khusus)</label>
              <textarea id="st-notes" class="form-control" rows="2" placeholder="Catatan kebiasaan belajar, target ujian, dll...">${student?.notes || ''}</textarea>
            </div>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" id="btn-cancel-modal">Batal</button>
            <button type="submit" class="btn btn-primary">${isEdit ? 'Simpan Perubahan' : 'Tambah Murid'}</button>
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

  const form = modalContainer.querySelector('#student-form') as HTMLFormElement;
  form?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const submitBtn = form.querySelector('button[type="submit"]') as HTMLButtonElement;
    const restore = setButtonLoading(submitBtn, 'Menyimpan...');

    const selectedSubjectIds: string[] = [];
    modalContainer.querySelectorAll('input[name="subjects"]:checked').forEach((cb) => {
      selectedSubjectIds.push((cb as HTMLInputElement).value);
    });

    const parentPhone = (modalContainer.querySelector('#p-phone') as HTMLInputElement).value.trim();

    const payload = {
      full_name: (modalContainer.querySelector('#st-name') as HTMLInputElement).value.trim(),
      gender: (modalContainer.querySelector('#st-gender') as HTMLSelectElement).value,
      school: (modalContainer.querySelector('#st-school') as HTMLInputElement).value.trim(),
      grade: (modalContainer.querySelector('#st-grade') as HTMLInputElement).value.trim(),
      phone: (modalContainer.querySelector('#st-phone') as HTMLInputElement).value.trim(),
      address: (modalContainer.querySelector('#st-address') as HTMLTextAreaElement).value.trim(),
      fee_model: (modalContainer.querySelector('#st-fee-model') as HTMLSelectElement).value,
      fee_amount: parseFloat((modalContainer.querySelector('#st-fee-amount') as HTMLInputElement).value) || 0,
      notes: (modalContainer.querySelector('#st-notes') as HTMLTextAreaElement).value.trim(),
      subject_ids: selectedSubjectIds,
      parent: {
        father_name: (modalContainer.querySelector('#p-father') as HTMLInputElement).value.trim(),
        mother_name: (modalContainer.querySelector('#p-mother') as HTMLInputElement).value.trim(),
        phones: parentPhone ? [parentPhone] : [],
        email: '',
        address: '',
        occupation: ''
      }
    };

    try {
      if (isEdit) {
        await API.put(`/students/${student!.id}`, payload);
        showToast('Data murid berhasil diperbarui', 'success');
      } else {
        await API.post('/students', payload);
        showToast('Murid baru berhasil ditambahkan', 'success');
      }
      closeModal();
      await loadStudents(container);
    } catch (err: any) {
      showToast(err.message || 'Gagal menyimpan data murid', 'danger');
    } finally {
      restore();
    }
  });
}
