import { API } from '../services/api.js';
import { Subject } from '../types/index.js';
import { showToast } from '../utils/toast.js';
import { setButtonLoading, skeletonTableRows } from '../utils/loading.js';

export async function renderSubjects(container: HTMLElement): Promise<void> {
  container.innerHTML = `
    <div class="page-header">
      <div>
        <h1 class="page-title">Mata Pelajaran Bimbingan</h1>
        <p class="page-subtitle">Daftar mata pelajaran atau bidang studi yang Anda ampu</p>
      </div>
      <div class="header-actions">
        <button class="btn btn-primary" id="btn-add-subject">
          <i class="fa-solid fa-plus"></i>
          <span>Tambah Mata Pelajaran</span>
        </button>
      </div>
    </div>

    <!-- Subjects Card Grid / Table -->
    <div class="card">
      <div class="card-body">
        <div class="table-responsive">
          <table class="table">
            <thead>
              <tr>
                <th style="width: 80px;">No.</th>
                <th>Nama Mata Pelajaran</th>
                <th style="text-align: right;">Aksi</th>
              </tr>
            </thead>
            <tbody id="subjects-table-body">
              ${skeletonTableRows(3, 3)}
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- Modal Container -->
    <div id="subject-modal-container"></div>
  `;

  const addBtn = container.querySelector('#btn-add-subject');
  if (addBtn) {
    addBtn.addEventListener('click', () => openSubjectModal(container));
  }

  await loadSubjects(container);
}

async function loadSubjects(container: HTMLElement): Promise<void> {
  const tbody = container.querySelector('#subjects-table-body');
  if (!tbody) return;
  tbody.innerHTML = skeletonTableRows(3, 3);

  try {
    const subjects = await API.get<Subject[]>('/subjects');
    if (!subjects || subjects.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="3" class="text-center py-4 text-secondary">
            Belum ada mata pelajaran. Klik tombol "Tambah Mata Pelajaran" untuk menambahkan bidang studi pertama Anda.
          </td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = subjects
      .map(
        (sub, index) => `
      <tr>
        <td><strong>#${index + 1}</strong></td>
        <td>
          <div style="display: flex; align-items: center; gap: 10px;">
            <div style="width: 32px; height: 32px; border-radius: 8px; background: #eef2ff; color: #4f46e5; display: flex; align-items: center; justify-content: center; font-size: 0.9rem;">
              <i class="fa-solid fa-book-bookmark"></i>
            </div>
            <strong style="font-size: 0.95rem;">${sub.name}</strong>
          </div>
        </td>
        <td style="text-align: right;">
          <div class="table-actions">
            <button class="btn-icon btn-edit-subject" data-id="${sub.id}" data-name="${sub.name}" title="Edit"><i class="fa-solid fa-pen"></i></button>
            <button class="btn-icon text-danger btn-delete-subject" data-id="${sub.id}" title="Hapus"><i class="fa-solid fa-trash"></i></button>
          </div>
        </td>
      </tr>
    `
      )
      .join('');

    // Attach Edit Listeners
    container.querySelectorAll('.btn-edit-subject').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        const target = e.currentTarget as HTMLElement;
        const id = target.getAttribute('data-id')!;
        const name = target.getAttribute('data-name')!;
        openSubjectModal(container, { id, name, user_id: '' });
      });
    });

    // Attach Delete Listeners
    container.querySelectorAll('.btn-delete-subject').forEach((btn) => {
      btn.addEventListener('click', async (e) => {
        const id = (e.currentTarget as HTMLElement).getAttribute('data-id')!;
        if (confirm('Apakah Anda yakin ingin menghapus mata pelajaran ini?')) {
          const deleteBtn = e.currentTarget as HTMLButtonElement;
          const restore = setButtonLoading(deleteBtn, '');
          try {
            await API.del(`/subjects/${id}`);
            showToast('Mata pelajaran berhasil dihapus', 'success');
            await loadSubjects(container);
          } catch (err: any) {
            showToast(err.message || 'Gagal menghapus mata pelajaran', 'danger');
            restore();
          }
        }
      });
    });
  } catch (err: any) {
    tbody.innerHTML = `
      <tr>
        <td colspan="3" class="text-center py-4 text-danger">
          Gagal memuat mata pelajaran: ${err.message}
        </td>
      </tr>
    `;
  }
}

function openSubjectModal(container: HTMLElement, subject?: Subject): void {
  const modalContainer = container.querySelector('#subject-modal-container');
  if (!modalContainer) return;

  const isEdit = !!subject;

  modalContainer.innerHTML = `
    <div class="modal-backdrop">
      <div class="modal-content glass">
        <div class="modal-header">
          <h3>${isEdit ? 'Edit Mata Pelajaran' : 'Tambah Mata Pelajaran'}</h3>
          <button class="btn-icon" id="btn-close-modal"><i class="fa-solid fa-xmark"></i></button>
        </div>
        <form id="subject-form">
          <div class="modal-body">
            <div class="form-group">
              <label for="sub-name">Nama Mata Pelajaran *</label>
              <input type="text" id="sub-name" class="form-control" value="${subject?.name || ''}" required placeholder="Contoh: Matematika, Fisika SMA, Bahasa Inggris" />
            </div>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" id="btn-cancel-modal">Batal</button>
            <button type="submit" class="btn btn-primary">${isEdit ? 'Simpan Perubahan' : 'Tambah Mata Pelajaran'}</button>
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

  const form = modalContainer.querySelector('#subject-form') as HTMLFormElement;
  form?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const submitBtn = form.querySelector('button[type="submit"]') as HTMLButtonElement;
    const restore = setButtonLoading(submitBtn, 'Menyimpan...');
    const nameInput = modalContainer.querySelector('#sub-name') as HTMLInputElement;
    const name = nameInput.value.trim();

    if (!name) { restore(); return; }

    try {
      if (isEdit) {
        await API.put(`/subjects/${subject!.id}`, { name });
        showToast('Mata pelajaran berhasil diperbarui', 'success');
      } else {
        await API.post('/subjects', { name });
        showToast('Mata pelajaran baru berhasil ditambahkan', 'success');
      }
      closeModal();
      await loadSubjects(container);
    } catch (err: any) {
      showToast(err.message || 'Gagal menyimpan mata pelajaran', 'danger');
    } finally {
      restore();
    }
  });
}
