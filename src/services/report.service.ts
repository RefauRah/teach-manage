import PDFDocument from 'pdfkit';
import {
  ReportRepository,
  SessionRepository,
  StudentRepository
} from '../repositories/interfaces.js';
import { Report, ReportResponse } from '../types/index.js';

export class ReportService {
  constructor(
    private reportRepo: ReportRepository,
    private sessionRepo: SessionRepository,
    private studentRepo: StudentRepository
  ) {}

  async createReport(
    userId: string,
    req: Omit<Report, 'id' | 'created_at' | 'updated_at'>
  ): Promise<ReportResponse> {
    const session = await this.sessionRepo.getById(req.session_id);
    if (!session) {
      throw new Error('session not found');
    }

    const student = await this.studentRepo.getById(session.student_id, userId);
    if (!student) {
      throw new Error('unauthorized to create report for this session');
    }

    const existing = await this.reportRepo.getBySessionId(req.session_id, userId);
    if (existing) {
      throw new Error('report already exists for this session');
    }

    const report = await this.reportRepo.create({
      session_id: req.session_id,
      material_taught: req.material_taught,
      comprehension_score: req.comprehension_score,
      comprehension_notes: req.comprehension_notes || '',
      homework: req.homework || '',
      behavior_notes: req.behavior_notes || '',
      recommendations: req.recommendations || '',
      teacher_signature: req.teacher_signature,
      parent_signature: req.parent_signature || null
    });

    const fullReport = await this.reportRepo.getById(report.id, userId);
    if (!fullReport) {
      throw new Error('failed to retrieve created report');
    }
    return fullReport;
  }

  async updateReport(
    userId: string,
    id: string,
    req: Omit<Report, 'id' | 'session_id' | 'created_at' | 'updated_at'>
  ): Promise<void> {
    const existing = await this.reportRepo.getById(id, userId);
    if (!existing) {
      throw new Error('report not found');
    }

    await this.reportRepo.update({
      id,
      session_id: existing.session_id,
      material_taught: req.material_taught,
      comprehension_score: req.comprehension_score,
      comprehension_notes: req.comprehension_notes || '',
      homework: req.homework || '',
      behavior_notes: req.behavior_notes || '',
      recommendations: req.recommendations || '',
      teacher_signature: req.teacher_signature,
      parent_signature: req.parent_signature || null
    });
  }

  async getReportBySessionId(userId: string, sessionId: string): Promise<ReportResponse | null> {
    return this.reportRepo.getBySessionId(sessionId, userId);
  }

  async getReportById(userId: string, id: string): Promise<ReportResponse | null> {
    return this.reportRepo.getById(id, userId);
  }

  async generateReportPDF(userId: string, id: string): Promise<Buffer> {
    const report = await this.reportRepo.getById(id, userId);
    if (!report) {
      throw new Error('report not found');
    }

    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({
          size: 'A4',
          margin: 50,
          info: {
            Title: `Laporan Hasil Belajar - ${report.student_name}`,
            Author: 'Teaching Management'
          }
        });

        const buffers: Buffer[] = [];
        doc.on('data', (chunk) => buffers.push(chunk));
        doc.on('end', () => resolve(Buffer.concat(buffers)));
        doc.on('error', (err) => reject(err));

        const primaryColor = '#4F46E5';
        const grayColor = '#64748B';
        const textColor = '#1E293B';
        const lightGray = '#E2E8F0';

        // Header Title
        doc
          .fillColor(primaryColor)
          .font('Helvetica-Bold')
          .fontSize(20)
          .text('LAPORAN HASIL BELAJAR', { align: 'center' });

        doc
          .fillColor(grayColor)
          .font('Helvetica')
          .fontSize(11)
          .text('Bimbingan Belajar Privat', { align: 'center' });

        doc.moveDown(0.8);

        // Divider Line
        const yLine = doc.y;
        doc
          .strokeColor(primaryColor)
          .lineWidth(1.5)
          .moveTo(50, yLine)
          .lineTo(545, yLine)
          .stroke();

        doc.moveDown(1);

        // Session & Student Metadata (2 Columns)
        const startY = doc.y;
        const leftColX = 50;
        const rightColX = 300;

        // Left Column: Informasi Siswa
        doc
          .fillColor(primaryColor)
          .font('Helvetica-Bold')
          .fontSize(11)
          .text('INFORMASI SISWA', leftColX, startY);

        doc.moveDown(0.4);
        const sY1 = doc.y;
        doc
          .fillColor(textColor)
          .font('Helvetica-Bold')
          .fontSize(10)
          .text('Nama Siswa:', leftColX, sY1);
        doc
          .font('Helvetica')
          .text(report.student_name, leftColX + 85, sY1);

        doc.moveDown(0.3);
        const sY2 = doc.y;
        doc
          .font('Helvetica-Bold')
          .text('Mata Pelajaran:', leftColX, sY2);
        doc
          .font('Helvetica')
          .text(report.subject_name, leftColX + 85, sY2);

        // Right Column: Detail Sesi
        doc
          .fillColor(primaryColor)
          .font('Helvetica-Bold')
          .fontSize(11)
          .text('DETAIL SESI', rightColX, startY);

        doc.moveDown(0.4);
        const dY1 = doc.y;
        const dateStr = new Date(report.session_date).toLocaleDateString('id-ID', {
          day: '2-digit',
          month: 'short',
          year: 'numeric'
        });

        doc
          .fillColor(textColor)
          .font('Helvetica-Bold')
          .fontSize(10)
          .text('Tanggal Sesi:', rightColX, dY1);
        doc
          .font('Helvetica')
          .text(dateStr, rightColX + 80, dY1);

        doc.moveDown(0.3);
        const dY2 = doc.y;
        const timeStr = `${report.start_time.slice(0, 5)} - ${report.end_time.slice(0, 5)}`;
        doc
          .font('Helvetica-Bold')
          .text('Waktu Sesi:', rightColX, dY2);
        doc
          .font('Helvetica')
          .text(timeStr, rightColX + 80, dY2);

        doc.y = Math.max(sY2, dY2) + 20;

        // Sub Divider
        doc
          .strokeColor(lightGray)
          .lineWidth(0.8)
          .moveTo(50, doc.y)
          .lineTo(545, doc.y)
          .stroke();

        doc.moveDown(1);

        // Report Evaluation Section
        doc
          .fillColor(primaryColor)
          .font('Helvetica-Bold')
          .fontSize(13)
          .text('HASIL EVALUASI PEMBELAJARAN', 50);

        doc.moveDown(0.8);

        // 1. Materi yang Diajarkan
        doc
          .fillColor(textColor)
          .font('Helvetica-Bold')
          .fontSize(10)
          .text('Materi yang Diajarkan:');
        doc
          .font('Helvetica')
          .text(report.material_taught, { align: 'justify' });
        doc.moveDown(0.8);

        // 2. Tingkat Pemahaman
        doc.font('Helvetica-Bold').text('Tingkat Pemahaman:');
        const stars = '★ '.repeat(report.comprehension_score) + '☆ '.repeat(5 - report.comprehension_score);
        doc
          .font('Helvetica')
          .text(`${report.comprehension_score} / 5   (${stars.trim()})`);

        if (report.comprehension_notes) {
          doc
            .font('Helvetica-Oblique')
            .fontSize(9.5)
            .fillColor(grayColor)
            .text(`Catatan: ${report.comprehension_notes}`);
          doc.fillColor(textColor).fontSize(10);
        }
        doc.moveDown(0.8);

        // 3. Tugas / PR
        if (report.homework) {
          doc.font('Helvetica-Bold').text('Tugas / Pekerjaan Rumah (PR):');
          doc.font('Helvetica').text(report.homework, { align: 'justify' });
          doc.moveDown(0.8);
        }

        // 4. Catatan Perilaku
        if (report.behavior_notes) {
          doc.font('Helvetica-Bold').text('Catatan Perilaku Siswa:');
          doc.font('Helvetica').text(report.behavior_notes, { align: 'justify' });
          doc.moveDown(0.8);
        }

        // 5. Rekomendasi
        if (report.recommendations) {
          doc.font('Helvetica-Bold').text('Rekomendasi untuk Sesi Berikutnya:');
          doc.font('Helvetica').text(report.recommendations, { align: 'justify' });
          doc.moveDown(0.8);
        }

        // Signatures Section
        let sigY = doc.y + 20;
        if (sigY > 680) {
          doc.addPage();
          sigY = 50;
        }

        doc.y = sigY;
        const teacherX = 80;
        const parentX = 350;

        doc
          .fillColor(grayColor)
          .font('Helvetica')
          .fontSize(10)
          .text('Tanda Tangan Guru,', teacherX, sigY, { width: 140, align: 'center' })
          .text('Tanda Tangan Orangtua,', parentX, sigY, { width: 140, align: 'center' });

        // Embed teacher signature
        if (report.teacher_signature) {
          try {
            const buf = this.decodeBase64Image(report.teacher_signature);
            if (buf) {
              doc.image(buf, teacherX + 15, sigY + 18, { width: 110, height: 45, fit: [110, 45] });
            }
          } catch (e) {
            console.error('Failed to embed teacher signature', e);
          }
        }

        // Embed parent signature
        if (report.parent_signature) {
          try {
            const buf = this.decodeBase64Image(report.parent_signature);
            if (buf) {
              doc.image(buf, parentX + 15, sigY + 18, { width: 110, height: 45, fit: [110, 45] });
            }
          } catch (e) {
            console.error('Failed to embed parent signature', e);
          }
        }

        // Line under signatures
        const lineY = sigY + 70;
        doc
          .strokeColor(grayColor)
          .lineWidth(0.8)
          .moveTo(teacherX, lineY)
          .lineTo(teacherX + 140, lineY)
          .stroke()
          .moveTo(parentX, lineY)
          .lineTo(parentX + 140, lineY)
          .stroke();

        doc
          .fillColor(textColor)
          .font('Helvetica-Bold')
          .fontSize(9.5)
          .text('Guru Les Privat', teacherX, lineY + 5, { width: 140, align: 'center' })
          .text('Orangtua / Wali', parentX, lineY + 5, { width: 140, align: 'center' });

        doc.end();
      } catch (err) {
        reject(err);
      }
    });
  }

  private decodeBase64Image(dataUrl: string): Buffer | null {
    if (!dataUrl) return null;
    const parts = dataUrl.split(',');
    const base64Data = parts.length > 1 ? parts[1] : dataUrl;
    return Buffer.from(base64Data, 'base64');
  }
}
