import { API } from '../services/api.js';
import { Report } from '../types/index.js';
import { showToast } from '../utils/toast.js';
import { SignaturePad } from '../components/canvas.js';

const RATING_DESCRIPTIONS: Record<number, { label: string; icon: string }> = {
  1: { label: 'Perlu Bimbingan Khusus 😟', icon: 'fa-face-frown' },
  2: { label: 'Cukup / Masih Ragu 😐', icon: 'fa-face-meh' },
  3: { label: 'Baik / Cukup Paham 🙂', icon: 'fa-face-smile' },
  4: { label: 'Sangat Baik / Cepat Tangkap 😊', icon: 'fa-face-smile-beam' },
  5: { label: 'Luar Biasa / Menguasai Penuh 🌟', icon: 'fa-face-grin-stars' }
};

const PRESET_MATERIAL_CHIPS = [
  'Pembahasan Teori & Konsep Dasar',
  'Latihan Soal Ujian / Try Out',
  'Pembahasan Soal PR Sekolah',
  'Pengulangan Materi Sulit'
];

const PRESET_COMP_CHIPS = [
  'Cepat memahami rumus baru',
  'Mampu mengerjakan soal mandiri',
  'Perlu latihan hitungan bertahap',
  'Antusias dan aktif bertanya',
  'Perlu pengulangan konsep dasar'
];

const PRESET_HOMEWORK_CHIPS = [
  'Latihan soal bab terkait no. 1-10',
  'Membaca materi bab berikutnya',
  'Tidak ada PR untuk sesi ini'
];

export async function openReportModal(
  container: HTMLElement,
  sessionId: string,
  onSaved?: () => void
): Promise<void> {
  const modalContainer = document.createElement('div');
  modalContainer.className = 'modal-wrapper';
  document.body.appendChild(modalContainer);

  let existingReport: Report | null = null;
  try {
    existingReport = await API.get<Report>(`/reports/session/${sessionId}`);
  } catch (e) {
    // No report exists yet
  }

  const isEdit = !!existingReport;
  const initialScore = existingReport?.comprehension_score || 4;

  modalContainer.innerHTML = `
    <div class="modal-backdrop">
      <div class="modal-content glass modal-lg">
        <div class="modal-header">
          <div>
            <h3><i class="fa-solid fa-file-signature text-primary"></i> ${isEdit ? 'Laporan Hasil Belajar' : 'Tulis Laporan Hasil Belajar'}</h3>
            <p class="modal-subtitle">${existingReport?.student_name || 'Murid'} • ${existingReport?.subject_name || 'Mata Pelajaran'}</p>
          </div>
          <div class="modal-header-actions">
            ${
              isEdit
                ? `<button type="button" class="btn btn-outline btn-sm" id="btn-download-pdf"><i class="fa-solid fa-file-pdf text-danger"></i> Unduh PDF</button>`
                : ''
            }
            <button type="button" class="btn-icon" id="btn-close-modal"><i class="fa-solid fa-xmark"></i></button>
          </div>
        </div>
        <form id="report-form">
          <div class="modal-body">
            <!-- Materi Pembelajaran -->
            <div class="form-group">
              <label for="rep-material">Materi / Topik yang Diajarkan *</label>
              <textarea id="rep-material" class="form-control" rows="2" required placeholder="Jelaskan topik materi, bab, atau sub-bab yang dipelajari pada sesi ini...">${existingReport?.material_taught || ''}</textarea>
              <div class="preset-chips-container">
                ${PRESET_MATERIAL_CHIPS.map((chip) => `<span class="preset-chip btn-add-chip" data-target="rep-material">+ ${chip}</span>`).join('')}
              </div>
            </div>

            <!-- Tingkat Pemahaman -->
            <div class="form-group">
              <label>Tingkat Pemahaman Siswa (1 - 5 Bintang) *</label>
              <div class="star-rating-input" id="star-rating-container">
                ${[1, 2, 3, 4, 5]
                  .map(
                    (star) => `
                  <i class="fa-star ${star <= initialScore ? 'fa-solid active' : 'fa-regular'}" data-score="${star}"></i>
                `
                  )
                  .join('')}
                <input type="hidden" id="rep-score" value="${initialScore}" />
              </div>
              <div class="star-score-label" id="star-score-label">
                ${RATING_DESCRIPTIONS[initialScore].label}
              </div>
            </div>

            <!-- Catatan Pemahaman -->
            <div class="form-group">
              <label for="rep-comp-notes">Catatan Pemahaman Siswa</label>
              <textarea id="rep-comp-notes" class="form-control" rows="2" placeholder="Catatan kelebihan, daya serap materi, atau bagian yang masih perlu latihan...">${existingReport?.comprehension_notes || ''}</textarea>
              <div class="preset-chips-container">
                ${PRESET_COMP_CHIPS.map((chip) => `<span class="preset-chip btn-add-chip" data-target="rep-comp-notes">+ ${chip}</span>`).join('')}
              </div>
            </div>

            <!-- Tugas / PR & Perilaku -->
            <div class="form-grid">
              <div class="form-group">
                <label for="rep-homework">Tugas / Pekerjaan Rumah (PR)</label>
                <textarea id="rep-homework" class="form-control" rows="2" placeholder="Latihan soal halaman..., nomor...">${existingReport?.homework || ''}</textarea>
                <div class="preset-chips-container">
                  ${PRESET_HOMEWORK_CHIPS.map((chip) => `<span class="preset-chip btn-add-chip" data-target="rep-homework">+ ${chip}</span>`).join('')}
                </div>
              </div>
              <div class="form-group">
                <label for="rep-behavior">Catatan Keaktifan & Sikap Belajar</label>
                <textarea id="rep-behavior" class="form-control" rows="2" placeholder="Fokus belajar, ketepatan waktu, kedisiplinan...">${existingReport?.behavior_notes || ''}</textarea>
              </div>
            </div>

            <div class="form-group">
              <label for="rep-recommendations">Rekomendasi untuk Sesi Berikutnya</label>
              <textarea id="rep-recommendations" class="form-control" rows="2" placeholder="Fokus materi atau latihan lanjutan untuk sesi selanjutnya...">${existingReport?.recommendations || ''}</textarea>
            </div>

            <!-- Tanda Tangan Digital -->
            <h4 class="form-section-title mt-4"><i class="fa-solid fa-signature text-primary"></i> Tanda Tangan Digital</h4>
            <div class="signatures-grid">
              <!-- Teacher Signature -->
              <div class="signature-box">
                <div class="signature-box-header">
                  <label><i class="fa-solid fa-user-tie text-primary"></i> Tanda Tangan Guru *</label>
                  <button type="button" class="btn-link text-xs" id="btn-clear-teacher-sig" style="color: var(--primary);">Hapus / Reset</button>
                </div>
                <div class="canvas-wrapper">
                  <canvas id="teacher-sig-canvas"></canvas>
                </div>
                <p class="text-xs text-secondary mt-1">Goreskan tanda tangan menggunakan mouse atau layar sentuh</p>
              </div>

              <!-- Parent Signature -->
              <div class="signature-box">
                <div class="signature-box-header">
                  <label><i class="fa-solid fa-users text-primary"></i> Tanda Tangan Orangtua (Opsional)</label>
                  <button type="button" class="btn-link text-xs" id="btn-clear-parent-sig" style="color: var(--primary);">Hapus / Reset</button>
                </div>
                <div class="canvas-wrapper">
                  <canvas id="parent-sig-canvas"></canvas>
                </div>
                <p class="text-xs text-secondary mt-1">Dapat diisi saat evaluasi bersama orangtua</p>
              </div>
            </div>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" id="btn-cancel-modal">Tutup</button>
            <button type="submit" class="btn btn-primary">${isEdit ? 'Simpan Perubahan Laporan' : 'Simpan Laporan Belajar'}</button>
          </div>
        </form>
      </div>
    </div>
  `;

  // Initialize Canvas Signature Pads
  const teacherCanvas = modalContainer.querySelector('#teacher-sig-canvas') as HTMLCanvasElement;
  const parentCanvas = modalContainer.querySelector('#parent-sig-canvas') as HTMLCanvasElement;

  const teacherPad = new SignaturePad(teacherCanvas);
  const parentPad = new SignaturePad(parentCanvas);

  if (existingReport?.teacher_signature) {
    teacherPad.loadDataURL(existingReport.teacher_signature);
  }
  if (existingReport?.parent_signature) {
    parentPad.loadDataURL(existingReport.parent_signature);
  }

  modalContainer.querySelector('#btn-clear-teacher-sig')?.addEventListener('click', () => teacherPad.clear());
  modalContainer.querySelector('#btn-clear-parent-sig')?.addEventListener('click', () => parentPad.clear());

  // Preset chip clicks
  modalContainer.querySelectorAll('.btn-add-chip').forEach((chip) => {
    chip.addEventListener('click', () => {
      const targetId = chip.getAttribute('data-target')!;
      const textToAdd = chip.textContent?.replace(/^\+\s*/, '').trim() || '';
      const textarea = modalContainer.querySelector(`#${targetId}`) as HTMLTextAreaElement;
      if (textarea) {
        if (textarea.value.trim().length > 0) {
          textarea.value = `${textarea.value.trim()}\n- ${textToAdd}`;
        } else {
          textarea.value = textToAdd;
        }
      }
    });
  });

  // Star Rating Interaction
  const starContainer = modalContainer.querySelector('#star-rating-container');
  const scoreInput = modalContainer.querySelector('#rep-score') as HTMLInputElement;
  const scoreLabel = modalContainer.querySelector('#star-score-label');

  starContainer?.querySelectorAll('i').forEach((star) => {
    star.addEventListener('click', () => {
      const score = parseInt(star.getAttribute('data-score')!, 10);
      scoreInput.value = String(score);
      if (scoreLabel) scoreLabel.textContent = RATING_DESCRIPTIONS[score].label;

      starContainer.querySelectorAll('i').forEach((s) => {
        const sScore = parseInt(s.getAttribute('data-score')!, 10);
        if (sScore <= score) {
          s.className = 'fa-star fa-solid active';
        } else {
          s.className = 'fa-star fa-regular';
        }
      });
    });
  });

  // Download PDF Handler
  modalContainer.querySelector('#btn-download-pdf')?.addEventListener('click', async () => {
    if (!existingReport?.id) return;
    try {
      showToast('Menyiapkan berkas PDF laporan...', 'info');
      const blob = await API.get<Blob>(`/reports/${existingReport.id}/pdf`);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Laporan_Belajar_${existingReport.student_name || 'Murid'}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      showToast('PDF berhasil diunduh', 'success');
    } catch (err: any) {
      showToast(err.message || 'Gagal mengunduh PDF', 'danger');
    }
  });

  const closeModal = () => {
    modalContainer.remove();
  };

  modalContainer.querySelector('#btn-close-modal')?.addEventListener('click', closeModal);
  modalContainer.querySelector('#btn-cancel-modal')?.addEventListener('click', closeModal);

  const form = modalContainer.querySelector('#report-form') as HTMLFormElement;
  form?.addEventListener('submit', async (e) => {
    e.preventDefault();

    const teacherSig = teacherPad.toDataURL() || existingReport?.teacher_signature || '';
    if (!teacherSig) {
      showToast('Tanda tangan guru wajib diisi', 'warning');
      return;
    }

    const parentSig = parentPad.toDataURL() || existingReport?.parent_signature || null;

    const payload = {
      session_id: sessionId,
      material_taught: (modalContainer.querySelector('#rep-material') as HTMLTextAreaElement).value.trim(),
      comprehension_score: parseInt(scoreInput.value, 10),
      comprehension_notes: (modalContainer.querySelector('#rep-comp-notes') as HTMLTextAreaElement).value.trim(),
      homework: (modalContainer.querySelector('#rep-homework') as HTMLTextAreaElement).value.trim(),
      behavior_notes: (modalContainer.querySelector('#rep-behavior') as HTMLTextAreaElement).value.trim(),
      recommendations: (modalContainer.querySelector('#rep-recommendations') as HTMLTextAreaElement).value.trim(),
      teacher_signature: teacherSig,
      parent_signature: parentSig
    };

    try {
      if (isEdit && existingReport?.id) {
        await API.put(`/reports/${existingReport.id}`, payload);
        showToast('Laporan hasil belajar berhasil diperbarui', 'success');
      } else {
        await API.post('/reports', payload);
        showToast('Laporan hasil belajar berhasil disimpan', 'success');
      }
      closeModal();
      if (onSaved) onSaved();
    } catch (err: any) {
      showToast(err.message || 'Gagal menyimpan laporan belajar', 'danger');
    }
  });
}
